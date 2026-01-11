import { StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { Text, View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useState } from 'react';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 12) / 2; // 2 columns with padding and gap

// Mock data
const MOCK_COLLECTIONS = [
  {
    id: '1',
    name: 'Space Marines',
    game: 'Warhammer 40K',
    itemCount: 47,
    color: '#3b82f6',
  },
  {
    id: '2',
    name: 'Stormcast Eternals',
    game: 'Age of Sigmar',
    itemCount: 32,
    color: '#f59e0b',
  },
  {
    id: '3',
    name: 'Rebel Alliance',
    game: 'Star Wars Legion',
    itemCount: 18,
    color: '#ef4444',
  },
  {
    id: '4',
    name: 'Necrons',
    game: 'Warhammer 40K',
    itemCount: 24,
    color: '#10b981',
  },
  {
    id: '5',
    name: 'Pile of Shame',
    game: 'Mixed',
    itemCount: 89,
    color: '#8b5cf6',
  },
  {
    id: '6',
    name: 'Painted & Done',
    game: 'Mixed',
    itemCount: 43,
    color: '#ec4899',
  },
];

export default function CollectionsScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleArea}>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Organize Your</Text>
            <Text style={[styles.title, { color: colors.text }]}>Collections</Text>
          </View>
          <Pressable
            style={[styles.themeToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setIsDarkMode(!isDarkMode)}
          >
            <FontAwesome
              name={isDarkMode ? 'sun-o' : 'moon-o'}
              size={20}
              color={colors.text}
            />
          </Pressable>
        </View>
      </View>

      {/* Add New Collection Button */}
      <Pressable style={[styles.addButton, { borderColor: colors.border }]}>
        <FontAwesome name="plus" size={20} color={colors.textSecondary} />
        <Text style={[styles.addButtonText, { color: colors.textSecondary }]}>
          New Collection
        </Text>
      </Pressable>

      {/* Collections Grid */}
      <View style={styles.grid}>
        {MOCK_COLLECTIONS.map((collection) => (
          <Pressable
            key={collection.id}
            style={[styles.card, { backgroundColor: colors.card }]}
            onPress={() => router.push(`/collection/${collection.id}`)}
          >
            {/* Color Banner */}
            <View style={[styles.cardBanner, { backgroundColor: collection.color }]}>
              <FontAwesome name="folder" size={32} color="rgba(255,255,255,0.9)" />
            </View>

            {/* Card Content */}
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                {collection.name}
              </Text>
              <Text style={[styles.cardGame, { color: colors.textSecondary }]}>
                {collection.game}
              </Text>
              <View style={styles.cardFooter}>
                <View style={styles.itemCount}>
                  <FontAwesome name="cube" size={12} color={colors.textSecondary} />
                  <Text style={[styles.itemCountText, { color: colors.textSecondary }]}>
                    {collection.itemCount} items
                  </Text>
                </View>
                <FontAwesome name="chevron-right" size={12} color={colors.textSecondary} />
              </View>
            </View>
          </Pressable>
        ))}
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
    paddingTop: 16,
    backgroundColor: 'transparent',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
  },
  headerTitleArea: {
    backgroundColor: 'transparent',
  },
  themeToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  subtitle: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 8,
    backgroundColor: 'transparent',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 12,
    backgroundColor: 'transparent',
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardBanner: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    padding: 12,
    backgroundColor: 'transparent',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardGame: {
    fontSize: 13,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    backgroundColor: 'transparent',
  },
  itemCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
  },
  itemCountText: {
    fontSize: 12,
  },
});
