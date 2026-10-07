import { useState } from 'react';
import { useRouter } from 'next/router';
import { createPublicOnboarding } from '../api/client';

const BOOKING_MESSAGES = {
  new: '新客預約流程尚未開放。',
  returning: '舊客預約流程尚未開放。',
};

export default function BookingPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleNewBooking() {
    setCreating(true);
    setError('');
    setMessage('');
    try {
      const result = await createPublicOnboarding();
      await router.push(`/onboarding/${encodeURIComponent(result.token)}`);
    } catch (createError) {
      setError(createError.code === 'CONTRACT_VERSION_NOT_AVAILABLE'
        ? '目前尚未設定可用的預約資訊，請稍後再試或聯絡店家。'
        : createError.message || '目前無法開始預約，請稍後再試。');
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          <h1 className="text-center mb-4">我要預約</h1>
          <div className="d-grid gap-3">
            <button
              type="button"
              className="btn btn-outline-primary text-start p-4"
              onClick={handleNewBooking}
              disabled={creating}
            >
              <span className="d-block fs-4 fw-semibold mb-1">{creating ? '正在準備預約...' : '新客預約'}</span>
              <span className="d-block">第一次來店，還沒有資料</span>
            </button>
            <button
              type="button"
              className="btn btn-outline-primary text-start p-4"
              onClick={() => setMessage(BOOKING_MESSAGES.returning)}
            >
              <span className="d-block fs-4 fw-semibold mb-1">舊客預約</span>
              <span className="d-block">之前已經來過店裡</span>
            </button>
          </div>
          {error ? (
            <div className="alert alert-danger mt-4 mb-0" role="alert">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="alert alert-info mt-4 mb-0" role="status" aria-live="polite">
              {message}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
