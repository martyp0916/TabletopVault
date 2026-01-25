import { StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { Text, View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useState, useCallback, useEffect } from 'react';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/database';
import UserAvatar from '@/components/UserAvatar';

interface FollowerItem {
  id: string;
  follower: Pick<User, 'id' | 'username' | 'avatar_url'>;
}

export default function FollowersScreen() {
  const { userId } = useLocalSearchParams();
  const targetUserId = userId as string;
  const { isDarkMode, toggleTheme } = useTheme();
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const [followers, setFollowers] = useState<FollowerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFollowers = useCallback(async () => {
    if (!targetUserId) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select(`
          id,
          follower:profiles!follower_id(id, username, avatar_url)
        `)
        .eq('following_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFollowers(data || []);
    } catch (e) {
      console.error('Error fetching followers:', e);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchFollowers();
  }, [fetchFollowers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFollowers();
    setRefreshing(false);
  }, [fetchFollowers]);

  const renderItem = ({ item }: { item: FollowerItem }) => (
    <Pressable
      style={[styles.userRow, { borderBottomColor: colors.border }]}
      onPress={() => router.push(`/user/${item.follower.id}`)}
    >
      <UserAvatar avatarPath={item.follower.avatar_url} size={48} />
      <View style={styles.userInfo}>
        <Text style={[styles.username, { color: colors.text }]}>
          {item.follower.username}
        </Text>
      </View>
      <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Followers</Text>
        </View>
        <Pressable onPress={toggleTheme}>
          <FontAwesome name={isDarkMode ? 'sun-o' : 'moon-o'} size={20} color={colors.text} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      ) : followers.length === 0 ? (
        <View style={styles.emptyState}>
          <FontAwesome name="users" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No followers yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={followers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.textSecondary}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerCenter: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    backgroundColor: 'transparent',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: 'transparent',
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
});
