import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  getCurrentStaff,
  getCustomer,
  getCustomerContractPdfUrl,
  getCustomerContractSignatureUrl,
  linkCustomerToMember,
} from '../../api/client';

const statusLabels = { ACTIVE: '啟用', INACTIVE: '停用' };

export default function CustomerDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [memberId, setMemberId] = useState('');
  const [linkingMember, setLinkingMember] = useState(false);
  const [success, setSuccess] = useState('');

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

  async function handleLinkMember(event) {
    event.preventDefault();
    setLinkingMember(true);
    setError('');
    setSuccess('');
    try {
      await linkCustomerToMember(id, memberId);
      setSuccess('已完成會員與客戶資料連結。');
      setMemberId('');
    } catch (linkError) {
      setError(linkError.message || '會員連結失敗，請確認資料後再試。');
    } finally {
      setLinkingMember(false);
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
      {success ? (
        <div className="alert alert-success" role="status">{success}</div>
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
          <div className="foundation-panel mt-4">
            <h2 className="h5 mb-3">會員資料連結</h2>
            <p className="small text-muted">
              請先核對會員本人提供的會員編號。請勿依姓名、電子郵件或電話自動連結。
            </p>
            <form onSubmit={handleLinkMember}>
              <label className="form-label" htmlFor="customer-member-id">會員編號</label>
              <input
                id="customer-member-id"
                className="form-control mb-3"
                type="number"
                min="1"
                step="1"
                required
                value={memberId}
                onChange={(event) => setMemberId(event.target.value)}
              />
              <button type="submit" className="btn btn-outline-dark" disabled={linkingMember}>
                {linkingMember ? '連結中…' : '完成連結'}
              </button>
            </form>
          </div>
        </div>

        <div className="col-12">
          <div className="foundation-panel">
            <h2 className="h5 mb-3">電子契約</h2>
            {customer.contracts && customer.contracts.length > 0 ? (
              <div className="list-group list-group-flush">
                {customer.contracts.map((contract) => (
                  <div key={contract.id} className="list-group-item px-0">
                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                      <div>
                        <div className="fw-semibold">契約版本：{contract.version}</div>
                        <div className="small text-muted">簽署時間：{contract.agreed_at}</div>
                      </div>
                      <div className="d-flex flex-wrap gap-2">
                        <a
                          className="btn btn-sm btn-outline-dark"
                          href={getCustomerContractPdfUrl(customer.id, contract.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          查看契約 PDF
                        </a>
                        <a
                          className="btn btn-sm btn-outline-dark"
                          href={getCustomerContractSignatureUrl(customer.id, contract.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          查看電子簽名
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted mb-0">目前沒有已完成的電子契約。</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
