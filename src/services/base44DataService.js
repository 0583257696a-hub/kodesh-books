import { base44 } from '@/api/base44Client';

export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.records)) return value.records;
  return [];
}

export async function listBase44Entity(entityName, ...args) {
  const entity = base44.entities?.[entityName];
  if (!entity?.list) return [];

  try {
    return asArray(await entity.list(...args));
  } catch {
    return [];
  }
}
