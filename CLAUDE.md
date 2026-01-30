# TabletopVault - Project Status

## Overview

**App Name**: TabletopVault
**Purpose**: Mobile app for tabletop gaming collectors to track inventory, share collections, plan painting projects, and connect with other hobbyists
**Target Games**: Warhammer 40K, Warhammer Age of Sigmar, Horus Heresy, Kill Team, Star Wars Legion, Star Wars Shatterpoint, Halo Flashpoint, Bolt Action, Marvel Crisis Protocol, Battle Tech
**Tech Stack**: React Native + Expo + TypeScript + Supabase
**Repository**: https://github.com/martyp0916/TabletopVault
**Last Updated**: January 26, 2025

---

## Recent Changes (January 26, 2025)

- **Theme persistence**: Dark/light mode preference now saves to AsyncStorage and persists across app restarts
- **Collection detail improvements**:
  - Items sorted alphabetically by name
  - Progress card showing painting percentage, progress bar, and status breakdown
  - Item notes now visible on collection item cards (max 2 lines)
  - Fixed black background visibility issues by using React Native View instead of themed View
  - Reduced header padding for more compact layout
- **Collection pre-selection**: When adding an item from within a collection, that collection is auto-selected
- **Wishlist updates**:
  - Game system now uses dropdown selector (matches collection games list)
  - Removed all price/cost fields - app focuses on collection tracking, not finances
- **Goal management**: Added visible delete button (trash icon) with confirmation dialog
- **Keyboard handling**: Improved keyboard avoiding on Add screen for notes field

---

## Current Status: Full Feature App with Social & Planning

The app is a fully-featured tabletop collection manager with social features and planning tools. All core features are complete including inventory management, social following, progress queue, goal tracking, wishlist, and progress dashboards. The app uses a crimson/dark theme with support for custom background images. Theme preference (dark/light mode) persists across app restarts. Collection detail screens show progress cards and alphabetically-sorted items with notes visible.

### What's Working

| Feature | Status | Notes |
|---------|--------|-------|
| **Authentication** | | |
| User signup | Working | Email/password auth with validation + rate limiting |
| User login | Working | Persists session with AsyncStorage, rate limited |
| User logout | Working | Clears session and redirects to login |
| Forgot password | Working | Email-based password reset flow |
| Reset password | Working | Deep link handling for password reset |
| **Profile** | | |
| Profile editing | Working | Edit username and avatar |
| Avatar upload | Working | Camera + gallery picker for profile photos |
| Change password | Working | Requires current password verification |
| Custom background image | Working | Set app-wide background from Profile tab |
| **Collections** | | |
| Create collection | Working | Dropdown menu with 10 supported games + cover image |
| View collections | Working | Grid layout with item counts and cover images |
| Edit collection | Working | Edit game, description, and cover image |
| Delete collection | Working | With confirmation dialog |
| Collection cover images | Working | Upload faction logos or photos for collections |
| **Items** | | |
| Add item | Working | Models per box + status breakdown |
| Edit item | Working | Edit name, faction, quantity, status counts, notes |
| View item detail | Working | Shows all item properties + photo |
| Delete item | Working | With confirmation dialog, cleans up photos |
| Photo upload | Working | Camera + gallery picker, uploads to Supabase Storage |
| Status count tracking | Working | Track how many models are in each status per item |
| Effective status display | Working | Shows "Work in Progress" for mixed states |
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
| **Planning Tab** | | |
| Progress queue | Working | Auto-populated list of unpainted items (shows 5, "See All" for more) |
| See All modal | Working | Full scrollable list of all items needing paint |
| Painting goals | Working | Create goals with optional deadlines |
| Goal progress | Working | Track current vs target count |
| Complete goals | Working | Mark goals as finished |
| Overall progress | Working | Percentage of models painted across all collections |
| Collection progress | Working | Per-collection painting progress breakdown |
| Wishlist | Working | Track future items to buy with game system dropdown |
| **UI/UX** | | |
| Global dark mode | Working | Theme persists across app restarts via AsyncStorage |
| Dark mode contrast | Working | Lighter card backgrounds for better visibility |
| Text visibility | Working | Solid backgrounds for text when background image set |
| Safe area handling | Working | Content avoids phone notch/camera area |
| Keyboard avoiding | Working | Goal modal and Add screen adjust for keyboard |
| **Collection Detail** | | |
| Alphabetical sorting | Working | Items sorted A-Z by name |
| Progress card | Working | Shows painting percentage, progress bar, status breakdown |
| Item notes display | Working | Notes visible on item cards (2-line limit) |
| Collection pre-selection | Working | Add screen auto-selects collection when navigating from collection |
| **Planning Tab** | | |
| Goal delete button | Working | Visible trash icon with confirmation dialog |

---

## App Navigation Structure

The app has 5 main tabs:

```
┌─────────┬─────────────┬─────────┬──────────┬─────────┐
│  Home   │ Collections │   Add   │ Planning │ Profile │
└─────────┴─────────────┴─────────┴──────────┴─────────┘
```

1. **Home** - Dashboard with status overview, search/filter
2. **Collections** - Grid of user's collections
3. **Add** - Form to add new items
4. **Planning** - Progress queue, goals, progress tracking
5. **Profile** - User info, settings, customization, logout

---

## Planning Tab Features

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
- Keyboard avoiding ensures input fields visible when typing

### Progress Dashboard
- **Overall Progress**: Total models painted across all collections with percentage
- **Status Breakdown**: Count of models in each status (NIB, Assembled, Primed, Painted)
- **Collection Progress**: Per-collection painted percentage, sorted by least progress first

### Wishlist
- Track future items you want to purchase
- Add item name, game system (dropdown selection), and optional notes
- Game system uses dropdown matching supported games (no text input)
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

### Technical Notes
- Uses React Native's `View` component (not themed) to avoid auto-background issues
- Progress bar uses explicit colors (#333333 card, #404040 bar background in dark mode)
- Items sorted using `localeCompare()` for proper alphabetical ordering

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

### Files Involved
- `types/database.ts` - Added `background_image_url` to User interface
- `hooks/useProfile.ts` - Added field to allowed updates
- `lib/theme.tsx` - Theme persistence + background image support (`backgroundImageUrl`, `setBackgroundImagePath`, `refreshBackgroundImage`)
- `app/_layout.tsx` - Added ImageBackground wrapper in RootLayoutNav
- `app/(tabs)/_layout.tsx` - Made tab bar transparent when background set
- `app/(tabs)/profile.tsx` - Background picker in CUSTOMIZATION section
- All tab screens - Updated with `paddingTop: 60` and background containers for text

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
- `useCollections`: Only allows `name`, `description`, `is_public`, `cover_image_url`
- `useItems`: Only allows defined item fields
- `useProfile`: Only allows `username`, `avatar_url`, `background_image_url`
- `usePaintingGoals`: Only allows defined goal fields

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
3. Halo Flashpoint
4. Horus Heresy
5. Marvel Crisis Protocol
6. Star Wars Legion
7. Star Wars Shatterpoint
8. Warhammer 40K
9. Warhammer 40K: Kill Team
10. Warhammer Age of Sigmar

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
│   │   ├── _layout.tsx           # Tab bar (transparent when background set)
│   │   ├── index.tsx             # Home dashboard + search/filter
│   │   ├── collections.tsx       # Collections grid + cover images
│   │   ├── add.tsx               # Add item form + status counts
│   │   ├── planning.tsx          # Progress queue, goals, progress
│   │   └── profile.tsx           # User profile, settings, customization
│   ├── collection/
│   │   ├── [id].tsx              # Collection detail + status breakdown
│   │   └── edit/
│   │       └── [id].tsx          # Edit collection + cover image
│   ├── item/
│   │   ├── [id].tsx              # Item detail + edit/delete
│   │   └── edit/
│   │       └── [id].tsx          # Edit item + status counts
│   ├── profile/
│   │   ├── edit.tsx              # Edit profile (username, avatar)
│   │   └── change-password.tsx   # Change password screen
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
│   └── useColorScheme.ts         # System color scheme hook
├── constants/
│   └── Colors.ts                 # Crimson theme colors (Battle Ready Edition)
├── hooks/
│   ├── useCollections.ts         # Collection CRUD with validation
│   ├── useItems.ts               # Item CRUD with validation + stats
│   ├── useProfile.ts             # Profile operations with validation
│   ├── useFollows.ts             # Follow/unfollow operations
│   ├── usePaintQueue.ts          # Paint queue management (legacy, not used)
│   ├── usePaintingGoals.ts       # Painting goals CRUD
│   ├── useProgressStats.ts       # Progress calculations
│   └── useWishlist.ts            # Wishlist CRUD, mark as purchased
├── lib/
│   ├── auth.tsx                  # AuthContext with rate limiting
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
│       └── 20250125000000_add_wishlist.sql
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
| `collections` | Groups of items (id, user_id, name, description, is_public, cover_image_url) |
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
interface Collection { id, user_id, name, description, is_public, cover_image_url, ... }
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
| `useCollections` | CRUD for collections with validation |
| `useItems` | CRUD for items with validation and stats |
| `useProfile` | Profile operations (fetch, update) |
| `useFollows` | Follow/unfollow, get followers/following |
| `usePaintingGoals` | CRUD for painting goals, progress tracking |
| `useProgressStats` | Calculate overall and per-collection progress |
| `useWishlist` | CRUD for wishlist items, mark as purchased |

---

## Development Progress

### Completed
- [x] Core app with all CRUD operations
- [x] Authentication with validation and rate limiting
- [x] Per-model status tracking
- [x] Work in Progress status for mixed states
- [x] Collection cover images
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
- [x] Progress dashboard
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

### Future Enhancements
- [ ] Activity feed (see what followed users are painting)
- [ ] Comments and likes on items
- [ ] Export data to CSV/PDF
- [ ] Premium subscription features
- [ ] Push notifications for goal deadlines
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
4. Create a collection (select game, optionally add cover image)
5. Add items with status breakdown and notes
6. View dashboard - search/filter items, see status counts
7. View collection - items sorted A-Z, progress card visible, notes shown
8. From collection, tap Add - collection auto-selected
9. Use Planning tab - view Progress Queue, create/edit/delete goals
10. Add wishlist items with game dropdown
11. Tap "See All" to view full list of items needing paint
12. Edit profile - change username, avatar
13. Set custom background image from Profile tab
14. Toggle dark mode - close and reopen app, preference persists
15. Follow other users and view their profiles
