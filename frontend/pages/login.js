import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getCurrentStaff, login } from '../api/client';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function redirectAuthenticatedStaff() {
      try {
        await getCurrentStaff();
        if (active) {
          router.replace('/');
        }
      } catch (sessionError) {
        // No valid session: keep the login page available without surfacing a client error.
      }
    }

    redirectAuthenticatedStaff();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await login(username, password);
      router.replace('/');
    } catch (loginError) {
      setError(loginError.message);
      setSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <h1>PSOP MVP</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label" htmlFor="username">使用者名稱</label>
            <input
              id="username"
              className="form-control"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="password">密碼</label>
            <input
              id="password"
              className="form-control"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button className="btn btn-dark w-100" type="submit" disabled={submitting}>
            {submitting ? '登入中' : '登入'}
          </button>
          {error ? (
            <div className="alert alert-warning mt-3" role="alert">
              {error}
            </div>
          ) : null}
        </form>
      </section>
    </main>
  );
}
