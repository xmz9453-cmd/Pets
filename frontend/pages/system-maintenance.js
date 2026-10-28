import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getCurrentStaff, resetOperationalData } from '../api/client';

export default function SystemMaintenancePage() {
  const router = useRouter();
  const [shop, setShop] = useState(null);
  const [step, setStep] = useState(0);
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    getCurrentStaff().then(({ staff }) => {
      if (!active) return;
      if (!staff.is_platform_shop_manager) {
        router.replace('/');
        return;
      }
      const selectedShop = (staff.shops || []).find((item) => Number(item.id) === Number(staff.shop_id));
      setShop(selectedShop || null);
      setLoading(false);
    }).catch(() => router.replace('/login'));
    return () => { active = false; };
  }, [router]);

  function closeConfirmation() {
    setStep(0);
    setConfirmation('');
  }

  async function handleReset() {
    if (!shop || confirmation.trim() !== shop.name) return;
    setResetting(true);
    setError('');
    setSuccess('');
    try {
      const result = await resetOperationalData(confirmation, shop.id);
      setSuccess(result.message || '目前店家的測試／營運資料已清除。');
      closeConfirmation();
    } catch (resetError) {
      setError(resetError.message || '無法清除目前店家的資料。');
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return <main className="container py-4"><div className="alert alert-light border">系統管理頁面載入中…</div></main>;
  }

  return (
    <main className="container-fluid p-4">
      <div className="mb-4">
        <h1 className="h3 mb-1">系統管理</h1>
        <p className="text-muted mb-0">管理高影響的系統操作。此頁僅供系統管理者使用。</p>
      </div>
      {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
      {success ? <div className="alert alert-success" role="status">{success}</div> : null}

      <section className="card border-danger shadow-sm">
        <div className="card-body">
          <h2 className="h5 mb-2">清除測試／營運資料</h2>
          {shop ? <p className="mb-2">目前選取店家：<strong>{shop.name}</strong></p> : <p className="text-danger">無法確認目前店家，暫停清除功能。</p>}
          <p className="text-muted">清除範圍只包含目前選取店家的客戶、寵物、服務、商品、預約、美容、住宿、訂單、付款及未完成的線上建檔資料。其他店家不受影響。</p>
          <p className="small text-muted">店家設定、員工、登入資料、預約時段與合約版本會保留。若目前店家已有已簽署電子合約，系統會拒絕清除並保留合約及簽名證據。</p>
          <p className="small text-danger fw-semibold">此操作會永久刪除資料，只允許在本機 Development／Test 環境執行。正式環境的 API 會拒絕此操作。</p>
          <button type="button" className="btn btn-danger" onClick={() => { setError(''); setSuccess(''); setStep(1); }} disabled={!shop || resetting}>
            清除目前店家的資料
          </button>
        </div>
      </section>

      {step === 1 ? (
        <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="reset-warning-title">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title h5" id="reset-warning-title">確認清除範圍</h2>
                <button type="button" className="btn-close" aria-label="關閉" onClick={closeConfirmation} />
              </div>
              <div className="modal-body">
                <p>即將刪除「{shop?.name}」店內的測試／營運資料，其他店家不受影響。</p>
                <p>已簽署電子合約會保留；若有簽署紀錄，系統將停止清除。</p>
                <p className="text-danger fw-semibold mb-0">資料刪除後無法從系統還原。請確認目前是本機 Development／Test 環境。</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={closeConfirmation}>取消</button>
                <button type="button" className="btn btn-danger" onClick={() => setStep(2)}>繼續</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="reset-final-title">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title h5" id="reset-final-title">最後確認</h2>
                <button type="button" className="btn-close" aria-label="關閉" onClick={closeConfirmation} />
              </div>
              <div className="modal-body">
                <p>請輸入店家名稱「{shop?.name}」以確認清除。</p>
                <label className="form-label" htmlFor="reset-shop-confirmation">店家名稱</label>
                <input id="reset-shop-confirmation" className="form-control" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={closeConfirmation} disabled={resetting}>取消</button>
                <button type="button" className="btn btn-danger" onClick={handleReset} disabled={resetting || confirmation.trim() !== shop?.name}>
                  {resetting ? '清除中…' : '永久清除資料'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
