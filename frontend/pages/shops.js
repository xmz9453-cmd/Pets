import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createShop, getCurrentStaff, getShopStaff, updateShopStaffRoles } from '../api/client';

const ROLE_LABELS = {
  FRONT_DESK: '櫃檯人員',
  GROOMER: '美容師',
  OWNER: '店家管理者',
};

export default function ShopsPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [shops, setShops] = useState([]);
  const [staffAccounts, setStaffAccounts] = useState([]);
  const [updatingStaffId, setUpdatingStaffId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentStaff().then(({ staff }) => {
      if (!active) return;
      if (!staff.is_platform_shop_manager) {
        router.replace('/');
        return;
      }
      setShops(staff.shops || []);
      return getShopStaff();
    }).then((result) => {
      if (active && result) setStaffAccounts(result.staff || []);
    }).catch(() => router.replace('/login'));
    return () => { active = false; };
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { shop } = await createShop({ name, slug });
      window.localStorage.setItem('psop.currentShopId', String(shop.id));
      window.location.assign('/');
    } catch (createError) {
      setError(createError.message || '無法建立店家。');
      setSaving(false);
    }
  }

  async function changeRoles(account, role, checked) {
    const roles = checked
      ? [...new Set([...account.roles, role])]
      : account.roles.filter((item) => item !== role);
    setUpdatingStaffId(account.id);
    setError('');
    try {
      const { staff: updated } = await updateShopStaffRoles(account.id, roles);
      setStaffAccounts((current) => current.map((item) => (item.id === account.id ? { ...item, ...updated, is_member: true } : item)));
    } catch (updateError) {
      setError(updateError.message || '無法更新員工權限。');
    } finally {
      setUpdatingStaffId(null);
    }
  }

  return (
    <main className="container-fluid p-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">多店管理</h1>
          <p className="text-muted mb-0">各店的客戶、寵物、服務及營運資料皆分開管理。</p>
        </div>
      </div>
      {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
      <section className="card shadow-sm mb-4">
        <div className="card-body">
          <h2 className="h5">新增店家</h2>
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-md-5">
              <label htmlFor="shop-name" className="form-label">店家名稱</label>
              <input id="shop-name" className="form-control" value={name} onChange={(event) => setName(event.target.value)} maxLength={200} required />
            </div>
            <div className="col-md-5">
              <label htmlFor="shop-slug" className="form-label">店家代碼</label>
              <input id="shop-slug" className="form-control" value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase())} pattern="[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?" maxLength={80} required />
              <div className="form-text">僅使用小寫英文字母、數字及連字號。</div>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-primary w-100" type="submit" disabled={saving}>{saving ? '建立中…' : '建立'}</button>
            </div>
          </form>
        </div>
      </section>
      <section className="card shadow-sm">
        <div className="card-body">
          <h2 className="h5">可使用店家</h2>
          {shops.length ? (
            <ul className="list-group list-group-flush">
              {shops.map((shop) => <li className="list-group-item d-flex justify-content-between" key={shop.id}><span>{shop.name}</span><code>{shop.slug}</code></li>)}
            </ul>
          ) : <p className="text-muted mb-0">正在載入店家…</p>}
        </div>
      </section>
      <section className="card shadow-sm mt-4">
        <div className="card-body">
          <h2 className="h5">目前店家的員工權限</h2>
          <p className="text-muted">請先從左側切換店家，再設定該店家的員工角色。</p>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead><tr><th>帳號</th><th>姓名</th><th>店家角色</th></tr></thead>
              <tbody>
                {staffAccounts.map((account) => (
                  <tr key={account.id}>
                    <td>{account.username}</td>
                    <td>{account.display_name}</td>
                    <td>
                      {['FRONT_DESK', 'GROOMER', 'OWNER'].map((role) => (
                        <label className="form-check form-check-inline" key={role}>
                          <input className="form-check-input" type="checkbox" checked={account.roles.includes(role)} disabled={updatingStaffId === account.id} onChange={(event) => changeRoles(account, role, event.target.checked)} />
                          <span className="form-check-label">{ROLE_LABELS[role]}</span>
                        </label>
                      ))}
                      {!account.is_member ? <span className="small text-muted ms-2">尚未加入此店家</span> : null}
                    </td>
                  </tr>
                ))}
                {!staffAccounts.length ? <tr><td colSpan="3" className="text-muted">正在載入帳號…</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
