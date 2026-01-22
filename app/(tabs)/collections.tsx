import { StyleSheet, ScrollView, Pressable, Dimensions, ActivityIndicator, TextInput, Modal, RefreshControl, Image, ActionSheetIOS, Platform, Alert } from 'react-native';
import { Text, View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useCollections } from '@/hooks/useCollections';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
const GAME_LIST = [
  'Battle Tech',
  'Bolt Action',
  'Halo Flashpoint',
  'Horus Heresy',
  'Marvel Crisis Protocol',
  'Star Wars Legion',
  'Star Wars Shatterpoint',
  'Warhammer 40K',
  'Warhammer 40K: Kill Team',
  'Warhammer Age of Sigmar',
];

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 12) / 2;

// Colors for collections (cycle through these) - darker, more dramatic palette
const COLLECTION_COLORS = [
  '#991b1b', // Crimson
  '#7c3aed', // Purple
  '#0891b2', // Cyan/teal
  '#b45309', // Amber/bronze
  '#059669', // Emerald
  '#be185d', // Magenta
  '#4338ca', // Indigo
  '#65a30d', // Lime
  '#c2410c', // Orange
  '#6d28d9', // Violet
];

export default function CollectionsScreen() {
  const { isDarkMode, toggleTheme, backgroundImageUrl } = useTheme();
  const hasBackground = !!backgroundImageUrl;
  const [showModal, setShowModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});

  const colors = isDarkMode ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const { collections, loading, createCollection, updateCollection, refresh } = useCollections(user?.id);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [coverImageUrls, setCoverImageUrls] = useState<Record<string, string>>({});

  // Fetch item counts for each collection
  const fetchCounts = useCallback(async () => {
    if (collections.length > 0) {
      const counts: Record<string, number> = {};
      for (const col of collections) {
        const { count } = await supabase
          .from('items')
          .select('*', { count: 'exact', head: true })
          .eq('collection_id', col.id);
        counts[col.id] = count || 0;
      }
      setItemCounts(counts);
    }
  }, [collections]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Fetch signed URLs for collection cover images
  const fetchCoverImages = useCallback(async () => {
    if (collections.length > 0) {
      const urls: Record<string, string> = {};
      for (const col of collections) {
        if (col.cover_image_url) {
          const { data: signedUrlData } = await supabase.storage
            .from('collection-images')
            .createSignedUrl(col.cover_image_url, 3600);
          if (signedUrlData?.signedUrl) {
            urls[col.id] = signedUrlData.signedUrl;
          }
        }
      }
      setCoverImageUrls(urls);
    }
  }, [collections]);

  useEffect(() => {
    fetchCoverImages();
  }, [fetchCoverImages]);

  // Refresh data when screen comes into focus (e.g., returning from edit)
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  const pickImage = async (useCamera: boolean) => {
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
          aspect: [1, 1],
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
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
      Alert.alert('Add Cover Image', 'Choose an option', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => pickImage(true) },
        { text: 'Choose from Library', onPress: () => pickImage(false) },
      ]);
    }
  };

  const uploadCoverImage = async (collectionId: string): Promise<string | null> => {
    if (!selectedImage || !user) return null;

    try {
      // Get file extension from URI (handle query params)
      const uriWithoutParams = selectedImage.split('?')[0];
      const fileExt = uriWithoutParams.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/${collectionId}/${Date.now()}.${fileExt}`;

      // Fetch the image and convert to arrayBuffer
      const response = await fetch(selectedImage);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('collection-images')
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    await fetchCounts();
    await fetchCoverImages();
    setRefreshing(false);
  }, [refresh, fetchCounts, fetchCoverImages]);

  const handleCreateCollection = async () => {
    if (!selectedGame) return;

    setCreating(true);
    const { data: newCollection, error } = await createCollection(selectedGame, newDescription.trim() || undefined);

    if (error) {
      setCreating(false);
      Alert.alert('Error', error.message);
      return;
    }

    // Upload cover image if selected
    let needsCoverImageRefresh = false;
    if (selectedImage && newCollection) {
      const imagePath = await uploadCoverImage(newCollection.id);
      if (imagePath) {
        await updateCollection(newCollection.id, { cover_image_url: imagePath });
        needsCoverImageRefresh = true;
      }
    }

    // Reset form and close modal
    setCreating(false);
    setShowModal(false);
    setSelectedGame('');
    setNewDescription('');
    setSelectedImage(null);

    // Refresh everything after modal closes to ensure state is updated
    if (needsCoverImageRefresh) {
      // Small delay to let React process the state updates
      setTimeout(async () => {
        await refresh();
        // Fetch cover images directly from the database
        const { data: freshCollections } = await supabase
          .from('collections')
          .select('id, cover_image_url')
          .not('cover_image_url', 'is', null);

        if (freshCollections) {
          const urls: Record<string, string> = {};
          for (const col of freshCollections) {
            if (col.cover_image_url) {
              const { data: signedUrlData } = await supabase.storage
                .from('collection-images')
                .createSignedUrl(col.cover_image_url, 3600);
              if (signedUrlData?.signedUrl) {
                urls[col.id] = signedUrlData.signedUrl;
              }
            }
          }
          setCoverImageUrls(urls);
        }
      }, 100);
    }
  };

  const getCollectionColor = (index: number) => {
    return COLLECTION_COLORS[index % COLLECTION_COLORS.length];
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: hasBackground ? 'transparent' : colors.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.textSecondary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleArea}>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Organize Your</Text>
            <Text style={[styles.title, { color: colors.text }]}>Collections</Text>
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

      {/* Add New Collection Button */}
      <Pressable
        style={[styles.addButton, { borderColor: colors.border }]}
        onPress={() => setShowModal(true)}
      >
        <FontAwesome name="plus" size={20} color={colors.textSecondary} />
        <Text style={[styles.addButtonText, { color: colors.textSecondary }]}>
          New Collection
        </Text>
      </Pressable>

      {/* Collections Grid */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : collections.length === 0 ? (
        <View style={styles.emptyState}>
          <FontAwesome name="folder-open-o" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No collections yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Create your first collection to organize your miniatures
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {collections.map((collection, index) => (
            <Pressable
              key={collection.id}
              style={[styles.card, { backgroundColor: colors.card }]}
              onPress={() => router.push(`/collection/${collection.id}`)}
            >
              {/* Cover Image or Color Banner */}
              {coverImageUrls[collection.id] ? (
                <Image
                  source={{ uri: coverImageUrls[collection.id] }}
                  style={[styles.cardBannerImage, { backgroundColor: colors.card }]}
                  resizeMode="contain"
                />
              ) : (
                <View style={[styles.cardBanner, { backgroundColor: getCollectionColor(index) }]}>
                  <FontAwesome name="folder" size={32} color="rgba(255,255,255,0.9)" />
                </View>
              )}

              {/* Card Content */}
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                  {collection.name}
                </Text>
                <Text style={[styles.cardGame, { color: colors.textSecondary }]} numberOfLines={1}>
                  {collection.description || 'No description'}
                </Text>
                <View style={styles.cardFooter}>
                  <View style={styles.itemCount}>
                    <FontAwesome name="cube" size={12} color={colors.textSecondary} />
                    <Text style={[styles.itemCountText, { color: colors.textSecondary }]}>
                      {itemCounts[collection.id] ?? 0} items
                    </Text>
                  </View>
                  <FontAwesome name="chevron-right" size={12} color={colors.textSecondary} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* Create Collection Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => { setShowModal(false); setShowDropdown(false); setSelectedImage(null); }}>
              <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Collection</Text>
            <Pressable onPress={handleCreateCollection} disabled={creating || !selectedGame}>
              <Text style={[
                styles.modalSave,
                { color: selectedGame ? '#991b1b' : colors.textSecondary }
              ]}>
                {creating ? 'Saving...' : 'Save'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Game</Text>
              <Pressable
                style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowDropdown(!showDropdown)}
              >
                <Text style={[
                  styles.dropdownText,
                  { color: selectedGame ? colors.text : colors.textSecondary }
                ]}>
                  {selectedGame || 'Select a game...'}
                </Text>
                <FontAwesome
                  name={showDropdown ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.textSecondary}
                />
              </Pressable>

              {showDropdown && (
                <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    {GAME_LIST.map((game) => (
                      <Pressable
                        key={game}
                        style={[
                          styles.dropdownItem,
                          selectedGame === game && styles.dropdownItemSelected,
                          { borderBottomColor: colors.border }
                        ]}
                        onPress={() => {
                          setSelectedGame(game);
                          setShowDropdown(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          { color: selectedGame === game ? '#991b1b' : colors.text }
                        ]}>
                          {game}
                        </Text>
                        {selectedGame === game && (
                          <FontAwesome name="check" size={14} color="#991b1b" />
                        )}
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Cover Image Picker */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Cover Image (optional)</Text>
              <Pressable
                style={[styles.imagePicker, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={showImageOptions}
              >
                {selectedImage ? (
                  <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                ) : (
                  <>
                    <FontAwesome name="image" size={24} color={colors.textSecondary} />
                    <Text style={[styles.imagePickerText, { color: colors.textSecondary }]}>
                      Add faction logo or photo
                    </Text>
                  </>
                )}
              </Pressable>
              {selectedImage && (
                <Pressable
                  style={styles.removeImageButton}
                  onPress={() => setSelectedImage(null)}
                >
                  <Text style={styles.removeImageText}>Remove Image</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="What's this collection for?"
                placeholderTextColor={colors.textSecondary}
                value={newDescription}
                onChangeText={setNewDescription}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 8,
    backgroundColor: 'transparent',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 12,
    backgroundColor: 'transparent',
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardBanner: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBannerImage: {
    width: '100%',
    height: 120,
  },
  cardContent: {
    padding: 12,
    backgroundColor: 'transparent',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardGame: {
    fontSize: 13,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    backgroundColor: 'transparent',
  },
  itemCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
  },
  itemCountText: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
    backgroundColor: 'transparent',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
    backgroundColor: 'transparent',
  },
  modalCancel: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    padding: 24,
    gap: 20,
    backgroundColor: 'transparent',
  },
  inputGroup: {
    gap: 8,
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
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
    maxHeight: 250,
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
  dropdownItemText: {
    fontSize: 16,
  },
  input: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    height: 100,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  imagePicker: {
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imagePickerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  removeImageButton: {
    alignSelf: 'center',
    marginTop: 8,
    padding: 8,
  },
  removeImageText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
});
