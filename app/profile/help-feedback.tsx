import { StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { router } from 'expo-router';
import { useTheme } from '@/lib/theme';

export default function HelpFeedbackScreen() {
  const insets = useSafeAreaInsets();
  const { isDarkMode, toggleTheme, backgroundImageUrl } = useTheme();
  const colors = isDarkMode ? Colors.dark : Colors.light;
  const hasBackground = !!backgroundImageUrl;

  return (
    <View
      style={[styles.container, { backgroundColor: hasBackground ? 'transparent' : colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border, backgroundColor: hasBackground ? 'transparent' : colors.background }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Contact Us</Text>
        <Pressable onPress={toggleTheme}>
          <FontAwesome name={isDarkMode ? 'sun-o' : 'moon-o'} size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={{ backgroundColor: hasBackground ? 'transparent' : colors.background }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact Section */}
        <View style={[styles.section, { backgroundColor: hasBackground ? 'rgba(0,0,0,0.5)' : colors.card }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#991b1b' }]}>
              <FontAwesome name="envelope" size={18} color="#fff" />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Us</Text>
          </View>

          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            For issues, inquiries, or to provide feedback, please reach out to us at the following email:
          </Text>

          <Pressable
            style={styles.contactInfo}
            onPress={() => Linking.openURL('mailto:tabletoporganizerapp@gmail.com')}
          >
            <FontAwesome name="envelope-o" size={16} color="#991b1b" />
            <Text style={[styles.contactText, { color: colors.text }]}>tabletoporganizerapp@gmail.com</Text>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'transparent',
  },
  contactText: {
    fontSize: 15,
  },
});
