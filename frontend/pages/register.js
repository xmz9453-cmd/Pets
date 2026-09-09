import { useState } from 'react';
import { useRouter } from 'next/router';
import { register } from '../api/client';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', displayName: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const username = form.username.trim();
    const displayName = form.displayName.trim();
    if (!username || !displayName || !form.password) {
      setError('請完整填寫帳號、顯示名稱與密碼。');
      return;
    }
    if (form.password.length < 8) {
      setError('密碼至少需要 8 個字元。');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('兩次輸入的密碼不一致。');
      return;
    }

    setSubmitting(true);
    try {
      const result = await register(username, form.password, displayName);
      const isOwner = result.staff.roles.includes('OWNER');
      router.replace(isOwner ? '/login?registered=owner' : '/login?registered=pending');
    } catch (registerError) {
      setError(registerError.message || '註冊失敗。');
      setSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <h1>註冊帳號</h1>
        <p className="text-muted">建立自己的帳號，註冊後即可登入。</p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label className="form-label" htmlFor="username">使用者名稱</label>
            <input id="username" className="form-control" value={form.username} onChange={(event) => updateField('username', event.target.value)} autoComplete="username" />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="display-name">顯示名稱</label>
            <input id="display-name" className="form-control" value={form.displayName} onChange={(event) => updateField('displayName', event.target.value)} autoComplete="name" />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="password">密碼</label>
            <input id="password" className="form-control" type="password" value={form.password} onChange={(event) => updateField('password', event.target.value)} autoComplete="new-password" />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="confirm-password">確認密碼</label>
            <input id="confirm-password" className="form-control" type="password" value={form.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} autoComplete="new-password" />
          </div>
          <button className="btn btn-dark w-100" type="submit" disabled={submitting}>{submitting ? '註冊中...' : '註冊'}</button>
          <a className="btn btn-link w-100 mt-2" href="/login">返回登入</a>
          {error ? <div className="alert alert-warning mt-3" role="alert">{error}</div> : null}
        </form>
      </section>
    </main>
  );
}