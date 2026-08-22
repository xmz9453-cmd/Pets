import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { getCurrentStaff, getShopSettings, updateShopSettings } from '../api/client';

const WEEKDAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const WEEKDAY_LABELS = {
  MONDAY: '星期一', TUESDAY: '星期二', WEDNESDAY: '星期三', THURSDAY: '星期四',
  FRIDAY: '星期五', SATURDAY: '星期六', SUNDAY: '星期日',
};

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
      open_time: entry.open_time || '',
      close_time: entry.close_time || '',
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
        const result = await getShopSettings();
        const normalized = normalizeSavedSettings(result);

        if (!active) {
          return;
        }

        setForm(normalized);
        setOriginal(normalized);
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
        <a href="/" className="btn btn-outline-dark">返回首頁</a>
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
                <label className="form-label">Email</label>
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
    </main>
  );
}
