const authRepository = require('../data/auth.repository');
const { hashSessionToken, createSessionToken } = require('../utils/session-token');
const { verifyPassword } = require('../utils/password');

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

async function login(username, password) {
  if (!username || !password) {
    throw createAuthError('Invalid username or password');
  }

  const staff = await authRepository.findStaffByUsername(username);
  if (!staff) {
    throw createAuthError('Invalid username or password');
  }

  const passwordMatches = await verifyPassword(password, staff.password_hash);
  if (!passwordMatches || !isActive(staff)) {
    throw createAuthError('Invalid username or password');
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

module.exports = {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  authenticateToken,
  createAuthError,
  login,
  logout,
};
