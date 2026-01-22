export type GameSystem = 'wh40k' | 'aos' | 'legion' | 'other';
export type ItemStatus = 'nib' | 'assembled' | 'primed' | 'painted' | 'based' | 'wip';

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  background_image_url: string | null;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  collection_id: string;
  user_id: string;
  name: string;
  game_system: GameSystem;
  faction: string | null;
  quantity: number;
  status: ItemStatus;
  nib_count: number;
  assembled_count: number;
  primed_count: number;
  based_count: number;
  painted_count: number;
  purchase_price: number | null;
  current_value: number | null;
  purchase_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemImage {
  id: string;
  item_id: string;
  image_url: string;
  is_primary: boolean;
  created_at: string;
}

// Helper mappings for display
export const GAME_SYSTEM_LABELS: Record<GameSystem, string> = {
  wh40k: 'Warhammer 40K',
  aos: 'Age of Sigmar',
  legion: 'Star Wars Legion',
  other: 'Other',
};

export const STATUS_LABELS: Record<ItemStatus, string> = {
  nib: 'Shame Pile',
  assembled: 'Built',
  primed: 'Primed',
  painted: 'Battle Ready',
  based: 'Parade Ready',
  wip: 'Work in Progress',
};

export const GAME_COLORS: Record<GameSystem, string> = {
  wh40k: '#991b1b',    // Crimson - matches primary accent
  aos: '#7c3aed',      // Purple - Sigmar's celestial theme
  legion: '#dc2626',   // Brighter red - Star Wars imperial
  other: '#525252',    // Neutral gray
};

export const STATUS_COLORS: Record<ItemStatus, string> = {
  nib: '#ef4444',
  assembled: '#f59e0b',
  primed: '#6366f1',
  painted: '#10b981',
  based: '#8b5cf6',
  wip: '#f59e0b',
};

// Helper function to get the effective status based on model counts
// - "Battle Ready" (painted) = ALL models are painted
// - "Shame Pile" (nib) = ALL models are new in box
// - "Work in Progress" (wip) = models are in various stages
export function getEffectiveStatus(item: Item): ItemStatus {
  const nibCount = item.nib_count || 0;
  const assembledCount = item.assembled_count || 0;
  const primedCount = item.primed_count || 0;
  const paintedCount = item.painted_count || 0;

  const total = nibCount + assembledCount + primedCount + paintedCount;

  // If no counts, fallback to the stored status
  if (total === 0) {
    return item.status;
  }

  // If all models are painted, show as "Battle Ready"
  if (paintedCount === total) {
    return 'painted';
  }

  // If all models are new in box, show as "Shame Pile"
  if (nibCount === total) {
    return 'nib';
  }

  // Otherwise, models are in various stages - "Work in Progress"
  return 'wip';
}
