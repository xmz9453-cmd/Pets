import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getUserFacingErrorMessage } from '../utils/error-message';
import {
  API_BASE_URL,
  fetchWithShop as fetch,
  removeGroomingPhoto,
  uploadGroomingPhoto,
} from '../api/client';
const SPECIES_LABELS = { DOG: '狗', CAT: '貓' };
const PHOTO_CATEGORIES = [
  { value: 'BEFORE', label: '美容前' },
  { value: 'AFTER', label: '美容後' },
  { value: 'CONCERN', label: '狀況' },
];

export default function GroomingPage() {
  const router = useRouter();
  const { daily_operation_id } = router.query;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [groomings, setGroomings] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState('');
  const [photoCategory, setPhotoCategory] = useState('AFTER');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [operation, setOperation] = useState(null);
  const [form, setForm] = useState({
    before_condition: '',
    actual_grooming_content: '',
    grooming_result: '',
    note: '',
  });
  const selectedPet = operation?.pets?.find((item) => Number(item.pet_id) === Number(selectedPetId));
  const grooming = groomings.find((item) => Number(item.pet_id) === Number(selectedPetId)) || null;

  useEffect(() => {
    if (!router.isReady) {
      return;
    }
    if (!daily_operation_id) {
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        setLoading(true);
        setError('');

        const operationResponse = await fetch(`${API_BASE_URL}/api/operations/${daily_operation_id}`, {
          credentials: 'include',
        });
        if (!operationResponse.ok) {
          throw new Error('無法載入今日工作資料');
        }
        const operationData = await operationResponse.json();
        const appointmentResponse = await fetch(`${API_BASE_URL}/api/appointments/${operationData.data.appointment_id}`, {
          credentials: 'include',
        });
        if (!appointmentResponse.ok) {
          throw new Error('無法載入預約資料');
        }
        const appointmentData = await appointmentResponse.json();
        const appointment = appointmentData.data.appointment;
        const groomingPets = (appointment.pets || []).filter(
          (item) => item.services?.some((service) => service.type === 'GROOMING'),
        );
        setOperation({
          ...operationData.data,
          pets: groomingPets,
        });

        const groomingResponse = await fetch(`${API_BASE_URL}/api/groomings?daily_operation_id=${daily_operation_id}`, {
          credentials: 'include',
        });
        if (!groomingResponse.ok) {
          throw new Error('無法載入美容資料');
        }
        const groomingData = await groomingResponse.json();
        const records = groomingData.data || [];
        setGroomings(records);
        const firstPetId = groomingPets[0]?.pet_id;
        if (firstPetId) setSelectedPetId(String(firstPetId));
      } catch (loadError) {
        setError(getUserFacingErrorMessage(loadError, 500, '無法載入美容資料'));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router.isReady, daily_operation_id]);

  useEffect(() => {
    const record = groomings.find((item) => Number(item.pet_id) === Number(selectedPetId));
    setForm({
      before_condition: record?.before_condition || '',
      actual_grooming_content: record?.actual_grooming_content || '',
      grooming_result: record?.grooming_result || '',
      note: record?.note || '',
    });
  }, [groomings, selectedPetId]);

  async function saveGrooming() {
    try {
      setSubmitting(true);
      setError('');

      const payload = {
        daily_operation_id: Number(daily_operation_id),
        pet_id: Number(selectedPetId) || operation?.pet_id || null,
        ...form,
      };

      if (!payload.pet_id) {
        throw new Error('缺少寵物資料，無法建立美容紀錄');
      }

      const endpoint = grooming ? `${API_BASE_URL}/api/groomings/${grooming.id}` : `${API_BASE_URL}/api/groomings`;
      const method = grooming ? 'PATCH' : 'POST';
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const body = await response.json();
      if (!response.ok || body.success === false) {
        throw new Error(getUserFacingErrorMessage(body.error, response.status, '美容資料保存失敗'));
      }

      const saved = body.data;
      setGroomings((current) => [
        ...current.filter((item) => Number(item.pet_id) !== Number(saved.pet_id)),
        saved,
      ]);
      setForm({
        before_condition: saved.before_condition || '',
        actual_grooming_content: saved.actual_grooming_content || '',
        grooming_result: saved.grooming_result || '',
        note: saved.note || '',
      });
      return saved;
    } catch (saveError) {
      setError(getUserFacingErrorMessage(saveError, 500, '美容資料保存失敗'));
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUploadPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!grooming) {
      setError('請先儲存這隻寵物的美容紀錄，再上傳照片。');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('美容照片不可超過 2 MiB。');
      return;
    }
    try {
      setUploadingPhoto(true);
      setError('');
      const result = await uploadGroomingPhoto(grooming.id, file, photoCategory);
      setGroomings((current) => current.map((item) => (
        Number(item.id) === Number(grooming.id)
          ? { ...item, photos: [...(item.photos || []), result.photo] }
          : item
      )));
    } catch (uploadError) {
      setError(getUserFacingErrorMessage(uploadError, uploadError.statusCode || 500, '美容照片上傳失敗'));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleDeletePhoto(photo) {
    if (!window.confirm('確定刪除此張美容照片嗎？')) return;
    try {
      setError('');
      await removeGroomingPhoto(grooming.id, photo.id);
      setGroomings((current) => current.map((item) => (
        Number(item.id) === Number(grooming.id)
          ? { ...item, photos: (item.photos || []).filter((entry) => Number(entry.id) !== Number(photo.id)) }
          : item
      )));
    } catch (deleteError) {
      setError(getUserFacingErrorMessage(deleteError, deleteError.statusCode || 500, '美容照片刪除失敗'));
    }
  }

  async function completeGrooming() {
    const hasGroomingDetails = Object.values(form).some((value) => value.trim());
    if (grooming || hasGroomingDetails) {
      const saved = await saveGrooming();
      if (!saved) return;
    }

    try {
      setSubmitting(true);
      setError('');
      const response = await fetch(`${API_BASE_URL}/api/operations/${daily_operation_id}/complete-work`, {
        method: 'POST',
        credentials: 'include',
      });
      const body = await response.json();
      if (!response.ok || body.success === false) {
        throw new Error(getUserFacingErrorMessage(body.error, response.status, '完成工作失敗'));
      }
      router.push('/operations');
    } catch (completeError) {
      setError(getUserFacingErrorMessage(completeError, 500, '完成工作失敗'));
      setSubmitting(false);
    }
  }

  if (!router.isReady || loading) {
    return <div className="container mt-4"><div className="alert alert-info">載入中...</div></div>;
  }

  if (!operation) {
    return <div className="container mt-4"><div className="alert alert-warning">未找到美容工作。</div></div>;
  }

  const pet = selectedPet || null;

  return (
    <main className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="mb-1">美容執行</h1>
          <p className="text-muted mb-0">今日工作：{operation.customer_name || '客戶'} / {pet ? pet.name : '寵物'}</p>
        </div>
        <button type="button" className="btn btn-outline-dark" onClick={() => router.push('/operations')}>返回今日工作</button>
      </div>

      {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}

      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">客戶與寵物資訊</h2>
          <div className="row g-3">
            <div className="col-md-4"><label className="form-label">客戶</label><input className="form-control" value={operation.customer_name || ''} readOnly /></div>
            <div className="col-md-4"><label className="form-label">電話</label><input className="form-control" value={operation.customer_phone || ''} readOnly /></div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="grooming-pet">寵物</label>
              <select id="grooming-pet" className="form-select" value={selectedPetId} onChange={(event) => setSelectedPetId(event.target.value)}>
                {(operation.pets || []).map((item) => (
                  <option key={item.pet_id} value={item.pet_id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4"><label className="form-label">種類</label><input className="form-control" value={pet ? SPECIES_LABELS[pet.species] || pet.species : ''} readOnly /></div>
            <div className="col-md-4"><label className="form-label">預約時間</label><input className="form-control" value={operation.appointment_time || ''} readOnly /></div>
            <div className="col-md-4"><label className="form-label">服務</label><input className="form-control" value={pet && pet.services && pet.services.length ? pet.services.map((item) => item.name).join(', ') : ''} readOnly /></div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-2">美容紀錄</h2>
          <p className="text-muted mb-3">美容紀錄可在完成服務或結帳後補填，不影響完成工作與建立訂單。</p>
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label">美容前</label>
              <textarea className="form-control" rows="3" value={form.before_condition} onChange={(event) => setForm({ ...form, before_condition: event.target.value })} placeholder="記錄美容前狀況" />
            </div>
            <div className="col-12">
              <label className="form-label">實際美容內容</label>
              <textarea className="form-control" rows="3" value={form.actual_grooming_content} onChange={(event) => setForm({ ...form, actual_grooming_content: event.target.value })} placeholder="記錄實際美容內容" />
            </div>
            <div className="col-12">
              <label className="form-label">美容後結果</label>
              <textarea className="form-control" rows="3" value={form.grooming_result} onChange={(event) => setForm({ ...form, grooming_result: event.target.value })} placeholder="記錄美容後結果" />
            </div>
            <div className="col-12">
              <label className="form-label">美容備註</label>
              <textarea className="form-control" rows="3" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="記錄美容備註" maxLength={2000} />
            </div>
          </div>
          <hr className="my-4" />
          <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
            <div>
              <h3 className="h6 mb-1">美容照片</h3>
              <p className="text-muted small mb-0">每隻寵物每次服務最多 5 張；支援 JPG、PNG、WebP，每張不超過 2 MiB。</p>
            </div>
            <div className="d-flex gap-2 align-items-end">
              <div>
                <label className="form-label" htmlFor="grooming-photo-category">照片分類</label>
                <select id="grooming-photo-category" className="form-select" value={photoCategory} onChange={(event) => setPhotoCategory(event.target.value)}>
                  {PHOTO_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="grooming-photo-file">新增照片</label>
                <input id="grooming-photo-file" className="form-control" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUploadPhoto} disabled={!grooming || uploadingPhoto || (grooming.photos || []).length >= 5} />
              </div>
            </div>
          </div>
          {!grooming ? <p className="text-muted">請先儲存美容紀錄，才能為此寵物上傳照片。</p> : null}
          {grooming?.photos?.length ? (
            <div className="row g-3">
              {grooming.photos.map((photo) => (
                <div className="col-6 col-md-4 col-lg-3" key={photo.id}>
                  <div className="border rounded p-2 h-100">
                    <img src={`${API_BASE_URL}${photo.image_url}`} alt={`${pet?.name || '寵物'}${PHOTO_CATEGORIES.find((category) => category.value === photo.category)?.label || '美容'}照片`} className="img-fluid rounded" style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                    <div className="d-flex justify-content-between align-items-center gap-2 mt-2">
                      <span className="small">{PHOTO_CATEGORIES.find((category) => category.value === photo.category)?.label || photo.category}</span>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDeletePhoto(photo)} disabled={uploadingPhoto}>刪除</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : grooming ? <p className="text-muted mb-0">尚未上傳美容照片。</p> : null}
        </div>
      </div>

      <div className="d-flex gap-2 justify-content-end">
        <button type="button" className="btn btn-secondary" onClick={() => router.push('/operations')} disabled={submitting}>取消</button>
        <button type="button" className="btn btn-primary" onClick={saveGrooming} disabled={submitting}>{submitting ? '處理中...' : '儲存'}</button>
        {operation.status !== 'COMPLETED' ? (
          <button type="button" className="btn btn-success" onClick={completeGrooming} disabled={submitting}>完成工作</button>
        ) : null}
      </div>
    </main>
  );
}
