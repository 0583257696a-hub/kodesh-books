async function requestAdminMaintenance(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Admin maintenance request failed');
  }

  return data;
}

export async function resetStoreActivity(confirmation) {
  return requestAdminMaintenance('/api/admin/store-reset', {
    method: 'POST',
    body: JSON.stringify({ confirmation }),
  });
}
