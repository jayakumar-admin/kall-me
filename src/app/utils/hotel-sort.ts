import { Hotel } from '../models';

export type HotelSortOption = 'sequence' | 'name-asc' | 'name-desc';

/**
 * Sorts hotels based on order_sequence, with alphabetical order as the fallback/default.
 * 
 * Rules:
 * - 'sequence': Hotels with a positive order_sequence (1, 2, 3...) appear first ordered by their sequence.
 *               Hotels without a sequence (or with identical sequence) are ordered alphabetically by name.
 * - 'name-asc': Alphabetical order (A to Z) by hotel name.
 * - 'name-desc': Reverse alphabetical order (Z to A) by hotel name.
 */
export function sortHotels(
  hotels: Hotel[],
  sortBy: HotelSortOption = 'sequence'
): Hotel[] {
  if (!hotels || !Array.isArray(hotels)) return [];

  return [...hotels].sort((a, b) => {
    const nameA = (a.name || '').trim();
    const nameB = (b.name || '').trim();

    if (sortBy === 'name-asc') {
      return nameA.localeCompare(nameB, undefined, { sensitivity: 'base', numeric: true });
    }

    if (sortBy === 'name-desc') {
      return nameB.localeCompare(nameA, undefined, { sensitivity: 'base', numeric: true });
    }

    // Default 'sequence'
    const aHasSeq = a.order_sequence !== undefined && a.order_sequence !== null && Number(a.order_sequence) > 0;
    const bHasSeq = b.order_sequence !== undefined && b.order_sequence !== null && Number(b.order_sequence) > 0;

    if (aHasSeq && bHasSeq) {
      const diff = Number(a.order_sequence) - Number(b.order_sequence);
      if (diff !== 0) return diff;
    } else if (aHasSeq && !bHasSeq) {
      return -1;
    } else if (!aHasSeq && bHasSeq) {
      return 1;
    }

    // Fallback: Default based on alphabetical order
    return nameA.localeCompare(nameB, undefined, { sensitivity: 'base', numeric: true });
  });
}
