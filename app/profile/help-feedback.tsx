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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Terms & Contact</Text>
        <Pressable onPress={toggleTheme}>
          <FontAwesome name={isDarkMode ? 'sun-o' : 'moon-o'} size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={{ backgroundColor: hasBackground ? 'transparent' : colors.background }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Terms & Conditions Section */}
        <View style={[styles.section, { backgroundColor: hasBackground ? 'rgba(0,0,0,0.5)' : colors.card }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#6366f1' }]}>
              <FontAwesome name="file-text-o" size={18} color="#fff" />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Terms & Conditions</Text>
          </View>

          <Text style={[styles.termsText, { color: colors.textSecondary }]}>
            <Text style={[styles.termsHeading, { color: colors.text }]}>1. Acceptance of Terms{'\n'}</Text>
            By downloading, installing, or using Tabletop Organizer ("the App"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the App.
            {'\n\n'}
            <Text style={[styles.termsHeading, { color: colors.text }]}>2. Description of Service{'\n'}</Text>
            Tabletop Organizer is a mobile application designed to help tabletop gaming enthusiasts track and manage their miniature collections, plan painting projects, and connect with other hobbyists.
            {'\n\n'}
            <Text style={[styles.termsHeading, { color: colors.text }]}>3. User Accounts{'\n'}</Text>
            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate and complete information when creating an account.
            {'\n\n'}
            <Text style={[styles.termsHeading, { color: colors.text }]}>4. Subscription & Payments{'\n'}</Text>
            The App offers both free and premium subscription tiers. Premium subscriptions are billed monthly through the Apple App Store. Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period. You can manage subscriptions in your App Store account settings.
            {'\n\n'}
            <Text style={[styles.termsHeading, { color: colors.text }]}>5. User Content{'\n'}</Text>
            You retain ownership of any content you upload to the App, including photos and collection data. By uploading content, you grant us a non-exclusive license to store and display that content as part of the App's functionality. You are solely responsible for the content you upload.
            {'\n\n'}
            <Text style={[styles.termsHeading, { color: colors.text }]}>6. Prohibited Conduct{'\n'}</Text>
            You agree not to: upload illegal, offensive, or inappropriate content; attempt to gain unauthorized access to the App or other users' accounts; use the App for any unlawful purpose; or interfere with the proper functioning of the App.
            {'\n\n'}
            <Text style={[styles.termsHeading, { color: colors.text }]}>7. Privacy{'\n'}</Text>
            Your use of the App is also governed by our Privacy Policy. We collect and process personal data as described therein, including email addresses, profile information, and usage data to provide and improve our services.
            {'\n\n'}
            <Text style={[styles.termsHeading, { color: colors.text }]}>8. Intellectual Property{'\n'}</Text>
            The App and its original content, features, and functionality are owned by Tabletop Organizer and are protected by copyright, trademark, and other intellectual property laws. Game names and logos mentioned in the App are trademarks of their respective owners.
            {'\n\n'}
            <Text style={[styles.termsHeading, { color: colors.text }]}>9. Disclaimer of Warranties{'\n'}</Text>
            The App is provided "as is" without warranties of any kind. We do not guarantee that the App will be error-free, secure, or continuously available.
            {'\n\n'}
            <Text style={[styles.termsHeading, { color: colors.text }]}>10. Limitation of Liability{'\n'}</Text>
            To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the App.
            {'\n\n'}
            <Text style={[styles.termsHeading, { color: colors.text }]}>11. Changes to Terms{'\n'}</Text>
            We reserve the right to modify these Terms at any time. Continued use of the App after changes constitutes acceptance of the new Terms.
            {'\n\n'}
            <Text style={[styles.termsHeading, { color: colors.text }]}>12. Contact{'\n'}</Text>
            For questions about these Terms, please contact us at tabletoporganizerapp@gmail.com.
            {'\n\n'}
            <Text style={[styles.termsFooter, { color: colors.textSecondary }]}>Last updated: February 2025</Text>
          </Text>
        </View>

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
  termsText: {
    fontSize: 14,
    lineHeight: 22,
  },
  termsHeading: {
    fontWeight: '600',
    fontSize: 15,
  },
  termsFooter: {
    fontStyle: 'italic',
    fontSize: 12,
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
