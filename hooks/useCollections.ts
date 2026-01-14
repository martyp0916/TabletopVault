import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Collection } from '@/types/database';

export function useCollections(userId: string | undefined) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = useCallback(async () => {
    if (!userId) {
      setCollections([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

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

  const createCollection = async (name: string, description?: string) => {
    if (!userId) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('collections')
      .insert({
        user_id: userId,
        name,
        description,
      })
      .select()
      .single();

    if (!error && data) {
      setCollections(prev => [data, ...prev]);
    }

    return { data, error };
  };

  const updateCollection = async (id: string, updates: Partial<Collection>) => {
    const { data, error } = await supabase
      .from('collections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      setCollections(prev => prev.map(c => c.id === id ? data : c));
    }

    return { data, error };
  };

  const deleteCollection = async (id: string) => {
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id);

    if (!error) {
      setCollections(prev => prev.filter(c => c.id !== id));
    }

    return { error };
  };

  return {
    collections,
    loading,
    error,
    refresh: fetchCollections,
    createCollection,
    updateCollection,
    deleteCollection,
  };
}

export function useCollection(collectionId: string | undefined) {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!collectionId) {
      setLoading(false);
      return;
    }

    const fetchCollection = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('collections')
          .select('*')
          .eq('id', collectionId)
          .single();

        if (error) throw error;
        setCollection(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCollection();
  }, [collectionId]);

  return { collection, loading, error };
}
