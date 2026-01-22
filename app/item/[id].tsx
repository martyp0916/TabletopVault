import { StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Image, RefreshControl } from 'react-native';
import { Text, View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useState, useEffect, useCallback } from 'react';
import { useItem } from '@/hooks/useItems';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { GAME_COLORS, STATUS_LABELS, GAME_SYSTEM_LABELS, GameSystem, ItemStatus, getEffectiveStatus } from '@/types/database';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams();
  const { isDarkMode, toggleTheme } = useTheme();
  const [deleting, setDeleting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const { item, loading, error, refresh: refreshItem } = useItem(id as string);

  // Fetch item image
  const fetchImage = useCallback(async () => {
    if (!id) return;

    const { data: images } = await supabase
      .from('item_images')
      .select('image_url')
      .eq('item_id', id)
      .eq('is_primary', true)
      .limit(1);

    if (images && images.length > 0) {
      // Create signed URL for private bucket
      const { data: signedUrlData } = await supabase.storage
        .from('item-images')
        .createSignedUrl(images[0].image_url, 3600); // 1 hour expiry

      if (signedUrlData?.signedUrl) {
        setImageUrl(signedUrlData.signedUrl);
      }
    }
  }, [id]);

  useEffect(() => {
    fetchImage();
  }, [fetchImage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshItem(), fetchImage()]);
    setRefreshing(false);
  }, [refreshItem, fetchImage]);

  const handleDelete = () => {
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
        {/* Photo Section */}
        <View style={[styles.photoSection, { backgroundColor: colors.card }]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.itemImage} resizeMode="cover" />
          ) : (
            <>
              <FontAwesome name="image" size={48} color={colors.textSecondary} />
              <Text style={[styles.photoText, { color: colors.textSecondary }]}>No photo yet</Text>
            </>
          )}
        </View>

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
          <Text style={[styles.quantityLabel, { color: colors.textSecondary }]}>Quantity</Text>
        </View>

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
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Purchase Date</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {item.purchase_date || 'Not set'}
            </Text>
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
            style={[styles.deleteButton, { borderColor: '#ef4444' }]}
            onPress={handleDelete}
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
  itemImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
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
