import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createPayment, getCurrentStaff, getOrder, getOrderPayments, voidPayment } from '../../api/client';

const methods = { CASH: '現金', CREDIT_CARD: '信用卡', BANK_TRANSFER: '銀行轉帳', MOBILE_PAYMENT: '行動支付' };
const statuses = { PAID: '已付款', VOID: '已作廢', UNPAID: '未付款' };

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState(null); const [paymentData, setPaymentData] = useState(null);
  const [amount, setAmount] = useState(''); const [method, setMethod] = useState('CASH');
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');

  async function load() {
    if (!id) return;
    try { setLoading(true); const [orderResult, payments] = await Promise.all([getOrder(id), getOrderPayments(id)]); setOrder(orderResult.order); setPaymentData(payments); setError(''); } catch (loadError) { setError(loadError.message || '訂單資料載入失敗'); } finally { setLoading(false); }
  }
  useEffect(() => { getCurrentStaff().then(load).catch(() => router.replace('/login')); }, [id, router]);
  async function addPayment(event) { event.preventDefault(); setSaving(true); setError(''); setSuccess(''); try { await createPayment(id, { amount: Number(amount), payment_method: method }); setAmount(''); setSuccess('付款已新增'); await load(); } catch (saveError) { setError(saveError.message || '付款新增失敗'); } finally { setSaving(false); } }
  async function handleVoid(paymentId) { if (!window.confirm('確定要作廢這筆付款嗎？作廢後會重新計算未付金額。')) return; setError(''); setSuccess(''); try { await voidPayment(paymentId); setSuccess('付款已作廢'); await load(); } catch (voidError) { setError(voidError.message || '付款作廢失敗'); } }
  if (loading) return <main className="container py-4"><p className="text-muted">訂單載入中...</p></main>;
  if (!order || !paymentData) return <main className="container py-4"><div className="alert alert-danger">{error || '找不到訂單'}</div></main>;
  const summary = paymentData.summary;
  return <main className="container py-4">
    <div className="d-flex justify-content-between align-items-center mb-4"><div><h1 className="mb-1">訂單 #{order.id}</h1><p className="text-muted mb-0">訂單詳細資料與付款紀錄</p></div><button type="button" className="btn btn-outline-dark" onClick={() => router.push('/orders')}>返回訂單</button></div>
    {error ? <div className="alert alert-danger">{error}</div> : null}{success ? <div className="alert alert-success">{success}</div> : null}
    <div className="row g-4"><div className="col-lg-7"><div className="foundation-panel"><h2 className="h5">付款摘要</h2><div className="row g-3 mb-4"><div className="col-4"><div className="foundation-label">訂單總額</div><div className="foundation-status">${summary.order_total.toFixed(2)}</div></div><div className="col-4"><div className="foundation-label">已付金額</div><div className="foundation-status text-success">${summary.paid_amount.toFixed(2)}</div></div><div className="col-4"><div className="foundation-label">剩餘金額</div><div className="foundation-status text-danger">${summary.remaining_amount.toFixed(2)}</div></div></div><h2 className="h5">付款紀錄</h2>{paymentData.payments.length === 0 ? <p className="text-muted">尚無付款紀錄</p> : <div className="table-responsive"><table className="table align-middle"><thead><tr><th>金額</th><th>付款方式</th><th>狀態</th><th>付款時間</th><th>操作</th></tr></thead><tbody>{paymentData.payments.map((payment) => <tr key={payment.id}><td>${payment.amount.toFixed(2)}</td><td>{methods[payment.payment_method]}</td><td><span className={`badge ${payment.status === 'VOID' ? 'bg-danger' : 'bg-success'}`}>{statuses[payment.status]}</span>{payment.void_reason ? <div className="small text-muted">原因：{payment.void_reason}</div> : null}</td><td>{payment.status === 'VOID' ? payment.voided_at : payment.paid_at}</td><td>{payment.status === 'PAID' ? <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleVoid(payment.id)}>作廢</button> : <span className="text-muted">已作廢</span>}</td></tr>)}</tbody></table></div>}</div></div>
      <div className="col-lg-5"><div className="foundation-panel"><h2 className="h5">新增付款</h2><p>目前付款狀態：<strong>{statuses[summary.payment_status]}</strong></p><form onSubmit={addPayment}><label className="form-label" htmlFor="payment-amount">付款金額</label><input id="payment-amount" className="form-control mb-3" type="number" min="0.01" step="0.01" max={summary.remaining_amount} value={amount} onChange={(event) => setAmount(event.target.value)} required /><label className="form-label" htmlFor="payment-method">付款方式</label><select id="payment-method" className="form-select mb-3" value={method} onChange={(event) => setMethod(event.target.value)}><option value="CASH">現金</option><option value="CREDIT_CARD">信用卡</option><option value="BANK_TRANSFER">銀行轉帳</option><option value="MOBILE_PAYMENT">行動支付</option></select><button type="submit" className="btn btn-primary" disabled={saving || summary.remaining_amount <= 0}>{saving ? '處理中...' : '確認付款'}</button></form></div></div></div>
  </main>;
}