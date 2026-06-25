async function requestAdminAuth(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Admin authentication failed');
  }

  return data;
}

export async function loginAdmin(email, password) {
  const data = await requestAdminAuth('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return data.user;
}

export async function getAdminUser() {
  const data = await requestAdminAuth('/api/admin/auth/me');
  return data.user;
}

export async function logoutAdmin() {
  await requestAdminAuth('/api/admin/auth/logout', {
    method: 'POST',
    body: '{}',
  });
}

export async function changeAdminPassword(currentPassword, newPassword) {
  const data = await requestAdminAuth('/api/admin/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  return data.user;
}
