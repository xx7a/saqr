// Saqr self-hosted API compatibility layer.
// Keeps the existing UI API surface while the backend is migrated away from Base44.
const API = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
let token = localStorage.getItem('saqr_token') || '';

async function request(path, options = {}) {
  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const text = await res.text();
  let data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!res.ok) {
    const e = new Error(data?.message || `Request failed (${res.status})`);
    e.status = res.status; e.data = data; throw e;
  }
  return data;
}

const entity = (name) => ({
  list: (sort = '-created_date', limit = 100) => request(`/entities/${name}?sort=${encodeURIComponent(sort || '')}&limit=${limit}`),
  filter: (filters = {}, sort = '-created_date', limit = 100) => request(`/entities/${name}/filter`, { method:'POST', body:JSON.stringify({ filters, sort, limit }) }),
  get: (id) => request(`/entities/${name}/${id}`),
  create: (data) => request(`/entities/${name}`, { method:'POST', body:JSON.stringify(data) }),
  update: (id, data) => request(`/entities/${name}/${id}`, { method:'PUT', body:JSON.stringify(data) }),
  delete: (id) => request(`/entities/${name}/${id}`, { method:'DELETE' }),
  deleteMany: (filters = {}) => request(`/entities/${name}/delete-many`, { method:'POST', body:JSON.stringify({ filters }) }),
  bulkCreate: (rows = []) => request(`/entities/${name}/bulk`, { method:'POST', body:JSON.stringify({ rows }) }),
});

const entities = new Proxy({}, { get: (_, name) => entity(String(name)) });

const auth = {
  me: () => request('/auth/me'),
  isAuthenticated: async () => { try { await request('/auth/me'); return true; } catch { return false; } },
  loginViaEmailPassword: async (email, password) => { const r = await request('/auth/login',{method:'POST',body:JSON.stringify({email,password})}); token=r.token; localStorage.setItem('saqr_token',token); return r; },
  register: async (payload) => { const r=await request('/auth/register',{method:'POST',body:JSON.stringify(payload)}); if(r.token){token=r.token;localStorage.setItem('saqr_token',token);} return r; },
  updateMe: (data) => request('/auth/me',{method:'PUT',body:JSON.stringify(data)}),
  logout: async (redirect) => { try { await request('/auth/logout',{method:'POST'}); } catch {} token='';localStorage.removeItem('saqr_token'); if(redirect) location.href='/login'; },
  redirectToLogin: () => { location.href='/login'; },
  setToken: (t) => { token=t||''; if(token)localStorage.setItem('saqr_token',token); else localStorage.removeItem('saqr_token'); },
  resetPasswordRequest: (email) => request('/auth/forgot-password',{method:'POST',body:JSON.stringify({email})}),
  resetPassword: (payload) => request('/auth/reset-password',{method:'POST',body:JSON.stringify(payload)}),
  verifyOtp: (payload) => request('/auth/verify-otp',{method:'POST',body:JSON.stringify(payload)}),
  resendOtp: (payload) => request('/auth/resend-otp',{method:'POST',body:JSON.stringify(payload)}),
  loginWithProvider: (provider) => { location.href=`${API}/auth/oauth/${provider}`; },
};

const functions = { invoke: (name, payload={}) => request(`/functions/${name}`,{method:'POST',body:JSON.stringify(payload)}).then(result => ({ ...(result && typeof result === 'object' ? result : {}), data: result })) };
const app = { getPublicSettings: () => request('/public-settings') };
const integrations = { Core: { UploadPublicFile: async ({file}) => { const fd=new FormData();fd.append('file',file);return request('/uploads',{method:'POST',body:fd}); } } };

export const base44 = { entities, auth, functions, app, integrations };
