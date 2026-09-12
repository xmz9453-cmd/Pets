import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getApplicationHealth, getCurrentStaff, getDatabaseHealth, getShopIdentity, getShopSettings, logout } from '../api/client';
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
        const currentStaff = await getCurrentStaff();
        const [application, database, settings] = await Promise.all([
          getApplicationHealth(),
          getDatabaseHealth(),
          currentStaff.staff.roles.includes('OWNER') ? getShopSettings() : getShopIdentity(),
        ]);

        if (!active) {
          return;
        }

        setStaff(currentStaff.staff);
        setApplicationHealth(application);
        setDatabaseHealth(database);
        setShopName(settings?.shop?.name || '店家');
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
