import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getUserFacingErrorMessage } from '../utils/error-message';
import { API_BASE_URL } from '../api/client';
const STATUS_LABELS = { PENDING: '待入住', IN_PROGRESS: '住宿中', COMPLETED: '已完成' };
const ERROR_MESSAGES = {
  ACTIVE_BOARDING_EXISTS: '寵物目前已有進行中的住宿',
  BOARDING_NOT_FOUND: '找不到住宿資料',
};

function getBoardingErrorMessage(body, fallback) {
  return ERROR_MESSAGES[body?.error?.code] || fallback;
}

export default function BoardingPage() {
  const router = useRouter();
  const { daily_operation_id: dailyOperationId, boarding_id: boardingId } = router.query;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [operation, setOperation] = useState(null);
  const [boarding, setBoarding] = useState(null);
  const [form, setForm] = useState({ before_condition: '', actual_boarding_content: '', boarding_result: '', note: '' });

  useEffect(() => {
    if (!router.isReady) return;
    if (!dailyOperationId && !boardingId) {
      setLoading(false);
      return;
    }
    async function loadData() {
      try {
        setLoading(true); setError(''); setMessage('');
        let loadedBoarding = null;
        if (boardingId) {
          const response = await fetch(`${API_BASE_URL}/api/boardings/${boardingId}`, { credentials: 'include' });
          if (!response.ok) throw new Error('無法載入住宿資料');
          loadedBoarding = (await response.json()).data;
        } else {
          const operationResponse = await fetch(`${API_BASE_URL}/api/operations/${dailyOperationId}`, { credentials: 'include' });
          if (!operationResponse.ok) throw new Error('無法載入今日工作資料');
          const operationData = (await operationResponse.json()).data;
          const appointmentResponse = await fetch(`${API_BASE_URL}/api/appointments/${operationData.appointment_id}`, { credentials: 'include' });
          if (!appointmentResponse.ok) throw new Error('無法載入預約資料');
          const appointment = (await appointmentResponse.json()).data.appointment;
          setOperation({ ...operationData, pets: appointment.pets || [], appointment_date: appointment.appointment_date, appointment_time: appointment.appointment_time });
          const boardingResponse = await fetch(`${API_BASE_URL}/api/boardings?daily_operation_id=${dailyOperationId}`, { credentials: 'include' });
          if (!boardingResponse.ok) throw new Error('無法載入住宿資料');
          const records = (await boardingResponse.json()).data || [];
          loadedBoarding = records[0] || null;
        }
        if (loadedBoarding) {
          setBoarding(loadedBoarding);
          setForm({ before_condition: loadedBoarding.before_condition || '', actual_boarding_content: loadedBoarding.actual_boarding_content || '', boarding_result: loadedBoarding.boarding_result || '', note: loadedBoarding.note || '' });
          if (!operation && loadedBoarding.appointment_id) {
            const operationResponse = await fetch(`${API_BASE_URL}/api/operations/${loadedBoarding.daily_operation_id}`, { credentials: 'include' });
            const operationData = (await operationResponse.json()).data;
            const appointmentResponse = await fetch(`${API_BASE_URL}/api/appointments/${loadedBoarding.appointment_id}`, { credentials: 'include' });
            const appointment = (await appointmentResponse.json()).data.appointment;
            setOperation({ ...operationData, pets: appointment.pets || [], appointment_date: appointment.appointment_date, appointment_time: appointment.appointment_time });
          }
        }
      } catch (loadError) { setError(getUserFacingErrorMessage(loadError, 500, '無法載入住宿資料')); } finally { setLoading(false); }
    }
    loadData();
  }, [router.isReady, dailyOperationId, boardingId]);

  const pet = operation?.pets?.[0] || null;
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  async function saveBoarding() {
    try {
      setSubmitting(true); setError(''); setMessage('');
      if (!operation || !pet || !pet.services?.length) throw new Error('缺少住宿服務資料，無法儲存');
      const payload = { daily_operation_id: Number(dailyOperationId || boarding.daily_operation_id), appointment_id: operation.appointment_id, customer_id: operation.customer_id, pet_id: pet.pet_id, service_id: pet.services.find((service) => service.type === 'BOARDING')?.id || pet.services[0].id, ...form };
      const response = await fetch(boarding ? `${API_BASE_URL}/api/boardings/${boarding.id}` : `${API_BASE_URL}/api/boardings`, { method: boarding ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok || body.success === false) throw new Error(getBoardingErrorMessage(body, '住宿資料儲存失敗'));
      setBoarding(body.data); setForm({ before_condition: body.data.before_condition || '', actual_boarding_content: body.data.actual_boarding_content || '', boarding_result: body.data.boarding_result || '', note: body.data.note || '' }); setMessage('住宿資料已儲存');
    } catch (saveError) { setError(getUserFacingErrorMessage(saveError, 500, '住宿資料儲存失敗')); } finally { setSubmitting(false); }
  }

  async function changeLifecycle(action) {
    if (!boarding) { setError('請先儲存住宿資料'); return; }
    try {
      setSubmitting(true); setError(''); setMessage('');
      const response = await fetch(`${API_BASE_URL}/api/boardings/${boarding.id}/${action}`, { method: 'POST', credentials: 'include' });
      const body = await response.json();
      if (!response.ok || body.success === false) throw new Error(getBoardingErrorMessage(body, '住宿狀態更新失敗'));
      setBoarding(body.data); setMessage(action === 'check-in' ? '已完成入住' : '已完成退房');
      if (action === 'check-out') router.push('/operations');
    } catch (lifecycleError) { setError(getUserFacingErrorMessage(lifecycleError, 500, '住宿狀態更新失敗')); } finally { setSubmitting(false); }
  }

  if (!router.isReady || loading) return <div className="container mt-4"><div className="alert alert-info">載入中...</div></div>;
  if (!operation && !boarding) return <div className="container mt-4"><div className="alert alert-warning">未找到住宿工作。</div></div>;

  return (
    <main className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3"><div><h1 className="mb-1">住宿執行</h1><p className="text-muted mb-0">今日工作：{operation?.customer_name || boarding?.customer_name || '客戶'} / {pet?.name || boarding?.pet_name || '寵物'}</p></div><button type="button" className="btn btn-outline-dark" onClick={() => router.push('/operations')}>返回今日工作</button></div>
      {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
      {message ? <div className="alert alert-success" role="status">{message}</div> : null}
      <div className="card mb-4"><div className="card-body"><h2 className="h5 mb-3">客戶與寵物資訊</h2><div className="row g-3">
        <div className="col-md-4"><label className="form-label">客戶</label><input className="form-control" value={operation?.customer_name || boarding?.customer_name || ''} readOnly /></div>
        <div className="col-md-4"><label className="form-label">電話</label><input className="form-control" value={operation?.customer_phone || boarding?.customer_phone || ''} readOnly /></div>
        <div className="col-md-4"><label className="form-label">寵物</label><input className="form-control" value={pet?.name || boarding?.pet_name || ''} readOnly /></div>
        <div className="col-md-4"><label className="form-label">服務</label><input className="form-control" value={pet?.services?.map((service) => service.name).join(', ') || boarding?.service_name || ''} readOnly /></div>
        <div className="col-md-4"><label className="form-label">預計入住</label><input className="form-control" value={boarding?.expected_check_in || operation?.appointment_time || ''} readOnly /></div>
        <div className="col-md-4"><label className="form-label">預計退房</label><input className="form-control" value={boarding?.expected_check_out || ''} readOnly /></div>
        <div className="col-md-4"><label className="form-label">實際入住</label><input className="form-control" value={boarding?.actual_check_in || ''} readOnly /></div>
        <div className="col-md-4"><label className="form-label">實際退房</label><input className="form-control" value={boarding?.actual_check_out || ''} readOnly /></div>
        <div className="col-md-4"><label className="form-label">住宿狀態</label><input className="form-control" value={STATUS_LABELS[boarding?.status] || '待入住'} readOnly /></div>
      </div></div></div>
      <div className="card mb-4"><div className="card-body"><h2 className="h5 mb-3">住宿執行內容</h2><div className="row g-3">
        {['before_condition', 'actual_boarding_content', 'boarding_result', 'note'].map((field) => <div className="col-12" key={field}><label className="form-label">{{ before_condition: '住宿前狀況', actual_boarding_content: '住宿執行內容', boarding_result: '住宿結果', note: '住宿備註' }[field]}</label><textarea className="form-control" rows="3" value={form[field]} onChange={(event) => setField(field, event.target.value)} disabled={boarding?.status === 'COMPLETED'} placeholder="請輸入內容" maxLength={2000} /></div>)}
      </div></div></div>
      <div className="d-flex gap-2 justify-content-end"><button type="button" className="btn btn-secondary" onClick={() => router.push('/operations')} disabled={submitting}>取消</button>{boarding?.status !== 'COMPLETED' ? <><button type="button" className="btn btn-primary" onClick={saveBoarding} disabled={submitting}>{submitting ? '處理中...' : '儲存'}</button>{boarding?.status === 'IN_PROGRESS' ? <button type="button" className="btn btn-success" onClick={() => changeLifecycle('check-out')} disabled={submitting}>退房</button> : <button type="button" className="btn btn-success" onClick={() => changeLifecycle('check-in')} disabled={submitting}>入住</button>}</> : null}</div>
    </main>
  );
}
