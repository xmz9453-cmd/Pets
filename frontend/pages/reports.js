import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getCurrentStaff, getReport, getShopSettings } from '../api/client';

const paymentMethodLabels = { CASH: '現金', CREDIT_CARD: '信用卡', BANK_TRANSFER: '銀行轉帳', MOBILE_PAYMENT: '行動支付' };

function localDate() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function amount(value) { return Number(value || 0).toFixed(2); }

export default function ReportsPage() {
  const router = useRouter();
  const today = localDate();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [report, setReport] = useState(null);
  const [shopName, setShopName] = useState('店家');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  async function load(nextStartDate = startDate, nextEndDate = endDate) {
    try {
      setLoading(true); setError(''); setValidationError('');
      if (nextStartDate > nextEndDate) { setValidationError('開始日期不得晚於結束日期'); setReport(null); return; }
      setReport(await getReport({ start_date: nextStartDate, end_date: nextEndDate }));
    } catch (loadError) {
      setError(loadError.message === 'Failed to fetch' ? '報表載入失敗' : (loadError.message || '報表載入失敗')); setReport(null);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    Promise.all([getCurrentStaff(), getShopSettings()])
      .then(([, settings]) => {
        setShopName(settings.shop?.name || '店家');
        return load();
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  function submit(event) { event.preventDefault(); load(); }
  const summary = report?.summary;
  const hasRows = report && (report.payment_methods.length || report.daily_revenue.length || report.products.length || report.services.length || report.boarding.usage_count);

  return <main className="foundation-shell">
    <nav className="navbar navbar-expand navbar-dark bg-dark"><div className="container-fluid"><span className="navbar-brand mb-0 h1">{shopName}</span><div className="d-flex align-items-center gap-2"><a href="/" className="btn btn-outline-light btn-sm">返回首頁</a></div></div></nav>
    <section className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4"><div><h1 className="mb-1">報表</h1><p className="text-muted mb-0">查看指定期間的基本營運資訊。</p></div></div>
      <div className="foundation-panel mb-4"><h2 className="h5">日期範圍</h2><form className="row g-3 align-items-end" onSubmit={submit}><div className="col-md-4"><label className="form-label" htmlFor="report-start-date">開始日期</label><input id="report-start-date" className="form-control" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div><div className="col-md-4"><label className="form-label" htmlFor="report-end-date">結束日期</label><input id="report-end-date" className="form-control" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div><div className="col-md-4"><button className="btn btn-primary" type="submit" disabled={loading}>查詢</button></div></form></div>
      {validationError ? <div className="alert alert-warning" role="alert">{validationError}</div> : null}
      {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
      {loading ? <div className="alert alert-light border" role="status">載入中</div> : null}
      {!loading && !error && !validationError && report && !hasRows && summary.total_orders === 0 ? <div className="alert alert-light border">查無結果</div> : null}
      {!loading && report ? <>
        <h2 className="h4 mb-3">營運摘要</h2><div className="row g-3 mb-4">{[['訂單總數', summary.total_orders], ['有效訂單', summary.valid_orders], ['已完成訂單', summary.completed_orders], ['取消訂單', summary.cancelled_orders], ['平均訂單金額', amount(summary.average_order_amount)], ['實收營收', amount(summary.actual_revenue)], ['未付金額', amount(summary.outstanding_amount)]].map(([label, value]) => <div className="col-6 col-md-3" key={label}><div className="foundation-panel"><div className="foundation-label">{label}</div><div className="foundation-status">{value}</div></div></div>)}</div>
        <div className="row g-4"><ReportTable title="收款統計" headers={['付款方式', '筆數', '付款金額']} rows={report.payment_methods.map((row) => [paymentMethodLabels[row.payment_method] || row.payment_method, row.payment_count, amount(row.payment_amount)])} empty="暫無資料" /><ReportTable title="每日營收" headers={['日期', '訂單數量', '付款金額']} rows={report.daily_revenue.map((row) => [row.date, row.order_count, amount(row.payment_amount)])} empty="暫無資料" /><ReportTable title="商品統計" headers={['商品名稱', '銷售數量', '銷售金額']} rows={report.products.map((row) => [row.name, row.quantity, amount(row.amount)])} empty="暫無資料" /><ReportTable title="服務統計" headers={['服務名稱', '使用次數', '服務金額']} rows={report.services.map((row) => [row.name, row.quantity, amount(row.amount)])} empty="暫無資料" /><div className="col-12"><div className="foundation-panel"><h2 className="h5">住宿統計</h2><div className="table-responsive"><table className="table mb-0"><thead><tr><th>住宿使用量</th><th>可識別交易數量</th><th>可識別交易金額</th></tr></thead><tbody><tr><td>{report.boarding.usage_count}</td><td>{report.boarding.identifiable_transaction_quantity}</td><td>{amount(report.boarding.identifiable_transaction_amount)}</td></tr></tbody></table></div></div></div></div>
      </> : null}
    </section>
  </main>;
}

function ReportTable({ title, headers, rows, empty }) {
  return <div className="col-12 col-lg-6"><div className="foundation-panel"><h2 className="h5">{title}</h2>{rows.length === 0 ? <p className="text-muted mb-0">{empty}</p> : <div className="table-responsive"><table className="table mb-0"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${title}-${index}`}>{row.map((value, valueIndex) => <td key={`${title}-${index}-${valueIndex}`}>{value}</td>)}</tr>)}</tbody></table></div>}</div></div>;
}