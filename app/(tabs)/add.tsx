import { StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { Text, View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useState } from 'react';

const GAME_SYSTEMS = ['Warhammer 40K', 'Age of Sigmar', 'Star Wars Legion', 'Other'];
const STATUSES = ['New in Box', 'Assembled', 'Primed', 'Painted', 'Based'];

export default function AddScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  // Form state
  const [name, setName] = useState('');
  const [gameSystem, setGameSystem] = useState('');
  const [faction, setFaction] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [status, setStatus] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleArea}>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Add New</Text>
            <Text style={[styles.title, { color: colors.text }]}>Item</Text>
          </View>
          <Pressable
            style={[styles.themeToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setIsDarkMode(!isDarkMode)}
          >
            <FontAwesome
              name={isDarkMode ? 'sun-o' : 'moon-o'}
              size={20}
              color={colors.text}
            />
          </Pressable>
        </View>
      </View>

      {/* Photo Section */}
      <Pressable style={[styles.photoSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <FontAwesome name="camera" size={32} color={colors.textSecondary} />
        <Text style={[styles.photoText, { color: colors.textSecondary }]}>Add Photo</Text>
      </Pressable>

      {/* Form Fields */}
      <View style={styles.form}>
        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            placeholder="e.g., Primaris Intercessors"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Game System */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Game System *</Text>
          <View style={styles.chipContainer}>
            {GAME_SYSTEMS.map((game) => (
              <Pressable
                key={game}
                style={[
                  styles.chip,
                  {
                    backgroundColor: gameSystem === game ? '#374151' : colors.card,
                    borderColor: gameSystem === game ? '#374151' : colors.border,
                  }
                ]}
                onPress={() => setGameSystem(game)}
              >
                <Text style={[
                  styles.chipText,
                  { color: gameSystem === game ? '#fff' : colors.text }
                ]}>
                  {game}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Faction */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Faction</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            placeholder="e.g., Space Marines, Necrons"
            placeholderTextColor={colors.textSecondary}
            value={faction}
            onChangeText={setFaction}
          />
        </View>

        {/* Quantity & Price Row */}
        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.text }]}>Quantity</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="1"
              placeholderTextColor={colors.textSecondary}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.text }]}>Price Paid</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="$0.00"
              placeholderTextColor={colors.textSecondary}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Status */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Status</Text>
          <View style={styles.chipContainer}>
            {STATUSES.map((s) => (
              <Pressable
                key={s}
                style={[
                  styles.chip,
                  {
                    backgroundColor: status === s ? getStatusColor(s) : colors.card,
                    borderColor: status === s ? getStatusColor(s) : colors.border,
                  }
                ]}
                onPress={() => setStatus(s)}
              >
                <Text style={[
                  styles.chipText,
                  { color: status === s ? '#fff' : colors.text }
                ]}>
                  {s}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            placeholder="Any additional notes..."
            placeholderTextColor={colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <Pressable style={styles.submitButton}>
          <FontAwesome name="check" size={18} color="#fff" />
          <Text style={styles.submitText}>Add to Collection</Text>
        </Pressable>
      </View>

      {/* Bottom Spacing */}
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'Painted': return '#10b981';
    case 'Primed': return '#6366f1';
    case 'Assembled': return '#f59e0b';
    case 'Based': return '#ec4899';
    case 'New in Box': return '#6b7280';
    default: return '#6b7280';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 16,
    backgroundColor: 'transparent',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
  },
  headerTitleArea: {
    backgroundColor: 'transparent',
  },
  themeToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  subtitle: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4,
  },
  photoSection: {
    marginHorizontal: 24,
    height: 150,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoText: {
    fontSize: 16,
    fontWeight: '500',
  },
  form: {
    padding: 24,
    paddingTop: 20,
    backgroundColor: 'transparent',
  },
  fieldGroup: {
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    height: 100,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'transparent',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: 'transparent',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
