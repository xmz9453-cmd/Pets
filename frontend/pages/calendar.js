import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { getAppointment, getAppointments, getCurrentStaff } from '../api/client';

function localDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateFromString(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function dateStringFromDate(date) {
  return localDateInputValue(date);
}

function displayTime(time) {
  return time ? time.slice(0, 5) : '未設定時間';
}

function displayMonth(dateString) {
  const date = dateFromString(dateString);
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
}

function getCalendarDays(dateString) {
  const selectedDate = dateFromString(dateString);
  const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const dayCount = Math.ceil((mondayOffset + lastDay.getDate()) / 7) * 7;

  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(firstDay);
    date.setDate(index - mondayOffset + 1);
    return {
      date: dateStringFromDate(date),
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === selectedDate.getMonth(),
    };
  });
}

function getMonthDateRange(dateString) {
  const date = dateFromString(dateString);
  return {
    start: dateStringFromDate(new Date(date.getFullYear(), date.getMonth(), 1)),
    end: dateStringFromDate(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  };
}

function getAppointmentSummary(appointment) {
  const pets = appointment.pets || [];
  const petNames = pets.map((pet) => pet.name).filter(Boolean).join('、') || '未指定寵物';
  const serviceNames = pets.flatMap((pet) => (pet.services || []).map((service) => service.name)).filter(Boolean);

  return {
    customerName: appointment.customer?.name || appointment.customer_name || '未指定客戶',
    petNames,
    serviceNames: [...new Set(serviceNames)].join('、') || '未指定服務',
  };
}

export default function CalendarPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(localDateInputValue());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dayDetailDate, setDayDetailDate] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const queryDate = typeof router.query.date === 'string' ? router.query.date : localDateInputValue();
    setSelectedDate(/^\d{4}-\d{2}-\d{2}$/.test(queryDate) ? queryDate : localDateInputValue());
  }, [router.isReady, router.query.date]);

  useEffect(() => {
    if (!router.isReady || !selectedDate) {
      return;
    }

    const currentDate = typeof router.query.date === 'string' ? router.query.date : '';
    if (currentDate !== selectedDate) {
      router.replace({ pathname: '/calendar', query: { date: selectedDate } }, undefined, { shallow: true });
    }

    let active = true;
    async function loadCalendar() {
      try {
        setLoading(true);
        setError('');
        await getCurrentStaff();
        const range = getMonthDateRange(selectedDate);
        const listResult = await getAppointments({ status: 'ALL', page: 1, limit: 1000 });
        const detailResults = await Promise.all(
          (listResult.appointments || [])
            .filter((appointment) => appointment.appointment_date >= range.start && appointment.appointment_date <= range.end)
            .map((appointment) => getAppointment(appointment.id)),
        );
        if (active) {
          setAppointments(detailResults.map((result) => result.appointment));
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || '無法載入行事曆資料。');
          setAppointments([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadCalendar();
    return () => { active = false; };
  }, [router.isReady, router.query.date, selectedDate]);

  function changeMonth(months) {
    setSelectedDate((currentDate) => {
      const date = dateFromString(currentDate);
      const day = date.getDate();
      date.setDate(1);
      date.setMonth(date.getMonth() + months);
      const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      date.setDate(Math.min(day, lastDayOfMonth));
      return dateStringFromDate(date);
    });
  }

  function goToToday() {
    setSelectedDate(localDateInputValue());
  }

  function openDayAppointments(dateString) {
    setDayDetailDate(dateString);
    setSelectedAppointment(null);
  }

  function closeDayAppointments() {
    setDayDetailDate(null);
    setSelectedAppointment(null);
  }

  function getCompactAppointmentSummary(appointment) {
    const summary = getAppointmentSummary(appointment);
    const petLabel = summary.petNames === '未指定寵物' ? '未指定寵物' : summary.petNames;
    const serviceLabel = summary.serviceNames === '未指定服務' ? '' : summary.serviceNames;
    return [petLabel, serviceLabel].filter(Boolean).join(' · ');
  }

  const calendarDays = useMemo(() => getCalendarDays(selectedDate), [selectedDate]);
  const appointmentsByDate = useMemo(() => appointments.reduce((groups, appointment) => {
    const dateAppointments = groups[appointment.appointment_date] || [];
    dateAppointments.push(appointment);
    groups[appointment.appointment_date] = dateAppointments;
    return groups;
  }, {}), [appointments]);
  const today = localDateInputValue();

  return (
    <main className="foundation-shell">
      <section className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            <h1 className="mb-1">行事曆</h1>
            <p className="text-muted mb-0">查看整個月份的預約排程。</p>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button type="button" className="btn btn-outline-dark" onClick={() => changeMonth(-1)}>上個月</button>
            <button type="button" className="btn btn-dark" onClick={goToToday}>今天</button>
            <button type="button" className="btn btn-outline-dark" onClick={() => changeMonth(1)}>下個月</button>
          </div>
        </div>

        <div className="calendar-heading mb-3">
          <h2 className="h3 mb-0">{displayMonth(selectedDate)}</h2>
          <div className="text-muted">已選日期：{selectedDate.replace(/-/g, '/')}</div>
        </div>

        {error ? <div className="alert alert-danger">{error}</div> : null}
        {loading ? <div className="alert alert-light border">行事曆載入中...</div> : null}
        {!loading && !error ? (
          <div className="calendar-grid" role="grid" aria-label={`${displayMonth(selectedDate)}行事曆`}>
            {['一', '二', '三', '四', '五', '六', '日'].map((weekday) => (
              <div className="calendar-weekday" role="columnheader" key={weekday}>星期{weekday}</div>
            ))}
            {calendarDays.map((calendarDay) => {
              const dayAppointments = (appointmentsByDate[calendarDay.date] || [])
                .slice()
                .sort((first, second) => String(first.appointment_time || '').localeCompare(String(second.appointment_time || '')));
              const visibleAppointments = dayAppointments.slice(0, 2);
              const overflowCount = Math.max(dayAppointments.length - visibleAppointments.length, 0);

              return (
                <div
                  className={`calendar-day${calendarDay.isCurrentMonth ? '' : ' calendar-day-muted'}${calendarDay.date === today ? ' calendar-day-today' : ''}${calendarDay.date === selectedDate ? ' calendar-day-selected' : ''}`}
                  key={calendarDay.date}
                  onClick={() => setSelectedDate(calendarDay.date)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedDate(calendarDay.date);
                    }
                  }}
                  role="gridcell"
                  tabIndex={0}
                >
                  <span className="calendar-day-number">{calendarDay.day}</span>
                  <span className="calendar-events">
                    {visibleAppointments.map((appointment) => {
                      const summary = getCompactAppointmentSummary(appointment);
                      return (
                        <button
                          type="button"
                          className={`calendar-event${appointment.status === 'CANCELLED' ? ' calendar-event-cancelled' : ''}`}
                          key={appointment.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedDate(calendarDay.date);
                            setSelectedAppointment(appointment);
                          }}
                        >
                          <strong>{displayTime(appointment.appointment_time)}</strong>
                          <span>{summary}</span>
                        </button>
                      );
                    })}
                    {overflowCount > 0 ? (
                      <button
                        type="button"
                        className="calendar-more"
                        onClick={(event) => {
                          event.stopPropagation();
                          openDayAppointments(calendarDay.date);
                        }}
                      >
                        +{overflowCount} 更多
                      </button>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}

        {dayDetailDate ? (
          <div className="calendar-modal-backdrop" onClick={closeDayAppointments}>
            <div className="calendar-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-day-appointments-title" onClick={(event) => event.stopPropagation()}>
              <div className="calendar-modal-header">
                <h3 className="calendar-modal-title" id="calendar-day-appointments-title">{dayDetailDate.replace(/-/g, '/')} 預約</h3>
                <button type="button" className="btn-close" aria-label="關閉" onClick={closeDayAppointments} />
              </div>

              <div className="calendar-modal-body">
                {selectedAppointment ? (
                  <div className="calendar-appointment-detail">
                    <div className="calendar-appointment-detail-header">
                      <div>
                        <div className="text-muted small">預約時間</div>
                        <strong>{displayTime(selectedAppointment.appointment_time)}</strong>
                      </div>
                      <span className={`badge ${selectedAppointment.status === 'CANCELLED' ? 'bg-secondary' : 'bg-primary'}`}>
                        {selectedAppointment.status === 'CANCELLED' ? '已取消' : '已排程'}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="text-muted small">客戶</div>
                      <div>{getAppointmentSummary(selectedAppointment).customerName}</div>
                    </div>
                    <div className="mt-3">
                      <div className="text-muted small">寵物</div>
                      <div>{getAppointmentSummary(selectedAppointment).petNames}</div>
                    </div>
                    <div className="mt-3">
                      <div className="text-muted small">服務</div>
                      <div>{getAppointmentSummary(selectedAppointment).serviceNames}</div>
                    </div>
                    <button type="button" className="btn btn-outline-dark mt-3" onClick={() => setSelectedAppointment(null)}>
                      返回列表
                    </button>
                  </div>
                ) : (
                  <div className="calendar-appointment-list">
                    {(appointmentsByDate[dayDetailDate] || [])
                      .slice()
                      .sort((first, second) => String(first.appointment_time || '').localeCompare(String(second.appointment_time || '')))
                      .map((appointment) => {
                        const summary = getAppointmentSummary(appointment);
                        return (
                          <button
                            type="button"
                            key={appointment.id}
                            className="calendar-appointment-row"
                            onClick={() => setSelectedAppointment(appointment)}
                          >
                            <span className="calendar-appointment-row-time">{displayTime(appointment.appointment_time)}</span>
                            <span className="calendar-appointment-row-text">{summary.customerName}</span>
                            <span className="calendar-appointment-row-text">{summary.petNames}</span>
                            <span className="calendar-appointment-row-text">{summary.serviceNames}</span>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {!loading && !error && appointments.length === 0 ? (
          <div className="text-muted small mt-3">目前沒有預約</div>
        ) : null}
        <div className="visually-hidden">目前選定日期為 {selectedDate}</div>
      </section>
    </main>
  );
}