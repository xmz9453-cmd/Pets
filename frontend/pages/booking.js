import { useState } from 'react';

const BOOKING_MESSAGES = {
  new: '新客預約流程尚未開放。',
  returning: '舊客預約流程尚未開放。',
};

export default function BookingPage() {
  const [message, setMessage] = useState('');

  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          <h1 className="text-center mb-4">我要預約</h1>
          <div className="d-grid gap-3">
            <button
              type="button"
              className="btn btn-outline-primary text-start p-4"
              onClick={() => setMessage(BOOKING_MESSAGES.new)}
            >
              <span className="d-block fs-4 fw-semibold mb-1">新客預約</span>
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
