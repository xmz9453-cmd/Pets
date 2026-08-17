const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

async function request(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);
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
