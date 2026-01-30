/**
 * Wishlist Hook
 *
 * Manages user wishlist items for future purchases.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { WishlistItem } from '@/types/database';
import { validateUUID } from '@/lib/validation';
import { rateLimiter, getRateLimitKey } from '@/lib/rateLimiter';

// Validation constants
const NAME_MAX_LENGTH = 200;
const NOTES_MAX_LENGTH = 2000;

export function useWishlist(userId: string | undefined) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    // Validate userId
    const userIdValidation = validateUUID(userId);
    if (!userIdValidation.isValid) {
      setError('Invalid user ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('wishlist')
        .select('*')
        .eq('user_id', userId)
        .order('is_purchased', { ascending: true })
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  /**
   * Create a new wishlist item
   */
  const createItem = async (
    name: string,
    gameSystem?: string,
    notes?: string,
    priority?: number
  ) => {
    if (!userId) return { error: new Error('Not authenticated') };

    // Validate name
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { error: new Error('Item name is required') };
    }
    if (trimmedName.length > NAME_MAX_LENGTH) {
      return { error: new Error(`Name must be ${NAME_MAX_LENGTH} characters or less`) };
    }

    // Validate notes if provided
    if (notes && notes.length > NOTES_MAX_LENGTH) {
      return { error: new Error(`Notes must be ${NOTES_MAX_LENGTH} characters or less`) };
    }

    // Rate limit
    const rateLimitKey = getRateLimitKey('data:create', userId);
    const rateLimitResult = rateLimiter.check(rateLimitKey, 'data:create');
    if (!rateLimitResult.allowed) {
      return { error: new Error(rateLimitResult.error || 'Too many requests') };
    }

    const { data, error } = await supabase
      .from('wishlist')
      .insert({
        user_id: userId,
        name: trimmedName,
        game_system: gameSystem || null,
        notes: notes?.trim() || null,
        priority: priority || 0,
      })
      .select()
      .single();

    if (!error && data) {
      setItems(prev => [data, ...prev]);
    }

    return { data, error };
  };

  /**
   * Update a wishlist item
   */
  const updateItem = async (
    itemId: string,
    updates: {
      name?: string;
      gameSystem?: string | null;
      notes?: string | null;
      priority?: number;
      isPurchased?: boolean;
    }
  ) => {
    // Validate itemId
    const idValidation = validateUUID(itemId);
    if (!idValidation.isValid) {
      return { error: new Error('Invalid item ID') };
    }

    // Validate name if provided
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (!trimmedName) {
        return { error: new Error('Item name is required') };
      }
      if (trimmedName.length > NAME_MAX_LENGTH) {
        return { error: new Error(`Name must be ${NAME_MAX_LENGTH} characters or less`) };
      }
    }

    // Validate notes if provided
    if (updates.notes && updates.notes.length > NOTES_MAX_LENGTH) {
      return { error: new Error(`Notes must be ${NOTES_MAX_LENGTH} characters or less`) };
    }

    // Rate limit
    const rateLimitKey = getRateLimitKey('data:update', itemId);
    const rateLimitResult = rateLimiter.check(rateLimitKey, 'data:update');
    if (!rateLimitResult.allowed) {
      return { error: new Error(rateLimitResult.error || 'Too many requests') };
    }

    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name.trim();
    if (updates.gameSystem !== undefined) updateData.game_system = updates.gameSystem || null;
    if (updates.notes !== undefined) updateData.notes = updates.notes?.trim() || null;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.isPurchased !== undefined) updateData.is_purchased = updates.isPurchased;

    const { data, error } = await supabase
      .from('wishlist')
      .update(updateData)
      .eq('id', idValidation.sanitizedValue)
      .select()
      .single();

    if (!error && data) {
      setItems(prev => prev.map(item => item.id === itemId ? data : item));
    }

    return { data, error };
  };

  /**
   * Mark item as purchased
   */
  const markAsPurchased = async (itemId: string) => {
    return updateItem(itemId, { isPurchased: true });
  };

  /**
   * Delete a wishlist item
   */
  const deleteItem = async (itemId: string) => {
    // Validate itemId
    const idValidation = validateUUID(itemId);
    if (!idValidation.isValid) {
      return { error: new Error('Invalid item ID') };
    }

    // Rate limit
    const rateLimitKey = getRateLimitKey('data:delete', userId || 'unknown');
    const rateLimitResult = rateLimiter.check(rateLimitKey, 'data:delete');
    if (!rateLimitResult.allowed) {
      return { error: new Error(rateLimitResult.error || 'Too many requests') };
    }

    const { error } = await supabase
      .from('wishlist')
      .delete()
      .eq('id', idValidation.sanitizedValue);

    if (!error) {
      setItems(prev => prev.filter(item => item.id !== itemId));
    }

    return { error };
  };

  // Computed values
  const activeItems = items.filter(item => !item.is_purchased);
  const purchasedItems = items.filter(item => item.is_purchased);

  return {
    items,
    activeItems,
    purchasedItems,
    loading,
    error,
    refresh: fetchItems,
    createItem,
    updateItem,
    markAsPurchased,
    deleteItem,
  };
}
