export type GameSystem = 'wh40k' | 'aos' | 'legion' | 'other';
export type ItemStatus = 'nib' | 'assembled' | 'primed' | 'painted' | 'based';

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
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
};

export const GAME_COLORS: Record<GameSystem, string> = {
  wh40k: '#3b82f6',
  aos: '#f59e0b',
  legion: '#ef4444',
  other: '#6b7280',
};

export const STATUS_COLORS: Record<ItemStatus, string> = {
  nib: '#ef4444',
  assembled: '#f59e0b',
  primed: '#6366f1',
  painted: '#10b981',
  based: '#8b5cf6',
};
