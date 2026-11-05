import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function SystemMaintenancePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/shops');
  }, [router]);

  return <main className="container py-4"><div className="alert alert-light border">正在前往系統管理…</div></main>;
}
