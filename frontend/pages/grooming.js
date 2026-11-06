import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getUserFacingErrorMessage } from '../utils/error-message';
import { API_BASE_URL, fetchWithShop as fetch } from '../api/client';
const SPECIES_LABELS = { DOG: '狗', CAT: '貓' };

export default function GroomingPage() {
  const router = useRouter();
  const { daily_operation_id } = router.query;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [grooming, setGrooming] = useState(null);
  const [operation, setOperation] = useState(null);
  const [form, setForm] = useState({
    before_condition: '',
    actual_grooming_content: '',
    grooming_result: '',
    note: '',
  });

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
        setOperation({
          ...operationData.data,
          pets: appointment.pets || [],
        });

        const groomingResponse = await fetch(`${API_BASE_URL}/api/groomings?daily_operation_id=${daily_operation_id}`, {
          credentials: 'include',
        });
        if (!groomingResponse.ok) {
          throw new Error('無法載入美容資料');
        }
        const groomingData = await groomingResponse.json();
        const firstRecord = groomingData.data && groomingData.data[0] ? groomingData.data[0] : null;
        if (firstRecord) {
          setGrooming(firstRecord);
          setForm({
            before_condition: firstRecord.before_condition || '',
            actual_grooming_content: firstRecord.actual_grooming_content || '',
            grooming_result: firstRecord.grooming_result || '',
            note: firstRecord.note || '',
          });
        }
      } catch (loadError) {
        setError(getUserFacingErrorMessage(loadError, 500, '無法載入美容資料'));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router.isReady, daily_operation_id]);

  async function saveGrooming() {
    try {
      setSubmitting(true);
      setError('');

      const payload = {
        daily_operation_id: Number(daily_operation_id),
        pet_id: operation?.pets?.[0]?.pet_id || operation?.pet_id || null,
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
      setGrooming(saved);
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

  const pet = operation.pets && operation.pets[0] ? operation.pets[0] : null;

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
            <div className="col-md-4"><label className="form-label">寵物</label><input className="form-control" value={pet ? pet.name : ''} readOnly /></div>
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
