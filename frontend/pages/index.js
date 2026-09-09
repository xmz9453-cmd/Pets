import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getApplicationHealth, getCurrentStaff, getDatabaseHealth, getShopSettings, logout } from '../api/client';
import { getRoleLabel } from '../utils/staff-display';

export default function Home() {
  const router = useRouter();
  const [applicationHealth, setApplicationHealth] = useState(null);
  const [databaseHealth, setDatabaseHealth] = useState(null);
  const [staff, setStaff] = useState(null);
  const [shopName, setShopName] = useState('店家');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadHealth() {
      try {
        const [currentStaff, application, database, settings] = await Promise.all([
          getCurrentStaff(),
          getApplicationHealth(),
          getDatabaseHealth(),
          getShopSettings(),
        ]);

        if (!active) {
          return;
        }

        setStaff(currentStaff.staff);
        setApplicationHealth(application);
        setDatabaseHealth(database);
        setShopName(settings.shop?.name || '店家');
      } catch (healthError) {
        if (active) {
          router.replace('/login');
        }
      }
    }

    loadHealth();

    return () => {
      active = false;
    };
  }, [router]);

  const displayHealthStatus = (value) => ({
    checking: '檢查中',
    ok: '正常',
    connected: '已連線',
  }[value] || value);
  const applicationStatus = displayHealthStatus(applicationHealth ? applicationHealth.status : 'checking');
  const databaseStatus = displayHealthStatus(databaseHealth ? databaseHealth.database : 'checking');
  const roleText = staff && staff.roles.length
    ? staff.roles.map((role) => getRoleLabel(role)).join(', ')
    : '檢查中';

  async function handleLogout() {
    try {
      await logout();
      router.replace('/login');
    } catch (logoutError) {
      setError(logoutError.message);
    }
  }

  return (
    <main className="foundation-shell">
      <nav className="navbar navbar-expand navbar-dark bg-dark">
        <div className="container-fluid">
          <span className="navbar-brand mb-0 h1">{shopName}</span>
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <a href="/settings" className="btn btn-outline-light btn-sm">店家設定</a>
            <a href="/customers" className="btn btn-outline-light btn-sm">客戶</a>
            <a href="/pets" className="btn btn-outline-light btn-sm">寵物</a>
            <a href="/services" className="btn btn-outline-light btn-sm">服務</a>
            <a href="/products" className="btn btn-outline-light btn-sm">商品</a>
            <a href="/appointments" className="btn btn-outline-light btn-sm">預約</a>
            <a href="/operations" className="btn btn-outline-light btn-sm">日常營運</a>
            <a href="/orders" className="btn btn-outline-light btn-sm">訂單</a>
            <a href="/reports" className="btn btn-outline-light btn-sm">報表</a>
            <span className="navbar-text">{staff ? staff.display_name : '驗證狀態'}</span>
            <button type="button" className="btn btn-outline-light btn-sm" onClick={handleLogout}>
              登出
            </button>
          </div>
        </div>
      </nav>

      <section className="container py-4">
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <div className="foundation-panel">
              <div className="foundation-label">系統</div>
              <div className="foundation-status">{applicationStatus}</div>
            </div>
          </div>
          <div className="col-12 col-md-6">
            <div className="foundation-panel">
              <div className="foundation-label">資料庫</div>
              <div className="foundation-status">{databaseStatus}</div>
            </div>
          </div>
          <div className="col-12">
            <div className="foundation-panel">
              <div className="foundation-label">已登入員工</div>
              <div className="foundation-status">{staff ? staff.username : '檢查中'}</div>
              <div className="foundation-meta">{roleText}</div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="alert alert-warning mt-3" role="alert">
            {error}
          </div>
        ) : null}
      </section>
    </main>
  );
}
