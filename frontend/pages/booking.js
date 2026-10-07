import { useState } from 'react';
import { useRouter } from 'next/router';
import { confirmExistingBookingCustomer, createPublicOnboarding } from '../api/client';

const BOOKING_MESSAGES = {
  new: '新客預約流程尚未開放。',
  confirmationFailure: '手機號碼或姓名不正確，請確認後再試。',
  confirmationSuccess: '身分確認成功，下一步功能尚未開放。',
};

export default function BookingPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [showReturningForm, setShowReturningForm] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [confirming, setConfirming] = useState(false);

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

  async function handleExistingCustomerConfirmation(event) {
    event.preventDefault();
    setConfirming(true);
    setError('');
    setMessage('');
    try {
      await confirmExistingBookingCustomer(phone, name);
      setMessage(BOOKING_MESSAGES.confirmationSuccess);
    } catch {
      setError(BOOKING_MESSAGES.confirmationFailure);
    } finally {
      setConfirming(false);
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
              onClick={() => {
                setShowReturningForm(true);
                setError('');
                setMessage('');
              }}
            >
              <span className="d-block fs-4 fw-semibold mb-1">舊客預約</span>
              <span className="d-block">之前已經來過店裡</span>
            </button>
          </div>
          {showReturningForm ? (
            <form className="mt-4" onSubmit={handleExistingCustomerConfirmation}>
              <div className="mb-3">
                <label htmlFor="booking-phone" className="form-label">手機號碼</label>
                <input
                  id="booking-phone"
                  className="form-control"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                  disabled={confirming}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="booking-name" className="form-label">姓名</label>
                <input
                  id="booking-name"
                  className="form-control"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  disabled={confirming}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={confirming}>
                {confirming ? '確認中...' : '確認'}
              </button>
            </form>
          ) : null}
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
