const PUBLIC_WRITE_ENTITIES = new Set([
  'ChatSession',
  'ChatMessage',
  'ChatLead',
  'SearchAnalytics',
  'MissingSearch',
  'AnalyticsEvent',
]);

function isAdminPath() {
  return window.location.pathname === '/secret-admin' || window.location.pathname.startsWith('/secret-admin/');
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      ...(options.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
      'X-Requested-With': 'XMLHttpRequest',
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }

  return data;
}

function toQuery({ sort, limit, filters } = {}) {
  const params = new URLSearchParams();
  if (sort) params.set('sort', sort);
  if (limit) params.set('limit', String(limit));
  if (filters && Object.keys(filters).length) params.set('filters', JSON.stringify(filters));
  const query = params.toString();
  return query ? `?${query}` : '';
}

function entityBasePath(entity) {
  if (isAdminPath() && !PUBLIC_WRITE_ENTITIES.has(entity)) {
    return `/api/admin/entities/${encodeURIComponent(entity)}`;
  }
  return `/api/entities/${encodeURIComponent(entity)}`;
}

function adminEntityPath(entity) {
  return `/api/admin/entities/${encodeURIComponent(entity)}`;
}

function createEntityClient(entity) {
  return {
    async list(sort = '-created_date', limit = 500) {
      const path = `${entityBasePath(entity)}${toQuery({ sort, limit })}`;
      const data = await requestJson(path);
      return data.items || [];
    },

    async filter(filters = {}, sort = '-created_date', limit = 500) {
      const path = `${entityBasePath(entity)}${toQuery({ sort, limit, filters })}`;
      const data = await requestJson(path);
      return data.items || [];
    },

    async create(payload = {}) {
      const path = PUBLIC_WRITE_ENTITIES.has(entity) ? entityBasePath(entity) : adminEntityPath(entity);
      const data = await requestJson(path, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return data.item;
    },

    async update(id, payload = {}) {
      const basePath = PUBLIC_WRITE_ENTITIES.has(entity) ? entityBasePath(entity) : adminEntityPath(entity);
      const data = await requestJson(`${basePath}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return data.item;
    },

    async delete(id) {
      const data = await requestJson(`${adminEntityPath(entity)}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      return data.item;
    },
  };
}

const entities = new Proxy({}, {
  get(target, entity) {
    if (typeof entity !== 'string') return target[entity];
    if (!target[entity]) target[entity] = createEntityClient(entity);
    return target[entity];
  },
});

async function uploadFile({ file }) {
  const formData = new FormData();
  formData.append('files', file);
  formData.set('image_role', 'gallery');
  formData.set('alt_text', file?.name || '');

  const data = await requestJson('/api/admin/uploads/product-image', {
    method: 'POST',
    body: formData,
  });
  const image = data.images?.[0];
  return { file_url: image?.image_url || '' };
}

export const appApi = {
  entities,
  uploads: {
    uploadFile,
  },
  users: {
    async setRole(userId, newRole) {
      return entities.User.update(userId, { role: newRole });
    },
  },
  auth: {
    async me() {
      const data = await requestJson('/api/auth/me');
      return data.user;
    },

    async loginViaEmailPassword(email, password) {
      const data = await requestJson('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      return data.user;
    },

    async register(payload = {}) {
      const path = isAdminPath() ? '/api/admin/users' : '/api/auth/register';
      const data = await requestJson(path, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (data.access_token) localStorage.setItem('ok_customer_access_token', data.access_token);
      return data;
    },

    async verifyOtp(payload = {}) {
      const data = await requestJson('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (data.access_token) localStorage.setItem('ok_customer_access_token', data.access_token);
      return data;
    },

    async resendOtp(email) {
      return requestJson('/api/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify(typeof email === 'string' ? { email } : email || {}),
      });
    },

    setToken(token) {
      if (token) localStorage.setItem('ok_customer_access_token', token);
    },

    async resetPasswordRequest(email) {
      return requestJson('/api/auth/reset-request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

    async resetPassword(payload = {}) {
      return requestJson('/api/auth/reset', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async logout(redirectUrl) {
      await requestJson('/api/auth/logout', {
        method: 'POST',
        body: '{}',
      }).catch(() => {});
      localStorage.removeItem('ok_customer_access_token');
      if (redirectUrl) window.location.href = '/';
    },

    redirectToLogin() {
      window.location.href = '/login';
    },

    loginWithProvider() {
      window.alert('Google login is not configured. Use email and password login.');
    },
  },
};
