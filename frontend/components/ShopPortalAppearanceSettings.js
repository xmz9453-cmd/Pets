import { useEffect, useState } from 'react';
import {
  API_BASE_URL,
  activatePortalBackground,
  deletePortalBackground,
  getPortalBackgrounds,
  getPortalSettings,
  updatePortalSettings,
  uploadPortalBackground,
} from '../api/client';

export default function ShopPortalAppearanceSettings({ shopId }) {
  const [backgrounds, setBackgrounds] = useState([]);
  const [file, setFile] = useState(null);
  const [footerText, setFooterText] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingFooter, setSavingFooter] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loaded, setLoaded] = useState(false);

  async function loadSettings() {
    const [settings, gallery] = await Promise.all([getPortalSettings(), getPortalBackgrounds()]);
    setFooterText(settings.footer_text);
    setBackgrounds(gallery.backgrounds || []);
    setLoaded(true);
  }

  useEffect(() => {
    let active = true;
    Promise.all([getPortalSettings(), getPortalBackgrounds()])
      .then(([settings, gallery]) => {
        if (!active) return;
        setFooterText(settings.footer_text);
        setBackgrounds(gallery.backgrounds || []);
        setLoaded(true);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || '無法載入顧客入口外觀設定。');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [shopId]);

  async function refreshGallery() {
    const gallery = await getPortalBackgrounds();
    setBackgrounds(gallery.backgrounds || []);
  }

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
      await refreshGallery();
      setSuccess('背景圖片已加入本店圖庫；目前使用的圖片沒有變更。');
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
      await refreshGallery();
      setSuccess(`已將「${background.original_filename}」設為本店入口背景。`);
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
      await refreshGallery();
      setSuccess('背景圖片已刪除。');
    } catch (deleteError) {
      setError(deleteError.message || '無法刪除入口背景圖片。');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleFooterSubmit(event) {
    event.preventDefault();
    setSavingFooter(true);
    setError('');
    setSuccess('');
    try {
      const { footer_text: updatedText } = await updatePortalSettings({ footer_text: footerText });
      setFooterText(updatedText);
      setSuccess('本店入口版權文字已更新。');
    } catch (saveError) {
      setError(saveError.message || '無法更新入口版權文字。');
    } finally {
      setSavingFooter(false);
    }
  }

  return (
    <section className="card shadow-sm mt-4">
      <div className="card-body">
        <h2 className="h5">顧客入口外觀</h2>
        <p className="text-muted">以下背景圖庫與版權文字只會套用在本店的顧客專屬入口。</p>
        {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
        {success ? <div className="alert alert-success" role="status">{success}</div> : null}
        {loading ? <p role="status">正在載入入口外觀設定…</p> : null}
        {!loading && !loaded ? (
          <button type="button" className="btn btn-outline-secondary" onClick={() => {
            setLoading(true);
            setError('');
            loadSettings().catch((loadError) => {
              setError(loadError.message || '無法載入顧客入口外觀設定。');
            }).finally(() => setLoading(false));
          }}>
            重新載入
          </button>
        ) : null}
        {!loading && loaded ? (
          <>
            <section className="border rounded p-3 mb-3">
              <h3 className="h6">本店背景圖庫</h3>
              <p className="text-muted">上傳的照片會加入本店圖庫，不會自動取代目前使用的圖片。請選擇橫向、貓在左側且狗在右側的照片。</p>
              <form className="row g-3 align-items-end mb-4" onSubmit={handleUpload}>
                <div className="col-md-9">
                  <label htmlFor="shop-portal-background-file" className="form-label">新增背景照片</label>
                  <input
                    id="shop-portal-background-file"
                    className="form-control"
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                    onChange={(event) => setFile(event.target.files?.[0] || null)}
                  />
                  <div className="form-text">只接受 PNG、JPG 或 WebP，單張上限 10 MiB。</div>
                </div>
                <div className="col-md-3">
                  <button className="btn btn-primary w-100" type="submit" disabled={!file || uploading}>
                    {uploading ? '上傳中…' : '加入本店圖庫'}
                  </button>
                </div>
              </form>
              {!backgrounds.length ? (
                <p className="text-muted mb-0">本店圖庫目前是空的。選取背景照片後，顧客入口就會使用它；在此之前會顯示中性底色。</p>
              ) : (
                <div className="row g-3">
                  {backgrounds.map((background) => (
                    <div className="col-sm-6 col-xl-4" key={background.id}>
                      <article className="h-100 rounded border p-3">
                        <img
                          className="portal-background-card-preview mb-3"
                          src={`${API_BASE_URL}/api/portal-backgrounds/${background.id}/image?shop_id=${encodeURIComponent(shopId)}`}
                          alt={`背景預覽：${background.original_filename}`}
                          crossOrigin="use-credentials"
                        />
                        <div className="d-flex align-items-start justify-content-between gap-2">
                          <strong className="text-break">{background.original_filename}</strong>
                          {background.is_active ? <span className="badge text-bg-success flex-shrink-0">目前使用</span> : null}
                        </div>
                        <p className="small text-muted mt-2 mb-3">{(background.file_size / (1024 * 1024)).toFixed(2)} MiB</p>
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
              )}
            </section>
            <section className="border rounded p-3">
              <h3 className="h6">本店入口版權文字</h3>
              <p className="text-muted">設定顧客入口頁面底部顯示的文字；留空即可隱藏。最多 300 個字元。</p>
              <form onSubmit={handleFooterSubmit}>
                <label htmlFor="shop-portal-footer-text" className="form-label">版權文字</label>
                <div className="input-group">
                  <input
                    id="shop-portal-footer-text"
                    className="form-control"
                    value={footerText}
                    onChange={(event) => setFooterText(event.target.value)}
                    maxLength={300}
                  />
                  <button className="btn btn-primary" type="submit" disabled={savingFooter}>
                    {savingFooter ? '儲存中…' : '儲存'}
                  </button>
                </div>
              </form>
            </section>
          </>
        ) : null}
      </div>
    </section>
  );
}
