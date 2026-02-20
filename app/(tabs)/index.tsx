import { StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl, TextInput, View, Platform, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useCallback, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useItemStats, useRecentItems, useItems } from '@/hooks/useItems';
import { useCollections } from '@/hooks/useCollections';
import { useProfile } from '@/hooks/useProfile';
import { GAME_COLORS, STATUS_LABELS, GameSystem, ItemStatus, getEffectiveStatus } from '@/types/database';

type FilterStatus = 'all' | 'nib' | 'assembled' | 'primed' | 'painted';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { isDarkMode, toggleTheme, backgroundImageUrl } = useTheme();
  const colors = isDarkMode ? Colors.dark : Colors.light;
  const hasBackground = !!backgroundImageUrl;

  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { stats, loading: statsLoading, refresh: refreshStats } = useItemStats(user?.id);
  const { items: recentItems, loading: itemsLoading, refresh: refreshItems } = useRecentItems(user?.id, 10);
  const { items: allItems, loading: allItemsLoading, refresh: refreshAllItems } = useItems(user?.id);
  const { collections, loading: collectionsLoading, refresh: refreshCollections } = useCollections(user?.id);
  const [refreshing, setRefreshing] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const isSearching = searchQuery.length > 0 || statusFilter !== 'all';

  // Filter items based on search query and status filter
  const filteredItems = useMemo(() => {
    if (!isSearching) return [];

    return allItems.filter(item => {
      // Search filter
      const matchesSearch = searchQuery.length === 0 ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.faction && item.faction.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter - check count fields instead of status field
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        switch (statusFilter) {
          case 'nib':
            matchesStatus = (item.nib_count || 0) > 0;
            break;
          case 'assembled':
            matchesStatus = (item.assembled_count || 0) > 0;
            break;
          case 'primed':
            matchesStatus = (item.primed_count || 0) > 0;
            break;
          case 'painted':
            matchesStatus = (item.painted_count || 0) > 0;
            break;
        }
      }

      return matchesSearch && matchesStatus;
    });
  }, [allItems, searchQuery, statusFilter, isSearching]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshStats(), refreshItems(), refreshAllItems(), refreshCollections()]);
    setRefreshing(false);
  }, [refreshStats, refreshItems, refreshAllItems, refreshCollections]);

  // Find items that need painting (have any models not yet painted)
  const unpaintedItems = recentItems.filter(i => {
    const effectiveStatus = getEffectiveStatus(i);
    return effectiveStatus === 'nib' || effectiveStatus === 'wip';
  });
  const nextUp = unpaintedItems[0];

  // Calculate paint progress percentage
  const paintProgress = stats.total > 0
    ? Math.round((stats.paintedTotal / stats.total) * 100)
    : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: hasBackground ? 'transparent' : colors.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.textSecondary}
        />
      }
    >
      {/* Welcome Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={[styles.headerLeft, hasBackground && { backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 }]}>
          <View style={styles.titleRow}>
            {/* App logo */}
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <View style={styles.titleTextContainer}>
              <Text style={[styles.appName, { color: colors.text }]}>Tabletop Organizer</Text>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>
                Welcome back{profile?.username ? `, ${profile.username}` : ''}
              </Text>
            </View>
          </View>
        </View>
        <Pressable
          style={[styles.themeToggle, { backgroundColor: colors.card }]}
          onPress={toggleTheme}
        >
          <FontAwesome
            name={isDarkMode ? 'sun-o' : 'moon-o'}
            size={18}
            color={colors.text}
          />
        </Pressable>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <FontAwesome name="search" size={16} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search items..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <FontAwesome name="times-circle" size={16} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
        >
          {(['all', 'nib', 'assembled', 'primed', 'painted'] as FilterStatus[]).map((status) => (
            <Pressable
              key={status}
              style={[
                styles.filterChip,
                { backgroundColor: statusFilter === status ? getFilterColor(status) : colors.card },
                { borderColor: statusFilter === status ? getFilterColor(status) : colors.border },
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: statusFilter === status ? '#fff' : colors.textSecondary },
                ]}
              >
                {status === 'all' ? 'All' : status === 'nib' ? 'New in Box' : status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Search Results */}
      {isSearching && (
        <View style={styles.section}>
          <View style={[styles.sectionLabelContainer, hasBackground && { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              SEARCH RESULTS ({filteredItems.length})
            </Text>
          </View>
          {allItemsLoading ? (
            <ActivityIndicator style={{ marginTop: 20 }} />
          ) : filteredItems.length === 0 ? (
            <View style={styles.noResults}>
              <FontAwesome name="search" size={32} color={colors.border} />
              <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
                No items found
              </Text>
            </View>
          ) : (
            filteredItems.map((item) => (
              <Pressable
                key={item.id}
                style={[styles.searchResultItem, { backgroundColor: colors.card }]}
                onPress={() => router.push(`/item/${item.id}`)}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(getEffectiveStatus(item)) }
                  ]}
                />
                <View style={styles.searchResultContent}>
                  <Text style={[styles.searchResultName, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.searchResultMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.faction || 'No faction'} · {STATUS_LABELS[getEffectiveStatus(item)]}
                  </Text>
                </View>
                <FontAwesome name="chevron-right" size={12} color={colors.textSecondary} />
              </Pressable>
            ))
          )}
        </View>
      )}

      {/* Status Breakdown - Only show when not searching */}
      {!isSearching && (
        <>
      {/* Status Breakdown */}
      <View style={styles.statusGrid}>
        <View style={styles.statusGridRow}>
          <View style={[styles.statusCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statusIconContainer, { backgroundColor: 'rgba(107, 114, 128, 0.15)' }]}>
              <FontAwesome name="cube" size={18} color="#6b7280" />
            </View>
            <Text style={[styles.statusNumber, { color: '#6b7280' }]}>
              {statsLoading ? '—' : stats.nibTotal}
            </Text>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
              New in Box
            </Text>
          </View>
          <View style={[styles.statusCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statusIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <FontAwesome name="wrench" size={18} color="#991b1b" />
            </View>
            <Text style={[styles.statusNumber, { color: '#991b1b' }]}>
              {statsLoading ? '—' : stats.assembledTotal}
            </Text>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
              Assembled
            </Text>
          </View>
        </View>
        <View style={styles.statusGridRow}>
          <View style={[styles.statusCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statusIconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
              <FontAwesome name="tint" size={18} color="#6366f1" />
            </View>
            <Text style={[styles.statusNumber, { color: '#6366f1' }]}>
              {statsLoading ? '—' : stats.primedTotal}
            </Text>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
              Primed
            </Text>
          </View>
          <View style={[styles.statusCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statusIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <FontAwesome name="paint-brush" size={18} color="#10b981" />
            </View>
            <Text style={[styles.statusNumber, { color: '#10b981' }]}>
              {statsLoading ? '—' : stats.paintedTotal}
            </Text>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
              Painted
            </Text>
          </View>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressSection, { backgroundColor: colors.card }]}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressTitle, { color: colors.text }]}>Paint Progress</Text>
          <Text style={[styles.progressPercent, { color: '#10b981' }]}>
            {paintProgress}%
          </Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: '#10b981',
                width: `${paintProgress}%`
              }
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          {stats.paintedTotal} of {stats.total} models painted
        </Text>
      </View>

      {/* Quick Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.primary }]}>
          <View style={styles.statCardIcon}>
            <FontAwesome name="cubes" size={20} color="rgba(255,255,255,0.9)" />
          </View>
          <Text style={[styles.statCardNumber, { color: '#fff' }]}>
            {statsLoading ? '-' : stats.total}
          </Text>
          <Text style={[styles.statCardLabel, { color: 'rgba(255,255,255,0.8)' }]}>
            total models
          </Text>
        </View>
        <Pressable
          style={[styles.statCard, { backgroundColor: '#991b1b' }]}
          onPress={() => router.push('/(tabs)/collections')}
        >
          <View style={styles.statCardIcon}>
            <FontAwesome name="folder" size={20} color="rgba(255,255,255,0.9)" />
          </View>
          <Text style={[styles.statCardNumber, { color: '#fff' }]}>
            {collectionsLoading ? '-' : collections.length}
          </Text>
          <Text style={[styles.statCardLabel, { color: 'rgba(255,255,255,0.8)' }]}>
            collections
          </Text>
        </Pressable>
      </View>

      {/* What to Paint Next */}
      {nextUp && (
        <View style={styles.section}>
          <View style={[styles.sectionLabelContainer, hasBackground && { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              PAINT NEXT
            </Text>
          </View>
          <Pressable
            style={[styles.nextCard, { backgroundColor: colors.card }]}
            onPress={() => router.push(`/item/${nextUp.id}`)}
          >
            <View style={[styles.nextCardAccent, { backgroundColor: GAME_COLORS[nextUp.game_system] || GAME_COLORS.other }]} />
            <View style={styles.nextCardContent}>
              <Text style={[styles.nextCardName, { color: colors.text }]} numberOfLines={1}>
                {nextUp.name}
              </Text>
              <Text style={[styles.nextCardMeta, { color: colors.textSecondary }]}>
                {nextUp.faction || 'No faction'} · {STATUS_LABELS[getEffectiveStatus(nextUp)]}
              </Text>
            </View>
            <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
          </Pressable>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        <Pressable
          style={[styles.primaryAction, { backgroundColor: colors.text }]}
          onPress={() => router.push('/(tabs)/add')}
        >
          <FontAwesome name="plus" size={16} color={colors.background} />
          <Text style={[styles.primaryActionText, { color: colors.background }]}>
            Add Item
          </Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryAction, { backgroundColor: colors.card }]}
          onPress={() => router.push('/(tabs)/collections')}
        >
          <FontAwesome name="th-large" size={16} color={colors.text} />
          <Text style={[styles.secondaryActionText, { color: colors.text }]}>
            Collections
          </Text>
        </Pressable>
      </View>

      {/* Recent Items */}
      {recentItems.length > 0 && (
        <View style={styles.section}>
          <View style={[styles.sectionLabelContainer, hasBackground && { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              RECENT
            </Text>
          </View>
          <View style={[styles.recentItemsContainer, { backgroundColor: colors.card }]}>
            {recentItems.slice(0, 5).map((item, index) => (
              <Pressable
                key={item.id}
                style={[
                  styles.recentItem,
                  index !== recentItems.slice(0, 5).length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }
                ]}
                onPress={() => router.push(`/item/${item.id}`)}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(getEffectiveStatus(item)) }
                  ]}
                />
                <Text style={[styles.recentItemName, { color: colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Empty State */}
      {!itemsLoading && recentItems.length === 0 && (
        <View style={[styles.emptyState, hasBackground && { backgroundColor: colors.card, marginHorizontal: 24, borderRadius: 12, paddingVertical: 40 }]}>
          <FontAwesome name="inbox" size={48} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Your vault is empty
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Add your first miniature to get started
          </Text>
        </View>
      )}
        </>
      )}

      {/* Bottom spacing */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

function getFilterColor(status: FilterStatus): string {
  switch (status) {
    case 'all': return '#991b1b';      // Teal - primary accent
    case 'painted': return '#10b981';
    case 'primed': return '#6366f1';
    case 'assembled': return '#991b1b';
    case 'nib': return '#6b7280';
    default: return '#991b1b';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'painted': return '#10b981';
    case 'based': return '#8b5cf6';
    case 'primed': return '#6366f1';
    case 'assembled': return '#991b1b';
    case 'wip': return '#991b1b';
    case 'nib': return '#ef4444';
    default: return '#9ca3af';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  headerLeft: {
    backgroundColor: 'transparent',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
  },
  logoImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  titleTextContainer: {
    backgroundColor: 'transparent',
  },
  appName: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  greeting: {
    fontSize: 15,
    marginTop: 2,
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  statusGrid: {
    paddingHorizontal: 24,
    marginTop: 20,
    gap: 12,
    backgroundColor: 'transparent',
  },
  statusGridRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'transparent',
  },
  statusCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  statusIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statusNumber: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  progressSection: {
    marginHorizontal: 24,
    marginTop: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  progressTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  progressPercent: {
    fontSize: 22,
    fontWeight: '800',
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginTop: 16,
    backgroundColor: 'transparent',
  },
  statCard: {
    flex: 1,
    padding: 18,
    borderRadius: 20,
    alignItems: 'center',
  },
  statCardIcon: {
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  statCardNumber: {
    fontSize: 36,
    fontWeight: '800',
  },
  statCardLabel: {
    fontSize: 13,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 32,
    backgroundColor: 'transparent',
  },
  sectionLabelContainer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  nextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  nextCardAccent: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 14,
  },
  nextCardContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  nextCardName: {
    fontSize: 17,
    fontWeight: '600',
  },
  nextCardMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  actionsSection: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginTop: 32,
    backgroundColor: 'transparent',
  },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 10,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  recentItemsContainer: {
    borderRadius: 16,
    paddingHorizontal: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  recentItemName: {
    fontSize: 15,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  searchSection: {
    paddingHorizontal: 24,
    marginTop: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  filterScroll: {
    marginTop: 12,
    marginHorizontal: -24,
  },
  filterContainer: {
    paddingHorizontal: 24,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  searchResultContent: {
    flex: 1,
    marginLeft: 12,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchResultMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 15,
    marginTop: 12,
  },
});
