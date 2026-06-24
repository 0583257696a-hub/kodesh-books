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
  display_order: Number(category.display_order ?? index),
  show_in_home: category.show_in_home !== false,
  show_in_nav: category.show_in_nav !== false,
  active: category.active !== false,
  system: DEFAULT_CATEGORY_IDS.has(slug),
  record_id: category.id && category.slug ? category.id : '',
});
};

export function buildCategoryCollections(dynamicCategories = []) {
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

  const categories = Array.from(merged.values())
    .filter((category) => category.active)
    .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name, 'he'));

  const categoryMap = categories.reduce((acc, category) => {
    acc[category.id] = category.name;
    acc[category.slug] = category.name;
    return acc;
  }, { ...CATEGORY_MAP });

  const categoryNameToId = categories.reduce((acc, category) => {
    acc[category.name] = category.slug;
    return acc;
  }, { ...CATEGORY_NAME_TO_ID });

  return { categories, categoryMap, categoryNameToId };
}

export function useStoreCategories() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['store-categories'],
    queryFn: () => listCategories(),
    retry: false,
    staleTime: 60_000,
  });

  const collections = useMemo(() => buildCategoryCollections(data), [data]);

  return { ...collections, isLoading };
}
