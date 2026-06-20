async function requestJson(path) {
  const response = await fetch(path, { credentials: 'same-origin' });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }

  return data;
}

function toSearchParams(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.set(key, String(value));
  });

  return searchParams.toString();
}

export async function listProducts(params = {}) {
  const query = toSearchParams({
    category: params.category,
    q: params.q || params.search,
    featured: params.featured,
    sale: params.sale,
    in_stock: params.inStock ?? params.in_stock,
    sort: params.sort,
    limit: params.limit,
  });
  const data = await requestJson(`/api/products${query ? `?${query}` : ''}`);
  return data.products || [];
}

export async function getProduct(slugOrId) {
  if (!slugOrId) return null;
  const data = await requestJson(`/api/products/${encodeURIComponent(slugOrId)}`);
  return data.product || null;
}

export async function listCategories(params = {}) {
  const query = toSearchParams({
    include_inactive: params.includeInactive,
  });
  const data = await requestJson(`/api/categories${query ? `?${query}` : ''}`);
  return data.categories || [];
}

export async function searchProducts(params = {}) {
  const query = toSearchParams({
    q: params.q || params.search,
    category: params.category,
    limit: params.limit,
  });
  const data = await requestJson(`/api/search${query ? `?${query}` : ''}`);
  return data.products || [];
}
