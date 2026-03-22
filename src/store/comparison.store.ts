import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ComparisonItem {
  slug: string;
  titleAr: string;
  askingPrice: string;
  imageUrl?: string;
}

interface ComparisonStore {
  items: ComparisonItem[];
  addItem: (item: ComparisonItem) => void;
  removeItem: (slug: string) => void;
  clearAll: () => void;
  isInComparison: (slug: string) => boolean;
}

export const useComparisonStore = create<ComparisonStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const { items } = get();
        if (items.length >= 3 || items.some((i) => i.slug === item.slug)) return;
        set({ items: [...items, item] });
      },
      removeItem: (slug) =>
        set((state) => ({ items: state.items.filter((i) => i.slug !== slug) })),
      clearAll: () => set({ items: [] }),
      isInComparison: (slug) => get().items.some((i) => i.slug === slug),
    }),
    { name: 'aqar-comparison' },
  ),
);
