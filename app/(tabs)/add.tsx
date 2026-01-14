import { StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, Image, ActionSheetIOS, Platform } from 'react-native';
import { Text, View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useCollections } from '@/hooks/useCollections';
import { useItems } from '@/hooks/useItems';
import { GameSystem, ItemStatus, GAME_SYSTEM_LABELS, STATUS_LABELS } from '@/types/database';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

const GAME_SYSTEMS: { value: GameSystem; label: string }[] = [
  { value: 'wh40k', label: 'Warhammer 40K' },
  { value: 'aos', label: 'Age of Sigmar' },
  { value: 'legion', label: 'Star Wars Legion' },
  { value: 'other', label: 'Other' },
];

const STATUSES: { value: ItemStatus; label: string }[] = [
  { value: 'nib', label: 'New in Box' },
  { value: 'assembled', label: 'Assembled' },
  { value: 'primed', label: 'Primed' },
  { value: 'painted', label: 'Painted' },
  { value: 'based', label: 'Based' },
];

export default function AddScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const { user } = useAuth();
  const { collections, loading: collectionsLoading } = useCollections(user?.id);
  const { createItem } = useItems(user?.id);

  // Form state
  const [name, setName] = useState('');
  const [gameSystem, setGameSystem] = useState<GameSystem | ''>('');
  const [faction, setFaction] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [status, setStatus] = useState<ItemStatus | ''>('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const pickImage = async (useCamera: boolean) => {
    // Request permissions
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos.');
        return;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library permission is required to select photos.');
        return;
      }
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickImage(true);
          if (buttonIndex === 2) pickImage(false);
        }
      );
    } else {
      Alert.alert('Add Photo', 'Choose an option', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => pickImage(true) },
        { text: 'Choose from Library', onPress: () => pickImage(false) },
      ]);
    }
  };

  const uploadImage = async (itemId: string): Promise<string | null> => {
    if (!selectedImage || !user) return null;

    try {
      const response = await fetch(selectedImage);
      const blob = await response.blob();

      const fileExt = selectedImage.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/${itemId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('item-images')
        .upload(fileName, blob, {
          contentType: `image/${fileExt}`,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      return fileName;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  // Auto-select first collection
  useEffect(() => {
    if (collections.length > 0 && !selectedCollection) {
      setSelectedCollection(collections[0].id);
    }
  }, [collections]);

  const resetForm = () => {
    setName('');
    setGameSystem('');
    setFaction('');
    setQuantity('1');
    setStatus('');
    setPrice('');
    setNotes('');
    setSelectedImage(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for the item');
      return;
    }

    if (!selectedCollection) {
      Alert.alert('Error', 'Please select a collection first. Create one in the Collections tab.');
      return;
    }

    if (!gameSystem) {
      Alert.alert('Error', 'Please select a game system');
      return;
    }

    setSaving(true);

    const { data: newItem, error } = await createItem({
      collection_id: selectedCollection,
      name: name.trim(),
      game_system: gameSystem,
      faction: faction.trim() || undefined,
      quantity: parseInt(quantity) || 1,
      status: status || 'nib',
      purchase_price: price ? parseFloat(price.replace('$', '')) : undefined,
      notes: notes.trim() || undefined,
    });

    if (error) {
      setSaving(false);
      Alert.alert('Error', error.message);
      return;
    }

    // Upload image if selected
    if (selectedImage && newItem) {
      const imagePath = await uploadImage(newItem.id);
      if (imagePath) {
        // Save image reference to item_images table
        await supabase.from('item_images').insert({
          item_id: newItem.id,
          image_url: imagePath,
          is_primary: true,
        });
      }
    }

    setSaving(false);

    Alert.alert('Success', 'Item added to your collection!', [
      { text: 'Add Another', onPress: resetForm },
      { text: 'View Collection', onPress: () => router.push(`/collection/${selectedCollection}`) },
    ]);
    resetForm();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
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
      <Pressable
        style={[styles.photoSection, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={showImageOptions}
      >
        {selectedImage ? (
          <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
        ) : (
          <>
            <FontAwesome name="camera" size={32} color={colors.textSecondary} />
            <Text style={[styles.photoText, { color: colors.textSecondary }]}>Add Photo</Text>
          </>
        )}
      </Pressable>
      {selectedImage && (
        <Pressable
          style={styles.removePhotoButton}
          onPress={() => setSelectedImage(null)}
        >
          <Text style={styles.removePhotoText}>Remove Photo</Text>
        </Pressable>
      )}

      {/* Form Fields */}
      <View style={styles.form}>
        {/* Collection Picker */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Collection *</Text>
          {collectionsLoading ? (
            <ActivityIndicator />
          ) : collections.length === 0 ? (
            <Pressable
              style={[styles.createCollectionBtn, { borderColor: colors.border }]}
              onPress={() => router.push('/(tabs)/collections')}
            >
              <FontAwesome name="plus" size={16} color={colors.textSecondary} />
              <Text style={[styles.createCollectionText, { color: colors.textSecondary }]}>
                Create a collection first
              </Text>
            </Pressable>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipContainer}>
                {collections.map((col) => (
                  <Pressable
                    key={col.id}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selectedCollection === col.id ? '#374151' : colors.card,
                        borderColor: selectedCollection === col.id ? '#374151' : colors.border,
                      }
                    ]}
                    onPress={() => setSelectedCollection(col.id)}
                  >
                    <Text style={[
                      styles.chipText,
                      { color: selectedCollection === col.id ? '#fff' : colors.text }
                    ]}>
                      {col.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

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
                key={game.value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: gameSystem === game.value ? '#374151' : colors.card,
                    borderColor: gameSystem === game.value ? '#374151' : colors.border,
                  }
                ]}
                onPress={() => setGameSystem(game.value)}
              >
                <Text style={[
                  styles.chipText,
                  { color: gameSystem === game.value ? '#fff' : colors.text }
                ]}>
                  {game.label}
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
                key={s.value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: status === s.value ? getStatusColor(s.value) : colors.card,
                    borderColor: status === s.value ? getStatusColor(s.value) : colors.border,
                  }
                ]}
                onPress={() => setStatus(s.value)}
              >
                <Text style={[
                  styles.chipText,
                  { color: status === s.value ? '#fff' : colors.text }
                ]}>
                  {s.label}
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
              <Text style={styles.submitText}>Add to Collection</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Bottom Spacing */}
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'painted': return '#10b981';
    case 'primed': return '#6366f1';
    case 'assembled': return '#f59e0b';
    case 'based': return '#ec4899';
    case 'nib': return '#6b7280';
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
  selectedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  removePhotoButton: {
    alignSelf: 'center',
    marginTop: 8,
    padding: 8,
  },
  removePhotoText: {
    color: '#ef4444',
    fontSize: 14,
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
  createCollectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 8,
  },
  createCollectionText: {
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
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
