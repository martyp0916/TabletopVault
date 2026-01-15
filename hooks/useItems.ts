import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Item, ItemStatus, GameSystem } from '@/types/database';

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

  const createItem = async (item: {
    collection_id: string;
    name: string;
    game_system?: GameSystem;
    faction?: string;
    quantity?: number;
    status?: ItemStatus;
    purchase_price?: number;
    current_value?: number;
    purchase_date?: string;
    notes?: string;
  }) => {
    if (!userId) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('items')
      .insert({
        ...item,
        user_id: userId,
      })
      .select()
      .single();

    if (!error && data) {
      setItems(prev => [data, ...prev]);
    }

    return { data, error };
  };

  const updateItem = async (id: string, updates: Partial<Item>) => {
    const { data, error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      setItems(prev => prev.map(i => i.id === id ? data : i));
    }

    return { data, error };
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id);

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

export function useItem(itemId: string | undefined) {
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItem = useCallback(async () => {
    if (!itemId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', itemId)
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

// Stats hook for dashboard
export function useItemStats(userId: string | undefined) {
  const [stats, setStats] = useState({
    total: 0,
    battleReady: 0,
    shamePile: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('items')
        .select('status, quantity')
        .eq('user_id', userId);

      if (error) throw error;

      const total = data?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
      const battleReady = data?.filter(i => i.status === 'painted' || i.status === 'based')
        .reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
      const shamePile = data?.filter(i => i.status === 'nib')
        .reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;

      setStats({ total, battleReady, shamePile });
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

// Recent items hook
export function useRecentItems(userId: string | undefined, limit: number = 5) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecent = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setItems(data || []);
    } catch (e) {
      console.error('Error fetching recent items:', e);
    } finally {
      setLoading(false);
    }
  }, [userId, limit]);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  return { items, loading, refresh: fetchRecent };
}
