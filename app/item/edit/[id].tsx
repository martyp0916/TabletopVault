import { StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, Image, ActionSheetIOS, Platform } from 'react-native';
import { Text, View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useState, useEffect, useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useItem, useItems } from '@/hooks/useItems';
import { ItemStatus } from '@/types/database';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';

interface ItemImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  signedUrl?: string;
}

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

  // Photo state
  const [photos, setPhotos] = useState<ItemImage[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Status counts
  const [nibCount, setNibCount] = useState('0');
  const [assembledCount, setAssembledCount] = useState('0');
  const [primedCount, setPrimedCount] = useState('0');
  const [paintedCount, setPaintedCount] = useState('0');
  const [basedCount, setBasedCount] = useState('0');

  // Fetch existing photos
  const fetchPhotos = useCallback(async () => {
    if (!id) return;
    setLoadingPhotos(true);
    console.log('[Photo] Fetching photos for item:', id);

    const { data: images, error } = await supabase
      .from('item_images')
      .select('*')
      .eq('item_id', id)
      .order('is_primary', { ascending: false });

    if (error) {
      console.error('[Photo] Error fetching photos:', error);
      setLoadingPhotos(false);
      return;
    }

    console.log('[Photo] Found images in database:', images?.length || 0);

    // Get signed URLs for all images
    const photosWithUrls = await Promise.all(
      (images || []).map(async (img) => {
        console.log('[Photo] Getting signed URL for:', img.image_url);
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('item-images')
          .createSignedUrl(img.image_url, 3600);

        if (signedUrlError) {
          console.error('[Photo] Signed URL error:', signedUrlError);
        } else {
          console.log('[Photo] Signed URL success:', signedUrlData?.signedUrl?.substring(0, 50) + '...');
        }

        return {
          ...img,
          signedUrl: signedUrlData?.signedUrl || null,
        };
      })
    );

    // Filter out photos with no signed URL
    const validPhotos = photosWithUrls.filter(p => p.signedUrl);
    console.log('[Photo] Valid photos with URLs:', validPhotos.length);

    setPhotos(validPhotos);
    setLoadingPhotos(false);
  }, [id]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

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
      await uploadPhoto(result.assets[0].uri);
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

  const uploadPhoto = async (uri: string) => {
    if (!user || !id) {
      console.log('[Photo] Missing user or id:', { user: !!user, id });
      return;
    }
    setUploadingPhoto(true);

    try {
      console.log('[Photo] Starting upload for URI:', uri.substring(0, 50) + '...');

      const uriWithoutParams = uri.split('?')[0];
      const fileExt = uriWithoutParams.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/${id}/${Date.now()}.${fileExt}`;
      console.log('[Photo] File name:', fileName);

      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      console.log('[Photo] Array buffer size:', arrayBuffer.byteLength);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('item-images')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: false,
        });

      if (uploadError) {
        console.error('[Photo] Upload error:', uploadError);
        Alert.alert('Error', `Failed to upload photo: ${uploadError.message}`);
        setUploadingPhoto(false);
        return;
      }
      console.log('[Photo] Upload successful:', uploadData);

      // Add to item_images table
      const isPrimary = photos.length === 0; // First photo is primary
      console.log('[Photo] Inserting to item_images, isPrimary:', isPrimary);

      const { data: insertData, error: insertError } = await supabase.from('item_images').insert({
        item_id: id,
        image_url: fileName,
        is_primary: isPrimary,
      }).select();

      if (insertError) {
        console.error('[Photo] Insert error:', insertError);
        Alert.alert('Error', `Failed to save photo reference: ${insertError.message}`);
      } else {
        console.log('[Photo] Insert successful:', insertData);
        await fetchPhotos();
      }
    } catch (error) {
      console.error('[Photo] Error uploading photo:', error);
      Alert.alert('Error', 'Failed to upload photo');
    }

    setUploadingPhoto(false);
  };

  const deletePhoto = async (photo: ItemImage) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Delete from storage
            await supabase.storage.from('item-images').remove([photo.image_url]);

            // Delete from database
            await supabase.from('item_images').delete().eq('id', photo.id);

            // If this was primary and there are other photos, make the first one primary
            if (photo.is_primary && photos.length > 1) {
              const nextPhoto = photos.find(p => p.id !== photo.id);
              if (nextPhoto) {
                await supabase
                  .from('item_images')
                  .update({ is_primary: true })
                  .eq('id', nextPhoto.id);
              }
            }

            await fetchPhotos();
          },
        },
      ]
    );
  };

  const setPrimaryPhoto = async (photo: ItemImage) => {
    if (photo.is_primary) return;

    // Remove primary from all photos
    await supabase
      .from('item_images')
      .update({ is_primary: false })
      .eq('item_id', id);

    // Set this photo as primary
    await supabase
      .from('item_images')
      .update({ is_primary: true })
      .eq('id', photo.id);

    await fetchPhotos();
  };

  const showPhotoOptions = (photo: ItemImage) => {
    const options = photo.is_primary
      ? ['Cancel', 'Delete Photo']
      : ['Cancel', 'Set as Primary', 'Delete Photo'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          destructiveButtonIndex: photo.is_primary ? 1 : 2,
        },
        (buttonIndex) => {
          if (photo.is_primary) {
            if (buttonIndex === 1) deletePhoto(photo);
          } else {
            if (buttonIndex === 1) setPrimaryPhoto(photo);
            if (buttonIndex === 2) deletePhoto(photo);
          }
        }
      );
    } else {
      const alertOptions: any[] = [{ text: 'Cancel', style: 'cancel' }];
      if (!photo.is_primary) {
        alertOptions.push({ text: 'Set as Primary', onPress: () => setPrimaryPhoto(photo) });
      }
      alertOptions.push({ text: 'Delete Photo', style: 'destructive', onPress: () => deletePhoto(photo) });
      Alert.alert('Photo Options', '', alertOptions);
    }
  };

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
        {/* Photos Section */}
        <View style={styles.photosSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Photos</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photosContainer}
          >
            {/* Add Photo Button */}
            <Pressable
              style={[styles.addPhotoButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={showImageOptions}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <ActivityIndicator color={colors.textSecondary} />
              ) : (
                <>
                  <FontAwesome name="plus" size={24} color={colors.textSecondary} />
                  <Text style={[styles.addPhotoText, { color: colors.textSecondary }]}>Add</Text>
                </>
              )}
            </Pressable>

            {/* Existing Photos */}
            {loadingPhotos ? (
              <View style={styles.photoLoadingContainer}>
                <ActivityIndicator color={colors.textSecondary} />
              </View>
            ) : (
              photos.map((photo) => (
                <Pressable
                  key={photo.id}
                  style={styles.photoWrapper}
                  onPress={() => showPhotoOptions(photo)}
                >
                  <Image
                    source={{ uri: photo.signedUrl }}
                    style={styles.photoThumbnail}
                    resizeMode="cover"
                  />
                  {photo.is_primary && (
                    <View style={styles.primaryBadge}>
                      <FontAwesome name="star" size={10} color="#fff" />
                    </View>
                  )}
                </Pressable>
              ))
            )}
          </ScrollView>

          {photos.length > 0 && (
            <Text style={[styles.photoHint, { color: colors.textSecondary }]}>
              Tap a photo to set as primary or delete
            </Text>
          )}
        </View>

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
  photosSection: {
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  photosContainer: {
    paddingHorizontal: 24,
    gap: 12,
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    fontSize: 12,
    marginTop: 4,
  },
  photoLoadingContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoWrapper: {
    position: 'relative',
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  primaryBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#991b1b',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoHint: {
    fontSize: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  form: {
    padding: 24,
    paddingTop: 12,
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
