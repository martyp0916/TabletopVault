import { StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useState } from 'react';

const GAME_COLORS: Record<string, string> = {
  'Warhammer 40K': '#3b82f6',
  'Age of Sigmar': '#f59e0b',
  'Star Wars Legion': '#ef4444',
  'Other': '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  'New in Box': 'Shame Pile',
  'Assembled': 'Built',
  'Primed': 'Primed',
  'Painted': 'Battle Ready',
  'Based': 'Parade Ready',
};

// Mock item data
const MOCK_ITEMS: Record<string, any> = {
  '1': {
    id: '1',
    name: 'Primaris Intercessors',
    game: 'Warhammer 40K',
    faction: 'Space Marines',
    status: 'Painted',
    quantity: 10,
    purchasePrice: 60,
    currentValue: 55,
    purchaseDate: '2024-06-15',
    notes: 'Base coated with Macragge Blue. Edge highlighted with Fenrisian Grey. Based with Astrogranite Debris.',
  },
  '101': {
    id: '101',
    name: 'Primaris Captain',
    game: 'Warhammer 40K',
    faction: 'Ultramarines',
    status: 'Painted',
    quantity: 1,
    purchasePrice: 35,
    currentValue: 40,
    purchaseDate: '2024-03-10',
    notes: 'Painted in classic Ultramarines scheme. Won best painted at local tournament.',
  },
  '102': {
    id: '102',
    name: 'Intercessor Squad',
    game: 'Warhammer 40K',
    faction: 'Ultramarines',
    status: 'Painted',
    quantity: 10,
    purchasePrice: 60,
    currentValue: 55,
    purchaseDate: '2024-04-20',
    notes: 'Standard battle line troops. Mix of bolt rifles and auto bolt rifles.',
  },
};

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const item = MOCK_ITEMS[id as string] || MOCK_ITEMS['1'];
  const gameColor = GAME_COLORS[item.game] || GAME_COLORS['Other'];
  const statusColor = getStatusColor(item.status);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Details</Text>
        <Pressable onPress={() => setIsDarkMode(!isDarkMode)}>
          <FontAwesome name={isDarkMode ? 'sun-o' : 'moon-o'} size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Photo Placeholder */}
        <View style={[styles.photoSection, { backgroundColor: colors.card }]}>
          <FontAwesome name="image" size={48} color={colors.textSecondary} />
          <Text style={[styles.photoText, { color: colors.textSecondary }]}>No photo yet</Text>
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
          <View style={styles.tagsRow}>
            <View style={[styles.gameTag, { backgroundColor: gameColor + '20' }]}>
              <Text style={[styles.tagText, { color: gameColor }]}>{item.game}</Text>
            </View>
            <View style={[styles.statusTag, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.tagText, { color: statusColor }]}>
                {STATUS_LABELS[item.status] || item.status}
              </Text>
            </View>
          </View>
          <Text style={[styles.faction, { color: colors.textSecondary }]}>{item.faction}</Text>
        </View>

        {/* Quick Stats */}
        <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{item.quantity}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Quantity</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>${item.purchasePrice}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Paid</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10b981' }]}>${item.currentValue}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Value</Text>
          </View>
        </View>

        {/* Details List */}
        <View style={styles.detailsSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DETAILS</Text>

          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status</Text>
            <Text style={[styles.detailValue, { color: statusColor }]}>
              {STATUS_LABELS[item.status] || item.status}
            </Text>
          </View>

          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Game System</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{item.game}</Text>
          </View>

          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Faction</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{item.faction}</Text>
          </View>

          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Purchase Date</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{item.purchaseDate}</Text>
          </View>
        </View>

        {/* Notes */}
        {item.notes && (
          <View style={styles.notesSection}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>NOTES</Text>
            <Text style={[styles.notesText, { color: colors.text }]}>{item.notes}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Pressable style={[styles.editButton, { backgroundColor: colors.text }]}>
            <FontAwesome name="pencil" size={16} color={colors.background} />
            <Text style={[styles.editButtonText, { color: colors.background }]}>Edit Item</Text>
          </Pressable>
          <Pressable style={[styles.deleteButton, { borderColor: '#ef4444' }]}>
            <FontAwesome name="trash" size={16} color="#ef4444" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </Pressable>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  photoSection: {
    height: 200,
    margin: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoText: {
    marginTop: 8,
    fontSize: 14,
  },
  titleSection: {
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  itemName: {
    fontSize: 28,
    fontWeight: '700',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    backgroundColor: 'transparent',
  },
  gameTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  faction: {
    fontSize: 15,
    marginTop: 8,
  },
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 24,
    padding: 20,
    borderRadius: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  detailsSection: {
    paddingHorizontal: 20,
    marginTop: 28,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    backgroundColor: 'transparent',
  },
  detailLabel: {
    fontSize: 15,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  notesSection: {
    paddingHorizontal: 20,
    marginTop: 28,
    backgroundColor: 'transparent',
  },
  notesText: {
    fontSize: 15,
    lineHeight: 22,
  },
  actionsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 32,
    gap: 12,
    backgroundColor: 'transparent',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    backgroundColor: 'transparent',
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
});
