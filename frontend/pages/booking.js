import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  createCustomerBookingRequest,
  createCustomerBookingChangeRequest,
  getCustomerBookingAvailability,
  getCustomerBookingOnboardingToken,
  getCustomerBookingPets,
  getCustomerBookingProducts,
  getCustomerBookingRequests,
  getCustomerBookingServices,
  getCustomerMember,
  getCustomerMemberAuthUrl,
  getCustomerMemberProviders,
  logoutCustomerMember,
} from '../api/client';

const SPECIES_LABELS = { DOG: '狗', CAT: '貓' };
const STATUS_LABELS = {
  PENDING: '待店家確認',
  AWAITING_CUSTOMER: '待補資料／簽約',
  SCHEDULED: '已排程',
  CONFIRMED: '正式確認',
  CANCELLED: '已取消',
};
const CURRENCY_FORMATTER = new Intl.NumberFormat('zh-TW', {
  style: 'currency',
  currency: 'TWD',
  maximumFractionDigits: 0,
});

function getToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function getMemberErrorMessage(code) {
  const messages = {
    login_cancelled: '已取消登入。',
    CUSTOMER_AUTH_IDENTITY_IN_USE: '此登入方式已連結至其他會員，無法自動合併。',
    CUSTOMER_AUTH_INVALID_ID_TOKEN: '登入驗證未成功，請重新嘗試。',
    CUSTOMER_AUTH_PROVIDER_NOT_CONFIGURED: '此登入方式尚未完成設定，請改用其他已開放的登入方式。',
    CUSTOMER_AUTH_REAUTH_REQUIRED: '請重新登入後，再連結其他登入方式。',
    CUSTOMER_AUTH_STATE_INVALID: '登入要求已失效，請重新開始。',
    CUSTOMER_SESSION_INVALID: '登入工作階段已失效，請重新登入。',
  };
  return messages[code] || '登入未成功，請稍後再試或聯絡店家。';
}

export default function BookingPage() {
  const router = useRouter();
  const shopId = router.isReady ? String(router.query.shop_id || '1') : '1';
  const [providers, setProviders] = useState({ LINE: false, GOOGLE: false });
  const [member, setMember] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [pets, setPets] = useState([]);
  const [requests, setRequests] = useState([]);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [petId, setPetId] = useState('');
  const [petName, setPetName] = useState('');
  const [species, setSpecies] = useState('');
  const [weight, setWeight] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [bookingType, setBookingType] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [addOns, setAddOns] = useState({});
  const [busy, setBusy] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState(null);
  const [changeRequestAppointmentId, setChangeRequestAppointmentId] = useState(null);
  const [proposedChangeDate, setProposedChangeDate] = useState('');
  const [proposedChangeTime, setProposedChangeTime] = useState('');
  const [proposedCheckOutDate, setProposedCheckOutDate] = useState('');
  const [proposedCheckOutTime, setProposedCheckOutTime] = useState('');
  const [changeNote, setChangeNote] = useState('');

  const selectedPet = pets.find((pet) => String(pet.id) === petId);
  const selectedSpecies = selectedPet?.species || species;
  const selectedService = services.find((service) => String(service.id) === serviceId);
  const visibleServices = services.filter((service) => service.type === bookingType);

  useEffect(() => {
    if (!router.isReady) return;
    let active = true;
    const loginError = router.query.member_error;
    if (loginError) setError(getMemberErrorMessage(String(loginError)));
    if (router.query.member_linked === '1') setMessage('已完成登入方式連結。');
    if (router.query.member_login === '1') setMessage('會員登入成功。');

    async function loadPage() {
      try {
        const providerResult = await getCustomerMemberProviders();
        if (active) setProviders(providerResult.providers || {});
      } catch (loadError) {
        if (active) setError(loadError.message || '目前無法載入登入方式，請稍後再試。');
      }
      try {
        const result = await getCustomerMember(shopId);
        if (!active) return;
        setMember(result.member);
        setCustomer(result.customer);
        setName(result.customer?.name || result.member?.display_name || '');
        setPhone(result.customer?.phone || '');
        const [petResult, requestResult] = await Promise.all([
          getCustomerBookingPets(shopId),
          getCustomerBookingRequests(shopId),
        ]);
        if (!active) return;
        setPets(petResult.pets || []);
        setRequests(requestResult.requests || []);
      } catch (loadError) {
        if (active && loadError.statusCode !== 401) {
          setError(loadError.message || '目前無法載入會員資料，請稍後再試。');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPage();
    return () => { active = false; };
  }, [router.isReady, router.query.member_error, router.query.member_linked, router.query.member_login, shopId]);

  useEffect(() => {
    if (!member || !selectedSpecies) {
      setServices([]);
      setProducts([]);
      return;
    }
    let active = true;
    Promise.all([
      getCustomerBookingServices(
        selectedPet ? { pet_id: String(selectedPet.id) } : { species: selectedSpecies },
        shopId,
      ),
      getCustomerBookingProducts(selectedSpecies, shopId),
    ]).then(([serviceResult, productResult]) => {
      if (!active) return;
      setServices(serviceResult.services || []);
      setProducts(productResult.products || []);
    }).catch((loadError) => {
      if (active) setError(loadError.message || '目前無法載入服務與商品，請稍後再試。');
    });
    return () => { active = false; };
  }, [member, selectedSpecies, selectedPet, shopId]);

  const visibleProducts = useMemo(
    () => products.filter((product) => product.species === 'BOTH' || product.species === selectedSpecies),
    [products, selectedSpecies],
  );

  async function handleLoadSlots(event) {
    event.preventDefault();
    if (!serviceId || !appointmentDate || !selectedSpecies) return;
    setLoadingSlots(true);
    setSlots([]);
    setSelectedTime('');
    setError('');
    setMessage('');
    try {
      const filters = {
        service_id: serviceId,
        date: appointmentDate,
        ...(selectedPet ? { pet_id: String(selectedPet.id) } : { species: selectedSpecies }),
      };
      if (selectedService?.type === 'BOARDING') {
        filters.check_out_date = checkOutDate;
        filters.check_out_time = checkOutTime;
      }
      const result = await getCustomerBookingAvailability(filters, shopId);
      setSlots(result.slots || []);
      if (!result.slots?.length) setMessage('這個日期目前沒有可申請的時段，請改選其他日期。');
    } catch (availabilityError) {
      setError(availabilityError.message || '目前無法查詢時段，請稍後再試。');
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleSubmitRequest() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await createCustomerBookingRequest({
        customer: { name, phone },
        pet: selectedPet
          ? { pet_id: Number(selectedPet.id) }
          : { name: petName, species, weight },
        service_id: Number(serviceId),
        appointment_date: appointmentDate,
        appointment_time: selectedTime,
        ...(selectedService?.type === 'BOARDING'
          ? { check_out_date: checkOutDate, check_out_time: checkOutTime }
          : {}),
        add_ons: Object.entries(addOns)
          .filter(([, quantity]) => Number(quantity) > 0)
          .map(([productId, quantity]) => ({ product_id: Number(productId), quantity: Number(quantity) })),
      }, shopId);
      setSubmittedRequest(result.request);
      setRequests((current) => [result.request, ...current]);
      setSlots([]);
      setSelectedTime('');
      setMessage(`預約申請已送出（申請編號 ${result.request.appointment_id}）。時段尚未保留，需店家確認；商品也需店家確認庫存，到店付款。`);
    } catch (submitError) {
      setError(submitError.message || '預約申請未能送出，請重新查詢時段後再試。');
    } finally {
      setBusy(false);
    }
  }

  async function openOnboarding(appointmentId) {
    setBusy(true);
    setError('');
    try {
      const result = await getCustomerBookingOnboardingToken(appointmentId, shopId);
      await router.push(`/onboarding/${encodeURIComponent(result.token)}?shop_id=${encodeURIComponent(shopId)}`);
    } catch (onboardingError) {
      setError(onboardingError.message || '目前無法開啟補件資料，請稍後再試。');
    } finally {
      setBusy(false);
    }
  }

  function beginReschedule(request) {
    setChangeRequestAppointmentId(request.appointment_id);
    setProposedChangeDate(request.appointment_date);
    setProposedChangeTime(String(request.appointment_time).slice(0, 5));
    setProposedCheckOutDate(request.requested_check_out ? String(request.requested_check_out).slice(0, 10) : '');
    setProposedCheckOutTime(request.requested_check_out ? String(request.requested_check_out).slice(11, 16) : '');
    setChangeNote('');
    setError('');
  }

  async function submitChangeRequest(event, request, requestType) {
    event.preventDefault();
    if (requestType === 'CANCEL'
      && !window.confirm('確定要向店家提出取消這筆預約的申請嗎？店家審核前，原預約仍維持有效。')) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await createCustomerBookingChangeRequest(request.appointment_id, {
        request_type: requestType,
        customer_note: requestType === 'RESCHEDULE' ? changeNote : null,
        ...(requestType === 'RESCHEDULE' ? {
          proposed_appointment_date: proposedChangeDate,
          proposed_appointment_time: proposedChangeTime,
          ...(request.service_type === 'BOARDING' ? {
            proposed_check_out_date: proposedCheckOutDate,
            proposed_check_out_time: proposedCheckOutTime,
          } : {}),
        } : {}),
      }, shopId);
      const result = await getCustomerBookingRequests(shopId);
      setRequests(result.requests || []);
      setChangeRequestAppointmentId(null);
      setMessage(requestType === 'CANCEL'
        ? '取消申請已送出。店家審核前，原預約仍維持有效。'
        : '改期申請已送出。店家審核前，原預約仍維持有效。');
    } catch (changeError) {
      setError(changeError.message || '無法送出預約變更申請，請稍後再試。');
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    try {
      await logoutCustomerMember(shopId);
      setMember(null);
      setCustomer(null);
      setPets([]);
      setRequests([]);
    } catch (logoutError) {
      setError(logoutError.message || '登出失敗，請稍後再試。');
    }
  }

  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-9">
          <h1 className="text-center mb-4">會員預約</h1>
          <div className="alert alert-info" role="note">
            預約改期或取消可在此提出申請；店家審核前，原預約仍維持有效。新預約申請需店家確認，時段尚未保留；加購商品也需店家確認庫存，請於到店時付款。
          </div>
          {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
          {message ? <div className="alert alert-info" role="status" aria-live="polite">{message}</div> : null}
          {loading ? <p role="status">正在載入會員資料...</p> : null}

          {!loading && !member ? (
            <section className="card shadow-sm">
              <div className="card-body">
                <h2 className="h5">請選擇登入方式</h2>
                <p className="text-muted">登入後即可選擇服務、寵物與預約時段。</p>
                <div className="d-grid gap-2">
                  {['LINE', 'GOOGLE'].map((provider) => (
                    providers[provider] ? (
                      <a
                        key={provider}
                        className={`btn ${provider === 'LINE' ? 'btn-success' : 'btn-outline-dark'}`}
                        href={getCustomerMemberAuthUrl(provider, shopId)}
                      >
                        使用 {provider === 'LINE' ? 'LINE' : 'Google'} 登入
                      </a>
                    ) : (
                      <button key={provider} type="button" className="btn btn-outline-secondary" disabled>
                        {provider === 'LINE' ? 'LINE' : 'Google'} 尚未設定，請聯絡店家
                      </button>
                    )
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {member ? (
            <>
              <section className="card shadow-sm mb-4">
                <div className="card-body d-flex flex-wrap justify-content-between align-items-center gap-3">
                  <div>
                    <h2 className="h5 mb-1">您好，{member.display_name || name || '會員'}</h2>
                    <p className="small text-muted mb-1">會員編號：{member.id}</p>
                    <p className="small text-muted mb-2">
                      已連結：{member.linked_providers?.map((provider) => (provider === 'LINE' ? 'LINE' : 'Google')).join('、') || '無'}
                    </p>
                    {member.can_link_provider ? (
                      <div className="d-flex flex-wrap gap-2">
                        {['LINE', 'GOOGLE'].filter((provider) => providers[provider] && !member.linked_providers?.includes(provider)).map((provider) => (
                          <a
                            key={provider}
                            className="btn btn-sm btn-outline-primary"
                            href={getCustomerMemberAuthUrl(provider, shopId, 'LINK')}
                          >
                            連結{provider === 'LINE' ? ' LINE' : ' Google'} 帳號
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <button type="button" className="btn btn-outline-secondary" onClick={handleLogout}>登出會員</button>
                </div>
              </section>

              <section className="card shadow-sm mb-4" aria-labelledby="booking-type-title">
                <div className="card-body">
                  <h2 className="h5 mb-3" id="booking-type-title">選擇預約項目</h2>
                  <div className="d-flex flex-wrap gap-3" role="group" aria-label="預約類型">
                    {[
                      { type: 'GROOMING', label: '預約美容' },
                      { type: 'BOARDING', label: '預約住宿' },
                    ].map(({ type, label }) => (
                      <button
                        key={type}
                        type="button"
                        className={`btn btn-lg ${bookingType === type ? 'btn-primary' : 'btn-outline-primary'}`}
                        aria-pressed={bookingType === type}
                        onClick={() => {
                          setBookingType(type);
                          setServiceId('');
                          setAppointmentDate('');
                          setCheckOutDate('');
                          setCheckOutTime('');
                          setSlots([]);
                          setSelectedTime('');
                          setAddOns({});
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {submittedRequest ? (
                <div className="alert alert-success" role="status">
                  申請編號：{submittedRequest.appointment_id}；目前狀態：待店家確認。所選時段尚未保留。
                </div>
              ) : null}

              {bookingType ? (
                <>
              <section className="card shadow-sm mb-4">
                <div className="card-body">
                  <h2 className="h5 mb-3">聯絡資料</h2>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="booking-name">姓名</label>
                      <input id="booking-name" className="form-control" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="booking-phone">聯絡電話</label>
                      <input id="booking-phone" className="form-control" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required maxLength={30} />
                    </div>
                  </div>
                  <small className="text-muted">聯絡電話必填，不會以簡訊驗證。</small>
                </div>
              </section>

              <section className="card shadow-sm mb-4">
                <div className="card-body">
                  <h2 className="h5 mb-3">寵物與服務</h2>
                  <label className="form-label" htmlFor="booking-pet">選擇寵物</label>
                  <select
                    id="booking-pet"
                    className="form-select mb-3"
                    value={petId}
                    onChange={(event) => {
                      setPetId(event.target.value);
                      setServiceId('');
                      setSlots([]);
                      setSelectedTime('');
                    }}
                  >
                    <option value="">新增寵物資料</option>
                    {pets.map((pet) => (
                      <option key={pet.id} value={pet.id}>{pet.name}（{SPECIES_LABELS[pet.species] || pet.species}）</option>
                    ))}
                  </select>

                  {!selectedPet ? (
                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="form-label" htmlFor="booking-pet-name">寵物名字</label>
                        <input id="booking-pet-name" className="form-control" value={petName} onChange={(event) => setPetName(event.target.value)} required maxLength={100} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label" htmlFor="booking-species">寵物種類</label>
                        <select
                          id="booking-species"
                          className="form-select"
                          value={species}
                          onChange={(event) => {
                            setSpecies(event.target.value);
                            setServiceId('');
                            setSlots([]);
                            setSelectedTime('');
                          }}
                          required
                        >
                          <option value="">請選擇</option>
                          <option value="DOG">狗</option>
                          <option value="CAT">貓</option>
                        </select>
                      </div>
                    </div>
                  ) : null}

                  {selectedSpecies ? (
                    <div className="mb-3">
                      <label className="form-label" htmlFor="booking-service">預約服務</label>
                      <select id="booking-service" className="form-select" value={serviceId} onChange={(event) => { setServiceId(event.target.value); setSlots([]); setSelectedTime(''); }}>
                        <option value="">請選擇{bookingType === 'GROOMING' ? '美容' : '住宿'}服務</option>
                        {visibleServices.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.type === 'GROOMING' ? '美容' : '住宿'}｜{service.name}｜{CURRENCY_FORMATTER.format(service.price)}／{service.unit}
                          </option>
                        ))}
                      </select>
                      {!visibleServices.length ? <p className="small text-muted mt-2 mb-0">目前沒有開放的{bookingType === 'GROOMING' ? '美容' : '住宿'}服務，請聯絡店家。</p> : null}
                    </div>
                  ) : null}

                  {!selectedPet && selectedService?.type === 'GROOMING' ? (
                    <div className="mb-3">
                      <label className="form-label" htmlFor="booking-weight">寵物體重（公斤）</label>
                      <input id="booking-weight" className="form-control" type="number" min="0.1" max="300" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} required />
                    </div>
                  ) : null}

                  {selectedService?.type === 'GROOMING' && selectedPet && !selectedPet.weight ? (
                    <p className="alert alert-warning">此美容服務需要寵物體重；請先聯絡店家補登資料後再申請。</p>
                  ) : null}
                </div>
              </section>

              {selectedService ? (
                <section className="card shadow-sm mb-4">
                  <div className="card-body">
                    <h2 className="h5 mb-3">{selectedService.type === 'BOARDING' ? '入住與退房時間' : '預約日期與時段'}</h2>
                    <form onSubmit={handleLoadSlots}>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label" htmlFor="booking-date">{selectedService.type === 'BOARDING' ? '入住日期' : '預約日期'}</label>
                          <input id="booking-date" className="form-control" type="date" min={getToday()} value={appointmentDate} onChange={(event) => { setAppointmentDate(event.target.value); setSlots([]); setSelectedTime(''); }} required />
                        </div>
                        {selectedService.type === 'BOARDING' ? (
                          <>
                            <div className="col-md-6">
                              <label className="form-label" htmlFor="booking-checkout-date">退房日期</label>
                              <input id="booking-checkout-date" className="form-control" type="date" min={appointmentDate || getToday()} value={checkOutDate} onChange={(event) => { setCheckOutDate(event.target.value); setSlots([]); setSelectedTime(''); }} required />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label" htmlFor="booking-checkout-time">退房時間</label>
                              <input id="booking-checkout-time" className="form-control" type="time" value={checkOutTime} onChange={(event) => { setCheckOutTime(event.target.value); setSlots([]); setSelectedTime(''); }} required />
                            </div>
                          </>
                        ) : null}
                      </div>
                      <button type="submit" className="btn btn-outline-primary mt-3" disabled={loadingSlots || !appointmentDate || (selectedService.type === 'BOARDING' && (!checkOutDate || !checkOutTime))}>
                        {loadingSlots ? '正在查詢時段...' : '查詢可申請時段'}
                      </button>
                    </form>
                    {slots.length ? (
                      <div className="mt-3">
                        <h3 className="h6">可申請時段</h3>
                        <div className="d-flex flex-wrap gap-2">
                          {slots.map((slot) => (
                            <label key={slot.time} className={`btn ${selectedTime === slot.time ? 'btn-primary' : 'btn-outline-primary'}`}>
                              <input className="visually-hidden" type="radio" name="booking-time" value={slot.time} checked={selectedTime === slot.time} onChange={() => setSelectedTime(slot.time)} />
                              {slot.time}
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {selectedService && visibleProducts.length ? (
                <section className="card shadow-sm mb-4">
                  <div className="card-body">
                    <h2 className="h5">加購商品</h2>
                    <p className="small text-muted">商品需店家確認庫存，預約確認後保留；到店付款。</p>
                    <div className="d-grid gap-2">
                      {visibleProducts.map((product) => (
                        <div key={product.id} className="d-flex flex-wrap align-items-center gap-2 border rounded p-2">
                          <label className="form-check-label flex-grow-1" htmlFor={`addon-${product.id}`}>
                            <input
                              id={`addon-${product.id}`}
                              className="form-check-input me-2"
                              type="checkbox"
                              checked={Number(addOns[product.id] || 0) > 0}
                              onChange={(event) => setAddOns((current) => ({
                                ...current,
                                [product.id]: event.target.checked ? 1 : 0,
                              }))}
                            />
                            {product.name}｜{CURRENCY_FORMATTER.format(product.price)}／{product.unit}｜可供申請 {product.stock_quantity} 件
                          </label>
                          {Number(addOns[product.id] || 0) > 0 ? (
                            <input
                              className="form-control"
                              style={{ maxWidth: '100px' }}
                              type="number"
                              min="1"
                              max={product.stock_quantity}
                              aria-label={`${product.name}加購數量`}
                              value={addOns[product.id]}
                              onChange={(event) => setAddOns((current) => ({ ...current, [product.id]: event.target.value }))}
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              ) : null}

              {selectedTime ? (
                <div className="d-grid mb-4">
                  <button type="button" className="btn btn-primary btn-lg" onClick={handleSubmitRequest} disabled={busy || !name.trim() || !phone.trim() || (!selectedPet && (!petName.trim() || !species))}>
                    {busy ? '正在送出申請...' : '送出預約申請'}
                  </button>
                  <small className="text-muted mt-2">送出後仍需店家確認；時段不會先行保留。</small>
                </div>
              ) : null}
                </>
              ) : null}

              <section className="card shadow-sm">
                <div className="card-body">
                  <h2 className="h5">我的預約申請</h2>
                  {!requests.length ? <p className="text-muted mb-0">目前沒有預約申請。</p> : (
                    <div className="list-group list-group-flush">
                      {requests.map((request) => (
                        <div key={request.appointment_id} className="list-group-item px-0">
                          <div className="d-flex flex-wrap justify-content-between gap-2">
                            <span>申請編號 {request.appointment_id}｜{request.appointment_date} {String(request.appointment_time).slice(0, 5)}</span>
                            <strong>{STATUS_LABELS[request.status] || '處理中'}</strong>
                          </div>
                          {request.status === 'PENDING' ? <small className="text-muted">時段尚未保留，需店家確認。</small> : null}
                          {request.status === 'AWAITING_CUSTOMER' ? (
                            <button type="button" className="btn btn-sm btn-primary mt-2" onClick={() => openOnboarding(request.appointment_id)} disabled={busy}>
                              補齊資料與簽署契約
                            </button>
                          ) : null}
                          {request.latest_change_request ? (
                            <div className={`alert ${request.latest_change_request.status === 'REJECTED' ? 'alert-warning' : 'alert-light'} border mt-2 mb-2`}>
                              <strong>
                                {request.latest_change_request.request_type === 'CANCEL' ? '取消' : '改期'}申請
                                {request.latest_change_request.status === 'PENDING' ? '待店家審核' : request.latest_change_request.status === 'APPROVED' ? '已同意' : '未同意'}
                              </strong>
                              <div className="small">
                                原時段：{request.latest_change_request.original_appointment_date} {String(request.latest_change_request.original_appointment_time).slice(0, 5)}
                                {request.latest_change_request.original_check_out ? `（原退房 ${String(request.latest_change_request.original_check_out).slice(0, 16)}）` : ''}
                                {request.latest_change_request.request_type === 'RESCHEDULE'
                                  ? ` → ${request.latest_change_request.proposed_appointment_date} ${String(request.latest_change_request.proposed_appointment_time).slice(0, 5)}${request.latest_change_request.proposed_check_out ? `（新退房 ${String(request.latest_change_request.proposed_check_out).slice(0, 16)}）` : ''}`
                                  : ''}
                              </div>
                              {request.latest_change_request.staff_note ? <div className="small">店家備註：{request.latest_change_request.staff_note}</div> : null}
                            </div>
                          ) : null}
                          {request.has_completed_order ? (
                            <small className="d-block text-muted mt-2">本次服務已完成結帳，無法再提出改期或取消。</small>
                          ) : null}
                          {['SCHEDULED', 'CONFIRMED'].includes(request.status)
                            && !request.has_completed_order
                            && request.latest_change_request?.status !== 'PENDING' ? (
                              <div className="mt-2">
                                {changeRequestAppointmentId === request.appointment_id ? (
                                  <form className="border rounded p-3" onSubmit={(event) => submitChangeRequest(event, request, 'RESCHEDULE')}>
                                    <h3 className="h6">提出改期申請</h3>
                                    <div className="row g-2">
                                      <div className="col-sm-6">
                                        <label className="form-label">新日期</label>
                                        <input className="form-control" type="date" min={getToday()} required value={proposedChangeDate} onChange={(event) => setProposedChangeDate(event.target.value)} />
                                      </div>
                                      <div className="col-sm-6">
                                        <label className="form-label">新時間</label>
                                        <input className="form-control" type="time" required value={proposedChangeTime} onChange={(event) => setProposedChangeTime(event.target.value)} />
                                      </div>
                                      {request.service_type === 'BOARDING' ? (
                                        <>
                                          <div className="col-sm-6">
                                            <label className="form-label">新退房日期</label>
                                            <input className="form-control" type="date" min={proposedChangeDate || getToday()} required value={proposedCheckOutDate} onChange={(event) => setProposedCheckOutDate(event.target.value)} />
                                          </div>
                                          <div className="col-sm-6">
                                            <label className="form-label">新退房時間</label>
                                            <input className="form-control" type="time" required value={proposedCheckOutTime} onChange={(event) => setProposedCheckOutTime(event.target.value)} />
                                          </div>
                                        </>
                                      ) : null}
                                      <div className="col-12">
                                        <label className="form-label">備註（選填）</label>
                                        <textarea className="form-control" rows="2" maxLength={500} value={changeNote} onChange={(event) => setChangeNote(event.target.value)} />
                                      </div>
                                    </div>
                                    <div className="d-flex gap-2 mt-3">
                                      <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>{busy ? '送出中...' : '送出改期申請'}</button>
                                      <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => setChangeRequestAppointmentId(null)} disabled={busy}>取消</button>
                                    </div>
                                  </form>
                                ) : (
                                  <div className="d-flex gap-2">
                                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => beginReschedule(request)}>提出改期</button>
                                    <button type="button" className="btn btn-sm btn-outline-danger" disabled={busy} onClick={(event) => submitChangeRequest(event, request, 'CANCEL')}>提出取消</button>
                                  </div>
                                )}
                              </div>
                            ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}
