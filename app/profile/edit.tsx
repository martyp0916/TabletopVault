import { StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, Image, ActionSheetIOS, Platform, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const { isDarkMode, toggleTheme, backgroundImageUrl } = useTheme();
  const colors = isDarkMode ? Colors.dark : Colors.light;
  const hasBackground = !!backgroundImageUrl;

  const { user } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile(user?.id);

  // Form state
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);

  // Populate form with existing profile data
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setLocation(profile.location || '');
      setIsPublic(profile.is_public || false);
      if (profile.avatar_url) {
        fetchCurrentAvatar();
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
      Alert.alert('Change Avatar', 'Choose an option', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => pickImage(true) },
        { text: 'Choose from Library', onPress: () => pickImage(false) },
      ]);
    }
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

  const handleSubmit = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    setSaving(true);

    const updates: any = {
      username: username.trim(),
      bio: bio.trim() || null,
      location: location.trim() || null,
      is_public: isPublic,
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

    const { error } = await updateProfile(updates);

    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    Alert.alert('Success', 'Profile updated!', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const displayImage = selectedImage || currentAvatarUrl;

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
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border, backgroundColor: hasBackground ? 'transparent' : colors.background }]}>
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

          {/* Bio */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Bio</Text>
            <Text style={[styles.helperText, { color: colors.textSecondary, marginTop: 0, marginBottom: 8 }]}>
              Max 150 characters
            </Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="Tell others about yourself..."
              placeholderTextColor={colors.textSecondary}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              maxLength={150}
            />
            <Text style={[styles.charCount, { color: colors.textSecondary }]}>
              {bio.length}/150
            </Text>
          </View>

          {/* Location */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Location</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g., New York, USA"
              placeholderTextColor={colors.textSecondary}
              value={location}
              onChangeText={setLocation}
              maxLength={100}
            />
          </View>

          {/* Public Profile Toggle */}
          <View style={[styles.fieldGroup, styles.toggleRow]}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>Public Profile</Text>
              <Text style={[styles.helperText, { color: colors.textSecondary, marginTop: 2 }]}>
                Allow others to see your profile and public collections
              </Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: colors.border, true: '#991b1b' }}
              thumbColor="#fff"
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
    backgroundColor: 'transparent',
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
