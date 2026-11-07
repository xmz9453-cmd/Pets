import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { API_BASE_URL, changeOwnPassword, createBookingResource, createBookingResourceBlock, createBookingScheduleOverride, createBookingScheduleRule, createContractVersion, deleteBookingResource, deleteBookingResourceBlock, deleteBookingScheduleOverride, deleteBookingScheduleRule, deleteContractVersion, deleteShopLogo, getBookingResources, getBookingSchedule, getContractVersions, getCurrentStaff, getShopSettings, getStaffAccounts, publishContractVersion, removeStaffMembership, resetStaffPassword, setCurrentContractVersion, updateBookingResource, updateBookingResourceHours, updateBookingScheduleOverride, updateBookingScheduleRule, updateContractVersion, updateShopSettings, updateStaffRoles, updateStaffStatus, uploadContractVersionPdf, uploadShopLogo } from '../api/client';
import { getRoleLabel } from '../utils/staff-display';
import ShopPortalAppearanceSettings from '../components/ShopPortalAppearanceSettings';

const WEEKDAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const WEEKDAY_LABELS = {
  MONDAY: '星期一', TUESDAY: '星期二', WEDNESDAY: '星期三', THURSDAY: '星期四',
  FRIDAY: '星期五', SATURDAY: '星期六', SUNDAY: '星期日',
};
function normalizeTimeInput(value) {
  return typeof value === 'string' ? value.slice(0, 5) : '';
}

function buildEmptySettings() {
  return {
    name: '我的店家',
    phone: '',
    address: '',
    email: '',
    logo_url: null,
    announcement: '',
    business_hours: WEEKDAY_ORDER.map((weekday) => ({
      weekday,
      is_closed: true,
      open_time: '',
      close_time: '',
    })),
  };
}

function cloneSettings(settings) {
  return {
    name: settings?.name || '我的店家',
    phone: settings?.phone || '',
    address: settings?.address || '',
    email: settings?.email || '',
    logo_url: settings?.logo_url || null,
    announcement: settings?.announcement || '',
    business_hours: (settings?.business_hours || []).map((entry) => ({
      weekday: entry.weekday,
      is_closed: Boolean(entry.is_closed),
      open_time: normalizeTimeInput(entry.open_time),
      close_time: normalizeTimeInput(entry.close_time),
    })),
  };
}

function normalizeSavedSettings(data) {
  if (!data) {
    return buildEmptySettings();
  }

  const shop = data.shop || {};
  const normalized = cloneSettings({
    name: shop.name || '我的店家',
    phone: shop.phone || '',
    address: shop.address || '',
    email: shop.email || '',
    business_hours: data.business_hours || [],
  });

  const byWeekday = new Map((normalized.business_hours || []).map((item) => [item.weekday, item]));
  normalized.business_hours = WEEKDAY_ORDER.map((weekday) => byWeekday.get(weekday) || {
    weekday,
    is_closed: true,
    open_time: '',
    close_time: '',
  });

  return normalized;
}

function hasContractPdfMetadata(version) {
  return ['file_name', 'mime_type', 'file_size', 'storage_path', 'file_hash'].some((field) => {
    const value = version[field];
    return value !== null && value !== undefined && value !== '';
  });
}

function hasCompleteContractPdfMetadata(version) {
  return Boolean(
    version.file_name
    && version.mime_type === 'application/pdf'
    && Number(version.file_size) > 0
    && version.storage_path
    && /^[a-f0-9]{64}$/i.test(version.file_hash || ''),
  );
}

function displayTimestamp(value) {
  return value ? String(value).replace('T', ' ').replace(/\.\d{3}Z$/, '') : '—';
}

function createEmptyRule() {
  return { species: 'CAT', start_time: '', capacity: '1', is_closed: false, status: 'ACTIVE' };
}

function createEmptyOverride() {
  return { override_date: '', species: 'CAT', kind: 'ALL_DAY_CLOSED', start_time: '', capacity: '' };
}

function BookingScheduleSettings() {
  const [schedule, setSchedule] = useState({ rules: [], overrides: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ruleForm, setRuleForm] = useState(createEmptyRule());
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [overrideForm, setOverrideForm] = useState(createEmptyOverride());
  const [editingOverrideId, setEditingOverrideId] = useState(null);

  async function loadSchedule() {
    setLoading(true);
    setError('');
    try {
      const result = await getBookingSchedule();
      setSchedule({ rules: result.rules || [], overrides: result.overrides || [] });
      return true;
    } catch (loadError) {
      setError(loadError.message || '預約設定載入失敗。');
      return false;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSchedule();
  }, []);

  async function saveSchedule(action) {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await action();
      const refreshed = await loadSchedule();
      if (refreshed) setSuccess('預約設定已儲存。');
    } catch (saveError) {
      setError(saveError.message || '預約設定儲存失敗。');
    } finally {
      setSaving(false);
    }
  }

  function resetRuleForm() {
    setRuleForm(createEmptyRule());
    setEditingRuleId(null);
  }

  function resetOverrideForm() {
    setOverrideForm(createEmptyOverride());
    setEditingOverrideId(null);
  }

  async function submitRule(event) {
    event.preventDefault();
    const payload = {
      ...ruleForm,
      start_time: ruleForm.start_time,
      capacity: ruleForm.is_closed ? null : Number(ruleForm.capacity),
      status: ruleForm.status,
    };
    await saveSchedule(async () => {
      if (editingRuleId) await updateBookingScheduleRule(editingRuleId, payload);
      else await createBookingScheduleRule(payload);
      resetRuleForm();
    });
  }

  async function removeRule(ruleId) {
    await saveSchedule(() => deleteBookingScheduleRule(ruleId));
    if (editingRuleId === ruleId) resetRuleForm();
  }

  function editRule(rule) {
    setEditingRuleId(rule.id);
    setRuleForm({
      species: rule.species,
      start_time: rule.start_time.slice(0, 5),
      capacity: rule.capacity === null ? '' : String(rule.capacity),
      is_closed: rule.is_closed,
      status: rule.status,
    });
  }

  async function submitOverride(event) {
    event.preventDefault();
    const allDay = overrideForm.kind === 'ALL_DAY_CLOSED';
    const closed = allDay || overrideForm.kind === 'TIME_CLOSED';
    const payload = {
      override_date: overrideForm.override_date,
      species: overrideForm.species,
      start_time: allDay ? null : overrideForm.start_time,
      is_closed: closed,
      capacity: closed ? null : Number(overrideForm.capacity),
    };
    await saveSchedule(async () => {
      if (editingOverrideId) await updateBookingScheduleOverride(editingOverrideId, payload);
      else await createBookingScheduleOverride(payload);
      resetOverrideForm();
    });
  }

  async function removeOverride(overrideId) {
    await saveSchedule(() => deleteBookingScheduleOverride(overrideId));
    if (editingOverrideId === overrideId) resetOverrideForm();
  }

  function editOverride(override) {
    setEditingOverrideId(override.id);
    setOverrideForm({
      override_date: override.override_date,
      species: override.species,
      kind: override.start_time === null
        ? 'ALL_DAY_CLOSED'
        : (override.is_closed ? 'TIME_CLOSED' : 'CAPACITY'),
      start_time: override.start_time ? override.start_time.slice(0, 5) : '',
      capacity: override.capacity === null ? '' : String(override.capacity),
    });
  }

  function renderSpeciesRules(species) {
    const rules = schedule.rules.filter((rule) => rule.species === species);
    return (
      <div className="col-md-6" key={species}>
        <h3 className="h6">{species === 'CAT' ? 'CAT 貓' : 'DOG 狗'}</h3>
        {rules.length === 0 ? (
          <p className="text-muted">尚未設定開始時間。</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr><th>開始時間</th><th>容量</th><th>狀態</th><th>操作</th></tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td>{rule.start_time.slice(0, 5)}</td>
                    <td>{rule.is_closed ? '—' : rule.capacity}</td>
                    <td>{rule.is_closed ? '休息／關閉' : (rule.status === 'ACTIVE' ? '開放' : '停用')}</td>
                    <td className="text-nowrap">
                      <button type="button" className="btn btn-sm btn-outline-dark me-1" onClick={() => editRule(rule)}>編輯</button>
                      <button type="button" className="btn btn-sm btn-outline-danger" disabled={saving} onClick={() => removeRule(rule.id)}>刪除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="card shadow-sm mt-4">
      <div className="card-body">
        <h2 className="h5 mb-1">預約設定</h2>
        <p className="text-muted">設定 CAT／DOG 每週可選開始時間與容量，以及特定日期例外。店家每週營業時間仍是外層限制。</p>
        {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
        {success ? <div className="alert alert-success" role="status">{success}</div> : null}
        {loading ? (
          <div className="alert alert-light border mb-0" role="status">預約設定載入中...</div>
        ) : (
          <>
            <form className="row g-2 align-items-end mb-3" onSubmit={submitRule}>
              <div className="col-md-2">
                <label className="form-label" htmlFor="booking-rule-species">種類</label>
                <select id="booking-rule-species" className="form-select" value={ruleForm.species} onChange={(event) => setRuleForm({ ...ruleForm, species: event.target.value })}>
                  <option value="CAT">CAT 貓</option><option value="DOG">DOG 狗</option>
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label" htmlFor="booking-rule-time">開始時間</label>
                <input id="booking-rule-time" className="form-control" type="time" required value={ruleForm.start_time} onChange={(event) => setRuleForm({ ...ruleForm, start_time: event.target.value })} />
              </div>
              <div className="col-md-2">
                <label className="form-label" htmlFor="booking-rule-capacity">容量</label>
                <input id="booking-rule-capacity" className="form-control" type="number" min="1" step="1" required={!ruleForm.is_closed} disabled={ruleForm.is_closed} value={ruleForm.is_closed ? '' : ruleForm.capacity} onChange={(event) => setRuleForm({ ...ruleForm, capacity: event.target.value })} />
              </div>
              <div className="col-md-3">
                <div className="form-check mb-2">
                  <input id="booking-rule-closed" className="form-check-input" type="checkbox" checked={ruleForm.is_closed} onChange={(event) => setRuleForm({ ...ruleForm, is_closed: event.target.checked, capacity: event.target.checked ? '' : (ruleForm.capacity || '1') })} />
                  <label className="form-check-label" htmlFor="booking-rule-closed">休息／關閉</label>
                </div>
              </div>
              <div className="col-md-3 d-flex gap-2">
                <button type="submit" className="btn btn-dark" disabled={saving}>{editingRuleId ? '更新時段' : '新增時段'}</button>
                {editingRuleId ? <button type="button" className="btn btn-outline-dark" onClick={resetRuleForm}>取消</button> : null}
              </div>
            </form>
            <p className="form-text">每筆規則適用至同種類的下一個開始時間；關閉規則不設定容量。</p>
            <div className="row g-3 mb-4">{renderSpeciesRules('CAT')}{renderSpeciesRules('DOG')}</div>

            <h3 className="h6">日期例外</h3>
            <form className="row g-2 align-items-end mb-3" onSubmit={submitOverride}>
              <div className="col-md-2">
                <label className="form-label" htmlFor="booking-override-date">日期</label>
                <input id="booking-override-date" className="form-control" type="date" required value={overrideForm.override_date} onChange={(event) => setOverrideForm({ ...overrideForm, override_date: event.target.value })} />
              </div>
              <div className="col-md-2">
                <label className="form-label" htmlFor="booking-override-species">種類</label>
                <select id="booking-override-species" className="form-select" value={overrideForm.species} onChange={(event) => setOverrideForm({ ...overrideForm, species: event.target.value })}>
                  <option value="CAT">CAT 貓</option><option value="DOG">DOG 狗</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="booking-override-kind">例外類型</label>
                <select id="booking-override-kind" className="form-select" value={overrideForm.kind} onChange={(event) => setOverrideForm({ ...overrideForm, kind: event.target.value })}>
                  <option value="ALL_DAY_CLOSED">整個種類當日關閉</option>
                  <option value="TIME_CLOSED">關閉特定開始時間</option>
                  <option value="CAPACITY">調整特定開始時間容量</option>
                </select>
              </div>
              {overrideForm.kind !== 'ALL_DAY_CLOSED' ? (
                <div className="col-md-2">
                  <label className="form-label" htmlFor="booking-override-time">開始時間</label>
                  <input id="booking-override-time" className="form-control" type="time" required value={overrideForm.start_time} onChange={(event) => setOverrideForm({ ...overrideForm, start_time: event.target.value })} />
                </div>
              ) : null}
              {overrideForm.kind === 'CAPACITY' ? (
                <div className="col-md-2">
                  <label className="form-label" htmlFor="booking-override-capacity">容量</label>
                  <input id="booking-override-capacity" className="form-control" type="number" min="1" step="1" required value={overrideForm.capacity} onChange={(event) => setOverrideForm({ ...overrideForm, capacity: event.target.value })} />
                </div>
              ) : null}
              <div className="col-md-3 d-flex gap-2">
                <button type="submit" className="btn btn-dark" disabled={saving}>{editingOverrideId ? '更新例外' : '新增例外'}</button>
                {editingOverrideId ? <button type="button" className="btn btn-outline-dark" onClick={resetOverrideForm}>取消</button> : null}
              </div>
            </form>
            {schedule.overrides.length === 0 ? (
              <p className="text-muted mb-0">目前沒有日期例外。</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead><tr><th>日期</th><th>種類</th><th>範圍</th><th>設定</th><th>操作</th></tr></thead>
                  <tbody>
                    {schedule.overrides.map((override) => (
                      <tr key={override.id}>
                        <td>{override.override_date}</td>
                        <td>{override.species}</td>
                        <td>{override.start_time === null ? '整日' : override.start_time.slice(0, 5)}</td>
                        <td>{override.is_closed ? '休息／關閉' : `容量 ${override.capacity}`}</td>
                        <td className="text-nowrap">
                          <button type="button" className="btn btn-sm btn-outline-dark me-1" onClick={() => editOverride(override)}>編輯</button>
                          <button type="button" className="btn btn-sm btn-outline-danger" disabled={saving} onClick={() => removeOverride(override.id)}>刪除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function PublicBookingLink({ entryCode }) {
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (entryCode) {
      setUrl(`${window.location.origin}/s/${encodeURIComponent(entryCode)}`);
    }
  }, [entryCode]);

  async function copyUrl() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="card shadow-sm mb-4">
      <div className="card-body py-3">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="me-auto">
            <h2 className="h6 mb-1">店家專屬顧客入口</h2>
            <p className="small text-muted mb-0">此網址直接進入本店登入與預約，可複製分享給客戶。</p>
          </div>
          <input className="form-control form-control-sm" style={{ maxWidth: 440 }} value={url} readOnly aria-label="公開預約網址" />
          <button type="button" className="btn btn-sm btn-outline-dark" onClick={copyUrl} disabled={!url}>
            {copied ? '已複製' : '複製網址'}
          </button>
          {url ? <a className="btn btn-sm btn-link" href={url} target="_blank" rel="noreferrer">預覽</a> : null}
        </div>
      </div>
    </section>
  );
}

function createResourceForm() {
  return {
    resource_type: 'STAFF',
    service_type: 'GROOMING',
    staff_id: '',
    name: '',
    capacity: '1',
    status: 'ACTIVE',
  };
}

function BookingResourceSettings() {
  const [resources, setResources] = useState([]);
  const [staffOptions, setStaffOptions] = useState([]);
  const [hours, setHours] = useState(WEEKDAY_ORDER.map((weekday) => ({
    weekday,
    is_open: false,
    start_time: '09:00',
    end_time: '18:00',
  })));
  const [form, setForm] = useState(createResourceForm());
  const [blockForms, setBlockForms] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadResources() {
    setLoading(true);
    setError('');
    try {
      const [resourceData, settingsData] = await Promise.all([getBookingResources(), getShopSettings()]);
      setResources(resourceData.resources || []);
      setStaffOptions(resourceData.staff_options || []);
      setHours((current) => {
        const defaults = new Map((settingsData.business_hours || []).map((item) => [item.weekday, item]));
        return current.map((entry) => {
          const businessHour = defaults.get(entry.weekday);
          return businessHour
            ? {
              ...entry,
              is_open: !businessHour.is_closed,
              start_time: normalizeTimeInput(businessHour.open_time) || entry.start_time,
              end_time: normalizeTimeInput(businessHour.close_time) || entry.end_time,
            }
            : entry;
        });
      });
    } catch (loadError) {
      setError(loadError.message || '排程資源載入失敗。');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadResources();
  }, []);

  function resetForm() {
    setForm(createResourceForm());
    setHours(WEEKDAY_ORDER.map((weekday) => ({
      weekday,
      is_open: false,
      start_time: '09:00',
      end_time: '18:00',
    })));
    setEditingId(null);
  }

  function editResource(resource) {
    setEditingId(resource.id);
    setForm({
      resource_type: resource.resource_type,
      service_type: resource.service_type,
      staff_id: resource.staff_id ? String(resource.staff_id) : '',
      name: resource.name,
      capacity: String(resource.capacity),
      status: resource.status,
    });
    setHours(WEEKDAY_ORDER.map((weekday) => {
      const dayHours = (resource.hours || []).filter((item) => item.weekday === weekday);
      return dayHours.length
        ? { weekday, is_open: true, start_time: dayHours[0].start_time, end_time: dayHours[0].end_time }
        : { weekday, is_open: false, start_time: '09:00', end_time: '18:00' };
    }));
    setError('');
    setSuccess('');
  }

  async function submitResource(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    const payload = {
      ...form,
      capacity: Number(form.capacity),
      staff_id: form.resource_type === 'STAFF' ? Number(form.staff_id) : null,
    };
    const resourceHours = hours
      .filter((entry) => entry.is_open)
      .map(({ weekday, start_time, end_time }) => ({ weekday, start_time, end_time }));
    if (form.resource_type !== 'BOARDING_ROOM') payload.hours = resourceHours;
    try {
      if (editingId) {
        await updateBookingResource(editingId, payload);
        if (form.resource_type !== 'BOARDING_ROOM') {
          await updateBookingResourceHours(editingId, resourceHours);
        }
      } else {
        await createBookingResource(payload);
      }
      await loadResources();
      resetForm();
      setSuccess('排程資源已儲存。');
    } catch (saveError) {
      setError(saveError.message || '排程資源儲存失敗。');
    } finally {
      setSaving(false);
    }
  }

  async function removeResource(resource) {
    if (!window.confirm(`確定刪除排程資源「${resource.name}」？`)) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await deleteBookingResource(resource.id);
      await loadResources();
      if (editingId === resource.id) resetForm();
      setSuccess('排程資源已刪除。');
    } catch (deleteError) {
      setError(deleteError.message || '排程資源刪除失敗。');
    } finally {
      setSaving(false);
    }
  }

  function updateBlockForm(resourceId, patch) {
    setBlockForms((current) => ({
      ...current,
      [resourceId]: {
        block_date: '',
        start_time: '',
        end_time: '',
        note: '',
        ...(current[resourceId] || {}),
        ...patch,
      },
    }));
  }

  async function addResourceBlock(resource) {
    const blockForm = blockForms[resource.id] || {};
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await createBookingResourceBlock(resource.id, blockForm);
      setBlockForms((current) => ({ ...current, [resource.id]: { block_date: '', start_time: '', end_time: '', note: '' } }));
      await loadResources();
      setSuccess('資源停用時段已新增。');
    } catch (blockError) {
      setError(blockError.message || '資源停用時段新增失敗。');
    } finally {
      setSaving(false);
    }
  }

  async function removeResourceBlock(resource, block) {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await deleteBookingResourceBlock(resource.id, block.id);
      await loadResources();
      setSuccess('資源停用時段已刪除。');
    } catch (blockError) {
      setError(blockError.message || '資源停用時段刪除失敗。');
    } finally {
      setSaving(false);
    }
  }

  const resourceLabels = {
    STAFF: '服務人員',
    GROOMING_STATION: '美容台／時段資源',
    BOARDING_ROOM: '住宿房位',
  };

  return (
    <section className="card shadow-sm mt-4">
      <div className="card-body">
        <h2 className="h5 mb-1">預約排程資源</h2>
        <p className="text-muted">可將美容服務連結到人員與美容台，住宿服務連結到房位。資源未設定個別時段時，沿用店家營業時間。</p>
        {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
        {success ? <div className="alert alert-success" role="status">{success}</div> : null}
        {loading ? <p role="status">資源載入中...</p> : (
          <>
            <form className="row g-2 align-items-end mb-4" onSubmit={submitResource}>
              <div className="col-md-3">
                <label className="form-label" htmlFor="booking-resource-type">資源種類</label>
                <select id="booking-resource-type" className="form-select" value={form.resource_type} onChange={(event) => {
                  const resourceType = event.target.value;
                  setForm({
                    ...form,
                    resource_type: resourceType,
                    service_type: resourceType === 'BOARDING_ROOM' ? 'BOARDING' : 'GROOMING',
                    staff_id: '',
                  });
                }}>
                  <option value="STAFF">服務人員</option>
                  <option value="GROOMING_STATION">美容台／時段資源</option>
                  <option value="BOARDING_ROOM">住宿房位</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="booking-resource-name">名稱</label>
                <input id="booking-resource-name" className="form-control" maxLength="100" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </div>
              <div className="col-md-2">
                <label className="form-label" htmlFor="booking-resource-capacity">可服務數量</label>
                <input id="booking-resource-capacity" className="form-control" type="number" min="1" max="1000" required value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} />
              </div>
              {form.resource_type === 'STAFF' ? (
                <div className="col-md-4">
                  <label className="form-label" htmlFor="booking-resource-staff">對應員工</label>
                  <select id="booking-resource-staff" className="form-select" required value={form.staff_id} onChange={(event) => setForm({ ...form, staff_id: event.target.value })}>
                    <option value="">選擇員工</option>
                    {staffOptions.map((member) => <option key={member.id} value={member.id}>{member.display_name}</option>)}
                  </select>
                </div>
              ) : null}
              {form.resource_type !== 'BOARDING_ROOM' ? (
                <div className="col-12">
                  <label className="form-label">每週可服務時段</label>
                  <div className="row g-2">
                    {hours.map((entry, index) => (
                      <div className="col-md-6 col-xl-4" key={entry.weekday}>
                        <div className="border rounded p-2 d-flex align-items-center gap-2">
                          <div className="form-check">
                            <input className="form-check-input" type="checkbox" id={`resource-day-${entry.weekday}`} checked={entry.is_open} onChange={(event) => setHours((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, is_open: event.target.checked } : item))} />
                            <label className="form-check-label" htmlFor={`resource-day-${entry.weekday}`}>{WEEKDAY_LABELS[entry.weekday]}</label>
                          </div>
                          <input aria-label={`${WEEKDAY_LABELS[entry.weekday]}開始時間`} className="form-control form-control-sm" type="time" required={entry.is_open} disabled={!entry.is_open} value={entry.start_time} onChange={(event) => setHours((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, start_time: event.target.value } : item))} />
                          <input aria-label={`${WEEKDAY_LABELS[entry.weekday]}結束時間`} className="form-control form-control-sm" type="time" required={entry.is_open} disabled={!entry.is_open} value={entry.end_time} onChange={(event) => setHours((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, end_time: event.target.value } : item))} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="col-12 d-flex gap-2">
                <button type="submit" className="btn btn-dark" disabled={saving}>{saving ? '儲存中...' : editingId ? '更新資源' : '新增資源'}</button>
                {editingId ? <button type="button" className="btn btn-outline-dark" onClick={resetForm}>取消編輯</button> : null}
              </div>
            </form>
            {resources.length ? (
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead><tr><th>資源</th><th>服務</th><th>數量</th><th>每週時段</th><th>狀態</th><th>操作</th></tr></thead>
                  <tbody>
                    {resources.map((resource) => [
                      <tr key={resource.id}>
                        <td>{resource.name}{resource.staff_name ? <small className="d-block text-muted">{resource.staff_name}</small> : null}<small className="d-block text-muted">{resourceLabels[resource.resource_type]}</small></td>
                        <td>{resource.service_type === 'BOTH' ? '美容／住宿' : resource.service_type === 'BOARDING' ? '住宿' : '美容'}</td>
                        <td>{resource.capacity}</td>
                        <td>{resource.resource_type === 'BOARDING_ROOM' ? '依住宿日期計算' : (resource.hours || []).map((item) => `${WEEKDAY_LABELS[item.weekday]} ${item.start_time}-${item.end_time}`).join('、')}</td>
                        <td>{resource.status === 'ACTIVE' ? '啟用' : '停用'}</td>
                        <td className="text-nowrap">
                          <button type="button" className="btn btn-sm btn-outline-dark me-1" onClick={() => editResource(resource)}>編輯</button>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeResource(resource)} disabled={saving}>刪除</button>
                        </td>
                      </tr>,
                      <tr key={`${resource.id}-blocks`}>
                        <td colSpan="6">
                          <form className="row g-2 align-items-end" onSubmit={(event) => {
                            event.preventDefault();
                            addResourceBlock(resource);
                          }}>
                            <div className="col-md-3">
                              <label className="form-label" htmlFor={`resource-block-date-${resource.id}`}>停用日期</label>
                              <input id={`resource-block-date-${resource.id}`} className="form-control form-control-sm" type="date" required value={blockForms[resource.id]?.block_date || ''} onChange={(event) => updateBlockForm(resource.id, { block_date: event.target.value })} />
                            </div>
                            <div className="col-md-2">
                              <label className="form-label" htmlFor={`resource-block-start-${resource.id}`}>開始（可留白）</label>
                              <input id={`resource-block-start-${resource.id}`} className="form-control form-control-sm" type="time" value={blockForms[resource.id]?.start_time || ''} onChange={(event) => updateBlockForm(resource.id, { start_time: event.target.value })} />
                            </div>
                            <div className="col-md-2">
                              <label className="form-label" htmlFor={`resource-block-end-${resource.id}`}>結束（可留白）</label>
                              <input id={`resource-block-end-${resource.id}`} className="form-control form-control-sm" type="time" value={blockForms[resource.id]?.end_time || ''} onChange={(event) => updateBlockForm(resource.id, { end_time: event.target.value })} />
                            </div>
                            <div className="col-md-3">
                              <label className="form-label" htmlFor={`resource-block-note-${resource.id}`}>備註</label>
                              <input id={`resource-block-note-${resource.id}`} className="form-control form-control-sm" maxLength="255" value={blockForms[resource.id]?.note || ''} onChange={(event) => updateBlockForm(resource.id, { note: event.target.value })} />
                            </div>
                            <div className="col-md-2">
                              <button type="submit" className="btn btn-sm btn-outline-dark w-100" disabled={saving}>新增停用時段</button>
                            </div>
                          </form>
                          {(resource.blocks || []).length ? (
                            <ul className="list-unstyled small mt-2 mb-0">
                              {resource.blocks.map((block) => (
                                <li key={block.id} className="d-flex align-items-center gap-2">
                                  <span>{block.block_date} {block.start_time ? `${block.start_time}-${block.end_time}` : '全天'}{block.note ? `：${block.note}` : ''}</span>
                                  <button type="button" className="btn btn-sm btn-link text-danger p-0" disabled={saving} onClick={() => removeResourceBlock(resource, block)}>刪除</button>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </td>
                      </tr>,
                    ])}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-muted mb-0">尚未設定排程資源；未設定的資源種類會沿用目前時段容量規則。</p>}
          </>
        )}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [staff, setStaff] = useState(null);
  const [form, setForm] = useState(buildEmptySettings());
  const [original, setOriginal] = useState(buildEmptySettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [staffAccounts, setStaffAccounts] = useState([]);
  const [updatingStaffId, setUpdatingStaffId] = useState(null);
  const [passwordModal, setPasswordModal] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [contractVersions, setContractVersions] = useState([]);
  const [contractVersionsLoading, setContractVersionsLoading] = useState(true);
  const [contractVersionsError, setContractVersionsError] = useState('');
  const [contractVersionsSuccess, setContractVersionsSuccess] = useState('');
  const [contractVersionLabel, setContractVersionLabel] = useState('');
  const [contractVersionServiceType, setContractVersionServiceType] = useState('GROOMING');
  const [creatingContractVersion, setCreatingContractVersion] = useState(false);
  const [editingContractVersionId, setEditingContractVersionId] = useState(null);
  const [editingContractVersionLabel, setEditingContractVersionLabel] = useState('');
  const [savingContractVersion, setSavingContractVersion] = useState(false);
  const [contractVersionActionId, setContractVersionActionId] = useState(null);
  const [contractPdfFiles, setContractPdfFiles] = useState({});
  const [uploadingContractVersionId, setUploadingContractVersionId] = useState(null);

  const canEdit = staff && staff.roles && staff.roles.includes('OWNER');
  const canManageAllAccounts = Boolean(staff?.is_platform_shop_manager);

  async function loadContractVersions(isActive = () => true) {
    setContractVersionsLoading(true);
    setContractVersionsError('');
    try {
      const result = await getContractVersions();
      if (isActive()) {
        setContractVersions(result.contract_versions || []);
      }
    } catch (loadError) {
      if (isActive()) {
        setContractVersionsError(loadError.message || '電子契約版本載入失敗');
      }
    } finally {
      if (isActive()) {
        setContractVersionsLoading(false);
      }
    }
  }

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const currentStaff = await getCurrentStaff();
        if (!active) {
          return;
        }

        setStaff(currentStaff.staff);
        if (!currentStaff.staff.roles.includes('OWNER')) {
          router.replace('/dashboard');
          return;
        }

        const result = await getShopSettings();
        const normalized = normalizeSavedSettings(result);

        if (!active) {
          return;
        }

        setForm(normalized);
        setOriginal(normalized);
        if (currentStaff.staff.roles.includes('OWNER')) {
          const staffResult = await getStaffAccounts();
          if (active) {
            setStaffAccounts(staffResult.staff || []);
          }
          await loadContractVersions(() => active);
        }
      } catch (loadError) {
        if (active) {
          router.replace('/login');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, [router]);

  const hasChanges = useMemo(() => {
    if (!original || !form) {
      return false;
    }

    return JSON.stringify(form) !== JSON.stringify(original);
  }, [form, original]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
    setSuccess('');
  }

  function updateBusinessHour(weekday, field, value) {
    setForm((current) => ({
      ...current,
      business_hours: current.business_hours.map((entry) => {
        if (entry.weekday !== weekday) {
          return entry;
        }

        const nextEntry = { ...entry, [field]: value };
        if (field === 'is_closed' && value === true) {
          nextEntry.open_time = '';
          nextEntry.close_time = '';
        }
        return nextEntry;
      }),
    }));
    setError('');
    setSuccess('');
  }

  function handleCancel() {
    setForm(cloneSettings(original));
    setError('');
    setSuccess('');
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!canEdit) {
      return;
    }

    const payload = {
      name: form.name,
      phone: form.phone,
      address: form.address,
      email: form.email,
      announcement: form.announcement,
      business_hours: form.business_hours.map((entry) => ({
        weekday: entry.weekday,
        is_closed: entry.is_closed,
        open_time: entry.is_closed ? null : entry.open_time,
        close_time: entry.is_closed ? null : entry.close_time,
      })),
    };

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const result = await updateShopSettings(payload);
      const updated = normalizeSavedSettings(result);
      setOriginal(updated);
      setForm(updated);
      setSuccess('店家設定已成功儲存。');
    } catch (saveError) {
      setError(saveError.message || '無法儲存店家設定。');
    } finally {
      setSaving(false);
    }
  }

  async function handleShopLogoChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !canEdit) return;

    setLogoUploading(true);
    setError('');
    setSuccess('');
    try {
      await uploadShopLogo(file);
      const result = await getShopSettings();
      const updated = normalizeSavedSettings(result);
      setOriginal(updated);
      setForm(updated);
      window.dispatchEvent(new CustomEvent('psop:shop-logo-updated', { detail: { logo_url: updated.logo_url } }));
      setSuccess('店家 Logo 已更新，入口頁將顯示新圖片。');
    } catch (uploadError) {
      setError(uploadError.message || 'Logo 上傳失敗。');
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleShopLogoDelete() {
    if (!canEdit || !form.logo_url || !window.confirm('確定要移除目前的店家 Logo 嗎？')) return;

    setLogoUploading(true);
    setError('');
    setSuccess('');
    try {
      await deleteShopLogo();
      const result = await getShopSettings();
      const updated = normalizeSavedSettings(result);
      setOriginal(updated);
      setForm(updated);
      window.dispatchEvent(new CustomEvent('psop:shop-logo-updated', { detail: { logo_url: updated.logo_url } }));
      setSuccess('店家 Logo 已移除。');
    } catch (deleteError) {
      setError(deleteError.message || 'Logo 移除失敗。');
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleCreateContractVersion(event) {
    event.preventDefault();
    if (!canEdit) {
      return;
    }
    if (!contractVersionLabel.trim()) {
      setContractVersionsError('版本名稱為必填');
      return;
    }

    setCreatingContractVersion(true);
    setContractVersionsError('');
    setContractVersionsSuccess('');
    try {
      await createContractVersion({
        version_label: contractVersionLabel.trim(),
        service_type: contractVersionServiceType,
      });
      setContractVersionLabel('');
      setContractVersionsSuccess('草稿已建立。');
      await loadContractVersions();
    } catch (createError) {
      setContractVersionsError(createError.message || '草稿建立失敗');
    } finally {
      setCreatingContractVersion(false);
    }
  }

  function startEditingContractVersion(version) {
    setEditingContractVersionId(version.id);
    setEditingContractVersionLabel(version.version_label);
    setContractVersionsError('');
    setContractVersionsSuccess('');
  }

  function cancelEditingContractVersion() {
    setEditingContractVersionId(null);
    setEditingContractVersionLabel('');
  }

  async function handleUpdateContractVersion(versionId) {
    const versionLabel = editingContractVersionLabel.trim();
    if (!canEdit || !versionLabel) {
      setContractVersionsError('版本名稱為必填');
      return;
    }

    setSavingContractVersion(true);
    setContractVersionsError('');
    setContractVersionsSuccess('');
    try {
      await updateContractVersion(versionId, { version_label: versionLabel });
      cancelEditingContractVersion();
      setContractVersionsSuccess('草稿已更新。');
      await loadContractVersions();
    } catch (updateError) {
      setContractVersionsError(updateError.message || '草稿更新失敗');
    } finally {
      setSavingContractVersion(false);
    }
  }

  async function handlePublishContractVersion(versionId) {
    if (!canEdit) {
      return;
    }

    setContractVersionActionId(versionId);
    setContractVersionsError('');
    setContractVersionsSuccess('');
    try {
      await publishContractVersion(versionId);
      setContractVersionsSuccess('契約版本已發布。');
      await loadContractVersions();
    } catch (publishError) {
      setContractVersionsError(publishError.message || '契約版本發布失敗');
    } finally {
      setContractVersionActionId(null);
    }
  }

  async function handleDeleteContractVersion(version) {
    if (!canEdit || !window.confirm(`確定刪除契約版本「${version.version_label}」嗎？刪除後無法復原。`)) {
      return;
    }

    setContractVersionActionId(version.id);
    setContractVersionsError('');
    setContractVersionsSuccess('');
    try {
      const result = await deleteContractVersion(version.id);
      setContractVersionsSuccess(`契約版本「${version.version_label}」已刪除。`);
      await loadContractVersions();
      if (result.pdf_cleanup_warning) {
        setContractVersionsError('版本已刪除，但 PDF 檔案清理失敗，請聯絡系統管理者。');
      }
    } catch (deleteError) {
      setContractVersionsError(deleteError.message || '契約版本刪除失敗');
    } finally {
      setContractVersionActionId(null);
    }
  }

  async function handleUploadContractVersionPdf(versionId) {
    const file = contractPdfFiles[versionId];
    if (!canEdit || !file) {
      setContractVersionsError('請先選擇 PDF 檔案。');
      return;
    }

    setUploadingContractVersionId(versionId);
    setContractVersionsError('');
    setContractVersionsSuccess('');
    try {
      const result = await uploadContractVersionPdf(versionId, file);
      setContractPdfFiles((current) => ({ ...current, [versionId]: null }));
      setContractVersionsSuccess(`PDF「${result.contract_version.file_name}」已上傳。`);
      await loadContractVersions();
    } catch (uploadError) {
      setContractVersionsError(uploadError.message || 'PDF 上傳失敗');
    } finally {
      setUploadingContractVersionId(null);
    }
  }

  async function handleSetCurrentContractVersion(versionId) {
    if (!canEdit) {
      return;
    }

    setContractVersionActionId(versionId);
    setContractVersionsError('');
    setContractVersionsSuccess('');
    try {
      await setCurrentContractVersion(versionId);
      setContractVersionsSuccess('目前使用的契約版本已更新。');
      await loadContractVersions();
    } catch (currentError) {
      setContractVersionsError(currentError.message || '目前契約版本更新失敗');
    } finally {
      setContractVersionActionId(null);
    }
  }

  async function handleStaffRolesChange(staffId, roles) {
    setUpdatingStaffId(staffId);
    setError('');
    setSuccess('');
    try {
      const result = await updateStaffRoles(staffId, roles);
      setStaffAccounts((current) => current.map((account) => (account.id === staffId ? result.staff : account)));
      setSuccess('帳號角色已更新。');
    } catch (updateError) {
      setError(updateError.message || '無法更新帳號角色。');
    } finally {
      setUpdatingStaffId(null);
    }
  }

  async function handleRemoveStaffMembership(account) {
    if (!window.confirm(`確定將「${account.display_name}」移出目前店家嗎？此操作不會停用帳號，也不影響其他店家的任職。`)) {
      return;
    }

    setUpdatingStaffId(account.id);
    setError('');
    setSuccess('');
    try {
      const result = await removeStaffMembership(account.id);
      setStaffAccounts((current) => current.map((item) => (item.id === account.id ? result.staff : item)));
      setSuccess('已移除該員工在目前店家的任職。');
    } catch (removeError) {
      setError(removeError.message || '無法移除員工的店別任職。');
    } finally {
      setUpdatingStaffId(null);
    }
  }

  async function handleStaffStatusChange(account) {
    const nextStatus = account.status === 'active' ? 'inactive' : 'active';
    const actionLabel = nextStatus === 'inactive' ? '停用' : '重新啟用';
    if (!window.confirm(`確定要${actionLabel}帳號「${account.username}」嗎？`)) {
      return;
    }

    setUpdatingStaffId(account.id);
    setError('');
    setSuccess('');
    try {
      const result = await updateStaffStatus(account.id, nextStatus);
      setStaffAccounts((current) => current.map((item) => (item.id === account.id ? result.staff : item)));
      setSuccess(nextStatus === 'inactive' ? '帳號已停用' : '帳號已重新啟用');
    } catch (statusError) {
      setError(statusError.message || `無法${actionLabel}帳號。`);
    } finally {
      setUpdatingStaffId(null);
    }
  }

  function openPasswordModal(account = null) {
    setPasswordModal(account || false);
    setPasswordForm({ current: '', next: '', confirm: '' });
    setPasswordError('');
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    if (passwordForm.next.length < 8) {
      setPasswordError('新密碼至少需要 8 碼');
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError('兩次輸入的密碼不一致');
      return;
    }
    setPasswordSaving(true);
    setPasswordError('');
    try {
      const result = passwordModal
        ? await resetStaffPassword(passwordModal.id, passwordForm.next, passwordForm.confirm)
        : await changeOwnPassword(passwordForm.current, passwordForm.next, passwordForm.confirm);
      setPasswordModal(null);
      setPasswordForm({ current: '', next: '', confirm: '' });
      setSuccess(result.message);
    } catch (passwordSubmitError) {
      setPasswordError(passwordSubmitError.message || '無法更新密碼。');
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="container py-4">
        <div className="alert alert-light border">店家設定載入中...</div>
      </main>
    );
  }

  return (
    <main className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="mb-1">店家設定</h1>
          <p className="text-muted mb-0">管理店家資料與每週營業時間。</p>
        </div>
      </div>

      {canEdit ? (
        <PublicBookingLink
          entryCode={staff?.shops?.find((shop) => Number(shop.id) === Number(staff.shop_id))?.public_entry_code}
        />
      ) : null}

      {error ? <div className="alert alert-danger">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      <form onSubmit={handleSave}>
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h2 className="h5 mb-3">基本資料</h2>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">店家名稱</label>
                <input
                  className="form-control"
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">電話</label>
                <input
                  className="form-control"
                  value={form.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">地址</label>
                <input
                  className="form-control"
                  value={form.address}
                  onChange={(event) => updateField('address', event.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">電子郵件</label>
                <input
                  className="form-control"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="shop-portal-announcement">入口公告</label>
                <textarea
                  id="shop-portal-announcement"
                  className="form-control"
                  rows="3"
                  maxLength="300"
                  value={form.announcement}
                  onChange={(event) => updateField('announcement', event.target.value)}
                  disabled={!canEdit}
                  placeholder="例如：本週六店休，造成不便敬請見諒。"
                />
                <div className="form-text">填寫後會顯示在公開入口的公告跑馬燈，最多 300 字；留白則不顯示。</div>
                <div className="form-text text-end">{Array.from(form.announcement).length}/300</div>
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="shop-logo-upload">入口店家 Logo</label>
                <div className="d-flex flex-wrap align-items-center gap-3">
                  {form.logo_url ? (
                    <div className="settings-logo-preview" aria-label="目前店家 Logo">
                      <img src={`${API_BASE_URL}${form.logo_url}`} alt="" />
                    </div>
                  ) : null}
                  <div className="d-flex flex-wrap gap-2">
                    {!form.logo_url ? <span className="small text-muted align-self-center">尚未上傳 Logo</span> : null}
                    <label className={`btn btn-outline-secondary btn-sm mb-0${!canEdit || logoUploading ? ' disabled' : ''}`} htmlFor="shop-logo-upload">
                      {logoUploading ? '上傳中…' : form.logo_url ? '更換 Logo' : '上傳 Logo'}
                    </label>
                    {form.logo_url ? (
                      <button
                        className="btn btn-outline-danger btn-sm"
                        type="button"
                        onClick={handleShopLogoDelete}
                        disabled={!canEdit || logoUploading}
                      >
                        移除
                      </button>
                    ) : null}
                    <input
                      id="shop-logo-upload"
                      className="visually-hidden"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleShopLogoChange}
                      disabled={!canEdit || logoUploading}
                    />
                  </div>
                </div>
                <div className="form-text mt-2">支援 PNG、JPG、WebP，檔案上限 2 MiB。Logo 會出現在公開入口的店家按鈕。</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h2 className="h5 mb-3">營業時間</h2>
            <div className="table-responsive">
              <table className="table table-bordered align-middle mb-0">
                <thead>
                  <tr>
                    <th>星期</th>
                    <th>休息</th>
                    <th>開始時間</th>
                    <th>結束時間</th>
                  </tr>
                </thead>
                <tbody>
                  {form.business_hours.map((entry) => (
                    <tr key={entry.weekday}>
                      <td>{WEEKDAY_LABELS[entry.weekday] || entry.weekday}</td>
                      <td>
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={Boolean(entry.is_closed)}
                            onChange={(event) => updateBusinessHour(entry.weekday, 'is_closed', event.target.checked)}
                            disabled={!canEdit}
                          />
                          <label className="form-check-label">休息</label>
                        </div>
                      </td>
                      <td>
                        <input
                          className="form-control"
                          type="time"
                          value={entry.is_closed ? '' : (entry.open_time || '')}
                          onChange={(event) => updateBusinessHour(entry.weekday, 'open_time', event.target.value)}
                          disabled={!canEdit || entry.is_closed}
                        />
                      </td>
                      <td>
                        <input
                          className="form-control"
                          type="time"
                          value={entry.is_closed ? '' : (entry.close_time || '')}
                          onChange={(event) => updateBusinessHour(entry.weekday, 'close_time', event.target.value)}
                          disabled={!canEdit || entry.is_closed}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-dark" disabled={!canEdit || saving || !hasChanges}>
            {saving ? '儲存中...' : '儲存'}
          </button>
          <button type="button" className="btn btn-outline-dark" onClick={handleCancel} disabled={!canEdit || !hasChanges}>
            取消
          </button>
        </div>
      </form>

      {canEdit && staff.shop_id ? <ShopPortalAppearanceSettings shopId={staff.shop_id} /> : null}
      {canEdit ? <BookingScheduleSettings /> : null}
      {canEdit ? <BookingResourceSettings /> : null}

      {canEdit ? (
        <section className="card shadow-sm mt-4">
          <div className="card-body">
            <h2 className="h5 mb-1">電子契約版本</h2>
            <p className="text-muted mb-3">美容與住宿契約分開管理。新版本會先建立為草稿；已發布版本不可編輯。</p>

            {contractVersionsError ? <div className="alert alert-danger" role="alert">{contractVersionsError}</div> : null}
            {contractVersionsSuccess ? <div className="alert alert-success" role="status">{contractVersionsSuccess}</div> : null}

            <form className="row g-2 align-items-end mb-4" onSubmit={handleCreateContractVersion}>
              <div className="col-md-4">
                <label className="form-label" htmlFor="contract-version-service-type">服務類型</label>
                <select
                  id="contract-version-service-type"
                  className="form-select"
                  value={contractVersionServiceType}
                  onChange={(event) => setContractVersionServiceType(event.target.value)}
                >
                  <option value="GROOMING">美容</option>
                  <option value="BOARDING">住宿</option>
                  <option value="GENERAL">一般補件</option>
                </select>
              </div>
              <div className="col-md-5">
                <label className="form-label" htmlFor="contract-version-label">版本名稱</label>
                <input
                  id="contract-version-label"
                  className="form-control"
                  value={contractVersionLabel}
                  onChange={(event) => setContractVersionLabel(event.target.value)}
                  maxLength="50"
                  required
                />
              </div>
              <div className="col-md-3">
                <button type="submit" className="btn btn-dark" disabled={creatingContractVersion}>
                  {creatingContractVersion ? '建立中...' : '建立草稿'}
                </button>
              </div>
            </form>

            {contractVersionsLoading ? (
              <div className="alert alert-light border mb-0" role="status">載入中...</div>
            ) : contractVersionsError ? null : contractVersions.length === 0 ? (
              <div className="alert alert-light border mb-0" role="status">目前尚無電子契約版本</div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>服務類型</th>
                      <th>版本</th>
                      <th>狀態</th>
                      <th>目前版本</th>
                      <th>PDF</th>
                      <th>建立時間</th>
                      <th>更新時間</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractVersions.map((version) => {
                      const pdfMetadataExists = hasContractPdfMetadata(version);
                      const pdfMetadataComplete = hasCompleteContractPdfMetadata(version);
                      const isEditing = editingContractVersionId === version.id;
                      const isActionPending = contractVersionActionId === version.id;

                      return (
                        <tr key={version.id}>
                          <td>{({ GROOMING: '美容', BOARDING: '住宿', GENERAL: '一般補件' })[version.service_type] || '一般補件'}</td>
                          <td>
                            {isEditing ? (
                              <input
                                className="form-control form-control-sm"
                                aria-label={`編輯 ${version.version_label} 版本名稱`}
                                value={editingContractVersionLabel}
                                onChange={(event) => setEditingContractVersionLabel(event.target.value)}
                                maxLength="50"
                                required
                              />
                            ) : version.version_label}
                          </td>
                          <td>
                            <span className={`badge ${version.status === 'PUBLISHED' ? 'bg-success' : 'bg-secondary'}`}>
                              {version.status === 'DRAFT' ? '草稿' : '已發布'}
                            </span>
                          </td>
                          <td>{version.is_current ? <span className="badge bg-primary">目前版本</span> : '—'}</td>
                          <td>
                            {pdfMetadataComplete ? (
                              <span>
                                已設定：{version.file_name}
                                {version.status === 'PUBLISHED' ? (
                                  <a className="d-block" href={`${API_BASE_URL}/api/contract-versions/${version.id}/pdf`}>
                                    查看 PDF
                                  </a>
                                ) : null}
                              </span>
                            ) : pdfMetadataExists ? 'PDF 資料不完整' : '尚未設定 PDF'}
                            {version.status === 'DRAFT' && !isEditing ? (
                              <div className="mt-2">
                                <input
                                  className="form-control form-control-sm mb-2"
                                  type="file"
                                  accept=".pdf,application/pdf"
                                  aria-label={`選擇 ${version.version_label} 契約 PDF`}
                                  onChange={(event) => setContractPdfFiles((current) => ({
                                    ...current,
                                    [version.id]: event.target.files[0] || null,
                                  }))}
                                  disabled={uploadingContractVersionId === version.id}
                                />
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-dark"
                                  onClick={() => handleUploadContractVersionPdf(version.id)}
                                  disabled={!contractPdfFiles[version.id] || uploadingContractVersionId === version.id}
                                >
                                  {uploadingContractVersionId === version.id ? '上傳中...' : '上傳 PDF'}
                                </button>
                              </div>
                            ) : null}
                          </td>
                          <td>{displayTimestamp(version.created_at)}</td>
                          <td>{displayTimestamp(version.updated_at)}</td>
                          <td>
                            <div className="d-flex gap-2 flex-wrap">
                              {version.status === 'DRAFT' && !isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-dark"
                                    onClick={() => startEditingContractVersion(version)}
                                    disabled={savingContractVersion || isActionPending}
                                  >編輯</button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-dark"
                                    onClick={() => handlePublishContractVersion(version.id)}
                                    disabled={!pdfMetadataComplete || isActionPending}
                                    title={!pdfMetadataComplete ? '尚未設定 PDF，暫時無法發布' : undefined}
                                  >發布</button>
                                </>
                              ) : null}
                              {version.status === 'PUBLISHED' && !version.is_current ? (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-dark"
                                  onClick={() => handleSetCurrentContractVersion(version.id)}
                                  disabled={isActionPending}
                                >{isActionPending ? '更新中...' : '設為目前版本'}</button>
                              ) : null}
                              {!version.is_current && !version.is_referenced ? (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDeleteContractVersion(version)}
                                  disabled={isActionPending}
                                >{isActionPending ? '刪除中...' : '刪除'}</button>
                              ) : null}
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-dark"
                                    onClick={() => handleUpdateContractVersion(version.id)}
                                    disabled={savingContractVersion}
                                  >{savingContractVersion ? '儲存中...' : '儲存'}</button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={cancelEditingContractVersion}
                                    disabled={savingContractVersion}
                                  >取消</button>
                                </>
                              ) : null}
                            </div>
                            {version.status === 'DRAFT' && !pdfMetadataComplete ? (
                              <small className="d-block text-muted mt-1">尚未設定 PDF，暫時無法發布</small>
                            ) : null}
                            {version.is_current ? (
                              <small className="d-block text-muted mt-1">目前使用中的版本無法刪除</small>
                            ) : version.is_referenced ? (
                              <small className="d-block text-muted mt-1">已被建檔或簽署紀錄引用，無法刪除</small>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {staffAccounts.length ? (
        <section className="card shadow-sm mt-4">
          <div className="card-body">
            <h2 className="h5 mb-1">目前店家的員工與角色</h2>
            <p className="text-muted mb-3">OWNER 可管理本店前台與美容師的任職及角色；建立帳號、指派 OWNER、停用全域帳號及重設密碼由系統管理者處理。</p>
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead><tr><th>使用者名稱</th><th>顯示名稱</th><th>本店角色</th><th>帳號狀態</th><th>本店任職</th><th>操作</th></tr></thead>
                <tbody>
                  {staffAccounts.map((account) => (
                    <tr key={account.id}>
                      <td>{account.username}</td>
                      <td>{account.display_name}</td>
                      <td>
                        {account.is_platform_shop_manager ? <span className="badge text-bg-dark me-2">系統管理者</span> : null}
                        <div className="d-flex gap-3 flex-wrap">
                          {['OWNER', 'FRONT_DESK', 'GROOMER'].map((role) => (
                            <label className="form-check" key={role}>
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={account.roles.includes(role)}
                                disabled={!canEdit || (!canManageAllAccounts && (account.is_platform_shop_manager || account.roles.includes('OWNER') || role === 'OWNER')) || account.status === 'inactive' || updatingStaffId === account.id}
                                onChange={(event) => handleStaffRolesChange(account.id, event.target.checked
                                  ? [...account.roles, role]
                                  : account.roles.filter((item) => item !== role))}
                              />
                              <span className="form-check-label">{getRoleLabel(role)}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td>{account.status === 'ACTIVE' || account.status === 'active' ? '啟用' : account.status === 'INACTIVE' || account.status === 'inactive' ? '停用' : account.status}</td>
                      <td>{account.is_platform_shop_manager ? '跨店管理' : account.is_member ? '已加入' : '未加入'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline-dark btn-sm"
                          disabled={!canManageAllAccounts || account.id === staff.id || updatingStaffId === account.id}
                          onClick={() => handleStaffStatusChange(account)}
                        >
                          {account.status === 'active' ? '停用' : '重新啟用'}
                        </button>
                        {account.id === staff.id ? (
                          <button type="button" className="btn btn-outline-dark btn-sm ms-1" onClick={() => openPasswordModal()}>
                            更改密碼
                          </button>
                        ) : canManageAllAccounts && canEdit ? (
                          <button type="button" className="btn btn-outline-dark btn-sm ms-1" onClick={() => openPasswordModal(account)} disabled={updatingStaffId === account.id}>
                            重設密碼
                          </button>
                        ) : null}
                        {account.is_member && !account.is_platform_shop_manager && account.id !== staff.id ? (
                          <button type="button" className="btn btn-outline-danger btn-sm ms-1" onClick={() => handleRemoveStaffMembership(account)} disabled={updatingStaffId === account.id}>
                            移出本店
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      <button type="button" className="btn btn-outline-dark mt-4" onClick={() => openPasswordModal()}>
        更改我的密碼
      </button>

      {passwordModal !== null ? (
        <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="password-modal-title">
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handlePasswordSubmit}>
                <div className="modal-header">
                  <h2 className="modal-title h5" id="password-modal-title">{passwordModal ? `重設 ${passwordModal.username} 的密碼` : '更改我的密碼'}</h2>
                  <button type="button" className="btn-close" aria-label="關閉" onClick={() => setPasswordModal(null)} />
                </div>
                <div className="modal-body">
                  {passwordError ? <div className="alert alert-danger">{passwordError}</div> : null}
                  {!passwordModal ? <label className="form-label">目前密碼<input className="form-control" type="password" value={passwordForm.current} onChange={(event) => setPasswordForm({ ...passwordForm, current: event.target.value })} required /></label> : null}
                  <label className="form-label">新密碼<input className="form-control" type="password" minLength="8" value={passwordForm.next} onChange={(event) => setPasswordForm({ ...passwordForm, next: event.target.value })} required /></label>
                  <label className="form-label">確認新密碼<input className="form-control" type="password" minLength="8" value={passwordForm.confirm} onChange={(event) => setPasswordForm({ ...passwordForm, confirm: event.target.value })} required /></label>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setPasswordModal(null)}>取消</button>
                  <button type="submit" className="btn btn-dark" disabled={passwordSaving}>{passwordSaving ? '處理中...' : '確認'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
