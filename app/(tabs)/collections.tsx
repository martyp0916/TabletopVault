import { StyleSheet, ScrollView, Pressable, Dimensions, ActivityIndicator, TextInput, Modal } from 'react-native';
import { Text, View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useCollections } from '@/hooks/useCollections';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 12) / 2;

// Colors for collections (cycle through these)
const COLLECTION_COLORS = [
  '#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899',
  '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

export default function CollectionsScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});

  const colors = isDarkMode ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const { collections, loading, createCollection, refresh } = useCollections(user?.id);

  // Fetch item counts for each collection
  useEffect(() => {
    if (collections.length > 0) {
      const fetchCounts = async () => {
        const counts: Record<string, number> = {};
        for (const col of collections) {
          const { count } = await supabase
            .from('items')
            .select('*', { count: 'exact', head: true })
            .eq('collection_id', col.id);
          counts[col.id] = count || 0;
        }
        setItemCounts(counts);
      };
      fetchCounts();
    }
  }, [collections]);

  const handleCreateCollection = async () => {
    if (!newName.trim()) return;

    setCreating(true);
    const { error } = await createCollection(newName.trim(), newDescription.trim() || undefined);
    setCreating(false);

    if (!error) {
      setShowModal(false);
      setNewName('');
      setNewDescription('');
    }
  };

  const getCollectionColor = (index: number) => {
    return COLLECTION_COLORS[index % COLLECTION_COLORS.length];
  };

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
      <Pressable
        style={[styles.addButton, { borderColor: colors.border }]}
        onPress={() => setShowModal(true)}
      >
        <FontAwesome name="plus" size={20} color={colors.textSecondary} />
        <Text style={[styles.addButtonText, { color: colors.textSecondary }]}>
          New Collection
        </Text>
      </Pressable>

      {/* Collections Grid */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : collections.length === 0 ? (
        <View style={styles.emptyState}>
          <FontAwesome name="folder-open-o" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No collections yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Create your first collection to organize your miniatures
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {collections.map((collection, index) => (
            <Pressable
              key={collection.id}
              style={[styles.card, { backgroundColor: colors.card }]}
              onPress={() => router.push(`/collection/${collection.id}`)}
            >
              {/* Color Banner */}
              <View style={[styles.cardBanner, { backgroundColor: getCollectionColor(index) }]}>
                <FontAwesome name="folder" size={32} color="rgba(255,255,255,0.9)" />
              </View>

              {/* Card Content */}
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                  {collection.name}
                </Text>
                <Text style={[styles.cardGame, { color: colors.textSecondary }]} numberOfLines={1}>
                  {collection.description || 'No description'}
                </Text>
                <View style={styles.cardFooter}>
                  <View style={styles.itemCount}>
                    <FontAwesome name="cube" size={12} color={colors.textSecondary} />
                    <Text style={[styles.itemCountText, { color: colors.textSecondary }]}>
                      {itemCounts[collection.id] ?? 0} items
                    </Text>
                  </View>
                  <FontAwesome name="chevron-right" size={12} color={colors.textSecondary} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* Bottom Spacing */}
      <View style={{ height: 120 }} />

      {/* Create Collection Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Collection</Text>
            <Pressable onPress={handleCreateCollection} disabled={creating || !newName.trim()}>
              <Text style={[
                styles.modalSave,
                { color: newName.trim() ? '#3b82f6' : colors.textSecondary }
              ]}>
                {creating ? 'Saving...' : 'Save'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Space Marines, Pile of Shame"
                placeholderTextColor={colors.textSecondary}
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="What's this collection for?"
                placeholderTextColor={colors.textSecondary}
                value={newDescription}
                onChangeText={setNewDescription}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
    backgroundColor: 'transparent',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
    backgroundColor: 'transparent',
  },
  modalCancel: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    padding: 24,
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
  textArea: {
    height: 100,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
});
