import { StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Image, RefreshControl, Dimensions } from 'react-native';
import { Text, View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useState, useEffect, useCallback } from 'react';
import { useItem } from '@/hooks/useItems';
import { useCollection } from '@/hooks/useCollections';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { GAME_COLORS, STATUS_LABELS, GAME_SYSTEM_LABELS, GameSystem, ItemStatus, getEffectiveStatus } from '@/types/database';

const { width: screenWidth } = Dimensions.get('window');

interface ItemImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  signedUrl?: string;
}

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams();
  const { isDarkMode, toggleTheme } = useTheme();
  const [deleting, setDeleting] = useState(false);
  const [photos, setPhotos] = useState<ItemImage[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const { item, loading, error, refresh: refreshItem } = useItem(id as string);

  // Fetch the parent collection to check lock status
  const { collection } = useCollection(item?.collection_id);
  const isCollectionLocked = collection?.is_locked ?? false;

  // Fetch all item photos
  const fetchPhotos = useCallback(async () => {
    if (!id) return;
    setLoadingPhotos(true);
    console.log('[ItemDetail] Fetching photos for item:', id);

    const { data: images, error } = await supabase
      .from('item_images')
      .select('*')
      .eq('item_id', id)
      .order('is_primary', { ascending: false });

    if (error) {
      console.error('[ItemDetail] Error fetching photos:', error);
      setLoadingPhotos(false);
      return;
    }

    console.log('[ItemDetail] Found images in database:', images?.length || 0);

    // Get signed URLs for all images
    const photosWithUrls = await Promise.all(
      (images || []).map(async (img) => {
        console.log('[ItemDetail] Getting signed URL for:', img.image_url);
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('item-images')
          .createSignedUrl(img.image_url, 3600);

        if (signedUrlError) {
          console.error('[ItemDetail] Signed URL error:', signedUrlError);
        }

        return {
          ...img,
          signedUrl: signedUrlData?.signedUrl || null,
        };
      })
    );

    // Filter out photos with no signed URL
    const validPhotos = photosWithUrls.filter(p => p.signedUrl);
    console.log('[ItemDetail] Valid photos with URLs:', validPhotos.length);

    setPhotos(validPhotos);
    setLoadingPhotos(false);
  }, [id]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshItem(), fetchPhotos()]);
    setRefreshing(false);
  }, [refreshItem, fetchPhotos]);

  const handleDelete = () => {
    if (isCollectionLocked) {
      Alert.alert('Collection Locked', 'This item is in a locked collection. Unlock the collection first to delete items.');
      return;
    }

    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);

            // Get image paths to delete from storage
            const { data: images } = await supabase
              .from('item_images')
              .select('image_url')
              .eq('item_id', id);

            // Delete images from storage
            if (images && images.length > 0) {
              const paths = images.map(img => img.image_url);
              await supabase.storage.from('item-images').remove(paths);
            }

            // Delete item (item_images will cascade delete due to foreign key)
            const { error } = await supabase
              .from('items')
              .delete()
              .eq('id', id);

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

  if (loading) {
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

  const gameColor = GAME_COLORS[item.game_system as GameSystem] || GAME_COLORS.other;
  const effectiveStatus = getEffectiveStatus(item);
  const statusColor = getStatusColor(effectiveStatus);
  const gameLabel = GAME_SYSTEM_LABELS[item.game_system as GameSystem] || 'Other';
  const statusLabel = STATUS_LABELS[effectiveStatus];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Details</Text>
        <Pressable onPress={toggleTheme}>
          <FontAwesome name={isDarkMode ? 'sun-o' : 'moon-o'} size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.textSecondary}
          />
        }
      >
        {/* Photo Gallery */}
        <View style={[styles.photoSection, { backgroundColor: colors.card }]}>
          {loadingPhotos ? (
            <ActivityIndicator size="large" color={colors.textSecondary} />
          ) : photos.length > 0 ? (
            <>
              {/* Main Photo */}
              <Image
                source={{ uri: photos[activePhotoIndex]?.signedUrl }}
                style={styles.mainPhoto}
                resizeMode="cover"
              />

              {/* Photo Indicators */}
              {photos.length > 1 && (
                <View style={styles.photoIndicators}>
                  {photos.map((_, index) => (
                    <Pressable
                      key={index}
                      onPress={() => setActivePhotoIndex(index)}
                      style={[
                        styles.photoIndicator,
                        {
                          backgroundColor: index === activePhotoIndex ? '#991b1b' : colors.border,
                        },
                      ]}
                    />
                  ))}
                </View>
              )}

              {/* Thumbnail Strip */}
              {photos.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.thumbnailStrip}
                >
                  {photos.map((photo, index) => (
                    <Pressable
                      key={photo.id}
                      onPress={() => setActivePhotoIndex(index)}
                      style={[
                        styles.thumbnailWrapper,
                        index === activePhotoIndex && styles.thumbnailActive,
                      ]}
                    >
                      <Image
                        source={{ uri: photo.signedUrl }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                      />
                      {photo.is_primary && (
                        <View style={styles.primaryBadge}>
                          <FontAwesome name="star" size={8} color="#fff" />
                        </View>
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </>
          ) : (
            <>
              <FontAwesome name="image" size={48} color={colors.textSecondary} />
              <Text style={[styles.photoText, { color: colors.textSecondary }]}>No photos yet</Text>
              <Pressable
                style={[styles.addPhotoLink]}
                onPress={() => router.push(`/item/edit/${id}`)}
              >
                <Text style={[styles.addPhotoLinkText, { color: '#991b1b' }]}>
                  Add photos in Edit
                </Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Photo Count */}
        {photos.length > 0 && (
          <Text style={[styles.photoCount, { color: colors.textSecondary }]}>
            {photos.length} photo{photos.length !== 1 ? 's' : ''}
          </Text>
        )}

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
          <View style={styles.tagsRow}>
            <View style={[styles.gameTag, { backgroundColor: gameColor + '20' }]}>
              <Text style={[styles.tagText, { color: gameColor }]}>{gameLabel}</Text>
            </View>
            <View style={[styles.statusTag, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.tagText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          </View>
          <Text style={[styles.faction, { color: colors.textSecondary }]}>
            {item.faction || 'No faction'}
          </Text>
        </View>

        {/* Quantity */}
        <View style={[styles.quantityCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.quantityValue, { color: colors.text }]}>{item.quantity}</Text>
          <Text style={[styles.quantityLabel, { color: colors.textSecondary }]}>Models</Text>
        </View>

        {/* Status Breakdown */}
        {(item.nib_count > 0 || item.assembled_count > 0 || item.primed_count > 0 || item.painted_count > 0) && (
          <View style={styles.statusBreakdown}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>STATUS BREAKDOWN</Text>
            <View style={[styles.statusGrid, { backgroundColor: colors.card }]}>
              {item.nib_count > 0 && (
                <View style={styles.statusItem}>
                  <View style={[styles.statusDot, { backgroundColor: '#6b7280' }]} />
                  <Text style={[styles.statusItemLabel, { color: colors.text }]}>New in Box</Text>
                  <Text style={[styles.statusItemValue, { color: colors.text }]}>{item.nib_count}</Text>
                </View>
              )}
              {item.assembled_count > 0 && (
                <View style={styles.statusItem}>
                  <View style={[styles.statusDot, { backgroundColor: '#f59e0b' }]} />
                  <Text style={[styles.statusItemLabel, { color: colors.text }]}>Assembled</Text>
                  <Text style={[styles.statusItemValue, { color: colors.text }]}>{item.assembled_count}</Text>
                </View>
              )}
              {item.primed_count > 0 && (
                <View style={styles.statusItem}>
                  <View style={[styles.statusDot, { backgroundColor: '#6366f1' }]} />
                  <Text style={[styles.statusItemLabel, { color: colors.text }]}>Primed</Text>
                  <Text style={[styles.statusItemValue, { color: colors.text }]}>{item.primed_count}</Text>
                </View>
              )}
              {item.painted_count > 0 && (
                <View style={styles.statusItem}>
                  <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
                  <Text style={[styles.statusItemLabel, { color: colors.text }]}>Painted</Text>
                  <Text style={[styles.statusItemValue, { color: colors.text }]}>{item.painted_count}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Details List */}
        <View style={styles.detailsSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DETAILS</Text>

          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status</Text>
            <Text style={[styles.detailValue, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>

          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Game System</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{gameLabel}</Text>
          </View>

          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Faction</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{item.faction || 'None'}</Text>
          </View>

          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Added</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
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
          <Pressable
            style={[styles.editButton, { backgroundColor: '#991b1b' }]}
            onPress={() => router.push(`/item/edit/${id}`)}
          >
            <FontAwesome name="pencil" size={16} color="#fff" />
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
          <Pressable
            style={[
              styles.deleteButton,
              { borderColor: isCollectionLocked ? colors.border : '#ef4444' },
            ]}
            onPress={handleDelete}
            disabled={deleting || isCollectionLocked}
          >
            {deleting ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <>
                <FontAwesome
                  name={isCollectionLocked ? 'lock' : 'trash'}
                  size={16}
                  color={isCollectionLocked ? colors.textSecondary : '#ef4444'}
                />
                <Text style={[
                  styles.deleteButtonText,
                  { color: isCollectionLocked ? colors.textSecondary : '#ef4444' },
                ]}>
                  {isCollectionLocked ? 'Locked' : 'Delete'}
                </Text>
              </>
            )}
          </Pressable>
        </View>

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
    minHeight: 200,
    margin: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mainPhoto: {
    width: '100%',
    height: 250,
  },
  photoIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  photoIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  thumbnailStrip: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  thumbnailWrapper: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: '#991b1b',
  },
  thumbnail: {
    width: 50,
    height: 50,
  },
  primaryBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#991b1b',
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoText: {
    marginTop: 8,
    fontSize: 14,
  },
  addPhotoLink: {
    marginTop: 8,
    padding: 8,
  },
  addPhotoLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  photoCount: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 8,
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
  quantityCard: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  quantityValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  quantityLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statusBreakdown: {
    paddingHorizontal: 20,
    marginTop: 24,
    backgroundColor: 'transparent',
  },
  statusGrid: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  statusItem: {
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
  statusItemLabel: {
    flex: 1,
    fontSize: 14,
  },
  statusItemValue: {
    fontSize: 14,
    fontWeight: '600',
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
    marginTop: 24,
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
  },
});
