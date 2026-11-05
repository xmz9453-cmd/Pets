const authRepository = require('../data/auth.repository');
const { hashSessionToken, createSessionToken } = require('../utils/session-token');
const { hashPassword, verifyPassword } = require('../utils/password');
const shopsRepository = require('../data/shops.repository');
const { setCurrentShopId } = require('../utils/shop-context');

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

function normalizeStaffPayload(payload = {}) {
  return {
    username: typeof payload.username === 'string' ? payload.username.trim() : '',
    password: typeof payload.password === 'string' ? payload.password : '',
    displayName: typeof payload.display_name === 'string' ? payload.display_name.trim() : '',
    roles: Array.isArray(payload.roles) ? [...new Set(payload.roles)] : null,
  };
}

function validateStaffRoles(roles) {
  const allowedRoles = ['OWNER', 'FRONT_DESK', 'GROOMER'];
  if (!Array.isArray(roles) || roles.length === 0 || roles.some((role) => !allowedRoles.includes(role))) {
    throw createValidationError({ roles: '請至少選擇一個有效的店家角色' });
  }
}

async function createStaff(payload, shopId) {
  const values = normalizeStaffPayload(payload);
  const fields = {};
  if (!values.username) fields.username = 'Username is required';
  if (!values.password) fields.password = 'Password is required';
  if (!values.displayName) fields.display_name = 'Display name is required';
  if (values.username.length > 100) fields.username = 'Username must be 100 characters or fewer';
  if (values.displayName.length > 100) fields.display_name = 'Display name must be 100 characters or fewer';
  if (values.password.length < 8) fields.password = 'Password must be at least 8 characters';
  if (!Number.isInteger(Number(shopId)) || Number(shopId) < 1) fields.shop_id = 'Shop id is invalid';
  if (Object.keys(fields).length) throw createValidationError(fields);
  validateStaffRoles(values.roles);

  const normalizedShopId = Number(shopId);
  const shop = await shopsRepository.getShopById(normalizedShopId);
  if (!shop || shop.status !== 'ACTIVE') {
    const error = new Error('找不到可使用的店家');
    error.statusCode = 404;
    throw error;
  }

  const passwordHash = await hashPassword(values.password);
  const connection = await authRepository.getPool().getConnection();
  try {
    await connection.beginTransaction();
    const staffId = await authRepository.createStaff({
      username: values.username,
      passwordHash,
      displayName: values.displayName,
    }, connection);
    await shopsRepository.addMembership(staffId, normalizedShopId, values.roles, connection);
    const staff = (await shopsRepository.listAllStaffWithRolesAtShop(normalizedShopId, connection))
      .find((item) => item.id === staffId);
    await connection.commit();
    return toAccountStatus(staff);
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

async function listStaff(shopId) {
  return (await shopsRepository.listAllStaffWithRolesAtShop(shopId)).map(toAccountStatus);
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
      const currentShopStaff = await shopsRepository.listAllStaffWithRolesAtShop(actor.shop_id, connection);
      return toAccountStatus(currentShopStaff.find((staff) => staff.id === target.id));
    }

    if (target.status === 'ACTIVE' && dbStatus === 'INACTIVE') {
      const ownerShopIds = (await authRepository.listActiveOwnerShopIds(normalizedStaffId, connection)).sort((a, b) => a - b);
      for (const shopId of ownerShopIds) {
        await shopsRepository.lockShop(shopId, connection);
        if (await shopsRepository.countActiveOwnersAtShop(shopId, connection) <= 1) {
          const error = new Error('不可停用店內最後一位 OWNER 帳號');
          error.statusCode = 403;
          throw error;
        }
      }
    }

    await authRepository.updateStaffStatus(normalizedStaffId, dbStatus, connection);
    if (dbStatus === 'INACTIVE') {
      await authRepository.deleteSessionsForStaff(normalizedStaffId, connection);
    }
    const updated = (await shopsRepository.listAllStaffWithRolesAtShop(actor.shop_id, connection))
      .find((staff) => staff.id === target.id);
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

async function updateStaffRoles(actor, staffId, roles, shopId) {
  const normalizedRoles = Array.isArray(roles) ? [...new Set(roles)] : null;
  if (normalizedRoles?.length) validateStaffRoles(normalizedRoles);
  if (!normalizedRoles) {
    throw createValidationError({ roles: 'Roles must be an array' });
  }
  if (!Number.isInteger(Number(staffId)) || !Number.isInteger(Number(shopId))) {
    throw createValidationError({ staff_id: 'Staff id is invalid' });
  }

  const targetId = Number(staffId);
  const normalizedShopId = Number(shopId);
  const connection = await authRepository.getPool().getConnection();
  try {
    await connection.beginTransaction();
    const target = await authRepository.findStaffByIdForUpdate(targetId, connection);
    if (!target) {
      const error = new Error('找不到指定帳號');
      error.statusCode = 404;
      throw error;
    }
    if (target.status !== 'ACTIVE') {
      const error = new Error('停用帳號不可加入店家或調整角色');
      error.statusCode = 409;
      throw error;
    }
    if (!await shopsRepository.lockShop(normalizedShopId, connection)) {
      const error = new Error('找不到指定店家');
      error.statusCode = 404;
      throw error;
    }

    const currentRoles = await shopsRepository.listRolesForStaffAtShop(targetId, normalizedShopId);
    const isMember = await shopsRepository.hasMembership(targetId, normalizedShopId, connection);
    if (!actor.is_platform_shop_manager
      && (await shopsRepository.isPlatformShopManager(targetId)
        || currentRoles.includes('OWNER')
        || normalizedRoles.includes('OWNER'))) {
      const error = new Error('OWNER 身分及系統管理者帳號僅能由系統管理者管理');
      error.statusCode = 403;
      throw error;
    }
    if (!normalizedRoles.length && !isMember) {
      const error = new Error('此員工尚未加入該店');
      error.statusCode = 404;
      throw error;
    }
    if (currentRoles.includes('OWNER') && !normalizedRoles.includes('OWNER')
      && await shopsRepository.countActiveOwnersAtShop(normalizedShopId, connection) <= 1) {
      const error = new Error('不可移除店內最後一位 OWNER');
      error.statusCode = 403;
      throw error;
    }

    if (normalizedRoles.length) {
      await shopsRepository.addMembership(targetId, normalizedShopId, normalizedRoles, connection);
    } else {
      await shopsRepository.removeMembership(targetId, normalizedShopId, connection);
      if (await shopsRepository.countMembershipsForStaff(targetId, connection) === 0) {
        await authRepository.deleteSessionsForStaff(targetId, connection);
      }
    }
    const staff = (await shopsRepository.listAllStaffWithRolesAtShop(normalizedShopId, connection))
      .find((item) => item.id === targetId);
    await connection.commit();
    return toAccountStatus(staff);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function removeStaffMembership(actor, staffId, shopId) {
  return updateStaffRoles(actor, staffId, [], shopId);
}

async function login(username, password, requestedShopId) {
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

  const isPlatformShopManager = await shopsRepository.isPlatformShopManager(staff.id);
  const shops = isPlatformShopManager
    ? await shopsRepository.listAllShops()
    : await shopsRepository.listShopsForStaff(staff.id);
  if (!shops.length) throw createAuthError();
  const selectedShop = shops.find((shop) => shop.id === Number(requestedShopId)) || shops[0];
  setCurrentShopId(selectedShop.id);
  const roles = isPlatformShopManager
    ? ['OWNER']
    : await shopsRepository.listRolesForStaffAtShop(staff.id, selectedShop.id);
  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await authRepository.createSession({
    staffId: staff.id,
    tokenHash,
    expiresAt,
  });
  return {
    token,
    staff: {
      ...toStaffContext(staff, roles),
      shop_id: selectedShop.id,
      shops,
      is_platform_shop_manager: isPlatformShopManager,
    },
  };
}

async function authenticateToken(token, requestedShopId) {
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

  const isPlatformShopManager = await shopsRepository.isPlatformShopManager(staff.id);
  const shops = isPlatformShopManager
    ? await shopsRepository.listAllShops()
    : await shopsRepository.listShopsForStaff(staff.id);
  const selectedShop = shops.find((shop) => shop.id === Number(requestedShopId))
    || (!requestedShopId ? shops[0] : null);
  if (!selectedShop) throw createAuthError();
  setCurrentShopId(selectedShop.id);
  const roles = isPlatformShopManager
    ? ['OWNER']
    : await shopsRepository.listRolesForStaffAtShop(staff.id, selectedShop.id);
  return {
    ...toStaffContext(staff, roles),
    shop_id: selectedShop.id,
    shops,
    is_platform_shop_manager: isPlatformShopManager,
  };
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

  const passwordHash = await hashPassword(values.newPassword);
  const connection = await authRepository.getPool().getConnection();
  try {
    await connection.beginTransaction();
    const target = await authRepository.findStaffByIdForUpdate(targetId, connection);
    if (!target) {
      const error = new Error('找不到指定帳號');
      error.statusCode = 404;
      throw error;
    }
    await authRepository.updateStaffPassword(targetId, passwordHash, connection);
    await authRepository.deleteSessionsForStaff(targetId, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return { message: '密碼已重設' };
}

module.exports = {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  authenticateToken,
  changeOwnPassword,
  createAuthError,
  createStaff,
  login,
  listStaff,
  logout,
  removeStaffMembership,
  resetOtherPassword,
  updateStaffRoles,
  updateStaffStatus,
};
