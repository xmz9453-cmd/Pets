import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/globals.css';
import { getCurrentStaff, getShopIdentity, logout } from '../api/client';

const NAV_ITEMS = [
  { href: '/customers', label: '客戶', allowedRoles: ['OWNER', 'FRONT_DESK', 'GROOMER'] },
  { href: '/pets', label: '寵物', allowedRoles: ['OWNER', 'FRONT_DESK', 'GROOMER'] },
  { href: '/services', label: '服務', allowedRoles: ['OWNER', 'FRONT_DESK', 'GROOMER'] },
  { href: '/products', label: '商品', allowedRoles: ['OWNER', 'FRONT_DESK', 'GROOMER'] },
  { href: '/appointments', label: '預約', allowedRoles: ['OWNER', 'FRONT_DESK', 'GROOMER'] },
  { href: '/calendar', label: '行事曆', allowedRoles: ['OWNER', 'FRONT_DESK', 'GROOMER'] },
  { href: '/operations', label: '日常營運', allowedRoles: ['OWNER', 'FRONT_DESK', 'GROOMER'] },
  { href: '/orders', label: '訂單', allowedRoles: ['OWNER', 'FRONT_DESK', 'GROOMER'] },
  { href: '/reports', label: '報表', allowedRoles: ['OWNER', 'FRONT_DESK', 'GROOMER'] },
];

function AppShell({ Component, pageProps }) {
  const router = useRouter();
  const [staff, setStaff] = useState(null);
  const [shopName, setShopName] = useState('店家');
  const [error, setError] = useState('');

  const shouldShowNav = !['/login', '/register', '/forgot-password'].includes(router.pathname);
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

        const settings = currentStaff.staff.roles.includes('OWNER')
          ? await getShopIdentity()
          : await getShopIdentity();
        setStaff(currentStaff.staff);
        setShopName(settings?.shop?.name || '店家');
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

  return (
    <>
      {shouldShowNav ? (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top shadow-sm">
          <div className="container-fluid px-3 px-lg-4">
            <span className="navbar-brand mb-0 h4 me-3">{shopName}</span>
            <div className="d-flex flex-wrap align-items-center gap-2 ms-auto">
              {staff && staff.roles.includes('OWNER') ? (
                <a href="/settings" className="btn btn-outline-light btn-sm">店家設定</a>
              ) : null}
              {visibleNavItems.map((item) => (
                <a key={item.href} href={item.href} className="btn btn-outline-light btn-sm">
                  {item.label}
                </a>
              ))}
              <span className="navbar-text text-light small">{staff ? staff.display_name : '驗證中'}</span>
              <button type="button" className="btn btn-outline-light btn-sm" onClick={handleLogout}>登出</button>
            </div>
          </div>
        </nav>
      ) : null}
      {error ? (
        <div className="container mt-3">
          <div className="alert alert-warning mb-0" role="alert">{error}</div>
        </div>
      ) : null}
      <Component {...pageProps} />
    </>
  );
}

export default function App(props) {
  return <AppShell {...props} />;
}
