import { StyleSheet, ScrollView, Pressable, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useState } from 'react';
import { router } from 'expo-router';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';

const WORD_LIMIT = 150;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

export default function HelpFeedbackScreen() {
  const { isDarkMode, toggleTheme, backgroundImageUrl } = useTheme();
  const colors = isDarkMode ? Colors.dark : Colors.light;
  const hasBackground = !!backgroundImageUrl;
  const { user } = useAuth();

  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const wordCount = countWords(feedback);
  const isOverLimit = wordCount > WORD_LIMIT;

  const handleFeedbackChange = (text: string) => {
    setFeedback(text);
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) {
      Alert.alert('Error', 'Please enter your feedback before submitting.');
      return;
    }

    if (isOverLimit) {
      Alert.alert('Error', `Please reduce your feedback to ${WORD_LIMIT} words or less.`);
      return;
    }

    setSubmitting(true);

    // Simulate submission delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    setSubmitting(false);
    setFeedback('');

    Alert.alert(
      'Thank You!',
      'Your feedback has been submitted. We appreciate you taking the time to help us improve TabletopVault!',
      [{ text: 'OK' }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: hasBackground ? 'transparent' : colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: hasBackground ? 'transparent' : colors.background }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Help & Feedback</Text>
        <Pressable onPress={toggleTheme}>
          <FontAwesome name={isDarkMode ? 'sun-o' : 'moon-o'} size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={{ backgroundColor: hasBackground ? 'transparent' : colors.background }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Feedback Section */}
        <View style={[styles.section, { backgroundColor: hasBackground ? 'rgba(0,0,0,0.5)' : colors.card }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#991b1b' }]}>
              <FontAwesome name="comment" size={18} color="#fff" />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Feedback</Text>
          </View>

          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            We'd love to hear your thoughts! Share your suggestions, report bugs, or tell us what you love about TabletopVault.
          </Text>

          <TextInput
            style={[
              styles.feedbackInput,
              {
                backgroundColor: hasBackground ? 'rgba(255,255,255,0.1)' : colors.background,
                color: colors.text,
                borderColor: isOverLimit ? '#ef4444' : colors.border
              }
            ]}
            placeholder="Type your feedback here..."
            placeholderTextColor={colors.textSecondary}
            value={feedback}
            onChangeText={handleFeedbackChange}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          <View style={styles.wordCountRow}>
            <Text style={[styles.wordCount, { color: isOverLimit ? '#ef4444' : colors.textSecondary }]}>
              {wordCount}/{WORD_LIMIT} words
            </Text>
          </View>

          <Pressable
            style={[
              styles.submitButton,
              (submitting || isOverLimit || !feedback.trim()) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmitFeedback}
            disabled={submitting || isOverLimit || !feedback.trim()}
          >
            {submitting ? (
              <Text style={styles.submitText}>Submitting...</Text>
            ) : (
              <>
                <FontAwesome name="paper-plane" size={16} color="#fff" />
                <Text style={styles.submitText}>Submit Feedback</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Help Resources Section */}
        <View style={[styles.section, { backgroundColor: hasBackground ? 'rgba(0,0,0,0.5)' : colors.card }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#6b7280' }]}>
              <FontAwesome name="question-circle" size={18} color="#fff" />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Help Resources</Text>
          </View>

          <View style={styles.helpItem}>
            <FontAwesome name="book" size={16} color={colors.textSecondary} />
            <View style={styles.helpItemContent}>
              <Text style={[styles.helpItemTitle, { color: colors.text }]}>Getting Started</Text>
              <Text style={[styles.helpItemDescription, { color: colors.textSecondary }]}>
                Create collections, add items, and track your painting progress.
              </Text>
            </View>
          </View>

          <View style={styles.helpItem}>
            <FontAwesome name="paint-brush" size={16} color={colors.textSecondary} />
            <View style={styles.helpItemContent}>
              <Text style={[styles.helpItemTitle, { color: colors.text }]}>Planning Tab</Text>
              <Text style={[styles.helpItemDescription, { color: colors.textSecondary }]}>
                Use the Progress Queue, set painting goals, and track your wishlist.
              </Text>
            </View>
          </View>

          <View style={styles.helpItem}>
            <FontAwesome name="users" size={16} color={colors.textSecondary} />
            <View style={styles.helpItemContent}>
              <Text style={[styles.helpItemTitle, { color: colors.text }]}>Social Features</Text>
              <Text style={[styles.helpItemDescription, { color: colors.textSecondary }]}>
                Follow other collectors and share your hobby journey.
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Section */}
        <View style={[styles.section, { backgroundColor: hasBackground ? 'rgba(0,0,0,0.5)' : colors.card }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#6b7280' }]}>
              <FontAwesome name="envelope" size={18} color="#fff" />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Us</Text>
          </View>

          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            For urgent issues or detailed inquiries, reach out to our support team.
          </Text>

          <View style={styles.contactInfo}>
            <FontAwesome name="envelope-o" size={14} color={colors.textSecondary} />
            <Text style={[styles.contactText, { color: colors.text }]}>support@tabletopvault.com</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    lineHeight: 20,
    marginBottom: 16,
  },
  feedbackInput: {
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    minHeight: 140,
  },
  wordCountRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  wordCount: {
    fontSize: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#991b1b',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  helpItemContent: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: 'transparent',
  },
  helpItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  helpItemDescription: {
    fontSize: 13,
    lineHeight: 18,
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
