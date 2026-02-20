import { StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useFollows, useIsFollowing } from '@/hooks/useFollows';
import { supabase } from '@/lib/supabase';
import { User, Collection } from '@/types/database';
import UserAvatar from '@/components/UserAvatar';
import FollowButton from '@/components/FollowButton';

export default function PublicUserProfileScreen() {
  const { id } = useLocalSearchParams();
  const targetUserId = id as string;
  const insets = useSafeAreaInsets();
  const { isDarkMode, toggleTheme } = useTheme();
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const { user } = useAuth();
  const { followUser, unfollowUser } = useFollows(user?.id);
  const { isFollowing, loading: followLoading, refresh: refreshFollowStatus } = useIsFollowing(user?.id, targetUserId);

  const [profile, setProfile] = useState<User | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isOwnProfile = user?.id === targetUserId;

  const fetchProfile = useCallback(async () => {
    if (!targetUserId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (error) throw error;

      // Check if profile is public or if viewing own profile
      if (!data.is_public && !isOwnProfile) {
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (e: any) {
      console.error('Error fetching profile:', e);
      setProfile(null);
    }
  }, [targetUserId, isOwnProfile]);

  const fetchPublicCollections = useCallback(async () => {
    if (!targetUserId || !profile?.is_public) {
      setCollections([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCollections(data || []);
    } catch (e) {
      console.error('Error fetching collections:', e);
    }
  }, [targetUserId, profile?.is_public]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await fetchProfile();
    setLoading(false);
  }, [fetchProfile]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (profile?.is_public) {
      fetchPublicCollections();
    }
  }, [profile, fetchPublicCollections]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchProfile(), fetchPublicCollections(), refreshFollowStatus()]);
    setRefreshing(false);
  }, [fetchProfile, fetchPublicCollections, refreshFollowStatus]);

  const handleFollow = async () => {
    const result = await followUser(targetUserId);
    if (!result.error) {
      await refreshFollowStatus();
      await fetchProfile(); // Refresh to get updated follower count
    }
    return result;
  };

  const handleUnfollow = async () => {
    const result = await unfollowUser(targetUserId);
    if (!result.error) {
      await refreshFollowStatus();
      await fetchProfile(); // Refresh to get updated follower count
    }
    return result;
  };

  const handleOpenWebsite = () => {
    if (profile?.website_url) {
      const url = profile.website_url.startsWith('http')
        ? profile.website_url
        : `https://${profile.website_url}`;
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <FontAwesome name="lock" size={48} color={colors.textSecondary} />
        <Text style={[styles.privateText, { color: colors.textSecondary }]}>
          This profile is private
        </Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={{ color: '#991b1b' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {profile.username}
          </Text>
        </View>
        <Pressable onPress={toggleTheme}>
          <FontAwesome name={isDarkMode ? 'sun-o' : 'moon-o'} size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={{ backgroundColor: colors.background }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.textSecondary}
          />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <UserAvatar avatarPath={profile.avatar_url} size={80} showBorder />

          <Text style={[styles.username, { color: colors.text }]}>
            {profile.username}
          </Text>

          {profile.bio && (
            <Text style={[styles.bio, { color: colors.textSecondary }]}>
              {profile.bio}
            </Text>
          )}

          {/* Location & Website */}
          <View style={styles.metaRow}>
            {profile.location && (
              <View style={styles.metaItem}>
                <FontAwesome name="map-marker" size={14} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {profile.location}
                </Text>
              </View>
            )}
            {profile.website_url && (
              <Pressable style={styles.metaItem} onPress={handleOpenWebsite}>
                <FontAwesome name="link" size={14} color="#991b1b" />
                <Text style={[styles.metaText, { color: '#991b1b' }]}>
                  Website
                </Text>
              </Pressable>
            )}
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <Pressable
              style={styles.stat}
              onPress={() => router.push({ pathname: '/user/followers', params: { userId: targetUserId } })}
            >
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {profile.follower_count || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Followers
              </Text>
            </Pressable>
            <Pressable
              style={styles.stat}
              onPress={() => router.push({ pathname: '/user/following', params: { userId: targetUserId } })}
            >
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {profile.following_count || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Following
              </Text>
            </Pressable>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {collections.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Collections
              </Text>
            </View>
          </View>

          {/* Follow Button (not on own profile) */}
          {!isOwnProfile && user && (
            <View style={styles.followButtonContainer}>
              <FollowButton
                isFollowing={isFollowing}
                onFollow={handleFollow}
                onUnfollow={handleUnfollow}
                disabled={followLoading}
              />
            </View>
          )}
        </View>

        {/* Public Collections */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            PUBLIC COLLECTIONS
          </Text>

          {collections.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome name="folder-open-o" size={32} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No public collections
              </Text>
            </View>
          ) : (
            collections.map((collection, index) => (
              <Pressable
                key={collection.id}
                style={[
                  styles.collectionRow,
                  index !== collections.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
                onPress={() => router.push(`/collection/${collection.id}`)}
              >
                <View style={styles.collectionInfo}>
                  <Text style={[styles.collectionName, { color: colors.text }]}>
                    {collection.name}
                  </Text>
                  {collection.description && (
                    <Text
                      style={[styles.collectionDescription, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {collection.description}
                    </Text>
                  )}
                </View>
                <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
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
  privateText: {
    fontSize: 16,
    marginTop: 16,
  },
  backLink: {
    marginTop: 16,
    padding: 8,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12,
  },
  bio: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 20,
    backgroundColor: 'transparent',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
  },
  metaText: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    backgroundColor: 'transparent',
  },
  stat: {
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  followButtonContainer: {
    marginTop: 20,
    backgroundColor: 'transparent',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: 'transparent',
  },
  emptyText: {
    fontSize: 15,
    marginTop: 12,
  },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  collectionInfo: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  collectionName: {
    fontSize: 16,
    fontWeight: '500',
  },
  collectionDescription: {
    fontSize: 13,
    marginTop: 2,
  },
});
