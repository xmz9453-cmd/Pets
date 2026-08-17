import { useEffect, useState } from 'react';
import { getApplicationHealth, getDatabaseHealth } from '../api/client';

export default function Home() {
  const [applicationHealth, setApplicationHealth] = useState(null);
  const [databaseHealth, setDatabaseHealth] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadHealth() {
      try {
        const [application, database] = await Promise.all([
          getApplicationHealth(),
          getDatabaseHealth(),
        ]);

        if (!active) {
          return;
        }

        setApplicationHealth(application);
        setDatabaseHealth(database);
      } catch (healthError) {
        if (active) {
          setError(healthError.message);
        }
      }
    }

    loadHealth();

    return () => {
      active = false;
    };
  }, []);

  const applicationStatus = applicationHealth ? applicationHealth.status : 'checking';
  const databaseStatus = databaseHealth ? databaseHealth.database : 'checking';

  return (
    <main className="foundation-shell">
      <nav className="navbar navbar-expand navbar-dark bg-dark">
        <div className="container-fluid">
          <span className="navbar-brand mb-0 h1">PSOP MVP</span>
          <span className="navbar-text">Engineering Foundation</span>
        </div>
      </nav>

      <section className="container py-4">
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <div className="foundation-panel">
              <div className="foundation-label">Application</div>
              <div className="foundation-status">{applicationStatus}</div>
            </div>
          </div>
          <div className="col-12 col-md-6">
            <div className="foundation-panel">
              <div className="foundation-label">Database</div>
              <div className="foundation-status">{databaseStatus}</div>
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
