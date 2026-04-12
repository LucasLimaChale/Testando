const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Auth
  login: (email, senha) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) }),
  me: () => request('/auth/me'),
  getLogs: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/auth/logs${qs ? `?${qs}` : ''}`);
  },

  // Users
  getUsers: () => request('/auth/users'),
  createUser: (data) => request('/auth/users', { method: 'POST', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/auth/users/${id}`, { method: 'DELETE' }),

  // Clients
  getClients: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/clients${qs ? `?${qs}` : ''}`);
  },
  getClient: (id) => request(`/clients/${id}`),
  createClient: (data) => request('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id, data) =>
    request(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClient: (id) => request(`/clients/${id}`, { method: 'DELETE' }),

  // Videos
  getVideos: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/videos${qs ? `?${qs}` : ''}`);
  },
  getVideo: (id) => request(`/videos/${id}`),
  getUrgent: () => request('/videos/urgent'),
  getUploadUrl: (filename, contentType) =>
    request('/videos/upload-url', {
      method: 'POST',
      body: JSON.stringify({ filename, contentType }),
    }),
  createVideo: (data) => request('/videos', { method: 'POST', body: JSON.stringify(data) }),
  updateVideoStatus: (id, status) =>
    request(`/videos/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  approveVideo: (id) => request(`/videos/${id}/approve`, { method: 'PATCH' }),
  rejectVideo: (id, comentario) =>
    request(`/videos/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ comentario }) }),
  publishVideo: (id) => request(`/videos/${id}/publish`, { method: 'PATCH' }),
  createRevision: (id, data) =>
    request(`/videos/${id}/revision`, { method: 'POST', body: JSON.stringify(data) }),
  deleteVideo: (id) => request(`/videos/${id}`, { method: 'DELETE' }),

  uploadToStorage: (signedUrl, file) =>
    fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    }).then(res => {
      if (!res.ok) throw new Error('Falha no upload do arquivo');
    }),
};
