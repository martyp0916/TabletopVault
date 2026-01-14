import { StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Text, View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useCollection } from '@/hooks/useCollections';
import { useItems } from '@/hooks/useItems';
import { GAME_COLORS, STATUS_LABELS, GameSystem, ItemStatus } from '@/types/database';

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const { user } = useAuth();
  const { collection, loading: collectionLoading } = useCollection(id as string);
  const { items, loading: itemsLoading, deleteItem } = useItems(user?.id, id as string);

  const loading = collectionLoading || itemsLoading;

  // Calculate stats
  const battleReadyCount = items.filter(i => i.status === 'painted' || i.status === 'based').length;
  const inProgressCount = items.filter(i => i.status === 'assembled' || i.status === 'primed').length;
  const shamePileCount = items.filter(i => i.status === 'nib').length;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!collection) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Collection not found</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#3b82f6' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {collection.name}
          </Text>
        </View>
        <Pressable onPress={() => setIsDarkMode(!isDarkMode)}>
          <FontAwesome name={isDarkMode ? 'sun-o' : 'moon-o'} size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Collection Info */}
        <View style={styles.infoSection}>
          <View style={[styles.colorBar, { backgroundColor: '#3b82f6' }]} />
          <View style={styles.infoContent}>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {collection.description || 'No description'}
            </Text>
            <Text style={[styles.itemCount, { color: colors.text }]}>
              {items.length} items
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: '#10b981' }]}>
              {battleReadyCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Battle Ready</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: '#f59e0b' }]}>
              {inProgressCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>In Progress</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: '#ef4444' }]}>
              {shamePileCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Shame Pile</Text>
          </View>
        </View>

        {/* Items List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ITEMS</Text>
            <Pressable onPress={() => router.push('/(tabs)/add')}>
              <Text style={[styles.addText, { color: '#3b82f6' }]}>+ Add</Text>
            </Pressable>
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome name="cube" size={32} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No items yet. Add your first miniature!
              </Text>
            </View>
          ) : (
            items.map((item, index) => (
              <Pressable
                key={item.id}
                style={[
                  styles.itemRow,
                  index !== items.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
                onPress={() => router.push(`/item/${item.id}`)}
              >
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.itemFaction, { color: colors.textSecondary }]}>
                    {item.faction || 'No faction'}
                  </Text>
                </View>
                <Text style={[styles.itemStatus, { color: getStatusColor(item.status) }]}>
                  {STATUS_LABELS[item.status] || item.status}
                </Text>
              </Pressable>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
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
  centered: {
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
  infoSection: {
    flexDirection: 'row',
    margin: 20,
    backgroundColor: 'transparent',
  },
  colorBar: {
    width: 4,
    borderRadius: 2,
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  itemCount: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 16,
    backgroundColor: 'transparent',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  addText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: 'transparent',
  },
  emptyText: {
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: 'transparent',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemFaction: {
    fontSize: 13,
    marginTop: 2,
  },
  itemStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
});
