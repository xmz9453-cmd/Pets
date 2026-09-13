import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getCurrentStaff, getCustomer } from '../../api/client';

const statusLabels = { ACTIVE: '啟用', INACTIVE: '停用' };

export default function CustomerDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    if (!id) {
      return;
    }

    try {
      setLoading(true);
      const result = await getCustomer(id);
      setCustomer(result.customer);
      setError('');
    } catch (loadError) {
      setError(loadError.message || '客戶資料載入失敗');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getCurrentStaff().then(load).catch(() => router.replace('/login'));
  }, [id, router]);

  if (loading) {
    return (
      <main className="container py-4">
        <p className="text-muted mb-0">客戶資料載入中...</p>
      </main>
    );
  }

  if (!customer) {
    return (
      <main className="container py-4">
        <div className="alert alert-danger" role="alert">
          {error || '找不到客戶資料'}
        </div>
        <button type="button" className="btn btn-outline-dark" onClick={() => router.push('/customers')}>
          返回客戶列表
        </button>
      </main>
    );
  }

  return (
    <main className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-1">{customer.name}</h1>
          <p className="text-muted mb-0">客戶詳細資料</p>
        </div>
        <button type="button" className="btn btn-outline-dark" onClick={() => router.push('/customers')}>
          返回客戶列表
        </button>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">{error}</div>
      ) : null}

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="foundation-panel">
            <h2 className="h5 mb-3">基本資料</h2>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="foundation-label">姓名</div>
                <div className="foundation-status">{customer.name}</div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">狀態</div>
                <div className="foundation-status">
                  <span className={`badge ${customer.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>
                    {statusLabels[customer.status] || customer.status}
                  </span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">電話</div>
                <div className="foundation-status">{customer.phone || '未填寫'}</div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">寵物數量</div>
                <div className="foundation-status">{customer.pet_count || 0}</div>
              </div>
              <div className="col-12">
                <div className="foundation-label">地址</div>
                <div className="foundation-status">{customer.address || '未填寫'}</div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">LINE 帳號</div>
                <div className="foundation-status">{customer.line_id || '未填寫'}</div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">身分證字號</div>
                <div className="foundation-status">{customer.id_card_number || '未填寫'}</div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">緊急聯絡人</div>
                <div className="foundation-status">{customer.emergency_contact_name || '未填寫'}</div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">緊急聯絡電話</div>
                <div className="foundation-status">{customer.emergency_contact_phone || '未填寫'}</div>
              </div>
              <div className="col-12">
                <div className="foundation-label">備註</div>
                <div className="foundation-status">{customer.note || '未填寫'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="foundation-panel">
            <h2 className="h5 mb-3">寵物關聯</h2>
            {customer.pets && customer.pets.length > 0 ? (
              <ul className="list-group list-group-flush">
                {customer.pets.map((pet) => (
                  <li key={pet.id} className="list-group-item px-0 d-flex justify-content-between align-items-center">
                    <span>{pet.name}</span>
                    <span className="small text-muted">{pet.species}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted mb-0">目前尚無關聯寵物</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
