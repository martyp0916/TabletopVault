import { StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, Image, ActionSheetIOS, Platform, KeyboardAvoidingView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { usePremium } from '@/lib/premium';
import { useCollections } from '@/hooks/useCollections';
import { useItems } from '@/hooks/useItems';
import { GameSystem, ItemStatus } from '@/types/database';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

function getGameSystemFromName(name: string): GameSystem {
  const nameMap: Record<string, GameSystem> = {
    'Warhammer 40K': 'wh40k',
    'Warhammer 40K: Kill Team': 'wh40k',
    'Warhammer Age of Sigmar': 'aos',
    'Warhammer Horus Heresy': 'wh40k',
    'Horus Heresy': 'wh40k',
    'Star Wars Legion': 'legion',
    'Star Wars Shatterpoint': 'legion',
    'Battle Tech': 'other',
    'Bolt Action': 'other',
    'Dropfleet Commander': 'other',
    'Dropzone Commander': 'other',
    'Dystopian Wars': 'other',
    'Fallout Wasteland Warfare': 'other',
    'Halo Flashpoint': 'other',
    'Kings of War': 'other',
    'Marvel Crisis Protocol': 'other',
    'Warmachine': 'other',
  };
  return nameMap[name] || 'other';
}

export default function AddScreen() {
  const insets = useSafeAreaInsets();
  const { collectionId } = useLocalSearchParams<{ collectionId?: string }>();
  const { isDarkMode, toggleTheme, backgroundImageUrl } = useTheme();
  const colors = isDarkMode ? Colors.dark : Colors.light;
  const hasBackground = !!backgroundImageUrl;

  const { user } = useAuth();
  const { isPremium, showUpgradePrompt } = usePremium();
  const { collections, loading: collectionsLoading } = useCollections(user?.id, isPremium);
  const { createItem } = useItems(user?.id, undefined, isPremium);

  // Form state
  const [name, setName] = useState('');
  const [faction, setFaction] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCollectionDropdown, setShowCollectionDropdown] = useState(false);

  // Status counts
  const [nibCount, setNibCount] = useState('0');
  const [assembledCount, setAssembledCount] = useState('0');
  const [primedCount, setPrimedCount] = useState('0');
  const [paintedCount, setPaintedCount] = useState('0');
  const [basedCount, setBasedCount] = useState('0');

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
      // Get file extension from URI (handle query params)
      const uriWithoutParams = selectedImage.split('?')[0];
      const fileExt = uriWithoutParams.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/${itemId}/${Date.now()}.${fileExt}`;

      // Fetch the image and convert to arrayBuffer
      const response = await fetch(selectedImage);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('item-images')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
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


  // Auto-select collection: use passed collectionId if provided, otherwise default to first
  useEffect(() => {
    if (collections.length > 0) {
      if (collectionId && collections.some(c => c.id === collectionId)) {
        // If coming from a collection page, always use that collection
        setSelectedCollection(collectionId);
      } else if (!selectedCollection) {
        // If no collection selected yet, default to first
        setSelectedCollection(collections[0].id);
      }
    }
  }, [collections, collectionId]);

  const resetForm = () => {
    setName('');
    setFaction('');
    setQuantity('1');
    setNotes('');
    setSelectedImage(null);
    setNibCount('0');
    setAssembledCount('0');
    setPrimedCount('0');
    setPaintedCount('0');
    setBasedCount('0');
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

    // Check if collection is locked
    const selectedCol = collections.find(c => c.id === selectedCollection);
    if (selectedCol?.is_locked) {
      Alert.alert('Collection Locked', 'This collection is locked. Unlock it from the collection page to add items.');
      return;
    }

    setSaving(true);

    // Derive game system from collection name (selectedCol already defined above)
    const derivedGameSystem = getGameSystemFromName(selectedCol?.name || '');

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

    const result = await createItem({
      collection_id: selectedCollection,
      name: name.trim(),
      game_system: derivedGameSystem,
      faction: faction.trim() || undefined,
      quantity: parseInt(quantity) || 1,
      status: derivedStatus,
      nib_count: nib,
      assembled_count: assembled,
      primed_count: primed,
      painted_count: painted,
      based_count: based,
      notes: notes.trim() || undefined,
    });

    if (result.error) {
      setSaving(false);
      // Check if this is a premium limit error
      if (result.error.message === 'LIMIT_REACHED' && 'limitType' in result) {
        showUpgradePrompt('items');
        return;
      }
      Alert.alert('Error', result.error.message);
      return;
    }

    const newItem = result.data;

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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: hasBackground ? 'transparent' : colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <View style={[styles.headerTitleArea, hasBackground && { backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 }]}>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Add New</Text>
            <Text style={[styles.title, { color: colors.text }]}>Item</Text>
          </View>
          <Pressable
            style={[styles.themeToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={toggleTheme}
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
      <View style={[styles.form, hasBackground && { backgroundColor: colors.card, marginHorizontal: 24, borderRadius: 12, marginTop: 16 }]}>
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
            <>
              <Pressable
                style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowCollectionDropdown(!showCollectionDropdown)}
              >
                <View style={styles.dropdownSelectedContent}>
                  {(() => {
                    const col = collections.find(c => c.id === selectedCollection);
                    return (
                      <>
                        {col?.is_locked && (
                          <FontAwesome name="lock" size={12} color={colors.textSecondary} style={{ marginRight: 8 }} />
                        )}
                        <Text style={[
                          styles.dropdownText,
                          { color: col?.is_locked ? colors.textSecondary : (selectedCollection ? colors.text : colors.textSecondary) }
                        ]}>
                          {selectedCollection
                            ? (col?.description
                                ? `${col.description} (${col.name})`
                                : col?.name)
                            : 'Select a collection...'}
                        </Text>
                      </>
                    );
                  })()}
                </View>
                <FontAwesome
                  name={showCollectionDropdown ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.textSecondary}
                />
              </Pressable>

              {showCollectionDropdown && (
                <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    {collections.map((col) => (
                      <Pressable
                        key={col.id}
                        style={[
                          styles.dropdownItem,
                          selectedCollection === col.id && styles.dropdownItemSelected,
                          { borderBottomColor: colors.border }
                        ]}
                        onPress={() => {
                          if (col.is_locked) {
                            Alert.alert('Collection Locked', 'This collection is locked. Unlock it from the collection page to add items.');
                            return;
                          }
                          setSelectedCollection(col.id);
                          setShowCollectionDropdown(false);
                        }}
                      >
                        <View style={styles.dropdownItemContent}>
                          {col.is_locked && (
                            <FontAwesome name="lock" size={12} color={colors.textSecondary} style={{ marginRight: 8 }} />
                          )}
                          <Text style={[
                            styles.dropdownItemText,
                            { color: col.is_locked ? colors.textSecondary : (selectedCollection === col.id ? '#991b1b' : colors.text) }
                          ]}>
                            {col.description ? `${col.description} (${col.name})` : col.name}
                          </Text>
                        </View>
                        {selectedCollection === col.id && !col.is_locked && (
                          <FontAwesome name="check" size={14} color="#991b1b" />
                        )}
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
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
              <View style={[styles.statusDot, { backgroundColor: '#991b1b' }]} />
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
              <Text style={styles.submitText}>Add to Collection</Text>
            </>
          )}
        </Pressable>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'painted': return '#10b981';
    case 'primed': return '#6366f1';
    case 'assembled': return '#991b1b';
    case 'based': return '#ec4899';
    case 'nib': return '#6b7280';
    default: return '#6b7280';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 200,
  },
  header: {
    padding: 24,
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
    backgroundColor: '#991b1b',
    padding: 18,
    borderRadius: 16,
    gap: 10,
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  dropdownSelectedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownText: {
    fontSize: 16,
  },
  dropdownList: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  dropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownItemText: {
    fontSize: 16,
  },
});
