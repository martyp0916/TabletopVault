import { StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Text, View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useItem, useItems } from '@/hooks/useItems';
import { ItemStatus } from '@/types/database';

export default function EditItemScreen() {
  const { id } = useLocalSearchParams();
  const { isDarkMode, toggleTheme } = useTheme();
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const { user } = useAuth();
  const { item, loading: itemLoading } = useItem(id as string);
  const { updateItem } = useItems(user?.id);

  // Form state
  const [name, setName] = useState('');
  const [faction, setFaction] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Status counts
  const [nibCount, setNibCount] = useState('0');
  const [assembledCount, setAssembledCount] = useState('0');
  const [primedCount, setPrimedCount] = useState('0');
  const [paintedCount, setPaintedCount] = useState('0');
  const [basedCount, setBasedCount] = useState('0');

  // Populate form with existing item data
  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setFaction(item.faction || '');
      setQuantity(String(item.quantity || 1));
      setNotes(item.notes || '');
      setNibCount(String(item.nib_count || 0));
      setAssembledCount(String(item.assembled_count || 0));
      setPrimedCount(String(item.primed_count || 0));
      setPaintedCount(String(item.painted_count || 0));
      setBasedCount(String(item.based_count || 0));
    }
  }, [item]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for the item');
      return;
    }

    setSaving(true);

    // Parse status counts
    const nib = parseInt(nibCount) || 0;
    const assembled = parseInt(assembledCount) || 0;
    const primed = parseInt(primedCount) || 0;
    const painted = parseInt(paintedCount) || 0;
    const based = parseInt(basedCount) || 0;

    // Derive overall status from counts (highest progress level with models)
    let derivedStatus: ItemStatus = 'nib';
    if (based > 0) derivedStatus = 'based';
    else if (painted > 0) derivedStatus = 'painted';
    else if (primed > 0) derivedStatus = 'primed';
    else if (assembled > 0) derivedStatus = 'assembled';

    const { error } = await updateItem(id as string, {
      name: name.trim(),
      faction: faction.trim() || null,
      quantity: parseInt(quantity) || 1,
      status: derivedStatus,
      nib_count: nib,
      assembled_count: assembled,
      primed_count: primed,
      painted_count: painted,
      based_count: based,
      notes: notes.trim() || null,
    });

    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    Alert.alert('Success', 'Item updated!', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  if (itemLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Item not found</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#991b1b' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Item</Text>
        <Pressable onPress={toggleTheme}>
          <FontAwesome name={isDarkMode ? 'sun-o' : 'moon-o'} size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={{ backgroundColor: colors.background }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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

          {/* Quantity */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Models per Box</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="1"
              placeholderTextColor={colors.textSecondary}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
            />
          </View>

          {/* Status Counts */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Status Breakdown</Text>
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              How many models are in each stage?
            </Text>

            <View style={styles.statusCountsContainer}>
              {/* New in Box */}
              <View style={styles.statusCountRow}>
                <View style={[styles.statusDot, { backgroundColor: '#6b7280' }]} />
                <Text style={[styles.statusCountLabel, { color: colors.text }]}>New in Box</Text>
                <TextInput
                  style={[styles.statusCountInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={nibCount}
                  onChangeText={setNibCount}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Assembled */}
              <View style={styles.statusCountRow}>
                <View style={[styles.statusDot, { backgroundColor: '#f59e0b' }]} />
                <Text style={[styles.statusCountLabel, { color: colors.text }]}>Assembled</Text>
                <TextInput
                  style={[styles.statusCountInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={assembledCount}
                  onChangeText={setAssembledCount}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Primed */}
              <View style={styles.statusCountRow}>
                <View style={[styles.statusDot, { backgroundColor: '#6366f1' }]} />
                <Text style={[styles.statusCountLabel, { color: colors.text }]}>Primed</Text>
                <TextInput
                  style={[styles.statusCountInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={primedCount}
                  onChangeText={setPrimedCount}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Painted */}
              <View style={styles.statusCountRow}>
                <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
                <Text style={[styles.statusCountLabel, { color: colors.text }]}>Painted</Text>
                <TextInput
                  style={[styles.statusCountInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={paintedCount}
                  onChangeText={setPaintedCount}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
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
          <Pressable
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <FontAwesome name="check" size={18} color="#fff" />
                <Text style={styles.submitText}>Save Changes</Text>
              </>
            )}
          </Pressable>
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
  helperText: {
    fontSize: 13,
    marginBottom: 12,
  },
  statusCountsContainer: {
    gap: 10,
    backgroundColor: 'transparent',
  },
  statusCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusCountLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  statusCountInput: {
    width: 60,
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
    textAlign: 'center',
    borderWidth: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#991b1b',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
