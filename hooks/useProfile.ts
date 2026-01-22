/**
 * Profile Hook
 *
 * SECURITY: Implements input validation for profile operations.
 * - UUID validation for user IDs
 * - Username validation and sanitization
 * - Rate limiting for updates
 * - Rejects unexpected fields
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/database';
import {
  validateUUID,
  validateUsername,
  sanitizeString,
} from '@/lib/validation';
import { rateLimiter, getRateLimitKey } from '@/lib/rateLimiter';

// SECURITY: Only allow specific fields to be updated
const ALLOWED_UPDATE_FIELDS = ['username', 'avatar_url', 'background_image_url'];

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
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
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  /**
   * Update user profile
   * SECURITY: Validates and sanitizes all input, rejects unexpected fields
   */
  const updateProfile = async (updates: Partial<User>) => {
    if (!userId) return { error: new Error('Not authenticated') };

    const sanitizedUpdates: Record<string, any> = {};

    // SECURITY: Only process allowed fields (prevent mass assignment)
    for (const [key, value] of Object.entries(updates)) {
      if (!ALLOWED_UPDATE_FIELDS.includes(key)) {
        console.warn(`Rejected unexpected field in profile update: ${key}`);
        continue;
      }

      if (key === 'username' && value !== undefined) {
        const validation = validateUsername(value);
        if (!validation.isValid) {
          return { error: new Error(validation.errors[0]) };
        }
        sanitizedUpdates.username = validation.sanitizedValue;
      } else if (key === 'avatar_url') {
        // Allow null or sanitized string for avatar URL
        sanitizedUpdates.avatar_url = value === null ? null : sanitizeString(value);
      } else if (key === 'background_image_url') {
        // Allow null or sanitized string for background image URL
        sanitizedUpdates.background_image_url = value === null ? null : sanitizeString(value);
      }
    }

    // SECURITY: Rate limit profile updates
    const rateLimitKey = getRateLimitKey('data:update', userId);
    const rateLimitResult = rateLimiter.check(rateLimitKey, 'data:update');
    if (!rateLimitResult.allowed) {
      return { error: new Error(rateLimitResult.error || 'Too many requests. Please slow down.') };
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...sanitizedUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (!error && data) {
      setProfile(data);
    }

    return { data, error };
  };

  return {
    profile,
    loading,
    error,
    refresh: fetchProfile,
    updateProfile,
  };
}
