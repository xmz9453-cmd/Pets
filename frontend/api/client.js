const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  const body = await response.json();

  if (!response.ok || body.success === false) {
    const message = body.error && body.error.message ? body.error.message : 'API request failed';
    throw new Error(message);
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

export async function logout() {
  return request('/api/auth/logout', {
    method: 'POST',
  });
}

export async function getCurrentStaff() {
  return request('/api/auth/me');
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

export async function getCustomer(customerId) {
  return request(`/api/customers/${customerId}`);
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

export async function getShopSettings() {
  return request('/api/shop-settings');
}

export async function updateShopSettings(payload) {
  return request('/api/shop-settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
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
export async function getOrderPayments(orderId) { return request(`/api/orders/${orderId}/payments`); }
export async function createPayment(orderId, payload) { return request(`/api/orders/${orderId}/payments`, { method: 'POST', body: JSON.stringify(payload) }); }
export async function voidPayment(paymentId, payload = {}) { return request(`/api/payments/${paymentId}/void`, { method: 'POST', body: JSON.stringify(payload) }); }
export async function getReport(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') search.append(key, String(value)); });
  const query = search.toString();
  return request(`/api/reports${query ? `?${query}` : ''}`);
}
