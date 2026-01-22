import { StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, Image, ActionSheetIOS, Platform, ImageBackground } from 'react-native';
import { Text, View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';

export default function EditProfileScreen() {
  const { isDarkMode, toggleTheme, setBackgroundImagePath, refreshBackgroundImage, backgroundImageUrl } = useTheme();
  const colors = isDarkMode ? Colors.dark : Colors.light;
  const hasBackground = !!backgroundImageUrl;

  const { user } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile(user?.id);

  // Form state
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);

  // Background image state
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  const [currentBackgroundUrl, setCurrentBackgroundUrl] = useState<string | null>(null);
  const [backgroundChanged, setBackgroundChanged] = useState(false);

  // Populate form with existing profile data
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      if (profile.avatar_url) {
        fetchCurrentAvatar();
      }
      if (profile.background_image_url) {
        fetchCurrentBackground();
      }
    }
  }, [profile]);

  const fetchCurrentAvatar = async () => {
    if (profile?.avatar_url) {
      const { data: signedUrlData } = await supabase.storage
        .from('profile-images')
        .createSignedUrl(profile.avatar_url, 3600);
      if (signedUrlData?.signedUrl) {
        setCurrentAvatarUrl(signedUrlData.signedUrl);
      }
    }
  };

  const fetchCurrentBackground = async () => {
    if (profile?.background_image_url) {
      const { data: signedUrlData } = await supabase.storage
        .from('profile-images')
        .createSignedUrl(profile.background_image_url, 3600);
      if (signedUrlData?.signedUrl) {
        setCurrentBackgroundUrl(signedUrlData.signedUrl);
      }
    }
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
      setImageChanged(true);
    }
  };

  const pickBackground = async (useCamera: boolean) => {
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
          aspect: [9, 16],
          quality: 0.7,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [9, 16],
          quality: 0.7,
        });

    if (!result.canceled && result.assets[0]) {
      setSelectedBackground(result.assets[0].uri);
      setBackgroundChanged(true);
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
      Alert.alert('Change Avatar', 'Choose an option', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => pickImage(true) },
        { text: 'Choose from Library', onPress: () => pickImage(false) },
      ]);
    }
  };

  const showBackgroundOptions = () => {
    const hasBackground = selectedBackground || currentBackgroundUrl;

    if (Platform.OS === 'ios') {
      const options = hasBackground
        ? ['Cancel', 'Take Photo', 'Choose from Library', 'Remove Background']
        : ['Cancel', 'Take Photo', 'Choose from Library'];

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          destructiveButtonIndex: hasBackground ? 3 : undefined,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickBackground(true);
          if (buttonIndex === 2) pickBackground(false);
          if (buttonIndex === 3 && hasBackground) removeBackground();
        }
      );
    } else {
      const alertOptions: any[] = [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => pickBackground(true) },
        { text: 'Choose from Library', onPress: () => pickBackground(false) },
      ];

      if (hasBackground) {
        alertOptions.push({
          text: 'Remove Background',
          style: 'destructive',
          onPress: removeBackground,
        });
      }

      Alert.alert('Change Background', 'Choose an option', alertOptions);
    }
  };

  const removeBackground = () => {
    setSelectedBackground(null);
    setCurrentBackgroundUrl(null);
    setBackgroundChanged(true);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!selectedImage || !user) return null;

    try {
      const uriWithoutParams = selectedImage.split('?')[0];
      const fileExt = uriWithoutParams.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`;

      const response = await fetch(selectedImage);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
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
      console.error('Error uploading avatar:', error);
      return null;
    }
  };

  const uploadBackground = async (): Promise<string | null> => {
    if (!selectedBackground || !user) return null;

    try {
      const uriWithoutParams = selectedBackground.split('?')[0];
      const fileExt = uriWithoutParams.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/background_${Date.now()}.${fileExt}`;

      const response = await fetch(selectedBackground);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: false,
        });

      if (uploadError) {
        console.error('Background upload error:', uploadError);
        return null;
      }

      return fileName;
    } catch (error) {
      console.error('Error uploading background:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    setSaving(true);

    const updates: any = {
      username: username.trim(),
    };

    // Upload new avatar if changed
    if (imageChanged && selectedImage) {
      const avatarPath = await uploadAvatar();
      if (avatarPath) {
        if (profile?.avatar_url) {
          await supabase.storage
            .from('profile-images')
            .remove([profile.avatar_url]);
        }
        updates.avatar_url = avatarPath;
      }
    }

    // Handle background image changes
    let newBackgroundPath: string | null | undefined = undefined;
    if (backgroundChanged) {
      if (selectedBackground) {
        const uploadedPath = await uploadBackground();
        if (uploadedPath) {
          if (profile?.background_image_url) {
            await supabase.storage
              .from('profile-images')
              .remove([profile.background_image_url]);
          }
          updates.background_image_url = uploadedPath;
          newBackgroundPath = uploadedPath;
        }
      } else {
        // Remove background
        if (profile?.background_image_url) {
          await supabase.storage
            .from('profile-images')
            .remove([profile.background_image_url]);
        }
        updates.background_image_url = null;
        newBackgroundPath = null;
      }
    }

    const { error } = await updateProfile(updates);

    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    // Update and refresh background image in theme context
    if (newBackgroundPath !== undefined) {
      console.log('[Edit] Setting background path:', newBackgroundPath);
      setBackgroundImagePath(newBackgroundPath);
      console.log('[Edit] Calling refreshBackgroundImage with path:', newBackgroundPath);
      await refreshBackgroundImage(newBackgroundPath);
      console.log('[Edit] refreshBackgroundImage completed');
    }

    Alert.alert('Success', 'Profile updated!', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const displayImage = selectedImage || currentAvatarUrl;
  const displayBackground = selectedBackground || currentBackgroundUrl;

  if (profileLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: hasBackground ? 'transparent' : colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: hasBackground ? 'transparent' : colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: hasBackground ? 'transparent' : colors.background }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
        <Pressable onPress={toggleTheme}>
          <FontAwesome name={isDarkMode ? 'sun-o' : 'moon-o'} size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={{ backgroundColor: hasBackground ? 'transparent' : colors.background }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <Pressable style={styles.avatarWrapper} onPress={showImageOptions}>
            <View style={styles.avatarContainer}>
              {displayImage ? (
                <Image
                  source={{ uri: displayImage }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: '#374151' }]}>
                  <FontAwesome name="user" size={50} color="#fff" />
                </View>
              )}
            </View>
            <View style={[styles.editBadge, { backgroundColor: '#991b1b' }]}>
              <FontAwesome name="camera" size={14} color="#fff" />
            </View>
          </Pressable>
          <Pressable onPress={showImageOptions}>
            <Text style={[styles.changePhotoText, { color: '#991b1b' }]}>
              Change Photo
            </Text>
          </Pressable>
        </View>

        {/* Background Image Section */}
        <View style={styles.backgroundSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>App Background</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Choose an image to display behind all screens
          </Text>

          <Pressable
            style={[styles.backgroundPreview, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={showBackgroundOptions}
          >
            {displayBackground ? (
              <ImageBackground
                source={{ uri: displayBackground }}
                style={styles.backgroundPreviewImage}
                resizeMode="cover"
              >
                <View style={styles.backgroundOverlay}>
                  <FontAwesome name="image" size={24} color="#fff" />
                  <Text style={styles.backgroundOverlayText}>Tap to change</Text>
                </View>
              </ImageBackground>
            ) : (
              <View style={styles.backgroundPlaceholder}>
                <FontAwesome name="image" size={32} color={colors.textSecondary} />
                <Text style={[styles.backgroundPlaceholderText, { color: colors.textSecondary }]}>
                  Tap to select background
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          {/* Username */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Username</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter your username"
              placeholderTextColor={colors.textSecondary}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Email (read-only) */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <View style={[styles.readOnlyField, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.readOnlyText, { color: colors.textSecondary }]}>
                {profile?.email || user?.email}
              </Text>
              <FontAwesome name="lock" size={14} color={colors.textSecondary} />
            </View>
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              Email cannot be changed
            </Text>
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
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: 'transparent',
  },
  avatarWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  changePhotoText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  backgroundSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  backgroundPreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  backgroundPreviewImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundOverlay: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backgroundOverlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  backgroundPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  backgroundPlaceholderText: {
    fontSize: 14,
  },
  form: {
    padding: 24,
    paddingTop: 0,
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
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  readOnlyText: {
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    marginTop: 6,
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
