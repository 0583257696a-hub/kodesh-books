import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CATEGORIES, CATEGORY_MAP, CATEGORY_NAME_TO_ID } from '@/lib/categories';

export const CATEGORY_IMAGES = {
  chumashim: 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/c7956dabc_generated_58adb81d.png',
  gemarot: 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/522a640b6_generated_aae8d1f9.png',
  halacha: 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/492a71714_generated_ef0436d4.png',
  chassidut: 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/f0982ad6d_generated_8f79bc9b.png',
  kids: 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/cd371a324_generated_686fa02d.png',
  siddurim: 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/f910326d1_generated_d7cb5ac1.png',
  gifts: 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/0d11dfa5e_generated_df9cd4ac.png',
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
    queryFn: () => base44.entities.StoreCategory.list('display_order', 500),
    retry: false,
    staleTime: 60_000,
  });

  const collections = useMemo(() => buildCategoryCollections(data), [data]);

  return { ...collections, isLoading };
}
