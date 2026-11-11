import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  createServicePackagePlan,
  getCurrentStaff,
  getServicePackagePlans,
  getServices,
  updateServicePackagePlan,
} from '../api/client';

const emptyForm = {
  description: '',
  species: 'DOG',
  bath_service_id: '',
};

function formatAmount(value) {
  return Number(value).toLocaleString('zh-TW', { maximumFractionDigits: 2 });
}

export default function ServicePackagesPage() {
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [services, setServices] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    try {
      setLoading(true);
      const [planData, serviceData] = await Promise.all([
        getServicePackagePlans({ status: 'ALL' }),
        getServices({ type: 'GROOMING', status: 'ACTIVE' }),
      ]);
      setEnabled(planData.enabled !== false);
      setPlans(planData.plans || []);
      setServices(serviceData.services || []);
      setError('');
    } catch (loadError) {
      setError(loadError.message || '美容包月卡設定載入失敗');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getCurrentStaff().then(load).catch(() => router.replace('/login'));
  }, [router]);

  function editPlan(plan) {
    setEditingId(plan.id);
    setForm({
      description: plan.description || '',
      species: plan.species,
      bath_service_id: String(plan.service_ids_by_type?.bath || ''),
    });
    setSuccess('');
    setError('');
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        ...form,
        description: form.description.trim() || null,
        bath_service_id: Number(form.bath_service_id),
      };
      if (editingId) {
        await updateServicePackagePlan(editingId, payload);
        setSuccess('美容包月卡設定已更新');
      } else {
        await createServicePackagePlan(payload);
        setSuccess('美容包月卡設定已新增');
      }
      resetForm();
      await load();
    } catch (saveError) {
      setError(saveError.message || '美容包月卡設定儲存失敗');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(plan) {
    setError('');
    setSuccess('');
    try {
      await updateServicePackagePlan(plan.id, { status: plan.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
      setSuccess(`已${plan.status === 'ACTIVE' ? '停用' : '啟用'}「${plan.name}」`);
      await load();
    } catch (saveError) {
      setError(saveError.message || '美容包月卡狀態更新失敗');
    }
  }

  const availableServices = services.filter((service) => (
    service.type === 'GROOMING' && (
    form.species === 'BOTH'
      ? service.species === 'BOTH'
      : service.species === 'BOTH' || service.species === form.species
    )
  ));
  const bathServices = availableServices.filter((service) => (
    service.breed_price_category === 'BATH' && Number(service.package_point_cost) === 1
  ));
  const speciesHasPlan = (species) => plans.some((plan) => (
    plan.status === 'ACTIVE'
    &&
    plan.id !== editingId
    && (plan.species === species || plan.species === 'BOTH' || species === 'BOTH')
  ));

  return (
    <main className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-1">美容包月卡設定</h1>
          <p className="text-muted mb-0">每隻寵物使用同一種 5 點美容卡；只設定卡片的適用種類與洗澡計價基準。</p>
        </div>
        <button type="button" className="btn btn-outline-dark" onClick={() => router.push('/services')}>返回服務管理</button>
      </div>
      {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
      {success ? <div className="alert alert-success" role="status">{success}</div> : null}
      {!enabled ? <div className="alert alert-info" role="status">此店家未開放包月方案；客戶的既有方案紀錄仍可查看。</div> : null}
      <div className="row g-4">
        {enabled ? <div className="col-lg-5">
          <div className="foundation-panel">
            <h2 className="h5">{editingId ? '編輯美容包月卡' : '新增美容包月卡'}</h2>
            <form onSubmit={submit}>
              <div className="alert alert-info py-2">固定規則：每卡 5 點、50 天有效；洗澡扣 1 點、電剪（含洗澡）扣 2 點、全手修剪（含洗澡）扣 3 點。一次只選一種美容主服務，不會把洗澡與修剪點數相加。</div>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label" htmlFor="plan-species">適用寵物</label>
                  <select id="plan-species" className="form-select" value={form.species} onChange={(event) => setForm({ ...form, species: event.target.value, bath_service_id: '' })}>
                    <option value="BOTH" disabled={speciesHasPlan('BOTH')}>狗與貓{speciesHasPlan('BOTH') ? '（已設定）' : ''}</option>
                    <option value="DOG" disabled={speciesHasPlan('DOG')}>狗{speciesHasPlan('DOG') ? '（已設定）' : ''}</option>
                    <option value="CAT" disabled={speciesHasPlan('CAT')}>貓{speciesHasPlan('CAT') ? '（已設定）' : ''}</option>
                  </select>
                </div>
              </div>
              <p className="small text-muted mt-3 mb-0">售價為洗澡實際報價 × 4。犬種價目標示 UP 時，購買時可輸入高於起價的實際報價；未有品種價格時按洗澡服務單價計算。</p>
              <label className="form-label mt-3" htmlFor="bath-service">洗澡計價服務</label>
              <select id="bath-service" className="form-select mb-3" required value={form.bath_service_id} onChange={(event) => setForm({ ...form, bath_service_id: event.target.value })}>
                <option value="">請選擇已設定「洗澡・扣 1 點」的服務</option>
                {bathServices.map((service) => <option key={service.id} value={service.id}>{service.name}（{service.species === 'BOTH' ? '狗與貓' : service.species === 'DOG' ? '狗' : '貓'}）</option>)}
              </select>
              {form.bath_service_id ? <p className="small text-muted">此洗澡服務單價 {formatAmount(bathServices.find((service) => String(service.id) === form.bath_service_id)?.price || 0)} 元；基本卡價 ${formatAmount(Number(bathServices.find((service) => String(service.id) === form.bath_service_id)?.price || 0) * 4)}。</p> : null}
              <div className="d-flex gap-2 mt-4">
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '儲存中...' : editingId ? '儲存設定' : '新增設定'}</button>
                {editingId ? <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>取消編輯</button> : null}
              </div>
            </form>
          </div>
        </div> : null}
        <div className="col-lg-7">
          <div className="foundation-panel">
            <h2 className="h5">美容包月卡設定</h2>
            {loading ? <p className="text-muted">載入中...</p> : plans.length === 0 ? <p className="text-muted mb-0">尚未設定美容包月卡。</p> : (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead><tr><th>適用寵物</th><th>固定規則</th><th>基本卡價</th><th>狀態</th><th>操作</th></tr></thead>
                  <tbody>{plans.map((plan) => (
                    <tr key={plan.id}>
                      <td><strong>{plan.species === 'BOTH' ? '狗與貓' : plan.species === 'DOG' ? '狗' : '貓'}</strong><div className="small text-muted">{services.find((service) => Number(service.id) === plan.service_ids_by_type?.bath)?.name || '未設定洗澡服務'}</div></td>
                      <td>5 點／50 天<div className="small text-muted">洗澡 1・電剪 2・全手 3 點（擇一）</div></td>
                      <td>${formatAmount(plan.price)}</td>
                      <td><span className={`badge ${plan.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>{plan.status === 'ACTIVE' ? '啟用' : '停用'}</span></td>
                      <td className="text-nowrap">
                        <button type="button" className="btn btn-sm btn-outline-primary me-1" onClick={() => editPlan(plan)}>編輯</button>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => toggleStatus(plan)}>{plan.status === 'ACTIVE' ? '停用' : '啟用'}</button>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
