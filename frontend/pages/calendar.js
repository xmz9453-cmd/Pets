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
              return (
                <button
                  type="button"
                  className={`calendar-day${calendarDay.isCurrentMonth ? '' : ' calendar-day-muted'}${calendarDay.date === today ? ' calendar-day-today' : ''}${calendarDay.date === selectedDate ? ' calendar-day-selected' : ''}`}
                  key={calendarDay.date}
                  onClick={() => setSelectedDate(calendarDay.date)}
                  role="gridcell"
                >
                  <span className="calendar-day-number">{calendarDay.day}</span>
                  <span className="calendar-events">
                    {dayAppointments.map((appointment) => {
                      const summary = getAppointmentSummary(appointment);
                      return (
                        <span className={`calendar-event${appointment.status === 'CANCELLED' ? ' calendar-event-cancelled' : ''}`} key={appointment.id}>
                          <strong>{displayTime(appointment.appointment_time)}</strong>
                          <span>{summary.customerName} / {summary.petNames}</span>
                          <span>{summary.serviceNames}</span>
                        </span>
                      );
                    })}
                  </span>
                </button>
              );
            })}
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