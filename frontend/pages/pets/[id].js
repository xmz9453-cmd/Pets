import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getCurrentStaff, getPet } from '../../api/client';

const speciesLabels = { DOG: '狗', CAT: '貓' };
const genderLabels = { MALE: '公', FEMALE: '母', UNKNOWN: '未設定' };

function toArray(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== undefined && item !== null && String(item).trim() !== '').map((item) => String(item).trim());
  }

  if (value === undefined || value === null || value === '') {
    return [];
  }

  const text = String(value).trim();
  if (!text) {
    return [];
  }

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => item !== undefined && item !== null && String(item).trim() !== '').map((item) => String(item).trim());
    }
  } catch (error) {
    // fallback to legacy comma-separated values
  }

  return text.split(',').map((item) => item.trim()).filter((item) => item.length > 0);
}

function renderTagList(values, fallbackText = '無') {
  const list = toArray(values);
  if (!list.length) {
    return <span className="text-muted">{fallbackText}</span>;
  }

  return (
    <div className="d-flex flex-wrap gap-2">
      {list.map((value) => (
        <span key={value} className="badge text-dark border" style={{ backgroundColor: '#f3f4f6', borderColor: '#d1d5db', padding: '0.5rem 0.75rem', borderRadius: '999px', fontWeight: 500 }}>
          {value}
        </span>
      ))}
    </div>
  );
}

export default function PetDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    if (!id) {
      return;
    }

    try {
      setLoading(true);
      const result = await getPet(id);
      setPet(result.pet || result);
      setError('');
    } catch (loadError) {
      setError(loadError.message || '寵物資料載入失敗');
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
        <p className="text-muted mb-0">寵物資料載入中...</p>
      </main>
    );
  }

  if (!pet) {
    return (
      <main className="container py-4">
        <div className="alert alert-danger" role="alert">
          {error || '找不到寵物資料'}
        </div>
        <button type="button" className="btn btn-outline-dark" onClick={() => router.push('/pets')}>
          返回寵物列表
        </button>
      </main>
    );
  }

  return (
    <main className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-1">{pet.name}</h1>
          <p className="text-muted mb-0">寵物詳細資料</p>
        </div>
        <button type="button" className="btn btn-outline-dark" onClick={() => router.push('/pets')}>
          返回寵物列表
        </button>
      </div>

      {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="foundation-panel">
            <h2 className="h5 mb-3">基本資料</h2>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="foundation-label">寵物名</div>
                <div className="foundation-status">{pet.name || '未填寫'}</div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">狀態</div>
                <div className="foundation-status">
                  <span className={`badge ${pet.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>
                    {pet.status === 'ACTIVE' ? '啟用' : '停用'}
                  </span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">所屬客戶</div>
                <div className="foundation-status">{pet.customer_name || pet.primary_customer_name || '未指定'}</div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">種類</div>
                <div className="foundation-status">{speciesLabels[pet.species] || pet.species || '未填寫'}</div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">性別</div>
                <div className="foundation-status">{genderLabels[pet.gender] || pet.gender || '未填寫'}</div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">品種</div>
                <div className="foundation-status">{pet.breed || '未填寫'}</div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">晶片號碼</div>
                <div className="foundation-status">{pet.chip_number || '未填寫'}</div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">體重</div>
                <div className="foundation-status">{pet.weight ? `${pet.weight} ${pet.weight_unit || ''}`.trim() : '未填寫'}</div>
              </div>
              <div className="col-12">
                <div className="foundation-label">備註</div>
                <div className="foundation-status">{pet.notes || pet.note || '未填寫'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="foundation-panel">
            <h2 className="h5 mb-3">行為與病史</h2>
            <div className="mb-4">
              <div className="foundation-label">個性</div>
              {renderTagList(pet.personality, '無')}
            </div>
            <div className="mb-4">
              <div className="foundation-label">病史</div>
              {renderTagList(pet.medical_history, '無')}
            </div>
            <div>
              <div className="foundation-label">其他病史</div>
              <div className="foundation-status">{pet.other_history || '無'}</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
