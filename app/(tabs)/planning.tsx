import { StyleSheet, ScrollView, Pressable, RefreshControl, Modal, TextInput, Alert, View } from 'react-native';
import { Text } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useState, useCallback } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { usePaintQueue } from '@/hooks/usePaintQueue';
import { usePaintingGoals } from '@/hooks/usePaintingGoals';
import { useProgressStats } from '@/hooks/useProgressStats';
import { useItems } from '@/hooks/useItems';
import { STATUS_COLORS, getEffectiveStatus, GoalType, Item } from '@/types/database';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function PlanningScreen() {
  const { isDarkMode, toggleTheme, backgroundImageUrl } = useTheme();
  const hasBackground = !!backgroundImageUrl;
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const { user } = useAuth();
  const { queueItems, loading: queueLoading, addToQueue, removeFromQueue, moveUp, moveDown, refresh: refreshQueue } = usePaintQueue(user?.id);
  const { goals, activeGoals, loading: goalsLoading, createGoal, updateProgress, deleteGoal, refresh: refreshGoals } = usePaintingGoals(user?.id);
  const { overallProgress, collectionProgress, loading: progressLoading, refresh: refreshProgress } = useProgressStats(user?.id);
  const { items } = useItems(user?.id);

  const [refreshing, setRefreshing] = useState(false);

  // Add to queue modal state
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [selectedItemForQueue, setSelectedItemForQueue] = useState<Item | null>(null);
  const [queueNotes, setQueueNotes] = useState('');

  // Add goal modal state
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('models_painted');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDeadline, setGoalDeadline] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loading = queueLoading || goalsLoading || progressLoading;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshQueue(), refreshGoals(), refreshProgress()]);
    setRefreshing(false);
  }, [refreshQueue, refreshGoals, refreshProgress]);

  // Get items not already in queue
  const availableItems = items.filter(item => {
    const effectiveStatus = getEffectiveStatus(item);
    return effectiveStatus !== 'painted' && !queueItems.some(q => q.item_id === item.id);
  });

  const handleAddToQueue = async () => {
    if (!selectedItemForQueue) return;

    const { error } = await addToQueue(selectedItemForQueue.id, queueNotes);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setShowQueueModal(false);
      setSelectedItemForQueue(null);
      setQueueNotes('');
    }
  };

  const handleRemoveFromQueue = async (queueId: string) => {
    Alert.alert(
      'Remove from Queue',
      'Remove this item from your paint queue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error } = await removeFromQueue(queueId);
            if (error) Alert.alert('Error', error.message);
          },
        },
      ]
    );
  };

  const handleCreateGoal = async () => {
    const target = parseInt(goalTarget, 10);
    if (!goalTitle.trim()) {
      Alert.alert('Error', 'Please enter a goal title');
      return;
    }
    if (isNaN(target) || target < 1) {
      Alert.alert('Error', 'Please enter a valid target number');
      return;
    }

    const { error } = await createGoal(
      goalTitle,
      goalType,
      target,
      goalDeadline?.toISOString().split('T')[0]
    );

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setShowGoalModal(false);
      setGoalTitle('');
      setGoalTarget('');
      setGoalDeadline(null);
    }
  };

  const handleDeleteGoal = (goalId: string, title: string) => {
    Alert.alert(
      'Delete Goal',
      `Delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteGoal(goalId);
            if (error) Alert.alert('Error', error.message);
          },
        },
      ]
    );
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    const now = new Date();
    const isOverdue = date < now;
    const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { formatted, isOverdue };
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: hasBackground ? 'transparent' : colors.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.textSecondary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerLeft, hasBackground && { backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 }]}>
          <Text style={[styles.title, { color: colors.text }]}>Planning</Text>
        </View>
        <Pressable
          style={[styles.themeToggle, { backgroundColor: colors.card }]}
          onPress={toggleTheme}
        >
          <FontAwesome
            name={isDarkMode ? 'sun-o' : 'moon-o'}
            size={18}
            color={colors.text}
          />
        </Pressable>
      </View>

      {/* Overall Progress Card */}
      <View style={[styles.progressCard, { backgroundColor: colors.card }]}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressTitle, { color: colors.text }]}>Overall Progress</Text>
          <Text style={[styles.progressPercent, { color: '#10b981' }]}>
            {overallProgress.percentage}%
          </Text>
        </View>
        <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${overallProgress.percentage}%`, backgroundColor: '#10b981' },
            ]}
          />
        </View>
        <Text style={[styles.progressSubtext, { color: colors.textSecondary }]}>
          {overallProgress.paintedModels}/{overallProgress.totalModels} models painted
        </Text>

        {/* Status breakdown */}
        <View style={styles.statusBreakdown}>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS.nib }]} />
            <Text style={[styles.statusCount, { color: colors.text }]}>{overallProgress.nibModels}</Text>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Unbuilt</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS.assembled }]} />
            <Text style={[styles.statusCount, { color: colors.text }]}>{overallProgress.assembledModels}</Text>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Built</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS.primed }]} />
            <Text style={[styles.statusCount, { color: colors.text }]}>{overallProgress.primedModels}</Text>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Primed</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS.painted }]} />
            <Text style={[styles.statusCount, { color: colors.text }]}>{overallProgress.paintedModels}</Text>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Painted</Text>
          </View>
        </View>
      </View>

      {/* Paint Queue Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionLabelContainer, hasBackground && { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PAINT QUEUE</Text>
          </View>
          <Pressable onPress={() => setShowQueueModal(true)}>
            <Text style={[styles.addButton, { color: '#991b1b' }]}>+ Add</Text>
          </Pressable>
        </View>

        {queueItems.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <FontAwesome name="paint-brush" size={24} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Your paint queue is empty
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Add items you want to paint next
            </Text>
          </View>
        ) : (
          <View style={[styles.queueContainer, { backgroundColor: colors.card }]}>
            {queueItems.map((queueItem, index) => {
              const item = queueItem.item;
              if (!item) return null;
              const effectiveStatus = getEffectiveStatus(item);
              const statusColor = STATUS_COLORS[effectiveStatus];

              return (
                <Pressable
                  key={queueItem.id}
                  style={[
                    styles.queueItem,
                    index !== queueItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                  onPress={() => router.push(`/item/${item.id}`)}
                >
                  <View style={styles.queueItemLeft}>
                    <View style={styles.queueArrows}>
                      <Pressable
                        onPress={() => moveUp(queueItem.id)}
                        disabled={index === 0}
                        style={styles.arrowButton}
                      >
                        <FontAwesome
                          name="chevron-up"
                          size={12}
                          color={index === 0 ? colors.border : colors.textSecondary}
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => moveDown(queueItem.id)}
                        disabled={index === queueItems.length - 1}
                        style={styles.arrowButton}
                      >
                        <FontAwesome
                          name="chevron-down"
                          size={12}
                          color={index === queueItems.length - 1 ? colors.border : colors.textSecondary}
                        />
                      </Pressable>
                    </View>
                    <View style={[styles.queueStatusDot, { backgroundColor: statusColor }]} />
                    <View style={styles.queueItemInfo}>
                      <Text style={[styles.queueItemName, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.queueItemDetail, { color: colors.textSecondary }]}>
                        {item.primed_count || 0} primed, {item.assembled_count || 0} built
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => handleRemoveFromQueue(queueItem.id)}
                    style={styles.removeButton}
                  >
                    <FontAwesome name="times" size={16} color={colors.textSecondary} />
                  </Pressable>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* Goals Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionLabelContainer, hasBackground && { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>GOALS</Text>
          </View>
          <Pressable onPress={() => setShowGoalModal(true)}>
            <Text style={[styles.addButton, { color: '#991b1b' }]}>+ New</Text>
          </Pressable>
        </View>

        {goals.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <FontAwesome name="flag" size={24} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No goals yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Set a painting goal to stay motivated
            </Text>
          </View>
        ) : (
          <View style={[styles.goalsContainer, { backgroundColor: colors.card }]}>
            {goals.map((goal, index) => {
              const progress = goal.target_count > 0
                ? Math.round((goal.current_count / goal.target_count) * 100)
                : 0;
              const deadlineInfo = goal.deadline ? formatDeadline(goal.deadline) : null;

              return (
                <Pressable
                  key={goal.id}
                  style={[
                    styles.goalItem,
                    index !== goals.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                  onLongPress={() => handleDeleteGoal(goal.id, goal.title)}
                >
                  <View style={styles.goalHeader}>
                    <View style={styles.goalTitleRow}>
                      {goal.is_completed ? (
                        <FontAwesome name="check-circle" size={16} color="#10b981" />
                      ) : (
                        <FontAwesome name="flag" size={16} color="#991b1b" />
                      )}
                      <Text
                        style={[
                          styles.goalTitle,
                          { color: colors.text },
                          goal.is_completed && styles.goalTitleCompleted,
                        ]}
                        numberOfLines={1}
                      >
                        {goal.title}
                      </Text>
                    </View>
                    {deadlineInfo && !goal.is_completed && (
                      <Text
                        style={[
                          styles.goalDeadline,
                          { color: deadlineInfo.isOverdue ? '#ef4444' : colors.textSecondary },
                        ]}
                      >
                        {deadlineInfo.isOverdue ? 'Overdue' : `Due ${deadlineInfo.formatted}`}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.goalProgressBg, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.goalProgressFill,
                        {
                          width: `${progress}%`,
                          backgroundColor: goal.is_completed ? '#10b981' : '#991b1b',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.goalProgressText, { color: colors.textSecondary }]}>
                    {goal.current_count}/{goal.target_count}
                    {goal.is_completed && ' - Complete!'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* Collection Progress Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionLabelContainer, hasBackground && { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>COLLECTION PROGRESS</Text>
          </View>
        </View>

        {collectionProgress.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <FontAwesome name="folder-open" size={24} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No collections yet
            </Text>
          </View>
        ) : (
          <View style={[styles.collectionsContainer, { backgroundColor: colors.card }]}>
            {collectionProgress.map((cp, index) => (
              <Pressable
                key={cp.collection.id}
                style={[
                  styles.collectionItem,
                  index !== collectionProgress.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
                onPress={() => router.push(`/collection/${cp.collection.id}`)}
              >
                <View style={styles.collectionHeader}>
                  <Text style={[styles.collectionName, { color: colors.text }]} numberOfLines={1}>
                    {cp.collection.name}
                  </Text>
                  <Text style={[styles.collectionPercent, { color: cp.percentage === 100 ? '#10b981' : colors.textSecondary }]}>
                    {cp.percentage}%
                  </Text>
                </View>
                <View style={[styles.collectionProgressBg, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.collectionProgressFill,
                      {
                        width: `${cp.percentage}%`,
                        backgroundColor: cp.percentage === 100 ? '#10b981' : '#991b1b',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.collectionModels, { color: colors.textSecondary }]}>
                  {cp.paintedModels}/{cp.totalModels} models
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Bottom Spacing */}
      <View style={{ height: 120 }} />

      {/* Add to Queue Modal */}
      <Modal
        visible={showQueueModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQueueModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add to Paint Queue</Text>
              <Pressable onPress={() => setShowQueueModal(false)}>
                <FontAwesome name="times" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={[styles.modalLabel, { color: colors.text }]}>Select Item</Text>
            <ScrollView style={styles.itemList} showsVerticalScrollIndicator={false}>
              {availableItems.length === 0 ? (
                <Text style={[styles.noItemsText, { color: colors.textSecondary }]}>
                  No unpainted items available
                </Text>
              ) : (
                availableItems.map((item) => {
                  const effectiveStatus = getEffectiveStatus(item);
                  const isSelected = selectedItemForQueue?.id === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      style={[
                        styles.itemOption,
                        { borderColor: isSelected ? '#991b1b' : colors.border },
                        isSelected && { backgroundColor: '#991b1b20' },
                      ]}
                      onPress={() => setSelectedItemForQueue(item)}
                    >
                      <View style={[styles.itemOptionDot, { backgroundColor: STATUS_COLORS[effectiveStatus] }]} />
                      <Text style={[styles.itemOptionName, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            <Text style={[styles.modalLabel, { color: colors.text, marginTop: 16 }]}>Notes (optional)</Text>
            <TextInput
              style={[styles.notesInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g., Finish highlighting"
              placeholderTextColor={colors.textSecondary}
              value={queueNotes}
              onChangeText={setQueueNotes}
              multiline
            />

            <Pressable
              style={[styles.modalButton, !selectedItemForQueue && { opacity: 0.5 }]}
              onPress={handleAddToQueue}
              disabled={!selectedItemForQueue}
            >
              <Text style={styles.modalButtonText}>Add to Queue</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Add Goal Modal */}
      <Modal
        visible={showGoalModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGoalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>New Goal</Text>
              <Pressable onPress={() => setShowGoalModal(false)}>
                <FontAwesome name="times" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={[styles.modalLabel, { color: colors.text }]}>Goal Title</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g., Paint 10 models this month"
              placeholderTextColor={colors.textSecondary}
              value={goalTitle}
              onChangeText={setGoalTitle}
            />

            <Text style={[styles.modalLabel, { color: colors.text }]}>Target Count</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g., 10"
              placeholderTextColor={colors.textSecondary}
              value={goalTarget}
              onChangeText={setGoalTarget}
              keyboardType="number-pad"
            />

            <Text style={[styles.modalLabel, { color: colors.text }]}>Deadline (optional)</Text>
            <Pressable
              style={[styles.dateButton, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ color: goalDeadline ? colors.text : colors.textSecondary }}>
                {goalDeadline
                  ? goalDeadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                  : 'Select deadline'}
              </Text>
              {goalDeadline && (
                <Pressable onPress={() => setGoalDeadline(null)}>
                  <FontAwesome name="times" size={14} color={colors.textSecondary} />
                </Pressable>
              )}
            </Pressable>

            {showDatePicker && (
              <DateTimePicker
                value={goalDeadline || new Date()}
                mode="date"
                display="spinner"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) setGoalDeadline(date);
                }}
                minimumDate={new Date()}
              />
            )}

            <Pressable
              style={[styles.modalButton, (!goalTitle.trim() || !goalTarget) && { opacity: 0.5 }]}
              onPress={handleCreateGoal}
              disabled={!goalTitle.trim() || !goalTarget}
            >
              <Text style={styles.modalButtonText}>Create Goal</Text>
            </Pressable>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  headerLeft: {
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCard: {
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressPercent: {
    fontSize: 24,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressSubtext: {
    fontSize: 13,
    marginTop: 8,
  },
  statusBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusCount: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabelContainer: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  addButton: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCard: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: 4,
  },
  queueContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  queueItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  queueArrows: {
    marginRight: 12,
  },
  arrowButton: {
    padding: 4,
  },
  queueStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  queueItemInfo: {
    flex: 1,
  },
  queueItemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  queueItemDetail: {
    fontSize: 12,
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
  goalsContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  goalItem: {
    padding: 14,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  goalTitleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  goalDeadline: {
    fontSize: 12,
    fontWeight: '500',
  },
  goalProgressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  goalProgressText: {
    fontSize: 12,
    marginTop: 6,
  },
  collectionsContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  collectionItem: {
    padding: 14,
  },
  collectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  collectionName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  collectionPercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  collectionProgressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  collectionProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  collectionModels: {
    fontSize: 12,
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  itemList: {
    maxHeight: 200,
  },
  noItemsText: {
    textAlign: 'center',
    paddingVertical: 20,
  },
  itemOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  itemOptionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  itemOptionName: {
    fontSize: 15,
    flex: 1,
  },
  textInput: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: 16,
  },
  notesInput: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: '#991b1b',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
