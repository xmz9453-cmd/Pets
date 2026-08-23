import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createProduct, disableProduct, enableProduct, getCurrentStaff, getProducts, updateProduct } from '../api/client';

const emptyForm = { name: '', price: '' };

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [staff, setStaff] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadProducts() {
    try {
      setLoading(true);
      const result = await getProducts();
      setProducts(result.products || []);
      setError('');
    } catch (loadError) {
      setError('商品資料載入失敗');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getCurrentStaff()
      .then((result) => {
        setStaff(result.staff);
        return loadProducts();
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  function resetForm() {
    setFormData(emptyForm);
    setEditingId(null);
  }

  function startEdit(product) {
    setEditingId(product.id);
    setFormData({ name: product.name, price: product.price.toFixed(2) });
    setError('');
    setSuccess('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const name = formData.name.trim();
    const price = Number(formData.price);
    if (!name) {
      setError('請輸入商品名稱');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError('售價必須大於 0');
      return;
    }
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      if (editingId) {
        await updateProduct(editingId, { name, price });
        setSuccess('商品已更新');
      } else {
        await createProduct({ name, price });
        setSuccess('商品已新增');
      }
      resetForm();
      await loadProducts();
    } catch (submitError) {
      setError('商品儲存失敗，請確認資料後再試');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(product) {
    const enabling = product.status !== 'ACTIVE';
    if (!enabling && !window.confirm(`確定要停用「${product.name}」嗎？`)) return;
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      if (enabling) {
        await enableProduct(product.id);
        setSuccess('商品已啟用');
      } else {
        await disableProduct(product.id);
        setSuccess('商品已停用');
      }
      await loadProducts();
    } catch (statusError) {
      setError('商品狀態更新失敗');
    } finally {
      setSaving(false);
    }
  }

  const canManage = staff && staff.roles && staff.roles.includes('OWNER');

  return (
    <main className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div><h1 className="mb-1">商品管理</h1><p className="text-muted mb-0">管理店家可銷售的商品資料。</p></div>
        <button type="button" className="btn btn-outline-dark" onClick={() => router.push('/')}>返回首頁</button>
      </div>
      {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
      {success ? <div className="alert alert-success" role="alert">{success}</div> : null}
      <div className="row g-4">
        {canManage ? <div className="col-lg-4"><div className="foundation-panel"><h2 className="h5 mb-3">{editingId ? '編輯商品' : '新增商品'}</h2><form onSubmit={handleSubmit}><label className="form-label" htmlFor="product-name">商品名稱</label><input id="product-name" className="form-control mb-3" maxLength="100" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} required /><label className="form-label" htmlFor="product-price">售價</label><input id="product-price" className="form-control mb-3" type="number" min="0.01" step="0.01" value={formData.price} onChange={(event) => setFormData({ ...formData, price: event.target.value })} required /><div className="d-flex gap-2"><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '儲存中...' : '儲存'}</button>{editingId ? <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>取消</button> : null}</div></form></div></div> : null}
        <div className={canManage ? 'col-lg-8' : 'col-12'}><div className="foundation-panel"><h2 className="h5 mb-3">商品列表</h2>{loading ? <p className="text-muted mb-0">商品載入中...</p> : products.length === 0 ? <div className="alert alert-light border mb-0">目前沒有商品</div> : <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>商品名稱</th><th>售價</th><th>狀態</th><th>操作</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td>{product.name}</td><td>{product.price.toFixed(2)}</td><td><span className={`badge ${product.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>{product.status === 'ACTIVE' ? '啟用中' : '已停用'}</span></td><td>{canManage ? <div className="btn-group btn-group-sm"><button type="button" className="btn btn-outline-primary" onClick={() => startEdit(product)}>編輯</button><button type="button" className={product.status === 'ACTIVE' ? 'btn btn-outline-danger' : 'btn btn-outline-success'} disabled={saving} onClick={() => changeStatus(product)}>{product.status === 'ACTIVE' ? '停用' : '啟用'}</button></div> : <span className="text-muted">僅可查看</span>}</td></tr>)}</tbody></table></div>}</div></div>
      </div>
    </main>
  );
}
