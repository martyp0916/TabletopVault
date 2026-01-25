/**
 * Reset Password Screen
 *
 * Handles the deep link from password reset email.
 * Allows users to set a new password.
 */
import { useState, useEffect } from 'react';
import { StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Text, View } from '@/components/Themed';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import { validatePassword } from '@/lib/validation';
import { FontAwesome } from '@expo/vector-icons';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const colors = Colors.light;

  // Handle the session from deep link tokens
  useEffect(() => {
    const setupSession = async () => {
      // Check if we already have a session (user clicked link and app handled it)
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setSessionReady(true);
        return;
      }

      // If we have tokens in params, try to set the session
      const accessToken = params.access_token as string;
      const refreshToken = params.refresh_token as string;

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setError('Invalid or expired reset link. Please request a new one.');
        } else {
          setSessionReady(true);
        }
      } else {
        // No tokens, check if we have a valid recovery session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
          setSessionReady(true);
        } else {
          setError('Invalid reset link. Please request a new password reset.');
        }
      }
    };

    setupSession();
  }, [params]);

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0]);
      return;
    }

    setLoading(true);
    setError('');

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      // Sign out after password change so user logs in fresh
      await supabase.auth.signOut();
    }
  };

  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <View style={styles.successContainer}>
            <View style={[styles.iconCircle, { backgroundColor: '#10b981' }]}>
              <FontAwesome name="check" size={32} color="#fff" />
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>Password Reset!</Text>
            <Text style={[styles.successText, { color: colors.textSecondary }]}>
              Your password has been successfully reset. You can now log in with your new password.
            </Text>
            <Pressable
              style={[styles.button, { backgroundColor: colors.text }]}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={[styles.buttonText, { color: colors.background }]}>Back to Login</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (!sessionReady && !error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={colors.text} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Verifying reset link...
          </Text>
        </View>
      </View>
    );
  }

  if (error && !sessionReady) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <View style={styles.errorContainer}>
            <View style={[styles.iconCircle, { backgroundColor: '#ef4444' }]}>
              <FontAwesome name="times" size={32} color="#fff" />
            </View>
            <Text style={[styles.errorTitle, { color: colors.text }]}>Link Expired</Text>
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>
              {error}
            </Text>
            <Pressable
              style={[styles.button, { backgroundColor: colors.text }]}
              onPress={() => router.replace('/(auth)/forgot-password')}
            >
              <Text style={[styles.buttonText, { color: colors.background }]}>Request New Link</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Set New Password</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter your new password below.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>New Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.passwordInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="Enter new password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
              />
              <Pressable
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <FontAwesome
                  name={showPassword ? 'eye-slash' : 'eye'}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="Confirm new password"
              placeholderTextColor={colors.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
            />
          </View>

          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Password must be at least 8 characters with a letter and number.
          </Text>

          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : null}

          <Pressable
            style={[styles.button, { backgroundColor: colors.text }]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.background }]}>Reset Password</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  header: {
    marginBottom: 32,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  form: {
    gap: 20,
    backgroundColor: 'transparent',
  },
  inputGroup: {
    gap: 8,
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingRight: 50,
    fontSize: 16,
    borderWidth: 1,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  hint: {
    fontSize: 13,
    marginTop: -8,
  },
  error: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  successContainer: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  errorContainer: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
});
