import { useQuery } from '@tanstack/react-query';
import { listProducts } from '@/services/catalogService';

export function useCategoryProducts(slug, { enabled = true, inStockOnly = false } = {}) {
  return useQuery({
    queryKey: ['mega-menu-products', slug],
    queryFn: async () => {
      const products = await listProducts({ category: slug, limit: 8, sort: 'newest' });
      return products.filter((p) => !!p.image_url);
    },
    enabled: enabled && !!slug,
    staleTime: 120_000,
    gcTime: 300_000,
    select: (products) => (inStockOnly ? products.filter((p) => p.in_stock !== false) : products),
  });
}
