import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="edit" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="help-feedback" />
    </Stack>
  );
}
