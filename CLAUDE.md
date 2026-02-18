# TabletopVault - Project Status

## Overview

**App Name**: TabletopVault
**Purpose**: Mobile app for tabletop gaming collectors to track inventory, share collections, plan painting projects, and connect with other hobbyists
**Target Games**: Warhammer 40K, Warhammer Age of Sigmar, Horus Heresy, Kill Team, Star Wars Legion, Star Wars Shatterpoint, Halo Flashpoint, Bolt Action, Marvel Crisis Protocol, Battle Tech, and more
**Tech Stack**: React Native + Expo + TypeScript + Supabase
**Repository**: https://github.com/martyp0916/TabletopVault
**Last Updated**: February 4, 2025

---

## Recent Changes (February 4, 2025)

- **Premium/Freemium Model**:
  - Free tier: 2 collections, 5 items per collection
  - Premium tier: Unlimited collections/items, planning tab access, export, notifications
  - Premium context provider (`lib/premium.tsx`) with upgrade prompts
  - Premium paywall component for Planning tab (`components/PremiumPaywall.tsx`)

- **Export Collection Data (Premium Feature)**:
  - PDF export only (CSV removed)
  - Export single collection or all collections
  - Accessible from collection detail and profile screens
  - Uses expo-file-system legacy API for compatibility

- **Push Notifications for Goal Deadlines (Premium Feature)**:
  - Notifications library (`lib/notifications.ts`)
  - Reminder notification day before deadline at 9 AM
  - Deadline notification on due date at 9 AM
  - Notification toggle in profile settings (premium users only)
  - Notifications scheduled when creating/editing goals with deadlines
  - Notifications cancelled when goals deleted or completed

- **UI/UX Improvements**:
  - Glass card components with blur effects (`components/GlassCard.tsx`)
  - Crimson color palette refinements
  - Keyboard handling fixes for edit collection screen
  - Export button renamed to "Export Collection Data"
  - Tab bar blur intensity increased

- **Bug Fixes**:
  - Fixed expo-file-system deprecated copyAsync error (switched to legacy API)
  - Fixed keyboard covering description field in edit collection screen

---

## Previous Changes (January 30, 2025)

- **Collection management improvements**:
  - Drag-to-reorder collections (long press and drag)
  - Collection complete/lock status badges
  - Item search within collections tab
  - Fixed scrolling issues with proper flex layout
- **Export functionality**: Initial CSV and PDF export for collection data
- **Help & Feedback screen**: New screen at `app/profile/help-feedback.tsx`
- **Bug fixes**:
  - Fixed TypeScript errors (style names, type incompatibilities)
  - Fixed Supabase nested data transformation in followers/following screens
  - Removed deprecated `purchase_date` field from item detail view

---

## Current Status: Freemium App with Premium Features

The app is a fully-featured tabletop collection manager with a freemium business model. Free users can manage up to 2 collections with 5 items each. Premium users get unlimited collections/items, access to the Planning tab, export functionality, and goal deadline notifications.

### What's Working

| Feature | Status | Notes |
|---------|--------|-------|
| **Authentication** | | |
| User signup | Working | Email/password auth with validation + rate limiting |
| User login | Working | Persists session with AsyncStorage, rate limited |
| User logout | Working | Clears session and redirects to login |
| Forgot password | Working | Email-based password reset flow |
| Reset password | Working | Deep link handling for password reset |
| **Premium Features** | | |
| Premium context | Working | Tracks premium status, enforces limits |
| Upgrade prompts | Working | Modal with benefits list when limits hit |
| Planning paywall | Working | Free users see paywall instead of Planning tab |
| Export data | Working | PDF export (premium only) |
| Goal notifications | Working | Push notifications for deadlines (premium only) |
| **Profile** | | |
| Profile editing | Working | Edit username and avatar |
| Avatar upload | Working | Camera + gallery picker for profile photos |
| Change password | Working | Requires current password verification |
| Custom background image | Working | Set app-wide background from Profile tab |
| Help & Feedback | Working | Links to GitHub issues for support |
| Notification settings | Working | Toggle goal notifications (premium only) |
| **Collections** | | |
| Create collection | Working | Dropdown menu with 16+ supported games + cover image |
| View collections | Working | List layout with item counts, cover images, drag-to-reorder |
| Edit collection | Working | Edit game, description, and cover image |
| Delete collection | Working | With confirmation dialog |
| Collection cover images | Working | Upload faction logos or photos for collections |
| Collection complete status | Working | Mark collections as complete (checkmark badge) |
| Collection lock status | Working | Lock collections to prevent changes (lock badge) |
| Drag-to-reorder | Working | Long press and drag to reorder collections |
| Item search | Working | Search items by name within collections tab |
| Collection limits | Working | Free tier limited to 2 collections |
| **Items** | | |
| Add item | Working | Models per box + status breakdown |
| Edit item | Working | Edit name, faction, quantity, status counts, notes |
| View item detail | Working | Shows all item properties + photo |
| Delete item | Working | With confirmation dialog, cleans up photos |
| Photo upload | Working | Camera + gallery picker, uploads to Supabase Storage |
| Status count tracking | Working | Track how many models are in each status per item |
| Effective status display | Working | Shows "Work in Progress" for mixed states |
| Item limits | Working | Free tier limited to 5 items per collection |
| **Dashboard** | | |
| Home dashboard | Working | 4-card status grid + search/filter |
| Collection stats | Working | Shows breakdown by status |
| Pull-to-refresh | Working | All screens support pull-to-refresh |
| **Social Features** | | |
| User profiles | Working | View other users' public profiles |
| Follow/Unfollow | Working | Follow other users to see their activity |
| Followers list | Working | View who follows you |
| Following list | Working | View who you follow |
| Follower counts | Working | Display on profile pages |
| **Planning Tab (Premium)** | | |
| Progress queue | Working | Auto-populated list of unpainted items (shows 5, "See All" for more) |
| See All modal | Working | Full scrollable list of all items needing paint |
| Painting goals | Working | Create goals with optional deadlines |
| Goal progress | Working | Track current vs target count |
| Goal notifications | Working | Push notifications for deadlines |
| Complete goals | Working | Mark goals as finished |
| Overall progress | Working | Percentage of models painted across all collections |
| Game system progress | Working | Per-game-system painting progress breakdown |
| Wishlist | Working | Track future items to buy with game system dropdown |
| **Export (Premium)** | | |
| Export to PDF | Working | Export styled PDF with progress stats |
| Export single collection | Working | From collection detail screen |
| Export all collections | Working | From profile screen |
| **UI/UX** | | |
| Global dark mode | Working | Theme persists across app restarts via AsyncStorage |
| Dark mode contrast | Working | Lighter card backgrounds for better visibility |
| Text visibility | Working | Solid backgrounds for text when background image set |
| Safe area handling | Working | Content avoids phone notch/camera area |
| Keyboard avoiding | Working | All forms adjust for keyboard |
| Glass effects | Working | Blur effects on cards and tab bar |
| **Collection Detail** | | |
| Alphabetical sorting | Working | Items sorted A-Z by name |
| Progress card | Working | Shows painting percentage, progress bar, status breakdown |
| Item notes display | Working | Notes visible on item cards (2-line limit) |
| Collection pre-selection | Working | Add screen auto-selects collection when navigating from collection |
| Export button | Working | "Export Collection Data" button (premium only) |

---

## Premium Features

### Free Tier Limits (`lib/premium.tsx`)
```typescript
const FREE_TIER_LIMITS = {
  MAX_COLLECTIONS: 2,
  MAX_ITEMS_PER_COLLECTION: 5,
};
```

### Premium Benefits
- Unlimited collections
- Unlimited items per collection
- Full Planning tab access (Progress Queue, Goals, Wishlist, Progress Stats)
- Export collection data to PDF
- Goal deadline push notifications

### Premium Context
- `isPremium`: Boolean indicating premium status
- `canCreateCollection(count)`: Check if user can create more collections
- `canCreateItem(count)`: Check if user can add more items to collection
- `showUpgradePrompt(reason)`: Show upgrade modal with reason

### Upgrade Reasons
- `'collections'`: Hit collection limit
- `'items'`: Hit item limit per collection
- `'planning'`: Tried to access Planning tab
- `'export'`: Tried to export data

---

## Push Notifications

### Overview (`lib/notifications.ts`)
Push notifications remind premium users about goal deadlines.

### Notification Schedule
- **Day before deadline (9 AM)**: "Goal Deadline Tomorrow! [title] is due tomorrow. You're at X/Y."
- **Day of deadline (9 AM)**: "Goal Deadline Today! [title] is due today. You're at X/Y. Keep painting!"

### Key Functions
```typescript
requestNotificationPermissions()  // Request permission from user
areNotificationsEnabled()         // Check current permission status
scheduleAllGoalNotifications(goal) // Schedule deadline + reminder
cancelGoalNotification(goalId)    // Cancel notifications for a goal
cancelAllNotifications()          // Cancel all scheduled notifications
```

### Integration
- Notifications scheduled when creating/updating goals with deadlines
- Notifications cancelled when goals are deleted or completed
- Permission requested on first goal with deadline
- Toggle in Profile > Settings (premium users only)

### Android Configuration
- Channel: `goal-deadlines`
- Importance: HIGH
- Vibration pattern enabled
- Light color: `#991b1b` (crimson)

---

## App Navigation Structure

The app has 5 main tabs:

```
┌─────────┬─────────────┬─────────┬──────────┬─────────┐
│  Home   │ Collections │   Add   │ Planning │ Profile │
└─────────┴─────────────┴─────────┴──────────┴─────────┘
```

1. **Home** - Dashboard with status overview, search/filter
2. **Collections** - List of user's collections with drag-to-reorder and search
3. **Add** - Form to add new items (respects collection/item limits)
4. **Planning** - Progress queue, goals, wishlist, progress tracking (Premium only)
5. **Profile** - User info, settings, customization, export, help, logout

---

## Planning Tab Features (Premium Only)

### Progress Queue
- Automatically shows all items with unpainted models (new in box, assembled, or primed)
- No manual adding required - populated from collection data
- Sorted by readiness to paint (primed items first, then assembled, then unbuilt)
- Shows 5 items on main screen with "See All" button for full list
- "See All" opens scrollable modal with complete item list
- Shows item name and status breakdown (e.g., "3 primed, 2 assembled")
- Tap any item to view details and update status
- Empty state shows green checkmark when all models are painted

### Painting Goals
- Create custom goals (e.g., "Paint 10 models this month")
- Goal types: `models_painted`, `items_completed`, `custom`
- Optional deadline with date picker
- Track progress (current/target count)
- Mark as complete manually or auto-complete when target reached
- Visual progress bar
- Edit button (pencil icon) to modify goals
- Delete button (trash icon) with confirmation dialog
- **Push notifications** for deadlines (day before + day of)
- Keyboard avoiding ensures input fields visible when typing

### Progress Dashboard
- **Overall Progress**: Total models painted across all collections with percentage
- **Status Breakdown**: Count of models in each status (NIB, Assembled, Primed, Painted)
- **Game System Progress**: Per-game-system painted percentage, sorted by least progress first

### Wishlist
- Track future items you want to purchase
- Add item name, game system (dropdown selection), and optional notes
- Game system uses dropdown matching supported games (no text input)
- "Other" option allows custom game names
- No price/cost fields - app focuses on collection tracking, not finances
- Mark items as purchased when you buy them
- Purchased items show with strikethrough and checkmark
- Tap any item to edit, mark purchased, or delete

---

## Collection Detail Screen

### Features
- **Alphabetical Sorting**: Items displayed A-Z by name for easy navigation
- **Progress Card**: Shows painting progress at top of collection
  - Percentage of models painted
  - Visual progress bar
  - Total models painted count
  - Status breakdown (Unbuilt, Built, Primed, Painted counts)
- **Item Notes Display**: Notes shown directly on item cards (max 2 lines)
- **Add Button Integration**: "Add" button navigates to Add screen with collection pre-selected
- **Complete/Lock Badges**: Visual indicators for collection status
- **Export Button**: "Export Collection Data" exports single collection to PDF (Premium only)

### Technical Notes
- Uses React Native's `View` component (not themed) to avoid auto-background issues
- Progress bar uses explicit colors (#333333 card, #404040 bar background in dark mode)
- Items sorted using `localeCompare()` for proper alphabetical ordering

---

## Collections Tab Features

### Drag-to-Reorder
- Long press on any collection card to start dragging
- Drag to new position to reorder
- Order persists to database via `sort_order` column
- Uses `react-native-draggable-flatlist` library

### Item Search
- Search bar at top of collections tab
- Search items by name across all collections
- Shows matching items with collection name
- Tap result to navigate to that collection
- Handles items that exist in multiple collections with picker modal

### Collection Status Badges
- **Complete Badge** (green checkmark): Collection marked as complete
- **Lock Badge** (gray lock): Collection is locked from changes

---

## Export Functionality (Premium Only)

### PDF Export (`lib/exportData.ts`)
- Generates styled HTML report with:
  - Header with title and export date
  - Summary stats (collections, items, models, painted %)
  - Per-collection sections with progress bars
  - Item tables with status colors
- Uses expo-print for PDF generation
- Uses expo-file-system legacy API for file operations
- Shares via native share sheet

### Export Options (Profile Tab)
- **Export All Collections**: Exports all user data to single PDF
- **Choose a Collection**: Select specific collection to export
  - Shows collection name + description for identification

### Export from Collection Detail
- "Export Collection Data" button exports current collection to PDF

---

## Social Features

### User Profiles
- View other users' public profiles at `/user/[id]`
- See their username, avatar, follower/following counts
- View their public collections and items

### Follow System
- Follow/unfollow other users
- View followers list at `/user/followers`
- View following list at `/user/following`
- Follower counts displayed on profiles

### Database Tables
```sql
follows (
  id UUID PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id),
  following_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ,
  UNIQUE(follower_id, following_id)
)
```

---

## Password Reset Flow

### Forgot Password (`app/(auth)/forgot-password.tsx`)
- User enters email address
- Supabase sends password reset email
- Rate limited to prevent abuse

### Reset Password (`app/(auth)/reset-password.tsx`)
- Handles deep link from email
- User enters new password + confirmation
- Password validation enforced
- Redirects to login on success

### Deep Link Configuration
```json
// app.json
{
  "scheme": "tabletvault",
  "ios": {
    "associatedDomains": ["applinks:hsqsskxwtknmuehrldlf.supabase.co"]
  },
  "android": {
    "intentFilters": [{
      "action": "VIEW",
      "data": [{ "scheme": "tabletvault" }],
      "category": ["BROWSABLE", "DEFAULT"]
    }]
  }
}
```

---

## Color Theme: Battle Ready Edition

The app uses a game-neutral aesthetic with deep crimson accents:

```typescript
// Primary Colors
crimson: '#991b1b'      // Primary accent
crimsonLight: '#b91c1c' // Hover/active states
crimsonDark: '#7f1d1d'  // Pressed states

// Dark Mode Colors
background: '#0d0d0d'   // Deep charcoal background
card: '#1c1c1c'         // Card background (lighter for contrast)
cardHighlight: '#2a2a2a' // Elevated/hover state

// Game System Colors
wh40k: '#991b1b'    // Crimson
aos: '#7c3aed'      // Purple
legion: '#dc2626'   // Red
other: '#525252'    // Gray

// Status Colors
nib: '#ef4444'      // Red (Shame Pile)
assembled: '#f59e0b' // Amber
primed: '#6366f1'   // Indigo
painted: '#10b981'  // Green (Battle Ready)
wip: '#f59e0b'      // Amber (Work in Progress)

// Collection Colors (for visual variety)
'#991b1b', '#b91c1c', '#7f1d1d', '#dc2626',
'#7c3aed', '#6366f1', '#2563eb', '#059669',
'#d97706', '#9333ea'
```

---

## Status Tracking System

The app tracks models by individual status counts, allowing users to track progress within a single box/unit:

### Status Categories (5 states)
1. **Shame Pile / New in Box** (red) - All models unassembled
2. **Assembled** (amber) - Built but not primed
3. **Primed** (indigo) - Primed and ready for paint
4. **Battle Ready / Painted** (green) - All models fully painted
5. **Work in Progress** (amber) - Models in various stages

### Effective Status Logic
The `getEffectiveStatus()` helper in `types/database.ts` determines display status:
- If ALL models are painted → "Battle Ready"
- If ALL models are new in box → "Shame Pile"
- If models are in mixed states → "Work in Progress"

```typescript
export function getEffectiveStatus(item: Item): ItemStatus {
  const total = nibCount + assembledCount + primedCount + paintedCount;
  if (total === 0) return item.status;
  if (paintedCount === total) return 'painted';
  if (nibCount === total) return 'nib';
  return 'wip';
}
```

---

## Theme & Customization

### Dark Mode Persistence
- Theme preference saved to AsyncStorage with key `@tabletopvault_theme`
- On app launch, saved preference is loaded before rendering
- Toggle saves immediately to persist across app restarts
- File: `lib/theme.tsx`

### Custom Background Image
1. User goes to Profile tab → "CUSTOMIZATION" section
2. "App Background" option allows selecting an image
3. Image uploads to `profile-images` bucket as `{user_id}/background_{timestamp}.ext`
4. Path saved to `profiles.background_image_url`
5. ThemeProvider fetches signed URL and provides to all screens
6. Root layout wraps app in ImageBackground with semi-transparent overlay
7. All tab screens have transparent backgrounds and solid containers for text visibility

### Glass Effects
- `GlassCard` component with expo-blur for frosted glass appearance
- Tab bar uses blur effect when background image is set
- Blur intensity configurable (default: 70 for cards, 100 for tab bar)

### Files Involved
- `types/database.ts` - Added `background_image_url` to User interface
- `hooks/useProfile.ts` - Added field to allowed updates
- `lib/theme.tsx` - Theme persistence + background image support
- `components/GlassCard.tsx` - Reusable glass effect component
- `app/_layout.tsx` - Added ImageBackground wrapper in RootLayoutNav
- `app/(tabs)/_layout.tsx` - Made tab bar transparent with blur when background set
- `app/(tabs)/profile.tsx` - Background picker in CUSTOMIZATION section

---

## Security Hardening

The app implements comprehensive security measures following OWASP best practices.

### Environment Variables (lib/supabase.ts)
- **API keys moved to environment variables** - No hardcoded secrets in source code
- Uses `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `.env` file added to `.gitignore` to prevent accidental commits
- `.env.example` provided as template

### Input Validation (lib/validation.ts)
Schema-based validation with type checking, length limits, and sanitization:

| Field Type | Validation |
|------------|------------|
| Email | RFC 5322 format, max 254 chars |
| Password | Min 8 chars, max 128, requires letter + number |
| Username | 3-30 chars, alphanumeric + underscore/hyphen only |
| UUID | Strict UUID v4 format validation |
| Collection name | Max 100 chars, safe text only |
| Item name | Max 200 chars, safe text only |
| Notes | Max 2000 chars |
| Quantities | 0-10,000 range, integer only |
| Goal title | Max 100 chars |
| Goal target | 1-10,000 range |

### Rate Limiting (lib/rateLimiter.ts)
Client-side rate limiting with sensible defaults:

| Operation | Limit | Window | Throttle |
|-----------|-------|--------|----------|
| Sign In | 5 attempts | 1 minute | 1 sec between |
| Sign Up | 3 attempts | 1 minute | 2 sec between |
| Password Reset | 3 attempts | 5 minutes | 5 sec between |
| Data Create | 30 requests | 1 minute | 500ms throttle |
| Data Update | 60 requests | 1 minute | 200ms throttle |
| Data Delete | 20 requests | 1 minute | 500ms throttle |
| File Upload | 10 uploads | 1 minute | 1 sec between |
| Data Read | 100 requests | 1 minute | 100ms throttle |

### Mass Assignment Protection
All hooks reject unexpected fields:
- `useCollections`: Only allows `name`, `description`, `is_public`, `cover_image_url`, `is_complete`, `is_locked`, `sort_order`
- `useItems`: Only allows defined item fields
- `useProfile`: Only allows `username`, `avatar_url`, `background_image_url`
- `usePaintingGoals`: Only allows defined goal fields
- `useWishlist`: Only allows defined wishlist fields

### OWASP Compliance
- **A01:2021 - Broken Access Control**: RLS policies + client-side validation
- **A03:2021 - Injection**: Input sanitization, parameterized queries via Supabase
- **A04:2021 - Insecure Design**: Rate limiting, validation schemas
- **A05:2021 - Security Misconfiguration**: Environment variables for secrets
- **A07:2021 - Identification Failures**: Rate limiting on auth endpoints

---

## Supported Games

Collections can be created for these games (dropdown menu):

1. Battle Tech
2. Bolt Action
3. Dropfleet Commander
4. Dropzone Commander
5. Dystopian Wars
6. Fallout Wasteland Warfare
7. Halo Flashpoint
8. Horus Heresy
9. Kings of War
10. Marvel Crisis Protocol
11. Star Wars Legion
12. Star Wars Shatterpoint
13. Warmachine
14. Warhammer 40K
15. Warhammer 40K: Kill Team
16. Warhammer Age of Sigmar

*Wishlist also supports "Other" option for custom game names*

---

## Project Structure

```
TabletopVault/
├── app/                          # Expo Router screens
│   ├── (auth)/                   # Auth screens
│   │   ├── _layout.tsx           # Auth stack layout
│   │   ├── login.tsx             # Login form with validation
│   │   ├── signup.tsx            # Signup form with validation
│   │   ├── forgot-password.tsx   # Forgot password screen
│   │   └── reset-password.tsx    # Reset password (deep link)
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── _layout.tsx           # Tab bar (blur effect when background set)
│   │   ├── index.tsx             # Home dashboard + search/filter
│   │   ├── collections.tsx       # Collections list + drag-to-reorder + search
│   │   ├── add.tsx               # Add item form + status counts
│   │   ├── planning.tsx          # Progress queue, goals, wishlist, progress (Premium)
│   │   └── profile.tsx           # User profile, settings, export, notifications
│   ├── collection/
│   │   ├── [id].tsx              # Collection detail + export button
│   │   └── edit/
│   │       └── [id].tsx          # Edit collection + cover image
│   ├── item/
│   │   ├── [id].tsx              # Item detail + edit/delete
│   │   └── edit/
│   │       └── [id].tsx          # Edit item + status counts
│   ├── profile/
│   │   ├── edit.tsx              # Edit profile (username, avatar)
│   │   ├── change-password.tsx   # Change password screen
│   │   └── help-feedback.tsx     # Help & feedback screen
│   ├── user/
│   │   ├── _layout.tsx           # User profile stack layout
│   │   ├── [id].tsx              # View other user's profile
│   │   ├── followers.tsx         # Followers list
│   │   └── following.tsx         # Following list
│   └── _layout.tsx               # Root layout with ImageBackground wrapper
├── components/
│   ├── Themed.tsx                # Theme-aware Text/View components
│   ├── FollowButton.tsx          # Follow/unfollow button component
│   ├── UserAvatar.tsx            # User avatar display component
│   ├── GlassCard.tsx             # Glass effect card with blur
│   ├── PremiumPaywall.tsx        # Paywall for Planning tab (free users)
│   └── useColorScheme.ts         # System color scheme hook
├── constants/
│   └── Colors.ts                 # Crimson theme colors (Battle Ready Edition)
├── hooks/
│   ├── useCollections.ts         # Collection CRUD with validation + reorder + limits
│   ├── useItems.ts               # Item CRUD with validation + stats + limits
│   ├── useProfile.ts             # Profile operations with validation
│   ├── useFollows.ts             # Follow/unfollow operations
│   ├── usePaintQueue.ts          # Paint queue management (legacy, not used)
│   ├── usePaintingGoals.ts       # Painting goals CRUD
│   ├── useProgressStats.ts       # Progress calculations by game system
│   └── useWishlist.ts            # Wishlist CRUD, mark as purchased
├── lib/
│   ├── auth.tsx                  # AuthContext with rate limiting
│   ├── exportData.ts             # PDF export utilities (uses legacy expo-file-system)
│   ├── notifications.ts          # Push notification utilities for goal deadlines
│   ├── premium.tsx               # Premium context, limits, upgrade prompts
│   ├── rateLimiter.ts            # Rate limiting utilities
│   ├── supabase.ts               # Supabase client (env vars)
│   ├── theme.tsx                 # ThemeProvider with background image support
│   └── validation.ts             # Input validation schemas
├── supabase/
│   ├── config.toml               # Supabase local config
│   └── migrations/
│       ├── 20250111000000_initial_schema.sql
│       ├── 20250121000000_add_background_image.sql
│       ├── 20250122000000_add_social_features.sql
│       ├── 20250124000000_add_planning_features.sql
│       ├── 20250125000000_add_wishlist.sql
│       ├── 20250126000000_add_collection_complete_lock.sql
│       └── 20250127000000_add_collection_sort_order.sql
├── types/
│   └── database.ts               # TypeScript interfaces + helpers
├── .env                          # Environment variables (git ignored)
├── .env.example                  # Template for env vars
├── app.json                      # Expo configuration with deep links
├── eas.json                      # EAS Build configuration
├── package.json                  # Dependencies
└── tsconfig.json                 # TypeScript config
```

---

## Supabase Configuration

**Project URL**: `https://hsqsskxwtknmuehrldlf.supabase.co`
**Database Password**: `w1MH8S3JEkzeEt0c`

### Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (id, email, username, avatar_url, background_image_url, is_premium) |
| `collections` | Groups of items (id, user_id, name, description, is_public, is_complete, is_locked, sort_order, cover_image_url) |
| `items` | Individual miniatures with status counts |
| `item_images` | Photos for items |
| `follows` | User follow relationships (follower_id, following_id) |
| `paint_queue` | Manual paint queue (legacy, Progress Queue auto-populates now) |
| `painting_goals` | User goals with deadlines (title, goal_type, target_count, current_count, deadline) |
| `wishlist` | Future items to buy (name, game_system dropdown, notes, priority, is_purchased - no price fields) |

### Supabase Storage Buckets

| Bucket | Purpose | Path Format |
|--------|---------|-------------|
| `item-images` | Item photos | `{user_id}/{item_id}/{timestamp}.{ext}` |
| `collection-images` | Collection covers | `{user_id}/{collection_id}/{timestamp}.{ext}` |
| `profile-images` | Avatars & backgrounds | `{user_id}/avatar_{timestamp}.{ext}` or `background_{timestamp}.{ext}` |

### Row Level Security Policies

All tables have RLS enabled with user-based access control:
- Users can only access their own data
- Public collections/items visible to all (when is_public = true)
- Users can view other users' public profiles
- Follow relationships visible to involved users

---

## Type Definitions (types/database.ts)

```typescript
// Game and Status Types
type GameSystem = 'wh40k' | 'aos' | 'legion' | 'other';
type ItemStatus = 'nib' | 'assembled' | 'primed' | 'painted' | 'based' | 'wip';
type GoalType = 'models_painted' | 'items_completed' | 'custom';

// Core Interfaces
interface User { id, email, username, avatar_url, background_image_url, is_premium, ... }
interface Collection { id, user_id, name, description, is_public, is_complete, is_locked, sort_order, cover_image_url, ... }
interface Item { id, collection_id, user_id, name, nib_count, assembled_count, primed_count, painted_count, ... }

// Social Interfaces
interface Follow { id, follower_id, following_id, created_at }

// Planning Interfaces
interface PaintingGoal { id, user_id, title, goal_type, target_count, current_count, deadline, is_completed }
interface WishlistItem { id, user_id, name, game_system, notes, priority, is_purchased }
// Note: WishlistItem intentionally excludes price fields - app focuses on collection tracking, not finances

// Helper Functions
getEffectiveStatus(item: Item): ItemStatus
getStatusLabel(status: ItemStatus): string
getStatusColor(status: ItemStatus): string
```

---

## Hooks Reference

| Hook | Purpose |
|------|---------|
| `useCollections` | CRUD for collections with validation, reorder support, premium limits |
| `useItems` | CRUD for items with validation, stats, premium limits |
| `useProfile` | Profile operations (fetch, update) |
| `useFollows` | Follow/unfollow, get followers/following |
| `usePaintingGoals` | CRUD for painting goals, progress tracking |
| `useProgressStats` | Calculate overall and per-game-system progress |
| `useWishlist` | CRUD for wishlist items, mark as purchased |
| `usePremium` | Premium status, limits checking, upgrade prompts |

---

## Development Progress

### Completed
- [x] Core app with all CRUD operations
- [x] Authentication with validation and rate limiting
- [x] Per-model status tracking
- [x] Work in Progress status for mixed states
- [x] Collection cover images
- [x] Collection complete/lock status
- [x] Drag-to-reorder collections
- [x] Item search in collections tab
- [x] Profile editing with avatar upload
- [x] Change password functionality
- [x] Security hardening (validation, rate limiting, env vars)
- [x] Crimson color theme
- [x] Search and filter on dashboard
- [x] Custom background image
- [x] Password reset flow (forgot password via email)
- [x] Social features (follow system, user profiles)
- [x] Planning tab with auto-populated Progress Queue
- [x] "See All" modal for full Progress Queue list
- [x] Painting goals with deadlines
- [x] Progress dashboard (overall and per-game-system)
- [x] Text visibility improvements
- [x] Safe area handling for phone notch
- [x] Keyboard avoiding for goal input and Add screen
- [x] Dark mode card contrast improvements
- [x] Goal editing with progress updates
- [x] Goal delete with confirmation dialog
- [x] Wishlist with game dropdown (no price fields)
- [x] Theme persistence across app restarts
- [x] Collection detail progress card
- [x] Alphabetical item sorting in collections
- [x] Item notes display on collection cards
- [x] Collection pre-selection when adding from collection
- [x] Export data to PDF
- [x] Help & Feedback screen
- [x] Premium/Freemium model (limits, paywall, upgrade prompts)
- [x] Export as premium feature
- [x] Push notifications for goal deadlines (premium)
- [x] Glass card effects with blur
- [x] Notification settings in profile (premium)

### Future Enhancements
- [ ] Activity feed (see what followed users are painting)
- [ ] Comments and likes on items
- [ ] Payment integration for premium subscriptions
- [ ] Sharing collections publicly

---

## Commands

```bash
# Start development server
npx expo start

# Start with tunnel (for phone testing)
npx expo start --tunnel

# Install dependencies
npm install

# Run TypeScript check
npx tsc --noEmit

# Run database migration
node -e "
const { Client } = require('pg');
const fs = require('fs');
const sql = fs.readFileSync('supabase/migrations/MIGRATION_FILE.sql', 'utf8');
const client = new Client({
  host: 'db.hsqsskxwtknmuehrldlf.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'w1MH8S3JEkzeEt0c',
  ssl: { rejectUnauthorized: false }
});
client.connect().then(() => client.query(sql)).then(() => {
  console.log('Migration completed!');
  client.end();
});
"

# Build for production
eas build --platform ios
eas build --platform android
```

---

## Testing the App

1. Run `npx expo start --tunnel` in the project folder
2. Scan QR code with Expo Go on iPhone
3. Sign up with email/password (validation enforced)
4. **Free tier testing**:
   - Create up to 2 collections
   - Add up to 5 items per collection
   - Try to exceed limits → see upgrade prompt
   - Tap Planning tab → see paywall
5. **Premium testing** (set `is_premium = true` in database):
   - Create unlimited collections and items
   - Access Planning tab fully
   - Export collection data to PDF
   - Enable goal notifications in Profile > Settings
   - Create goals with deadlines → receive notifications
6. View dashboard - search/filter items, see status counts
7. View collections - drag to reorder, search items
8. View collection detail - items sorted A-Z, progress card visible
9. Tap "Export Collection Data" button (premium only)
10. From collection, tap Add - collection auto-selected
11. Use Planning tab - view Progress Queue, create/edit/delete goals
12. Add wishlist items with game dropdown
13. Tap "See All" to view full list of items needing paint
14. Edit profile - change username, avatar
15. Set custom background image from Profile tab
16. Toggle dark mode - close and reopen app, preference persists
17. Follow other users and view their profiles
18. Access Help & Feedback from Profile tab
19. Export all collections from Profile > Export Collection Data
