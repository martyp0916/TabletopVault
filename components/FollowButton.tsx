import React, { useState } from 'react';
import { Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '@/components/Themed';
import { useTheme } from '@/lib/theme';
import Colors from '@/constants/Colors';

interface FollowButtonProps {
  isFollowing: boolean;
  onFollow: () => Promise<{ error?: Error | null }>;
  onUnfollow: () => Promise<{ error?: Error | null }>;
  disabled?: boolean;
}

export default function FollowButton({
  isFollowing,
  onFollow,
  onUnfollow,
  disabled = false
}: FollowButtonProps) {
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Colors.dark : Colors.light;
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (loading || disabled) return;

    setLoading(true);
    try {
      if (isFollowing) {
        await onUnfollow();
      } else {
        await onFollow();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      style={[
        styles.button,
        isFollowing
          ? [styles.followingButton, { borderColor: colors.border }]
          : [styles.followButton, { backgroundColor: '#991b1b' }],
        disabled && styles.disabled,
      ]}
      onPress={handlePress}
      disabled={loading || disabled}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isFollowing ? colors.text : '#fff'} />
      ) : (
        <Text style={[
          styles.buttonText,
          isFollowing
            ? { color: colors.text }
            : { color: '#fff' }
        ]}>
          {isFollowing ? 'Following' : 'Follow'}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButton: {
    // Background color set inline
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
