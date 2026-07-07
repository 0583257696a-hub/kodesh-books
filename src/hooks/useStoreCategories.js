import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CATEGORIES, CATEGORY_MAP, CATEGORY_NAME_TO_ID } from '@/lib/categories';
import { listCategories } from '@/services/catalogService';

export const CATEGORY_IMAGES = {
  chumashim: '/assets/static/category-chumashim.png',
  gemarot: '/assets/static/category-gemarot.png',
  halacha: '/assets/static/category-halacha.png',
  chassidut: '/assets/static/category-chassidut.png',
  kids: '/assets/static/category-kids.png',
  siddurim: '/assets/static/category-siddurim.png',
  gifts: '/assets/static/category-gifts.png',
};

const DEFAULT_CATEGORY_IDS = new Set(CATEGORIES.map((category) => category.id));

const normalizeCategory = (category, index = 0) => {
  const slug = category.slug || category.id;
  return ({
  id: slug,
  slug,
  name: category.name,
  description: category.description || '',
  icon: category.icon || 'FolderOpen',
  image_url: category.image_url || CATEGORY_IMAGES[slug] || '',
  r2_key: category.r2_key || '',
  display_order: Number(category.display_order ?? index),
  show_in_home: category.show_in_home !== false && category.show_in_home !== 0,
  show_in_nav: category.show_in_nav !== false && category.show_in_nav !== 0,
  active: category.active !== false && category.active !== 0,
  system: DEFAULT_CATEGORY_IDS.has(slug),
  record_id: category.record_id || (category.id && category.slug && category.id !== slug ? category.id : ''),
});
};

export function buildCategoryCollections(dynamicCategories = [], options = {}) {
  const includeInactive = options.includeInactive === true;
  const merged = new Map();

  CATEGORIES.forEach((category, index) => {
    merged.set(category.id, normalizeCategory({ ...category, display_order: index }, index));
  });

  dynamicCategories.forEach((category, index) => {
    const normalized = normalizeCategory(category, 100 + index);
    if (normalized.slug && normalized.name) {
      merged.set(normalized.slug, normalized);
    }
  });

  const allCategories = Array.from(merged.values())
    .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name, 'he'));

  const categories = includeInactive
    ? allCategories
    : allCategories.filter((category) => category.active);

  const categoryMap = allCategories.reduce((acc, category) => {
    acc[category.id] = category.name;
    acc[category.slug] = category.name;
    return acc;
  }, { ...CATEGORY_MAP });

  const categoryNameToId = allCategories.reduce((acc, category) => {
    acc[category.name] = category.slug;
    return acc;
  }, { ...CATEGORY_NAME_TO_ID });

  return { categories, categoryMap, categoryNameToId };
}

export function resolveCategorySlug(value, categories = [], categoryNameToId = {}) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (normalized === 'children') return 'kids';
  if (categoryNameToId[normalized]) return categoryNameToId[normalized];

  const match = categories.find((category) => (
    category.slug === normalized ||
    category.id === normalized ||
    category.record_id === normalized ||
    category.name === normalized
  ));

  return match?.slug || normalized;
}

export function productMatchesCategory(product, categorySlug) {
  const expected = String(categorySlug || '').trim();
  if (!expected) return true;

  const productCategories = [
    product.category,
    product.category_slug,
    product.category_id,
    ...(Array.isArray(product.additional_categories) ? product.additional_categories : []),
  ].map((value) => String(value || '').trim()).filter(Boolean);

  return productCategories.includes(expected);
}

export function useStoreCategories(options = {}) {
  const includeInactive = options.includeInactive === true;
  const { data = [], isLoading } = useQuery({
    queryKey: ['store-categories', 'all'],
    queryFn: () => listCategories({ includeInactive: true }),
    retry: false,
    staleTime: 60_000,
  });

  const collections = useMemo(
    () => buildCategoryCollections(data, { includeInactive }),
    [data, includeInactive]
  );

  return { ...collections, isLoading };
}
