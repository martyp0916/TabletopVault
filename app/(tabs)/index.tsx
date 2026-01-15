import { StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { Text, View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useItemStats, useRecentItems } from '@/hooks/useItems';
import { GAME_COLORS, STATUS_LABELS, GameSystem, ItemStatus } from '@/types/database';

export default function HomeScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const { user } = useAuth();
  const { stats, loading: statsLoading, refresh: refreshStats } = useItemStats(user?.id);
  const { items: recentItems, loading: itemsLoading, refresh: refreshItems } = useRecentItems(user?.id, 10);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshStats(), refreshItems()]);
    setRefreshing(false);
  }, [refreshStats, refreshItems]);

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
      {/* Minimal Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setIsDarkMode(!isDarkMode)}>
          <FontAwesome
            name={isDarkMode ? 'sun-o' : 'moon-o'}
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>

      {/* Hero Shame Pile */}
      <View style={styles.heroSection}>
        <Text style={[styles.heroNumber, { color: colors.text }]}>
          {statsLoading ? '—' : stats.shamePile}
        </Text>
        <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>
          unpainted
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
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
          {paintProgress}% painted
        </Text>
      </View>

      {/* Quick Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statCardNumber, { color: colors.text }]}>
            {statsLoading ? '-' : stats.total}
          </Text>
          <Text style={[styles.statCardLabel, { color: colors.textSecondary }]}>
            total
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statCardNumber, { color: '#10b981' }]}>
            {statsLoading ? '-' : stats.battleReady}
          </Text>
          <Text style={[styles.statCardLabel, { color: colors.textSecondary }]}>
            ready
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

      {/* Bottom Spacing */}
      <View style={{ height: 120 }} />
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
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: 'transparent',
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  heroNumber: {
    fontSize: 96,
    fontWeight: '200',
    letterSpacing: -4,
  },
  heroLabel: {
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: -8,
  },
  progressSection: {
    paddingHorizontal: 48,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  progressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 13,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginTop: 32,
    backgroundColor: 'transparent',
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statCardNumber: {
    fontSize: 28,
    fontWeight: '600',
  },
  statCardLabel: {
    fontSize: 12,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
