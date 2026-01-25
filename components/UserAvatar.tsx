import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

interface UserAvatarProps {
  avatarPath: string | null;
  size?: number;
  showBorder?: boolean;
}

export default function UserAvatar({
  avatarPath,
  size = 40,
  showBorder = false,
}: UserAvatarProps) {
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Colors.dark : Colors.light;
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchAvatarUrl = async () => {
      if (!avatarPath) {
        setAvatarUrl(null);
        return;
      }

      const { data } = await supabase.storage
        .from('profile-images')
        .createSignedUrl(avatarPath, 3600);

      if (data?.signedUrl) {
        setAvatarUrl(data.signedUrl);
      }
    };

    fetchAvatarUrl();
  }, [avatarPath]);

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    ...(showBorder && {
      borderWidth: 2,
      borderColor: '#991b1b',
    }),
  };

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[styles.avatar, containerStyle]}
      />
    );
  }

  return (
    <View style={[styles.placeholder, containerStyle, { backgroundColor: colors.card }]}>
      <FontAwesome name="user" size={size * 0.5} color={colors.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    resizeMode: 'cover',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
