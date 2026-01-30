/**
 * Progress Stats Hook
 *
 * Calculates painting progress statistics by game system.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Collection, Item } from '@/types/database';
import { validateUUID } from '@/lib/validation';

export interface CollectionProgress {
  collection: Collection;
  totalModels: number;
  paintedModels: number;
  percentage: number;
}

export interface GameSystemProgress {
  gameSystem: string;
  totalModels: number;
  paintedModels: number;
  percentage: number;
  collectionCount: number;
}

export interface OverallProgress {
  totalModels: number;
  paintedModels: number;
  percentage: number;
  nibModels: number;
  assembledModels: number;
  primedModels: number;
}

export function useProgressStats(userId: string | undefined) {
  const [overallProgress, setOverallProgress] = useState<OverallProgress>({
    totalModels: 0,
    paintedModels: 0,
    percentage: 0,
    nibModels: 0,
    assembledModels: 0,
    primedModels: 0,
  });
  const [collectionProgress, setCollectionProgress] = useState<CollectionProgress[]>([]);
  const [gameSystemProgress, setGameSystemProgress] = useState<GameSystemProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!userId) {
      setOverallProgress({
        totalModels: 0,
        paintedModels: 0,
        percentage: 0,
        nibModels: 0,
        assembledModels: 0,
        primedModels: 0,
      });
      setCollectionProgress([]);
      setGameSystemProgress([]);
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

      // Fetch all collections for this user
      const { data: collections, error: collectionsError } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (collectionsError) throw collectionsError;

      // Fetch all items for this user
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', userId);

      if (itemsError) throw itemsError;

      // Calculate overall progress
      let totalModels = 0;
      let paintedModels = 0;
      let nibModels = 0;
      let assembledModels = 0;
      let primedModels = 0;

      (items || []).forEach((item: Item) => {
        const nib = item.nib_count || 0;
        const assembled = item.assembled_count || 0;
        const primed = item.primed_count || 0;
        const painted = item.painted_count || 0;
        const based = item.based_count || 0;

        const itemTotal = nib + assembled + primed + painted + based;
        // If no status counts, use quantity as fallback
        totalModels += itemTotal > 0 ? itemTotal : (item.quantity || 1);

        nibModels += nib;
        assembledModels += assembled;
        primedModels += primed;
        paintedModels += painted + based; // Include based in painted
      });

      const overallPercentage = totalModels > 0
        ? Math.round((paintedModels / totalModels) * 100)
        : 0;

      setOverallProgress({
        totalModels,
        paintedModels,
        percentage: overallPercentage,
        nibModels,
        assembledModels,
        primedModels,
      });

      // Calculate per-collection progress
      const collectionProgressData: CollectionProgress[] = (collections || []).map((collection: Collection) => {
        const collectionItems = (items || []).filter((item: Item) => item.collection_id === collection.id);

        let collectionTotal = 0;
        let collectionPainted = 0;

        collectionItems.forEach((item: Item) => {
          const nib = item.nib_count || 0;
          const assembled = item.assembled_count || 0;
          const primed = item.primed_count || 0;
          const painted = item.painted_count || 0;
          const based = item.based_count || 0;

          const itemTotal = nib + assembled + primed + painted + based;
          collectionTotal += itemTotal > 0 ? itemTotal : (item.quantity || 1);
          collectionPainted += painted + based;
        });

        const percentage = collectionTotal > 0
          ? Math.round((collectionPainted / collectionTotal) * 100)
          : 0;

        return {
          collection,
          totalModels: collectionTotal,
          paintedModels: collectionPainted,
          percentage,
        };
      });

      // Sort by percentage (lowest first - most work needed)
      collectionProgressData.sort((a, b) => a.percentage - b.percentage);

      setCollectionProgress(collectionProgressData);

      // Calculate per-game-system progress
      // Group collections by their name (which is the game system)
      const gameSystemMap = new Map<string, { totalModels: number; paintedModels: number; collectionCount: number }>();

      collectionProgressData.forEach((cp) => {
        const gameSystem = cp.collection.name;
        const existing = gameSystemMap.get(gameSystem) || { totalModels: 0, paintedModels: 0, collectionCount: 0 };

        gameSystemMap.set(gameSystem, {
          totalModels: existing.totalModels + cp.totalModels,
          paintedModels: existing.paintedModels + cp.paintedModels,
          collectionCount: existing.collectionCount + 1,
        });
      });

      const gameSystemProgressData: GameSystemProgress[] = Array.from(gameSystemMap.entries()).map(([gameSystem, data]) => ({
        gameSystem,
        totalModels: data.totalModels,
        paintedModels: data.paintedModels,
        percentage: data.totalModels > 0 ? Math.round((data.paintedModels / data.totalModels) * 100) : 0,
        collectionCount: data.collectionCount,
      }));

      // Sort by percentage (lowest first - most work needed)
      gameSystemProgressData.sort((a, b) => a.percentage - b.percentage);

      setGameSystemProgress(gameSystemProgressData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return {
    overallProgress,
    collectionProgress,
    gameSystemProgress,
    loading,
    error,
    refresh: fetchProgress,
  };
}
