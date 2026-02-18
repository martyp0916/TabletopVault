/**
 * Premium Context Provider
 *
 * Manages premium subscription status using RevenueCat and enforces free tier limits.
 * - Free Tier: 2 collections, 5 items per collection, no Planning tab
 * - Premium Tier: Unlimited collections and items, full Planning access
 */
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Modal, StyleSheet, Pressable, View, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from './auth';
import { supabase } from './supabase';
import Colors from '@/constants/Colors';
import { useTheme } from './theme';
import {
  initializeRevenueCat,
  checkPremiumStatus as checkRevenueCatStatus,
  getOfferings,
  purchasePackage,
  restorePurchases,
  identifyUser,
  addCustomerInfoListener,
  isRevenueCatConfigured,
} from './revenuecat';
import type { PurchasesPackage } from 'react-native-purchases';

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
  // RevenueCat purchase functions
  packages: PurchasesPackage[];
  purchaseLoading: boolean;
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
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

  // RevenueCat state
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [revenueCatReady, setRevenueCatReady] = useState(false);

  // Initialize RevenueCat and fetch premium status
  const initializeAndFetchStatus = useCallback(async () => {
    if (!user?.id) {
      setIsPremium(false);
      setLoading(false);
      return;
    }

    try {
      // Initialize RevenueCat with user ID
      await initializeRevenueCat(user.id);
      await identifyUser(user.id);
      setRevenueCatReady(isRevenueCatConfigured());

      // Check premium status from RevenueCat
      if (isRevenueCatConfigured()) {
        const hasPremium = await checkRevenueCatStatus();
        setIsPremium(hasPremium);

        // Sync to Supabase as backup
        await supabase
          .from('profiles')
          .update({ is_premium: hasPremium })
          .eq('id', user.id);

        // Fetch available packages
        const availablePackages = await getOfferings();
        setPackages(availablePackages);
      } else {
        // Fallback to Supabase if RevenueCat not configured
        const { data, error } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching premium status:', error);
          setIsPremium(false);
        } else {
          setIsPremium(data?.is_premium ?? false);
        }
      }
    } catch (e) {
      console.error('Error initializing premium status:', e);
      // Fail closed - default to free tier on error
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    initializeAndFetchStatus();
  }, [initializeAndFetchStatus]);

  // Listen for RevenueCat subscription changes
  useEffect(() => {
    if (!user?.id || !revenueCatReady) return;

    const unsubscribe = addCustomerInfoListener((info) => {
      const hasPremium = info.entitlements.active['premium'] !== undefined;
      setIsPremium(hasPremium);

      // Sync to Supabase
      supabase
        .from('profiles')
        .update({ is_premium: hasPremium })
        .eq('id', user.id);
    });

    return unsubscribe;
  }, [user?.id, revenueCatReady]);

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

  // Purchase a subscription
  const purchase = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    setPurchaseLoading(true);
    try {
      const result = await purchasePackage(pkg);

      if (result.success) {
        setIsPremium(true);
        hideUpgradePrompt();
        Alert.alert(
          'Welcome to Premium!',
          'Thank you for upgrading. You now have access to all features.',
          [{ text: 'OK' }]
        );
        return true;
      }

      if (result.cancelled) {
        // User cancelled, no alert needed
        return false;
      }

      if (result.error) {
        Alert.alert('Purchase Failed', result.error);
      }
      return false;
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', 'An error occurred during purchase. Please try again.');
      return false;
    } finally {
      setPurchaseLoading(false);
    }
  }, [hideUpgradePrompt]);

  // Restore purchases
  const restore = useCallback(async (): Promise<boolean> => {
    setPurchaseLoading(true);
    try {
      const result = await restorePurchases();

      if (result.isPremium) {
        setIsPremium(true);
        hideUpgradePrompt();
        Alert.alert(
          'Purchases Restored',
          'Your premium subscription has been restored.',
          [{ text: 'OK' }]
        );
        return true;
      } else {
        Alert.alert(
          'No Purchases Found',
          'We couldn\'t find any previous purchases to restore.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Error', 'An error occurred while restoring purchases.');
      return false;
    } finally {
      setPurchaseLoading(false);
    }
  }, [hideUpgradePrompt]);

  // Handle upgrade button press
  const handleUpgrade = useCallback(async () => {
    if (packages.length > 0) {
      // Purchase the first available package (usually monthly)
      await purchase(packages[0]);
    } else {
      Alert.alert(
        'Coming Soon',
        'Premium subscriptions will be available soon.',
        [{ text: 'OK', onPress: hideUpgradePrompt }]
      );
    }
  }, [packages, purchase, hideUpgradePrompt]);

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

  // Get price display
  const getPriceDisplay = () => {
    if (packages.length === 0) return null;
    const pkg = packages[0];
    return pkg.product.priceString;
  };

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
        refresh: initializeAndFetchStatus,
        packages,
        purchaseLoading,
        purchase,
        restore,
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

            {/* Price Display */}
            {getPriceDisplay() && (
              <View style={styles.priceContainer}>
                <Text style={[styles.priceText, { color: colors.text }]}>
                  {getPriceDisplay()}/month
                </Text>
              </View>
            )}

            {/* Upgrade Button */}
            <Pressable
              style={[styles.upgradeButton, purchaseLoading && styles.upgradeButtonDisabled]}
              onPress={handleUpgrade}
              disabled={purchaseLoading}
            >
              {purchaseLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <FontAwesome name="star" size={16} color="#fff" />
                  <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
                </>
              )}
            </Pressable>

            {/* Restore Purchases */}
            <Pressable
              style={styles.restoreButton}
              onPress={restore}
              disabled={purchaseLoading}
            >
              <Text style={[styles.restoreButtonText, { color: colors.textSecondary }]}>
                Restore Purchases
              </Text>
            </Pressable>

            {/* Maybe Later */}
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
    marginBottom: 20,
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
  priceContainer: {
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(153, 27, 27, 0.1)',
    borderRadius: 8,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
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
  upgradeButtonDisabled: {
    opacity: 0.7,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  restoreButton: {
    marginTop: 12,
    padding: 8,
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  laterButton: {
    marginTop: 4,
    padding: 12,
  },
  laterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
