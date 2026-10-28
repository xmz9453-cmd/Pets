import { useState } from 'react';
import { useRouter } from 'next/router';
import { confirmExistingBookingCustomer, createPublicOnboarding, getPublicBookingPets, getPublicBookingServices } from '../api/client';

const BOOKING_MESSAGES = {
  new: '新客預約流程尚未開放。',
  confirmationFailure: '手機號碼或姓名不正確，請確認後再試。',
  petLoadFailure: '無法載入寵物資料，請重新確認身分。',
};

const SPECIES_LABELS = { DOG: '狗', CAT: '貓' };

export default function BookingPage() {
  const router = useRouter();
  const publicShopId = router.isReady ? String(router.query.shop_id || '') : '';
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [showReturningForm, setShowReturningForm] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [pets, setPets] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [loadingPets, setLoadingPets] = useState(false);
  const [petsLoaded, setPetsLoaded] = useState(false);
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [loadingServices, setLoadingServices] = useState(false);
  const [servicesLoaded, setServicesLoaded] = useState(false);

  async function handleNewBooking() {
    setCreating(true);
    setError('');
    setMessage('');
    try {
      const result = await createPublicOnboarding(publicShopId);
      await router.push(`/onboarding/${encodeURIComponent(result.token)}`);
    } catch (createError) {
      setError(createError.code === 'CONTRACT_VERSION_NOT_AVAILABLE'
        ? '目前店家尚未設定可用的電子契約。請至「店家設定」的「電子契約版本」上傳 PDF、發布版本並設為目前使用版本後，再試一次。'
        : createError.message || '目前無法開始預約，請稍後再試。');
    } finally {
      setCreating(false);
    }
  }

  async function handleExistingCustomerConfirmation(event) {
    event.preventDefault();
    setConfirming(true);
    setLoadingPets(false);
    setPets([]);
    setSelectedPetId(null);
    setSelectedServiceId(null);
    setServices([]);
    setServicesLoaded(false);
    setPetsLoaded(false);
    setError('');
    setMessage('');
    try {
      await confirmExistingBookingCustomer(phone, name, publicShopId);
    } catch {
      setError(BOOKING_MESSAGES.confirmationFailure);
      setConfirming(false);
      return;
    }

    setLoadingPets(true);
    try {
      const result = await getPublicBookingPets(publicShopId);
      setPets(result.pets || []);
      setPetsLoaded(true);
    } catch {
      setError(BOOKING_MESSAGES.petLoadFailure);
    } finally {
      setLoadingPets(false);
      setConfirming(false);
    }
  }

  async function handlePetSelection(petId) {
    setSelectedPetId(petId);
    setSelectedServiceId(null);
    setServices([]);
    setServicesLoaded(false);
    setLoadingServices(true);
    setError('');

    try {
      const result = await getPublicBookingServices(petId, publicShopId);
      setServices(result.services || []);
      setServicesLoaded(true);
    } catch (serviceError) {
      const status = serviceError?.statusCode;
      if (status === 401) {
        setError(BOOKING_MESSAGES.petLoadFailure);
      } else {
        setError(serviceError?.message || '無法載入可預約服務，請稍後再試。');
      }
    } finally {
      setLoadingServices(false);
    }
  }

  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          <h1 className="text-center mb-4">我要預約</h1>
          <div className="d-grid gap-3">
            <button
              type="button"
              className="btn btn-outline-primary text-start p-4"
              onClick={handleNewBooking}
              disabled={creating}
            >
              <span className="d-block fs-4 fw-semibold mb-1">{creating ? '正在準備預約...' : '新客預約'}</span>
              <span className="d-block">第一次來店，還沒有資料</span>
            </button>
            <button
              type="button"
              className="btn btn-outline-primary text-start p-4"
              onClick={() => {
                setShowReturningForm(true);
                setError('');
                setMessage('');
              }}
            >
              <span className="d-block fs-4 fw-semibold mb-1">舊客預約</span>
              <span className="d-block">之前已經來過店裡</span>
            </button>
          </div>
          {showReturningForm ? (
            <form className="mt-4" onSubmit={handleExistingCustomerConfirmation}>
              <div className="mb-3">
                <label htmlFor="booking-phone" className="form-label">手機號碼</label>
                <input
                  id="booking-phone"
                  className="form-control"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                  disabled={confirming}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="booking-name" className="form-label">姓名</label>
                <input
                  id="booking-name"
                  className="form-control"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  disabled={confirming}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={confirming}>
                {confirming ? '確認中...' : '確認'}
              </button>
            </form>
          ) : null}
          {error ? (
            <div className="alert alert-danger mt-4 mb-0" role="alert">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="alert alert-info mt-4 mb-0" role="status" aria-live="polite">
              {message}
            </div>
          ) : null}
          {loadingPets ? (
            <p className="mt-4" role="status">正在載入寵物資料...</p>
          ) : pets.length > 0 ? (
            <section className="mt-4" aria-labelledby="booking-pet-heading">
              <h2 id="booking-pet-heading" className="h5">請選擇要預約的寵物</h2>
              <div className="d-grid gap-2">
                {pets.map((pet) => (
                  <label key={pet.id} className="card p-3">
                    <span className="d-flex align-items-start gap-2">
                      <input
                        type="radio"
                        name="booking-pet"
                        value={pet.id}
                        checked={selectedPetId === pet.id}
                        onChange={() => handlePetSelection(pet.id)}
                      />
                      <span>
                        <span className="d-block fw-semibold">{pet.name}</span>
                        <span className="d-block text-muted">
                          {SPECIES_LABELS[pet.species] || pet.species}
                          {pet.breed ? `・${pet.breed}` : ''}
                        </span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          ) : null}
          {!loadingPets && petsLoaded && pets.length === 0 ? (
            <p className="mt-4 text-muted" role="status">目前沒有可預約的寵物。</p>
          ) : null}
          {selectedPetId ? (
            <section className="mt-4" aria-labelledby="booking-service-heading">
              <h2 id="booking-service-heading" className="h5">請選擇要預約的服務</h2>
              {loadingServices ? (
                <p className="mt-3" role="status">正在載入可預約服務...</p>
              ) : services.length > 0 ? (
                <div className="d-grid gap-2">
                  {services.map((service) => (
                    <label key={service.id} className="card p-3">
                      <span className="d-flex align-items-start gap-2">
                        <input
                          type="radio"
                          name="booking-service"
                          value={service.id}
                          checked={selectedServiceId === service.id}
                          onChange={() => setSelectedServiceId(service.id)}
                        />
                        <span>
                          <span className="d-block fw-semibold">{service.name}</span>
                          <span className="d-block text-muted">{service.type === 'GROOMING' ? '美容' : '住宿'}</span>
                          <span className="d-block text-muted">
                            {new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(service.price)}／{service.unit}
                          </span>
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              ) : null}
              {!loadingServices && servicesLoaded && services.length === 0 ? (
                <p className="mt-3 text-muted" role="status">目前沒有可預約的服務。</p>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
