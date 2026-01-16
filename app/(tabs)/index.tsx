import { StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { Text, View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useCallback, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useItemStats, useRecentItems } from '@/hooks/useItems';
import { useCollections } from '@/hooks/useCollections';
import { GAME_COLORS, STATUS_LABELS, GameSystem, ItemStatus } from '@/types/database';

export default function HomeScreen() {
  const { isDarkMode, toggleTheme } = useTheme();
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const { user } = useAuth();
  const { stats, loading: statsLoading, refresh: refreshStats } = useItemStats(user?.id);
  const { items: recentItems, loading: itemsLoading, refresh: refreshItems } = useRecentItems(user?.id, 10);
  const { collections, loading: collectionsLoading, refresh: refreshCollections } = useCollections(user?.id);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshStats(), refreshItems(), refreshCollections()]);
    setRefreshing(false);
  }, [refreshStats, refreshItems, refreshCollections]);

  // Find items that need painting (shame pile + in progress)
  const unpaintedItems = recentItems.filter(i => i.status === 'nib' || i.status === 'assembled' || i.status === 'primed');
  const nextUp = unpaintedItems[0];

  // Calculate paint progress percentage
  const paintProgress = stats.total > 0
    ? Math.round((stats.battleReady / stats.total) * 100)
    : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
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
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.appName, { color: colors.text }]}>TabletopVault</Text>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
          </Text>
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

      {/* Hero Shame Pile */}
      <View style={[styles.heroSection, { backgroundColor: colors.card }]}>
        <View style={styles.heroIconContainer}>
          <FontAwesome name="paint-brush" size={24} color="#ef4444" />
        </View>
        <Text style={[styles.heroNumber, { color: colors.text }]}>
          {statsLoading ? '—' : stats.shamePile}
        </Text>
        <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>
          models to paint
        </Text>
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
          {stats.battleReady} of {stats.total} models painted
        </Text>
      </View>

      {/* Quick Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#3b82f6' }]}>
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
        <View style={[styles.statCard, { backgroundColor: '#8b5cf6' }]}>
          <View style={styles.statCardIcon}>
            <FontAwesome name="folder" size={20} color="rgba(255,255,255,0.9)" />
          </View>
          <Text style={[styles.statCardNumber, { color: '#fff' }]}>
            {collectionsLoading ? '-' : collections.length}
          </Text>
          <Text style={[styles.statCardLabel, { color: 'rgba(255,255,255,0.8)' }]}>
            collections
          </Text>
        </View>
      </View>

      {/* What to Paint Next */}
      {nextUp && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            PAINT NEXT
          </Text>
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
                {nextUp.faction || 'No faction'} · {STATUS_LABELS[nextUp.status] || nextUp.status}
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
          style={[styles.secondaryAction, { borderColor: colors.border }]}
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
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            RECENT
          </Text>
          {recentItems.slice(0, 5).map((item) => (
            <Pressable
              key={item.id}
              style={[styles.recentItem, { borderBottomColor: colors.border }]}
              onPress={() => router.push(`/item/${item.id}`)}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(item.status) }
                ]}
              />
              <Text style={[styles.recentItemName, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Empty State */}
      {!itemsLoading && recentItems.length === 0 && (
        <View style={styles.emptyState}>
          <FontAwesome name="inbox" size={48} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Your vault is empty
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Add your first miniature to get started
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'painted': return '#10b981';
    case 'based': return '#8b5cf6';
    case 'primed': return '#6366f1';
    case 'assembled': return '#f59e0b';
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
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  headerLeft: {
    backgroundColor: 'transparent',
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
  },
  greeting: {
    fontSize: 14,
    marginTop: 2,
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 20,
    paddingVertical: 24,
    borderRadius: 16,
  },
  heroIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heroNumber: {
    fontSize: 72,
    fontWeight: '700',
    letterSpacing: -2,
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  progressSection: {
    marginHorizontal: 24,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: '700',
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
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statCardIcon: {
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  statCardNumber: {
    fontSize: 32,
    fontWeight: '700',
  },
  statCardLabel: {
    fontSize: 12,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 32,
    backgroundColor: 'transparent',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  nextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    overflow: 'hidden',
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
    padding: 14,
    borderRadius: 12,
    gap: 8,
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
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
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
});
