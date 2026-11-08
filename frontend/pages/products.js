import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  API_BASE_URL,
  createProduct,
  deleteProduct,
  disableProduct,
  enableProduct,
  getCurrentStaff,
  getProducts,
  removeProductImage,
  updateProduct,
  uploadProductImage,
} from '../api/client';

const emptyForm = { name: '', price: '', unit: '件', stock_quantity: '0', is_sellable: true };

function formatMoney(value) {
  return Number(value).toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [staff, setStaff] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [existingImageUrl, setExistingImageUrl] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('');
      return undefined;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

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
    setImageFile(null);
    setExistingImageUrl('');
    setRemoveExistingImage(false);
  }

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }));
    setError('');
  }

  function startEdit(product) {
    setEditingId(product.id);
    setImageFile(null);
    setExistingImageUrl(product.image_url || '');
    setRemoveExistingImage(false);
    setFormData({ name: product.name, price: product.is_sellable ? String(Math.round(product.price)) : '', unit: product.unit || '件', stock_quantity: String(product.stock_quantity ?? 0), is_sellable: Boolean(product.is_sellable) });
    setError('');
    setSuccess('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const name = formData.name.trim();
    const price = formData.is_sellable ? Number(formData.price) : 0;
    const stockQuantity = Number(formData.stock_quantity);
    if (!name) {
      setError('請輸入商品名稱');
      return;
    }
    if (formData.is_sellable && (!Number.isInteger(price) || price <= 0)) {
      setError('售價必須大於 0');
      return;
    }
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      setError('庫存數量必須是 0 或正整數');
      return;
    }
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      let productId = editingId;
      if (editingId) {
        await updateProduct(editingId, { name, price, unit: formData.unit.trim(), stock_quantity: stockQuantity, is_sellable: formData.is_sellable });
        setSuccess('商品已更新');
      } else {
        const result = await createProduct({ name, price, unit: formData.unit.trim(), stock_quantity: stockQuantity, is_sellable: formData.is_sellable });
        productId = result.product.id;
        setEditingId(productId);
        setSuccess('商品已新增');
      }
      if (imageFile) {
        await uploadProductImage(productId, imageFile);
        setSuccess('商品與主圖已儲存');
      } else if (editingId && removeExistingImage) {
        await removeProductImage(productId);
        setSuccess('商品圖片已移除');
      }
      resetForm();
      await loadProducts();
    } catch (submitError) {
      setError(submitError.message || '商品儲存失敗，請確認資料後再試');
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

  async function removeProduct(product) {
    if (!window.confirm(`確定永久刪除商品「${product.name}」嗎？若商品已有訂單或預約紀錄，系統將保留商品並拒絕刪除。`)) return;
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await deleteProduct(product.id);
      if (editingId === product.id) resetForm();
      setSuccess('商品已刪除');
      await loadProducts();
    } catch (deleteError) {
      setError(deleteError.message || '商品刪除失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  }

  const canManage = staff && staff.roles && staff.roles.includes('OWNER');

  return (
    <main className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div><h1 className="mb-1">商品管理</h1><p className="text-muted mb-0">管理店家可銷售的商品資料。</p></div>
      </div>
      {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
      {success ? <div className="alert alert-success" role="alert">{success}</div> : null}
      <div className="row g-4">
        {canManage ? (
          <div className="col-lg-4">
            <div className="foundation-panel">
              <h2 className="h5 mb-3">{editingId ? '編輯商品' : '新增商品'}</h2>
              <form onSubmit={handleSubmit}>
                <label className="form-label" htmlFor="product-name">商品名稱</label>
                <input id="product-name" className="form-control mb-3" maxLength="100" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} required />
                <div className="form-check mb-3">
                  <input id="product-sellable" className="form-check-input" type="checkbox" checked={formData.is_sellable} onChange={(event) => updateField('is_sellable', event.target.checked)} />
                  <label className="form-check-label" htmlFor="product-sellable">可加入訂單銷售</label>
                </div>
                {formData.is_sellable ? (
                  <>
                    <label className="form-label" htmlFor="product-price">售價</label>
                    <input id="product-price" className="form-control mb-3" type="number" min="1" step="1" value={formData.price} onChange={(event) => setFormData({ ...formData, price: event.target.value })} required />
                  </>
                ) : <p className="form-text">此品項只管理庫存，不會出現在訂單或線上加購。</p>}
                <label className="form-label" htmlFor="product-unit">計量單位</label>
                <input id="product-unit" className="form-control mb-3" maxLength="20" value={formData.unit} onChange={(event) => updateField('unit', event.target.value)} required />
                <label className="form-label" htmlFor="product-stock">庫存數量</label>
                <input id="product-stock" className="form-control mb-3" type="number" min="0" step="1" value={formData.stock_quantity} onChange={(event) => setFormData({ ...formData, stock_quantity: event.target.value })} required />
                <label className="form-label" htmlFor="product-image">商品主圖</label>
                <input
                  id="product-image"
                  className="form-control"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    if (file && file.size > 2 * 1024 * 1024) {
                      setError('商品圖片不可超過 2 MiB。');
                      event.target.value = '';
                      return;
                    }
                    setImageFile(file);
                    setRemoveExistingImage(false);
                    setError('');
                  }}
                  disabled={saving}
                />
                <small className="form-text d-block mb-2">支援 JPG、PNG、WebP，單張上限 2 MiB。</small>
                {(imagePreview || (existingImageUrl && !removeExistingImage)) ? (
                  <div className="mb-3">
                    <img src={imagePreview || `${API_BASE_URL}${existingImageUrl}`} alt="商品主圖預覽" className="img-thumbnail" style={{ maxWidth: '180px', maxHeight: '140px', objectFit: 'cover' }} />
                    {editingId && !imageFile ? (
                      <button type="button" className="btn btn-sm btn-outline-danger d-block mt-2" onClick={() => setRemoveExistingImage(true)}>移除主圖</button>
                    ) : null}
                  </div>
                ) : null}
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '儲存中...' : '儲存'}</button>
                  {editingId ? <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>取消</button> : null}
                </div>
              </form>
            </div>
          </div>
        ) : null}
          <div className={canManage ? 'col-lg-8' : 'col-12'}>
            <div className="foundation-panel">
              <h2 className="h5 mb-3">商品列表</h2>
              {loading ? <p className="text-muted mb-0">商品載入中...</p> : products.length === 0 ? <div className="alert alert-light border mb-0">目前沒有商品</div> : (
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead><tr><th>主圖</th><th>商品名稱</th><th>售價</th><th>庫存</th><th>狀態</th><th>操作</th></tr></thead>
                    <tbody>{products.map((product) => (
                      <tr key={product.id}>
                        <td>{product.image_url ? <img src={`${API_BASE_URL}${product.image_url}`} alt={`${product.name}主圖`} loading="lazy" style={{ width: '64px', height: '64px', objectFit: 'cover' }} className="rounded border" /> : <span className="text-muted small">無圖片</span>}</td>
                        <td>{product.name}<small className="d-block text-muted">{product.unit || '件'} / {product.is_sellable ? '可銷售' : '僅管理庫存'}</small></td>
                        <td>{product.is_sellable ? formatMoney(product.price) : '—'}</td>
                        <td>{product.stock_quantity ?? 0}</td>
                        <td><span className={`badge ${product.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>{product.status === 'ACTIVE' ? '啟用中' : '已停用'}</span></td>
                        <td>{canManage ? <div className="btn-group btn-group-sm"><button type="button" className="btn btn-outline-primary" onClick={() => startEdit(product)}>編輯</button><button type="button" className={product.status === 'ACTIVE' ? 'btn btn-outline-danger' : 'btn btn-outline-success'} disabled={saving} onClick={() => changeStatus(product)}>{product.status === 'ACTIVE' ? '停用' : '啟用'}</button><button type="button" className="btn btn-outline-danger" disabled={saving} onClick={() => removeProduct(product)}>刪除</button></div> : <span className="text-muted">僅可查看</span>}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
      </div>
    </main>
  );
}
