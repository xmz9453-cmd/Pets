import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  activatePortalBackground,
  API_BASE_URL,
  createShop,
  createStaffAccount,
  deletePortalBackground,
  getCurrentStaff,
  getPortalBackgrounds,
  getPortalSettings,
  getShopStaff,
  resetOperationalData,
  updateShopStaffRoles,
  updatePortalSettings,
  uploadPortalBackground,
} from '../api/client';

const ROLE_LABELS = {
  FRONT_DESK: '櫃檯人員',
  GROOMER: '美容師',
  OWNER: '店家管理者',
};

function PortalBackgroundsPanel() {
  const [backgrounds, setBackgrounds] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadBackgrounds() {
    setError('');
    try {
      const result = await getPortalBackgrounds();
      setBackgrounds(result.backgrounds || []);
    } catch (loadError) {
      setError(loadError.message || '無法載入入口背景圖庫。');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBackgrounds();
  }, []);

  async function handleUpload(event) {
    event.preventDefault();
    if (!file) return;
    setUploading(true);
    setError('');
    setSuccess('');
    const form = event.currentTarget;
    try {
      await uploadPortalBackground(file);
      setFile(null);
      form.reset();
      setSuccess('背景圖片已加入圖庫；目前使用的圖片沒有變更。');
      await loadBackgrounds();
    } catch (uploadError) {
      setError(uploadError.message || '無法上傳入口背景圖片。');
    } finally {
      setUploading(false);
    }
  }

  async function handleActivate(background) {
    setProcessingId(background.id);
    setError('');
    setSuccess('');
    try {
      await activatePortalBackground(background.id);
      setSuccess(`已將「${background.original_filename}」設為入口背景。`);
      await loadBackgrounds();
    } catch (activateError) {
      setError(activateError.message || '無法切換入口背景。');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDelete(background) {
    const message = background.is_active
      ? '這是目前入口使用的背景，刪除後入口會回到預設底色。確定要刪除嗎？'
      : `確定要刪除「${background.original_filename}」嗎？`;
    if (!window.confirm(message)) return;
    setProcessingId(background.id);
    setError('');
    setSuccess('');
    try {
      await deletePortalBackground(background.id);
      setSuccess('背景圖片已刪除。');
      await loadBackgrounds();
    } catch (deleteError) {
      setError(deleteError.message || '無法刪除入口背景圖片。');
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <section className="card shadow-sm mb-4">
      <div className="card-body">
        <h2 className="h5">公開入口背景圖庫</h2>
        <p className="text-muted">
          管理所有店家共用的入口背景。上傳的照片會加入圖庫，不會自動取代目前使用的圖片；請選擇橫向、貓在左側且狗在右側的照片，以呈現理想版面。
        </p>
        {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
        {success ? <div className="alert alert-success" role="status">{success}</div> : null}
        <form className="row g-3 align-items-end mb-4" onSubmit={handleUpload}>
          <div className="col-md-9">
            <label htmlFor="portal-background-file" className="form-label">新增背景照片</label>
            <input
              id="portal-background-file"
              className="form-control"
              type="file"
              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            <div className="form-text">只接受 PNG、JPG 或 WebP，單張上限 10 MiB。照片會保存在伺服器的私有媒體目錄。</div>
          </div>
          <div className="col-md-3">
            <button className="btn btn-primary w-100" type="submit" disabled={!file || uploading}>
              {uploading ? '上傳中…' : '加入圖庫'}
            </button>
          </div>
        </form>
        {loading ? <p className="text-muted mb-0">正在載入背景圖庫…</p> : null}
        {!loading && !backgrounds.length ? (
          <p className="text-muted mb-0">圖庫目前是空的。上傳並選取一張照片後，公開入口就會使用它；在此之前入口會顯示中性底色。</p>
        ) : null}
        {backgrounds.length ? (
          <div className="row g-3">
            {backgrounds.map((background) => (
              <div className="col-sm-6 col-xl-4" key={background.id}>
                <article className="h-100 rounded border p-3">
                  <img
                    className="portal-background-card-preview mb-3"
                    src={`${API_BASE_URL}/api/portal-backgrounds/${background.id}/image`}
                    alt={`背景預覽：${background.original_filename}`}
                    crossOrigin="use-credentials"
                  />
                  <div className="d-flex align-items-start justify-content-between gap-2">
                    <strong className="text-break">{background.original_filename}</strong>
                    {background.is_active ? <span className="badge text-bg-success flex-shrink-0">目前使用</span> : null}
                  </div>
                  <p className="small text-muted mt-2 mb-3">
                    {(background.file_size / (1024 * 1024)).toFixed(2)} MiB
                  </p>
                  <div className="d-flex flex-wrap gap-2">
                    {!background.is_active ? (
                      <button
                        className="btn btn-sm btn-outline-primary"
                        type="button"
                        disabled={processingId !== null}
                        onClick={() => handleActivate(background)}
                      >
                        設為入口背景
                      </button>
                    ) : null}
                    <button
                      className="btn btn-sm btn-outline-danger"
                      type="button"
                      disabled={processingId !== null}
                      onClick={() => handleDelete(background)}
                    >
                      刪除
                    </button>
                  </div>
                </article>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PortalFooterSettingsPanel() {
  const [footerText, setFooterText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadSettings() {
    setLoading(true);
    setError('');
    try {
      const { footer_text: text } = await getPortalSettings();
      setFooterText(text);
      setLoaded(true);
    } catch (loadError) {
      setError(loadError.message || '無法載入入口版權文字。');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getPortalSettings().then(({ footer_text: text }) => {
      if (active) {
        setFooterText(text);
        setLoaded(true);
      }
    }).catch((loadError) => {
      if (active) setError(loadError.message || '無法載入入口版權文字。');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { footer_text: updatedText } = await updatePortalSettings({ footer_text: footerText });
      setFooterText(updatedText);
      setSuccess('入口版權文字已更新。');
    } catch (saveError) {
      setError(saveError.message || '無法更新入口版權文字。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card shadow-sm mb-4">
      <div className="card-body">
        <h2 className="h5">公開入口版權文字</h2>
        <p className="text-muted">設定公開入口頁面底部顯示的文字；留空即可隱藏。最多 300 個字元。</p>
        {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
        {success ? <div className="alert alert-success" role="status">{success}</div> : null}
        {loading ? <p className="text-muted mb-0">正在載入入口版權文字…</p> : (
          loaded ? <form onSubmit={handleSubmit}>
            <label htmlFor="portal-footer-text" className="form-label">版權文字</label>
            <div className="input-group">
              <input
                id="portal-footer-text"
                className="form-control"
                value={footerText}
                onChange={(event) => setFooterText(event.target.value)}
                maxLength={300}
              />
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? '儲存中…' : '儲存'}
              </button>
            </div>
          </form> : (
            <button type="button" className="btn btn-outline-secondary" onClick={loadSettings}>
              重新載入
            </button>
          )
        )}
      </div>
    </section>
  );
}

export default function ShopsPage() {
  const router = useRouter();
  const [isPlatformShopManager, setIsPlatformShopManager] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [staffAccounts, setStaffAccounts] = useState([]);
  const [updatingStaffId, setUpdatingStaffId] = useState(null);
  const [newStaff, setNewStaff] = useState({ username: '', display_name: '', password: '', role: 'OWNER' });
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetStep, setResetStep] = useState(0);
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');

  useEffect(() => {
    let active = true;
    getCurrentStaff().then(({ staff }) => {
      if (!active) return;
      if (!staff.is_platform_shop_manager) {
        router.replace('/dashboard');
        return;
      }
      setIsPlatformShopManager(true);
      setShops(staff.shops || []);
      setSelectedShop((staff.shops || []).find((shop) => Number(shop.id) === Number(staff.shop_id)) || null);
      return getShopStaff();
    }).then((result) => {
      if (active && result) setStaffAccounts(result.staff || []);
    }).catch(() => router.replace('/login'));
    return () => { active = false; };
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { shop } = await createShop({ name, slug });
      window.localStorage.setItem('psop.currentShopId', String(shop.id));
      window.location.assign('/shops');
    } catch (createError) {
      setError(createError.message || '無法建立店家。');
      setSaving(false);
    }
  }

  async function changeRoles(account, role, checked) {
    const roles = checked
      ? [...new Set([...account.roles, role])]
      : account.roles.filter((item) => item !== role);
    setUpdatingStaffId(account.id);
    setError('');
    try {
      const { staff: updated } = await updateShopStaffRoles(account.id, roles);
      setStaffAccounts((current) => current.map((item) => (item.id === account.id ? { ...item, ...updated } : item)));
    } catch (updateError) {
      setError(updateError.message || '無法更新員工權限。');
    } finally {
      setUpdatingStaffId(null);
    }
  }

  async function handleCreateStaff(event) {
    event.preventDefault();
    setCreatingStaff(true);
    setError('');
    try {
      const { staff } = await createStaffAccount({
        username: newStaff.username.trim(),
        display_name: newStaff.display_name.trim(),
        password: newStaff.password,
        roles: [newStaff.role],
      });
      setStaffAccounts((current) => [...current.filter((item) => item.id !== staff.id), staff]);
      setNewStaff({ username: '', display_name: '', password: '', role: 'GROOMER' });
    } catch (createError) {
      setError(createError.message || '無法建立員工帳號。');
    } finally {
      setCreatingStaff(false);
    }
  }

  function closeResetConfirmation() {
    setResetStep(0);
    setResetConfirmation('');
  }

  async function handleResetOperationalData() {
    if (!selectedShop || resetConfirmation.trim() !== selectedShop.name) return;
    setResetting(true);
    setError('');
    setResetSuccess('');
    try {
      const result = await resetOperationalData(resetConfirmation, selectedShop.id);
      setResetSuccess(result.message || '目前店家的測試／營運資料已清除。');
      closeResetConfirmation();
    } catch (resetError) {
      setError(resetError.message || '無法清除目前店家的資料。');
    } finally {
      setResetting(false);
    }
  }

  return (
    <main className="container-fluid p-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">系統管理</h1>
          <p className="text-muted mb-0">管理店家、員工帳號，以及目前店家的本機測試資料。</p>
        </div>
      </div>
      {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
      {resetSuccess ? <div className="alert alert-success" role="status">{resetSuccess}</div> : null}
      {isPlatformShopManager ? <PortalBackgroundsPanel /> : null}
      {isPlatformShopManager ? <PortalFooterSettingsPanel /> : null}
      <section className="card shadow-sm mb-4">
        <div className="card-body">
          <h2 className="h5">店家管理</h2>
          <p className="text-muted">新增店家，並查看系統中的店家清單。</p>
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-md-5">
              <label htmlFor="shop-name" className="form-label">店家名稱</label>
              <input id="shop-name" className="form-control" value={name} onChange={(event) => setName(event.target.value)} maxLength={200} required />
            </div>
            <div className="col-md-5">
              <label htmlFor="shop-slug" className="form-label">店家代碼</label>
              <input id="shop-slug" className="form-control" value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase())} pattern="[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?" maxLength={80} required />
              <div className="form-text">僅使用小寫英文字母、數字及連字號。</div>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-primary w-100" type="submit" disabled={saving}>{saving ? '建立中…' : '建立'}</button>
            </div>
          </form>
        </div>
      </section>
      <section className="card shadow-sm mb-4">
        <div className="card-body">
          <h2 className="h5">可使用店家</h2>
          {shops.length ? (
            <ul className="list-group list-group-flush">
              {shops.map((shop) => (
                <li className="list-group-item d-flex justify-content-between" key={shop.id}>
                  <span>{shop.name}{Number(shop.id) === Number(selectedShop?.id) ? <span className="badge text-bg-primary ms-2">目前選取</span> : null}</span>
                  <code>{shop.slug}</code>
                </li>
              ))}
            </ul>
          ) : <p className="text-muted mb-0">正在載入店家…</p>}
        </div>
      </section>
      <section className="card shadow-sm mb-4">
        <div className="card-body">
          <h2 className="h5">建立員工帳號</h2>
          <p className="text-muted">新帳號會加入目前選取的店家；之後可由你或該店 OWNER 指派其他店別角色。</p>
          <form onSubmit={handleCreateStaff} className="row g-3">
            <div className="col-md-3">
              <label htmlFor="staff-username" className="form-label">使用者名稱</label>
              <input id="staff-username" className="form-control" value={newStaff.username} onChange={(event) => setNewStaff({ ...newStaff, username: event.target.value })} maxLength={100} autoComplete="username" required />
            </div>
            <div className="col-md-3">
              <label htmlFor="staff-display-name" className="form-label">姓名</label>
              <input id="staff-display-name" className="form-control" value={newStaff.display_name} onChange={(event) => setNewStaff({ ...newStaff, display_name: event.target.value })} maxLength={100} autoComplete="name" required />
            </div>
            <div className="col-md-3">
              <label htmlFor="staff-initial-password" className="form-label">初始密碼</label>
              <input id="staff-initial-password" className="form-control" type="password" value={newStaff.password} onChange={(event) => setNewStaff({ ...newStaff, password: event.target.value })} minLength={8} autoComplete="new-password" required />
            </div>
            <div className="col-md-2">
              <label htmlFor="staff-role" className="form-label">目前店家角色</label>
              <select id="staff-role" className="form-select" value={newStaff.role} onChange={(event) => setNewStaff({ ...newStaff, role: event.target.value })}>
                {Object.entries(ROLE_LABELS).map(([role, label]) => <option key={role} value={role}>{label}</option>)}
              </select>
            </div>
            <div className="col-md-1 d-flex align-items-end">
              <button className="btn btn-primary w-100" type="submit" disabled={creatingStaff}>{creatingStaff ? '建立中…' : '建立'}</button>
            </div>
          </form>
        </div>
      </section>
      <section className="card shadow-sm mt-4">
        <div className="card-body">
          <h2 className="h5">全域帳號與店家任職</h2>
          <p className="text-muted">
            這裡列出系統中的全域帳號；目前選取店家為 <strong>{selectedShop?.name || '載入中…'}</strong>。
            「已加入」表示帳號在此店任職，各店角色分開設定；未加入此店的帳號沒有本店工作權限。
          </p>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>全域帳號</th>
                  <th>姓名</th>
                  <th>帳號狀態</th>
                  <th>目前店家任職</th>
                  <th>本店角色</th>
                </tr>
              </thead>
              <tbody>
                {staffAccounts.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <div>{account.username}</div>
                      {account.is_platform_shop_manager ? (
                        <span className="badge text-bg-dark mt-1">系統管理者・跨店</span>
                      ) : null}
                    </td>
                    <td>{account.display_name}</td>
                    <td>
                      {account.status === 'ACTIVE' || account.status === 'active'
                        ? <span className="badge text-bg-success">啟用</span>
                        : <span className="badge text-bg-secondary">停用</span>}
                    </td>
                    <td>
                      {account.is_platform_shop_manager ? (
                        <span className="badge text-bg-primary">可管理所有店家</span>
                      ) : account.is_member ? (
                        <span className="badge text-bg-success">已加入此店</span>
                      ) : (
                        <span className="badge text-bg-light border text-dark">尚未加入此店</span>
                      )}
                    </td>
                    <td>
                      {account.is_platform_shop_manager ? (
                        <span className="text-muted">系統管理權限不受店家角色影響</span>
                      ) : (
                        <>
                          <div className="d-flex flex-wrap gap-2">
                            {['FRONT_DESK', 'GROOMER', 'OWNER'].map((role) => (
                              <label className="form-check form-check-inline mb-0" key={role}>
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={account.roles.includes(role)}
                                  disabled={!['ACTIVE', 'active'].includes(account.status) || updatingStaffId === account.id}
                                  onChange={(event) => changeRoles(account, role, event.target.checked)}
                                />
                                <span className="form-check-label">{ROLE_LABELS[role]}</span>
                              </label>
                            ))}
                          </div>
                          {!account.is_member ? (
                            <small className="d-block text-muted mt-1">勾選本店角色即可將此帳號加入目前店家。</small>
                          ) : account.roles.length === 0 ? (
                            <small className="d-block text-warning-emphasis mt-1">帳號已加入此店，但尚未指派角色。</small>
                          ) : null}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {!staffAccounts.length ? <tr><td colSpan="5" className="text-muted">正在載入全域帳號…</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <section className="card border-danger shadow-sm mt-4">
        <div className="card-body">
          <h2 className="h5 mb-2">清除測試／營運資料</h2>
          {selectedShop
            ? <p className="mb-2">目前選取店家：<strong>{selectedShop.name}</strong></p>
            : <p className="text-danger">無法確認目前店家，暫停清除功能。</p>}
          <p className="text-muted">清除範圍只包含目前選取店家的客戶、寵物、商品、預約、美容、住宿、訂單、付款及未完成的線上建檔資料。服務設定會保留；其他店家不受影響。</p>
          <p className="small text-muted">店家設定、員工、登入資料、預約時段、服務設定與合約版本會保留。若目前店家已有已簽署電子合約，系統會拒絕清除並保留合約及簽名證據。</p>
          <p className="small text-danger fw-semibold">此操作會永久刪除資料，只允許在本機 Development／Test 環境執行。正式環境的 API 會拒絕此操作。</p>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => { setError(''); setResetSuccess(''); setResetStep(1); }}
            disabled={!selectedShop || resetting}
          >
            清除目前店家的資料
          </button>
        </div>
      </section>

      {resetStep === 1 ? (
        <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="reset-warning-title">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title h5" id="reset-warning-title">確認清除範圍</h2>
                <button type="button" className="btn-close" aria-label="關閉" onClick={closeResetConfirmation} />
              </div>
              <div className="modal-body">
                <p>即將刪除「{selectedShop?.name}」店內的測試／營運資料，其他店家不受影響。</p>
                <p>已簽署電子合約會保留；若有簽署紀錄，系統將停止清除。</p>
                <p className="text-danger fw-semibold mb-0">資料刪除後無法從系統還原。請確認目前是本機 Development／Test 環境。</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={closeResetConfirmation}>取消</button>
                <button type="button" className="btn btn-danger" onClick={() => setResetStep(2)}>繼續</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {resetStep === 2 ? (
        <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="reset-final-title">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title h5" id="reset-final-title">最後確認</h2>
                <button type="button" className="btn-close" aria-label="關閉" onClick={closeResetConfirmation} />
              </div>
              <div className="modal-body">
                <p>請輸入店家名稱「{selectedShop?.name}」以確認清除。</p>
                <label className="form-label" htmlFor="reset-shop-confirmation">店家名稱</label>
                <input
                  id="reset-shop-confirmation"
                  className="form-control"
                  value={resetConfirmation}
                  onChange={(event) => setResetConfirmation(event.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={closeResetConfirmation} disabled={resetting}>取消</button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleResetOperationalData}
                  disabled={resetting || resetConfirmation.trim() !== selectedShop?.name}
                >
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
