import { StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text, View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useItemStats, useRecentItems } from '@/hooks/useItems';
import { GAME_COLORS, STATUS_LABELS, GAME_SYSTEM_LABELS, GameSystem, ItemStatus } from '@/types/database';

// Map database values to display values
const getGameDisplayName = (game: GameSystem): string => {
  return GAME_SYSTEM_LABELS[game] || 'Other';
};

const getStatusDisplayName = (status: ItemStatus): string => {
  return STATUS_LABELS[status] || status;
};

export default function HomeScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const { user } = useAuth();
  const { stats, loading: statsLoading } = useItemStats(user?.id);
  const { items: recentItems, loading: itemsLoading } = useRecentItems(user?.id, 5);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={[styles.logo, { color: colors.text }]}>Vault</Text>
          <Pressable onPress={() => setIsDarkMode(!isDarkMode)}>
            <FontAwesome
              name={isDarkMode ? 'sun-o' : 'moon-o'}
              size={22}
              color={colors.text}
            />
          </Pressable>
        </View>
        <Text style={[styles.greeting, { color: colors.textSecondary }]}>
          Ready to paint, Battle Brother?
        </Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: colors.text }]}>
            {statsLoading ? '-' : stats.total}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>total</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: '#10b981' }]}>
            {statsLoading ? '-' : stats.battleReady}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>battle ready</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: '#ef4444' }]}>
            {statsLoading ? '-' : stats.shamePile}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>shame pile</Text>
        </View>
      </View>

      {/* On The Table - Current WIP */}
      {recentItems.length > 0 && recentItems.find(i => i.status === 'assembled' || i.status === 'primed') && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ON THE TABLE</Text>
          {(() => {
            const wipItem = recentItems.find(i => i.status === 'assembled' || i.status === 'primed');
            if (!wipItem) return null;
            const gameColor = GAME_COLORS[wipItem.game_system] || GAME_COLORS.other;
            return (
              <Pressable
                style={[styles.wipCard, { borderLeftColor: gameColor }]}
                onPress={() => router.push(`/item/${wipItem.id}`)}
              >
                <View style={styles.wipHeader}>
                  <Text style={[styles.wipName, { color: colors.text }]}>{wipItem.name}</Text>
                  <View style={[styles.gameTag, { backgroundColor: gameColor + '20' }]}>
                    <Text style={[styles.gameTagText, { color: gameColor }]}>
                      {wipItem.game_system === 'wh40k' ? '40K' :
                       wipItem.game_system === 'aos' ? 'AoS' :
                       wipItem.game_system === 'legion' ? 'Legion' : 'Other'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.wipFaction, { color: colors.textSecondary }]}>
                  {wipItem.faction || 'No faction'}
                </Text>
                <View style={styles.wipFooter}>
                  <Text style={[styles.wipStatus, { color: colors.textSecondary }]}>
                    {getStatusDisplayName(wipItem.status)}
                  </Text>
                </View>
              </Pressable>
            );
          })()}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.text }]}
          onPress={() => router.push('/(tabs)/add')}
        >
          <Text style={[styles.actionButtonText, { color: colors.background }]}>+ Add to pile</Text>
        </Pressable>
        <Pressable
          style={styles.actionLink}
          onPress={() => router.push('/(tabs)/collections')}
        >
          <Text style={[styles.actionLinkText, { color: colors.text }]}>View armory →</Text>
        </Pressable>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>RECENT ACTIVITY</Text>

        {itemsLoading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : recentItems.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No items yet. Add your first miniature!
          </Text>
        ) : (
          recentItems.map((item, index) => (
            <Pressable
              key={item.id}
              style={[
                styles.listItem,
                index !== recentItems.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border
                }
              ]}
              onPress={() => router.push(`/item/${item.id}`)}
            >
              {/* Game color indicator */}
              <View style={[styles.gameIndicator, { backgroundColor: GAME_COLORS[item.game_system] || GAME_COLORS.other }]} />

              <View style={styles.listItemContent}>
                <View style={styles.listItemTop}>
                  <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.itemStatus, { color: getStatusColor(item.status) }]}>
                    {getStatusDisplayName(item.status)}
                  </Text>
                </View>
                <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                  {item.faction || 'No faction'}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </View>

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
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: 'transparent',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  logo: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -1,
  },
  greeting: {
    fontSize: 15,
    marginTop: 4,
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    marginTop: 16,
    backgroundColor: 'transparent',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 24,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  wipCard: {
    paddingVertical: 16,
    paddingLeft: 16,
    borderLeftWidth: 4,
    backgroundColor: 'transparent',
  },
  wipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'transparent',
  },
  wipName: {
    fontSize: 20,
    fontWeight: '600',
  },
  gameTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  gameTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  wipFaction: {
    fontSize: 14,
    marginTop: 4,
  },
  wipFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    backgroundColor: 'transparent',
  },
  wipStatus: {
    fontSize: 13,
  },
  wipDays: {
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 28,
    gap: 16,
    backgroundColor: 'transparent',
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionLink: {
    paddingVertical: 12,
  },
  actionLinkText: {
    fontSize: 15,
    fontWeight: '500',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: 'transparent',
  },
  gameIndicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: 12,
  },
  listItemContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  listItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});
