import { StyleSheet, ScrollView, Pressable, Switch, ActivityIndicator, Alert } from 'react-native';
import { Text, View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/hooks/useProfile';
import { useCollections } from '@/hooks/useCollections';
import { useItemStats } from '@/hooks/useItems';

export default function ProfileScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.id);
  const { collections } = useCollections(user?.id);
  const { stats } = useItemStats(user?.id);

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
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
      </View>

      {/* User Card */}
      <View style={[styles.userCard, { backgroundColor: colors.card }]}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: '#374151' }]}>
            <FontAwesome name="user" size={40} color="#fff" />
          </View>
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

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SETTINGS</Text>

        {/* Dark Mode Toggle */}
        <View style={[styles.settingRow, { backgroundColor: colors.card }]}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: '#374151' }]}>
              <FontAwesome name="moon-o" size={16} color="#fff" />
            </View>
            <Text style={[styles.settingText, { color: colors.text }]}>Dark Mode</Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={setIsDarkMode}
            trackColor={{ false: colors.border, true: '#374151' }}
            thumbColor="#fff"
          />
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
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ACCOUNT</Text>

        <Pressable style={[styles.menuRow, { backgroundColor: colors.card }]}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: '#3b82f6' }]}>
              <FontAwesome name="user" size={16} color="#fff" />
            </View>
            <Text style={[styles.settingText, { color: colors.text }]}>Edit Profile</Text>
          </View>
          <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
        </Pressable>

        <Pressable style={[styles.menuRow, { backgroundColor: colors.card }]}>
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
            <View style={[styles.settingIcon, { backgroundColor: '#8b5cf6' }]}>
              <FontAwesome name="download" size={16} color="#fff" />
            </View>
            <Text style={[styles.settingText, { color: colors.text }]}>Export Data</Text>
          </View>
          <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SUPPORT</Text>

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
      <Text style={[styles.version, { color: colors.textSecondary }]}>
        TabletopVault v1.0.0
      </Text>

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
    paddingTop: 16,
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
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
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
  version: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 12,
  },
});
