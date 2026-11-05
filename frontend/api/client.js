export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');
const { getUserFacingErrorMessage } = require('../utils/error-message');

async function request(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const selectedShopId = typeof window !== 'undefined'
    ? window.localStorage.getItem('psop.currentShopId')
    : '';
  const headers = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(selectedShopId ? { 'X-Shop-Id': selectedShopId } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });
  const body = await response.json();

  if (!response.ok || body.success === false) {
    const apiError = body.error || {};
    const isLoginCredentialFailure = path === '/api/auth/login'
      && response.status === 401
      && apiError.message === 'Invalid username or password';
    const isContractPdfUpload = options.method === 'POST'
      && /^\/api\/contract-versions\/\d+\/pdf$/.test(path);
    const uploadValidationMessage = isContractPdfUpload && apiError.fields
      ? Object.values(apiError.fields).find((message) => typeof message === 'string' && message.trim())
      : '';

    let errorMessage;
    if (isLoginCredentialFailure) {
      errorMessage = apiError.message;
    } else if (isContractPdfUpload && (apiError.message || uploadValidationMessage)) {
      errorMessage = apiError.message || uploadValidationMessage;
    } else {
      errorMessage = getUserFacingErrorMessage(apiError, response.status);
    }

    const error = new Error(errorMessage);
    error.code = apiError.code;
    error.statusCode = response.status;
    throw error;
  }

  return body.data;
}

export function fetchWithShop(url, options = {}) {
  const selectedShopId = typeof window !== 'undefined'
    ? window.localStorage.getItem('psop.currentShopId')
    : '';
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(selectedShopId ? { 'X-Shop-Id': selectedShopId } : {}),
    },
  });
}

export async function getApplicationHealth() {
  return request('/api/health');
}

export async function getDatabaseHealth() {
  return request('/api/health/database');
}

export async function getPublicShops() {
  return request('/api/public/shops');
}

export async function getPublicPortalBackground() {
  return request('/api/public/portal-background');
}

export async function getPortalBackgrounds() {
  return request('/api/portal-backgrounds');
}

export async function uploadPortalBackground(file) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/api/portal-backgrounds', { method: 'POST', body: formData });
}

export async function activatePortalBackground(id) {
  return request(`/api/portal-backgrounds/${id}/active`, { method: 'PUT' });
}

export async function deletePortalBackground(id) {
  return request(`/api/portal-backgrounds/${id}`, { method: 'DELETE' });
}

export async function uploadShopLogo(file) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/api/shop-settings/logo', { method: 'POST', body: formData });
}

export async function deleteShopLogo() {
  return request('/api/shop-settings/logo', { method: 'DELETE' });
}

export async function login(username, password) {
  const result = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (typeof window !== 'undefined' && result.staff?.shop_id) {
    window.localStorage.setItem('psop.currentShopId', String(result.staff.shop_id));
  }
  return result;
}

export async function createShop(payload) {
  return request('/api/shops', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getShopStaff() {
  return request('/api/shops/staff');
}

export async function createStaffAccount(payload) {
  return request('/api/auth/staff', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateShopStaffRoles(staffId, roles) {
  return request(`/api/shops/staff/${staffId}/roles`, {
    method: 'PATCH',
    body: JSON.stringify({ roles }),
  });
}

export async function getStaffAccounts() {
  return request('/api/auth/staff');
}

export async function updateStaffRoles(staffId, roles) {
  return request(`/api/auth/staff/${staffId}/roles`, {
    method: 'PATCH',
    body: JSON.stringify({ roles }),
  });
}

export async function removeStaffMembership(staffId) {
  return request(`/api/auth/staff/${staffId}/membership`, { method: 'DELETE' });
}

export async function updateStaffStatus(staffId, status) {
  return request(`/api/auth/staff/${staffId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function changeOwnPassword(currentPassword, newPassword, confirmPassword) {
  return request('/api/auth/password', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    }),
  });
}

export async function resetStaffPassword(staffId, newPassword, confirmPassword) {
  return request(`/api/auth/staff/${staffId}/password`, {
    method: 'POST',
    body: JSON.stringify({ new_password: newPassword, confirm_password: confirmPassword }),
  });
}

export async function logout() {
  return request('/api/auth/logout', {
    method: 'POST',
  });
}

export async function getCurrentStaff() {
  return request('/api/auth/me');
}

export async function createOnboarding() {
  return request('/api/onboardings', { method: 'POST', body: '{}' });
}

function publicShopOptions(shopId) {
  return shopId ? { headers: { 'X-Shop-Id': String(shopId) } } : {};
}

export async function createPublicOnboarding(shopId) {
  return request('/api/public/onboardings', { method: 'POST', body: '{}', ...publicShopOptions(shopId) });
}

export async function requestPublicBookingOtp(phone, shopId) {
  return request('/api/public/booking/otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
    ...publicShopOptions(shopId),
  });
}

export async function verifyPublicBookingOtp(phone, code, shopId) {
  return request('/api/public/booking/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
    ...publicShopOptions(shopId),
  });
}

export async function getPublicBookingPets(shopId) {
  return request('/api/public/booking/pets', publicShopOptions(shopId));
}

export async function getPublicBookingServices(petId, shopId) {
  return request(`/api/public/booking/services?pet_id=${encodeURIComponent(petId)}`, publicShopOptions(shopId));
}

export async function getPublicBookingAvailability(filters, shopId) {
  const query = new URLSearchParams(filters).toString();
  return request(`/api/public/booking/availability?${query}`, publicShopOptions(shopId));
}

export async function createPublicBookingRequest(payload, shopId) {
  return request('/api/public/booking/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
    ...publicShopOptions(shopId),
  });
}

export async function getCustomerMemberProviders() {
  return request('/api/public/member/providers');
}

export async function getCustomerMember(shopId) {
  return request('/api/public/member/me', publicShopOptions(shopId));
}

export async function logoutCustomerMember(shopId) {
  return request('/api/public/member/logout', {
    method: 'POST',
    body: '{}',
    ...publicShopOptions(shopId),
  });
}

export function getCustomerMemberAuthUrl(provider, shopId, intent = 'LOGIN') {
  const action = intent === 'LINK' ? `/${encodeURIComponent(provider)}/link` : `/${encodeURIComponent(provider)}`;
  const query = new URLSearchParams({ shop_id: String(shopId || 1) });
  return `${API_BASE_URL}/api/public/member/auth${action}?${query}`;
}

export async function getCustomerBookingPets(shopId) {
  return request('/api/public/member/pets', publicShopOptions(shopId));
}

export async function getCustomerBookingServices(filters, shopId) {
  const query = new URLSearchParams(filters).toString();
  return request(`/api/public/member/services?${query}`, publicShopOptions(shopId));
}

export async function getCustomerBookingProducts(species, shopId) {
  const query = new URLSearchParams({ species }).toString();
  return request(`/api/public/member/products?${query}`, publicShopOptions(shopId));
}

export async function getCustomerBookingAvailability(filters, shopId) {
  const query = new URLSearchParams(filters).toString();
  return request(`/api/public/member/availability?${query}`, publicShopOptions(shopId));
}

export async function createCustomerBookingRequest(payload, shopId) {
  return request('/api/public/member/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
    ...publicShopOptions(shopId),
  });
}

export async function getCustomerBookingRequests(shopId) {
  return request('/api/public/member/requests', publicShopOptions(shopId));
}

export async function getCustomerBookingOnboardingToken(appointmentId, shopId) {
  return request(`/api/public/member/requests/${encodeURIComponent(appointmentId)}/onboarding`, publicShopOptions(shopId));
}

function publicOnboardingPath(token, suffix = '') {
  return `/api/public/onboardings/${encodeURIComponent(token)}${suffix}`;
}

export async function getPublicOnboarding(token) {
  return request(publicOnboardingPath(token));
}

export async function getPublicOnboardingAvailability(token, filters) {
  const query = new URLSearchParams(filters).toString();
  return request(`${publicOnboardingPath(token, '/availability')}?${query}`);
}

export async function savePublicOnboarding(token, payload) {
  return request(publicOnboardingPath(token), { method: 'PUT', body: JSON.stringify(payload) });
}

export async function searchOnboardingCustomers(token, query) {
  return request(`${publicOnboardingPath(token, '/customers')}?q=${encodeURIComponent(query)}`);
}

export async function searchOnboardingPets(token, query) {
  return request(`${publicOnboardingPath(token, '/pets')}?q=${encodeURIComponent(query)}`);
}

export async function resolveOnboardingCustomer(token, payload) {
  return request(publicOnboardingPath(token, '/customer-resolution'), { method: 'POST', body: JSON.stringify(payload) });
}

export async function resolveOnboardingPet(token, payload) {
  return request(publicOnboardingPath(token, '/pet-resolution'), { method: 'POST', body: JSON.stringify(payload) });
}

export async function submitPublicOnboarding(token, signaturePng) {
  return request(publicOnboardingPath(token, '/submit'), { method: 'POST', body: JSON.stringify({ signature_png: signaturePng }) });
}

export async function getPets(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  });
  const query = search.toString();
  return request(`/api/pets${query ? `?${query}` : ''}`);
}

export async function getPet(petId) {
  return request(`/api/pets/${petId}`);
}

export async function createPet(payload) {
  return request('/api/pets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePet(petId, payload) {
  return request(`/api/pets/${petId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deletePet(petId) {
  return request(`/api/pets/${petId}`, { method: 'DELETE' });
}

export async function getPetRelationships(petId) {
  return request(`/api/pets/${petId}/customers`);
}

export async function addPetRelationship(petId, payload) {
  return request(`/api/pets/${petId}/customers`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function setPetPrimaryCustomer(petId, customerId) {
  return request(`/api/pets/${petId}/customers/${customerId}/primary`, {
    method: 'PATCH',
  });
}

export async function removePetRelationship(petId, customerId) {
  return request(`/api/pets/${petId}/customers/${customerId}`, {
    method: 'DELETE',
  });
}

export async function getCustomers(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  });
  const query = search.toString();
  return request(`/api/customers${query ? `?${query}` : ''}`);
}

export async function getAppointments(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  });
  const query = search.toString();
  return request(`/api/appointments${query ? `?${query}` : ''}`);
}

export async function getAppointment(appointmentId) {
  return request(`/api/appointments/${appointmentId}`);
}

export async function createAppointment(payload) {
  return request('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAppointment(appointmentId, payload) {
  return request(`/api/appointments/${appointmentId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function acceptBookingRequest(appointmentId) {
  return request(`/api/appointments/${encodeURIComponent(appointmentId)}/accept`, {
    method: 'POST',
    body: '{}',
  });
}

export async function deleteAppointment(appointmentId) {
  return request(`/api/appointments/${appointmentId}`, { method: 'DELETE' });
}

export async function getCustomer(customerId) {
  return request(`/api/customers/${customerId}`);
}

export async function linkCustomerToMember(customerId, customerMemberId) {
  return request(`/api/customers/${customerId}/member-link`, {
    method: 'POST',
    body: JSON.stringify({ customer_member_id: customerMemberId }),
  });
}

export function getCustomerContractPdfUrl(customerId, historyId) {
  return `${API_BASE_URL}/api/customers/${encodeURIComponent(customerId)}/contracts/${encodeURIComponent(historyId)}/pdf`;
}

export function getCustomerContractSignatureUrl(customerId, historyId) {
  return `${API_BASE_URL}/api/customers/${encodeURIComponent(customerId)}/contracts/${encodeURIComponent(historyId)}/signature`;
}

export async function createCustomer(payload) {
  return request('/api/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCustomer(customerId, payload) {
  return request(`/api/customers/${customerId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deactivateCustomer(customerId) {
  return request(`/api/customers/${customerId}/deactivate`, {
    method: 'PATCH',
  });
}

export async function reactivateCustomer(customerId) {
  return request(`/api/customers/${customerId}/reactivate`, {
    method: 'PATCH',
  });
}

export async function deleteCustomer(customerId) {
  return request(`/api/customers/${customerId}`, {
    method: 'DELETE',
  });
}

export async function getShopSettings() {
  return request('/api/shop-settings');
}

export async function getShopIdentity() {
  return request('/api/shop-identity');
}

export async function updateShopSettings(payload) {
  return request('/api/shop-settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function getBookingSchedule() {
  return request('/api/shop-settings/booking-schedule');
}

export async function getBookingResources() {
  return request('/api/shop-settings/booking-resources');
}

export async function createBookingResource(payload) {
  return request('/api/shop-settings/booking-resources', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createBookingResourceBlock(resourceId, payload) {
  return request(`/api/shop-settings/booking-resources/${encodeURIComponent(resourceId)}/blocks`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBookingResource(resourceId, payload) {
  return request(`/api/shop-settings/booking-resources/${encodeURIComponent(resourceId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteBookingResource(resourceId) {
  return request(`/api/shop-settings/booking-resources/${encodeURIComponent(resourceId)}`, {
    method: 'DELETE',
  });
}

export async function deleteBookingResourceBlock(resourceId, blockId) {
  return request(`/api/shop-settings/booking-resources/${encodeURIComponent(resourceId)}/blocks/${encodeURIComponent(blockId)}`, {
    method: 'DELETE',
  });
}

export async function updateBookingResourceHours(resourceId, hours) {
  return request(`/api/shop-settings/booking-resources/${encodeURIComponent(resourceId)}/hours`, {
    method: 'PUT',
    body: JSON.stringify({ hours }),
  });
}

export async function createBookingScheduleRule(payload) {
  return request('/api/shop-settings/booking-schedule/rules', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBookingScheduleRule(ruleId, payload) {
  return request(`/api/shop-settings/booking-schedule/rules/${encodeURIComponent(ruleId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteBookingScheduleRule(ruleId) {
  return request(`/api/shop-settings/booking-schedule/rules/${encodeURIComponent(ruleId)}`, {
    method: 'DELETE',
  });
}

export async function createBookingScheduleOverride(payload) {
  return request('/api/shop-settings/booking-schedule/overrides', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBookingScheduleOverride(overrideId, payload) {
  return request(`/api/shop-settings/booking-schedule/overrides/${encodeURIComponent(overrideId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteBookingScheduleOverride(overrideId) {
  return request(`/api/shop-settings/booking-schedule/overrides/${encodeURIComponent(overrideId)}`, {
    method: 'DELETE',
  });
}

export async function resetOperationalData(confirmation, expectedShopId) {
  return request('/api/shop-settings/reset-operational-data', {
    method: 'POST',
    body: JSON.stringify({ confirmation, expected_shop_id: expectedShopId }),
  });
}

export async function getContractVersions() {
  return request('/api/contract-versions');
}

export async function createContractVersion(payload) {
  return request('/api/contract-versions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateContractVersion(versionId, payload) {
  return request(`/api/contract-versions/${versionId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteContractVersion(versionId) {
  return request(`/api/contract-versions/${versionId}`, {
    method: 'DELETE',
  });
}

export async function uploadContractVersionPdf(versionId, file) {
  const formData = new FormData();
  formData.append('file', file);
  return request(`/api/contract-versions/${versionId}/pdf`, {
    method: 'POST',
    body: formData,
  });
}

export async function publishContractVersion(versionId) {
  return request(`/api/contract-versions/${versionId}/publish`, {
    method: 'POST',
  });
}

export async function setCurrentContractVersion(versionId) {
  return request(`/api/contract-versions/${versionId}/current`, {
    method: 'POST',
  });
}

export async function getServices(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.append(key, String(value));
  });
  const query = search.toString();
  return request(`/api/services${query ? `?${query}` : ''}`);
}

export async function getService(serviceId) { return request(`/api/services/${serviceId}`); }
export async function createService(payload) { return request('/api/services', { method: 'POST', body: JSON.stringify(payload) }); }
export async function updateService(serviceId, payload) { return request(`/api/services/${serviceId}`, { method: 'PUT', body: JSON.stringify(payload) }); }
export async function deleteService(serviceId) { return request(`/api/services/${serviceId}`, { method: 'DELETE' }); }

export async function getProducts(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') search.append(key, String(value)); });
  const query = search.toString();
  return request(`/api/products${query ? `?${query}` : ''}`);
}
export async function getProduct(productId) { return request(`/api/products/${productId}`); }
export async function createProduct(payload) { return request('/api/products', { method: 'POST', body: JSON.stringify(payload) }); }
export async function updateProduct(productId, payload) { return request(`/api/products/${productId}`, { method: 'PATCH', body: JSON.stringify(payload) }); }
export async function enableProduct(productId) { return request(`/api/products/${productId}/enable`, { method: 'POST' }); }
export async function disableProduct(productId) { return request(`/api/products/${productId}/disable`, { method: 'POST' }); }

export async function getOrders(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') search.append(key, String(value)); });
  const query = search.toString();
  return request(`/api/orders${query ? `?${query}` : ''}`);
}
export async function getOrder(orderId) { return request(`/api/orders/${orderId}`); }
export async function createOrder(payload) { return request('/api/orders', { method: 'POST', body: JSON.stringify(payload) }); }
export async function updateOrder(orderId, payload) { return request(`/api/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify(payload) }); }
export async function deleteOrder(orderId) { return request(`/api/orders/${orderId}`, { method: 'DELETE' }); }
export async function getOrderPayments(orderId) { return request(`/api/orders/${orderId}/payments`); }
export async function createPayment(orderId, payload) { return request(`/api/orders/${orderId}/payments`, { method: 'POST', body: JSON.stringify(payload) }); }
export async function voidPayment(paymentId, payload = {}) { return request(`/api/payments/${paymentId}/void`, { method: 'POST', body: JSON.stringify(payload) }); }
export async function getReport(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') search.append(key, String(value)); });
  const query = search.toString();
  return request(`/api/reports${query ? `?${query}` : ''}`);
}
