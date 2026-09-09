import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <main className="login-shell">
      <section className="login-panel">
        <h1>忘記密碼？</h1>
        <p>請聯絡管理者，由管理者在「帳號與角色」中重設密碼。</p>
        <Link className="btn btn-dark w-100" href="/login">返回登入</Link>
      </section>
    </main>
  );
}