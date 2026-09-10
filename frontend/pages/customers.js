import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  createCustomer,
  deleteCustomer,
  deactivateCustomer,
  getCurrentStaff,
  getCustomers,
  reactivateCustomer,
  updateCustomer,
} from '../api/client';

const emptyForm = {
  name: '',
  phone: '',
  note: '',
  address: '',
  lineId: '',
};

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess] = useState('');

  async function refreshCustomers() {
    try {
      setLoading(true);
      const result = await getCustomers({ status, search });
      setCustomers(result.customers || []);
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadPage() {
      try {
        await getCurrentStaff();
        if (!active) {
          return;
        }
        await refreshCustomers();
      } catch (sessionError) {
        if (active) {
          router.replace('/login');
        }
      }
    }

    loadPage();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (router.isReady) {
      refreshCustomers();
    }
  }, [status, search, router.isReady]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        note: formData.note || null,
        address: formData.address || null,
        lineId: formData.lineId || null,
      };

      if (editingId) {
        await updateCustomer(editingId, payload);
      } else {
        await createCustomer(payload);
      }

      setFormData(emptyForm);
      setEditingId(null);
      await refreshCustomers();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id) {
    try {
      await deactivateCustomer(id);
      await refreshCustomers();
    } catch (deactivateError) {
      setError(deactivateError.message);
    }
  }

  async function handleReactivate(id) {
    try {
      await reactivateCustomer(id);
      await refreshCustomers();
    } catch (reactivateError) {
      setError(reactivateError.message);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }
    setDeleting(true);
    setError('');
    try {
      await deleteCustomer(deleteTarget.id);
      setCustomers((current) => current.filter((customer) => customer.id !== deleteTarget.id));
      setDeleteTarget(null);
      setSuccess('客戶已刪除。');
    } catch (deleteError) {
      setError(deleteError.message || '無法刪除客戶。');
    } finally {
      setDeleting(false);
    }
  }

  function handleEdit(customer) {
    setEditingId(customer.id);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      note: customer.note || '',
      address: customer.address || '',
      lineId: customer.line_id || '',
    });
  }

  return (
    <main className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-1">客戶管理</h1>
          <p className="text-muted mb-0">管理客戶主檔資料與狀態。</p>
        </div>
        <button type="button" className="btn btn-outline-dark" onClick={() => router.push('/')}>
          返回首頁
        </button>
      </div>

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="foundation-panel">
            <h2 className="h5 mb-3">{editingId ? '編輯客戶' : '新增客戶'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">姓名</label>
                <input
                  className="form-control"
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">電話</label>
                <input
                  className="form-control"
                  value={formData.phone}
                  onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">地址</label>
                <input
                  className="form-control"
                  value={formData.address}
                  onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">LINE 帳號</label>
                <input
                  className="form-control"
                  value={formData.lineId}
                  onChange={(event) => setFormData({ ...formData, lineId: event.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">備註</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={formData.note}
                  onChange={(event) => setFormData({ ...formData, note: event.target.value })}
                />
              </div>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-dark" disabled={saving}>
                  {saving ? '儲存中...' : editingId ? '更新客戶' : '新增客戶'}
                </button>
                {editingId ? (
                  <button type="button" className="btn btn-outline-secondary" onClick={() => { setEditingId(null); setFormData(emptyForm); }}>
                    取消
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="foundation-panel">
            <div className="row g-2 align-items-end mb-3">
              <div className="col-md-6">
                <label className="form-label">搜尋</label>
                <input
                  className="form-control"
                  placeholder="依姓名或電話搜尋"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">狀態</label>
                <select className="form-select" value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="ACTIVE">啟用</option>
                  <option value="INACTIVE">停用</option>
                  <option value="ALL">全部</option>
                </select>
              </div>
              <div className="col-md-3 d-grid">
                <button type="button" className="btn btn-outline-dark" onClick={() => refreshCustomers()}>
                  重新整理
                </button>
              </div>
            </div>

            {error ? (
              <div className="alert alert-warning" role="alert">{error}</div>
            ) : null}
            {success ? <div className="alert alert-success" role="alert">{success}</div> : null}

            {loading ? (
              <p className="text-muted mb-0">客戶載入中...</p>
            ) : customers.length === 0 ? (
              <div className="alert alert-light border" role="alert">
                查無符合條件的客戶
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>姓名</th>
                      <th>電話</th>
                      <th>狀態</th>
                      <th>寵物</th>
                      <th className="text-end">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <tr key={customer.id}>
                        <td>{customer.name}</td>
                        <td>{customer.phone}</td>
                        <td>
                          <span className={`badge ${customer.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>
                            {customer.status === 'ACTIVE' ? '啟用' : '停用'}
                          </span>
                        </td>
                        <td>{customer.pet_count || 0}</td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <button type="button" className="btn btn-outline-dark" onClick={() => handleEdit(customer)}>
                              編輯
                            </button>
                            {customer.status === 'ACTIVE' ? (
                              <button type="button" className="btn btn-outline-warning" onClick={() => handleDeactivate(customer.id)}>
                                停用
                              </button>
                            ) : (
                              <button type="button" className="btn btn-outline-success" onClick={() => handleReactivate(customer.id)}>
                                重新啟用
                              </button>
                            )}
                            <button type="button" className="btn btn-outline-danger" onClick={() => { setDeleteTarget(customer); setError(''); setSuccess(''); }}>
                              刪除
                            </button>
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

      {deleteTarget ? (
        <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="delete-customer-title">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title h5" id="delete-customer-title">確認刪除客戶</h2>
                <button type="button" className="btn-close" aria-label="關閉" onClick={() => setDeleteTarget(null)} />
              </div>
              <div className="modal-body">
                <p className="mb-0">客戶「{deleteTarget.name}」將永久刪除，且無法復原。確定要繼續嗎？</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setDeleteTarget(null)}>取消</button>
                <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting}>{deleting ? '刪除中...' : '刪除'}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
