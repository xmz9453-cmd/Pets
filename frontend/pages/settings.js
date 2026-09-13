import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { changeOwnPassword, getCurrentStaff, getShopSettings, getStaffAccounts, resetOperationalData, resetStaffPassword, updateShopSettings, updateStaffRoles, updateStaffStatus } from '../api/client';
import { getRoleLabel } from '../utils/staff-display';

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

export default function SettingsPage() {
  const router = useRouter();
  const [staff, setStaff] = useState(null);
  const [form, setForm] = useState(buildEmptySettings());
  const [original, setOriginal] = useState(buildEmptySettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [staffAccounts, setStaffAccounts] = useState([]);
  const [updatingStaffId, setUpdatingStaffId] = useState(null);
  const [passwordModal, setPasswordModal] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [resetModal, setResetModal] = useState(null);
  const [resetting, setResetting] = useState(false);

  const canEdit = staff && staff.roles && staff.roles.includes('OWNER');

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
          router.replace('/');
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

  async function handleResetOperationalData() {
    setResetting(true);
    setError('');
    setSuccess('');
    try {
      const result = await resetOperationalData();
      setResetModal(null);
      setSuccess(result.message || '測試／營運資料已清除。');
    } catch (resetError) {
      setResetModal(null);
      setError(resetError.message || '無法清除測試／營運資料。');
    } finally {
      setResetting(false);
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

      {staffAccounts.length ? (
        <section className="card shadow-sm mt-4">
          <div className="card-body">
            <h2 className="h5 mb-3">帳號與角色</h2>
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead><tr><th>使用者名稱</th><th>顯示名稱</th><th>角色</th><th>狀態</th><th>操作</th></tr></thead>
                <tbody>
                  {staffAccounts.map((account) => (
                    <tr key={account.id}>
                      <td>{account.username}</td>
                      <td>{account.display_name}</td>
                      <td>
                        <div className="d-flex gap-3 flex-wrap">
                          {['OWNER', 'FRONT_DESK', 'GROOMER'].map((role) => (
                            <label className="form-check" key={role}>
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={account.roles.includes(role)}
                                disabled={!canEdit || updatingStaffId === account.id}
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
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline-dark btn-sm"
                          disabled={!canEdit || account.id === staff.id || updatingStaffId === account.id}
                          onClick={() => handleStaffStatusChange(account)}
                        >
                          {account.status === 'active' ? '停用' : '重新啟用'}
                        </button>
                        {account.id === staff.id ? (
                          <button type="button" className="btn btn-outline-dark btn-sm ms-1" onClick={() => openPasswordModal()}>
                            更改密碼
                          </button>
                        ) : canEdit ? (
                          <button type="button" className="btn btn-outline-dark btn-sm ms-1" onClick={() => openPasswordModal(account)} disabled={updatingStaffId === account.id}>
                            重設密碼
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

      {canEdit ? (
        <section className="card border-danger shadow-sm mt-4">
          <div className="card-body">
            <h2 className="h5 mb-2">測試／營運資料管理</h2>
            <p className="text-muted">清除測試期間建立的所有營運資料，店家設定與登入資料會保留。</p>
            <button type="button" className="btn btn-danger" onClick={() => setResetModal('warning')} disabled={resetting}>
              清除測試／營運資料
            </button>
          </div>
        </section>
      ) : null}

      {resetModal === 'warning' ? (
        <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="reset-warning-title">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title h5" id="reset-warning-title">清除測試／營運資料</h2>
                <button type="button" className="btn-close" aria-label="關閉" onClick={() => setResetModal(null)} />
              </div>
              <div className="modal-body">
                <p>這會清除大量測試／營運資料，包括 Customer、Pet、Service、Product、Appointment、Order、Payment 等資料。</p>
                <p>這不是單筆刪除，清除後無法透過一般 UI 還原。店家設定、員工、角色與登入 session 等基礎資料不會被清除。</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setResetModal(null)}>取消</button>
                <button type="button" className="btn btn-danger" onClick={() => setResetModal('confirm')}>繼續</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {resetModal === 'confirm' ? (
        <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="reset-confirm-title">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title h5" id="reset-confirm-title">再次確認</h2>
                <button type="button" className="btn-close" aria-label="關閉" onClick={() => setResetModal(null)} />
              </div>
              <div className="modal-body">是否確定要清除所有測試／營運資料？</div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setResetModal(null)}>取消</button>
                <button type="button" className="btn btn-danger" onClick={handleResetOperationalData} disabled={resetting}>
                  {resetting ? '清除中...' : '確定清除'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
