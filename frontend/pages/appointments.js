import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  createAppointment,
  deleteAppointment,
  getAppointment,
  getAppointments,
  getCurrentStaff,
  getCustomers,
  getPets,
  getServices,
  updateAppointment,
} from '../api/client';

const EMPTY_FORM = {
  customer_id: '',
  appointment_date: '',
  appointment_time: '',
  status: 'SCHEDULED',
  note: '',
  staff_id: '',
  pets: [],
};

const APPOINTMENT_STATUS_LABELS = {
  SCHEDULED: '已排程',
  PENDING: '待處理',
  CONFIRMED: '已確認',
  CANCELLED: '已取消',
};

function buildEmptyEntry() {
  return { pet_id: '', service_ids: [] };
}

export default function AppointmentsPage() {
  const router = useRouter();
  const [staff, setStaff] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [pets, setPets] = useState([]);
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const serviceCatalog = useMemo(() => services
    .filter((service) => service.status === 'ACTIVE')
    .map((service) => ({ id: Number(service.id), name: service.name, species: service.species })), [services]);

  async function loadCustomersAndPets() {
    const [customerResult, petResult, serviceResult] = await Promise.all([
      getCustomers({ status: 'ALL' }),
      getPets({ status: 'ALL' }),
      getServices({ status: 'ACTIVE' }),
    ]);
    setCustomers(customerResult.customers || []);
    setPets(petResult.pets || []);
    setServices(serviceResult.services || []);
  }

  async function refreshAppointments() {
    const result = await getAppointments({ status: 'ALL' });
    setAppointments(result.appointments || []);
  }

  useEffect(() => {
    let active = true;

    async function loadPage() {
      try {
        const currentStaff = await getCurrentStaff();
        if (!active) {
          return;
        }

        setStaff(currentStaff.staff);
        await loadCustomersAndPets();
        await refreshAppointments();
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

    loadPage();
    return () => { active = false; };
  }, [router]);

  const customerPets = useMemo(() => {
    if (!form.customer_id) {
      return [];
    }

    return pets.filter((pet) => {
      const hasRelationship = pet.customers && pet.customers.some((customer) => Number(customer.id) === Number(form.customer_id));
      const isDirectOwner = Number(pet.primary_customer_id) === Number(form.customer_id);
      return hasRelationship || isDirectOwner;
    });
  }, [form.customer_id, pets]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError('');
    setSuccess('');
  }

  function handlePetChange(index, field, value) {
    setForm((current) => {
      const nextPets = [...current.pets];
      nextPets[index] = {
        ...nextPets[index],
        [field]: value,
        ...(field === 'pet_id' ? { service_ids: [] } : {}),
      };
      return { ...current, pets: nextPets };
    });
    setError('');
  }

  function addPetEntry() {
    setForm((current) => ({ ...current, pets: [...current.pets, buildEmptyEntry()] }));
  }

  function removePetEntry(index) {
    setForm((current) => ({
      ...current,
      pets: current.pets.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function selectedServiceCount(petEntry) {
    return petEntry.service_ids?.length || 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        customer_id: form.customer_id,
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        status: form.status,
        note: form.note || null,
        staff_id: form.staff_id || null,
        pets: form.pets.map((petEntry) => ({
          pet_id: petEntry.pet_id,
          service_ids: petEntry.service_ids,
        })),
      };

      if (editingId) {
        await updateAppointment(editingId, payload);
        setSuccess('預約已成功更新。');
      } else {
        await createAppointment(payload);
        setSuccess('預約已成功建立。');
      }

      await refreshAppointments();
      resetForm();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(appointmentId) {
    try {
      const result = await getAppointment(appointmentId);
      const appointment = result.appointment;
      setEditingId(appointment.id);
      setForm({
        customer_id: String(appointment.customer_id),
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
        status: appointment.status,
        note: appointment.note || '',
        staff_id: appointment.staff_id ? String(appointment.staff_id) : '',
        pets: (appointment.pets || []).map((pet) => ({
          pet_id: String(pet.pet_id),
          service_ids: (pet.services || []).map((service) => Number(service.id)),
        })),
      });
    } catch (editError) {
      setError(editError.message);
    }
  }

  async function handleDelete(appointment) {
    if (!window.confirm(`確定要永久刪除 ${appointment.appointment_date} ${appointment.appointment_time} 的預約嗎？此操作無法復原。`)) return;
    try {
      setSaving(true);
      setError('');
      await deleteAppointment(appointment.id);
      setSuccess('預約已成功刪除。');
      await refreshAppointments();
    } catch (deleteError) {
      setError(deleteError.message || '刪除預約失敗');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="container py-4">
        <div className="alert alert-light border">預約載入中...</div>
      </main>
    );
  }

  return (
    <main className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-1">預約管理</h1>
          <p className="text-muted mb-0">建立與維護客戶預約。</p>
        </div>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h5 mb-3">{editingId ? '編輯預約' : '新增預約'}</h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">客戶</label>
                  <select
                    className="form-select"
                    value={form.customer_id}
                    onChange={(event) => setForm({ ...form, customer_id: event.target.value, pets: [buildEmptyEntry()] })}
                  >
                    <option value="">選擇客戶</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </div>

                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label">日期</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.appointment_date}
                      onChange={(event) => setForm({ ...form, appointment_date: event.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">時間</label>
                    <input
                      type="time"
                      className="form-control"
                      value={form.appointment_time}
                      onChange={(event) => setForm({ ...form, appointment_time: event.target.value })}
                    />
                  </div>
                </div>

                <div className="mb-3 mt-3">
                  <label className="form-label">狀態</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(event) => setForm({ ...form, status: event.target.value })}
                  >
                    <option value="SCHEDULED">已排程</option>
                    <option value="PENDING">待處理</option>
                    <option value="CONFIRMED">已確認</option>
                    <option value="CANCELLED">已取消</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">員工（選填）</label>
                  <input
                    className="form-control"
                    value={form.staff_id}
                    onChange={(event) => setForm({ ...form, staff_id: event.target.value })}
                    placeholder="員工 ID"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">備註</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={form.note}
                    onChange={(event) => setForm({ ...form, note: event.target.value })}
                  />
                </div>

                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h3 className="h6 mb-0">寵物與服務</h3>
                  <button type="button" className="btn btn-sm btn-outline-dark" onClick={addPetEntry}>新增寵物</button>
                </div>

                {form.pets.map((entry, index) => (
                  <div key={`${index}-pet`} className="border rounded p-3 mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-semibold">寵物 {index + 1}</span>
                      {form.pets.length > 1 ? (
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removePetEntry(index)}>移除</button>
                      ) : null}
                    </div>

                    <select
                      className="form-select mb-2"
                      value={entry.pet_id}
                      onChange={(event) => handlePetChange(index, 'pet_id', event.target.value)}
                    >
                      <option value="">選擇寵物</option>
                      {customerPets.map((pet) => (
                        <option key={pet.id} value={pet.id}>{pet.name}</option>
                      ))}
                    </select>

                    <div className="d-flex flex-wrap gap-2">
                      {serviceCatalog
                        .filter((service) => service.species === 'BOTH' || service.species === customerPets.find((pet) => Number(pet.id) === Number(entry.pet_id))?.species)
                        .map((service) => {
                        const selected = (entry.service_ids || []).includes(service.id);
                        return (
                          <button
                            key={service.id}
                            type="button"
                            className={`btn btn-sm ${selected ? 'btn-dark' : 'btn-outline-secondary'}`}
                            onClick={() => {
                              const nextServices = selected
                                ? (entry.service_ids || []).filter((serviceId) => serviceId !== service.id)
                                : [...(entry.service_ids || []), service.id];
                              handlePetChange(index, 'service_ids', nextServices);
                            }}
                          >
                            {service.name}
                          </button>
                        );
                      })}
                    </div>
                    <small className="text-muted d-block mt-2">已選擇 {selectedServiceCount(entry)} 項服務</small>
                  </div>
                ))}

                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-dark" disabled={saving}>
                    {saving ? '儲存中...' : editingId ? '更新預約' : '新增預約'}
                  </button>
                  {editingId ? (
                    <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>取消</button>
                  ) : null}
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h5 mb-3">預約列表</h2>
              {appointments.length === 0 ? (
                <div className="alert alert-light border">查無預約</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead>
                      <tr>
                        <th>日期</th>
                        <th>時間</th>
                        <th>客戶</th>
                        <th>狀態</th>
                        <th>寵物</th>
                        <th className="text-end">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((appointment) => (
                        <tr key={appointment.id}>
                          <td>{appointment.appointment_date}</td>
                          <td>{appointment.appointment_time}</td>
                          <td>{appointment.customer_name || appointment.customer_id}</td>
                          <td><span className="badge bg-secondary">{APPOINTMENT_STATUS_LABELS[appointment.status] || appointment.status}</span></td>
                          <td>{appointment.pet_count || 0}</td>
                          <td className="text-end">
                            <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => handleEdit(appointment.id)}>
                              編輯
                            </button>
                            <button type="button" className="btn btn-sm btn-outline-danger ms-1" onClick={() => handleDelete(appointment)} disabled={saving}>
                              刪除
                            </button>
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
      </div>
    </main>
  );
}
