import { StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, RefreshControl, Image, View, ActionSheetIOS, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { usePremium } from '@/lib/premium';
import { useCollection, useCollections } from '@/hooks/useCollections';
import { useItems } from '@/hooks/useItems';
import { supabase } from '@/lib/supabase';
import { GAME_COLORS, STATUS_LABELS, GameSystem, ItemStatus, getEffectiveStatus, Item } from '@/types/database';
import { exportToPDF, ExportCollection } from '@/lib/exportData';

// Map of item IDs to their primary photo URLs
type ItemPhotoMap = Record<string, string>;

export default function CollectionDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const { isDarkMode, toggleTheme } = useTheme();
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const { user } = useAuth();
  const { isPremium, showUpgradePrompt } = usePremium();
  const { collection, loading: collectionLoading, refresh: refreshCollection } = useCollection(id as string);
  const { items, loading: itemsLoading, deleteItem, refresh: refreshItems } = useItems(user?.id, id as string);
  const { deleteCollection, updateCollection } = useCollections(user?.id, isPremium);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [itemPhotos, setItemPhotos] = useState<ItemPhotoMap>({});
  const [togglingComplete, setTogglingComplete] = useState(false);
  const [togglingLock, setTogglingLock] = useState(false);
  const [sortOption, setSortOption] = useState<'name' | 'status' | 'date'>('name');
  const [exporting, setExporting] = useState(false);

  const loading = collectionLoading || itemsLoading;

  // Fetch cover image signed URL
  const fetchCoverImage = useCallback(async () => {
    if (collection?.cover_image_url) {
      const { data: signedUrlData } = await supabase.storage
        .from('collection-images')
        .createSignedUrl(collection.cover_image_url, 3600);
      if (signedUrlData?.signedUrl) {
        setCoverImageUrl(signedUrlData.signedUrl);
      }
    } else {
      setCoverImageUrl(null);
    }
  }, [collection]);

  useEffect(() => {
    fetchCoverImage();
  }, [fetchCoverImage]);

  // Fetch primary photos for all items
  const fetchItemPhotos = useCallback(async () => {
    if (items.length === 0) return;

    const itemIds = items.map(item => item.id);

    // Get primary images for all items in this collection
    const { data: images, error } = await supabase
      .from('item_images')
      .select('item_id, image_url')
      .in('item_id', itemIds)
      .eq('is_primary', true);

    if (error || !images) return;

    // Get signed URLs for all images
    const photoMap: ItemPhotoMap = {};
    await Promise.all(
      images.map(async (img) => {
        const { data: signedUrlData } = await supabase.storage
          .from('item-images')
          .createSignedUrl(img.image_url, 3600);
        if (signedUrlData?.signedUrl) {
          photoMap[img.item_id] = signedUrlData.signedUrl;
        }
      })
    );

    setItemPhotos(photoMap);
  }, [items]);

  useEffect(() => {
    fetchItemPhotos();
  }, [fetchItemPhotos]);

  const handleDeleteCollection = () => {
    if (collection?.is_locked) {
      Alert.alert('Collection Locked', 'Unlock this collection before deleting it.');
      return;
    }

    Alert.alert(
      'Delete Collection',
      `Are you sure you want to delete "${collection?.name}"? All items in this collection will also be deleted. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const { error } = await deleteCollection(id as string);
            if (error) {
              Alert.alert('Error', error.message);
              setDeleting(false);
            } else {
              router.back();
            }
          },
        },
      ]
    );
  };

  const handleToggleComplete = async () => {
    if (!collection) return;
    setTogglingComplete(true);
    const { error } = await updateCollection(id as string, { is_complete: !collection.is_complete });
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      await refreshCollection();
    }
    setTogglingComplete(false);
  };

  const handleToggleLock = async () => {
    if (!collection) return;

    if (collection.is_locked) {
      // Unlocking - confirm first
      Alert.alert(
        'Unlock Collection',
        'This will allow additions and deletions to this collection. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unlock',
            onPress: async () => {
              setTogglingLock(true);
              const { error } = await updateCollection(id as string, { is_locked: false });
              if (error) {
                Alert.alert('Error', error.message);
              } else {
                await refreshCollection();
              }
              setTogglingLock(false);
            },
          },
        ]
      );
    } else {
      // Locking
      setTogglingLock(true);
      const { error } = await updateCollection(id as string, { is_locked: true });
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        await refreshCollection();
      }
      setTogglingLock(false);
    }
  };

  const handleAddItem = () => {
    if (collection?.is_locked) {
      Alert.alert('Collection Locked', 'Unlock this collection to add items.');
      return;
    }
    router.push(`/(tabs)/add?collectionId=${id}`);
  };

  const handleExportCollection = async () => {
    if (!collection) return;

    // Check premium status
    if (!isPremium) {
      showUpgradePrompt('export');
      return;
    }

    setExporting(true);

    try {
      const exportData: ExportCollection[] = [{
        ...collection,
        items: items,
      }];

      const collectionName = collection.description || collection.name;
      const sanitizedName = collectionName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-');

      await exportToPDF(exportData, collectionName, sanitizedName);
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'There was an error exporting this collection. Please try again.');
    }

    setExporting(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshCollection(), refreshItems(), fetchCoverImage()]);
    // Item photos will refresh via useEffect when items change
    setRefreshing(false);
  }, [refreshCollection, refreshItems, fetchCoverImage]);

  // Calculate stats from status counts
  const nibTotal = items.reduce((sum, i) => sum + (i.nib_count || 0), 0);
  const assembledTotal = items.reduce((sum, i) => sum + (i.assembled_count || 0), 0);
  const primedTotal = items.reduce((sum, i) => sum + (i.primed_count || 0), 0);
  const paintedTotal = items.reduce((sum, i) => sum + (i.painted_count || 0), 0);

  // Calculate progress
  const totalModels = nibTotal + assembledTotal + primedTotal + paintedTotal;
  const progressPercentage = totalModels > 0 ? Math.round((paintedTotal / totalModels) * 100) : 0;

  // Sort items based on selected option
  const sortedItems = [...items].sort((a, b) => {
    switch (sortOption) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'status': {
        // Sort by painting progress (most painted first)
        const statusOrder: Record<string, number> = {
          'painted': 0,
          'based': 1,
          'primed': 2,
          'assembled': 3,
          'wip': 4,
          'nib': 5,
        };
        const aStatus = getEffectiveStatus(a);
        const bStatus = getEffectiveStatus(b);
        return (statusOrder[aStatus] ?? 6) - (statusOrder[bStatus] ?? 6);
      }
      case 'date':
        // Most recently added first
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

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
          <Text style={{ color: '#991b1b' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {collection.name}
            </Text>
            {collection.is_locked && (
              <View style={[styles.statusBadge, { backgroundColor: '#6b7280' }]}>
                <FontAwesome name="lock" size={10} color="#fff" />
              </View>
            )}
            {collection.is_complete && (
              <View style={[styles.statusBadge, { backgroundColor: '#10b981' }]}>
                <FontAwesome name="check" size={10} color="#fff" />
              </View>
            )}
          </View>
        </View>
        <Pressable onPress={toggleTheme}>
          <FontAwesome name={isDarkMode ? 'sun-o' : 'moon-o'} size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={{ backgroundColor: colors.background }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.textSecondary}
          />
        }
      >
        {/* Cover Image */}
        {coverImageUrl && (
          <View style={[styles.coverImageContainer, { backgroundColor: colors.card }]}>
            <Image
              source={{ uri: coverImageUrl }}
              style={styles.coverImage}
              resizeMode="contain"
            />
          </View>
        )}

        {/* Collection Info */}
        <View style={styles.infoSection}>
          <View style={[styles.colorBar, { backgroundColor: '#991b1b' }]} />
          <View style={styles.infoContent}>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {collection.description || 'No description'}
            </Text>
            <Text style={[styles.itemCount, { color: colors.text }]}>
              {items.length} items
            </Text>
          </View>
        </View>

        {/* Progress Card */}
        <View style={[styles.progressCard, { backgroundColor: isDarkMode ? '#333333' : '#ffffff', borderColor: isDarkMode ? '#4a4a4a' : '#d4d4d4' }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: colors.text }]}>Painting Progress</Text>
            <Text style={[styles.progressPercent, { color: progressPercentage === 100 ? '#10b981' : '#991b1b' }]}>
              {progressPercentage}%
            </Text>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: isDarkMode ? '#404040' : '#e5e5e5' }]}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercentage}%`, backgroundColor: progressPercentage === 100 ? '#10b981' : '#991b1b' },
              ]}
            />
          </View>
          <Text style={[styles.progressSubtext, { color: colors.textSecondary }]}>
            {paintedTotal}/{totalModels} models painted
          </Text>

          {/* Status breakdown */}
          <View style={[styles.statusBreakdown, { borderTopColor: isDarkMode ? '#404040' : '#d4d4d4' }]}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDotSmall, { backgroundColor: '#ef4444' }]} />
              <Text style={[styles.statusCount, { color: colors.text }]}>{nibTotal}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Unbuilt</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDotSmall, { backgroundColor: '#991b1b' }]} />
              <Text style={[styles.statusCount, { color: colors.text }]}>{assembledTotal}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Built</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDotSmall, { backgroundColor: '#6366f1' }]} />
              <Text style={[styles.statusCount, { color: colors.text }]}>{primedTotal}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Primed</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDotSmall, { backgroundColor: '#10b981' }]} />
              <Text style={[styles.statusCount, { color: colors.text }]}>{paintedTotal}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Painted</Text>
            </View>
          </View>
        </View>

        {/* Items List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ITEMS</Text>
            <Pressable onPress={handleAddItem}>
              <Text style={[styles.addText, { color: collection.is_locked ? colors.textSecondary : '#991b1b' }]}>
                {collection.is_locked ? '' : '+ Add'}
              </Text>
            </Pressable>
          </View>

          {/* Sort Options */}
          {items.length > 1 && (
            <View style={styles.sortContainer}>
              <Text style={[styles.sortLabel, { color: colors.textSecondary }]}>Sort by:</Text>
              <View style={styles.sortButtons}>
                <Pressable
                  style={[
                    styles.sortButton,
                    sortOption === 'name' && styles.sortButtonActive,
                    { borderColor: sortOption === 'name' ? '#991b1b' : colors.border }
                  ]}
                  onPress={() => setSortOption('name')}
                >
                  <FontAwesome name="sort-alpha-asc" size={12} color={sortOption === 'name' ? '#991b1b' : colors.textSecondary} />
                  <Text style={[styles.sortButtonText, { color: sortOption === 'name' ? '#991b1b' : colors.textSecondary }]}>
                    Name
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.sortButton,
                    sortOption === 'status' && styles.sortButtonActive,
                    { borderColor: sortOption === 'status' ? '#991b1b' : colors.border }
                  ]}
                  onPress={() => setSortOption('status')}
                >
                  <FontAwesome name="paint-brush" size={12} color={sortOption === 'status' ? '#991b1b' : colors.textSecondary} />
                  <Text style={[styles.sortButtonText, { color: sortOption === 'status' ? '#991b1b' : colors.textSecondary }]}>
                    Status
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.sortButton,
                    sortOption === 'date' && styles.sortButtonActive,
                    { borderColor: sortOption === 'date' ? '#991b1b' : colors.border }
                  ]}
                  onPress={() => setSortOption('date')}
                >
                  <FontAwesome name="calendar" size={12} color={sortOption === 'date' ? '#991b1b' : colors.textSecondary} />
                  <Text style={[styles.sortButtonText, { color: sortOption === 'date' ? '#991b1b' : colors.textSecondary }]}>
                    Date
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome name="cube" size={32} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No items yet. Add your first miniature!
              </Text>
            </View>
          ) : (
            sortedItems.map((item, index) => (
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
                {/* Item Photo */}
                {itemPhotos[item.id] ? (
                  <Image
                    source={{ uri: itemPhotos[item.id] }}
                    style={styles.itemPhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.itemPhotoPlaceholder, { backgroundColor: colors.card }]}>
                    <FontAwesome name="image" size={16} color={colors.textSecondary} />
                  </View>
                )}
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(getEffectiveStatus(item)) }]} />
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.itemFaction, { color: colors.textSecondary }]}>
                    {item.faction || 'No faction'}
                  </Text>
                  {item.notes && (
                    <Text style={[styles.itemNotes, { color: colors.textSecondary }]} numberOfLines={2}>
                      {item.notes}
                    </Text>
                  )}
                </View>
                <Text style={[styles.itemStatus, { color: getStatusColor(getEffectiveStatus(item)) }]}>
                  {STATUS_LABELS[getEffectiveStatus(item)]}
                </Text>
              </Pressable>
            ))
          )}
        </View>

        {/* Collection Status Toggles */}
        <View style={styles.statusTogglesSection}>
          <Pressable
            style={[
              styles.statusToggleButton,
              {
                backgroundColor: collection.is_complete ? '#10b981' : colors.card,
                borderColor: collection.is_complete ? '#10b981' : colors.border,
              },
            ]}
            onPress={handleToggleComplete}
            disabled={togglingComplete}
          >
            {togglingComplete ? (
              <ActivityIndicator color={collection.is_complete ? '#fff' : colors.text} size="small" />
            ) : (
              <>
                <FontAwesome
                  name={collection.is_complete ? 'check-circle' : 'circle-o'}
                  size={18}
                  color={collection.is_complete ? '#fff' : colors.text}
                />
                <Text
                  style={[
                    styles.statusToggleText,
                    { color: collection.is_complete ? '#fff' : colors.text },
                  ]}
                >
                  {collection.is_complete ? 'Complete' : 'Mark Complete'}
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={[
              styles.statusToggleButton,
              {
                backgroundColor: collection.is_locked ? '#6b7280' : colors.card,
                borderColor: collection.is_locked ? '#6b7280' : colors.border,
              },
            ]}
            onPress={handleToggleLock}
            disabled={togglingLock}
          >
            {togglingLock ? (
              <ActivityIndicator color={collection.is_locked ? '#fff' : colors.text} size="small" />
            ) : (
              <>
                <FontAwesome
                  name={collection.is_locked ? 'lock' : 'unlock-alt'}
                  size={18}
                  color={collection.is_locked ? '#fff' : colors.text}
                />
                <Text
                  style={[
                    styles.statusToggleText,
                    { color: collection.is_locked ? '#fff' : colors.text },
                  ]}
                >
                  {collection.is_locked ? 'Locked' : 'Lock Collection'}
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <Pressable
            style={[
              styles.editButton,
              { backgroundColor: collection.is_locked ? colors.card : '#991b1b' },
              collection.is_locked && { borderWidth: 1, borderColor: colors.border },
            ]}
            onPress={() => {
              if (collection.is_locked) {
                Alert.alert('Collection Locked', 'Unlock this collection to edit it.');
                return;
              }
              router.push(`/collection/edit/${id}`);
            }}
          >
            <FontAwesome
              name={collection.is_locked ? 'lock' : 'pencil'}
              size={16}
              color={collection.is_locked ? colors.textSecondary : '#fff'}
            />
            <Text style={[styles.editButtonText, { color: collection.is_locked ? colors.textSecondary : '#fff' }]}>
              {collection.is_locked ? 'Locked' : 'Edit'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.exportButton, { backgroundColor: '#991b1b' }]}
            onPress={handleExportCollection}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <FontAwesome name="download" size={16} color="#fff" />
                <Text style={styles.exportButtonText}>Export Collection Data</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Delete Button */}
        <View style={styles.deleteSection}>
          <Pressable
            style={[
              styles.deleteButton,
              { borderColor: collection.is_locked ? colors.border : '#ef4444' },
            ]}
            onPress={handleDeleteCollection}
            disabled={deleting || collection.is_locked}
          >
            {deleting ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <>
                <FontAwesome
                  name="trash"
                  size={16}
                  color={collection.is_locked ? colors.textSecondary : '#ef4444'}
                />
                <Text
                  style={[
                    styles.deleteButtonText,
                    { color: collection.is_locked ? colors.textSecondary : '#ef4444' },
                  ]}
                >
                  Delete
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Bottom spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'painted': return '#10b981';
    case 'based': return '#8b5cf6';
    case 'primed': return '#6366f1';
    case 'assembled': return '#991b1b';
    case 'wip': return '#991b1b';
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
    paddingTop: 12,
    paddingBottom: 12,
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flexShrink: 1,
  },
  statusBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImageContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: 180,
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
  progressCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressPercent: {
    fontSize: 24,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressSubtext: {
    fontSize: 13,
    marginTop: 8,
  },
  statusBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusCount: {
    fontSize: 16,
    fontWeight: '700',
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
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  sortButtonActive: {
    backgroundColor: 'rgba(153, 27, 27, 0.1)',
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '500',
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
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  itemPhoto: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  itemPhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  itemNotes: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  itemStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusTogglesSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  statusToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  statusToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
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
    color: '#fff',
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
  },
  exportButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  deleteSection: {
    paddingHorizontal: 20,
    marginTop: 12,
    backgroundColor: 'transparent',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
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
