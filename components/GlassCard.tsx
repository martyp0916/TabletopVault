/**
 * GlassCard Component
 *
 * A reusable card component with glassmorphism effect.
 * Uses BlurView on iOS for native blur, falls back to semi-transparent on Android.
 */
import { StyleSheet, View, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Colors from '@/constants/Colors';
import { useTheme } from '@/lib/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  noBorder?: boolean;
}

export function GlassCard({ children, style, intensity = 70, noBorder = false }: GlassCardProps) {
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Colors.dark : Colors.light;

  // Use BlurView on iOS for true glass effect
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={intensity}
        tint={isDarkMode ? 'dark' : 'light'}
        style={[
          styles.card,
          {
            borderColor: noBorder ? 'transparent' : colors.glassBorder,
            borderWidth: noBorder ? 0 : 1,
          },
          style,
        ]}
      >
        {children}
      </BlurView>
    );
  }

  // Fallback for Android - semi-transparent background
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: noBorder ? 'transparent' : colors.glassBorder,
          borderWidth: noBorder ? 0 : 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * GlassContainer - A container with glass effect for larger sections
 */
interface GlassContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
}

export function GlassContainer({ children, style, intensity = 55 }: GlassContainerProps) {
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Colors.dark : Colors.light;

  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={intensity}
        tint={isDarkMode ? 'dark' : 'light'}
        style={[styles.container, style]}
      >
        {children}
      </BlurView>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.glassBackground },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  container: {
    overflow: 'hidden',
  },
});
