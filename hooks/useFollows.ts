/**
 * Follows Hook
 *
 * SECURITY: Implements input validation and sanitization for all follow operations.
 * - UUID validation for user IDs
 * - Rate limiting for mutations
 * - Prevents self-following via database constraint
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Follow, User } from '@/types/database';
import { validateUUID } from '@/lib/validation';
import { rateLimiter, getRateLimitKey } from '@/lib/rateLimiter';

export interface FollowWithUser extends Follow {
  follower?: Pick<User, 'id' | 'username' | 'avatar_url'>;
  following?: Pick<User, 'id' | 'username' | 'avatar_url'>;
}

export function useFollows(userId: string | undefined) {
  const [followers, setFollowers] = useState<FollowWithUser[]>([]);
  const [following, setFollowing] = useState<FollowWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFollowers = useCallback(async () => {
    if (!userId) {
      setFollowers([]);
      return;
    }

    // SECURITY: Validate userId format
    const userIdValidation = validateUUID(userId);
    if (!userIdValidation.isValid) {
      setError('Invalid user ID');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('follows')
        .select(`
          *,
          follower:profiles!follower_id(id, username, avatar_url)
        `)
        .eq('following_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFollowers(data || []);
    } catch (e: any) {
      setError(e.message);
    }
  }, [userId]);

  const fetchFollowing = useCallback(async () => {
    if (!userId) {
      setFollowing([]);
      return;
    }

    // SECURITY: Validate userId format
    const userIdValidation = validateUUID(userId);
    if (!userIdValidation.isValid) {
      setError('Invalid user ID');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('follows')
        .select(`
          *,
          following:profiles!following_id(id, username, avatar_url)
        `)
        .eq('follower_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFollowing(data || []);
    } catch (e: any) {
      setError(e.message);
    }
  }, [userId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchFollowers(), fetchFollowing()]);
    setLoading(false);
  }, [fetchFollowers, fetchFollowing]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /**
   * Follow a user
   * SECURITY: Validates target user ID, prevents self-following (also enforced by DB)
   */
  const followUser = async (targetUserId: string) => {
    if (!userId) return { error: new Error('Not authenticated') };

    // SECURITY: Validate target user ID
    const targetValidation = validateUUID(targetUserId);
    if (!targetValidation.isValid) {
      return { error: new Error('Invalid user ID') };
    }

    // Prevent self-following
    if (targetUserId === userId) {
      return { error: new Error('Cannot follow yourself') };
    }

    // SECURITY: Rate limit follows
    const rateLimitKey = getRateLimitKey('data:create', userId);
    const rateLimitResult = rateLimiter.check(rateLimitKey, 'data:create');
    if (!rateLimitResult.allowed) {
      return { error: new Error(rateLimitResult.error || 'Too many requests. Please slow down.') };
    }

    const { data, error } = await supabase
      .from('follows')
      .insert({
        follower_id: userId,
        following_id: targetValidation.sanitizedValue,
      })
      .select(`
        *,
        following:profiles!following_id(id, username, avatar_url)
      `)
      .single();

    if (!error && data) {
      setFollowing(prev => [data, ...prev]);
    }

    return { data, error };
  };

  /**
   * Unfollow a user
   * SECURITY: Validates target user ID
   */
  const unfollowUser = async (targetUserId: string) => {
    if (!userId) return { error: new Error('Not authenticated') };

    // SECURITY: Validate target user ID
    const targetValidation = validateUUID(targetUserId);
    if (!targetValidation.isValid) {
      return { error: new Error('Invalid user ID') };
    }

    // SECURITY: Rate limit unfollows
    const rateLimitKey = getRateLimitKey('data:delete', userId);
    const rateLimitResult = rateLimiter.check(rateLimitKey, 'data:delete');
    if (!rateLimitResult.allowed) {
      return { error: new Error(rateLimitResult.error || 'Too many requests. Please slow down.') };
    }

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', userId)
      .eq('following_id', targetValidation.sanitizedValue);

    if (!error) {
      setFollowing(prev => prev.filter(f => f.following_id !== targetUserId));
    }

    return { error };
  };

  /**
   * Check if the current user is following a target user
   */
  const isFollowing = (targetUserId: string): boolean => {
    return following.some(f => f.following_id === targetUserId);
  };

  /**
   * Check if a target user is following the current user
   */
  const isFollowedBy = (targetUserId: string): boolean => {
    return followers.some(f => f.follower_id === targetUserId);
  };

  return {
    followers,
    following,
    loading,
    error,
    refresh: fetchAll,
    refreshFollowers: fetchFollowers,
    refreshFollowing: fetchFollowing,
    followUser,
    unfollowUser,
    isFollowing,
    isFollowedBy,
  };
}

/**
 * Check follow status for a specific user
 * Lightweight hook for just checking if following
 */
export function useIsFollowing(currentUserId: string | undefined, targetUserId: string | undefined) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkFollowing = useCallback(async () => {
    if (!currentUserId || !targetUserId) {
      setIsFollowing(false);
      setLoading(false);
      return;
    }

    // Validate both IDs
    const currentValidation = validateUUID(currentUserId);
    const targetValidation = validateUUID(targetUserId);
    if (!currentValidation.isValid || !targetValidation.isValid) {
      setIsFollowing(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId)
        .maybeSingle();

      if (!error) {
        setIsFollowing(!!data);
      }
    } catch (e) {
      console.error('Error checking follow status:', e);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, targetUserId]);

  useEffect(() => {
    checkFollowing();
  }, [checkFollowing]);

  return { isFollowing, loading, refresh: checkFollowing };
}
