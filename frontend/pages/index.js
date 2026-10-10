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
    <main className="dashboard-page">
      <header className="page-heading">
        <div>
          <p className="page-eyebrow">{shopName}</p>
          <h1 className="page-title-with-icon">
            <svg className="page-title-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M3 3h8v8H3z M13 3h8v5h-8z M13 10h8v11h-8z M3 13h8v8H3z" />
            </svg>
            今日總覽
          </h1>
          <p className="page-heading-description">查看工作室服務狀態與目前登入資訊。</p>
        </div>
      </header>

      <section className="dashboard-grid" aria-label="系統摘要">
        <article className="dashboard-card">
          <div className="dashboard-card-heading">
            <svg className="dashboard-card-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M4 4h7v7H4z M13 4h7v7h-7z M13 13h7v7h-7z M4 13h7v7H4z" />
            </svg>
            <div className="dashboard-card-label">系統服務</div>
          </div>
          <div className={`dashboard-status${applicationHealth?.status === 'ok' ? ' status-success' : ''}`}>
            {applicationStatus}
          </div>
          <p className="dashboard-card-note">應用程式目前的運作狀態</p>
        </article>
        <article className="dashboard-card">
          <div className="dashboard-card-heading">
            <svg className="dashboard-card-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3Z M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6 M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
            </svg>
            <div className="dashboard-card-label">資料庫連線</div>
          </div>
          <div className={`dashboard-status${databaseHealth?.database === 'connected' ? ' status-success' : ''}`}>
            {databaseStatus}
          </div>
          <p className="dashboard-card-note">資料服務連線狀態</p>
        </article>
        <article className="dashboard-card dashboard-card-staff">
          <div className="dashboard-card-heading">
            <svg className="dashboard-card-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M20 21a8 8 0 0 0-16 0 M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
            </svg>
            <div className="dashboard-card-label">已登入員工</div>
          </div>
          <div className="dashboard-status">{staff ? staff.username : '檢查中'}</div>
          <p className="dashboard-card-note">{roleText}</p>
        </article>
      </section>

      {error ? <div className="alert alert-warning mt-4" role="alert">{error}</div> : null}
    </main>
  );
}
