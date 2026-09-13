import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getCurrentStaff, getService } from '../../api/client';

const typeLabels = { GROOMING: '美容', BOARDING: '住宿' };
const speciesLabels = { DOG: '狗', CAT: '貓', BOTH: '狗與貓' };
const statusLabels = { ACTIVE: '啟用', INACTIVE: '停用' };

export default function ServiceDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    if (!id) {
      return;
    }

    try {
      setLoading(true);
      const result = await getService(id);
      setService(result.service);
      setError('');
    } catch (loadError) {
      setError(loadError.message || '服務資料載入失敗');
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
        <p className="text-muted mb-0">服務資料載入中...</p>
      </main>
    );
  }

  if (!service) {
    return (
      <main className="container py-4">
        <div className="alert alert-danger" role="alert">
          {error || '找不到服務資料'}
        </div>
        <button type="button" className="btn btn-outline-dark" onClick={() => router.push('/services')}>
          返回服務列表
        </button>
      </main>
    );
  }

  return (
    <main className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-1">{service.name}</h1>
          <p className="text-muted mb-0">服務詳細資料</p>
        </div>
        <button type="button" className="btn btn-outline-dark" onClick={() => router.push('/services')}>
          返回服務列表
        </button>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">{error}</div>
      ) : null}

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="foundation-panel">
            <h2 className="h5 mb-3">服務資訊</h2>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="foundation-label">服務名稱</div>
                <div className="foundation-status">{service.name}</div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">狀態</div>
                <div className="foundation-status">
                  <span className={`badge ${service.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>
                    {statusLabels[service.status] || service.status}
                  </span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">類型</div>
                <div className="foundation-status">{typeLabels[service.type] || service.type}</div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">適用物種</div>
                <div className="foundation-status">{speciesLabels[service.species] || service.species}</div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">價格</div>
                <div className="foundation-status">{service.price} / {service.unit}</div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">預估時間</div>
                <div className="foundation-status">{service.duration_minutes} 分鐘</div>
              </div>
              <div className="col-12">
                <div className="foundation-label">說明</div>
                <div className="foundation-status">{service.description || '未填寫說明'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="foundation-panel">
            <h2 className="h5 mb-3">顯示設定</h2>
            <div className="mb-3">
              <div className="foundation-label">單位</div>
              <div className="foundation-status">{service.unit}</div>
            </div>
            <div className="mb-3">
              <div className="foundation-label">顯示順序</div>
              <div className="foundation-status">{service.sort_order}</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
