import { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL, getPublicShops } from '../api/client';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadAnnouncements(isActive = () => true) {
    setLoading(true);
    setError('');
    try {
      const result = await getPublicShops();
      if (!Array.isArray(result.shops)) {
        throw new Error('店家公告格式不正確，請稍後再試。');
      }
      if (isActive()) setAnnouncements(result.shops.filter((shop) => shop.announcement?.trim()));
    } catch (loadError) {
      if (isActive()) setError(loadError.message || '目前無法載入店家公告，請稍後再試。');
    } finally {
      if (isActive()) setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    loadAnnouncements(() => active);
    return () => { active = false; };
  }, []);

  return (
    <main className="portal-page portal-announcements-page">
      <div className="portal-background" aria-hidden="true" />
      <div className="portal-content">
        <header className="portal-announcements-header">
          <div>
            <Link className="portal-announcements-back" href="/">← 回到入口首頁</Link>
            <p className="portal-eyebrow">毛孩美容・安心住宿</p>
            <h1>店家公告</h1>
            <p className="portal-announcements-description">查看各店家最新消息與服務資訊。</p>
          </div>
          <Link className="portal-staff-link portal-announcements-home" href="/">回到入口首頁</Link>
        </header>

        {loading ? <p className="portal-status" role="status">正在載入店家公告…</p> : null}
        {!loading && error ? (
          <div className="portal-announcements-empty">
            <p className="portal-status portal-status-error" role="alert">{error}</p>
            <button className="portal-retry" type="button" onClick={() => loadAnnouncements()}>重新載入</button>
          </div>
        ) : null}
        {!loading && !error && !announcements.length ? (
          <div className="portal-announcements-empty">
            <p className="portal-status">目前沒有店家公告。</p>
          </div>
        ) : null}
        {!loading && !error && announcements.length ? (
          <div className="portal-announcement-list">
            {announcements.map((shop) => (
              <article className="portal-announcement-card" key={shop.id}>
                <div className="portal-announcement-card-heading">
                  <span className="portal-announcement-card-logo" aria-hidden="true">
                    {shop.logo_url ? (
                      <img src={`${API_BASE_URL}${shop.logo_url}`} alt="" />
                    ) : <span>{shop.name.slice(0, 1)}</span>}
                  </span>
                  <h2>{shop.name}</h2>
                </div>
                <p className="portal-announcement-card-content">{shop.announcement}</p>
                <p className="portal-announcements-description mb-0">
                  請使用店家提供的專屬網址，直接進入登入與預約。
                </p>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
