/**
 * Premium Context Provider
 *
 * Manages premium subscription status and enforces free tier limits.
 * - Free Tier: 2 collections, 10 items per collection, no Planning tab
 * - Premium Tier: Unlimited collections and items, full Planning access
 */
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Modal, StyleSheet, Pressable, View } from 'react-native';
import { Text } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from './auth';
import { supabase } from './supabase';
import Colors from '@/constants/Colors';
import { useTheme } from './theme';

// Free tier limits
export const FREE_TIER_LIMITS = {
  MAX_COLLECTIONS: 2,
  MAX_ITEMS_PER_COLLECTION: 5,
};

export type UpgradeReason = 'collections' | 'items' | 'planning' | 'export';

interface PremiumContextType {
  isPremium: boolean;
  loading: boolean;
  limits: typeof FREE_TIER_LIMITS;
  // Limit checking helpers
  canCreateCollection: (currentCount: number) => boolean;
  canCreateItem: (currentItemCount: number) => boolean;
  // Upgrade prompt management
  showUpgradePrompt: (reason: UpgradeReason) => void;
  hideUpgradePrompt: () => void;
  // Refresh premium status
  refresh: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

interface PremiumProviderProps {
  children: ReactNode;
}

export function PremiumProvider({ children }: PremiumProviderProps) {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [upgradePromptVisible, setUpgradePromptVisible] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason>('collections');

  // Fetch premium status from profile
  const fetchPremiumStatus = useCallback(async () => {
    if (!user?.id) {
      setIsPremium(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching premium status:', error);
        // Fail open - default to premium to avoid blocking users
        setIsPremium(true);
      } else {
        setIsPremium(data?.is_premium ?? false);
      }
    } catch (e) {
      console.error('Error fetching premium status:', e);
      // Fail open
      setIsPremium(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPremiumStatus();
  }, [fetchPremiumStatus]);

  // Limit checking helpers
  const canCreateCollection = useCallback((currentCount: number): boolean => {
    if (isPremium) return true;
    return currentCount < FREE_TIER_LIMITS.MAX_COLLECTIONS;
  }, [isPremium]);

  const canCreateItem = useCallback((currentItemCount: number): boolean => {
    if (isPremium) return true;
    return currentItemCount < FREE_TIER_LIMITS.MAX_ITEMS_PER_COLLECTION;
  }, [isPremium]);

  // Upgrade prompt management
  const showUpgradePrompt = useCallback((reason: UpgradeReason) => {
    setUpgradeReason(reason);
    setUpgradePromptVisible(true);
  }, []);

  const hideUpgradePrompt = useCallback(() => {
    setUpgradePromptVisible(false);
  }, []);

  // Handle upgrade button press (placeholder for future payment integration)
  const handleUpgrade = () => {
    // TODO: Implement payment flow
    // For now, just close the modal
    hideUpgradePrompt();
    // Could navigate to a subscription page or open in-app purchase
  };

  // Get upgrade prompt content based on reason
  const getUpgradeContent = () => {
    switch (upgradeReason) {
      case 'collections':
        return {
          title: 'Collection Limit Reached',
          message: `You've reached the free tier limit of ${FREE_TIER_LIMITS.MAX_COLLECTIONS} collections.`,
        };
      case 'items':
        return {
          title: 'Item Limit Reached',
          message: `You've reached the free tier limit of ${FREE_TIER_LIMITS.MAX_ITEMS_PER_COLLECTION} items per collection.`,
        };
      case 'planning':
        return {
          title: 'Premium Feature',
          message: 'The Planning tab is a premium feature.',
        };
      case 'export':
        return {
          title: 'Premium Feature',
          message: 'Exporting collection data is a premium feature.',
        };
      default:
        return {
          title: 'Upgrade to Premium',
          message: 'Unlock all features with Premium.',
        };
    }
  };

  const upgradeContent = getUpgradeContent();

  return (
    <PremiumContext.Provider
      value={{
        isPremium,
        loading,
        limits: FREE_TIER_LIMITS,
        canCreateCollection,
        canCreateItem,
        showUpgradePrompt,
        hideUpgradePrompt,
        refresh: fetchPremiumStatus,
      }}
    >
      {children}

      {/* Upgrade Prompt Modal */}
      <Modal
        visible={upgradePromptVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={hideUpgradePrompt}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.premiumBadge}>
                <FontAwesome name="star" size={24} color="#991b1b" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {upgradeContent.title}
              </Text>
              <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
                {upgradeContent.message}
              </Text>
            </View>

            {/* Benefits */}
            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <FontAwesome name="check" size={14} color="#10b981" />
                <Text style={[styles.benefitText, { color: colors.text }]}>
                  Unlimited collections
                </Text>
              </View>
              <View style={styles.benefitItem}>
                <FontAwesome name="check" size={14} color="#10b981" />
                <Text style={[styles.benefitText, { color: colors.text }]}>
                  Unlimited items per collection
                </Text>
              </View>
              <View style={styles.benefitItem}>
                <FontAwesome name="check" size={14} color="#10b981" />
                <Text style={[styles.benefitText, { color: colors.text }]}>
                  Planning & Progress tracking
                </Text>
              </View>
              <View style={styles.benefitItem}>
                <FontAwesome name="check" size={14} color="#10b981" />
                <Text style={[styles.benefitText, { color: colors.text }]}>
                  Painting goals & wishlist
                </Text>
              </View>
              <View style={styles.benefitItem}>
                <FontAwesome name="check" size={14} color="#10b981" />
                <Text style={[styles.benefitText, { color: colors.text }]}>
                  Export collection data
                </Text>
              </View>
              <View style={styles.benefitItem}>
                <FontAwesome name="check" size={14} color="#10b981" />
                <Text style={[styles.benefitText, { color: colors.text }]}>
                  Goal deadline notifications
                </Text>
              </View>
            </View>

            {/* Buttons */}
            <Pressable style={styles.upgradeButton} onPress={handleUpgrade}>
              <FontAwesome name="star" size={16} color="#fff" />
              <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
            </Pressable>

            <Pressable style={styles.laterButton} onPress={hideUpgradePrompt}>
              <Text style={[styles.laterButtonText, { color: colors.textSecondary }]}>
                Maybe Later
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  premiumBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  benefitsList: {
    width: '100%',
    marginBottom: 24,
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 15,
  },
  upgradeButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#991b1b',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  laterButton: {
    marginTop: 12,
    padding: 12,
  },
  laterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
