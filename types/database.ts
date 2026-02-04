export type GameSystem = 'wh40k' | 'aos' | 'legion' | 'other';
export type ItemStatus = 'nib' | 'assembled' | 'primed' | 'painted' | 'based' | 'wip';

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  background_image_url: string | null;
  is_premium: boolean;
  is_public: boolean;
  bio: string | null;
  location: string | null;
  website_url: string | null;
  follower_count: number;
  following_count: number;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  is_complete: boolean;
  is_locked: boolean;
  cover_image_url: string | null;
  sort_order: number;
  like_count: number;
  comment_count: number;
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
  notes: string | null;
  like_count: number;
  comment_count: number;
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
  assembled: '#991b1b',
  primed: '#6366f1',
  painted: '#10b981',
  based: '#8b5cf6',
  wip: '#991b1b',
};

// Social Features Types
export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export type ActivityType =
  | 'item_added'
  | 'item_updated'
  | 'item_painted'
  | 'collection_created'
  | 'collection_updated'
  | 'started_following';

export interface Activity {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  target_item_id: string | null;
  target_collection_id: string | null;
  target_user_id: string | null;
  metadata: Record<string, unknown>;
  is_public: boolean;
  created_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  item_id: string | null;
  collection_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Like {
  id: string;
  user_id: string;
  item_id: string | null;
  collection_id: string | null;
  created_at: string;
}

// Planning Features Types
export type GoalType = 'models_painted' | 'items_completed' | 'custom';

export interface WishlistItem {
  id: string;
  user_id: string;
  name: string;
  game_system: string | null;
  notes: string | null;
  priority: number;
  is_purchased: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaintQueueItem {
  id: string;
  user_id: string;
  item_id: string;
  priority: number;
  notes: string | null;
  created_at: string;
  // Joined data
  item?: Item;
}

export interface PaintingGoal {
  id: string;
  user_id: string;
  title: string;
  goal_type: GoalType;
  target_count: number;
  current_count: number;
  deadline: string | null;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

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
