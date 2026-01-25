/**
 * Painting Goals Hook
 *
 * Manages user painting goals with targets and deadlines.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PaintingGoal, GoalType } from '@/types/database';
import { validateUUID } from '@/lib/validation';
import { rateLimiter, getRateLimitKey } from '@/lib/rateLimiter';

// Validation constants
const GOAL_TITLE_MAX_LENGTH = 100;
const GOAL_TARGET_MAX = 10000;

export function usePaintingGoals(userId: string | undefined) {
  const [goals, setGoals] = useState<PaintingGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    if (!userId) {
      setGoals([]);
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
        .from('painting_goals')
        .select('*')
        .eq('user_id', userId)
        .order('is_completed', { ascending: true })
        .order('deadline', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  /**
   * Create a new painting goal
   */
  const createGoal = async (
    title: string,
    goalType: GoalType,
    targetCount: number,
    deadline?: string
  ) => {
    if (!userId) return { error: new Error('Not authenticated') };

    // Validate title
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return { error: new Error('Goal title is required') };
    }
    if (trimmedTitle.length > GOAL_TITLE_MAX_LENGTH) {
      return { error: new Error(`Title must be ${GOAL_TITLE_MAX_LENGTH} characters or less`) };
    }

    // Validate goal type
    const validTypes: GoalType[] = ['models_painted', 'items_completed', 'custom'];
    if (!validTypes.includes(goalType)) {
      return { error: new Error('Invalid goal type') };
    }

    // Validate target count
    if (!Number.isInteger(targetCount) || targetCount < 1 || targetCount > GOAL_TARGET_MAX) {
      return { error: new Error(`Target must be between 1 and ${GOAL_TARGET_MAX}`) };
    }

    // Validate deadline if provided
    if (deadline) {
      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) {
        return { error: new Error('Invalid deadline date') };
      }
    }

    // Rate limit
    const rateLimitKey = getRateLimitKey('data:create', userId);
    const rateLimitResult = rateLimiter.check(rateLimitKey, 'data:create');
    if (!rateLimitResult.allowed) {
      return { error: new Error(rateLimitResult.error || 'Too many requests') };
    }

    const { data, error } = await supabase
      .from('painting_goals')
      .insert({
        user_id: userId,
        title: trimmedTitle,
        goal_type: goalType,
        target_count: targetCount,
        current_count: 0,
        deadline: deadline || null,
      })
      .select()
      .single();

    if (!error && data) {
      setGoals(prev => [data, ...prev]);
    }

    return { data, error };
  };

  /**
   * Update a goal's progress
   */
  const updateProgress = async (goalId: string, newCount: number) => {
    // Validate goalId
    const idValidation = validateUUID(goalId);
    if (!idValidation.isValid) {
      return { error: new Error('Invalid goal ID') };
    }

    // Validate count
    if (!Number.isInteger(newCount) || newCount < 0 || newCount > GOAL_TARGET_MAX) {
      return { error: new Error(`Count must be between 0 and ${GOAL_TARGET_MAX}`) };
    }

    // Rate limit
    const rateLimitKey = getRateLimitKey('data:update', goalId);
    const rateLimitResult = rateLimiter.check(rateLimitKey, 'data:update');
    if (!rateLimitResult.allowed) {
      return { error: new Error(rateLimitResult.error || 'Too many requests') };
    }

    // Check if this completes the goal
    const goal = goals.find(g => g.id === goalId);
    const isNowComplete = goal && newCount >= goal.target_count;

    const updates: any = { current_count: newCount };
    if (isNowComplete && !goal?.is_completed) {
      updates.is_completed = true;
    }

    const { data, error } = await supabase
      .from('painting_goals')
      .update(updates)
      .eq('id', idValidation.sanitizedValue)
      .select()
      .single();

    if (!error && data) {
      setGoals(prev => prev.map(g => g.id === goalId ? data : g));
    }

    return { data, error };
  };

  /**
   * Increment a goal's progress by a specified amount
   */
  const incrementProgress = async (goalId: string, amount: number = 1) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return { error: new Error('Goal not found') };

    const newCount = Math.min(goal.current_count + amount, goal.target_count);
    return updateProgress(goalId, newCount);
  };

  /**
   * Mark a goal as complete
   */
  const completeGoal = async (goalId: string) => {
    // Validate goalId
    const idValidation = validateUUID(goalId);
    if (!idValidation.isValid) {
      return { error: new Error('Invalid goal ID') };
    }

    const goal = goals.find(g => g.id === goalId);
    if (!goal) return { error: new Error('Goal not found') };

    const { data, error } = await supabase
      .from('painting_goals')
      .update({
        is_completed: true,
        current_count: goal.target_count,
      })
      .eq('id', idValidation.sanitizedValue)
      .select()
      .single();

    if (!error && data) {
      setGoals(prev => prev.map(g => g.id === goalId ? data : g));
    }

    return { data, error };
  };

  /**
   * Delete a goal
   */
  const deleteGoal = async (goalId: string) => {
    // Validate goalId
    const idValidation = validateUUID(goalId);
    if (!idValidation.isValid) {
      return { error: new Error('Invalid goal ID') };
    }

    // Rate limit
    const rateLimitKey = getRateLimitKey('data:delete', userId || 'unknown');
    const rateLimitResult = rateLimiter.check(rateLimitKey, 'data:delete');
    if (!rateLimitResult.allowed) {
      return { error: new Error(rateLimitResult.error || 'Too many requests') };
    }

    const { error } = await supabase
      .from('painting_goals')
      .delete()
      .eq('id', idValidation.sanitizedValue);

    if (!error) {
      setGoals(prev => prev.filter(g => g.id !== goalId));
    }

    return { error };
  };

  // Computed values
  const activeGoals = goals.filter(g => !g.is_completed);
  const completedGoals = goals.filter(g => g.is_completed);
  const overdueGoals = activeGoals.filter(g => {
    if (!g.deadline) return false;
    return new Date(g.deadline) < new Date();
  });

  return {
    goals,
    activeGoals,
    completedGoals,
    overdueGoals,
    loading,
    error,
    refresh: fetchGoals,
    createGoal,
    updateProgress,
    incrementProgress,
    completeGoal,
    deleteGoal,
  };
}
