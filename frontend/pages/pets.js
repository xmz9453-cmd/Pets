import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createPet, deletePet, getCurrentStaff, getCustomers, getPets, updatePet } from '../api/client';

const emptyForm = {
  customer_id: '',
  name: '',
  species: 'DOG',
  breed: '',
  gender: 'UNKNOWN',
  birthday: '',
  note: '',
};

const speciesLabels = { DOG: '狗', CAT: '貓' };
const genderLabels = { MALE: '公', FEMALE: '母', UNKNOWN: '未設定' };

export default function PetsPage() {
  const router = useRouter();
  const [pets, setPets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filters, setFilters] = useState({ search: '', customer_id: '', status: 'ALL' });
  const [submittedFilters, setSubmittedFilters] = useState(filters);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadPets(nextFilters = submittedFilters) {
    try {
      setLoading(true);
      const result = await getPets(nextFilters);
      setPets(result.pets || []);
      setError('');
    } catch (loadError) {
      setError('載入寵物失敗');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function loadPage() {
      try {
        await getCurrentStaff();
        const customerResult = await getCustomers({ status: 'ACTIVE' });
        if (!active) return;
        setCustomers((customerResult.customers || []).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant')));
        await loadPets();
      } catch (loadError) {
        if (active) router.replace('/login');
      }
    }
    loadPage();
    return () => { active = false; };
  }, [router]);

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  function startEdit(pet) {
    setEditingId(pet.id);
    setFormData({
      customer_id: pet.customer_id || pet.primary_customer_id || '',
      name: pet.name || '',
      species: pet.species || 'DOG',
      breed: pet.breed || '',
      gender: pet.gender || 'UNKNOWN',
      birthday: pet.birth_date ? String(pet.birth_date).slice(0, 10) : '',
      note: pet.notes || '',
    });
    setError('');
  }

  function resetForm() {
    setEditingId(null);
    setFormData(emptyForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        customer_id: Number(formData.customer_id),
        name: formData.name.trim(),
        species: formData.species,
        breed: formData.breed.trim() || null,
        gender: formData.gender,
        birthday: formData.birthday || null,
        note: formData.note || null,
      };
      if (editingId) await updatePet(editingId, payload);
      else await createPet(payload);
      resetForm();
      await loadPets();
    } catch (submitError) {
      setError(submitError.message || '儲存寵物失敗');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(pet, status) {
    if (status === 'INACTIVE' && !window.confirm('確定要停用這隻寵物嗎？')) return;
    try {
      setSaving(true);
      setError('');
      await updatePet(pet.id, { status });
      await loadPets();
    } catch (statusError) {
      setError(statusError.message || '更新寵物狀態失敗');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(pet) {
    if (!window.confirm(`確定要永久刪除寵物「${pet.name}」嗎？此操作無法復原。`)) return;
    try {
      setSaving(true);
      setError('');
      await deletePet(pet.id);
      await loadPets();
    } catch (deleteError) {
      setError(deleteError.message || '刪除寵物失敗');
    } finally {
      setSaving(false);
    }
  }

  function submitFilters(event) {
    event.preventDefault();
    setSubmittedFilters(filters);
    loadPets(filters);
  }

  function clearFilters() {
    const cleared = { search: '', customer_id: '', status: 'ALL' };
    setFilters(cleared);
    setSubmittedFilters(cleared);
    loadPets(cleared);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-1">寵物管理</h1>
          <p className="text-muted mb-0">管理寵物基本資料、客戶關聯與使用狀態。</p>
        </div>
        <button type="button" className="btn btn-outline-dark" onClick={() => router.push('/')}>返回首頁</button>
      </div>

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="foundation-panel">
            <h2 className="h5 mb-3">{editingId ? '編輯寵物' : '新增寵物'}</h2>
            <form onSubmit={handleSubmit}>
              <label className="form-label">所屬客戶</label>
              <select className="form-select mb-3" required value={formData.customer_id} onChange={(event) => updateField('customer_id', event.target.value)}>
                <option value="">請選擇客戶</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>
              <label className="form-label">名稱</label>
              <input className="form-control mb-3" required maxLength="100" value={formData.name} onChange={(event) => updateField('name', event.target.value)} />
              <div className="row g-2">
                <div className="col-6"><label className="form-label">種類</label><select className="form-select" value={formData.species} onChange={(event) => updateField('species', event.target.value)}><option value="DOG">狗</option><option value="CAT">貓</option></select></div>
                <div className="col-6"><label className="form-label">性別</label><select className="form-select" value={formData.gender} onChange={(event) => updateField('gender', event.target.value)}><option value="UNKNOWN">未設定</option><option value="MALE">公</option><option value="FEMALE">母</option></select></div>
              </div>
              <label className="form-label mt-3">品種</label>
              <input className="form-control" maxLength="100" value={formData.breed} onChange={(event) => updateField('breed', event.target.value)} />
              <label className="form-label mt-3">生日</label>
              <input className="form-control" type="date" max={today} value={formData.birthday} onChange={(event) => updateField('birthday', event.target.value)} />
              <label className="form-label mt-3">備註</label>
              <textarea className="form-control" rows="3" maxLength="1000" value={formData.note} onChange={(event) => updateField('note', event.target.value)} />
              <div className="d-flex gap-2 mt-3"><button type="submit" className="btn btn-dark" disabled={saving}>{saving ? '儲存中...' : editingId ? '儲存修改' : '新增寵物'}</button>{editingId ? <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>取消</button> : null}</div>
            </form>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="foundation-panel">
            <form className="row g-2 align-items-end mb-3" onSubmit={submitFilters}>
              <div className="col-md-5"><label className="form-label">搜尋</label><input className="form-control" placeholder="輸入寵物名稱" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></div>
              <div className="col-md-3"><label className="form-label">客戶</label><select className="form-select" value={filters.customer_id} onChange={(event) => setFilters({ ...filters, customer_id: event.target.value })}><option value="">全部客戶</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></div>
              <div className="col-md-2"><label className="form-label">狀態</label><select className="form-select" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="ALL">全部</option><option value="ACTIVE">啟用</option><option value="INACTIVE">停用</option></select></div>
              <div className="col-md-2 d-flex gap-2"><button type="submit" className="btn btn-dark">搜尋</button><button type="button" className="btn btn-outline-secondary" onClick={clearFilters}>清除</button></div>
            </form>
            {error ? <div className="alert alert-warning" role="alert">{error}</div> : null}
            {loading ? <p className="text-muted mb-0">寵物載入中...</p> : pets.length === 0 ? <div className="alert alert-light border" role="alert">查無符合條件的寵物</div> : <div className="table-responsive"><table className="table align-middle"><thead><tr><th>名稱</th><th>種類</th><th>客戶</th><th>狀態</th><th className="text-end">操作</th></tr></thead><tbody>{pets.map((pet) => <tr key={pet.id}><td>{pet.name}<small className="d-block text-muted">{pet.breed || '未填寫品種'}</small></td><td>{speciesLabels[pet.species] || pet.species}<small className="d-block text-muted">{genderLabels[pet.gender] || pet.gender}</small></td><td>{pet.customer_name || pet.primary_customer_name || '未指定'}</td><td><span className={`badge ${pet.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>{pet.status === 'ACTIVE' ? '啟用' : '停用'}</span></td><td className="text-end"><div className="btn-group btn-group-sm"><button type="button" className="btn btn-outline-dark" onClick={() => startEdit(pet)}>編輯</button><button type="button" className={`btn ${pet.status === 'ACTIVE' ? 'btn-outline-warning' : 'btn-outline-success'}`} onClick={() => handleStatusChange(pet, pet.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')} disabled={saving}>{pet.status === 'ACTIVE' ? '停用' : '啟用'}</button><button type="button" className="btn btn-outline-danger" onClick={() => handleDelete(pet)} disabled={saving}>刪除</button></div></td></tr>)}</tbody></table></div>}
          </div>
        </div>
      </div>
    </main>
  );
}
