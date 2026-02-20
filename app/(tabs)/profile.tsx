import { StyleSheet, ScrollView, Pressable, Switch, ActivityIndicator, Alert, Image, View, ActionSheetIOS, Platform, ImageBackground, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { useItemStats, useItems } from '@/hooks/useItems';
import { usePremium, FREE_TIER_LIMITS } from '@/lib/premium';
import { supabase } from '@/lib/supabase';
import { exportToPDF, ExportCollection } from '@/lib/exportData';
import {
  requestNotificationPermissions,
  areNotificationsEnabled,
  cancelAllNotifications,
} from '@/lib/notifications';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { isDarkMode, themeMode, setThemeMode, backgroundImageUrl, setBackgroundImagePath, refreshBackgroundImage } = useTheme();
  const hasBackground = !!backgroundImageUrl;
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [checkingNotifications, setCheckingNotifications] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [currentBackgroundUrl, setCurrentBackgroundUrl] = useState<string | null>(null);
  const [savingBackground, setSavingBackground] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [exporting, setExporting] = useState(false);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading, refresh: refreshProfile, updateProfile } = useProfile(user?.id);
  const { isPremium, showUpgradePrompt } = usePremium();
  const { collections } = useCollections(user?.id, isPremium);
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

  // Check notification permissions status
  const checkNotificationStatus = useCallback(async () => {
    setCheckingNotifications(true);
    const enabled = await areNotificationsEnabled();
    setNotificationsEnabled(enabled);
    setCheckingNotifications(false);
  }, []);

  useEffect(() => {
    if (isPremium) {
      checkNotificationStatus();
    }
  }, [isPremium, checkNotificationStatus]);

  // Also check when screen comes into focus (in case user changed in Settings)
  useFocusEffect(
    useCallback(() => {
      if (isPremium) {
        checkNotificationStatus();
      }
    }, [isPremium, checkNotificationStatus])
  );

  const handleNotificationToggle = async (value: boolean) => {
    if (value) {
      // Request permissions
      const granted = await requestNotificationPermissions();
      if (granted) {
        setNotificationsEnabled(true);
      } else {
        // User denied - offer to open settings
        Alert.alert(
          'Notifications Disabled',
          'To enable goal deadline notifications, please allow notifications in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
      }
    } else {
      // Cancel all notifications
      await cancelAllNotifications();
      setNotificationsEnabled(false);
      Alert.alert('Notifications Disabled', 'Goal deadline notifications have been turned off.');
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

  const pickAvatar = async (useCamera: boolean) => {
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
      await saveAvatar(result.assets[0].uri);
    }
  };

  const saveAvatar = async (imageUri: string) => {
    if (!user) return;

    setSavingAvatar(true);

    try {
      const uriWithoutParams = imageUri.split('?')[0];
      const fileExt = uriWithoutParams.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`;

      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: false,
        });

      if (uploadError) {
        console.error('Avatar upload error:', uploadError);
        Alert.alert('Error', 'Failed to upload profile picture');
        setSavingAvatar(false);
        return;
      }

      // Remove old avatar if exists
      if (profile?.avatar_url) {
        await supabase.storage
          .from('profile-images')
          .remove([profile.avatar_url]);
      }

      // Update profile
      const { error: updateError } = await updateProfile({ avatar_url: fileName });

      if (updateError) {
        Alert.alert('Error', updateError.message);
        setSavingAvatar(false);
        return;
      }

      await refreshProfile();
      Alert.alert('Success', 'Profile picture updated!');
    } catch (error) {
      console.error('Error saving avatar:', error);
      Alert.alert('Error', 'Failed to save profile picture');
    }

    setSavingAvatar(false);
  };

  const removeAvatar = async () => {
    if (!profile?.avatar_url) return;

    setSavingAvatar(true);

    try {
      // Remove from storage
      await supabase.storage
        .from('profile-images')
        .remove([profile.avatar_url]);

      // Update profile to remove avatar
      const { error: updateError } = await updateProfile({ avatar_url: null });

      if (updateError) {
        Alert.alert('Error', updateError.message);
        setSavingAvatar(false);
        return;
      }

      setAvatarUrl(null);
      await refreshProfile();
      Alert.alert('Success', 'Profile picture removed!');
    } catch (error) {
      console.error('Error removing avatar:', error);
      Alert.alert('Error', 'Failed to remove profile picture');
    }

    setSavingAvatar(false);
  };

  const showAvatarOptions = () => {
    const hasAvatar = !!avatarUrl;

    if (Platform.OS === 'ios') {
      const options = hasAvatar
        ? ['Cancel', 'Take Photo', 'Choose from Library', 'Remove Photo']
        : ['Cancel', 'Take Photo', 'Choose from Library'];

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          destructiveButtonIndex: hasAvatar ? 3 : undefined,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickAvatar(true);
          if (buttonIndex === 2) pickAvatar(false);
          if (buttonIndex === 3 && hasAvatar) removeAvatar();
        }
      );
    } else {
      const alertOptions: any[] = [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => pickAvatar(true) },
        { text: 'Choose from Library', onPress: () => pickAvatar(false) },
      ];

      if (hasAvatar) {
        alertOptions.push({
          text: 'Remove Photo',
          style: 'destructive',
          onPress: removeAvatar,
        });
      }

      Alert.alert('Profile Picture', 'Choose an option', alertOptions);
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

  // Export functions
  const handleExportAllCollections = async () => {
    if (collections.length === 0) {
      Alert.alert('No Data', 'You don\'t have any collections to export.');
      return;
    }

    setExporting(true);

    try {
      // Fetch all items for all collections
      const { data: allItems, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;

      // Group items by collection
      const exportCollections: ExportCollection[] = collections.map((collection) => ({
        ...collection,
        items: (allItems || []).filter((item) => item.collection_id === collection.id),
      }));

      await exportToPDF(exportCollections, 'Tabletop Organizer Collections', 'Tabletop-Organizer-All-Collections');
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'There was an error exporting your data. Please try again.');
    }

    setExporting(false);
  };

  const handleExportSingleCollection = async (collectionId: string) => {
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return;

    setExporting(true);

    try {
      const { data: collectionItems, error } = await supabase
        .from('items')
        .select('*')
        .eq('collection_id', collectionId);

      if (error) throw error;

      const exportData: ExportCollection[] = [{
        ...collection,
        items: collectionItems || [],
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

  const showCollectionPicker = () => {
    const getCollectionLabel = (c: typeof collections[0]) => {
      return c.description ? `${c.name} - ${c.description}` : c.name;
    };

    if (Platform.OS === 'ios') {
      const collectionOptions = ['Cancel', ...collections.map(getCollectionLabel)];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: collectionOptions,
          cancelButtonIndex: 0,
          title: 'Select Collection',
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            const selectedCollection = collections[buttonIndex - 1];
            handleExportSingleCollection(selectedCollection.id);
          }
        }
      );
    } else {
      Alert.alert(
        'Select Collection',
        'Choose a collection to export',
        [
          { text: 'Cancel', style: 'cancel' },
          ...collections.map(c => ({
            text: getCollectionLabel(c),
            onPress: () => handleExportSingleCollection(c.id),
          })),
        ]
      );
    }
  };

  const showExportOptions = () => {
    // Check premium status
    if (!isPremium) {
      showUpgradePrompt('export');
      return;
    }

    if (collections.length === 0) {
      Alert.alert('No Data', 'You don\'t have any collections to export.');
      return;
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Export All Collections', 'Choose a Collection'],
          cancelButtonIndex: 0,
          title: 'Export Collection Data',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleExportAllCollections();
          if (buttonIndex === 2) showCollectionPicker();
        }
      );
    } else {
      Alert.alert('Export Collection Data', 'What would you like to export?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export All Collections', onPress: () => handleExportAllCollections() },
        { text: 'Choose a Collection', onPress: () => showCollectionPicker() },
      ]);
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
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={[hasBackground && { backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, alignSelf: 'flex-start' }]}>
          <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
        </View>
      </View>

      {/* User Card */}
      <View style={[styles.userCard, { backgroundColor: colors.card }]}>
        <Pressable
          style={styles.avatarWrapper}
          onPress={showAvatarOptions}
          disabled={savingAvatar}
        >
          <View style={styles.avatarContainer}>
            {savingAvatar ? (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: '#374151' }]}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            ) : avatarUrl ? (
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
          <View style={styles.avatarEditBadge}>
            <FontAwesome name="camera" size={12} color="#fff" />
          </View>
        </Pressable>
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

      {/* Premium Section */}
      <View style={styles.section}>
        <View style={[styles.sectionTitleContainer, hasBackground && { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SUBSCRIPTION</Text>
        </View>

        {isPremium ? (
          <View style={[styles.premiumCard, { backgroundColor: colors.card }]}>
            <View style={styles.premiumBadge}>
              <FontAwesome name="star" size={20} color="#991b1b" />
            </View>
            <View style={styles.premiumContent}>
              <Text style={[styles.premiumTitle, { color: colors.text }]}>Premium Active</Text>
              <Text style={[styles.premiumSubtext, { color: colors.textSecondary }]}>
                Unlimited collections, items & planning features
              </Text>
            </View>
            <FontAwesome name="check-circle" size={20} color="#10b981" />
          </View>
        ) : (
          <Pressable
            style={[styles.upgradeCard, { backgroundColor: colors.card }]}
            onPress={() => showUpgradePrompt('planning')}
          >
            <View style={styles.upgradeCardLeft}>
              <View style={styles.upgradeBadge}>
                <FontAwesome name="star" size={20} color="#991b1b" />
              </View>
              <View style={styles.upgradeContent}>
                <Text style={[styles.upgradeTitle, { color: colors.text }]}>Free Plan</Text>
                <Text style={[styles.upgradeSubtext, { color: colors.textSecondary }]}>
                  {FREE_TIER_LIMITS.MAX_COLLECTIONS} collections, {FREE_TIER_LIMITS.MAX_ITEMS_PER_COLLECTION} items each
                </Text>
              </View>
            </View>
            <View style={styles.upgradeButton}>
              <Text style={styles.upgradeButtonText}>Upgrade</Text>
              <FontAwesome name="chevron-right" size={12} color="#fff" />
            </View>
          </Pressable>
        )}
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

        {/* Theme Selector */}
        <View style={[styles.themeRow, { backgroundColor: colors.card }]}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: '#6366f1' }]}>
              <FontAwesome name={isDarkMode ? 'moon-o' : 'sun-o'} size={16} color="#fff" />
            </View>
            <Text style={[styles.settingText, { color: colors.text }]}>Appearance</Text>
          </View>
          <View style={styles.themeButtons}>
            <Pressable
              style={[
                styles.themeButton,
                themeMode === 'light' && styles.themeButtonActive,
                { borderColor: colors.border }
              ]}
              onPress={() => setThemeMode('light')}
            >
              <FontAwesome name="sun-o" size={14} color={themeMode === 'light' ? '#fff' : colors.textSecondary} />
            </Pressable>
            <Pressable
              style={[
                styles.themeButton,
                themeMode === 'dark' && styles.themeButtonActive,
                { borderColor: colors.border }
              ]}
              onPress={() => setThemeMode('dark')}
            >
              <FontAwesome name="moon-o" size={14} color={themeMode === 'dark' ? '#fff' : colors.textSecondary} />
            </Pressable>
            <Pressable
              style={[
                styles.themeButton,
                themeMode === 'system' && styles.themeButtonActive,
                { borderColor: colors.border }
              ]}
              onPress={() => setThemeMode('system')}
            >
              <FontAwesome name="mobile" size={14} color={themeMode === 'system' ? '#fff' : colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Notifications Toggle - Premium Only */}
        {isPremium && (
          <View style={[styles.settingRow, { backgroundColor: colors.card }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: '#991b1b' }]}>
                <FontAwesome name="bell" size={16} color="#fff" />
              </View>
              <View>
                <Text style={[styles.settingText, { color: colors.text }]}>Goal Notifications</Text>
                <Text style={[styles.settingSubtext, { color: colors.textSecondary }]}>
                  Reminders for goal deadlines
                </Text>
              </View>
            </View>
            {checkingNotifications ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: colors.border, true: '#10b981' }}
                thumbColor="#fff"
              />
            )}
          </View>
        )}
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

        <Pressable
          style={[styles.menuRow, { backgroundColor: colors.card }]}
          onPress={showExportOptions}
          disabled={exporting}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: '#991b1b' }]}>
              <FontAwesome name="download" size={16} color="#fff" />
            </View>
            <Text style={[styles.settingText, { color: colors.text }]}>Export Collection Data</Text>
          </View>
          {exporting ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
          )}
        </Pressable>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <View style={[styles.sectionTitleContainer, hasBackground && { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SUPPORT</Text>
        </View>

        <Pressable
          style={[styles.menuRow, { backgroundColor: colors.card }]}
          onPress={() => router.push('/profile/help-feedback')}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: '#991b1b' }]}>
              <FontAwesome name="envelope" size={16} color="#fff" />
            </View>
            <Text style={[styles.settingText, { color: colors.text }]}>Contact Us</Text>
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
          Tabletop Organizer v1.0.0
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
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
  },
  userCard: {
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#991b1b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
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
    fontSize: 28,
    fontWeight: '800',
  },
  userEmail: {
    fontSize: 15,
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
    fontSize: 28,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 13,
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
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  themeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  themeButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeButtonActive: {
    backgroundColor: '#991b1b',
    borderColor: '#991b1b',
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
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  premiumBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumContent: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  premiumSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  upgradeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  upgradeBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeContent: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  upgradeSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#991b1b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
