import { StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useState } from 'react';

// Game system colors
const GAME_COLORS: Record<string, string> = {
  'Warhammer 40K': '#3b82f6',  // Blue
  'Age of Sigmar': '#f59e0b',   // Gold
  'Star Wars Legion': '#ef4444', // Red
  'Other': '#6b7280',
};

// Hobby status labels
const STATUS_LABELS: Record<string, string> = {
  'New in Box': 'Shame Pile',
  'Assembled': 'Built',
  'Primed': 'Primed',
  'Painted': 'Battle Ready',
  'Based': 'Parade Ready',
};

// Mock data
const MOCK_STATS = {
  totalItems: 127,
  shameCount: 43,
  battleReady: 34,
};

const MOCK_ON_TABLE = {
  name: 'Leviathan Dreadnought',
  faction: 'Blood Angels',
  game: 'Warhammer 40K',
  status: 'Primed',
  daysOnTable: 12,
};

const MOCK_RECENT_ITEMS = [
  { id: '1', name: 'Primaris Intercessors', game: 'Warhammer 40K', status: 'Painted', faction: 'Space Marines' },
  { id: '2', name: 'Stormcast Eternals', game: 'Age of Sigmar', status: 'Primed', faction: 'Hammers of Sigmar' },
  { id: '3', name: 'Rebel Troopers', game: 'Star Wars Legion', status: 'Assembled', faction: 'Rebel Alliance' },
  { id: '4', name: 'Necron Warriors', game: 'Warhammer 40K', status: 'New in Box', faction: 'Szarekhan' },
];

export default function HomeScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const colors = isDarkMode ? Colors.dark : Colors.light;

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
          <Text style={[styles.statNumber, { color: colors.text }]}>{MOCK_STATS.totalItems}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>total</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: '#10b981' }]}>{MOCK_STATS.battleReady}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>battle ready</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: '#ef4444' }]}>{MOCK_STATS.shameCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>shame pile</Text>
        </View>
      </View>

      {/* On The Table - Current WIP */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ON THE TABLE</Text>
        <View style={[styles.wipCard, { borderLeftColor: GAME_COLORS[MOCK_ON_TABLE.game] }]}>
          <View style={styles.wipHeader}>
            <Text style={[styles.wipName, { color: colors.text }]}>{MOCK_ON_TABLE.name}</Text>
            <View style={[styles.gameTag, { backgroundColor: GAME_COLORS[MOCK_ON_TABLE.game] + '20' }]}>
              <Text style={[styles.gameTagText, { color: GAME_COLORS[MOCK_ON_TABLE.game] }]}>
                {MOCK_ON_TABLE.game === 'Warhammer 40K' ? '40K' :
                 MOCK_ON_TABLE.game === 'Age of Sigmar' ? 'AoS' :
                 MOCK_ON_TABLE.game === 'Star Wars Legion' ? 'Legion' : 'Other'}
              </Text>
            </View>
          </View>
          <Text style={[styles.wipFaction, { color: colors.textSecondary }]}>
            {MOCK_ON_TABLE.faction}
          </Text>
          <View style={styles.wipFooter}>
            <Text style={[styles.wipStatus, { color: colors.textSecondary }]}>
              {STATUS_LABELS[MOCK_ON_TABLE.status] || MOCK_ON_TABLE.status}
            </Text>
            <Text style={[styles.wipDays, { color: colors.textSecondary }]}>
              {MOCK_ON_TABLE.daysOnTable} days
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actions}>
        <Pressable style={[styles.actionButton, { backgroundColor: colors.text }]}>
          <Text style={[styles.actionButtonText, { color: colors.background }]}>+ Add to pile</Text>
        </Pressable>
        <Pressable style={styles.actionLink}>
          <Text style={[styles.actionLinkText, { color: colors.text }]}>View armory →</Text>
        </Pressable>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>RECENT ACTIVITY</Text>

        {MOCK_RECENT_ITEMS.map((item, index) => (
          <Pressable
            key={item.id}
            style={[
              styles.listItem,
              index !== MOCK_RECENT_ITEMS.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: colors.border
              }
            ]}
          >
            {/* Game color indicator */}
            <View style={[styles.gameIndicator, { backgroundColor: GAME_COLORS[item.game] }]} />

            <View style={styles.listItemContent}>
              <View style={styles.listItemTop}>
                <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.itemStatus, { color: getStatusColor(item.status) }]}>
                  {STATUS_LABELS[item.status] || item.status}
                </Text>
              </View>
              <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                {item.faction}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Bottom Spacing */}
      <View style={{ height: 120 }} />
    </ScrollView>
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
});
