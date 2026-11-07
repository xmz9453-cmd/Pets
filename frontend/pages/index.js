import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL, getPublicShops } from '../api/client';
import AnnouncementMarquee from '../components/AnnouncementMarquee';

function PortalIcon({ name }) {
  const paths = {
    paw: 'M8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm8 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM5 16a1.8 1.8 0 1 0 0-3.6A1.8 1.8 0 0 0 5 16Zm14 0a1.8 1.8 0 1 0 0-3.6A1.8 1.8 0 0 0 19 16Zm-7-2c-2.7 0-5.2 2-5.2 4.1 0 1.2 1 1.9 2.4 1.9h5.6c1.4 0 2.4-.7 2.4-1.9 0-2.1-2.5-4.1-5.2-4.1Z',
    announcement: 'M3 10v4h3l10 4V6L6 10H3Zm3 4 1.5 5h3L8 14m10-5a5 5 0 0 1 0 6m2-8a8 8 0 0 1 0 10',
    staff: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0M18 5l2 2 3-3',
    arrow: 'M5 12h14m-6-6 6 6-6 6',
  };
  return (
    <svg className="portal-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={paths[name]} />
    </svg>
  );
}

export default function Home() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadShops = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getPublicShops();
      if (!Array.isArray(result.shops)) {
        throw new Error('店家資訊格式不正確，請稍後再試。');
      }
      setShops(result.shops);
    } catch (loadError) {
      setError(loadError.message || '目前無法載入店家資訊，請稍後再試。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShops();
  }, [loadShops]);

  const announcements = useMemo(
    () => shops.filter((shop) => shop.announcement?.trim()),
    [shops],
  );

  return (
    <main className="portal-page portal-landing-page">
      <div className="portal-background" aria-hidden="true" />
      <div className="portal-content">
        <header className="portal-topbar">
          <div className="portal-brand" aria-label="毛孩生活服務入口">
            <span className="portal-brand-mark"><PortalIcon name="paw" /></span>
            <span className="portal-brand-name">毛孩生活服務</span>
          </div>
        </header>

        <AnnouncementMarquee
          announcements={announcements}
          label="最新公告"
          ariaLabel="查看所有店家公告"
          href="/announcements"
        />

        <section className="portal-hero">
          <div className="portal-hero-copy">
            <p className="portal-eyebrow">毛孩美容・安心住宿</p>
            <h1>讓每一次照護，<br />都成為安心的日常。</h1>
            <p>從專業美容到安心住宿，透過店家提供的專屬入口，輕鬆開始預約。</p>
          </div>
        </section>

        <section className="portal-member-panel" aria-labelledby="portal-member-title">
          <div className="portal-member-heading">
            <div className="portal-member-title">
              <span className="portal-member-icon"><PortalIcon name="paw" /></span>
              <div>
                <h2 id="portal-member-title">挑選店家，開始預約</h2>
                <p>選擇想前往的店家，進入專屬首頁後即可登入與預約。</p>
              </div>
            </div>
            <span className="portal-member-note">找到最適合毛孩的照護</span>
          </div>

          {loading ? <p className="portal-status" role="status">正在載入店家資訊…</p> : null}
          {!loading && error ? (
            <div>
              <p className="portal-status portal-status-error" role="alert">{error}</p>
              <button className="portal-retry" type="button" onClick={loadShops}>重新載入</button>
            </div>
          ) : null}
          {!loading && !error && shops.length === 0 ? (
            <p className="portal-status">目前沒有開放預約的店家，請稍後再試。</p>
          ) : null}
          {!loading && !error && shops.length > 0 ? (
            <div className="portal-shop-grid">
              {shops.filter((shop) => shop.public_entry_code).map((shop) => (
                <Link
                  className="portal-shop-link"
                  href={`/s/${encodeURIComponent(shop.public_entry_code)}`}
                  key={shop.id}
                >
                  <span className={`portal-shop-logo${shop.logo_url ? ' has-logo' : ''}`} aria-hidden="true">
                    {!shop.logo_url ? <PortalIcon name="paw" /> : null}
                    {shop.logo_url ? (
                      <img
                        src={`${API_BASE_URL}${shop.logo_url}`}
                        alt=""
                        onError={(event) => { event.currentTarget.hidden = true; }}
                      />
                    ) : null}
                  </span>
                  <span className="portal-shop-name">{shop.name}</span>
                  <span className="portal-shop-actions">
                    <span className="portal-shop-arrow"><PortalIcon name="arrow" /></span>
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        <footer className="portal-footer">
          <Link className="portal-staff-link" href="/login">
            <PortalIcon name="staff" />
            店家登入
          </Link>
        </footer>
      </div>
    </main>
  );
}
