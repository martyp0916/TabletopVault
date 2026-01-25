/**
 * Items Hook
 *
 * SECURITY: Implements comprehensive input validation and sanitization.
 * - Schema-based validation for all item fields
 * - UUID validation for IDs
 * - Numeric bounds checking (quantity, price)
 * - Rate limiting for mutations
 * - Rejects unexpected fields to prevent mass assignment
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Item, ItemStatus, GameSystem } from '@/types/database';
import {
  validateUUID,
  validateItemName,
  validateItemFaction,
  validateItemNotes,
  validateItemQuantity,
  validateGameSystem,
  validateItemStatus,
  sanitizeString,
  sanitizeNumber,
  LIMITS,
} from '@/lib/validation';
import { rateLimiter, getRateLimitKey } from '@/lib/rateLimiter';

// Define allowed fields for item creation/update (prevent mass assignment)
const ALLOWED_CREATE_FIELDS = [
  'collection_id', 'name', 'game_system', 'faction', 'quantity', 'status',
  'nib_count', 'assembled_count', 'primed_count', 'painted_count', 'based_count',
  'notes'
];

const ALLOWED_UPDATE_FIELDS = [
  'name', 'game_system', 'faction', 'quantity', 'status',
  'nib_count', 'assembled_count', 'primed_count', 'painted_count', 'based_count',
  'notes'
];

/**
 * Validate and sanitize item data
 * SECURITY: Ensures all fields meet validation requirements
 */
function validateItemData(
  data: Record<string, any>,
  allowedFields: string[],
  requireName: boolean = false
): { isValid: boolean; error?: string; sanitized: Record<string, any> } {
  const sanitized: Record<string, any> = {};

  // Check for unexpected fields
  for (const key of Object.keys(data)) {
    if (!allowedFields.includes(key)) {
      console.warn(`Rejected unexpected field in item data: ${key}`);
    }
  }

  // Validate collection_id if present
  if ('collection_id' in data) {
    const validation = validateUUID(data.collection_id);
    if (!validation.isValid) {
      return { isValid: false, error: 'Invalid collection ID', sanitized: {} };
    }
    sanitized.collection_id = validation.sanitizedValue;
  }

  // Validate name
  if ('name' in data || requireName) {
    const validation = validateItemName(data.name);
    if (!validation.isValid) {
      return { isValid: false, error: validation.errors[0], sanitized: {} };
    }
    sanitized.name = validation.sanitizedValue;
  }

  // Validate game_system
  if ('game_system' in data) {
    const validation = validateGameSystem(data.game_system);
    if (!validation.isValid) {
      return { isValid: false, error: validation.errors[0], sanitized: {} };
    }
    sanitized.game_system = validation.sanitizedValue;
  }

  // Validate faction
  if ('faction' in data) {
    const validation = validateItemFaction(data.faction);
    if (!validation.isValid) {
      return { isValid: false, error: validation.errors[0], sanitized: {} };
    }
    sanitized.faction = validation.sanitizedValue;
  }

  // Validate quantity fields
  const quantityFields = ['quantity', 'nib_count', 'assembled_count', 'primed_count', 'painted_count', 'based_count'];
  for (const field of quantityFields) {
    if (field in data) {
      const validation = validateItemQuantity(data[field], field);
      if (!validation.isValid) {
        return { isValid: false, error: validation.errors[0], sanitized: {} };
      }
      sanitized[field] = validation.sanitizedValue;
    }
  }

  // Validate status
  if ('status' in data) {
    const validation = validateItemStatus(data.status);
    if (!validation.isValid) {
      return { isValid: false, error: validation.errors[0], sanitized: {} };
    }
    sanitized.status = validation.sanitizedValue;
  }

  // Validate notes
  if ('notes' in data) {
    const validation = validateItemNotes(data.notes);
    if (!validation.isValid) {
      return { isValid: false, error: validation.errors[0], sanitized: {} };
    }
    sanitized.notes = validation.sanitizedValue;
  }

  return { isValid: true, sanitized };
}

export function useItems(userId: string | undefined, collectionId?: string) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    // SECURITY: Validate userId format
    const userIdValidation = validateUUID(userId);
    if (!userIdValidation.isValid) {
      setError('Invalid user ID');
      setLoading(false);
      return;
    }

    // SECURITY: Validate collectionId if provided
    if (collectionId) {
      const collectionIdValidation = validateUUID(collectionId);
      if (!collectionIdValidation.isValid) {
        setError('Invalid collection ID');
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      let query = supabase
        .from('items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (collectionId) {
        query = query.eq('collection_id', collectionId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setItems(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId, collectionId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  /**
   * Create a new item
   * SECURITY: Validates all fields and applies rate limiting
   */
  const createItem = async (item: {
    collection_id: string;
    name: string;
    game_system?: GameSystem;
    faction?: string;
    quantity?: number;
    status?: ItemStatus;
    nib_count?: number;
    assembled_count?: number;
    primed_count?: number;
    painted_count?: number;
    based_count?: number;
    notes?: string;
  }) => {
    if (!userId) return { error: new Error('Not authenticated') };

    // SECURITY: Validate and sanitize all input
    const validation = validateItemData(item, ALLOWED_CREATE_FIELDS, true);
    if (!validation.isValid) {
      return { error: new Error(validation.error) };
    }

    // SECURITY: Rate limit creates
    const rateLimitKey = getRateLimitKey('data:create', userId);
    const rateLimitResult = rateLimiter.check(rateLimitKey, 'data:create');
    if (!rateLimitResult.allowed) {
      return { error: new Error(rateLimitResult.error || 'Too many requests. Please slow down.') };
    }

    const { data, error } = await supabase
      .from('items')
      .insert({
        ...validation.sanitized,
        user_id: userId,
      })
      .select()
      .single();

    if (!error && data) {
      setItems(prev => [data, ...prev]);
    }

    return { data, error };
  };

  /**
   * Update an item
   * SECURITY: Validates ID and all update fields
   */
  const updateItem = async (id: string, updates: Partial<Item>) => {
    // SECURITY: Validate ID format
    const idValidation = validateUUID(id);
    if (!idValidation.isValid) {
      return { error: new Error('Invalid item ID') };
    }

    // SECURITY: Validate and sanitize all update fields
    const validation = validateItemData(updates as Record<string, any>, ALLOWED_UPDATE_FIELDS);
    if (!validation.isValid) {
      return { error: new Error(validation.error) };
    }

    // SECURITY: Rate limit updates
    const rateLimitKey = getRateLimitKey('data:update', id);
    const rateLimitResult = rateLimiter.check(rateLimitKey, 'data:update');
    if (!rateLimitResult.allowed) {
      return { error: new Error(rateLimitResult.error || 'Too many requests. Please slow down.') };
    }

    const { data, error } = await supabase
      .from('items')
      .update(validation.sanitized)
      .eq('id', idValidation.sanitizedValue)
      .select()
      .single();

    if (!error && data) {
      setItems(prev => prev.map(i => i.id === id ? data : i));
    }

    return { data, error };
  };

  /**
   * Delete an item
   * SECURITY: Validates ID format
   */
  const deleteItem = async (id: string) => {
    // SECURITY: Validate ID format
    const idValidation = validateUUID(id);
    if (!idValidation.isValid) {
      return { error: new Error('Invalid item ID') };
    }

    // SECURITY: Rate limit deletes
    const rateLimitKey = getRateLimitKey('data:delete', userId || 'unknown');
    const rateLimitResult = rateLimiter.check(rateLimitKey, 'data:delete');
    if (!rateLimitResult.allowed) {
      return { error: new Error(rateLimitResult.error || 'Too many requests. Please slow down.') };
    }

    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', idValidation.sanitizedValue);

    if (!error) {
      setItems(prev => prev.filter(i => i.id !== id));
    }

    return { error };
  };

  return {
    items,
    loading,
    error,
    refresh: fetchItems,
    createItem,
    updateItem,
    deleteItem,
  };
}

/**
 * Fetch a single item by ID
 * SECURITY: Validates item ID format
 */
export function useItem(itemId: string | undefined) {
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItem = useCallback(async () => {
    if (!itemId) {
      setLoading(false);
      return;
    }

    // SECURITY: Validate itemId format
    const idValidation = validateUUID(itemId);
    if (!idValidation.isValid) {
      setError('Invalid item ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', idValidation.sanitizedValue)
        .single();

      if (error) throw error;
      setItem(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  return { item, loading, error, refresh: fetchItem };
}

/**
 * Stats hook for dashboard
 * SECURITY: Validates user ID format
 */
export function useItemStats(userId: string | undefined) {
  const [stats, setStats] = useState({
    total: 0,
    nibTotal: 0,
    assembledTotal: 0,
    primedTotal: 0,
    paintedTotal: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // SECURITY: Validate userId format
    const userIdValidation = validateUUID(userId);
    if (!userIdValidation.isValid) {
      console.error('Invalid user ID for stats');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('items')
        .select('quantity, nib_count, assembled_count, primed_count, painted_count, based_count')
        .eq('user_id', userIdValidation.sanitizedValue);

      if (error) throw error;

      // Calculate totals from individual status counts
      let total = 0;
      let nibTotal = 0;
      let assembledTotal = 0;
      let primedTotal = 0;
      let paintedTotal = 0;

      data?.forEach(item => {
        const nib = item.nib_count || 0;
        const assembled = item.assembled_count || 0;
        const primed = item.primed_count || 0;
        const painted = item.painted_count || 0;
        const based = item.based_count || 0;

        // Total is the sum of all status counts, or fall back to quantity if no counts set
        const itemTotal = nib + assembled + primed + painted + based;
        total += itemTotal > 0 ? itemTotal : (item.quantity || 1);

        nibTotal += nib;
        assembledTotal += assembled;
        primedTotal += primed;
        paintedTotal += painted + based; // Include based in painted for display
      });

      setStats({ total, nibTotal, assembledTotal, primedTotal, paintedTotal });
    } catch (e) {
      console.error('Error fetching stats:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refresh: fetchStats };
}

/**
 * Recent items hook
 * SECURITY: Validates user ID and sanitizes limit parameter
 */
export function useRecentItems(userId: string | undefined, limit: number = 5) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // SECURITY: Sanitize limit to reasonable bounds (1-100)
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));

  const fetchRecent = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // SECURITY: Validate userId format
    const userIdValidation = validateUUID(userId);
    if (!userIdValidation.isValid) {
      console.error('Invalid user ID for recent items');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', userIdValidation.sanitizedValue)
        .order('updated_at', { ascending: false })
        .limit(safeLimit);

      if (error) throw error;
      setItems(data || []);
    } catch (e) {
      console.error('Error fetching recent items:', e);
    } finally {
      setLoading(false);
    }
  }, [userId, safeLimit]);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  return { items, loading, refresh: fetchRecent };
}
