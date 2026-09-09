import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getCurrentStaff, login } from '../api/client';
import { formatLoginError, validateLoginForm } from '../utils/login-form';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
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

  function handleFieldChange(setter, fieldName, value) {
    setter(value);
    setErrors((currentErrors) => ({
      ...currentErrors,
      [fieldName]: undefined,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validation = validateLoginForm({ username, password });

    setErrors(validation.errors);
    if (!validation.ok) {
      setError('');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await login(validation.values.username, validation.values.password);
      router.replace('/');
    } catch (loginError) {
      setError(formatLoginError(loginError.message));
      setSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <h1>登入</h1>
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label className="form-label" htmlFor="username">使用者名稱</label>
            <input
              id="username"
              className={`form-control${errors.username ? ' is-invalid' : ''}`}
              type="text"
              value={username}
              onChange={(event) => handleFieldChange(setUsername, 'username', event.target.value)}
              autoComplete="username"
              placeholder="請輸入使用者名稱"
              aria-invalid={Boolean(errors.username)}
            />
            {errors.username ? <div className="invalid-feedback d-block">{errors.username}</div> : null}
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="password">密碼</label>
            <input
              id="password"
              className={`form-control${errors.password ? ' is-invalid' : ''}`}
              type="password"
              value={password}
              onChange={(event) => handleFieldChange(setPassword, 'password', event.target.value)}
              autoComplete="current-password"
              placeholder="請輸入密碼"
              aria-invalid={Boolean(errors.password)}
            />
            {errors.password ? <div className="invalid-feedback d-block">{errors.password}</div> : null}
          </div>
          <button className="btn btn-dark w-100" type="submit" disabled={submitting}>
            {submitting ? '登入中...' : '登入'}
          </button>
          <a className="btn btn-link w-100 mt-2" href="/register">註冊新帳號</a>
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
