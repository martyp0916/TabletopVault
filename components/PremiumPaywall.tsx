/**
 * Premium Paywall Component
 *
 * Full-screen component shown in place of premium-only features for free users.
 * Used for the Planning tab paywall.
 */
import { StyleSheet, Pressable, View, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useTheme } from '@/lib/theme';
import { FREE_TIER_LIMITS, usePremium } from '@/lib/premium';

export function PremiumPaywall() {
  const { isDarkMode, toggleTheme, backgroundImageUrl } = useTheme();
  const { packages, purchase, restore, purchaseLoading } = usePremium();
  const hasBackground = !!backgroundImageUrl;
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const handleUpgrade = async () => {
    if (packages.length > 0) {
      await purchase(packages[0]);
    }
  };

  const handleRestore = async () => {
    await restore();
  };

  // Get price display - hardcoded to match App Store pricing
  const getPriceDisplay = () => {
    return '$2.99';
  };

  return (
    <View style={[styles.container, { backgroundColor: hasBackground ? 'transparent' : colors.background }]}>
      {/* Header - matches Planning tab header */}
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Premium Badge */}
        <View style={styles.premiumBadge}>
          <FontAwesome name="star" size={40} color="#991b1b" />
        </View>

        {/* Title */}
        <Text style={[styles.paywallTitle, { color: colors.text }]}>
          Premium Feature
        </Text>

        {/* Description */}
        <Text style={[styles.paywallDescription, { color: colors.textSecondary }]}>
          Track your painting progress, set goals, and manage your paint queue with Premium.
        </Text>

        {/* Benefits Card */}
        <View style={[styles.benefitsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.benefitsTitle, { color: colors.text }]}>
            Premium includes:
          </Text>

          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <FontAwesome name="list-ul" size={16} color="#991b1b" />
              </View>
              <View style={styles.benefitContent}>
                <Text style={[styles.benefitName, { color: colors.text }]}>
                  Progress Queue
                </Text>
                <Text style={[styles.benefitDesc, { color: colors.textSecondary }]}>
                  See what needs painting next
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <FontAwesome name="flag" size={16} color="#991b1b" />
              </View>
              <View style={styles.benefitContent}>
                <Text style={[styles.benefitName, { color: colors.text }]}>
                  Painting Goals
                </Text>
                <Text style={[styles.benefitDesc, { color: colors.textSecondary }]}>
                  Set and track your painting targets
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <FontAwesome name="bar-chart" size={16} color="#991b1b" />
              </View>
              <View style={styles.benefitContent}>
                <Text style={[styles.benefitName, { color: colors.text }]}>
                  Game System Progress
                </Text>
                <Text style={[styles.benefitDesc, { color: colors.textSecondary }]}>
                  Track progress by game system
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <FontAwesome name="gift" size={16} color="#991b1b" />
              </View>
              <View style={styles.benefitContent}>
                <Text style={[styles.benefitName, { color: colors.text }]}>
                  Wishlist
                </Text>
                <Text style={[styles.benefitDesc, { color: colors.textSecondary }]}>
                  Track items you want to buy
                </Text>
              </View>
            </View>

            <View style={[styles.benefitItem, styles.benefitItemLast]}>
              <View style={styles.benefitIcon}>
                <FontAwesome name="database" size={16} color="#991b1b" />
              </View>
              <View style={styles.benefitContent}>
                <Text style={[styles.benefitName, { color: colors.text }]}>
                  Unlimited Everything
                </Text>
                <Text style={[styles.benefitDesc, { color: colors.textSecondary }]}>
                  No limits on collections or items
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Current Limits Info */}
        <View style={[styles.limitsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.limitsTitle, { color: colors.textSecondary }]}>
            FREE TIER LIMITS
          </Text>
          <View style={styles.limitsRow}>
            <Text style={[styles.limitsText, { color: colors.text }]}>
              {FREE_TIER_LIMITS.MAX_COLLECTIONS} collections
            </Text>
            <Text style={[styles.limitsDivider, { color: colors.textSecondary }]}>
              {' '} {' '}
            </Text>
            <Text style={[styles.limitsText, { color: colors.text }]}>
              {FREE_TIER_LIMITS.MAX_ITEMS_PER_COLLECTION} items per collection
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
              <FontAwesome name="star" size={18} color="#fff" />
              <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
            </>
          )}
        </Pressable>

        {/* Restore Purchases */}
        <Pressable
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={purchaseLoading}
        >
          <Text style={[styles.restoreButtonText, { color: colors.textSecondary }]}>
            Restore Purchases
          </Text>
        </Pressable>

        {/* Bottom spacing */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingTop: 20,
  },
  premiumBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  paywallTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  paywallDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  benefitsCard: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  benefitsList: {
    gap: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  benefitItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  benefitIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(153, 27, 27, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 13,
  },
  limitsCard: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  limitsTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  limitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  limitsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  limitsDivider: {
    fontSize: 14,
  },
  priceContainer: {
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(153, 27, 27, 0.1)',
    borderRadius: 10,
  },
  priceText: {
    fontSize: 20,
    fontWeight: '700',
  },
  upgradeButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#991b1b',
    paddingVertical: 18,
    borderRadius: 14,
    gap: 10,
  },
  upgradeButtonDisabled: {
    opacity: 0.7,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  restoreButton: {
    marginTop: 16,
    padding: 12,
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
