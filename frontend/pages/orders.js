import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createOrder, deleteOrder, getAppointment, getCustomers, getOrders, getProducts, getServices, getCurrentStaff } from '../api/client';

const labels = { DOG: '狗', CAT: '貓', SERVICE: '服務', PRODUCT: '商品', UNPAID: '未付款', PAID: '已付款', CANCELLED: '已取消' };

export default function OrdersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [appointment, setAppointment] = useState(null);
  const [sourceType, setSourceType] = useState('WALK_IN');
  const [customerId, setCustomerId] = useState('');
  const [businessUnit, setBusinessUnit] = useState('DOG');
  const [itemType, setItemType] = useState('SERVICE');
  const [itemId, setItemId] = useState('');
  const [selectedPetId, setSelectedPetId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState('');
  const [items, setItems] = useState([]);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load({ initializeAppointmentItems = false } = {}) {
    try {
      setLoading(true);
      const [customerData, serviceData, productData, orderData] = await Promise.all([
        getCustomers({ status: 'ACTIVE' }),
        getServices({ status: 'ACTIVE' }),
        getProducts({ status: 'ACTIVE' }),
        getOrders(),
      ]);
      setCustomers(customerData.customers || []);
      setServices(serviceData.services || []);
      setProducts(productData.products || []);
      setOrders(orderData.orders || []);
      if (router.query.source_type === 'APPOINTMENT' && router.query.appointment_id) {
        const result = await getAppointment(router.query.appointment_id);
        setSourceType('APPOINTMENT');
        setAppointment(result.appointment);
        setCustomerId(String(result.appointment.customer_id));
        const appointmentPets = result.appointment.pets || [];
        setBusinessUnit(appointmentPets[0]?.species || 'DOG');
        if (initializeAppointmentItems) {
          setItems(appointmentPets.flatMap((pet) => (pet.services || []).map((service) => ({
            itemType: 'SERVICE',
            itemId: service.id,
            pet_id: Number(pet.pet_id),
            petName: pet.name,
            name: service.name,
            transaction_price: Number(service.price),
            quantity: 1,
            item_amount: Number(service.price),
          }))));
        }
      } else {
        setSourceType('WALK_IN');
        setAppointment(null);
        setItems([]);
      }
      setError('');
    } catch (loadError) {
      setError(loadError.message || '訂單資料載入失敗');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (router.isReady) {
      getCurrentStaff().then(() => load({ initializeAppointmentItems: true })).catch(() => router.replace('/login'));
    }
  }, [router.isReady]);

  const available = itemType === 'SERVICE' ? services : products;

  function getAppointmentPetForService(service) {
    if (sourceType !== 'APPOINTMENT' || !service) return null;
    return (appointment?.pets || []).find((pet) => service.species === 'BOTH' || service.species === pet.species) || null;
  }

  function getServicesForItem(item) {
    const pet = (appointment?.pets || []).find((appointmentPet) => Number(appointmentPet.pet_id) === Number(item.pet_id));
    return services.filter((service) => !pet || service.species === 'BOTH' || service.species === pet.species);
  }

  function selectItem(value) {
    setItemId(value);
    const selected = available.find((item) => String(item.id) === value);
    setPrice(selected ? selected.price : '');
    const appointmentPet = getAppointmentPetForService(selected);
    setSelectedPetId(appointmentPet ? String(appointmentPet.pet_id) : '');
  }

  function addItem() {
    const selected = available.find((item) => String(item.id) === itemId);
    const count = Number(quantity);
    const unitPrice = Number(price);
    const appointmentPet = getAppointmentPetForService(selected);
    if (!selected || !Number.isFinite(count) || count <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      setError('請選擇有效的項目、數量與單價');
      return;
    }
    if (sourceType === 'APPOINTMENT' && itemType === 'SERVICE' && !appointmentPet) {
      setError('所選服務沒有符合預約寵物的項目');
      return;
    }
    const petId = sourceType === 'APPOINTMENT' && itemType === 'SERVICE' ? Number(selectedPetId) : null;
    setItems([...items, {
      itemType,
      itemId: selected.id,
      ...(petId ? { pet_id: petId, petName: appointmentPet.name } : {}),
      name: selected.name,
      transaction_price: unitPrice,
      quantity: count,
      item_amount: Math.round(unitPrice * count * 100) / 100,
    }]);
    setItemId('');
    setSelectedPetId('');
    setPrice('');
    setQuantity(1);
    setError('');
  }

  function updateItem(index, field, value) {
    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const next = { ...item, [field]: field === 'itemId' ? Number(value) : Number(value) };
      if (field === 'itemId') {
        const selected = services.find((service) => Number(service.id) === Number(value));
        next.name = selected?.name || item.name;
        if (selected) next.transaction_price = Number(selected.price);
      }
      next.item_amount = Math.round(Number(next.transaction_price) * Number(next.quantity) * 100) / 100;
      return next;
    }));
  }

  function removeItem(index) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function startEditingItem(index) {
    setEditingItemIndex(index);
    setEditingItem({ ...items[index] });
    setError('');
  }

  function cancelEditingItem() {
    setEditingItemIndex(null);
    setEditingItem(null);
  }

  function updateEditingItem(field, value) {
    setEditingItem((current) => ({ ...current, [field]: value }));
  }

  function selectEditingService(value) {
    const selected = getServicesForItem(editingItem).find((service) => String(service.id) === value);
    setEditingItem((current) => ({
      ...current,
      itemId: Number(value),
      name: selected?.name || current.name,
      transaction_price: selected ? Number(selected.price) : current.transaction_price,
    }));
  }

  function confirmEditingItem() {
    const count = Number(editingItem.quantity);
    const unitPrice = Number(editingItem.transaction_price);
    if (!Number.isFinite(count) || count <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      setError('請輸入有效的數量與單價');
      return;
    }
    setItems((current) => current.map((item, index) => index === editingItemIndex ? {
      ...editingItem,
      quantity: count,
      transaction_price: unitPrice,
      item_amount: Math.round(unitPrice * count * 100) / 100,
    } : item));
    cancelEditingItem();
    setError('');
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (!customerId || items.length === 0) {
        throw new Error('請選擇客戶並至少加入一個訂單項目');
      }
      const result = await createOrder({
        customer_id: Number(customerId),
        source_type: sourceType,
        appointment_id: sourceType === 'APPOINTMENT' ? appointment?.id : null,
        business_unit: businessUnit,
        items: items.map((item) => ({
          [item.itemType === 'SERVICE' ? 'service_id' : 'product_id']: item.itemId,
          ...(sourceType === 'APPOINTMENT' && item.itemType === 'SERVICE' ? { pet_id: item.pet_id } : {}),
          transaction_price: item.transaction_price,
          quantity: item.quantity,
        })),
      });
      setSuccess(`訂單已新增：#${result.order.id}`);
      setItems([]);
      if (sourceType === 'WALK_IN') setCustomerId('');
      await load();
    } catch (saveError) {
      setError(saveError.message || '訂單儲存失敗');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(order) {
    if (!window.confirm(`確定要刪除訂單 #${order.id} 嗎？此操作無法復原。`)) return;
    setDeletingOrderId(order.id);
    setError('');
    setSuccess('');
    try {
      await deleteOrder(order.id);
      setSuccess(`訂單 #${order.id} 已刪除。`);
      await load();
    } catch (deleteError) {
      setError(deleteError.message || '無法刪除訂單。');
    } finally {
      setDeletingOrderId(null);
    }
  }

  const total = items.reduce((sum, item) => sum + item.item_amount, 0);

  return (
    <main className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-1">訂單</h1>
          <p className="text-muted mb-0">建立訂單並保存交易資料。</p>
        </div>
      </div>

      {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
      {success ? <div className="alert alert-success" role="alert">{success}</div> : null}

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="foundation-panel">
            <h2 className="h5">新增訂單</h2>
            <form onSubmit={save}>
              <label className="form-label">訂單來源</label>
              <select className="form-select mb-3" value={sourceType} disabled={sourceType === 'APPOINTMENT'} onChange={(event) => { setSourceType(event.target.value); setAppointment(null); setCustomerId(''); }}>
                <option value="WALK_IN">現場訂單</option>
                <option value="APPOINTMENT">預約服務訂單</option>
              </select>
              {sourceType === 'APPOINTMENT' ? (
                <div className="alert alert-info">預約 #{appointment?.id || ''}：{appointment?.customer?.name || '載入中'}</div>
              ) : (
                <>
                  <label className="form-label">客戶</label>
                  <select className="form-select mb-3" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                    <option value="">請選擇客戶</option>
                    {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}（{customer.phone}）</option>)}
                  </select>
                </>
              )}
              <label className="form-label">業務單位</label>
              <select className="form-select mb-3" value={businessUnit} onChange={(event) => setBusinessUnit(event.target.value)}>
                <option value="DOG">狗</option>
                <option value="CAT">貓</option>
              </select>
              <div className="row g-2 align-items-end">
                <div className="col-4">
                  <label className="form-label">類型</label>
                  <select className="form-select" value={itemType} onChange={(event) => { setItemType(event.target.value); setItemId(''); setPrice(''); }}>
                    <option value="SERVICE">服務</option>
                    <option value="PRODUCT">商品</option>
                  </select>
                </div>
                <div className="col-8">
                  <label className="form-label">項目</label>
                  <select className="form-select" value={itemId} onChange={(event) => selectItem(event.target.value)}>
                    <option value="">請選擇{labels[itemType]}</option>
                    {available.map((item) => <option key={item.id} value={item.id}>{item.name}（{item.price}）</option>)}
                  </select>
                </div>
              </div>
              <div className="row g-2 mt-1">
                <div className="col-4">
                  <label className="form-label">數量</label>
                  <input className="form-control" type="number" min="0.01" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                </div>
                <div className="col-8">
                  <label className="form-label">單價</label>
                  <input className="form-control" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} />
                </div>
              </div>
              <button type="button" className="btn btn-outline-primary mt-3" onClick={addItem}>加入項目</button>
              <hr />
              <h3 className="h6">訂單項目</h3>
              {items.length === 0 ? <p className="text-muted">尚未加入訂單項目</p> : <ul className="list-group mb-3">{items.map((item, index) => <li className="list-group-item" key={`${item.itemId}-${index}`}>
                {editingItemIndex === index ? (
                  <div>
                    <div className="row g-2 align-items-end">
                      <div className="col-md-4">
                        <label className="form-label">服務</label>
                        {item.itemType === 'SERVICE' ? <select className="form-select form-select-sm" value={editingItem.itemId} onChange={(event) => selectEditingService(event.target.value)}>{getServicesForItem(item).map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select> : <div>{item.name}</div>}
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">數量</label>
                        <input className="form-control form-control-sm" type="number" min="0.01" step="0.01" value={editingItem.quantity} onChange={(event) => updateEditingItem('quantity', event.target.value)} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">單價</label>
                        <input className="form-control form-control-sm" type="number" min="0" step="0.01" value={editingItem.transaction_price} onChange={(event) => updateEditingItem('transaction_price', event.target.value)} />
                      </div>
                      <div className="col-md-2"><span className="d-block small text-muted">小計</span>{(Number(editingItem.transaction_price) * Number(editingItem.quantity)).toFixed(2)}</div>
                      <div className="col-md-2 d-flex gap-2">
                        <button type="button" className="btn btn-sm btn-primary" onClick={confirmEditingItem}>確認</button>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={cancelEditingItem}>取消</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="row g-2 align-items-center">
                    <div className="col-4">{item.name}</div>
                    <div className="col-2">{item.quantity}</div>
                    <div className="col-2">{Number(item.transaction_price).toFixed(2)}</div>
                    <div className="col-2">{item.item_amount.toFixed(2)}</div>
                    <div className="col-2 d-flex gap-2 justify-content-end">
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => startEditingItem(index)}>編輯</button>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeItem(index)}>移除</button>
                    </div>
                  </div>
                )}
              </li>)}</ul>}
              <div className="d-flex justify-content-between mb-3"><strong>總額</strong><strong>{total.toFixed(2)}</strong></div>
              <button type="submit" className="btn btn-primary" disabled={saving || loading}>{saving ? '處理中...' : '建立訂單'}</button>
            </form>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="foundation-panel">
            <h2 className="h5">訂單紀錄</h2>
            {loading ? <p className="text-muted">訂單載入中...</p> : orders.length === 0 ? <div className="alert alert-light border">目前沒有訂單紀錄</div> : (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>訂單編號</th>
                      <th>客戶</th>
                      <th>寵物</th>
                      <th>業務單位</th>
                      <th>金額</th>
                      <th>狀態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td><button type="button" className="btn btn-link p-0" onClick={() => router.push(`/orders/${order.id}`)}>#{order.id}</button></td>
                        <td>{order.customer_name}</td>
                        <td>{order.source_type === 'APPOINTMENT' ? `預約 #${order.appointment_id}` : '現場'}</td>
                        <td>{labels[order.business_unit]}</td>
                        <td>{order.total_amount.toFixed(2)}</td>
                        <td>
                          <span className={`badge ${order.status === 'PAID' ? 'bg-success' : 'bg-secondary'}`}>{labels[order.status] || order.status}</span>
                          <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={() => handleDelete(order)} disabled={deletingOrderId === order.id}>
                            {deletingOrderId === order.id ? '刪除中...' : '刪除'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
