import { StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useState } from 'react';

// Game system colors
const GAME_COLORS: Record<string, string> = {
  'Warhammer 40K': '#3b82f6',
  'Age of Sigmar': '#f59e0b',
  'Star Wars Legion': '#ef4444',
  'Mixed': '#8b5cf6',
  'Other': '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  'New in Box': 'Shame Pile',
  'Assembled': 'Built',
  'Primed': 'Primed',
  'Painted': 'Battle Ready',
  'Based': 'Parade Ready',
};

// Mock collection data
const MOCK_COLLECTIONS: Record<string, any> = {
  '1': {
    id: '1',
    name: 'Space Marines',
    game: 'Warhammer 40K',
    description: 'My Ultramarines 2nd Company',
    itemCount: 47,
    items: [
      { id: '101', name: 'Primaris Captain', status: 'Painted', faction: 'Ultramarines' },
      { id: '102', name: 'Intercessor Squad', status: 'Painted', faction: 'Ultramarines' },
      { id: '103', name: 'Redemptor Dreadnought', status: 'Primed', faction: 'Ultramarines' },
      { id: '104', name: 'Bladeguard Veterans', status: 'Assembled', faction: 'Ultramarines' },
      { id: '105', name: 'Eradicator Squad', status: 'New in Box', faction: 'Ultramarines' },
    ],
  },
  '2': {
    id: '2',
    name: 'Stormcast Eternals',
    game: 'Age of Sigmar',
    description: 'Hammers of Sigmar Strike Chamber',
    itemCount: 32,
    items: [
      { id: '201', name: 'Lord-Celestant', status: 'Painted', faction: 'Hammers of Sigmar' },
      { id: '202', name: 'Liberators', status: 'Primed', faction: 'Hammers of Sigmar' },
      { id: '203', name: 'Prosecutors', status: 'Assembled', faction: 'Hammers of Sigmar' },
    ],
  },
};

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const collection = MOCK_COLLECTIONS[id as string] || MOCK_COLLECTIONS['1'];
  const gameColor = GAME_COLORS[collection.game] || GAME_COLORS['Other'];

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
          <View style={[styles.gameTag, { backgroundColor: gameColor + '20' }]}>
            <Text style={[styles.gameTagText, { color: gameColor }]}>
              {collection.game}
            </Text>
          </View>
        </View>
        <Pressable onPress={() => setIsDarkMode(!isDarkMode)}>
          <FontAwesome name={isDarkMode ? 'sun-o' : 'moon-o'} size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Collection Info */}
        <View style={styles.infoSection}>
          <View style={[styles.colorBar, { backgroundColor: gameColor }]} />
          <View style={styles.infoContent}>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {collection.description}
            </Text>
            <Text style={[styles.itemCount, { color: colors.text }]}>
              {collection.itemCount} items
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: '#10b981' }]}>
              {collection.items.filter((i: any) => i.status === 'Painted').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Battle Ready</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: '#f59e0b' }]}>
              {collection.items.filter((i: any) => i.status === 'Assembled' || i.status === 'Primed').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>In Progress</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: '#ef4444' }]}>
              {collection.items.filter((i: any) => i.status === 'New in Box').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Shame Pile</Text>
          </View>
        </View>

        {/* Items List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ITEMS</Text>
            <Pressable>
              <Text style={[styles.addText, { color: gameColor }]}>+ Add</Text>
            </Pressable>
          </View>

          {collection.items.map((item: any, index: number) => (
            <Pressable
              key={item.id}
              style={[
                styles.itemRow,
                index !== collection.items.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => router.push(`/item/${item.id}`)}
            >
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.itemFaction, { color: colors.textSecondary }]}>{item.faction}</Text>
              </View>
              <Text style={[styles.itemStatus, { color: getStatusColor(item.status) }]}>
                {STATUS_LABELS[item.status] || item.status}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'Painted': return '#10b981';
    case 'Based': return '#8b5cf6';
    case 'Primed': return '#6366f1';
    case 'Assembled': return '#f59e0b';
    case 'New in Box': return '#ef4444';
    default: return '#9ca3af';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  gameTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  gameTagText: {
    fontSize: 11,
    fontWeight: '600',
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
