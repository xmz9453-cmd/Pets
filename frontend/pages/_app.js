import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/globals.css';
import { getCurrentStaff, logout } from '../api/client';

const NAV_ITEMS = [
  { href: '/customers', label: '客戶', icon: 'user', allowedRoles: ['OWNER', 'FRONT_DESK', 'GROOMER'] },
  { href: '/pets', label: '寵物', icon: 'paw', allowedRoles: ['OWNER', 'FRONT_DESK', 'GROOMER'] },
  { href: '/services', label: '服務', icon: 'scissors', allowedRoles: ['OWNER', 'FRONT_DESK', 'GROOMER'] },
  { href: '/products', label: '商品', icon: 'box', allowedRoles: ['OWNER', 'FRONT_DESK', 'GROOMER'] },
  { href: '/appointments', label: '預約', icon: 'calendar', allowedRoles: ['OWNER', 'FRONT_DESK', 'GROOMER'] },
  { href: '/calendar', label: '行事曆', icon: 'calendar', allowedRoles: ['OWNER', 'FRONT_DESK', 'GROOMER'] },
  { href: '/operations', label: '日常營運', icon: 'list', allowedRoles: ['OWNER', 'FRONT_DESK', 'GROOMER'] },
  { href: '/orders', label: '訂單', icon: 'receipt', allowedRoles: ['OWNER', 'FRONT_DESK', 'GROOMER'] },
  { href: '/reports', label: '報表', icon: 'chart', allowedRoles: ['OWNER', 'FRONT_DESK', 'GROOMER'] },
];

const ICON_PATHS = {
  user: 'M20 21a8 8 0 0 0-16 0 M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  paw: 'M8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M16 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M5 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M19 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M12 21c-2.5 0-5-1.2-5-3.2 0-1.5 2.3-4.3 5-4.3s5 2.8 5 4.3c0 2-2.5 3.2-5 3.2Z',
  scissors: 'M6 6a2.5 2.5 0 1 0 0 .01 M6 18a2.5 2.5 0 1 0 0 .01 M8 8l12 12 M8 16l5-5 M15 9l5-5',
  box: 'm12 3 9 5-9 5-9-5 9-5Z M3 8v9l9 5 9-5V8 M12 13v9',
  calendar: 'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v13H3V6a2 2 0 0 1 2-2Z',
  list: 'M9 6h11 M9 12h11 M9 18h11 M4 6h.01 M4 12h.01 M4 18h.01',
  receipt: 'M4 3h16v18l-3-2-3 2-3-2-3 2-4-2V3Z M8 8h8 M8 12h8 M8 16h4',
  chart: 'M4 19V5 M4 19h17 M8 15l4-4 3 2 5-6',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.5 2.6-.2-.1a1.7 1.7 0 0 0-1.9.3l-.1.1h-3l-.1-.2a1.7 1.7 0 0 0-1.5-1l-.2.1-2.6-1.5.1-.2a1.7 1.7 0 0 0-.3-1.9l-.1-.1v-3l.2-.1a1.7 1.7 0 0 0 1-1.5l-.1-.2 1.5-2.6.2.1a1.7 1.7 0 0 0 1.9-.3l.1-.1h3l.1.2a1.7 1.7 0 0 0 1.5 1l.2-.1 2.6 1.5-.1.2a1.7 1.7 0 0 0 .3 1.9l.1.1v3l-.2.1Z',
};

function AppIcon({ name }) {
  return (
    <svg className="app-nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

function AppShell({ Component, pageProps }) {
  const router = useRouter();
  const [staff, setStaff] = useState(null);
  const [shops, setShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [shopName, setShopName] = useState('店家');
  const [error, setError] = useState('');

  const shouldShowNav = !['/login', '/register', '/forgot-password', '/onboarding/[token]', '/booking'].includes(router.pathname);
  const visibleNavItems = NAV_ITEMS.filter((item) =>
    staff && Array.isArray(staff.roles)
      ? item.allowedRoles.some((role) => staff.roles.includes(role))
      : false,
  );

  useEffect(() => {
    if (!shouldShowNav) {
      setStaff(null);
      return undefined;
    }

    let active = true;

    async function loadSession() {
      try {
        const currentStaff = await getCurrentStaff();
        if (!active) {
          return;
        }

        setStaff(currentStaff.staff);
        const availableShops = currentStaff.staff.shops || [];
        setShops(availableShops);
        setSelectedShopId(String(currentStaff.staff.shop_id || ''));
        setShopName(availableShops.find((shop) => Number(shop.id) === Number(currentStaff.staff.shop_id))?.name || '店家');
      } catch (sessionError) {
        setStaff(null);
      }
    }

    loadSession();
    return () => {
      active = false;
    };
  }, [router.pathname, shouldShowNav]);

  async function handleLogout() {
    try {
      await logout();
      router.replace('/login');
    } catch (logoutError) {
      setError(logoutError.message || '登出失敗');
    }
  }

  function handleShopChange(event) {
    const nextShopId = event.target.value;
    window.localStorage.setItem('psop.currentShopId', nextShopId);
    setSelectedShopId(nextShopId);
    window.location.reload();
  }

  return (
    <>
      {shouldShowNav ? (
        <div className="app-shell">
          <aside className="app-sidebar">
            <div className="app-sidebar-brand">{shopName}</div>
            {staff?.is_platform_shop_manager && shops.length > 1 ? (
              <div className="px-3 pb-3">
                <label className="form-label small mb-1" htmlFor="current-shop">目前店家</label>
                <select id="current-shop" className="form-select form-select-sm" value={selectedShopId} onChange={handleShopChange}>
                  {shops.map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}
                </select>
              </div>
            ) : null}
            <nav className="app-sidebar-nav" aria-label="主要導覽">
              {visibleNavItems.map((item) => {
                const isActive = router.pathname === item.href || router.pathname.startsWith(`${item.href}/`);
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`app-nav-link${isActive ? ' active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <AppIcon name={item.icon} />
                    {item.label}
                  </a>
                );
              })}
              {staff && staff.roles.includes('OWNER') ? (
                <a
                  href="/settings"
                  className={`app-nav-link${router.pathname === '/settings' ? ' active' : ''}`}
                  aria-current={router.pathname === '/settings' ? 'page' : undefined}
                >
                  <AppIcon name="settings" />
                  店家設定
                </a>
              ) : null}
              {staff?.is_platform_shop_manager ? (
                <a href="/shops" className={`app-nav-link${router.pathname === '/shops' ? ' active' : ''}`} aria-current={router.pathname === '/shops' ? 'page' : undefined}>
                  <AppIcon name="settings" />
                  多店管理
                </a>
              ) : null}
              {staff?.is_platform_shop_manager ? (
                <a href="/system-maintenance" className={`app-nav-link${router.pathname === '/system-maintenance' ? ' active' : ''}`} aria-current={router.pathname === '/system-maintenance' ? 'page' : undefined}>
                  <AppIcon name="settings" />
                  系統管理
                </a>
              ) : null}
            </nav>
            <div className="app-sidebar-footer">
              <span className="app-sidebar-user">{staff ? staff.display_name : '驗證中'}</span>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleLogout}>登出</button>
            </div>
          </aside>
          <div className="app-main">
            {error ? (
              <div className="alert alert-warning" role="alert">{error}</div>
            ) : null}
            <Component {...pageProps} />
          </div>
        </div>
      ) : null}
      {!shouldShowNav ? (
        <>
          {error ? (
            <div className="container mt-3">
              <div className="alert alert-warning mb-0" role="alert">{error}</div>
            </div>
          ) : null}
          <Component {...pageProps} />
        </>
      ) : null}
    </>
  );
}

export default function App(props) {
  return <AppShell {...props} />;
}
