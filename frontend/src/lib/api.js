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
  request,
  // Auth
  login: (email, senha) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) }),
  me: () => request('/auth/me'),
  updateMe: (data) => request('/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),
  getLogs: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/auth/logs${qs ? `?${qs}` : ''}`);
  },

  // Users
  getUsers: () => request('/auth/users'),
  createUser: (data) => request('/auth/users', { method: 'POST', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/auth/users/${id}`, { method: 'DELETE' }),

  // Clients (legacy)
  getClients: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/clients${qs ? `?${qs}` : ''}`);
  },
  getClient: (id) => request(`/clients/${id}`),
  createClient: (data) => request('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id, data) =>
    request(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClient: (id) => request(`/clients/${id}`, { method: 'DELETE' }),

  // Empresas
  getEmpresas: () => request('/empresas'),
  getEmpresa: (id) => request(`/empresas/${id}`),
  createEmpresa: (data) => request('/empresas', { method: 'POST', body: JSON.stringify(data) }),
  updateEmpresa: (id, data) =>
    request(`/empresas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmpresa: (id) => request(`/empresas/${id}`, { method: 'DELETE' }),

  // Colaboradores
  getColaboradores: (empresaId) => request(`/empresas/${empresaId}/colaboradores`),
  createColaborador: (empresaId, data) =>
    request(`/empresas/${empresaId}/colaboradores`, { method: 'POST', body: JSON.stringify(data) }),
  updateColaborador: (empresaId, id, data) =>
    request(`/empresas/${empresaId}/colaboradores/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteColaborador: (empresaId, id) =>
    request(`/empresas/${empresaId}/colaboradores/${id}`, { method: 'DELETE' }),

  // Stats (admin)
  getStats: () => request('/stats'),

  // Meta Ads (admin)
  metaGetConnections: () => request('/meta/connections'),
  metaConnectBM: (business_id, access_token) =>
    request('/meta/connections/bm', { method: 'POST', body: JSON.stringify({ business_id, access_token }) }),
  metaConnect: (ad_account_id, access_token) =>
    request('/meta/connections', { method: 'POST', body: JSON.stringify({ ad_account_id, access_token }) }),
  metaDisconnect: (id) => request(`/meta/connections/${id}`, { method: 'DELETE' }),
  metaDisconnectAll: () => request('/meta/connections', { method: 'DELETE' }),
  metaMetrics: (account_id, since, until) => {
    const qs = new URLSearchParams({ account_id, ...(since && { since }), ...(until && { until }) }).toString();
    return request(`/meta/metrics?${qs}`);
  },
  metaGetAlerts: () => request('/meta/alerts'),
  metaCreateAlert: (data) => request('/meta/alerts', { method: 'POST', body: JSON.stringify(data) }),
  metaUpdateAlert: (id, data) => request(`/meta/alerts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  metaDeleteAlert: (id) => request(`/meta/alerts/${id}`, { method: 'DELETE' }),
  metaGetReports: () => request('/meta/reports'),
  metaCreateReport: (data) => request('/meta/reports', { method: 'POST', body: JSON.stringify(data) }),
  metaUpdateReport: (id, data) => request(`/meta/reports/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  metaDeleteReport: (id) => request(`/meta/reports/${id}`, { method: 'DELETE' }),
  metaSendReport: (id) => request(`/meta/reports/${id}/send`, { method: 'POST' }),

  // Videos
  getVideos: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/videos${qs ? `?${qs}` : ''}`);
  },
  getVideo: (id) => request(`/videos/${id}`),
  getUrgent: () => request('/videos/urgent'),
  uploadVideo: async (file, onProgress) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}/videos/upload`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          try {
            reject(new Error(JSON.parse(xhr.responseText).error || `HTTP ${xhr.status}`));
          } catch {
            reject(new Error(`HTTP ${xhr.status}`));
          }
        }
      };
      xhr.onerror = () => reject(new Error('Erro de conexão no upload'));
      xhr.send(formData);
    });
  },
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

  // Demandas (afazeres — corretores)
  getDemandas: () => request('/demandas'),
  updateDemandaStatus: (id, status) => request(`/demandas/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteDemanda: (id) => request(`/demandas/${id}`, { method: 'DELETE' }),
  getDemandaLinks: () => request('/demandas/links'),
  createDemandaLink: (label) => request('/demandas/links', { method: 'POST', body: JSON.stringify({ label }) }),
  deleteDemandaLink: (id) => request(`/demandas/links/${id}`, { method: 'DELETE' }),

  // Upload Requests (links de envio para clientes)
  getUploadRequests: () => request('/uploads'),
  createUploadRequest: (label) => request('/uploads', { method: 'POST', body: JSON.stringify({ label }) }),
  deleteUploadRequest: (id) => request(`/uploads/${id}`, { method: 'DELETE' }),
  getUploadRequestFiles: (id) => request(`/uploads/${id}/files`),

  // Tarefas pessoais
  getTarefas: () => request('/demandas/tarefas'),
  createTarefa: (titulo) => request('/demandas/tarefas', { method: 'POST', body: JSON.stringify({ titulo }) }),
  toggleTarefa: (id, done) => request(`/demandas/tarefas/${id}`, { method: 'PATCH', body: JSON.stringify({ done }) }),
  updateTarefaDescricao: (id, descricao) => request(`/demandas/tarefas/${id}`, { method: 'PATCH', body: JSON.stringify({ descricao }) }),
  deleteTarefa: (id) => request(`/demandas/tarefas/${id}`, { method: 'DELETE' }),

  // Upload de imagem para afazeres (autenticado)
  uploadTodoImage: async (file) => {
    const token = getToken();
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API_URL}/uploads/file`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },
};
