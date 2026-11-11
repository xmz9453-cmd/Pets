import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createOrder, deleteOrder, getAppointment, getCustomer, getCustomerServicePackages, getCustomers, getOrders, getPetBreedPrices, getProducts, getServices, getCurrentStaff } from '../api/client';

const labels = { DOG: '狗', CAT: '貓', SERVICE: '服務', PRODUCT: '商品', UNPAID: '未付款', PAID: '已付款', CANCELLED: '已取消' };

function formatQuantity(value) {
  return Number(value).toLocaleString('zh-TW', { maximumFractionDigits: 2 });
}

function formatAmount(value) {
  return Number(value).toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}

function isValidQuantity(value, allowFractionalQuantity) {
  if (!Number.isFinite(value) || value <= 0) return false;
  return allowFractionalQuantity
    ? Math.round(value * 100) / 100 === value
    : Number.isInteger(value);
}

export default function OrdersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [appointment, setAppointment] = useState(null);
  const [customerPackages, setCustomerPackages] = useState([]);
  const [customerPets, setCustomerPets] = useState([]);
  const [breedPrices, setBreedPrices] = useState([]);
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
      const [customerData, serviceData, productData, orderData, breedPriceData] = await Promise.all([
        getCustomers({ status: 'ACTIVE' }),
        getServices({ status: 'ACTIVE' }),
        getProducts({ status: 'ACTIVE', sellable: true }),
        getOrders(),
        getPetBreedPrices(),
      ]);
      setCustomers(customerData.customers || []);
      setServices(serviceData.services || []);
      setProducts(productData.products || []);
      setOrders(orderData.orders || []);
      setBreedPrices(breedPriceData.breeds || []);
      if (router.query.source_type === 'APPOINTMENT' && router.query.appointment_id) {
        const result = await getAppointment(router.query.appointment_id);
        setSourceType('APPOINTMENT');
        setAppointment(result.appointment);
        setCustomerId(String(result.appointment.customer_id));
        const packageData = await getCustomerServicePackages(result.appointment.customer_id, { usable_only: 'true' });
        setCustomerPackages(packageData.packages || []);
        setCustomerPets(result.appointment.pets || []);
        const appointmentPets = result.appointment.pets || [];
        setBusinessUnit(appointmentPets[0]?.species || 'DOG');
        if (initializeAppointmentItems) {
          const getAppointmentPrice = (serviceId, pet, fallback) => {
            const serviceMaster = (serviceData.services || []).find((service) => Number(service.id) === Number(serviceId));
            const priceField = {
              BATH: 'bath_price',
              ELECTRIC_CLIPPER: 'electric_clipper_price',
              HAND_SCISSOR: 'hand_scissor_price',
            }[serviceMaster?.breed_price_category];
            const breedPrice = (breedPriceData.breeds || []).find((item) => item.breed === pet.breed);
            return priceField && breedPrice?.[priceField] != null ? Number(breedPrice[priceField]) : Number(fallback);
          };
          setItems(appointmentPets.flatMap((pet) => [
            ...(pet.services || []).map((service) => ({
              itemType: 'SERVICE',
              itemId: service.id,
              pet_id: Number(pet.pet_id),
              petName: pet.name,
              name: service.name,
              unit: service.unit || (service.type === 'BOARDING' ? '晚' : '次'),
              transaction_price: getAppointmentPrice(service.id, pet, service.price),
              allow_fractional_quantity: Boolean(service.allow_fractional_quantity),
              quantity: 1,
              item_amount: getAppointmentPrice(service.id, pet, service.price),
            })),
            ...(pet.add_on_services || []).map((service) => ({
              itemType: 'SERVICE',
              itemId: service.service_id,
              pet_id: Number(pet.pet_id),
              petName: pet.name,
              name: service.name,
              unit: service.unit,
              transaction_price: Number(service.price),
              allow_fractional_quantity: Boolean(service.allow_fractional_quantity),
              quantity: Number(service.quantity),
              item_amount: Math.round(Number(service.price) * Number(service.quantity)),
            })),
          ]));
        }
      } else {
        setSourceType('WALK_IN');
        setAppointment(null);
        setCustomerPackages([]);
        setCustomerPets([]);
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
  const selectedAvailableItem = available.find((item) => String(item.id) === itemId);
  const allowFractionalQuantity = Boolean(selectedAvailableItem?.allow_fractional_quantity);

  function getAppointmentPetForService(service) {
    if (sourceType !== 'APPOINTMENT' || !service) return null;
    return (appointment?.pets || []).find((pet) => service.species === 'BOTH' || service.species === pet.species) || null;
  }

  function getServicesForItem(item) {
    const pet = (appointment?.pets || []).find((appointmentPet) => Number(appointmentPet.pet_id) === Number(item.pet_id));
    return services.filter((service) => !pet || service.species === 'BOTH' || service.species === pet.species);
  }

  function getAvailablePackagesForItem(item, itemIndex) {
    const service = services.find((availableService) => Number(availableService.id) === Number(item.itemId));
    return customerPackages
      .filter((servicePackage) => Number(servicePackage.pet_id) === Number(item.pet_id))
      .map((servicePackage) => ({
        ...servicePackage,
        packagePointCost: Number(service?.package_point_cost || 0),
        serviceBalance: servicePackage.service_balances.find((balance) => (
          Number(balance.service_id) === Number(item.itemId) && balance.remaining_uses > 0
        )),
      }))
      .filter((servicePackage) => (
        !items.some((candidate, candidateIndex) => (
          candidateIndex !== itemIndex
          && Number(candidate.customer_service_package_id) === Number(servicePackage.id)
        ))
        && (servicePackage.is_point_package
          ? servicePackage.packagePointCost > 0 && servicePackage.remaining_uses >= servicePackage.packagePointCost
          : servicePackage.serviceBalance)
      ));
  }

  function getBreedPrice(service, petId) {
    if (!service || !service.breed_price_category || service.breed_price_category === 'STANDARD') return null;
    const pet = sourceType === 'APPOINTMENT'
      ? (appointment?.pets || []).find((appointmentPet) => Number(appointmentPet.pet_id) === Number(petId))
      : customerPets.find((customerPet) => Number(customerPet.id) === Number(petId));
    if (!pet?.breed) return null;
    const breedPrice = breedPrices.find((item) => item.breed === pet.breed);
    if (!breedPrice) return null;
    const priceField = {
      BATH: 'bath_price',
      ELECTRIC_CLIPPER: 'electric_clipper_price',
      HAND_SCISSOR: 'hand_scissor_price',
    }[service.breed_price_category];
    return breedPrice[priceField] == null ? null : Number(breedPrice[priceField]);
  }

  function selectItem(value) {
    setItemId(value);
    const selected = available.find((item) => String(item.id) === value);
    const appointmentPet = getAppointmentPetForService(selected);
    const nextPetId = appointmentPet ? String(appointmentPet.pet_id) : sourceType === 'WALK_IN' ? selectedPetId : '';
    setSelectedPetId(nextPetId);
    const breedPrice = itemType === 'SERVICE' ? getBreedPrice(selected, nextPetId) : null;
    setPrice(selected ? breedPrice ?? selected.price : '');
  }

  async function selectCustomer(value) {
    setCustomerId(value);
    setCustomerPackages([]);
    setCustomerPets([]);
    setSelectedPetId('');
    setItems([]);
    if (!value) return;
    try {
      const [customerResult, packageResult] = await Promise.all([
        getCustomer(value),
        getCustomerServicePackages(value, { usable_only: 'true' }),
      ]);
      const pets = (customerResult.customer.pets || []).filter((pet) => pet.status === 'ACTIVE');
      setCustomerPets(pets);
      setCustomerPackages(packageResult.packages || []);
      if (pets.length) {
        setSelectedPetId(String(pets[0].id));
        setBusinessUnit(pets[0].species);
        const selectedService = services.find((service) => Number(service.id) === Number(itemId));
        if (selectedService) {
          const priceField = {
            BATH: 'bath_price',
            ELECTRIC_CLIPPER: 'electric_clipper_price',
            HAND_SCISSOR: 'hand_scissor_price',
          }[selectedService.breed_price_category];
          const breedPrice = breedPrices.find((item) => item.breed === pets[0].breed);
          setPrice(priceField && breedPrice?.[priceField] != null ? breedPrice[priceField] : selectedService.price);
        }
      }
    } catch (customerError) {
      setError(customerError.message || '載入客戶寵物與包月卡失敗');
    }
  }

  function addItem() {
    const selected = available.find((item) => String(item.id) === itemId);
    const count = Number(quantity);
    const unitPrice = Number(price);
    const appointmentPet = getAppointmentPetForService(selected);
    if (!selected || !isValidQuantity(count, selected.allow_fractional_quantity) || !Number.isInteger(unitPrice) || unitPrice < 0) {
      setError('請確認項目、數量與單價有效；此項目的數量格式依品項設定');
      return;
    }
    if (sourceType === 'APPOINTMENT' && itemType === 'SERVICE' && !appointmentPet) {
      setError('所選服務沒有符合預約寵物的項目');
      return;
    }
    const walkInPet = customerPets.find((pet) => String(pet.id) === selectedPetId);
    const pet = sourceType === 'APPOINTMENT' ? appointmentPet : walkInPet;
    if (pet && selected.species !== 'BOTH' && selected.species !== pet.species) {
      setError('所選服務不適用於這隻寵物');
      return;
    }
    const petId = itemType === 'SERVICE' && pet ? Number(pet.id || pet.pet_id) : null;
    setItems([...items, {
      itemType,
      itemId: selected.id,
      ...(petId ? { pet_id: petId, petName: pet.name } : {}),
      name: selected.name,
      unit: selected.unit || (itemType === 'SERVICE' ? '次' : '件'),
      allow_fractional_quantity: Boolean(selected.allow_fractional_quantity),
      transaction_price: unitPrice,
      quantity: count,
      item_amount: Math.round(unitPrice * count),
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
        next.customer_service_package_id = null;
      }
      next.item_amount = Math.round(Number(next.transaction_price) * Number(next.quantity));
      return next;
    }));
  }

  function updatePackageForItem(index, value) {
    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const selected = services.find((service) => Number(service.id) === Number(item.itemId));
      const packageId = value ? Number(value) : null;
      const transactionPrice = packageId ? 0 : Number(selected?.price ?? item.transaction_price);
      return {
        ...item,
        customer_service_package_id: packageId,
        transaction_price: transactionPrice,
        item_amount: Math.round(transactionPrice * Number(item.quantity)),
      };
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
      unit: selected?.unit || current.unit,
      transaction_price: selected ? Number(selected.price) : current.transaction_price,
      allow_fractional_quantity: Boolean(selected?.allow_fractional_quantity),
    }));
  }

  function confirmEditingItem() {
    const count = Number(editingItem.quantity);
    const unitPrice = Number(editingItem.transaction_price);
    if (!isValidQuantity(count, editingItem.allow_fractional_quantity) || !Number.isInteger(unitPrice) || unitPrice < 0) {
      setError('請確認數量與單價格式符合此品項設定');
      return;
    }
    setItems((current) => current.map((item, index) => index === editingItemIndex ? {
      ...editingItem,
      quantity: count,
      transaction_price: unitPrice,
      item_amount: Math.round(unitPrice * count),
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
          ...(item.customer_service_package_id ? { customer_service_package_id: item.customer_service_package_id } : {}),
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
                  <select className="form-select mb-3" value={customerId} onChange={(event) => selectCustomer(event.target.value)}>
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
                    {available.map((item) => <option key={item.id} value={item.id}>{item.name}（{formatAmount(item.price)}／{item.unit || (itemType === 'SERVICE' ? '次' : '件')}）</option>)}
                  </select>
                </div>
              </div>
              <div className="row g-2 mt-1">
                {sourceType === 'WALK_IN' && customerId && itemType === 'SERVICE' ? (
                  <div className="col-12">
                    <label className="form-label">服務寵物（包月扣次時必選）</label>
                    <select className="form-select" value={selectedPetId} onChange={(event) => {
                      setSelectedPetId(event.target.value);
                      const pet = customerPets.find((customerPet) => String(customerPet.id) === event.target.value);
                      if (pet) setBusinessUnit(pet.species);
                                    const breedPrice = itemType === 'SERVICE' ? getBreedPrice(selectedAvailableItem, event.target.value) : null;
                                    if (selectedAvailableItem) setPrice(breedPrice ?? selectedAvailableItem.price);
                                  }}>
                      <option value="">不指定寵物</option>
                      {customerPets
                        .filter((pet) => !selectedAvailableItem || selectedAvailableItem.species === 'BOTH' || selectedAvailableItem.species === pet.species)
                        .map((pet) => <option key={pet.id} value={pet.id}>{pet.name}（{pet.species === 'DOG' ? '狗' : '貓'}）</option>)}
                    </select>
                    {!customerPets.length ? <div className="form-text">此客戶尚無啟用中的寵物資料。</div> : null}
                  </div>
                ) : null}
                <div className="col-4">
                  <label className="form-label">數量</label>
                  <input className="form-control" type="number" min={allowFractionalQuantity ? '0.01' : '1'} step={allowFractionalQuantity ? '0.01' : '1'} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                </div>
                <div className="col-8">
                  <label className="form-label">單價</label>
                  <input className="form-control" type="number" min="0" step="1" value={price} onChange={(event) => setPrice(event.target.value)} />
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
                        <label className="form-label">品項</label>
                        {item.itemType === 'SERVICE' ? <select className="form-select form-select-sm" value={editingItem.itemId} onChange={(event) => selectEditingService(event.target.value)}>{getServicesForItem(item).map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select> : <div>{item.name}</div>}
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">數量</label>
                        <input className="form-control form-control-sm" type="number" min={editingItem.allow_fractional_quantity ? '0.01' : '1'} step={editingItem.allow_fractional_quantity ? '0.01' : '1'} value={editingItem.quantity} onChange={(event) => updateEditingItem('quantity', event.target.value)} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">單價</label>
                        <input className="form-control form-control-sm" type="number" min="0" step="1" value={editingItem.transaction_price} onChange={(event) => updateEditingItem('transaction_price', event.target.value)} />
                      </div>
                      <div className="col-md-2"><span className="d-block small text-muted">小計</span>{formatAmount(Number(editingItem.transaction_price) * Number(editingItem.quantity))}</div>
                      <div className="col-md-2 d-flex gap-2">
                        <button type="button" className="btn btn-sm btn-primary" onClick={confirmEditingItem}>確認</button>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={cancelEditingItem}>取消</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div className="flex-grow-1">
                        <span className="d-block small text-muted">品項</span>
                        <div className="text-break">{item.name}</div>
                      </div>
                      <div className="d-flex gap-2 flex-shrink-0">
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => startEditingItem(index)}>編輯</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeItem(index)}>移除</button>
                      </div>
                    </div>
                    <div className="row g-2">
                      <div className="col-4">
                        <span className="d-block small text-muted">數量{item.unit ? `（${item.unit}）` : ''}</span>
                        <div>{formatQuantity(item.quantity)}</div>
                      </div>
                      <div className="col-4">
                        <span className="d-block small text-muted">單價</span>
                        <div>{formatAmount(item.transaction_price)}</div>
                      </div>
                      <div className="col-4">
                        <span className="d-block small text-muted">小計</span>
                        <div>{formatAmount(item.item_amount)}</div>
                      </div>
                    </div>
                    {item.itemType === 'SERVICE' && item.pet_id && services.find((service) => Number(service.id) === Number(item.itemId))?.type === 'GROOMING' ? (
                      <div>
                        <label className="form-label small mb-1" htmlFor={`package-use-${index}`}>使用美容包月卡（此項只選一種美容主服務）</label>
                        <select
                          id={`package-use-${index}`}
                          className="form-select form-select-sm"
                          value={item.customer_service_package_id || ''}
                          onChange={(event) => updatePackageForItem(index, event.target.value)}
                        >
                          <option value="">不使用包套（依單價收費）</option>
                          {Number(item.quantity) === 1 && getAvailablePackagesForItem(item, index).length === 0 ? (
                            <option value="" disabled>此寵物／服務沒有可用美容包月卡</option>
                          ) : null}
                          {Number(item.quantity) === 1 ? getAvailablePackagesForItem(item, index).map((servicePackage) => (
                              <option key={servicePackage.id} value={servicePackage.id}>
                                {servicePackage.plan_name}（{servicePackage.pet_name}・{servicePackage.is_point_package
                                  ? `剩餘 ${servicePackage.remaining_uses} 點，${{
                                    BATH: '洗澡扣 1 點',
                                    ELECTRIC_CLIPPER: '電剪（含洗澡）扣 2 點',
                                    HAND_SCISSOR: '全手修剪（含洗澡）扣 3 點',
                                  }[services.find((availableService) => Number(availableService.id) === Number(item.itemId))?.breed_price_category]}`
                                  : `此服務剩餘 ${servicePackage.serviceBalance.remaining_uses} 次`}・至 {servicePackage.expires_on}）
                              </option>
                            )) : null}
                        </select>
                      </div>
                    ) : null}
                  </div>
                )}
              </li>)}</ul>}
              <div className="d-flex justify-content-between mb-3"><strong>總額</strong><strong>{formatAmount(total)}</strong></div>
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
                        <td>{formatAmount(order.total_amount)}</td>
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
