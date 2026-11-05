import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <main className="login-shell">
      <section className="login-panel">
        <h1>忘記密碼？</h1>
        <p>請聯絡系統管理者，由系統管理者協助重設密碼。</p>
        <Link className="btn btn-dark w-100" href="/login">返回登入</Link>
      </section>
    </main>
  );
}