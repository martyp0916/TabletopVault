/**
 * RevenueCat Integration
 *
 * Handles subscription purchases and entitlement checking for premium features.
 * Note: RevenueCat requires native modules and does NOT work in Expo Go.
 * Use a development build (npx expo run:ios) for testing subscriptions.
 */
import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const ENTITLEMENT_ID = 'premium';

let isConfigured = false;

/**
 * Check if running in Expo Go (where native modules aren't available)
 */
function isExpoGo(): boolean {
  // Check multiple indicators for Expo Go
  if (Constants.appOwnership === 'expo') return true;
  if (Constants.executionEnvironment === 'storeClient') return true;

  // Check if the native module exists - this is the most reliable check
  const hasNativeModule = !!NativeModules.RNPurchases;
  return !hasNativeModule;
}

// RevenueCat module reference - will be loaded lazily
let Purchases: any = null;
let LOG_LEVEL: any = null;
let moduleLoadAttempted = false;

/**
 * Lazily load the RevenueCat module
 * Only called when actually needed and after confirming we're not in Expo Go
 */
function loadRevenueCatModule(): boolean {
  if (moduleLoadAttempted) return !!Purchases;
  moduleLoadAttempted = true;

  // Don't even try to load in Expo Go
  if (isExpoGo()) {
    console.log('RevenueCat: Skipping module load (Expo Go detected)');
    return false;
  }

  try {
    const RevenueCat = require('react-native-purchases');
    Purchases = RevenueCat.default;
    LOG_LEVEL = RevenueCat.LOG_LEVEL;
    return true;
  } catch (e) {
    console.log('RevenueCat: Native module not available');
    return false;
  }
}

/**
 * Initialize RevenueCat SDK
 * Call this once at app startup after user authentication
 */
export async function initializeRevenueCat(userId?: string): Promise<void> {
  if (isConfigured) return;

  // Skip RevenueCat in Expo Go - native modules aren't available
  if (isExpoGo()) {
    console.log('RevenueCat: Skipping (Expo Go detected)');
    return;
  }

  // Try to load the module
  if (!loadRevenueCatModule() || !Purchases) {
    console.log('RevenueCat: Module not available');
    return;
  }

  // Only configure on iOS for now
  if (Platform.OS === 'ios') {
    // Valid RevenueCat iOS keys start with 'appl_'
    if (!REVENUECAT_IOS_KEY || !REVENUECAT_IOS_KEY.startsWith('appl_')) {
      console.warn('RevenueCat: Valid API key not configured (must start with appl_)');
      return;
    }

    try {
      Purchases.configure({
        apiKey: REVENUECAT_IOS_KEY,
        appUserID: userId,
      });

      // Enable debug logs in development
      if (__DEV__ && LOG_LEVEL) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      isConfigured = true;
    } catch (error) {
      console.error('RevenueCat initialization error:', error);
    }
  }
}

/**
 * Check if RevenueCat is properly configured
 */
export function isRevenueCatConfigured(): boolean {
  // Not available in Expo Go
  if (isExpoGo()) return false;
  // Valid RevenueCat iOS keys start with 'appl_'
  return isConfigured && !!Purchases && REVENUECAT_IOS_KEY.startsWith('appl_');
}

/**
 * Check if user has premium entitlement
 */
export async function checkPremiumStatus(): Promise<boolean> {
  if (isExpoGo() || !isConfigured || !Purchases) return false;

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
}

/**
 * Get available subscription packages
 */
export async function getOfferings(): Promise<any[]> {
  if (isExpoGo() || !isConfigured || !Purchases) return [];

  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current?.availablePackages) {
      return offerings.current.availablePackages;
    }
    return [];
  } catch (error) {
    console.error('Error fetching offerings:', error);
    return [];
  }
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(pkg: any): Promise<{
  success: boolean;
  customerInfo?: any;
  error?: string;
  cancelled?: boolean;
}> {
  if (isExpoGo() || !isConfigured || !Purchases) {
    return { success: false, error: 'RevenueCat not configured' };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

    return {
      success: isPremium,
      customerInfo,
    };
  } catch (error: any) {
    // User cancelled the purchase
    if (error.userCancelled) {
      return { success: false, cancelled: true };
    }
    console.error('Purchase error:', error);
    return { success: false, error: error.message || 'Purchase failed' };
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<{
  success: boolean;
  isPremium: boolean;
  error?: string;
}> {
  if (isExpoGo() || !isConfigured || !Purchases) {
    return { success: false, isPremium: false, error: 'RevenueCat not configured' };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

    return { success: true, isPremium };
  } catch (error: any) {
    console.error('Restore error:', error);
    return { success: false, isPremium: false, error: error.message || 'Restore failed' };
  }
}

/**
 * Identify user with RevenueCat (call after login)
 */
export async function identifyUser(userId: string): Promise<void> {
  if (isExpoGo() || !isConfigured || !Purchases) return;

  try {
    await Purchases.logIn(userId);
  } catch (error) {
    console.error('Error identifying user with RevenueCat:', error);
  }
}

/**
 * Log out user from RevenueCat (call after logout)
 */
export async function logOutRevenueCatUser(): Promise<void> {
  if (isExpoGo() || !isConfigured || !Purchases) return;

  try {
    await Purchases.logOut();
  } catch (error) {
    console.error('Error logging out from RevenueCat:', error);
  }
}

/**
 * Add listener for customer info changes (subscription status updates)
 * Note: RevenueCat SDK manages listener cleanup internally
 */
export function addCustomerInfoListener(
  callback: (info: any) => void
): () => void {
  if (isExpoGo() || !isConfigured || !Purchases) {
    return () => {};
  }

  // Add the listener - RevenueCat SDK handles this internally
  Purchases.addCustomerInfoUpdateListener(callback);

  // Return a no-op cleanup function since the SDK manages listeners
  return () => {};
}

/**
 * Get the customer info (for debugging/display)
 */
export async function getCustomerInfo(): Promise<any | null> {
  if (isExpoGo() || !isConfigured || !Purchases) return null;

  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error('Error getting customer info:', error);
    return null;
  }
}
