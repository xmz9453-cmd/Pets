import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createService, deleteService, getCurrentStaff, getServices, updateService } from '../api/client';

const createEmptyForm = (type = 'GROOMING') => ({
  name: '',
  type,
  description: '',
  price: '',
  unit: type === 'BOARDING' ? '晚' : '次',
  species: 'CAT',
  duration_minutes: '',
  sort_order: '',
  allow_fractional_quantity: false,
  breed_price_category: 'STANDARD',
});
const emptyForm = createEmptyForm();
const typeLabels = { GROOMING: '美容', BOARDING: '住宿', ADD_ON: '加購服務' };
const speciesLabels = { DOG: '狗', CAT: '貓', BOTH: '狗與貓' };
const breedPriceCategoryLabels = {
  STANDARD: '一般單價（不扣包月點數）',
  BATH: '洗澡單價（包月扣 1 點）',
  ELECTRIC_CLIPPER: '電剪修毛單價（包月扣 2 點）',
  HAND_SCISSOR: '全手修剪單價（包月扣 3 點）',
};

function formatMoney(value) {
  return Number(value).toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}

function nextSortOrder(services) {
  return services.reduce((maximum, service) => Math.max(maximum, Number(service.sort_order) || 0), 0) + 10;
}

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [filters, setFilters] = useState({ search: '', type: 'ALL', status: 'ALL' });
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadServices(nextFilters = filters) {
    try {
      setLoading(true);
      const result = await getServices(nextFilters);
      const loadedServices = result.services || [];
      setServices(loadedServices);
      if (!editingId) {
        setFormData((current) => current.sort_order === ''
          ? { ...current, sort_order: String(nextSortOrder(loadedServices)) }
          : current);
      }
      setError('');
    } catch (loadError) {
      setError(loadError.message || '載入服務失敗');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getCurrentStaff().then(() => loadServices()).catch(() => router.replace('/login'));
  }, [router]);

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }));
    setError('');
  }

  function handleTypeChange(nextType) {
    setFormData((current) => ({
      ...current,
      type: nextType,
      unit: nextType === 'BOARDING' ? '晚' : '次',
      duration_minutes: nextType === 'GROOMING' ? current.duration_minutes || '' : '',
      allow_fractional_quantity: nextType === 'ADD_ON' ? current.allow_fractional_quantity : false,
    }));
    setError('');
  }

  function startEdit(service) {
    setEditingId(service.id);
    setFormData({
      name: service.name || '',
      type: service.type || 'GROOMING',
      description: service.description || '',
      price: service.price ?? '',
      unit: service.type === 'ADD_ON' ? service.unit : service.type === 'BOARDING' ? '晚' : '次',
      species: service.species || 'CAT',
      duration_minutes: service.type === 'BOARDING' ? '' : service.duration_minutes ?? '',
      sort_order: String(service.sort_order ?? 0),
      allow_fractional_quantity: Boolean(service.allow_fractional_quantity),
      breed_price_category: service.breed_price_category || 'STANDARD',
    });
    setError('');
  }

  function resetForm() {
    setEditingId(null);
    setFormData({ ...createEmptyForm(), sort_order: String(nextSortOrder(services)) });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const normalizedType = formData.type;
      const payload = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: Number(formData.price),
        unit: normalizedType === 'ADD_ON' ? formData.unit.trim() : normalizedType === 'BOARDING' ? '晚' : '次',
        species: formData.species,
        sort_order: Number(formData.sort_order),
      };
      if (normalizedType === 'GROOMING') {
        payload.duration_minutes = Number(formData.duration_minutes);
        payload.package_point_cost = { STANDARD: 0, BATH: 1, ELECTRIC_CLIPPER: 2, HAND_SCISSOR: 3 }[formData.breed_price_category];
      } else {
        delete payload.duration_minutes;
        payload.breed_price_category = 'STANDARD';
        payload.package_point_cost = 0;
      }
      payload.sort_order = Number(formData.sort_order);
      if (editingId) {
        await updateService(editingId, payload);
      } else {
        await createService(payload);
      }
      resetForm();
      await loadServices();
    } catch (submitError) {
      setError(submitError.message || '儲存服務失敗');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(service) {
    const status = service.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (status === 'INACTIVE' && !window.confirm('確定要停用此服務嗎？')) return;
    try {
      setSaving(true);
      setError('');
      await updateService(service.id, { status });
      await loadServices();
    } catch (statusError) {
      setError(statusError.message || '更新服務狀態失敗');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(service) {
    if (!window.confirm(`確定要刪除「${service.name}」嗎？`)) return;
    try {
      setSaving(true);
      setError('');
      await deleteService(service.id);
      await loadServices();
    } catch (deleteError) {
      setError(deleteError.message || '刪除服務失敗');
    } finally {
      setSaving(false);
    }
  }

  function submitFilters(event) {
    event.preventDefault();
    loadServices(filters);
  }

  return (
    <main className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-1">服務管理</h1>
          <p className="text-muted mb-0">管理美容、住宿與可單獨加購的服務。</p>
        </div>
        <button type="button" className="btn btn-outline-primary" onClick={() => router.push('/service-packages')}>包月／包季方案</button>
      </div>

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="foundation-panel">
            <h2 className="h5 mb-3">{editingId ? '編輯服務' : '新增服務'}</h2>
            <form onSubmit={handleSubmit}>
              <label className="form-label">服務名稱</label>
              <input className="form-control mb-3" required maxLength="100" value={formData.name} onChange={(event) => updateField('name', event.target.value)} />

              <div className="row g-2">
                <div className="col-6">
                  <label className="form-label">類型</label>
                  <select className="form-select" value={formData.type} onChange={(event) => handleTypeChange(event.target.value)}>
                    <option value="GROOMING">美容</option>
                    <option value="BOARDING">住宿</option>
                    <option value="ADD_ON">加購服務</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label">適用物種</label>
                  <select className="form-select" value={formData.species} onChange={(event) => updateField('species', event.target.value)}>
                    <option value="DOG">狗</option>
                    <option value="CAT">貓</option>
                  </select>
                </div>
              </div>

              <label className="form-label mt-3">說明</label>
              <textarea className="form-control" rows="3" maxLength="500" value={formData.description} onChange={(event) => updateField('description', event.target.value)} />

              <div className="row g-2 mt-1">
                <div className="col-6">
                  <label className="form-label">價格</label>
                  <input className="form-control" required type="number" min="1" step="1" value={formData.price} onChange={(event) => updateField('price', event.target.value)} />
                </div>
                <div className="col-6">
                  <label className="form-label">單位</label>
                  <input className="form-control" readOnly={formData.type !== 'ADD_ON'} value={formData.type === 'BOARDING' ? '晚' : formData.type === 'ADD_ON' ? formData.unit : '次'} onChange={(event) => updateField('unit', event.target.value)} />
                </div>
              </div>

              <div className="mt-3">
                <label className="form-label" htmlFor="service-sort-order">排序序號</label>
                <input id="service-sort-order" className="form-control" type="number" min="0" step="1" value={formData.sort_order} onChange={(event) => updateField('sort_order', event.target.value)} required />
                <div className="form-text">數字越小，越先顯示。</div>
              </div>

              {formData.type === 'ADD_ON' ? (
                <div className="form-check mt-3">
                  <input id="service-fractional-quantity" className="form-check-input" type="checkbox" checked={formData.allow_fractional_quantity} onChange={(event) => updateField('allow_fractional_quantity', event.target.checked)} />
                  <label className="form-check-label" htmlFor="service-fractional-quantity">數量允許小數</label>
                  <div className="form-text">例如車資可按公里數計算</div>
                </div>
              ) : null}

              {formData.type === 'GROOMING' ? (
                <div className="row g-2 mt-1">
                  <div className="col-12">
                    <label className="form-label">品種單價與包月扣點</label>
                    <select className="form-select" value={formData.breed_price_category} onChange={(event) => updateField('breed_price_category', event.target.value)}>
                      {Object.entries(breedPriceCategoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <div className="form-text">選擇洗澡、電剪或全手修剪後，現場訂單會依寵物品種套用價目表價格。</div>
                  </div>
                  <div className="col-12">
                    <label className="form-label">預估時間（分鐘）</label>
                    <input className="form-control" required type="number" min="1" step="1" value={formData.duration_minutes} onChange={(event) => updateField('duration_minutes', event.target.value)} />
                  </div>
                </div>
              ) : null}

              <div className="d-flex justify-content-between mt-3">
                <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>重設</button>
                <button type="submit" className="btn btn-dark" disabled={saving}>{saving ? '儲存中...' : editingId ? '更新服務' : '新增服務'}</button>
              </div>
            </form>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="foundation-panel">
            <form className="row g-2 align-items-end mb-3" onSubmit={submitFilters}>
              <div className="col-md-5">
                <label className="form-label">搜尋</label>
                <input className="form-control" placeholder="輸入服務名稱" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
              </div>
              <div className="col-md-3">
                <label className="form-label">類型</label>
                <select className="form-select" value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}>
                  <option value="ALL">全部</option>
                  <option value="GROOMING">美容</option>
                  <option value="BOARDING">住宿</option>
                  <option value="ADD_ON">加購服務</option>
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">狀態</label>
                <select className="form-select" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
                  <option value="ALL">全部</option>
                  <option value="ACTIVE">啟用</option>
                  <option value="INACTIVE">停用</option>
                </select>
              </div>
              <div className="col-md-2">
                <button type="submit" className="btn btn-dark">搜尋</button>
              </div>
            </form>

            {error ? <div className="alert alert-warning" role="alert">{error}</div> : null}

            {loading ? (
              <p className="text-muted mb-0">服務載入中...</p>
            ) : services.length === 0 ? (
              <div className="alert alert-light border" role="alert">查無符合條件的服務</div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>服務名稱</th>
                      <th>類型</th>
                      <th>價格</th>
                      <th>物種</th>
                      <th>時間</th>
                      <th>狀態</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((service) => (
                      <tr key={service.id}>
                        <td>
                          <button type="button" className="btn btn-link p-0 text-start text-dark text-decoration-none" onClick={() => router.push(`/services/${service.id}`)}>
                            {service.name}
                            <small className="d-block text-muted">{service.description || '未填寫說明'}</small>
                            <small className="d-block text-muted">排序序號：{service.sort_order ?? 0}</small>
                          </button>
                        </td>
                        <td>{typeLabels[service.type]}</td>
                        <td>
                          {service.breed_price_category && service.breed_price_category !== 'STANDARD'
                            ? <>{breedPriceCategoryLabels[service.breed_price_category]?.split('（')[0]}／依品種價目</>
                            : `${formatMoney(service.price)} / ${service.unit}`}
                        </td>
                        <td>{speciesLabels[service.species]}</td>
                        <td>{service.type !== 'ADD_ON' && service.duration_minutes ? `${service.duration_minutes} 分鐘` : '—'}</td>
                        <td>
                          <span className={`badge ${service.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>
                            {service.status === 'ACTIVE' ? '啟用' : '停用'}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => startEdit(service)}>編輯</button>
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => handleStatusChange(service)}>{service.status === 'ACTIVE' ? '停用' : '啟用'}</button>
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(service)}>刪除</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
