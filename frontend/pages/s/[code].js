import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AnnouncementMarquee from '../../components/AnnouncementMarquee';
import {
  API_BASE_URL,
  getCustomerMember,
  getCustomerMemberAuthUrl,
  getCustomerMemberProviders,
  getPublicShopEntry,
  getPublicPortalBackground,
  getPublicPortalSettings,
} from '../../api/client';

const MEMBER_ERRORS = {
  login_cancelled: '已取消登入。',
  CUSTOMER_AUTH_IDENTITY_IN_USE: '此登入方式已連結至其他會員，無法自動合併。',
  CUSTOMER_AUTH_INVALID_ID_TOKEN: '登入驗證未成功，請重新嘗試。',
  CUSTOMER_AUTH_PROVIDER_NOT_CONFIGURED: '此登入方式尚未完成設定，請稍後再試。',
  CUSTOMER_AUTH_STATE_INVALID: '登入要求已失效，請重新開始。',
  CUSTOMER_SESSION_INVALID: '登入工作階段已失效，請重新登入。',
};

export default function ShopEntryPage() {
  const router = useRouter();
  const code = router.isReady && typeof router.query.code === 'string' ? router.query.code : '';
  const [shop, setShop] = useState(null);
  const [providers, setProviders] = useState({ LINE: false, GOOGLE: false });
  const [member, setMember] = useState(null);
  const [backgroundUrl, setBackgroundUrl] = useState(null);
  const [backgroundError, setBackgroundError] = useState('');
  const [footerText, setFooterText] = useState('');
  const [footerError, setFooterError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) {
      if (router.isReady) {
        setError('店家入口網址無效，請向店家索取正確連結。');
        setLoading(false);
      }
      return undefined;
    }
    let active = true;

    async function loadEntry() {
      setLoading(true);
      setError('');
      try {
        const [shopResult, providerResult] = await Promise.all([
          getPublicShopEntry(code),
          getCustomerMemberProviders(),
        ]);
        if (!active) return;
        setShop(shopResult.shop);
        setProviders(providerResult.providers || {});
        try {
          const memberResult = await getCustomerMember(code);
          if (active) setMember(memberResult.member);
        } catch (memberError) {
          if (memberError.statusCode !== 401) throw memberError;
        }
      } catch (loadError) {
        if (active) setError(loadError.message || '目前無法載入店家入口，請稍後再試。');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadEntry();
    return () => { active = false; };
  }, [code, router.isReady]);

  useEffect(() => {
    if (!code) return undefined;
    let active = true;
    getPublicPortalBackground(code).then(({ background_url: url }) => {
      if (active) setBackgroundUrl(url || null);
    }).catch((loadError) => {
      if (active) setBackgroundError(loadError.message || '入口背景目前無法載入，已改用預設背景。');
    });
    return () => { active = false; };
  }, [code]);

  useEffect(() => {
    if (!code) return undefined;
    let active = true;
    getPublicPortalSettings(code).then(({ footer_text: text }) => {
      if (active) setFooterText(text);
    }).catch((loadError) => {
      if (active) setFooterError(loadError.message || '入口版權文字目前無法載入。');
    });
    return () => { active = false; };
  }, [code]);

  useEffect(() => {
    const memberError = router.query.member_error;
    if (memberError) setError(MEMBER_ERRORS[String(memberError)] || '登入未成功，請稍後再試或聯絡店家。');
  }, [router.query.member_error]);

  const bookingUrl = (type) => `/booking?entry_code=${encodeURIComponent(code)}&type=${type}`;

  return (
    <main className="portal-page shop-home-page">
      <div className="portal-background" aria-hidden="true">
        {backgroundUrl ? (
          <div
            className="portal-background-image"
            style={{ backgroundImage: `url("${API_BASE_URL}${backgroundUrl}")` }}
          />
        ) : null}
      </div>
      <div className="portal-content">
        {loading ? <p className="portal-status" role="status">正在載入店家首頁…</p> : null}
        {!loading && error && !shop ? (
          <section className="shop-home-panel" role="alert">
            <h1>目前無法開啟店家入口</h1>
            <p>{error}</p>
            <p>請確認網址正確，或向店家索取最新的專屬連結。</p>
          </section>
        ) : null}
        {!loading && shop ? (
          <>
            <header className="portal-topbar">
              <div className="portal-brand" aria-label={`${shop.name}顧客入口`}>
                <span className={`shop-home-logo${shop.logo_url ? ' has-logo' : ''}`}>
                  {shop.logo_url ? <img src={`${API_BASE_URL}${shop.logo_url}`} alt="" /> : <span aria-hidden="true">🐾</span>}
                </span>
                <span className="portal-brand-name">{shop.name}</span>
              </div>
            </header>

            <AnnouncementMarquee
              announcements={[{
                id: code,
                name: shop.name,
                announcement: shop.announcement?.trim() || `歡迎來到${shop.name}，立即登入會員開始預約。`,
              }]}
            />

            <section className="portal-hero shop-home-hero">
              <div className="portal-hero-copy">
                <p className="portal-eyebrow">毛孩美容・安心住宿</p>
                <h1>讓每一次照護，<br />都成為安心的日常。</h1>
                <p>歡迎來到{shop.name}，登入會員後即可開始預約美容或住宿。</p>
                {backgroundError ? <p className="portal-background-status" role="status">{backgroundError}</p> : null}
              </div>
            </section>

            <section className="shop-home-panel" aria-live="polite">
              {error ? <div className="alert alert-warning" role="alert">{error}</div> : null}
              {!member ? (
                <>
                  <h2>登入會員，開始預約</h2>
                  <p>選擇登入方式，登入後即可查看服務並預約。</p>
                  <div className="shop-home-auth-actions">
                    {['LINE', 'GOOGLE'].map((provider) => (
                      providers[provider] ? (
                        <a
                          key={provider}
                          className={`btn ${provider === 'LINE' ? 'btn-success' : 'btn-outline-dark'}`}
                          href={getCustomerMemberAuthUrl(provider, code)}
                        >
                          使用 {provider === 'LINE' ? 'LINE' : 'Google'} 登入
                        </a>
                      ) : (
                        <button key={provider} type="button" className="btn btn-outline-secondary" disabled>
                          {provider === 'LINE' ? 'LINE' : 'Google'} 尚未設定
                        </button>
                      )
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="shop-home-welcome">您好，{member.display_name || '會員'}</p>
                  <h2>今天想為毛孩預約什麼服務？</h2>
                  <p>選擇服務項目，接著完成原有預約流程。</p>
                  <div className="shop-home-booking-actions">
                    <Link className="shop-home-booking-card" href={bookingUrl('GROOMING')}>
                      <span aria-hidden="true">✂</span>
                      <strong>預約美容</strong>
                      <span>選擇美容服務與可預約時段</span>
                    </Link>
                    <Link className="shop-home-booking-card" href={bookingUrl('BOARDING')}>
                      <span aria-hidden="true">⌂</span>
                      <strong>預約住宿</strong>
                      <span>選擇住宿服務與入住日期</span>
                    </Link>
                  </div>
                </>
              )}
            </section>
          </>
        ) : null}
        <footer className="portal-footer shop-home-staff-footer">
          <Link className="portal-staff-link" href="/login">
            <svg className="portal-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0M18 5l2 2 3-3" />
            </svg>
            店家登入
          </Link>
          {footerError || footerText ? (
            <span className="shop-home-footer shop-home-footer-text" role={footerError ? 'status' : undefined}>
              {footerError || footerText}
            </span>
          ) : null}
        </footer>
      </div>
    </main>
  );
}
