// TabletopVault Color Theme - Battle Ready Edition
// Deep crimson accents with dark backgrounds - bold, dramatic, game-ready

const crimson = '#991b1b';         // Primary crimson accent
const crimsonLight = '#b91c1c';    // Lighter crimson for hover/active states
const crimsonDark = '#7f1d1d';     // Darker crimson for pressed states

export default {
  light: {
    text: '#1c1917',              // Stone 900 - warm dark
    textSecondary: '#78716c',     // Stone 500 - warm gray
    background: '#fafaf9',        // Stone 50 - warm off-white
    card: 'rgba(255, 255, 255, 0.75)',  // Semi-transparent white for glass
    cardSolid: '#ffffff',         // Solid white when blur not available
    cardHighlight: 'rgba(255, 255, 255, 0.9)', // Highlighted glass
    tint: crimson,                // Primary accent
    accent: crimsonLight,         // Secondary accent
    primary: crimson,             // Buttons, links
    primaryLight: crimsonLight,
    primaryDark: crimsonDark,
    tabIconDefault: '#a8a29e',    // Stone 400
    tabIconSelected: crimson,     // Active tab
    border: 'rgba(168, 162, 158, 0.3)', // Subtle warm border
    borderDark: 'rgba(120, 113, 108, 0.4)', // Darker warm border
    danger: '#dc2626',            // Error/delete red
    success: '#16a34a',           // Success green
    // Glass effect colors
    glassBackground: 'rgba(255, 255, 255, 0.65)',
    glassBorder: 'rgba(214, 211, 209, 0.4)',
    overlay: 'rgba(28, 25, 23, 0.5)', // Warm dark overlay
  },
  dark: {
    text: '#fafaf9',              // Stone 50 - warm off-white
    textSecondary: '#a8a29e',     // Stone 400 - warm muted
    background: '#0d0d0d',        // Deep charcoal
    card: 'rgba(28, 28, 28, 0.75)', // Semi-transparent dark for glass
    cardSolid: '#1c1c1c',         // Solid dark fallback
    cardHighlight: 'rgba(42, 42, 42, 0.8)', // Highlighted
    tint: crimsonLight,           // Primary accent (brighter for dark)
    accent: crimson,              // Secondary accent
    primary: crimsonLight,        // Buttons, links
    primaryLight: '#dc2626',      // Brighter red for emphasis
    primaryDark: crimson,         // Darker variant
    tabIconDefault: '#525252',    // Neutral 600
    tabIconSelected: crimsonLight, // Active tab
    border: 'rgba(82, 82, 82, 0.5)', // Subtle glass border
    borderDark: 'rgba(115, 115, 115, 0.5)', // Lighter border
    danger: '#f87171',            // Error/delete red (brighter)
    success: '#4ade80',           // Success green (brighter)
    // Glass effect colors
    glassBackground: 'rgba(28, 28, 28, 0.65)',
    glassBorder: 'rgba(82, 82, 82, 0.4)',
    overlay: 'rgba(0, 0, 0, 0.7)', // Dark overlay for modals
  },
};
