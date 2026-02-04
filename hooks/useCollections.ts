/**
 * Collections Hook
 *
 * SECURITY: Implements input validation and sanitization for all collection operations.
 * - Name and description length limits
 * - UUID validation for IDs
 * - Rate limiting for mutations
 * - Rejects unexpected fields
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Collection } from '@/types/database';
import {
  validateCollectionName,
  validateCollectionDescription,
  validateUUID,
  sanitizeString,
  LIMITS,
} from '@/lib/validation';
import { rateLimiter, getRateLimitKey } from '@/lib/rateLimiter';
import { FREE_TIER_LIMITS } from '@/lib/premium';

export function useCollections(userId: string | undefined, isPremium: boolean = true) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = useCallback(async () => {
    if (!userId) {
      setCollections([]);
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

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setCollections(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  /**
   * Create a new collection
   * SECURITY: Validates and sanitizes all inputs
   * PREMIUM: Checks collection limit for free users
   */
  const createCollection = async (name: string, description?: string) => {
    if (!userId) return { error: new Error('Not authenticated') };

    // PREMIUM: Check collection limit for free users
    if (!isPremium && collections.length >= FREE_TIER_LIMITS.MAX_COLLECTIONS) {
      return {
        error: new Error('LIMIT_REACHED'),
        limitType: 'collections' as const,
      };
    }

    // SECURITY: Validate name
    const nameValidation = validateCollectionName(name);
    if (!nameValidation.isValid) {
      return { error: new Error(nameValidation.errors[0]) };
    }

    // SECURITY: Validate description
    const descValidation = validateCollectionDescription(description);
    if (!descValidation.isValid) {
      return { error: new Error(descValidation.errors[0]) };
    }

    // SECURITY: Rate limit creates
    const rateLimitKey = getRateLimitKey('data:create', userId);
    const rateLimitResult = rateLimiter.check(rateLimitKey, 'data:create');
    if (!rateLimitResult.allowed) {
      return { error: new Error(rateLimitResult.error || 'Too many requests. Please slow down.') };
    }

    // Get the next sort_order value
    const nextSortOrder = collections.length;

    const { data, error } = await supabase
      .from('collections')
      .insert({
        user_id: userId,
        name: nameValidation.sanitizedValue,
        description: descValidation.sanitizedValue,
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (!error && data) {
      setCollections(prev => [...prev, data]);
    }

    return { data, error };
  };

  /**
   * Update a collection
   * SECURITY: Validates ID and sanitizes update fields, rejects unexpected fields
   */
  const updateCollection = async (id: string, updates: Partial<Collection>) => {
    // SECURITY: Validate ID format
    const idValidation = validateUUID(id);
    if (!idValidation.isValid) {
      return { error: new Error('Invalid collection ID') };
    }

    // SECURITY: Only allow specific fields to be updated (prevent mass assignment)
    const allowedFields = ['name', 'description', 'is_public', 'is_complete', 'is_locked', 'cover_image_url', 'sort_order'];
    const sanitizedUpdates: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) {
        // SECURITY: Reject unexpected fields
        console.warn(`Rejected unexpected field in collection update: ${key}`);
        continue;
      }

      // Validate and sanitize each field
      if (key === 'name' && value !== undefined) {
        const validation = validateCollectionName(value);
        if (!validation.isValid) {
          return { error: new Error(validation.errors[0]) };
        }
        sanitizedUpdates[key] = validation.sanitizedValue;
      } else if (key === 'description') {
        const validation = validateCollectionDescription(value);
        if (!validation.isValid) {
          return { error: new Error(validation.errors[0]) };
        }
        sanitizedUpdates[key] = validation.sanitizedValue;
      } else if (key === 'is_public' || key === 'is_complete' || key === 'is_locked') {
        // Boolean validation
        sanitizedUpdates[key] = Boolean(value);
      } else if (key === 'sort_order') {
        // Integer validation for sort order
        sanitizedUpdates[key] = parseInt(value as string) || 0;
      } else if (key === 'cover_image_url') {
        // Allow null or string for image URL
        sanitizedUpdates[key] = value === null ? null : sanitizeString(value);
      }
    }

    // SECURITY: Rate limit updates
    const rateLimitKey = getRateLimitKey('data:update', id);
    const rateLimitResult = rateLimiter.check(rateLimitKey, 'data:update');
    if (!rateLimitResult.allowed) {
      return { error: new Error(rateLimitResult.error || 'Too many requests. Please slow down.') };
    }

    const { data, error } = await supabase
      .from('collections')
      .update(sanitizedUpdates)
      .eq('id', idValidation.sanitizedValue)
      .select()
      .single();

    if (!error && data) {
      setCollections(prev => prev.map(c => c.id === id ? data : c));
    }

    return { data, error };
  };

  /**
   * Delete a collection
   * SECURITY: Validates ID format
   */
  const deleteCollection = async (id: string) => {
    // SECURITY: Validate ID format
    const idValidation = validateUUID(id);
    if (!idValidation.isValid) {
      return { error: new Error('Invalid collection ID') };
    }

    // SECURITY: Rate limit deletes
    const rateLimitKey = getRateLimitKey('data:delete', userId || 'unknown');
    const rateLimitResult = rateLimiter.check(rateLimitKey, 'data:delete');
    if (!rateLimitResult.allowed) {
      return { error: new Error(rateLimitResult.error || 'Too many requests. Please slow down.') };
    }

    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', idValidation.sanitizedValue);

    if (!error) {
      setCollections(prev => prev.filter(c => c.id !== id));
    }

    return { error };
  };

  /**
   * Reorder collections
   * Updates the sort_order of all collections based on the new order
   */
  const reorderCollections = async (reorderedCollections: Collection[]) => {
    // Update local state immediately for responsive UI
    setCollections(reorderedCollections);

    // Update sort_order in database for each collection
    const updates = reorderedCollections.map((col, index) =>
      supabase
        .from('collections')
        .update({ sort_order: index })
        .eq('id', col.id)
    );

    try {
      await Promise.all(updates);
    } catch (e: any) {
      console.error('Error reordering collections:', e);
      // Refresh to restore correct order on error
      fetchCollections();
    }
  };

  return {
    collections,
    loading,
    error,
    refresh: fetchCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    reorderCollections,
  };
}

/**
 * Fetch a single collection by ID
 * SECURITY: Validates collection ID format
 */
export function useCollection(collectionId: string | undefined) {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCollection = useCallback(async () => {
    if (!collectionId) {
      setLoading(false);
      return;
    }

    // SECURITY: Validate collectionId format
    const idValidation = validateUUID(collectionId);
    if (!idValidation.isValid) {
      setError('Invalid collection ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('id', idValidation.sanitizedValue)
        .single();

      if (error) throw error;
      setCollection(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [collectionId]);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  return { collection, loading, error, refresh: fetchCollection };
}
