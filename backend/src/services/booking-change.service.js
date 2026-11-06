const { getPool } = require('../config/database');
const {
  getCurrentCustomerMemberId,
  getCurrentShopId,
} = require('../utils/shop-context');

function createError(message, statusCode, code, fields) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  if (fields) error.fields = fields;
  return error;
}

function validation(fields) {
  return createError('資料格式不正確。', 400, 'VALIDATION_ERROR', fields);
}

function normalizeDate(value, field) {
  const date = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw validation({ [field]: '請選擇有效日期。' });
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw validation({ [field]: '請選擇有效日期。' });
  }
  return date;
}

function normalizeTime(value, field) {
  const time = String(value || '').trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time)) {
    throw validation({ [field]: '請選擇有效時間。' });
  }
  return time.length === 5 ? `${time}:00` : time;
}

function normalizeNote(value, field) {
  const note = String(value || '').trim();
  if (note.length > 500) throw validation({ [field]: '備註不可超過 500 個字元。' });
  return note || null;
}

function normalizeChangeRequest(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    request_type: row.request_type,
    status: row.status,
    original_appointment_date: String(row.original_appointment_date).slice(0, 10),
    original_appointment_time: String(row.original_appointment_time).slice(0, 8),
    original_check_out: row.original_check_out,
    proposed_appointment_date: row.proposed_appointment_date
      ? String(row.proposed_appointment_date).slice(0, 10)
      : null,
    proposed_appointment_time: row.proposed_appointment_time
      ? String(row.proposed_appointment_time).slice(0, 8)
      : null,
    proposed_check_out: row.proposed_check_out,
    customer_note: row.customer_note,
    staff_note: row.staff_note,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
  };
}

async function createCustomerChangeRequest(appointmentIdValue, payload = {}) {
  const appointmentId = Number(appointmentIdValue);
  if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
    throw createError('找不到指定的預約。', 404, 'APPOINTMENT_NOT_FOUND');
  }
  const memberId = getCurrentCustomerMemberId();
  const requestType = String(payload.request_type || '').toUpperCase();
  if (!['RESCHEDULE', 'CANCEL'].includes(requestType)) {
    throw validation({ request_type: '請選擇改期或取消。' });
  }
  const customerNote = normalizeNote(payload.customer_note, 'customer_note');
  let proposedDate = null;
  let proposedTime = null;
  let proposedCheckOut = null;

  if (requestType === 'RESCHEDULE') {
    proposedDate = normalizeDate(payload.proposed_appointment_date, 'proposed_appointment_date');
    proposedTime = normalizeTime(payload.proposed_appointment_time, 'proposed_appointment_time');
  }

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    // Locking the appointment serializes duplicate submissions before checking pending requests.
    const [appointments] = await connection.query(
      `SELECT a.id, a.customer_id, a.appointment_date, a.appointment_time, a.status,
              brd.service_type, brd.requested_check_out, do.status AS operation_status,
              EXISTS (
                SELECT 1 FROM orders o
                WHERE o.shop_id = a.shop_id AND o.appointment_id = a.id AND o.status = 'PAID'
              ) AS has_completed_order
       FROM appointments a
       INNER JOIN booking_request_details brd
         ON brd.appointment_id = a.id AND brd.shop_id = a.shop_id
       INNER JOIN customer_member_customers cmc
         ON cmc.shop_id = a.shop_id AND cmc.customer_id = a.customer_id
       LEFT JOIN daily_operations do
         ON do.appointment_id = a.id AND do.shop_id = a.shop_id
       WHERE a.id = ? AND a.shop_id = ? AND cmc.customer_member_id = ?
       LIMIT 1 FOR UPDATE`,
      [appointmentId, getCurrentShopId(), memberId],
    );
    const appointment = appointments[0];
    if (!appointment) throw createError('找不到可操作的預約。', 404, 'APPOINTMENT_NOT_FOUND');
    if (!['SCHEDULED', 'CONFIRMED'].includes(appointment.status)
      || (appointment.operation_status && appointment.operation_status !== 'SCHEDULED')
      || Boolean(appointment.has_completed_order)) {
      throw createError('此預約目前無法提出改期或取消申請，請聯絡店家。', 409, 'BOOKING_CHANGE_NOT_ALLOWED');
    }

    if (requestType === 'RESCHEDULE' && appointment.service_type === 'BOARDING') {
      const checkOutDate = normalizeDate(payload.proposed_check_out_date, 'proposed_check_out_date');
      const checkOutTime = normalizeTime(payload.proposed_check_out_time, 'proposed_check_out_time');
      proposedCheckOut = `${checkOutDate} ${checkOutTime}`;
      if (proposedCheckOut <= `${proposedDate} ${proposedTime}`) {
        throw validation({ proposed_check_out_date: '退房時間必須晚於入住時間。' });
      }
    }
    if (requestType === 'RESCHEDULE') {
      const currentDate = String(appointment.appointment_date).slice(0, 10);
      const currentTime = String(appointment.appointment_time).slice(0, 8);
      const currentCheckOut = appointment.requested_check_out
        ? String(appointment.requested_check_out).replace('T', ' ').slice(0, 19)
        : null;
      if (proposedDate === currentDate && proposedTime === currentTime
        && proposedCheckOut === currentCheckOut) {
        throw validation({ proposed_appointment_date: '新時段與目前預約相同。' });
      }
    }

    const [pending] = await connection.query(
      `SELECT id FROM booking_change_requests
       WHERE shop_id = ? AND appointment_id = ? AND status = 'PENDING'
       LIMIT 1`,
      [getCurrentShopId(), appointmentId],
    );
    if (pending.length) {
      throw createError('這筆預約已有待處理的改期或取消申請。', 409, 'BOOKING_CHANGE_ALREADY_PENDING');
    }

    const [result] = await connection.query(
      `INSERT INTO booking_change_requests
         (shop_id, appointment_id, customer_member_id, request_type,
          original_appointment_date, original_appointment_time, original_check_out,
          proposed_appointment_date, proposed_appointment_time, proposed_check_out, customer_note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        getCurrentShopId(),
        appointmentId,
        memberId,
        requestType,
        appointment.appointment_date,
        appointment.appointment_time,
        appointment.requested_check_out,
        proposedDate,
        proposedTime,
        proposedCheckOut,
        customerNote,
      ],
    );
    await connection.query(
      'INSERT INTO shop_notifications (shop_id, booking_change_request_id) VALUES (?, ?)',
      [getCurrentShopId(), result.insertId],
    );
    await connection.commit();
    return { request_id: Number(result.insertId), status: 'PENDING' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function listCustomerRequests() {
  const memberId = getCurrentCustomerMemberId();
  const [rows] = await getPool().query(
    `SELECT a.id AS appointment_id, a.appointment_date, a.appointment_time, a.status,
            brd.service_type, brd.requested_check_out,
            MAX(aps.service_id) AS service_id, MAX(ap.pet_id) AS pet_id,
            MAX(p.species) AS species, MAX(p.name) AS pet_name,
            MAX(CASE WHEN paid_order.id IS NULL THEN 0 ELSE 1 END) AS has_completed_order,
            latest.id AS change_request_id, latest.request_type, latest.status AS change_status,
            latest.original_appointment_date, latest.original_appointment_time, latest.original_check_out,
            latest.proposed_appointment_date, latest.proposed_appointment_time, latest.proposed_check_out,
            latest.customer_note, latest.staff_note, latest.reviewed_at, latest.created_at AS change_created_at
     FROM booking_request_details brd
     INNER JOIN appointments a ON a.id = brd.appointment_id AND a.shop_id = brd.shop_id
     INNER JOIN customer_member_customers cmc
       ON cmc.shop_id = a.shop_id AND cmc.customer_id = a.customer_id
     LEFT JOIN appointment_pets ap ON ap.appointment_id = a.id AND ap.shop_id = a.shop_id
     LEFT JOIN pets p ON p.id = ap.pet_id AND p.shop_id = ap.shop_id
     LEFT JOIN appointment_pet_services aps ON aps.appointment_pet_id = ap.id AND aps.shop_id = ap.shop_id
     LEFT JOIN orders paid_order
       ON paid_order.appointment_id = a.id AND paid_order.shop_id = a.shop_id AND paid_order.status = 'PAID'
     LEFT JOIN booking_change_requests latest
       ON latest.id = (
         SELECT bcr.id FROM booking_change_requests bcr
         WHERE bcr.shop_id = a.shop_id AND bcr.appointment_id = a.id
         ORDER BY bcr.created_at DESC, bcr.id DESC LIMIT 1
       )
     WHERE brd.shop_id = ? AND cmc.customer_member_id = ?
     GROUP BY a.id, a.appointment_date, a.appointment_time, a.status,
              brd.service_type, brd.requested_check_out,
              latest.id, latest.request_type, latest.status,
              latest.original_appointment_date, latest.original_appointment_time, latest.original_check_out,
              latest.proposed_appointment_date, latest.proposed_appointment_time, latest.proposed_check_out,
              latest.customer_note, latest.staff_note, latest.reviewed_at, latest.created_at
     ORDER BY a.created_at DESC`,
    [getCurrentShopId(), memberId],
  );
  return {
    requests: rows.map((row) => ({
      appointment_id: Number(row.appointment_id),
      appointment_date: String(row.appointment_date).slice(0, 10),
      appointment_time: String(row.appointment_time).slice(0, 8),
      status: row.status,
      service_type: row.service_type,
      requested_check_out: row.requested_check_out,
      has_completed_order: Boolean(row.has_completed_order),
      service_id: Number(row.service_id),
      pet_id: Number(row.pet_id),
      species: row.species,
      pet_name: row.pet_name,
      latest_change_request: row.change_request_id ? normalizeChangeRequest({
        id: row.change_request_id,
        request_type: row.request_type,
        status: row.change_status,
        original_appointment_date: row.original_appointment_date,
        original_appointment_time: row.original_appointment_time,
        original_check_out: row.original_check_out,
        proposed_appointment_date: row.proposed_appointment_date,
        proposed_appointment_time: row.proposed_appointment_time,
        proposed_check_out: row.proposed_check_out,
        customer_note: row.customer_note,
        staff_note: row.staff_note,
        reviewed_at: row.reviewed_at,
        created_at: row.change_created_at,
      }) : null,
    })),
  };
}

async function listStaffChangeRequests() {
  const [rows] = await getPool().query(
    `SELECT bcr.id, bcr.appointment_id, bcr.request_type, bcr.status,
            bcr.original_appointment_date, bcr.original_appointment_time, bcr.original_check_out,
            bcr.proposed_appointment_date, bcr.proposed_appointment_time, bcr.proposed_check_out,
            bcr.customer_note, bcr.staff_note, bcr.created_at,
            a.customer_id, a.status AS appointment_status,
            c.name AS customer_name, c.phone AS customer_phone,
            brd.service_type, brd.requested_check_out,
            GROUP_CONCAT(DISTINCT p.name ORDER BY p.name SEPARATOR '、') AS pet_names
     FROM booking_change_requests bcr
     INNER JOIN appointments a ON a.id = bcr.appointment_id AND a.shop_id = bcr.shop_id
     INNER JOIN customers c ON c.id = a.customer_id AND c.shop_id = a.shop_id
     INNER JOIN booking_request_details brd ON brd.appointment_id = a.id AND brd.shop_id = a.shop_id
     LEFT JOIN appointment_pets ap ON ap.appointment_id = a.id AND ap.shop_id = a.shop_id
     LEFT JOIN pets p ON p.id = ap.pet_id AND p.shop_id = ap.shop_id
     WHERE bcr.shop_id = ? AND bcr.status = 'PENDING'
     GROUP BY bcr.id, bcr.appointment_id, bcr.request_type, bcr.status,
              bcr.original_appointment_date, bcr.original_appointment_time, bcr.original_check_out,
              bcr.proposed_appointment_date, bcr.proposed_appointment_time, bcr.proposed_check_out,
              bcr.customer_note, bcr.staff_note, bcr.created_at,
              a.customer_id, a.status, c.name, c.phone, brd.service_type, brd.requested_check_out
     ORDER BY bcr.created_at ASC`,
    [getCurrentShopId()],
  );
  return {
    requests: rows.map((row) => ({
      ...normalizeChangeRequest(row),
      appointment_id: Number(row.appointment_id),
      customer_id: Number(row.customer_id),
      customer_name: row.customer_name,
      customer_phone: row.customer_phone,
      appointment_status: row.appointment_status,
      service_type: row.service_type,
      current_check_out: row.requested_check_out,
      pet_names: row.pet_names || '',
    })),
  };
}

async function listNotifications() {
  const [rows] = await getPool().query(
    `SELECT n.id, n.booking_change_request_id, n.read_at, n.created_at,
            bcr.request_type, bcr.status AS request_status,
            bcr.original_appointment_date, bcr.original_appointment_time,
            bcr.proposed_appointment_date, bcr.proposed_appointment_time,
            a.id AS appointment_id, c.name AS customer_name
     FROM shop_notifications n
     INNER JOIN booking_change_requests bcr
       ON bcr.id = n.booking_change_request_id AND bcr.shop_id = n.shop_id
     INNER JOIN appointments a ON a.id = bcr.appointment_id AND a.shop_id = bcr.shop_id
     INNER JOIN customers c ON c.id = a.customer_id AND c.shop_id = a.shop_id
     WHERE n.shop_id = ?
     ORDER BY n.created_at DESC, n.id DESC
     LIMIT 30`,
    [getCurrentShopId()],
  );
  const [[countRow]] = await getPool().query(
    'SELECT COUNT(*) AS unread_count FROM shop_notifications WHERE shop_id = ? AND read_at IS NULL',
    [getCurrentShopId()],
  );
  return {
    notifications: rows.map((row) => ({
      id: Number(row.id),
      booking_change_request_id: Number(row.booking_change_request_id),
      appointment_id: Number(row.appointment_id),
      request_type: row.request_type,
      request_status: row.request_status,
      customer_name: row.customer_name,
      original_appointment_date: String(row.original_appointment_date).slice(0, 10),
      original_appointment_time: String(row.original_appointment_time).slice(0, 5),
      proposed_appointment_date: row.proposed_appointment_date
        ? String(row.proposed_appointment_date).slice(0, 10)
        : null,
      proposed_appointment_time: row.proposed_appointment_time
        ? String(row.proposed_appointment_time).slice(0, 5)
        : null,
      read_at: row.read_at,
      created_at: row.created_at,
    })),
    unread_count: Number(countRow.unread_count),
  };
}

async function markNotificationRead(notificationIdValue) {
  const notificationId = Number(notificationIdValue);
  if (!Number.isInteger(notificationId) || notificationId <= 0) {
    throw createError('找不到通知。', 404, 'NOTIFICATION_NOT_FOUND');
  }
  const [result] = await getPool().query(
    `UPDATE shop_notifications SET read_at = COALESCE(read_at, UTC_TIMESTAMP())
     WHERE id = ? AND shop_id = ?`,
    [notificationId, getCurrentShopId()],
  );
  if (!result.affectedRows) throw createError('找不到通知。', 404, 'NOTIFICATION_NOT_FOUND');
  return { read: true };
}

async function markAllNotificationsRead() {
  await getPool().query(
    'UPDATE shop_notifications SET read_at = UTC_TIMESTAMP() WHERE shop_id = ? AND read_at IS NULL',
    [getCurrentShopId()],
  );
  return { read: true };
}

module.exports = {
  createCustomerChangeRequest,
  listCustomerRequests,
  listNotifications,
  listStaffChangeRequests,
  markAllNotificationsRead,
  markNotificationRead,
};
