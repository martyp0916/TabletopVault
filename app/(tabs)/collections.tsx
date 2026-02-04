import { StyleSheet, ScrollView, Pressable, Dimensions, ActivityIndicator, TextInput, Modal, RefreshControl, Image, ActionSheetIOS, Platform, Alert, View, KeyboardAvoidingView } from 'react-native';
import { Text } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { usePremium } from '@/lib/premium';
import { useCollections } from '@/hooks/useCollections';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Collection, Item } from '@/types/database';
const GAME_LIST = [
  'Battle Tech',
  'Bolt Action',
  'Dropfleet Commander',
  'Dropzone Commander',
  'Dystopian Wars',
  'Fallout Wasteland Warfare',
  'Halo Flashpoint',
  'Horus Heresy',
  'Kings of War',
  'Marvel Crisis Protocol',
  'Star Wars Legion',
  'Star Wars Shatterpoint',
  'Warmachine',
  'Warhammer 40K',
  'Warhammer 40K: Kill Team',
  'Warhammer Age of Sigmar',
];

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 12) / 2;

// Colors for collections (cycle through these) - cool, modern palette
const COLLECTION_COLORS = [
  '#991b1b', // Crimson (primary)
  '#b91c1c', // Light crimson
  '#7f1d1d', // Dark crimson
  '#dc2626', // Red
  '#7c3aed', // Violet
  '#6366f1', // Indigo
  '#2563eb', // Blue
  '#059669', // Emerald
  '#d97706', // Amber
  '#9333ea', // Purple
];

export default function CollectionsScreen() {
  const { isDarkMode, toggleTheme, backgroundImageUrl } = useTheme();
  const hasBackground = !!backgroundImageUrl;
  const [showModal, setShowModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState('');
  const [customGameName, setCustomGameName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});

  const colors = isDarkMode ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const { isPremium, showUpgradePrompt } = usePremium();
  const { collections, loading, createCollection, updateCollection, refresh, reorderCollections } = useCollections(user?.id, isPremium);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [coverImageUrls, setCoverImageUrls] = useState<Record<string, string>>({});

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<(Item & { collectionName: string })[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [selectedItemCollections, setSelectedItemCollections] = useState<{ item: Item; collections: Collection[] }| null>(null);

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

  // Search for items by name
  const searchItems = useCallback(async (query: string) => {
    if (!query.trim() || !user?.id) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const { data: items, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .ilike('name', `%${query.trim()}%`)
        .limit(20);

      if (error) {
        console.error('Search error:', error);
        setSearchResults([]);
        return;
      }

      // Add collection names to results
      const resultsWithCollections = (items || []).map((item: Item) => {
        const collection = collections.find(c => c.id === item.collection_id);
        return {
          ...item,
          collectionName: collection?.description || collection?.name || 'Unknown Collection',
        };
      });

      setSearchResults(resultsWithCollections);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [user?.id, collections]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchItems(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchItems]);

  // Handle search result tap
  const handleSearchResultTap = (item: Item & { collectionName: string }) => {
    // Find all collections that have an item with this exact name
    const matchingItems = searchResults.filter(r => r.name === item.name);

    if (matchingItems.length > 1) {
      // Item exists in multiple collections - show picker
      const uniqueCollectionIds = [...new Set(matchingItems.map(i => i.collection_id))];
      const matchingCollections = collections.filter(c => uniqueCollectionIds.includes(c.id));

      if (matchingCollections.length > 1) {
        setSelectedItemCollections({ item, collections: matchingCollections });
        setShowCollectionPicker(true);
        return;
      }
    }

    // Single collection - navigate directly
    setSearchQuery('');
    setSearchResults([]);
    router.push(`/collection/${item.collection_id}`);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

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
    const gameName = selectedGame === 'Other' ? customGameName.trim() : selectedGame;
    if (!gameName) return;

    setCreating(true);
    const result = await createCollection(gameName, newDescription.trim() || undefined);

    if (result.error) {
      setCreating(false);
      // Check if this is a premium limit error
      if (result.error.message === 'LIMIT_REACHED' && 'limitType' in result) {
        setShowModal(false);
        setSelectedGame('');
        setNewDescription('');
        setSelectedImage(null);
        showUpgradePrompt('collections');
        return;
      }
      Alert.alert('Error', result.error.message);
      return;
    }

    const newCollection = result.data;

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
    setCustomGameName('');
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

  const renderCollectionItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<Collection>) => {
    const index = getIndex() ?? 0;
    return (
      <ScaleDecorator>
        <Pressable
          style={[
            styles.listCard,
            { backgroundColor: colors.card },
            isActive && styles.cardDragging,
          ]}
          onPress={() => router.push(`/collection/${item.id}`)}
          onLongPress={drag}
          delayLongPress={200}
        >
          {/* Cover Image or Color Icon */}
          <View style={styles.listCardImage}>
            {coverImageUrls[item.id] ? (
              <Image
                source={{ uri: coverImageUrls[item.id] }}
                style={styles.listCardImageContent}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.listCardImagePlaceholder, { backgroundColor: getCollectionColor(index) }]}>
                <FontAwesome name="folder" size={24} color="rgba(255,255,255,0.9)" />
              </View>
            )}
          </View>

          {/* Card Content */}
          <View style={styles.listCardContent}>
            <View style={styles.listCardHeader}>
              <Text style={[styles.listCardTitle, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.listCardBadges}>
                {item.is_complete && (
                  <View style={[styles.statusBadge, { backgroundColor: '#10b981' }]}>
                    <FontAwesome name="check" size={10} color="#fff" />
                  </View>
                )}
                {item.is_locked && (
                  <View style={[styles.statusBadge, { backgroundColor: '#6b7280' }]}>
                    <FontAwesome name="lock" size={10} color="#fff" />
                  </View>
                )}
              </View>
            </View>
            <Text style={[styles.listCardDescription, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.description || 'No description'}
            </Text>
            <View style={styles.listCardFooter}>
              <View style={styles.itemCount}>
                <FontAwesome name="cube" size={12} color={colors.textSecondary} />
                <Text style={[styles.itemCountText, { color: colors.textSecondary }]}>
                  {itemCounts[item.id] ?? 0} items
                </Text>
              </View>
            </View>
          </View>

          {/* Drag Handle */}
          <View style={styles.dragHandle}>
            <FontAwesome name="bars" size={16} color={colors.textSecondary} />
          </View>
        </Pressable>
      </ScaleDecorator>
    );
  }, [colors, coverImageUrls, itemCounts, getCollectionColor]);

  const ListHeader = () => (
    <>
      {/* Add New Collection Button */}
      {searchQuery.length === 0 && (
        <Pressable
          style={[styles.addButton, { borderColor: colors.border, backgroundColor: hasBackground ? colors.card : 'transparent' }]}
          onPress={() => setShowModal(true)}
        >
          <FontAwesome name="plus" size={20} color={colors.textSecondary} />
          <Text style={[styles.addButtonText, { color: colors.textSecondary }]}>
            New Collection
          </Text>
        </Pressable>
      )}

      {/* Drag hint */}
      {collections.length > 1 && searchQuery.length === 0 && (
        <Text style={[styles.dragHint, { color: colors.textSecondary }]}>
          Long press and drag to reorder
        </Text>
      )}
    </>
  );

  const ListEmpty = () => (
    <View style={[styles.emptyState, hasBackground && { backgroundColor: colors.card, marginHorizontal: 24, borderRadius: 12, paddingVertical: 40 }]}>
      <FontAwesome name="folder-open-o" size={48} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No collections yet</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        Create your first collection to organize your miniatures
      </Text>
    </View>
  );

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: hasBackground ? 'transparent' : colors.background }]}>
      {/* Fixed Header with Search */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={[styles.headerTitleArea, hasBackground && { backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 }]}>
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

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <FontAwesome name="search" size={16} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search items..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={clearSearch} style={styles.clearButton}>
            <FontAwesome name="times-circle" size={16} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Search Results */}
      {searchQuery.length > 0 && (
        <View style={[styles.searchResults, { backgroundColor: colors.card }]}>
          {isSearching ? (
            <View style={styles.searchLoading}>
              <ActivityIndicator size="small" color={colors.textSecondary} />
              <Text style={[styles.searchLoadingText, { color: colors.textSecondary }]}>Searching...</Text>
            </View>
          ) : searchResults.length === 0 ? (
            <View style={styles.searchEmpty}>
              <FontAwesome name="search" size={20} color={colors.textSecondary} />
              <Text style={[styles.searchEmptyText, { color: colors.textSecondary }]}>
                No items found for "{searchQuery}"
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.searchResultsList}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {searchResults.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.searchResultItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleSearchResultTap(item)}
                >
                  <View style={styles.searchResultContent}>
                    <Text style={[styles.searchResultName, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.searchResultCollection, { color: colors.textSecondary }]} numberOfLines={1}>
                      {item.collectionName}
                    </Text>
                  </View>
                  <FontAwesome name="chevron-right" size={12} color={colors.textSecondary} />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Collections List */}
      {loading ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.textSecondary}
            />
          }
        >
          <ListHeader />
          <ActivityIndicator style={{ marginTop: 40 }} />
        </ScrollView>
      ) : (
        <DraggableFlatList
          data={collections}
          keyExtractor={(item) => item.id}
          renderItem={renderCollectionItem}
          onDragEnd={({ data }) => reorderCollections(data)}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          containerStyle={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.textSecondary}
            />
          }
        />
      )}

      {/* Collection Picker Modal (for items in multiple collections) */}
      <Modal
        visible={showCollectionPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCollectionPicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={[styles.pickerModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.pickerModalHeader}>
              <Text style={[styles.pickerModalTitle, { color: colors.text }]}>
                Select Collection
              </Text>
              <Pressable onPress={() => setShowCollectionPicker(false)}>
                <FontAwesome name="times" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={[styles.pickerModalSubtitle, { color: colors.textSecondary }]}>
              "{selectedItemCollections?.item.name}" exists in multiple collections
            </Text>
            <ScrollView style={styles.pickerList}>
              {selectedItemCollections?.collections.map((collection) => (
                <Pressable
                  key={collection.id}
                  style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setShowCollectionPicker(false);
                    setSearchQuery('');
                    setSearchResults([]);
                    router.push(`/collection/${collection.id}`);
                  }}
                >
                  <View style={styles.pickerItemContent}>
                    <Text style={[styles.pickerItemName, { color: colors.text }]}>
                      {collection.description || collection.name}
                    </Text>
                    <Text style={[styles.pickerItemGame, { color: colors.textSecondary }]}>
                      {collection.name}
                    </Text>
                  </View>
                  <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create Collection Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.modalHeader}>
            <Pressable onPress={() => { setShowModal(false); setShowDropdown(false); setSelectedImage(null); setCustomGameName(''); }}>
              <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Collection</Text>
            <Pressable onPress={handleCreateCollection} disabled={creating || (!selectedGame || (selectedGame === 'Other' && !customGameName.trim()))}>
              <Text style={[
                styles.modalSave,
                { color: (selectedGame && (selectedGame !== 'Other' || customGameName.trim())) ? '#991b1b' : colors.textSecondary }
              ]}>
                {creating ? 'Saving...' : 'Save'}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
                  {selectedGame === 'Other' && customGameName.trim()
                    ? customGameName.trim()
                    : (selectedGame || 'Select a game...')}
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
                          setCustomGameName('');
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
                    {/* Other option */}
                    <Pressable
                      style={[
                        styles.dropdownItem,
                        selectedGame === 'Other' && styles.dropdownItemSelected,
                        { borderBottomColor: colors.border }
                      ]}
                      onPress={() => {
                        setSelectedGame('Other');
                        setShowDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        { color: selectedGame === 'Other' ? '#991b1b' : colors.text }
                      ]}>
                        Other (type your own)
                      </Text>
                      {selectedGame === 'Other' && (
                        <FontAwesome name="check" size={14} color="#991b1b" />
                      )}
                    </Pressable>
                  </ScrollView>
                </View>
              )}

              {/* Custom game input when Other is selected */}
              {selectedGame === 'Other' && (
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, marginTop: 8 }]}
                  placeholder="Enter game name..."
                  placeholderTextColor={colors.textSecondary}
                  value={customGameName}
                  onChangeText={setCustomGameName}
                  autoFocus
                />
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
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 60,
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
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 10,
    backgroundColor: 'transparent',
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: '700',
  },
  dragHint: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 12,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  listCardImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
  },
  listCardImageContent: {
    width: '100%',
    height: '100%',
  },
  listCardImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  listCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  listCardBadges: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 8,
  },
  listCardDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  listCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  dragHandle: {
    padding: 8,
    marginLeft: 8,
  },
  cardDragging: {
    opacity: 0.95,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardBannerWrapper: {
    position: 'relative',
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
  statusBadges: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
  statusBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
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
    flex: 1,
    backgroundColor: 'transparent',
  },
  modalContentContainer: {
    padding: 24,
    gap: 20,
    paddingBottom: 40,
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
  // Search styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  searchResults: {
    marginHorizontal: 24,
    marginBottom: 12,
    borderRadius: 12,
    maxHeight: 300,
    overflow: 'hidden',
  },
  searchResultsList: {
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
  },
  searchResultContent: {
    flex: 1,
    marginRight: 12,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600',
  },
  searchResultCollection: {
    fontSize: 13,
    marginTop: 2,
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  searchLoadingText: {
    fontSize: 14,
  },
  searchEmpty: {
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  searchEmptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Collection Picker Modal styles
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '60%',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pickerModalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  pickerModalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  pickerList: {
    maxHeight: 300,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  pickerItemContent: {
    flex: 1,
    marginRight: 12,
  },
  pickerItemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerItemGame: {
    fontSize: 13,
    marginTop: 2,
  },
});
