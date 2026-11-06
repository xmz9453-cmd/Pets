import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  API_BASE_URL,
  getPublicPortalBackground,
  getPublicPortalSettings,
  getPublicShops,
} from '../api/client';

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

function AnnouncementMarquee({ announcements }) {
  if (!announcements.length) return null;

  return (
    <Link className="portal-announcement" href="/announcements" aria-label="查看所有店家公告">
      <div className="portal-announcement-label">
        <PortalIcon name="announcement" />
        <span>最新公告</span>
      </div>
      <div className="portal-marquee">
        <div className="portal-marquee-track">
          {[0, 1].map((copy) => (
            <div className="portal-marquee-group" key={copy} aria-hidden={copy === 1}>
              {announcements.map((item) => (
                <span className="portal-marquee-item" key={`${copy}-${item.id}`}>
                  <strong>{item.name}</strong>
                  <span>{item.announcement}</span>
                  <span className="portal-marquee-separator" aria-hidden="true">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [backgroundUrl, setBackgroundUrl] = useState(null);
  const [backgroundError, setBackgroundError] = useState('');
  const [footerText, setFooterText] = useState('');
  const [footerError, setFooterError] = useState('');

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

  useEffect(() => {
    let active = true;
    getPublicPortalBackground().then(({ background_url: url }) => {
      if (active) setBackgroundUrl(url || null);
    }).catch((loadError) => {
      if (active) setBackgroundError(loadError.message || '背景照片目前無法載入，已改用預設背景。');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    getPublicPortalSettings().then(({ footer_text: text }) => {
      if (active) setFooterText(text);
    }).catch((loadError) => {
      if (active) setFooterError(loadError.message || '入口版權資訊目前無法載入。');
    });
    return () => { active = false; };
  }, []);

  const announcements = useMemo(
    () => shops.filter((shop) => shop.announcement?.trim()),
    [shops],
  );

  return (
    <main className="portal-page">
      <div className="portal-background" aria-hidden="true">
        {backgroundUrl ? (
          <div
            className="portal-background-image"
            style={{ backgroundImage: `url("${API_BASE_URL}${backgroundUrl}")` }}
          />
        ) : null}
      </div>
      <div className="portal-content">
        <header className="portal-topbar">
          <div className="portal-brand" aria-label="毛孩生活服務入口">
            <span className="portal-brand-mark"><PortalIcon name="paw" /></span>
            <span>毛孩生活服務</span>
          </div>
        </header>

        <AnnouncementMarquee announcements={announcements} />

        <section className="portal-hero">
          <div className="portal-hero-copy">
            <p className="portal-eyebrow">毛孩美容・安心住宿</p>
            <h1>讓每一次照護，<br />都成為安心的日常。</h1>
            <p>從專業美容到安心住宿，為毛孩挑選值得信賴的店家，輕鬆開始預約。</p>
            {backgroundError ? <p className="portal-background-status" role="status">{backgroundError}</p> : null}
          </div>
        </section>

        <section className="portal-member-panel" aria-labelledby="portal-member-title">
          <div className="portal-member-heading">
            <div className="portal-member-title">
              <span className="portal-member-icon"><PortalIcon name="paw" /></span>
              <div>
                <h2 id="portal-member-title">挑選店家，開始預約</h2>
                <p>選擇想前往的店家，查看服務與預約資訊。</p>
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
              {shops.map((shop) => (
                <Link
                  className="portal-shop-link"
                  href={`/booking?shop_id=${encodeURIComponent(shop.id)}`}
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
          {footerError
            ? <span role="status">{footerError}</span>
            : footerText ? <span>{footerText}</span> : null}
          <Link className="portal-staff-link" href="/login">
            <PortalIcon name="staff" />
            店家登入
          </Link>
        </footer>
      </div>
    </main>
  );
}
