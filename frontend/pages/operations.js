import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getStaffAccounts, API_BASE_URL } from '../api/client';
import { getUserFacingErrorMessage } from '../utils/error-message';

function localDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localDateForDisplay(dateString) {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return '';
  }
  const [year, month, day] = dateString.split('-');
  return `${year}/${month}/${day}`;
}

function addDaysToDateString(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localDateInputValue(date);
}

// 狀態中文映射
const STATUS_LABELS = {
  'SCHEDULED': '已預約',
  'CHECKED_IN': '已報到',
  'IN_PROGRESS': '進行中',
  'COMPLETED': '已完成',
};
const SPECIES_LABELS = { DOG: '狗', CAT: '貓' };

export default function OperationsPage() {
  const router = useRouter();
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [today, setToday] = useState(localDateInputValue());
  const [selectedDate, setSelectedDate] = useState(localDateInputValue());
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [staffAssignmentModalOpen, setStaffAssignmentModalOpen] = useState(false);
  const [workNoteModalOpen, setWorkNoteModalOpen] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [tempStaffId, setTempStaffId] = useState(null);
  const [tempWorkNote, setTempWorkNote] = useState('');

  // Filters
  const [filters, setFilters] = useState({
    status: 'ALL',
    serviceType: null,
    species: null,
    searchCustomer: '',
    searchPet: '',
    searchPhone: '',
  });

  useEffect(() => {
    if (!router.isReady) return;

    const urlDate = typeof router.query.date === 'string' ? router.query.date : localDateInputValue();
    const normalizedDate = /^\d{4}-\d{2}-\d{2}$/.test(urlDate) ? urlDate : localDateInputValue();
    setToday(normalizedDate);
    setSelectedDate(normalizedDate);
  }, [router.isReady, router.query.date]);

  useEffect(() => {
    if (!router.isReady || !selectedDate) return;

    const currentQuery = new URLSearchParams((router.asPath.split('?')[1] || ''));
    const currentDate = currentQuery.get('date');
    if (currentDate !== selectedDate) {
      router.replace({
        pathname: '/operations',
        query: {
          ...router.query,
          date: selectedDate,
        },
      }, undefined, { shallow: true });
    }

    loadOperations(selectedDate);
  }, [router.isReady, selectedDate]);

  useEffect(() => {
    let active = true;

    async function loadStaffList() {
      try {
        const result = await getStaffAccounts();
        const activeStaff = (result && result.staff ? result.staff : []).filter((staff) => {
          const status = typeof staff?.status === 'string' ? staff.status.toUpperCase() : '';
          return status === 'ACTIVE';
        });

        if (active) {
          setStaffList(activeStaff);
        }
      } catch (error) {
        if (active) {
          setStaffList([]);
        }
      }
    }

    loadStaffList();

    return () => {
      active = false;
    };
  }, []);

  async function loadOperations(dateValue = selectedDate) {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (dateValue) {
        query.append('date', dateValue);
      }
      if (filters.status && filters.status !== 'ALL') {
        query.append('status', filters.status);
      }
      if (filters.serviceType) {
        query.append('serviceType', filters.serviceType);
      }
      if (filters.species && filters.species !== 'ALL') {
        query.append('species', filters.species);
      }
      if (filters.searchCustomer) {
        query.append('searchCustomer', filters.searchCustomer);
      }
      if (filters.searchPet) {
        query.append('searchPet', filters.searchPet);
      }
      if (filters.searchPhone) {
        query.append('searchPhone', filters.searchPhone);
      }

      const res = await fetch(`${API_BASE_URL}/api/operations?${query.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(getUserFacingErrorMessage(payload?.error || { message: '載入日常營運資料失敗' }, res.status, '載入日常營運資料失敗'));
      }

      const data = await res.json();
      setOperations(data.data || []);
      setError(null);
    } catch (err) {
      setError(getUserFacingErrorMessage(err, 500, '載入日常營運資料失敗'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn(operation) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/operations/${operation.id}/check-in`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(getUserFacingErrorMessage(payload?.error || { message: '報到失敗' }, res.status, '報到失敗'));
      }
      await loadOperations();
    } catch (err) {
      alert('錯誤：' + getUserFacingErrorMessage(err, 500, '報到失敗'));
    }
  }

  async function handleUndoCheckIn(operation) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/operations/${operation.id}/undo-check-in`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(getUserFacingErrorMessage(payload?.error || { message: '取消報到失敗' }, res.status, '取消報到失敗'));
      }
      await loadOperations();
    } catch (err) {
      alert('錯誤：' + getUserFacingErrorMessage(err, 500, '取消報到失敗'));
    }
  }

  async function handleStartWork(operation) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/operations/${operation.id}/start-work`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(getUserFacingErrorMessage(payload?.error || { message: '開始工作失敗' }, res.status, '開始工作失敗'));
      }
      await loadOperations();
    } catch (err) {
      alert('錯誤：' + getUserFacingErrorMessage(err, 500, '開始工作失敗'));
    }
  }

  async function handleCompleteWork(operation) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/operations/${operation.id}/complete-work`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(getUserFacingErrorMessage(payload?.error || { message: '完成工作失敗' }, res.status, '完成工作失敗'));
      }
      await loadOperations();
    } catch (err) {
      alert('錯誤：' + getUserFacingErrorMessage(err, 500, '完成工作失敗'));
    }
  }

  async function handleReopenWork(operation) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/operations/${operation.id}/reopen-work`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(getUserFacingErrorMessage(payload?.error || { message: '重新開啟失敗' }, res.status, '重新開啟失敗'));
      }
      await loadOperations();
    } catch (err) {
      alert('錯誤：' + getUserFacingErrorMessage(err, 500, '重新開啟失敗'));
    }
  }

  async function handleStaffAssignment(operation) {
    setSelectedOperation(operation);
    setTempStaffId(operation.responsible_staff_id);
    setStaffAssignmentModalOpen(true);
  }

  async function saveStaffAssignment() {
    try {
      const nextStaffId = tempStaffId === null || tempStaffId === undefined || tempStaffId === '' ? null : Number(tempStaffId);
      const res = await fetch(`${API_BASE_URL}/api/operations/${selectedOperation.id}/staff-assignment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ responsible_staff_id: nextStaffId }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(getUserFacingErrorMessage(payload?.error || { message: '指派人員失敗' }, res.status, '指派人員失敗'));
      }
      setStaffAssignmentModalOpen(false);
      await loadOperations();
    } catch (err) {
      alert('錯誤：' + getUserFacingErrorMessage(err, 500, '指派人員失敗'));
    }
  }

  async function handleWorkNote(operation) {
    setSelectedOperation(operation);
    setTempWorkNote(operation.work_note || '');
    setWorkNoteModalOpen(true);
  }

  async function saveWorkNote() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/operations/${selectedOperation.id}/work-note`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ work_note: tempWorkNote }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(getUserFacingErrorMessage(payload?.error || { message: '更新工作備註失敗' }, res.status, '更新工作備註失敗'));
      }
      setWorkNoteModalOpen(false);
      await loadOperations();
    } catch (err) {
      alert('錯誤：' + getUserFacingErrorMessage(err, 500, '更新工作備註失敗'));
    }
  }

  // 根據狀態顯示可用操作
  const getActions = (operation) => {
    const status = operation.status;
    const actions = [];

    if (status === 'SCHEDULED') {
      actions.push(
        <button
          key="checkin"
          className="btn btn-sm btn-primary"
          onClick={() => handleCheckIn(operation)}
        >
          報到
        </button>
      );
    }

    if (status === 'CHECKED_IN') {
      actions.push(
        <button
          key="start"
          className="btn btn-sm btn-success"
          onClick={() => handleStartWork(operation)}
        >
          開始
        </button>,
        <button
          key="complete"
          className="btn btn-sm btn-success"
          onClick={() => handleCompleteWork(operation)}
        >
          完成
        </button>,
        <button
          key="undo"
          className="btn btn-sm btn-warning"
          onClick={() => handleUndoCheckIn(operation)}
        >
          取消報到
        </button>
      );
    }

    if (status === 'IN_PROGRESS') {
      actions.push(
        <button
          key="complete"
          className="btn btn-sm btn-success"
          onClick={() => handleCompleteWork(operation)}
        >
          完成
        </button>,
        <button
          key="revert"
          className="btn btn-sm btn-warning"
          onClick={() => handleUndoCheckIn(operation)}
        >
          回復
        </button>
      );
    }

    if (status === 'COMPLETED') {
      actions.push(
        <button
          key="reopen"
          className="btn btn-sm btn-warning"
          onClick={() => handleReopenWork(operation)}
        >
          重新開啟
        </button>
      );
    }

    return actions;
  };

  const applyFilters = () => {
    loadOperations(selectedDate);
  };

  const handleDateChange = (nextDate) => {
    if (!nextDate) return;
    setSelectedDate(nextDate);
    setToday(nextDate);
  };

  const handleDateOffset = (days) => {
    if (!selectedDate) return;
    const nextDate = addDaysToDateString(selectedDate, days);
    handleDateChange(nextDate);
  };

  const statusBadgeClass = (status) => {
    switch (status) {
      case 'SCHEDULED':
        return 'badge bg-secondary';
      case 'CHECKED_IN':
        return 'badge bg-info';
      case 'IN_PROGRESS':
        return 'badge bg-warning text-dark';
      case 'COMPLETED':
        return 'badge bg-success';
      default:
        return 'badge bg-secondary';
    }
  };

  if (loading && operations.length === 0) {
    return (
      <div className="container mt-4">
        <div className="alert alert-info">載入中...</div>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-1">日常營運</h1>
          <p className="text-muted mb-0">營運日期：{localDateForDisplay(selectedDate) || localDateForDisplay(today)}</p>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body d-flex flex-wrap align-items-center gap-3">
          <button type="button" className="btn btn-outline-secondary" onClick={() => handleDateOffset(-1)} aria-label="前一天">←</button>
          <input
            type="date"
            className="form-control"
            value={selectedDate}
            onChange={(event) => handleDateChange(event.target.value)}
            aria-label="營運日期"
            style={{ maxWidth: '220px' }}
          />
          <button type="button" className="btn btn-outline-secondary" onClick={() => handleDateOffset(1)} aria-label="後一天">→</button>
          <span className="text-muted">{localDateForDisplay(selectedDate) || '請選擇日期'}</span>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* 搜尋欄 */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <input
                type="text"
                className="form-control"
                placeholder="搜尋客戶名稱"
                value={filters.searchCustomer}
                onChange={(e) => setFilters({ ...filters, searchCustomer: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <input
                type="text"
                className="form-control"
                placeholder="搜尋寵物名稱"
                value={filters.searchPet}
                onChange={(e) => setFilters({ ...filters, searchPet: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <input
                type="text"
                className="form-control"
                placeholder="搜尋電話"
                value={filters.searchPhone}
                onChange={(e) => setFilters({ ...filters, searchPhone: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <button className="btn btn-primary w-100" onClick={applyFilters}>
                搜尋
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 過濾器 */}
      <div className="btn-group mb-4" role="group">
        <button
          type="button"
          className={`btn ${filters.status === 'ALL' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setFilters({ ...filters, status: 'ALL' })}
        >
          全部
        </button>
        <button
          type="button"
          className={`btn ${filters.status === 'PENDING' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setFilters({ ...filters, status: 'PENDING' })}
        >
          待處理
        </button>
        <button
          type="button"
          className={`btn ${filters.status === 'COMPLETED' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setFilters({ ...filters, status: 'COMPLETED' })}
        >
          已完成
        </button>
      </div>

      {/* 營運列表表格 */}
      <div className="table-responsive">
        <table className="table table-striped table-hover">
          <thead className="table-dark">
            <tr>
              <th>時間</th>
              <th>客戶</th>
              <th>寵物</th>
              <th>服務</th>
              <th>負責人員</th>
              <th>狀態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {operations.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center text-muted">
                  此日期目前沒有營運資料。
                </td>
              </tr>
            ) : (
              operations.map((op) => (
                <tr key={op.id}>
                  <td>{op.appointment_time}</td>
                  <td>
                    <Link href={`/customers`} className="link-primary">
                      {op.customer_name}
                    </Link>
                  </td>
                  <td>
                    {op.pets && op.pets.length > 0 ? (
                      <div>
                        {op.pets.map((pet, idx) => (
                          <div key={idx}>
                            <Link href={`/pets`} className="link-primary">
                              {pet.name}
                            </Link>{' '}
                            ({SPECIES_LABELS[pet.species] || pet.species})
                          </div>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    {op.pets && op.pets.flatMap((pet) => (pet.services || []).map((service) => service.name)).join(', ') || '-'}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => handleStaffAssignment(op)}
                    >
                      {op.responsible_staff_name || '指派'}
                    </button>
                  </td>
                  <td>
                    <span className={statusBadgeClass(op.status)}>
                      {STATUS_LABELS[op.status] || op.status}
                    </span>
                  </td>
                  <td>
                    <div className="btn-group btn-group-sm" role="group">
                      {getActions(op).map((action, idx) => (
                        <div key={idx} style={{ marginRight: '2px' }}>
                          {action}
                        </div>
                      ))}
                      <button
                        className="btn btn-sm btn-outline-info"
                        onClick={() => handleWorkNote(op)}
                      >
                        備註
                      </button>
                      <button
                        className="btn btn-sm btn-outline-dark"
                        onClick={() => router.push(`/grooming?daily_operation_id=${op.id}`)}
                      >
                        美容
                      </button>
                      {op.pets && op.pets.some((pet) => pet.service_types && pet.service_types.includes('BOARDING')) ? (
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => router.push(`/boarding?daily_operation_id=${op.id}`)}
                        >
                          住宿
                        </button>
                      ) : null}
                      {op.can_create_appointment_order ? (
                        <button
                          className="btn btn-sm btn-outline-success"
                          onClick={() => router.push(`/orders?source_type=APPOINTMENT&appointment_id=${op.appointment_id}`)}
                        >
                          建立訂單
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 指派人員模態框 */}
      {staffAssignmentModalOpen && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">指派人員</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setStaffAssignmentModalOpen(false)}
                />
              </div>
              <div className="modal-body">
                <label className="form-label">選擇人員</label>
                <select
                  className="form-select"
                  value={tempStaffId === null || tempStaffId === undefined ? '' : String(tempStaffId)}
                  onChange={(e) => setTempStaffId(e.target.value === '' ? null : Number(e.target.value))}
                >
                  <option value="">無指派</option>
                  {staffList.map((staff) => (
                    <option key={staff.id} value={String(staff.id)}>
                      {staff.display_name || staff.username}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStaffAssignmentModalOpen(false)}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={saveStaffAssignment}
                >
                  儲存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 工作備註模態框 */}
      {workNoteModalOpen && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">工作備註</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setWorkNoteModalOpen(false)}
                />
              </div>
              <div className="modal-body">
                <textarea
                  className="form-control"
                  rows="4"
                  value={tempWorkNote}
                  onChange={(e) => setTempWorkNote(e.target.value)}
                  maxLength="1000"
                />
                <small className="text-muted">
                  {tempWorkNote.length}/1000 個字
                </small>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setWorkNoteModalOpen(false)}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={saveWorkNote}
                >
                  儲存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
