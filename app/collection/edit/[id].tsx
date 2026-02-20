import { StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, Image, ActionSheetIOS, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useState, useEffect, useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useCollection, useCollections } from '@/hooks/useCollections';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';

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

export default function EditCollectionScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const { isDarkMode, toggleTheme } = useTheme();
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const { user } = useAuth();
  const { collection, loading: collectionLoading } = useCollection(id as string);
  const { updateCollection } = useCollections(user?.id);

  // Form state
  const [name, setName] = useState('');
  const [customGameName, setCustomGameName] = useState('');
  const [isCustomGame, setIsCustomGame] = useState(false);
  const [description, setDescription] = useState('');
  const [showGameDropdown, setShowGameDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);

  // Fetch current cover image signed URL
  const fetchCurrentImage = useCallback(async () => {
    if (collection?.cover_image_url) {
      const { data: signedUrlData } = await supabase.storage
        .from('collection-images')
        .createSignedUrl(collection.cover_image_url, 3600);
      if (signedUrlData?.signedUrl) {
        setCurrentImageUrl(signedUrlData.signedUrl);
      }
    }
  }, [collection]);

  // Populate form with existing collection data
  useEffect(() => {
    if (collection) {
      const collectionName = collection.name || '';
      // Check if it's a custom game (not in the preset list)
      if (collectionName && !GAME_LIST.includes(collectionName)) {
        setName('Other');
        setCustomGameName(collectionName);
        setIsCustomGame(true);
      } else {
        setName(collectionName);
        setCustomGameName('');
        setIsCustomGame(false);
      }
      setDescription(collection.description || '');
      fetchCurrentImage();
    }
  }, [collection, fetchCurrentImage]);

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
      setImageChanged(true);
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
      Alert.alert('Change Cover Image', 'Choose an option', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => pickImage(true) },
        { text: 'Choose from Library', onPress: () => pickImage(false) },
      ]);
    }
  };

  const uploadCoverImage = async (): Promise<string | null> => {
    if (!selectedImage || !user) return null;

    try {
      // Get file extension from URI (handle query params)
      const uriWithoutParams = selectedImage.split('?')[0];
      const fileExt = uriWithoutParams.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/${id}/${Date.now()}.${fileExt}`;

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

  const handleSubmit = async () => {
    const gameName = name === 'Other' ? customGameName.trim() : name.trim();
    if (!gameName) {
      Alert.alert('Error', 'Please select or enter a game for the collection');
      return;
    }

    setSaving(true);

    const updates: any = {
      name: gameName,
      description: description.trim() || null,
    };

    // Upload new image if changed
    if (imageChanged && selectedImage) {
      const imagePath = await uploadCoverImage();
      if (imagePath) {
        // Delete old image if exists
        if (collection?.cover_image_url) {
          await supabase.storage
            .from('collection-images')
            .remove([collection.cover_image_url]);
        }
        updates.cover_image_url = imagePath;
      }
    }

    const { error } = await updateCollection(id as string, updates);

    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    Alert.alert('Success', 'Collection updated!', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const handleRemoveImage = () => {
    Alert.alert(
      'Remove Cover Image',
      'Are you sure you want to remove the cover image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (collection?.cover_image_url) {
              await supabase.storage
                .from('collection-images')
                .remove([collection.cover_image_url]);
              await updateCollection(id as string, { cover_image_url: null });
            }
            setSelectedImage(null);
            setCurrentImageUrl(null);
            setImageChanged(false);
          },
        },
      ]
    );
  };

  if (collectionLoading) {
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

  // Lock check - prevent editing locked collections
  if (collection.is_locked) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <FontAwesome name="lock" size={48} color={colors.textSecondary} />
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginTop: 16 }}>Collection Locked</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
          This collection is locked and cannot be edited. Unlock it first to make changes.
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#991b1b', fontWeight: '600' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const displayImage = selectedImage || currentImageUrl;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Collection</Text>
        <Pressable onPress={toggleTheme}>
          <FontAwesome name={isDarkMode ? 'sun-o' : 'moon-o'} size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={{ backgroundColor: colors.background, flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Form Fields */}
        <View style={styles.form}>
          {/* Cover Image */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Cover Image</Text>
            <Pressable
              style={[styles.imagePicker, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={showImageOptions}
            >
              {displayImage ? (
                <Image source={{ uri: displayImage }} style={styles.imagePreview} resizeMode="contain" />
              ) : (
                <>
                  <FontAwesome name="image" size={24} color={colors.textSecondary} />
                  <Text style={[styles.imagePickerText, { color: colors.textSecondary }]}>
                    Add faction logo or photo
                  </Text>
                </>
              )}
            </Pressable>
            {displayImage && (
              <Pressable
                style={styles.removeImageButton}
                onPress={handleRemoveImage}
              >
                <Text style={styles.removeImageText}>Remove Image</Text>
              </Pressable>
            )}
          </View>

          {/* Game Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Game *</Text>
            <Pressable
              style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowGameDropdown(!showGameDropdown)}
            >
              <Text style={[
                styles.dropdownText,
                { color: name ? colors.text : colors.textSecondary }
              ]}>
                {name === 'Other' && customGameName.trim()
                  ? customGameName.trim()
                  : (name || 'Select a game...')}
              </Text>
              <FontAwesome
                name={showGameDropdown ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.textSecondary}
              />
            </Pressable>

            {showGameDropdown && (
              <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {GAME_LIST.map((game) => (
                    <Pressable
                      key={game}
                      style={[
                        styles.dropdownItem,
                        name === game && styles.dropdownItemSelected,
                        { borderBottomColor: colors.border }
                      ]}
                      onPress={() => {
                        setName(game);
                        setCustomGameName('');
                        setIsCustomGame(false);
                        setShowGameDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        { color: name === game ? '#991b1b' : colors.text }
                      ]}>
                        {game}
                      </Text>
                      {name === game && (
                        <FontAwesome name="check" size={14} color="#991b1b" />
                      )}
                    </Pressable>
                  ))}
                  {/* Other option */}
                  <Pressable
                    style={[
                      styles.dropdownItem,
                      name === 'Other' && styles.dropdownItemSelected,
                      { borderBottomColor: colors.border }
                    ]}
                    onPress={() => {
                      setName('Other');
                      setIsCustomGame(true);
                      setShowGameDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      { color: name === 'Other' ? '#991b1b' : colors.text }
                    ]}>
                      Other (type your own)
                    </Text>
                    {name === 'Other' && (
                      <FontAwesome name="check" size={14} color="#991b1b" />
                    )}
                  </Pressable>
                </ScrollView>
              </View>
            )}

            {/* Custom game input when Other is selected */}
            {name === 'Other' && (
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, marginTop: 8 }]}
                placeholder="Enter game name..."
                placeholderTextColor={colors.textSecondary}
                value={customGameName}
                onChangeText={setCustomGameName}
              />
            )}
          </View>

          {/* Description */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Description</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="What's this collection for?"
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
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
    </KeyboardAvoidingView>
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
  textArea: {
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    height: 100,
    textAlignVertical: 'top',
  },
  input: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  imagePicker: {
    height: 150,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  imagePickerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
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
