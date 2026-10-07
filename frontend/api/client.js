export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');
const { getUserFacingErrorMessage } = require('../utils/error-message');

async function request(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
    ...options,
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

export async function getApplicationHealth() {
  return request('/api/health');
}

export async function getDatabaseHealth() {
  return request('/api/health/database');
}

export async function login(username, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function register(username, password, displayName) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, display_name: displayName }),
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

export async function createPublicOnboarding() {
  return request('/api/public/onboardings', { method: 'POST', body: '{}' });
}

function publicOnboardingPath(token, suffix = '') {
  return `/api/public/onboardings/${encodeURIComponent(token)}${suffix}`;
}

export async function getPublicOnboarding(token) {
  return request(publicOnboardingPath(token));
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

export async function deleteAppointment(appointmentId) {
  return request(`/api/appointments/${appointmentId}`, { method: 'DELETE' });
}

export async function getCustomer(customerId) {
  return request(`/api/customers/${customerId}`);
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

export async function resetOperationalData() {
  return request('/api/shop-settings/reset-operational-data', {
    method: 'POST',
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
