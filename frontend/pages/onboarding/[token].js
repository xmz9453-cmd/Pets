import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import {
  API_BASE_URL,
  getPublicOnboardingAvailability,
  getPublicOnboarding,
  resolveOnboardingCustomer,
  resolveOnboardingPet,
  savePublicOnboarding,
  searchOnboardingCustomers,
  searchOnboardingPets,
  submitPublicOnboarding,
} from '../../api/client';

const EMPTY_DATA = {
  customer: {
    name: '', phone: '', address: '', line_account: '', id_number: '',
    emergency_contact: '', emergency_phone: '', note: '',
  },
  pet: {
    name: '', species: '', gender: 'UNKNOWN', breed: '', weight: '',
    chip_number: '', personality: [], medical_history: [], other_history: '', note: '',
  },
  appointment: {
    appointment_date: '',
    appointment_time: '',
    service_id: '',
    check_out_date: '',
    check_out_time: '',
  },
};

const CUSTOMER_LABELS = {
  name: '姓名', phone: '聯絡電話', address: '聯絡地址', line_account: 'LINE 帳號',
  id_number: '身分證字號', emergency_contact: '緊急聯絡人',
  emergency_phone: '緊急聯絡電話', note: '備註',
};
const PET_LABELS = {
  name: '寵物名字', species: '寵物種類', gender: '性別', breed: '品種',
  weight: '體重（公斤）', chip_number: '晶片號碼', note: '備註',
};
const personalityOptionsBySpecies = {
  DOG: ['親近人', '親近狗', '會咬人', '會咬狗', '容易緊張', '有攻擊性', '不會咬人', '不會咬狗'],
  CAT: ['親近人', '親近貓', '會咬人', '會咬貓', '容易緊張', '有攻擊性', '不會咬人', '不會咬貓'],
};
const medicalHistoryOptions = ['心臟病', '氣喘', '氣管塌陷', '白內障', '癲癇', '心絲蟲', '艾利希體', '腹膜炎', '腹積水', '手術外傷未癒合', '髖關節問題', '骨折', '腸炎', '血便', '血尿', '懷孕', '傳染性疾病', '其他'];

function toArray(value) {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined && item !== null && String(item).trim() !== '')
      .map((item) => String(item).trim());
  }
  if (value === undefined || value === null || value === '') return [];
  const stringValue = String(value).trim();
  if (!stringValue) return [];
  try {
    const parsed = JSON.parse(stringValue);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => item !== undefined && item !== null && String(item).trim() !== '')
        .map((item) => String(item).trim());
    }
  } catch (error) {
    // Fall through to support existing comma-separated temporary values.
  }
  return stringValue.split(',').map((item) => item.trim()).filter(Boolean);
}

export default function PublicOnboardingPage() {
  const router = useRouter();
  const { token } = router.query;
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const loadedRef = useRef(false);
  const dataVersionRef = useRef(0);
  const [data, setData] = useState(EMPTY_DATA);
  const [onboarding, setOnboarding] = useState(null);
  const [contract, setContract] = useState(null);
  const [services, setServices] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [customerResolution, setCustomerResolution] = useState('UNRESOLVED');
  const [petResolution, setPetResolution] = useState('UNRESOLVED');
  const [customerQuery, setCustomerQuery] = useState('');
  const [petQuery, setPetQuery] = useState('');
  const [customerCandidates, setCustomerCandidates] = useState([]);
  const [petCandidates, setPetCandidates] = useState([]);
  const [signatureReady, setSignatureReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const updateField = useCallback((section, field, value) => {
    dataVersionRef.current += 1;
    setData((current) => ({ ...current, [section]: { ...current[section], [field]: value } }));
    setDirty(true);
  }, []);

  const save = useCallback(async () => {
    if (!token || !dirty) return;
    const savedVersion = dataVersionRef.current;
    setSaving(true);
    try {
      await savePublicOnboarding(token, data);
      if (savedVersion === dataVersionRef.current) setDirty(false);
      setError('');
    } catch (saveError) {
      setError(saveError.message || '自動儲存失敗');
    } finally {
      setSaving(false);
    }
  }, [data, dirty, token]);

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    getPublicOnboarding(token).then((result) => {
      if (!active) return;
      setOnboarding(result.onboarding);
      setContract(result.contract);
      setServices(result.services || []);
      setData({
        customer: { ...EMPTY_DATA.customer, ...result.onboarding.customer },
        pet: {
          ...EMPTY_DATA.pet,
          ...result.onboarding.pet,
          personality: toArray(result.onboarding.pet.personality),
          medical_history: toArray(result.onboarding.pet.medical_history),
        },
        appointment: { ...EMPTY_DATA.appointment, ...result.onboarding.appointment },
      });
      setCustomerResolution(result.onboarding.customer_resolution);
      setPetResolution(result.onboarding.pet_resolution);
      loadedRef.current = true;
    }).catch((loadError) => {
      if (active) setError(loadError.message || '無法載入補件資料，請重新登入後再試。');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (!loadedRef.current || !dirty) return undefined;
    const timeout = setTimeout(save, 600);
    return () => clearTimeout(timeout);
  }, [data, dirty, save]);

  function getContext(event) {
    const canvas = canvasRef.current;
    const bounds = canvas.getBoundingClientRect();
    const scaleX = canvas.width / bounds.width;
    const scaleY = canvas.height / bounds.height;
    return {
      canvas,
      x: (event.clientX - bounds.left) * scaleX,
      y: (event.clientY - bounds.top) * scaleY,
    };
  }

  function beginDrawing(event) {
    const { canvas, x, y } = getContext(event);
    const context = canvas.getContext('2d');
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(x, y);
  }

  function draw(event) {
    if (!drawingRef.current) return;
    const { canvas, x, y } = getContext(event);
    const context = canvas.getContext('2d');
    context.strokeStyle = '#111827';
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineTo(x, y);
    context.stroke();
    setSignatureReady(true);
  }

  function endDrawing() {
    drawingRef.current = false;
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setSignatureReady(false);
  }

  async function findCandidates(kind) {
    setError('');
    try {
      const result = kind === 'customer'
        ? await searchOnboardingCustomers(token, customerQuery)
        : await searchOnboardingPets(token, petQuery);
      if (kind === 'customer') setCustomerCandidates(result.candidates || []);
      else setPetCandidates(result.candidates || []);
    } catch (searchError) {
      setError(searchError.message || '搜尋資料失敗，請稍後再試。');
    }
  }

  async function chooseResolution(kind, resolution, candidateKey) {
    setError('');
    try {
      const action = kind === 'customer' ? resolveOnboardingCustomer : resolveOnboardingPet;
      await action(token, { resolution, ...(candidateKey ? { candidate_key: candidateKey } : {}) });
      if (kind === 'customer') setCustomerResolution(resolution);
      else setPetResolution(resolution);
    } catch (resolveError) {
      setError(resolveError.message || '確認資料失敗，請稍後再試。');
    }
  }

  async function findAvailableSlots() {
    const selectedService = services.find((service) => Number(service.id) === Number(data.appointment.service_id));
    if (!selectedService || !data.appointment.appointment_date) {
      setError('請先選擇服務及日期。');
      return;
    }
    if (selectedService.type === 'BOARDING' && (!data.appointment.check_out_date || !data.appointment.check_out_time)) {
      setError('住宿服務請先選擇退房日期與時間。');
      return;
    }
    setLoadingSlots(true);
    setError('');
    setAvailableSlots([]);
    try {
      const filters = {
        service_id: String(selectedService.id),
        date: data.appointment.appointment_date,
      };
      if (selectedService.type === 'BOARDING') {
        filters.check_out_date = data.appointment.check_out_date;
        filters.check_out_time = data.appointment.check_out_time;
      }
      const result = await getPublicOnboardingAvailability(token, filters);
      setAvailableSlots(result.slots || []);
      if (!result.slots?.some((slot) => slot.time === data.appointment.appointment_time)) {
        updateField('appointment', 'appointment_time', '');
      }
      if (!result.slots?.length) setError('這個日期目前沒有可申請的時段，請改選其他日期。');
    } catch (availabilityError) {
      setError(availabilityError.message || '目前無法查詢可申請時段。');
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      if (dirty) await savePublicOnboarding(token, data);
      if (customerResolution === 'UNRESOLVED' || petResolution === 'UNRESOLVED') {
        throw new Error('請先確認客戶與寵物資料。');
      }
      if (!signatureReady) throw new Error('請先簽署電子契約。');
      await submitPublicOnboarding(token, canvasRef.current.toDataURL('image/png'));
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError.message || '送出失敗');
    }
  }

  if (loading) {
    return <main className="container py-4"><p>載入中...</p></main>;
  }
  if (submitted) {
    return <main className="container py-5"><div className="alert alert-success"><h1 className="h4">資料與電子契約已送出</h1><p className="mb-0">{onboarding?.is_member_booking ? '預約已正式確認。商品請於到店付款；取消或改期請聯絡店家。' : '預約申請已送出，請等待店家確認。時段尚未保留；取消或改期請聯絡店家。'}</p></div></main>;
  }

  const unavailable = !onboarding || ['COMPLETED', 'EXPIRED'].includes(onboarding.status);
  return (
    <main className="container py-4" style={{ maxWidth: 900 }}>
      <h1 className="mb-3">客戶資料與電子契約</h1>
      {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
      {unavailable ? (
        <div className="alert alert-warning">{onboarding?.status === 'COMPLETED' ? '此補件資料已完成。' : '此補件資料已過期或無法使用。'}</div>
      ) : (
        <>
          <p className="text-muted">請於 {String(onboarding.expires_at).replace('T', ' ').slice(0, 16)} 前完成。</p>
          <form onSubmit={handleSubmit}>
            <section className="card mb-4">
              <div className="card-header fw-semibold">客戶資料</div>
              <div className="card-body row g-3">
                {Object.entries(CUSTOMER_LABELS).map(([field, label]) => (
                  <div className={field === 'note' || field === 'address' ? 'col-12' : 'col-md-6'} key={field}>
                    <label className="form-label">{label}</label>
                    {field === 'note' || field === 'address' ? (
                      <textarea className="form-control" rows={2} required={onboarding.is_member_booking && field === 'address'} value={data.customer[field]} onChange={(event) => updateField('customer', field, event.target.value)} />
                    ) : (
                      <input className="form-control" required={(customerResolution === 'NEW' && ['name', 'phone'].includes(field))
                        || (onboarding.is_member_booking && ['name', 'phone', 'emergency_contact', 'emergency_phone'].includes(field))}
                      value={data.customer[field]} onChange={(event) => updateField('customer', field, event.target.value)} />
                    )}
                  </div>
                ))}
                {!onboarding.is_member_booking ? <div className="col-12 border-top pt-3">
                  <label className="form-label">搜尋既有客戶（姓名或電話）</label>
                  <div className="input-group">
                    <input className="form-control" value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} />
                    <button type="button" className="btn btn-outline-dark" onClick={() => findCandidates('customer')}>搜尋</button>
                  </div>
                  {customerCandidates.map((candidate) => (
                    <div className="d-flex align-items-center gap-2 mt-2" key={candidate.key}>
                      <span>{candidate.name}（{candidate.phone}）</span>
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => chooseResolution('customer', 'EXISTING', candidate.key)}>使用此客戶</button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-sm btn-outline-secondary mt-2" onClick={() => chooseResolution('customer', 'NEW')}>建立新客戶</button>
                  <span className="ms-2 small text-muted">資料連結狀態：{customerResolution === 'EXISTING' ? '已連結既有資料' : customerResolution === 'NEW' ? '新增資料' : '尚未確認'}</span>
                </div> : <p className="col-12 small text-muted mb-0">這些資料已連結至您的會員預約，不會搜尋或自動合併其他客戶資料。</p>}
              </div>
            </section>

            <section className="card mb-4">
              <div className="card-header fw-semibold">寵物資料</div>
              <div className="card-body row g-3">
                {Object.entries(PET_LABELS).map(([field, label]) => (
                  <div className={['personality', 'medical_history', 'note'].includes(field) ? 'col-12' : 'col-md-6'} key={field}>
                    <label className="form-label">{label}{field === 'name' ? '（必填）' : ''}</label>
                    {field === 'species' || field === 'gender' ? (
                      <select className="form-select" value={data.pet[field]} onChange={(event) => {
                        const species = event.target.value;
                        updateField('pet', field, species);
                        if (field === 'species') {
                          updateField('pet', 'personality', toArray(data.pet.personality).filter((value) => (personalityOptionsBySpecies[species] || []).includes(value)));
                        }
                      }}>
                        {(field === 'species' ? [['', '請選擇'], ['DOG', '狗'], ['CAT', '貓']] : [['UNKNOWN', '未指定'], ['MALE', '公'], ['FEMALE', '母']]).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                      </select>
                    ) : field === 'note' ? (
                      <textarea className="form-control" rows={2} value={data.pet[field]} onChange={(event) => updateField('pet', field, event.target.value)} />
                    ) : (
                      <input className="form-control" required={(field === 'name' && petResolution === 'NEW')
                        || (onboarding.is_member_booking && field === 'weight' && services.find((service) => Number(service.id) === Number(data.appointment.service_id))?.type === 'GROOMING')}
                      type={field === 'weight' ? 'number' : 'text'} step={field === 'weight' ? '0.1' : undefined} value={data.pet[field]} onChange={(event) => updateField('pet', field, event.target.value)} />
                    )}
                  </div>
                ))}
                <div className="col-12">
                  <label className="form-label">個性</label>
                  <div className="d-flex flex-wrap gap-2">
                    {(personalityOptionsBySpecies[data.pet.species] || []).map((option) => {
                      const selected = toArray(data.pet.personality).includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={selected}
                          className={`btn btn-sm pet-tag-button ${selected ? 'selected' : ''}`}
                          onClick={() => updateField('pet', 'personality', selected
                            ? data.pet.personality.filter((value) => value !== option)
                            : [...data.pet.personality, option])}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="col-12">
                  <label className="form-label">病史</label>
                  <div className="d-flex flex-wrap gap-2">
                    {medicalHistoryOptions.map((option) => {
                      const selected = toArray(data.pet.medical_history).includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={selected}
                          className={`btn btn-sm pet-tag-button ${selected ? 'selected' : ''}`}
                          onClick={() => updateField('pet', 'medical_history', selected
                            ? data.pet.medical_history.filter((value) => value !== option)
                            : [...data.pet.medical_history, option])}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  {data.pet.medical_history.includes('其他') ? (
                    <div className="mt-2">
                      <label className="form-label">其他病史</label>
                      <textarea className="form-control" rows="2" maxLength="1000" value={data.pet.other_history} onChange={(event) => updateField('pet', 'other_history', event.target.value)} />
                    </div>
                  ) : null}
                </div>
                {!onboarding.is_member_booking ? <div className="col-12 border-top pt-3">
                  <label className="form-label">搜尋既有寵物（名稱或晶片號碼）</label>
                  <div className="input-group">
                    <input className="form-control" value={petQuery} onChange={(event) => setPetQuery(event.target.value)} />
                    <button type="button" className="btn btn-outline-dark" onClick={() => findCandidates('pet')}>搜尋</button>
                  </div>
                  {petCandidates.map((candidate) => (
                    <div className="d-flex align-items-center gap-2 mt-2" key={candidate.key}>
                      <span>{candidate.name}（{candidate.species === 'DOG' ? '狗' : '貓'}{candidate.breed ? `，${candidate.breed}` : ''}）</span>
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => chooseResolution('pet', 'EXISTING', candidate.key)}>使用此寵物</button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-sm btn-outline-secondary mt-2" onClick={() => chooseResolution('pet', 'NEW')}>建立新寵物</button>
                  <span className="ms-2 small text-muted">資料連結狀態：{petResolution === 'EXISTING' ? '已連結既有資料' : petResolution === 'NEW' ? '新增資料' : '尚未確認'}</span>
                </div> : <p className="col-12 small text-muted mb-0">這筆寵物資料已連結至您的會員預約，不會搜尋或自動合併其他寵物資料。</p>}
              </div>
            </section>

            {onboarding.is_member_booking ? (
              <section className="card mb-4">
                <div className="card-header fw-semibold">預約資料</div>
                <div className="card-body">
                  <p className="mb-1">日期與時間：{data.appointment.appointment_date} {String(data.appointment.appointment_time).slice(0, 5)}</p>
                  <p className="mb-1">服務項目：{services.find((service) => Number(service.id) === Number(data.appointment.service_id))?.name || '已選擇的服務'}</p>
                  {data.appointment.check_out_date ? <p className="mb-1">退房時間：{data.appointment.check_out_date} {String(data.appointment.check_out_time).slice(0, 5)}</p> : null}
                  <p className="small text-muted mb-0">此預約已由店家接受並保留時段與必要資源；完成資料與契約後將正式確認。取消或改期請聯絡店家。</p>
                </div>
              </section>
            ) : (
            <section className="card mb-4">
              <div className="card-header fw-semibold">預約資料</div>
              <div className="card-body row g-3">
                <div className="col-md-4"><label className="form-label">預約／入住日期</label><input required type="date" className="form-control" value={data.appointment.appointment_date} onChange={(event) => {
                  updateField('appointment', 'appointment_date', event.target.value);
                  updateField('appointment', 'appointment_time', '');
                  setAvailableSlots([]);
                }} /></div>
                <div className="col-md-4"><label className="form-label">服務項目</label><select required className="form-select" value={data.appointment.service_id} onChange={(event) => {
                  updateField('appointment', 'service_id', event.target.value);
                  updateField('appointment', 'check_out_date', '');
                  updateField('appointment', 'check_out_time', '');
                  updateField('appointment', 'appointment_time', '');
                  setAvailableSlots([]);
                }}><option value="">選擇服務</option>{services.filter((service) => service.species === 'BOTH' || !data.pet.species || service.species === data.pet.species).map((service) => <option key={service.id} value={service.id}>{service.type === 'BOARDING' ? '住宿｜' : '美容｜'}{service.name}</option>)}</select></div>
                {services.find((service) => Number(service.id) === Number(data.appointment.service_id))?.type === 'BOARDING' ? (
                  <>
                    <div className="col-md-4"><label className="form-label">退房日期</label><input required type="date" min={data.appointment.appointment_date || undefined} className="form-control" value={data.appointment.check_out_date} onChange={(event) => {
                      updateField('appointment', 'check_out_date', event.target.value);
                      updateField('appointment', 'appointment_time', '');
                      setAvailableSlots([]);
                    }} /></div>
                    <div className="col-md-4"><label className="form-label">預計退房時間</label><input required type="time" className="form-control" value={data.appointment.check_out_time} onChange={(event) => {
                      updateField('appointment', 'check_out_time', event.target.value);
                      updateField('appointment', 'appointment_time', '');
                      setAvailableSlots([]);
                    }} /></div>
                  </>
                ) : null}
                <div className="col-12">
                  <button type="button" className="btn btn-outline-primary" onClick={findAvailableSlots} disabled={loadingSlots || !data.appointment.appointment_date || !data.appointment.service_id}>
                    {loadingSlots ? '查詢中...' : '查詢可申請時段'}
                  </button>
                </div>
                {availableSlots.length ? (
                  <div className="col-12">
                    <label className="form-label">可申請時段</label>
                    <div className="d-flex flex-wrap gap-2">
                      {availableSlots.map((slot) => (
                        <label key={slot.time} className={`btn ${data.appointment.appointment_time === slot.time ? 'btn-primary' : 'btn-outline-primary'}`}>
                          <input className="visually-hidden" type="radio" name="onboarding-appointment-time" value={slot.time} checked={data.appointment.appointment_time === slot.time} onChange={() => updateField('appointment', 'appointment_time', slot.time)} />
                          {slot.time}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="col-12"><p className="small text-muted mb-0">此為預約申請，需由店家確認；選擇時段不代表名額已保留。取消或改期請聯絡店家。</p></div>
              </div>
            </section>
            )}

            <section className="card mb-4">
              <div className="card-header fw-semibold">{contract?.service_type === 'BOARDING' ? '住宿電子契約' : contract?.service_type === 'GROOMING' ? '美容電子契約' : '電子契約'} {contract ? `（${contract.version}）` : ''}</div>
              <div className="card-body">
                {contract ? <iframe title="電子契約文件" src={`${API_BASE_URL}/api/public/onboardings/${encodeURIComponent(token)}/contract.pdf`} className="w-100 border mb-3" style={{ height: 480 }} /> : null}
                <label className="form-label">請在下方簽名</label>
                <canvas
                  ref={canvasRef}
                  width="800"
                  height="240"
                  className="w-100 border rounded"
                  style={{ height: 240, touchAction: 'none', background: '#fff' }}
                  onPointerDown={beginDrawing}
                  onPointerMove={draw}
                  onPointerUp={endDrawing}
                  onPointerCancel={endDrawing}
                />
                <button type="button" className="btn btn-sm btn-outline-secondary mt-2" onClick={clearSignature}>清除簽名</button>
              </div>
            </section>
            <div className="d-flex align-items-center gap-3">
              <button type="submit" className="btn btn-dark" disabled={saving || !signatureReady || customerResolution === 'UNRESOLVED' || petResolution === 'UNRESOLVED'}>確認並送出</button>
              <span className="small text-muted">{saving ? '正在儲存...' : dirty ? '資料尚未儲存' : '自動儲存完成'}</span>
            </div>
          </form>
        </>
      )}
    </main>
  );
}
