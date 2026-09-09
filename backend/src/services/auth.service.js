const authRepository = require('../data/auth.repository');
const { hashSessionToken, createSessionToken } = require('../utils/session-token');
const { hashPassword, verifyPassword } = require('../utils/password');

const SESSION_COOKIE_NAME = 'psop_session';
const SESSION_TTL_DAYS = 7;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

function createAuthError(message = 'Unauthorized') {
  const error = new Error(message);
  error.statusCode = 401;
  return error;
}

function toStaffContext(staff, roles) {
  return {
    id: staff.id,
    username: staff.username,
    display_name: staff.display_name,
    status: staff.status,
    roles,
  };
}

function isActive(staff) {
  return staff && staff.status === 'ACTIVE';
}

const ACCOUNT_STATUS = {
  active: 'ACTIVE',
  inactive: 'INACTIVE',
};

const ACCOUNT_STATUS_LABELS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

function toAccountStatus(staff) {
  return {
    ...staff,
    status: ACCOUNT_STATUS_LABELS[staff.status] || staff.status,
  };
}

function createValidationError(fields) {
  const error = new Error('Validation failed');
  error.statusCode = 400;
  error.code = 'VALIDATION_ERROR';
  error.fields = fields;
  return error;
}

function normalizeRegistrationPayload(payload = {}) {
  return {
    username: typeof payload.username === 'string' ? payload.username.trim() : '',
    password: typeof payload.password === 'string' ? payload.password : '',
    displayName: typeof payload.display_name === 'string' ? payload.display_name.trim() : '',
  };
}

async function register(payload) {
  const values = normalizeRegistrationPayload(payload);
  const fields = {};
  if (!values.username) fields.username = 'Username is required';
  if (!values.password) fields.password = 'Password is required';
  if (!values.displayName) fields.display_name = 'Display name is required';
  if (values.username.length > 100) fields.username = 'Username must be 100 characters or fewer';
  if (values.displayName.length > 100) fields.display_name = 'Display name must be 100 characters or fewer';
  if (values.password.length < 8) fields.password = 'Password must be at least 8 characters';
  if (Object.keys(fields).length) throw createValidationError(fields);

  const connection = await authRepository.getPool().getConnection();
  try {
    await connection.beginTransaction();
    const isFirstUser = (await authRepository.countStaff(connection)) === 0;
    const staffId = await authRepository.createStaff({
      username: values.username,
      passwordHash: await hashPassword(values.password),
      displayName: values.displayName,
    }, connection);
    if (isFirstUser) {
      await authRepository.replaceRolesForStaff(staffId, ['OWNER'], connection);
    }
    await connection.commit();
    return {
      staff: {
        id: staffId,
        username: values.username,
        display_name: values.displayName,
        status: 'ACTIVE',
        roles: isFirstUser ? ['OWNER'] : [],
      },
    };
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      const duplicateError = createValidationError({ username: 'Username is already registered' });
      duplicateError.statusCode = 409;
      throw duplicateError;
    }
    throw error;
  } finally {
    connection.release();
  }
}

async function listStaff() {
  return (await authRepository.listStaffWithRoles()).map(toAccountStatus);
}

async function updateStaffStatus(actor, staffId, requestedStatus) {
  const normalizedStaffId = Number(staffId);
  const dbStatus = ACCOUNT_STATUS[requestedStatus];
  if (!Number.isInteger(normalizedStaffId) || !dbStatus) {
    throw createValidationError({ status: 'Status must be active or inactive' });
  }

  const connection = await authRepository.getPool().getConnection();
  try {
    await connection.beginTransaction();
    const target = await authRepository.findStaffByIdForUpdate(normalizedStaffId, connection);
    if (!target) {
      const error = new Error('找不到指定帳號');
      error.statusCode = 404;
      throw error;
    }

    if (target.id === actor.id && dbStatus === 'INACTIVE') {
      const error = new Error('不可停用自己的帳號');
      error.statusCode = 403;
      throw error;
    }

    if (target.status === dbStatus) {
      await connection.rollback();
      return toAccountStatus((await authRepository.listStaffWithRoles(connection)).find((staff) => staff.id === target.id));
    }

    if (target.status === 'ACTIVE' && dbStatus === 'INACTIVE') {
      const activeOwnerIds = await authRepository.listActiveOwnerIds(connection);
      const targetIsOwner = activeOwnerIds.includes(target.id);
      if (targetIsOwner && activeOwnerIds.length <= 1) {
        const error = new Error('不可停用最後一個管理者帳號');
        error.statusCode = 403;
        throw error;
      }
    }

    await authRepository.updateStaffStatus(normalizedStaffId, dbStatus, connection);
    const updated = (await authRepository.listStaffWithRoles(connection)).find((staff) => staff.id === target.id);
    await connection.commit();
    return toAccountStatus(updated);
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    connection.release();
  }
}

async function updateStaffRoles(staffId, roles) {
  const allowedRoles = ['OWNER', 'FRONT_DESK', 'GROOMER'];
  const normalizedRoles = Array.isArray(roles) ? [...new Set(roles)] : null;
  if (!normalizedRoles || normalizedRoles.some((role) => !allowedRoles.includes(role))) {
    throw createValidationError({ roles: 'Roles must be OWNER, FRONT_DESK, or GROOMER' });
  }
  if (!Number.isInteger(Number(staffId))) {
    throw createValidationError({ staff_id: 'Staff id is invalid' });
  }

  const connection = await authRepository.getPool().getConnection();
  try {
    await connection.beginTransaction();
    await authRepository.replaceRolesForStaff(Number(staffId), normalizedRoles, connection);
    const staff = (await authRepository.listStaffWithRoles(connection)).find((item) => item.id === Number(staffId));
    if (!staff) {
      const error = new Error('Staff not found');
      error.statusCode = 404;
      throw error;
    }
    await connection.commit();
    return staff;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function login(username, password) {
  if (!username || !password) {
    throw createAuthError('Invalid username or password');
  }

  const staff = await authRepository.findStaffByUsername(username);
  if (!staff) {
    throw createAuthError('Invalid username or password');
  }

  const passwordMatches = await verifyPassword(password, staff.password_hash);
  if (!passwordMatches) {
    throw createAuthError('Invalid username or password');
  }

  if (!isActive(staff)) {
    throw createAuthError('此帳號已停用，無法登入，請聯絡管理者。');
  }

  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await authRepository.createSession({
    staffId: staff.id,
    tokenHash,
    expiresAt,
  });

  const roles = await authRepository.listRolesForStaff(staff.id);
  return {
    token,
    staff: toStaffContext(staff, roles),
  };
}

async function authenticateToken(token) {
  if (!token) {
    throw createAuthError();
  }

  const session = await authRepository.findSessionByTokenHash(hashSessionToken(token));
  if (!session) {
    throw createAuthError();
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    throw createAuthError();
  }

  const staff = await authRepository.findStaffById(session.staff_id);
  if (!isActive(staff)) {
    throw createAuthError();
  }

  const roles = await authRepository.listRolesForStaff(staff.id);
  return toStaffContext(staff, roles);
}

async function logout(token) {
  if (!token) {
    return;
  }

  await authRepository.deleteSessionByTokenHash(hashSessionToken(token));
}

function normalizePasswordPayload(payload = {}) {
  return {
    currentPassword: typeof payload.current_password === 'string' ? payload.current_password : '',
    newPassword: typeof payload.new_password === 'string' ? payload.new_password : '',
    confirmPassword: typeof payload.confirm_password === 'string' ? payload.confirm_password : '',
  };
}

function validateNewPassword(values) {
  const fields = {};
  if (values.newPassword.length < 8) {
    fields.new_password = '新密碼至少需要 8 碼';
  }
  if (values.newPassword !== values.confirmPassword) {
    fields.confirm_password = '兩次輸入的密碼不一致';
  }
  if (Object.keys(fields).length) {
    throw createValidationError(fields);
  }
}

async function changeOwnPassword(actor, payload) {
  const values = normalizePasswordPayload(payload);
  if (!values.currentPassword) {
    throw createValidationError({ current_password: '目前密碼為必填' });
  }
  validateNewPassword(values);

  const staff = await authRepository.findStaffWithPasswordById(actor.id);
  if (!staff || !(await verifyPassword(values.currentPassword, staff.password_hash))) {
    const error = new Error('目前密碼錯誤');
    error.statusCode = 401;
    throw error;
  }

  await authRepository.updateStaffPassword(actor.id, await hashPassword(values.newPassword));
  return { message: '密碼已更新' };
}

async function resetOtherPassword(actor, staffId, payload) {
  const values = normalizePasswordPayload(payload);
  validateNewPassword(values);

  const targetId = Number(staffId);
  if (!Number.isInteger(targetId)) {
    throw createValidationError({ staff_id: 'Staff id is invalid' });
  }
  if (targetId === actor.id) {
    const error = new Error('OWNER 修改自己的密碼必須驗證目前密碼');
    error.statusCode = 400;
    throw error;
  }

  const target = await authRepository.findStaffById(targetId);
  if (!target) {
    const error = new Error('找不到指定帳號');
    error.statusCode = 404;
    throw error;
  }

  await authRepository.updateStaffPassword(targetId, await hashPassword(values.newPassword));
  return { message: '密碼已重設' };
}

module.exports = {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  authenticateToken,
  changeOwnPassword,
  createAuthError,
  login,
  listStaff,
  logout,
  register,
  resetOtherPassword,
  updateStaffRoles,
  updateStaffStatus,
};
