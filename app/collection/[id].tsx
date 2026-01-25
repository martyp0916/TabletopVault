import { StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, RefreshControl, Image } from 'react-native';
import { Text, View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useCollection, useCollections } from '@/hooks/useCollections';
import { useItems } from '@/hooks/useItems';
import { supabase } from '@/lib/supabase';
import { GAME_COLORS, STATUS_LABELS, GameSystem, ItemStatus, getEffectiveStatus, Item } from '@/types/database';

// Map of item IDs to their primary photo URLs
type ItemPhotoMap = Record<string, string>;

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams();
  const { isDarkMode, toggleTheme } = useTheme();
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const { user } = useAuth();
  const { collection, loading: collectionLoading, refresh: refreshCollection } = useCollection(id as string);
  const { items, loading: itemsLoading, deleteItem, refresh: refreshItems } = useItems(user?.id, id as string);
  const { deleteCollection } = useCollections(user?.id);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [itemPhotos, setItemPhotos] = useState<ItemPhotoMap>({});

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
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {collection.name}
          </Text>
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

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: '#6b7280' }]}>
              {nibTotal}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>New in Box</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: '#f59e0b' }]}>
              {assembledTotal}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Assembled</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: '#6366f1' }]}>
              {primedTotal}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Primed</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: '#10b981' }]}>
              {paintedTotal}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Painted</Text>
          </View>
        </View>

        {/* Items List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ITEMS</Text>
            <Pressable onPress={() => router.push('/(tabs)/add')}>
              <Text style={[styles.addText, { color: '#991b1b' }]}>+ Add</Text>
            </Pressable>
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome name="cube" size={32} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No items yet. Add your first miniature!
              </Text>
            </View>
          ) : (
            items.map((item, index) => (
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
                </View>
                <Text style={[styles.itemStatus, { color: getStatusColor(getEffectiveStatus(item)) }]}>
                  {STATUS_LABELS[getEffectiveStatus(item)]}
                </Text>
              </Pressable>
            ))
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <Pressable
            style={[styles.editButton, { backgroundColor: '#991b1b' }]}
            onPress={() => router.push(`/collection/edit/${id}`)}
          >
            <FontAwesome name="pencil" size={16} color="#fff" />
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
          <Pressable
            style={[styles.deleteButton, { borderColor: '#ef4444' }]}
            onPress={handleDeleteCollection}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <>
                <FontAwesome name="trash" size={16} color="#ef4444" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </>
            )}
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'painted': return '#10b981';
    case 'based': return '#8b5cf6';
    case 'primed': return '#6366f1';
    case 'assembled': return '#f59e0b';
    case 'wip': return '#f59e0b';
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
  itemStatus: {
    fontSize: 13,
    fontWeight: '600',
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
    color: '#fff',
  },
  deleteButton: {
    flex: 1,
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
