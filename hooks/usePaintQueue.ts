/**
 * Paint Queue Hook
 *
 * Manages the user's paint queue - a prioritized list of items to paint next.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PaintQueueItem, Item } from '@/types/database';
import { validateUUID } from '@/lib/validation';
import { rateLimiter, getRateLimitKey } from '@/lib/rateLimiter';

export function usePaintQueue(userId: string | undefined) {
  const [queueItems, setQueueItems] = useState<PaintQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    if (!userId) {
      setQueueItems([]);
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

      // Fetch queue items with joined item data
      const { data, error } = await supabase
        .from('paint_queue')
        .select(`
          *,
          item:items(*)
        `)
        .eq('user_id', userId)
        .order('priority', { ascending: true });

      if (error) throw error;
      setQueueItems(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  /**
   * Add an item to the paint queue
   */
  const addToQueue = async (itemId: string, notes?: string) => {
    if (!userId) return { error: new Error('Not authenticated') };

    // Validate itemId
    const itemIdValidation = validateUUID(itemId);
    if (!itemIdValidation.isValid) {
      return { error: new Error('Invalid item ID') };
    }

    // Rate limit
    const rateLimitKey = getRateLimitKey('data:create', userId);
    const rateLimitResult = rateLimiter.check(rateLimitKey, 'data:create');
    if (!rateLimitResult.allowed) {
      return { error: new Error(rateLimitResult.error || 'Too many requests') };
    }

    // Get the next priority (lowest priority = highest number + 1)
    const maxPriority = queueItems.length > 0
      ? Math.max(...queueItems.map(q => q.priority))
      : -1;

    const { data, error } = await supabase
      .from('paint_queue')
      .insert({
        user_id: userId,
        item_id: itemIdValidation.sanitizedValue,
        priority: maxPriority + 1,
        notes: notes?.trim() || null,
      })
      .select(`
        *,
        item:items(*)
      `)
      .single();

    if (!error && data) {
      setQueueItems(prev => [...prev, data]);
    }

    return { data, error };
  };

  /**
   * Remove an item from the paint queue
   */
  const removeFromQueue = async (queueId: string) => {
    // Validate queueId
    const idValidation = validateUUID(queueId);
    if (!idValidation.isValid) {
      return { error: new Error('Invalid queue ID') };
    }

    // Rate limit
    const rateLimitKey = getRateLimitKey('data:delete', userId || 'unknown');
    const rateLimitResult = rateLimiter.check(rateLimitKey, 'data:delete');
    if (!rateLimitResult.allowed) {
      return { error: new Error(rateLimitResult.error || 'Too many requests') };
    }

    const { error } = await supabase
      .from('paint_queue')
      .delete()
      .eq('id', idValidation.sanitizedValue);

    if (!error) {
      setQueueItems(prev => prev.filter(q => q.id !== queueId));
    }

    return { error };
  };

  /**
   * Move an item up in the queue (decrease priority number)
   */
  const moveUp = async (queueId: string) => {
    const currentIndex = queueItems.findIndex(q => q.id === queueId);
    if (currentIndex <= 0) return { error: null }; // Already at top

    const itemAbove = queueItems[currentIndex - 1];
    const currentItem = queueItems[currentIndex];

    // Swap priorities
    const { error: error1 } = await supabase
      .from('paint_queue')
      .update({ priority: itemAbove.priority })
      .eq('id', currentItem.id);

    const { error: error2 } = await supabase
      .from('paint_queue')
      .update({ priority: currentItem.priority })
      .eq('id', itemAbove.id);

    if (!error1 && !error2) {
      // Update local state
      const newItems = [...queueItems];
      newItems[currentIndex - 1] = { ...currentItem, priority: itemAbove.priority };
      newItems[currentIndex] = { ...itemAbove, priority: currentItem.priority };
      setQueueItems(newItems);
    }

    return { error: error1 || error2 };
  };

  /**
   * Move an item down in the queue (increase priority number)
   */
  const moveDown = async (queueId: string) => {
    const currentIndex = queueItems.findIndex(q => q.id === queueId);
    if (currentIndex < 0 || currentIndex >= queueItems.length - 1) {
      return { error: null }; // Already at bottom
    }

    const itemBelow = queueItems[currentIndex + 1];
    const currentItem = queueItems[currentIndex];

    // Swap priorities
    const { error: error1 } = await supabase
      .from('paint_queue')
      .update({ priority: itemBelow.priority })
      .eq('id', currentItem.id);

    const { error: error2 } = await supabase
      .from('paint_queue')
      .update({ priority: currentItem.priority })
      .eq('id', itemBelow.id);

    if (!error1 && !error2) {
      // Update local state
      const newItems = [...queueItems];
      newItems[currentIndex + 1] = { ...currentItem, priority: itemBelow.priority };
      newItems[currentIndex] = { ...itemBelow, priority: currentItem.priority };
      setQueueItems(newItems);
    }

    return { error: error1 || error2 };
  };

  /**
   * Check if an item is already in the queue
   */
  const isInQueue = (itemId: string): boolean => {
    return queueItems.some(q => q.item_id === itemId);
  };

  return {
    queueItems,
    loading,
    error,
    refresh: fetchQueue,
    addToQueue,
    removeFromQueue,
    moveUp,
    moveDown,
    isInQueue,
  };
}
