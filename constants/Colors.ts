// TabletopVault Color Theme - Battle Ready Edition
// Deep neutrals with crimson accents - bold, dramatic, game-neutral

const crimson = '#991b1b';        // Deep crimson - primary accent
const crimsonLight = '#b91c1c';   // Lighter crimson for hover/active states
const crimsonDark = '#7f1d1d';    // Darker crimson for pressed states

export default {
  light: {
    text: '#1a1a1a',              // Near black
    textSecondary: '#525252',     // Medium gray
    background: '#f5f5f5',        // Warm light gray
    card: '#ffffff',              // Pure white
    cardHighlight: '#fafafa',     // Slightly off-white
    tint: crimson,                // Primary accent
    accent: crimsonLight,         // Secondary accent
    primary: crimson,             // Buttons, links
    primaryLight: crimsonLight,
    primaryDark: crimsonDark,
    tabIconDefault: '#a3a3a3',    // Neutral gray
    tabIconSelected: crimson,     // Active tab
    border: '#e5e5e5',            // Light border
    borderDark: '#d4d4d4',        // Darker border for emphasis
    danger: '#dc2626',            // Error/delete red
    success: '#16a34a',           // Success green
  },
  dark: {
    text: '#f5f5f5',              // Off-white
    textSecondary: '#a3a3a3',     // Medium gray
    background: '#0d0d0d',        // Deep charcoal
    card: '#171717',              // Card background
    cardHighlight: '#262626',     // Elevated card/hover
    tint: crimsonLight,           // Primary accent (slightly brighter for dark)
    accent: crimson,              // Secondary accent
    primary: crimsonLight,        // Buttons, links
    primaryLight: '#dc2626',      // Brighter for emphasis
    primaryDark: crimson,         // Darker variant
    tabIconDefault: '#525252',    // Neutral gray
    tabIconSelected: crimsonLight,// Active tab
    border: '#262626',            // Dark border
    borderDark: '#404040',        // Lighter border for emphasis
    danger: '#ef4444',            // Error/delete red (brighter for dark mode)
    success: '#22c55e',           // Success green (brighter for dark mode)
  },
};
