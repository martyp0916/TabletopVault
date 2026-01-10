// TabletopVault Color Theme - Minimal Edition
const primaryColor = '#374151'; // Dark gray
const accentColor = '#111827';  // Near black
const goldColor = '#6b7280';    // Medium gray

export default {
  light: {
    text: '#1f2937',
    textSecondary: '#6b7280',
    background: '#f3f4f6',
    card: '#ffffff',
    tint: primaryColor,
    accent: accentColor,
    gold: goldColor,
    tabIconDefault: '#9ca3af',
    tabIconSelected: primaryColor,
    border: '#e5e7eb',
  },
  dark: {
    text: '#f3f4f6',
    textSecondary: '#9ca3af',
    background: '#0a0a0a',      // Near black
    card: '#171717',            // Dark gray
    cardHighlight: '#262626',   // Slightly lighter
    tint: primaryColor,
    accent: accentColor,
    gold: goldColor,
    tabIconDefault: '#525252',
    tabIconSelected: primaryColor,
    border: '#262626',
  },
};
