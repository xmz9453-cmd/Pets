import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  getCurrentStaff,
  getCustomer,
  getCustomerContractPdfUrl,
  getCustomerContractSignatureUrl,
  getCustomerServicePackages,
  getPetBreedPrices,
  getServicePackagePlans,
  linkCustomerToMember,
  purchaseServicePackage,
} from '../../api/client';

const statusLabels = { ACTIVE: '啟用', INACTIVE: '停用' };
const packageStatusLabels = { ACTIVE: '使用中', EXHAUSTED: '已用完', EXPIRED: '已到期', VOID: '已退款' };
const packageTransactionLabels = { PURCHASE: '購買入帳', REDEEM: '服務扣次', REFUND: '退款', ADJUSTMENT: '人工調整' };

function ServicePackageCard({ servicePackage }) {
  const isActive = servicePackage.status === 'ACTIVE';

  return (
    <article className={`service-package-card${isActive ? '' : ' service-package-card-archived'}`}>
      <div className="d-flex justify-content-between align-items-start gap-3">
        <div>
          <div className="service-package-card-eyebrow">{servicePackage.pet_name} 的包月卡</div>
          <h3 className="h5 mb-1">{servicePackage.plan_name}</h3>
          <div className="small text-muted">有效期限：{servicePackage.starts_on} 至 {servicePackage.expires_on}</div>
        </div>
        <span className={`badge ${isActive ? 'bg-success' : servicePackage.status === 'VOID' ? 'bg-danger' : 'bg-secondary'}`}>
          {packageStatusLabels[servicePackage.status] || servicePackage.status}
        </span>
      </div>
      <div className="service-package-stamps">
        {servicePackage.is_point_package ? (
          <div className="service-package-stamp-row">
            <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
              <span className="fw-semibold">包月點數</span>
              <span className="small text-muted">剩餘 {servicePackage.remaining_uses}／{servicePackage.purchased_uses} 點</span>
            </div>
            <div className="service-package-stamp-list" aria-label={`包月點數：剩餘 ${servicePackage.remaining_uses} 點，共 ${servicePackage.purchased_uses} 點`}>
              {Array.from({ length: servicePackage.purchased_uses }, (_, index) => {
                const used = index >= servicePackage.remaining_uses;
                return <span className={`service-package-stamp${used ? ' service-package-stamp-used' : ''}`} key={index} aria-label={used ? '已使用' : '尚未使用'}>{used ? '✓' : index + 1}</span>;
              })}
            </div>
          </div>
        ) : servicePackage.service_balances.map((balance) => (
          <div className="service-package-stamp-row" key={balance.service_id}>
            <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
              <span className="fw-semibold">{balance.service_name}</span>
              <span className="small text-muted">剩餘 {balance.remaining_uses}／{balance.purchased_uses} 次</span>
            </div>
            <div className="service-package-stamp-list" aria-label={`${balance.service_name}：剩餘 ${balance.remaining_uses} 次，共 ${balance.purchased_uses} 次`}>
              {Array.from({ length: balance.purchased_uses }, (_, index) => {
                const used = index >= balance.remaining_uses;
                return (
                  <span
                    className={`service-package-stamp${used ? ' service-package-stamp-used' : ''}`}
                    key={`${balance.service_id}-${index}`}
                    aria-label={used ? '已使用' : '尚未使用'}
                  >
                    {used ? '✓' : index + 1}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {servicePackage.transactions?.length ? (
        <details className="service-package-history">
          <summary>查看使用紀錄</summary>
          <ul className="list-unstyled small mb-0 mt-2">
            {servicePackage.transactions.map((transaction) => (
              <li className="mb-1" key={transaction.id}>
                {packageTransactionLabels[transaction.transaction_type]}{transaction.service_name ? `（${transaction.service_name}）` : ''} {transaction.change_uses > 0 ? '+' : ''}{transaction.change_uses} {servicePackage.is_point_package ? '點' : '次'}・{transaction.created_at}
                {transaction.appointment_id ? `・預約 #${transaction.appointment_id}` : ''}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  );
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [customer, setCustomer] = useState(null);
  const [servicePackages, setServicePackages] = useState([]);
  const [packagePlans, setPackagePlans] = useState([]);
  const [breedPrices, setBreedPrices] = useState([]);
  const [packagePetId, setPackagePetId] = useState('');
  const [packagePlanId, setPackagePlanId] = useState('');
  const [quotedBathPrice, setQuotedBathPrice] = useState('');
  const [packagePaymentMethod, setPackagePaymentMethod] = useState('CASH');
  const [purchasingPackage, setPurchasingPackage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [memberId, setMemberId] = useState('');
  const [linkingMember, setLinkingMember] = useState(false);
  const [success, setSuccess] = useState('');

  async function load() {
    if (!id) {
      return;
    }

    try {
      setLoading(true);
      const [result, packageResult, planResult, breedPriceResult] = await Promise.all([
        getCustomer(id),
        getCustomerServicePackages(id),
        getServicePackagePlans({ status: 'ACTIVE' }),
        getPetBreedPrices(),
      ]);
      setCustomer(result.customer);
      setServicePackages(packageResult.packages || []);
      setPackagePlans(planResult.plans || []);
      setBreedPrices(breedPriceResult.breeds || []);
      setPackagePetId((current) => {
        const activePets = result.customer.pets?.filter((pet) => pet.status === 'ACTIVE') || [];
        return activePets.some((pet) => String(pet.id) === current)
          ? current
          : String(activePets[0]?.id || '');
      });
      setPackagePlanId((current) => (
        planResult.plans?.some((plan) => String(plan.id) === current)
          ? current
          : String(planResult.plans?.[0]?.id || '')
      ));
      setError('');
    } catch (loadError) {
      setError(loadError.message || '客戶資料載入失敗');
    } finally {
      setLoading(false);
    }
  }

  async function handleLinkMember(event) {
    event.preventDefault();
    setLinkingMember(true);
    setError('');
    setSuccess('');
    try {
      await linkCustomerToMember(id, memberId);
      setSuccess('已完成會員與客戶資料連結。');
      setMemberId('');
    } catch (linkError) {
      setError(linkError.message || '會員連結失敗，請確認資料後再試。');
    } finally {
      setLinkingMember(false);
    }
  }

  async function handlePurchasePackage(event) {
    event.preventDefault();
    setPurchasingPackage(true);
    setError('');
    setSuccess('');
    try {
      const result = await purchaseServicePackage({
        customer_id: Number(id),
        pet_id: Number(packagePetId),
        plan_id: Number(selectedPlan?.id),
        payment_method: packagePaymentMethod,
        quoted_bath_price: Number(quotedBathPrice),
      });
      setSuccess(`包月點數卡已售出，訂單 #${result.order_id}；5 點已入帳。`);
      await load();
    } catch (purchaseError) {
      setError(purchaseError.message || '包套購買失敗');
    } finally {
      setPurchasingPackage(false);
    }
  }

  useEffect(() => {
    getCurrentStaff().then(load).catch(() => router.replace('/login'));
  }, [id, router]);

  const selectedPet = customer?.pets?.find((pet) => String(pet.id) === packagePetId);
  const purchasablePlans = packagePlans.filter((plan) => (
    !selectedPet || plan.species === 'BOTH' || plan.species === selectedPet.species
  ));
  const selectedPlan = purchasablePlans.find((plan) => String(plan.id) === packagePlanId) || purchasablePlans[0];
  const selectedPetBreedPrice = breedPrices.find((breedPrice) => breedPrice.breed === selectedPet?.breed);
  const requiresManualBathPrice = selectedPet?.species === 'DOG'
    && breedPrices.length > 0
    && selectedPetBreedPrice?.bath_price == null;
  const minimumBathPrice = selectedPetBreedPrice?.bath_price ?? selectedPlan?.bath_service_price ?? 0;
  const calculatedPackagePrice = Number(quotedBathPrice || 0) * 4;

  useEffect(() => {
    if (!selectedPet) return;
    const applicablePlan = packagePlans.find((plan) => (
      plan.species === 'BOTH' || plan.species === selectedPet.species
    ));
    setPackagePlanId(String(applicablePlan?.id || ''));
    const breedPrice = breedPrices.find((item) => item.breed === selectedPet.breed);
    setQuotedBathPrice(breedPrice?.bath_price != null
      ? String(breedPrice.bath_price)
      : selectedPet.species === 'DOG' && breedPrices.length > 0
        ? ''
        : String(applicablePlan?.bath_service_price || ''));
  }, [packagePetId, packagePlans, breedPrices]);

  if (loading) {
    return (
      <main className="container py-4">
        <p className="text-muted mb-0">客戶資料載入中...</p>
      </main>
    );
  }

  if (!customer) {
    return (
      <main className="container py-4">
        <div className="alert alert-danger" role="alert">
          {error || '找不到客戶資料'}
        </div>
        <button type="button" className="btn btn-outline-dark" onClick={() => router.push('/customers')}>
          返回客戶列表
        </button>
      </main>
    );
  }

  return (
    <main className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-1">{customer.name}</h1>
          <p className="text-muted mb-0">客戶詳細資料</p>
        </div>
        <button type="button" className="btn btn-outline-dark" onClick={() => router.push('/customers')}>
          返回客戶列表
        </button>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">{error}</div>
      ) : null}
      {success ? (
        <div className="alert alert-success" role="status">{success}</div>
      ) : null}

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="foundation-panel">
            <h2 className="h5 mb-3">基本資料</h2>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="foundation-label">姓名</div>
                <div className="foundation-status">{customer.name}</div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">狀態</div>
                <div className="foundation-status">
                  <span className={`badge ${customer.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>
                    {statusLabels[customer.status] || customer.status}
                  </span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">電話</div>
                <div className="foundation-status">{customer.phone || '未填寫'}</div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">寵物數量</div>
                <div className="foundation-status">{customer.pet_count || 0}</div>
              </div>
              <div className="col-12">
                <div className="foundation-label">地址</div>
                <div className="foundation-status">{customer.address || '未填寫'}</div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">LINE 帳號</div>
                <div className="foundation-status">{customer.line_id || '未填寫'}</div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">身分證字號</div>
                <div className="foundation-status">{customer.id_card_number || '未填寫'}</div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">緊急聯絡人</div>
                <div className="foundation-status">{customer.emergency_contact_name || '未填寫'}</div>
              </div>
              <div className="col-md-6">
                <div className="foundation-label">緊急聯絡電話</div>
                <div className="foundation-status">{customer.emergency_contact_phone || '未填寫'}</div>
              </div>
              <div className="col-12">
                <div className="foundation-label">備註</div>
                <div className="foundation-status">{customer.note || '未填寫'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="foundation-panel">
            <h2 className="h5 mb-3">寵物關聯</h2>
            {customer.pets && customer.pets.length > 0 ? (
              <ul className="list-group list-group-flush">
                {customer.pets.map((pet) => (
                  <li key={pet.id} className="list-group-item px-0 d-flex justify-content-between align-items-center">
                    <span>{pet.name}</span>
                    <span className="small text-muted">{pet.species}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted mb-0">目前尚無關聯寵物</p>
            )}
          </div>
          <div className="foundation-panel mt-4">
            <h2 className="h5 mb-3">會員資料連結</h2>
            <p className="small text-muted">
              請先核對會員本人提供的會員編號。請勿依姓名、電子郵件或電話自動連結。
            </p>
            <form onSubmit={handleLinkMember}>
              <label className="form-label" htmlFor="customer-member-id">會員編號</label>
              <input
                id="customer-member-id"
                className="form-control mb-3"
                type="number"
                min="1"
                step="1"
                required
                value={memberId}
                onChange={(event) => setMemberId(event.target.value)}
              />
              <button type="submit" className="btn btn-outline-dark" disabled={linkingMember}>
                {linkingMember ? '連結中…' : '完成連結'}
              </button>
            </form>
          </div>
        </div>

        <div className="col-12">
          <div className="foundation-panel">
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
              <div>
                <h2 className="h5 mb-1">包月點數卡</h2>
                <p className="small text-muted mb-0">每張卡 5 點，限購買時選定的寵物；洗澡扣 1 點，大美容扣 2 點，服務結帳時扣點。</p>
              </div>
              <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => router.push('/service-packages')}>管理方案</button>
            </div>
            {servicePackages.length ? (
              <>
                <div className="service-package-card-grid mb-4">
                  {servicePackages.filter((servicePackage) => servicePackage.status === 'ACTIVE').map((servicePackage) => (
                    <ServicePackageCard key={servicePackage.id} servicePackage={servicePackage} />
                  ))}
                </div>
                {servicePackages.some((servicePackage) => servicePackage.status !== 'ACTIVE') ? (
                  <details className="mb-4">
                    <summary className="fw-semibold">封存卡片（{servicePackages.filter((servicePackage) => servicePackage.status !== 'ACTIVE').length}）</summary>
                    <div className="service-package-card-grid mt-3">
                      {servicePackages.filter((servicePackage) => servicePackage.status !== 'ACTIVE').map((servicePackage) => (
                        <ServicePackageCard key={servicePackage.id} servicePackage={servicePackage} />
                      ))}
                    </div>
                  </details>
                ) : null}
              </>
            ) : <p className="text-muted">此客戶目前沒有美容包月卡紀錄。</p>}
            <h3 className="h6">銷售美容包月卡</h3>
            {customer.pets?.filter((pet) => pet.status === 'ACTIVE').length && purchasablePlans.length ? (
              <form onSubmit={handlePurchasePackage}>
                <div className="row g-3 align-items-end">
                  <div className="col-md-2">
                    <label className="form-label" htmlFor="package-pet">寵物</label>
                    <select id="package-pet" className="form-select" required value={packagePetId} onChange={(event) => {
                      const nextPetId = event.target.value;
                      setPackagePetId(nextPetId);
                    }}>
                      {customer.pets.filter((pet) => pet.status === 'ACTIVE').map((pet) => <option key={pet.id} value={pet.id}>{pet.name}（{pet.species === 'DOG' ? '狗' : '貓'}）</option>)}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">美容包月卡</label>
                    <div className="form-control bg-light">固定 5 點・50 天・洗澡扣 1／電剪扣 2／全手扣 3 點</div>
                  </div>
                  <div className="col-md-3">
                    {selectedPet ? (
                      <>
                        <label className="form-label" htmlFor="package-bath-price">洗澡實際報價（包月計價基準）</label>
                        <input id="package-bath-price" className="form-control" type="number" min={requiresManualBathPrice ? 1 : minimumBathPrice} step="1" required readOnly={Boolean(selectedPetBreedPrice && !selectedPetBreedPrice.bath_price_is_starting)} value={quotedBathPrice} onChange={(event) => setQuotedBathPrice(event.target.value)} />
                        <div className="form-text">
                          {requiresManualBathPrice
                            ? '此品種沒有固定價，請輸入本次洗澡報價。'
                            : selectedPetBreedPrice?.bath_price_is_starting
                              ? `價目起價 ${minimumBathPrice} 元；實際報價可較高。`
                              : `此品種固定洗澡價 ${minimumBathPrice} 元。`}
                          {' '}包月售價＝洗澡報價 × 4。
                        </div>
                      </>
                    ) : null}
                  </div>
                  <div className="col-md-2">
                    <label className="form-label" htmlFor="package-payment-method">付款方式</label>
                    <select id="package-payment-method" className="form-select" value={packagePaymentMethod} onChange={(event) => setPackagePaymentMethod(event.target.value)}>
                      <option value="CASH">現金</option>
                      <option value="CREDIT_CARD">信用卡</option>
                      <option value="BANK_TRANSFER">銀行轉帳</option>
                      <option value="MOBILE_PAYMENT">行動支付</option>
                    </select>
                  </div>
                  <div className="col-md-2 d-grid">
                    <button type="submit" className="btn btn-primary" disabled={purchasingPackage || !selectedPlan || !Number.isInteger(calculatedPackagePrice) || calculatedPackagePrice <= 0}>{purchasingPackage ? '處理中...' : `收款 $${calculatedPackagePrice.toLocaleString('zh-TW')}`}</button>
                  </div>
                </div>
              </form>
            ) : (
              <p className="small text-muted mb-0">{packagePlans.length ? '此寵物沒有適用的包月方案。' : '此店家尚未建立包月方案，或未開放包月銷售。'}</p>
            )}
          </div>
        </div>

        <div className="col-12">
          <div className="foundation-panel">
            <h2 className="h5 mb-3">電子契約</h2>
            {customer.contracts && customer.contracts.length > 0 ? (
              <div className="list-group list-group-flush">
                {customer.contracts.map((contract) => (
                  <div key={contract.id} className="list-group-item px-0">
                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                      <div>
                        <div className="fw-semibold">契約版本：{contract.version}</div>
                        <div className="small text-muted">簽署時間：{contract.agreed_at}</div>
                      </div>
                      <div className="d-flex flex-wrap gap-2">
                        <a
                          className="btn btn-sm btn-outline-dark"
                          href={getCustomerContractPdfUrl(customer.id, contract.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          查看契約 PDF
                        </a>
                        <a
                          className="btn btn-sm btn-outline-dark"
                          href={getCustomerContractSignatureUrl(customer.id, contract.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          查看電子簽名
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted mb-0">目前沒有已完成的電子契約。</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
