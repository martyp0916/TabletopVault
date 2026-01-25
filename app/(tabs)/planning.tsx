import { StyleSheet, ScrollView, Pressable, RefreshControl, Modal, TextInput, Alert, View, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useState, useCallback } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
// Paint queue hook no longer needed - Progress Queue auto-populates from item status
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
  const { goals, activeGoals, loading: goalsLoading, createGoal, updateProgress, deleteGoal, refresh: refreshGoals } = usePaintingGoals(user?.id);
  const { overallProgress, collectionProgress, loading: progressLoading, refresh: refreshProgress } = useProgressStats(user?.id);
  const { items, loading: itemsLoading, refresh: refreshItems } = useItems(user?.id);

  const [refreshing, setRefreshing] = useState(false);

  // Progress Queue modal state
  const [showQueueModal, setShowQueueModal] = useState(false);

  // Add goal modal state
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('models_painted');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDeadline, setGoalDeadline] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loading = itemsLoading || goalsLoading || progressLoading;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshItems(), refreshGoals(), refreshProgress()]);
    setRefreshing(false);
  }, [refreshItems, refreshGoals, refreshProgress]);

  // Progress Queue: Auto-populate with items that have unpainted models (nib, assembled, or primed)
  const progressQueueItems = items.filter(item => {
    const nibCount = item.nib_count || 0;
    const assembledCount = item.assembled_count || 0;
    const primedCount = item.primed_count || 0;
    return nibCount > 0 || assembledCount > 0 || primedCount > 0;
  }).sort((a, b) => {
    // Sort by most "ready to paint" first (primed > assembled > nib)
    const aScore = (a.primed_count || 0) * 3 + (a.assembled_count || 0) * 2 + (a.nib_count || 0);
    const bScore = (b.primed_count || 0) * 3 + (b.assembled_count || 0) * 2 + (b.nib_count || 0);
    return bScore - aScore;
  });

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
    <View style={[styles.container, { backgroundColor: hasBackground ? 'transparent' : colors.background }]}>
      <ScrollView
        style={styles.scrollView}
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

      {/* Progress Queue Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionLabelContainer, hasBackground && { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PROGRESS QUEUE</Text>
          </View>
          {progressQueueItems.length > 5 && (
            <Pressable
              style={styles.seeAllButtonContainer}
              onPress={() => setShowQueueModal(true)}
            >
              <Text style={styles.seeAllButtonText}>
                See All ({progressQueueItems.length})
              </Text>
              <FontAwesome name="chevron-right" size={10} color="#fff" />
            </Pressable>
          )}
        </View>

        {progressQueueItems.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <FontAwesome name="check-circle" size={24} color="#10b981" />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              All models are painted!
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Add new items to your collection to see them here
            </Text>
          </View>
        ) : (
          <View style={[styles.queueContainer, { backgroundColor: colors.card }]}>
            {progressQueueItems.slice(0, 5).map((item, index) => {
              const effectiveStatus = getEffectiveStatus(item);
              const statusColor = STATUS_COLORS[effectiveStatus];
              const nibCount = item.nib_count || 0;
              const assembledCount = item.assembled_count || 0;
              const primedCount = item.primed_count || 0;

              // Build status details string
              const statusParts = [];
              if (primedCount > 0) statusParts.push(`${primedCount} primed`);
              if (assembledCount > 0) statusParts.push(`${assembledCount} assembled`);
              if (nibCount > 0) statusParts.push(`${nibCount} unbuilt`);
              const statusDetail = statusParts.join(', ');
              const displayedCount = Math.min(progressQueueItems.length, 5);

              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.queueItem,
                    index !== displayedCount - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                  onPress={() => router.push(`/item/${item.id}`)}
                >
                  <View style={styles.queueItemLeft}>
                    <View style={[styles.queueStatusDot, { backgroundColor: statusColor }]} />
                    <View style={styles.queueItemInfo}>
                      <Text style={[styles.queueItemName, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.queueItemDetail, { color: colors.textSecondary }]}>
                        {statusDetail}
                      </Text>
                    </View>
                  </View>
                  <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
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
          <Pressable
            style={styles.addButtonContainer}
            onPress={() => setShowGoalModal(true)}
          >
            <FontAwesome name="plus" size={12} color="#fff" />
            <Text style={styles.addButtonText}>New</Text>
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
      </ScrollView>

      {/* Progress Queue Modal */}
      <Modal
        visible={showQueueModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQueueModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.queueModalContainer, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Progress Queue</Text>
              <Pressable onPress={() => setShowQueueModal(false)}>
                <FontAwesome name="times" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={[styles.queueModalSubtitle, { color: colors.textSecondary }]}>
              {progressQueueItems.length} items need painting
            </Text>

            <ScrollView
              style={styles.queueModalList}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.queueModalListContent}
            >
              {progressQueueItems.map((item, index) => {
                const effectiveStatus = getEffectiveStatus(item);
                const statusColor = STATUS_COLORS[effectiveStatus];
                const nibCount = item.nib_count || 0;
                const assembledCount = item.assembled_count || 0;
                const primedCount = item.primed_count || 0;

                const statusParts = [];
                if (primedCount > 0) statusParts.push(`${primedCount} primed`);
                if (assembledCount > 0) statusParts.push(`${assembledCount} assembled`);
                if (nibCount > 0) statusParts.push(`${nibCount} unbuilt`);
                const statusDetail = statusParts.join(', ');

                return (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.queueModalItem,
                      { borderBottomColor: colors.border },
                    ]}
                    onPress={() => {
                      setShowQueueModal(false);
                      router.push(`/item/${item.id}`);
                    }}
                  >
                    <View style={styles.queueItemLeft}>
                      <View style={[styles.queueStatusDot, { backgroundColor: statusColor }]} />
                      <View style={styles.queueItemInfo}>
                        <Text style={[styles.queueItemName, { color: colors.text }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={[styles.queueItemDetail, { color: colors.textSecondary }]}>
                          {statusDetail}
                        </Text>
                      </View>
                    </View>
                    <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
                  </Pressable>
                );
              })}
            </ScrollView>
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalDismiss} onPress={() => setShowGoalModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>New Goal</Text>
              <Pressable onPress={() => setShowGoalModal(false)}>
                <FontAwesome name="times" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
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
  addButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#991b1b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  seeAllButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#991b1b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  seeAllButtonText: {
    color: '#fff',
    fontSize: 13,
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
  modalDismiss: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  queueModalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    height: '80%',
  },
  queueModalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  queueModalList: {
    flex: 1,
  },
  queueModalListContent: {
    paddingBottom: 20,
  },
  queueModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
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
  textInput: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: 16,
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
