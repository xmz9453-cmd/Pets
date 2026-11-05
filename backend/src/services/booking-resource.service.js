const { getPool } = require('../config/database');
const { getCurrentShopId } = require('../utils/shop-context');

const RESOURCE_TYPES = new Set(['STAFF', 'GROOMING_STATION', 'BOARDING_ROOM']);
const SERVICE_TYPES = new Set(['GROOMING', 'BOARDING', 'BOTH']);
const WEEKDAYS = new Set(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']);

function createValidationError(fields) {
  const error = new Error('Validation failed');
  error.statusCode = 400;
  error.code = 'VALIDATION_ERROR';
  error.fields = fields;
  return error;
}

function createNotFoundError() {
  const error = new Error('Booking resource not found');
  error.statusCode = 404;
  error.code = 'BOOKING_RESOURCE_NOT_FOUND';
  return error;
}

function normalizeHours(value) {
  if (!Array.isArray(value)) throw createValidationError({ hours: 'Hours must be a list' });
  const windows = [];
  const byDay = new Map();
  for (const [index, item] of value.entries()) {
    const weekday = String(item?.weekday || '');
    const startTime = String(item?.start_time || '').trim();
    const endTime = String(item?.end_time || '').trim();
    if (!WEEKDAYS.has(weekday)) {
      throw createValidationError({ [`hours[${index}].weekday`]: 'Weekday is invalid' });
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)
      || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)
      || endTime <= startTime) {
      throw createValidationError({ [`hours[${index}]`]: 'A valid start and end time are required' });
    }
    const dayWindows = byDay.get(weekday) || [];
    const startMinutes = Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3, 5));
    const endMinutes = Number(endTime.slice(0, 2)) * 60 + Number(endTime.slice(3, 5));
    if (dayWindows.some((window) => startMinutes < window.end && endMinutes > window.start)) {
      throw createValidationError({ [`hours[${index}]`]: 'Resource hours cannot overlap' });
    }
    dayWindows.push({ start: startMinutes, end: endMinutes });
    byDay.set(weekday, dayWindows);
    windows.push({ weekday, start_time: `${startTime}:00`, end_time: `${endTime}:00` });
  }
  if (!windows.length) throw createValidationError({ hours: 'At least one availability window is required' });
  return windows;
}

function normalizeResource(payload = {}) {
  const errors = {};
  const resourceType = String(payload.resource_type || '');
  const serviceType = String(payload.service_type || 'BOTH');
  const name = String(payload.name || '').trim();
  const capacity = Number(payload.capacity ?? 1);
  const staffId = payload.staff_id === undefined || payload.staff_id === '' || payload.staff_id === null
    ? null
    : Number(payload.staff_id);

  if (!RESOURCE_TYPES.has(resourceType)) errors.resource_type = 'Resource type is invalid';
  if (!SERVICE_TYPES.has(serviceType)) errors.service_type = 'Service type is invalid';
  if (!name || name.length > 100) errors.name = 'Name is required and must be 100 characters or fewer';
  if (!Number.isInteger(capacity) || capacity <= 0 || capacity > 1000) errors.capacity = 'Capacity must be between 1 and 1000';
  if (resourceType === 'STAFF' && (!Number.isInteger(staffId) || staffId <= 0)) {
    errors.staff_id = 'An active shop staff member is required';
  }
  if (resourceType !== 'STAFF' && staffId !== null) errors.staff_id = 'Only staff resources can reference a staff member';
  if (Object.keys(errors).length) throw createValidationError(errors);

  return {
    resource_type: resourceType,
    service_type: serviceType,
    name,
    capacity,
    staff_id: staffId,
    status: payload.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
  };
}

function normalizeResourceBlock(payload = {}) {
  const blockDate = String(payload.block_date || '').trim();
  const startTime = String(payload.start_time || '').trim();
  const endTime = String(payload.end_time || '').trim();
  const note = payload.note === undefined || payload.note === null ? '' : String(payload.note).trim();
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(blockDate) ? new Date(`${blockDate}T00:00:00Z`) : null;
  if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== blockDate) {
    throw createValidationError({ block_date: 'A valid block date is required' });
  }
  if ((startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime))
    || (endTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime))
    || Boolean(startTime) !== Boolean(endTime)
    || (startTime && endTime <= startTime)) {
    throw createValidationError({ time: 'Provide a valid start and end time, or leave both blank for a full-day block' });
  }
  if (note.length > 255) throw createValidationError({ note: 'Note must be 255 characters or fewer' });
  return {
    block_date: blockDate,
    start_time: startTime ? `${startTime}:00` : null,
    end_time: endTime ? `${endTime}:00` : null,
    note: note || null,
  };
}

async function getBookingResources() {
  const [resources] = await getPool().query(
    `SELECT r.*, s.display_name AS staff_name
     FROM booking_resources r
     LEFT JOIN staff s ON s.id = r.staff_id
     WHERE r.shop_id = ?
     ORDER BY r.resource_type ASC, r.name ASC`,
    [getCurrentShopId()],
  );
  const [hours] = await getPool().query(
    `SELECT resource_id, weekday, start_time, end_time
     FROM booking_resource_hours
     WHERE shop_id = ?
     ORDER BY weekday ASC, start_time ASC`,
    [getCurrentShopId()],
  );
  const [staff] = await getPool().query(
    `SELECT DISTINCT s.id, s.display_name, s.status
     FROM staff_shop_memberships m
     INNER JOIN staff s ON s.id = m.staff_id
     WHERE m.shop_id = ? AND s.status = 'ACTIVE'
     ORDER BY s.display_name ASC, s.id ASC`,
    [getCurrentShopId()],
  );
  const [blocks] = await getPool().query(
    `SELECT id, resource_id, block_date, start_time, end_time, note
     FROM booking_resource_blocks
     WHERE shop_id = ?
     ORDER BY block_date ASC, start_time ASC`,
    [getCurrentShopId()],
  );
  const hoursByResource = new Map();
  const blocksByResource = new Map();
  for (const hour of hours) {
    const resourceId = Number(hour.resource_id);
    if (!hoursByResource.has(resourceId)) hoursByResource.set(resourceId, []);
    hoursByResource.get(resourceId).push({
      weekday: hour.weekday,
      start_time: String(hour.start_time).slice(0, 5),
      end_time: String(hour.end_time).slice(0, 5),
    });
  }
  for (const block of blocks) {
    const resourceId = Number(block.resource_id);
    if (!blocksByResource.has(resourceId)) blocksByResource.set(resourceId, []);
    const date = block.block_date instanceof Date
      ? `${block.block_date.getFullYear()}-${String(block.block_date.getMonth() + 1).padStart(2, '0')}-${String(block.block_date.getDate()).padStart(2, '0')}`
      : String(block.block_date).slice(0, 10);
    blocksByResource.get(resourceId).push({
      id: Number(block.id),
      block_date: date,
      start_time: block.start_time ? String(block.start_time).slice(0, 5) : null,
      end_time: block.end_time ? String(block.end_time).slice(0, 5) : null,
      note: block.note,
    });
  }
  return {
    staff_options: staff.map((member) => ({
      id: Number(member.id),
      display_name: member.display_name,
    })),
    resources: resources.map((resource) => ({
      id: Number(resource.id),
      resource_type: resource.resource_type,
      service_type: resource.service_type,
      staff_id: resource.staff_id === null ? null : Number(resource.staff_id),
      staff_name: resource.staff_name || null,
      name: resource.name,
      capacity: Number(resource.capacity),
      status: resource.status,
      hours: hoursByResource.get(Number(resource.id)) || [],
      blocks: blocksByResource.get(Number(resource.id)) || [],
    })),
  };
}

async function saveHours(resourceId, hoursValue) {
  const id = Number(resourceId);
  if (!Number.isInteger(id) || id <= 0) throw createNotFoundError();
  const hours = normalizeHours(hoursValue);
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const [resources] = await connection.query(
      'SELECT id FROM booking_resources WHERE id = ? AND shop_id = ? LIMIT 1 FOR UPDATE',
      [id, getCurrentShopId()],
    );
    if (!resources.length) throw createNotFoundError();
    await connection.query('DELETE FROM booking_resource_hours WHERE resource_id = ? AND shop_id = ?', [
      id,
      getCurrentShopId(),
    ]);
    for (const window of hours) {
      await connection.query(
        `INSERT INTO booking_resource_hours
           (shop_id, resource_id, weekday, start_time, end_time)
         VALUES (?, ?, ?, ?, ?)`,
        [getCurrentShopId(), id, window.weekday, window.start_time, window.end_time],
      );
    }
    await connection.commit();
    return { resource_id: id, hours };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function createBookingResource(payload = {}) {
  const resource = normalizeResource(payload);
  const hours = resource.resource_type === 'BOARDING_ROOM' && payload.hours === undefined
    ? []
    : normalizeHours(payload.hours);
  if (resource.staff_id !== null) {
    const [members] = await getPool().query(
      `SELECT m.staff_id
       FROM staff_shop_memberships m
       INNER JOIN staff s ON s.id = m.staff_id
       WHERE m.shop_id = ? AND m.staff_id = ? AND s.status = 'ACTIVE'
       LIMIT 1`,
      [getCurrentShopId(), resource.staff_id],
    );
    if (!members.length) throw createValidationError({ staff_id: 'Staff member is not active in this shop' });
  }

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO booking_resources
         (shop_id, resource_type, service_type, staff_id, name, capacity, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        getCurrentShopId(),
        resource.resource_type,
        resource.service_type,
        resource.staff_id,
        resource.name,
        resource.capacity,
        resource.status,
      ],
    );
    const resourceId = Number(result.insertId);
    for (const window of hours) {
      await connection.query(
        `INSERT INTO booking_resource_hours
           (shop_id, resource_id, weekday, start_time, end_time)
         VALUES (?, ?, ?, ?, ?)`,
        [getCurrentShopId(), resourceId, window.weekday, window.start_time, window.end_time],
      );
    }
    await connection.commit();
    return { resource: { id: resourceId, ...resource, hours } };
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      const duplicate = new Error('A resource with this name or staff member already exists');
      duplicate.statusCode = 409;
      duplicate.code = 'BOOKING_RESOURCE_DUPLICATE';
      throw duplicate;
    }
    throw error;
  } finally {
    connection.release();
  }
}

async function updateBookingResource(resourceId, payload = {}) {
  const id = Number(resourceId);
  if (!Number.isInteger(id) || id <= 0) throw createNotFoundError();
  const resource = normalizeResource(payload);
  if (resource.staff_id !== null) {
    const [members] = await getPool().query(
      `SELECT m.staff_id
       FROM staff_shop_memberships m
       INNER JOIN staff s ON s.id = m.staff_id
       WHERE m.shop_id = ? AND m.staff_id = ? AND s.status = 'ACTIVE'
       LIMIT 1`,
      [getCurrentShopId(), resource.staff_id],
    );
    if (!members.length) throw createValidationError({ staff_id: 'Staff member is not active in this shop' });
  }
  const [result] = await getPool().query(
    `UPDATE booking_resources
     SET resource_type = ?, service_type = ?, staff_id = ?, name = ?, capacity = ?, status = ?
     WHERE id = ? AND shop_id = ?`,
    [
      resource.resource_type,
      resource.service_type,
      resource.staff_id,
      resource.name,
      resource.capacity,
      resource.status,
      id,
      getCurrentShopId(),
    ],
  );
  if (!result.affectedRows) {
    const [existing] = await getPool().query(
      'SELECT id FROM booking_resources WHERE id = ? AND shop_id = ? LIMIT 1',
      [id, getCurrentShopId()],
    );
    if (!existing.length) throw createNotFoundError();
  }
  return { resource: { id, ...resource } };
}

async function deleteBookingResource(resourceId) {
  const id = Number(resourceId);
  if (!Number.isInteger(id) || id <= 0) throw createNotFoundError();
  let result;
  try {
    [result] = await getPool().query(
      'DELETE FROM booking_resources WHERE id = ? AND shop_id = ?',
      [id, getCurrentShopId()],
    );
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      const conflict = new Error('Resource has a linked appointment and cannot be deleted');
      conflict.statusCode = 409;
      conflict.code = 'BOOKING_RESOURCE_IN_USE';
      throw conflict;
    }
    throw error;
  }
  if (!result.affectedRows) throw createNotFoundError();
  return { deleted: true };
}

async function createBookingResourceBlock(resourceId, payload = {}) {
  const id = Number(resourceId);
  if (!Number.isInteger(id) || id <= 0) throw createNotFoundError();
  const block = normalizeResourceBlock(payload);
  const startAt = `${block.block_date} ${block.start_time || '00:00:00'}`;
  const nextDay = new Date(`${block.block_date}T00:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const endAt = block.end_time
    ? `${block.block_date} ${block.end_time}`
    : `${nextDay.toISOString().slice(0, 10)} 00:00:00`;
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const [resources] = await connection.query(
      'SELECT id FROM booking_resources WHERE id = ? AND shop_id = ? LIMIT 1 FOR UPDATE',
      [id, getCurrentShopId()],
    );
    if (!resources.length) throw createNotFoundError();
    const [allocations] = await connection.query(
      `SELECT ara.id FROM appointment_resource_assignments ara
       INNER JOIN appointments a ON a.id = ara.appointment_id AND a.shop_id = ara.shop_id
       WHERE ara.shop_id = ? AND ara.resource_id = ? AND a.status IN ('AWAITING_CUSTOMER', 'SCHEDULED', 'CONFIRMED')
         AND ara.start_at < ? AND ara.end_at > ?
       LIMIT 1 FOR UPDATE`,
      [getCurrentShopId(), id, endAt, startAt],
    );
    if (allocations.length) {
      const conflict = new Error('Resource has a linked appointment during this block');
      conflict.statusCode = 409;
      conflict.code = 'BOOKING_RESOURCE_IN_USE';
      throw conflict;
    }
    const [result] = await connection.query(
      `INSERT INTO booking_resource_blocks
         (shop_id, resource_id, block_date, start_time, end_time, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [getCurrentShopId(), id, block.block_date, block.start_time, block.end_time, block.note],
    );
    await connection.commit();
    return { block: { id: Number(result.insertId), ...block } };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteBookingResourceBlock(resourceId, blockId) {
  const resource = Number(resourceId);
  const id = Number(blockId);
  if (!Number.isInteger(resource) || resource <= 0 || !Number.isInteger(id) || id <= 0) {
    throw createNotFoundError();
  }
  const [result] = await getPool().query(
    'DELETE FROM booking_resource_blocks WHERE id = ? AND resource_id = ? AND shop_id = ?',
    [id, resource, getCurrentShopId()],
  );
  if (!result.affectedRows) throw createNotFoundError();
  return { deleted: true };
}

module.exports = {
  createBookingResourceBlock,
  createBookingResource,
  deleteBookingResourceBlock,
  deleteBookingResource,
  getBookingResources,
  saveHours,
  updateBookingResource,
};
