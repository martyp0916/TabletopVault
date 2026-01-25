import { StyleSheet, ScrollView, Pressable, Switch, ActivityIndicator, Alert, Image, View, ActionSheetIOS, Platform, ImageBackground } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useProfile } from '@/hooks/useProfile';
import { useCollections } from '@/hooks/useCollections';
import { useItemStats } from '@/hooks/useItems';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { isDarkMode, backgroundImageUrl, setBackgroundImagePath, refreshBackgroundImage } = useTheme();
  const hasBackground = !!backgroundImageUrl;
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [currentBackgroundUrl, setCurrentBackgroundUrl] = useState<string | null>(null);
  const [savingBackground, setSavingBackground] = useState(false);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading, refresh: refreshProfile, updateProfile } = useProfile(user?.id);
  const { collections } = useCollections(user?.id);
  const { stats } = useItemStats(user?.id);

  // Fetch avatar signed URL
  const fetchAvatar = useCallback(async () => {
    if (profile?.avatar_url) {
      const { data: signedUrlData } = await supabase.storage
        .from('profile-images')
        .createSignedUrl(profile.avatar_url, 3600);
      if (signedUrlData?.signedUrl) {
        setAvatarUrl(signedUrlData.signedUrl);
      }
    } else {
      setAvatarUrl(null);
    }
  }, [profile?.avatar_url]);

  useEffect(() => {
    fetchAvatar();
  }, [fetchAvatar]);

  // Fetch background signed URL
  const fetchBackground = useCallback(async () => {
    if (profile?.background_image_url) {
      const { data: signedUrlData } = await supabase.storage
        .from('profile-images')
        .createSignedUrl(profile.background_image_url, 3600);
      if (signedUrlData?.signedUrl) {
        setCurrentBackgroundUrl(signedUrlData.signedUrl);
      }
    } else {
      setCurrentBackgroundUrl(null);
    }
  }, [profile?.background_image_url]);

  useEffect(() => {
    fetchBackground();
  }, [fetchBackground]);

  // Refresh profile when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [])
  );

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
          aspect: [9, 19],
          quality: 0.7,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [9, 19],
          quality: 0.7,
        });

    if (!result.canceled && result.assets[0]) {
      await saveBackground(result.assets[0].uri);
    }
  };

  const saveBackground = async (imageUri: string) => {
    if (!user) return;

    setSavingBackground(true);

    try {
      const uriWithoutParams = imageUri.split('?')[0];
      const fileExt = uriWithoutParams.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/background_${Date.now()}.${fileExt}`;

      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: false,
        });

      if (uploadError) {
        console.error('Background upload error:', uploadError);
        Alert.alert('Error', 'Failed to upload background image');
        setSavingBackground(false);
        return;
      }

      // Remove old background if exists
      if (profile?.background_image_url) {
        await supabase.storage
          .from('profile-images')
          .remove([profile.background_image_url]);
      }

      // Update profile
      const { error: updateError } = await updateProfile({ background_image_url: fileName });

      if (updateError) {
        Alert.alert('Error', updateError.message);
        setSavingBackground(false);
        return;
      }

      // Refresh theme context
      setBackgroundImagePath(fileName);
      await refreshBackgroundImage(fileName);
      await refreshProfile();

      Alert.alert('Success', 'Background image updated!');
    } catch (error) {
      console.error('Error saving background:', error);
      Alert.alert('Error', 'Failed to save background image');
    }

    setSavingBackground(false);
  };

  const removeBackground = async () => {
    if (!profile?.background_image_url) return;

    setSavingBackground(true);

    try {
      // Remove from storage
      await supabase.storage
        .from('profile-images')
        .remove([profile.background_image_url]);

      // Update profile
      const { error: updateError } = await updateProfile({ background_image_url: null });

      if (updateError) {
        Alert.alert('Error', updateError.message);
        setSavingBackground(false);
        return;
      }

      // Refresh theme context
      setBackgroundImagePath(null);
      await refreshBackgroundImage(null);
      setCurrentBackgroundUrl(null);
      await refreshProfile();

      Alert.alert('Success', 'Background image removed!');
    } catch (error) {
      console.error('Error removing background:', error);
      Alert.alert('Error', 'Failed to remove background image');
    }

    setSavingBackground(false);
  };

  const showBackgroundOptions = () => {
    const hasExistingBackground = !!currentBackgroundUrl;

    if (Platform.OS === 'ios') {
      const options = hasExistingBackground
        ? ['Cancel', 'Take Photo', 'Choose from Library', 'Remove Background']
        : ['Cancel', 'Take Photo', 'Choose from Library'];

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          destructiveButtonIndex: hasExistingBackground ? 3 : undefined,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickBackground(true);
          if (buttonIndex === 2) pickBackground(false);
          if (buttonIndex === 3 && hasExistingBackground) removeBackground();
        }
      );
    } else {
      const alertOptions: any[] = [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => pickBackground(true) },
        { text: 'Choose from Library', onPress: () => pickBackground(false) },
      ];

      if (hasExistingBackground) {
        alertOptions.push({
          text: 'Remove Background',
          style: 'destructive',
          onPress: removeBackground,
        });
      }

      Alert.alert('App Background', 'Choose an option', alertOptions);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            await signOut();
          },
        },
      ]
    );
  };

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Loading...';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: hasBackground ? 'transparent' : colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[hasBackground && { backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, alignSelf: 'flex-start' }]}>
          <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
        </View>
      </View>

      {/* User Card */}
      <View style={[styles.userCard, { backgroundColor: colors.card }]}>
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: '#374151' }]}>
              <FontAwesome name="user" size={40} color="#fff" />
            </View>
          )}
        </View>
        <Text style={[styles.userName, { color: colors.text }]}>
          {profile?.username || 'Battle Brother'}
        </Text>
        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
          {profile?.email || user?.email || 'Loading...'}
        </Text>
        <Text style={[styles.memberSince, { color: colors.textSecondary }]}>
          Member since {memberSince}
        </Text>

        {/* Stats Row */}
        <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Items</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>{collections.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Collections</Text>
          </View>
        </View>
      </View>

      {/* Customization Section */}
      <View style={styles.section}>
        <View style={[styles.sectionTitleContainer, hasBackground && { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CUSTOMIZATION</Text>
        </View>

        {/* App Background */}
        <Pressable
          style={[styles.backgroundCard, { backgroundColor: colors.card }]}
          onPress={showBackgroundOptions}
          disabled={savingBackground}
        >
          <View style={styles.backgroundCardContent}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: '#7c3aed' }]}>
                <FontAwesome name="image" size={16} color="#fff" />
              </View>
              <View>
                <Text style={[styles.settingText, { color: colors.text }]}>App Background</Text>
                <Text style={[styles.settingSubtext, { color: colors.textSecondary }]}>
                  {currentBackgroundUrl ? 'Custom image set' : 'No background image'}
                </Text>
              </View>
            </View>
            {savingBackground ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
            )}
          </View>
          {currentBackgroundUrl && (
            <View style={styles.backgroundPreviewContainer}>
              <ImageBackground
                source={{ uri: currentBackgroundUrl }}
                style={styles.backgroundPreview}
                resizeMode="cover"
              >
                <View style={styles.backgroundPreviewOverlay}>
                  <Text style={styles.backgroundPreviewText}>Tap to change</Text>
                </View>
              </ImageBackground>
            </View>
          )}
        </Pressable>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <View style={[styles.sectionTitleContainer, hasBackground && { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SETTINGS</Text>
        </View>

        {/* Notifications Toggle */}
        <View style={[styles.settingRow, { backgroundColor: colors.card }]}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: '#f59e0b' }]}>
              <FontAwesome name="bell" size={16} color="#fff" />
            </View>
            <Text style={[styles.settingText, { color: colors.text }]}>Notifications</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: colors.border, true: '#374151' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <View style={[styles.sectionTitleContainer, hasBackground && { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ACCOUNT</Text>
        </View>

        <Pressable
          style={[styles.menuRow, { backgroundColor: colors.card }]}
          onPress={() => router.push('/profile/edit')}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: '#991b1b' }]}>
              <FontAwesome name="user" size={16} color="#fff" />
            </View>
            <Text style={[styles.settingText, { color: colors.text }]}>Edit Profile</Text>
          </View>
          <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
        </Pressable>

        <Pressable
          style={[styles.menuRow, { backgroundColor: colors.card }]}
          onPress={() => router.push('/profile/change-password')}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: '#10b981' }]}>
              <FontAwesome name="lock" size={16} color="#fff" />
            </View>
            <Text style={[styles.settingText, { color: colors.text }]}>Change Password</Text>
          </View>
          <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
        </Pressable>

        <Pressable style={[styles.menuRow, { backgroundColor: colors.card }]}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: '#0891b2' }]}>
              <FontAwesome name="download" size={16} color="#fff" />
            </View>
            <Text style={[styles.settingText, { color: colors.text }]}>Export Data</Text>
          </View>
          <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <View style={[styles.sectionTitleContainer, hasBackground && { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SUPPORT</Text>
        </View>

        <Pressable style={[styles.menuRow, { backgroundColor: colors.card }]}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: '#6b7280' }]}>
              <FontAwesome name="question-circle" size={16} color="#fff" />
            </View>
            <Text style={[styles.settingText, { color: colors.text }]}>Help & FAQ</Text>
          </View>
          <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
        </Pressable>

        <Pressable style={[styles.menuRow, { backgroundColor: colors.card }]}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: '#6b7280' }]}>
              <FontAwesome name="info-circle" size={16} color="#fff" />
            </View>
            <Text style={[styles.settingText, { color: colors.text }]}>About</Text>
          </View>
          <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Logout Button */}
      <Pressable
        style={[styles.logoutButton, { backgroundColor: colors.card }]}
        onPress={handleLogout}
        disabled={loggingOut}
      >
        {loggingOut ? (
          <ActivityIndicator color="#ef4444" />
        ) : (
          <>
            <FontAwesome name="sign-out" size={18} color="#ef4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </>
        )}
      </Pressable>

      {/* App Version */}
      <View style={[styles.versionContainer, hasBackground && { backgroundColor: colors.card }]}>
        <Text style={[styles.version, { color: colors.textSecondary }]}>
          TabletopVault v1.0.0
        </Text>
      </View>

      {/* Bottom Spacing */}
      <View style={{ height: 120 }} />
    </ScrollView>
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
  title: {
    fontSize: 32,
    fontWeight: '800',
  },
  userCard: {
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 14,
    marginTop: 4,
  },
  memberSince: {
    fontSize: 12,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    width: '100%',
    backgroundColor: 'transparent',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
  },
  sectionTitleContainer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    fontSize: 16,
  },
  settingSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  backgroundCard: {
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  backgroundCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  backgroundPreviewContainer: {
    height: 100,
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 8,
    overflow: 'hidden',
  },
  backgroundPreview: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundPreviewOverlay: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  backgroundPreviewText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  versionContainer: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 24,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
  },
});
