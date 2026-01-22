# TabletopVault - Project Status

## Overview

**App Name**: TabletopVault
**Purpose**: Mobile app for tabletop gaming collectors to track inventory, share collections, and monitor collection value
**Target Games**: Warhammer 40K, Warhammer Age of Sigmar, Horus Heresy, Kill Team, Star Wars Legion, Star Wars Shatterpoint, Halo Flashpoint, Bolt Action, Marvel Crisis Protocol, Battle Tech
**Tech Stack**: React Native + Expo + TypeScript + Supabase
**Repository**: https://github.com/martyp0916/TabletopVault
**Last Updated**: January 2025

---

## Current Status: MVP Complete + Profile Management

The app has a fully functional backend and polished UI. All core features are implemented including per-model status tracking, collection cover images, photo upload, profile editing with avatar upload, password management, and full CRUD operations. Dark mode persists globally.

### What's Working

| Feature | Status | Notes |
|---------|--------|-------|
| User signup | Working | Email/password auth (email confirmation disabled for dev) |
| User login | Working | Persists session with AsyncStorage |
| User logout | Working | Clears session and redirects to login |
| **Profile editing** | Working | Edit username and upload avatar photo |
| **Change password** | Working | Requires current password verification |
| Create collection | Working | Dropdown menu with 10 supported games + cover image |
| View collections | Working | Grid layout with item counts and cover images |
| Edit collection | Working | Edit game, description, and cover image |
| Delete collection | Working | With confirmation dialog |
| Add item | Working | Models per box + status breakdown (NIB, Assembled, Primed, Painted) |
| Edit item | Working | Edit name, faction, quantity, status counts, notes |
| **Status count tracking** | Working | Track how many models are in each status per item |
| Photo upload | Working | Camera + gallery picker, uploads to Supabase Storage |
| **Avatar upload** | Working | Camera + gallery picker for profile photos |
| **Collection cover images** | Working | Upload faction logos or photos for collections |
| View items | Working | List view in collection detail |
| View item detail | Working | Shows all item properties + photo |
| Delete item | Working | With confirmation dialog, cleans up photos |
| **Dashboard** | Working | 4-card status grid showing all statuses |
| **Collection stats** | Working | Shows breakdown by status (NIB, Assembled, Primed, Painted) |
| Pull-to-refresh | Working | All screens support pull-to-refresh |
| Global dark mode | Working | Theme persists across all tabs and screens |
| Profile page | Working | Shows user info, avatar, stats, and settings |

---

## Status Tracking System

The app tracks models by individual status counts, allowing users to track progress within a single box/unit:

### Status Categories (4 stages)
1. **New in Box** (gray) - Unassembled, still on sprues
2. **Assembled** (amber) - Built but not primed
3. **Primed** (indigo) - Primed and ready for paint
4. **Painted** (green) - Fully painted/battle ready

### How It Works
- Each item has fields: `nib_count`, `assembled_count`, `primed_count`, `painted_count`
- Example: A box of 10 Space Marines might have 3 assembled, 4 primed, 3 painted
- The "Models per Box" field tracks total models in the unit
- Status breakdown is shown on both Add and Edit forms
- Dashboard shows totals across all collections
- Collection detail shows totals for that collection

### Database Schema
```sql
items table includes:
- nib_count (integer, default 0)
- assembled_count (integer, default 0)
- primed_count (integer, default 0)
- painted_count (integer, default 0)
- based_count (integer, default 0) -- kept for backwards compatibility
```

---

## Profile Management

### Edit Profile (app/profile/edit.tsx)
- Edit username
- Upload avatar photo (camera or gallery)
- Avatar stored in `profile-images` Supabase bucket
- Uses `fetch` + `arrayBuffer()` for reliable React Native uploads
- Circular avatar display with proper overflow clipping

### Change Password (app/profile/change-password.tsx)
- Requires current password for verification
- New password + confirm password fields
- Show/hide password toggles
- Minimum 6 character validation
- Verifies current password via `signInWithPassword` before updating

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
| Prices | 0-$1,000,000 range |

**Sanitization features:**
- Removes null bytes (prevents null byte injection)
- Strips control characters
- Normalizes whitespace
- HTML escaping for display

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

**Features:**
- IP + user-based rate limiting
- Graceful 429 errors with retry-after time
- Rate limits cleared on successful auth
- RateLimitError class for proper error handling

### Mass Assignment Protection
All hooks reject unexpected fields:
- `useCollections`: Only allows `name`, `description`, `is_public`, `cover_image_url`
- `useItems`: Only allows defined item fields
- `useProfile`: Only allows `username`, `avatar_url`
- Unexpected fields are logged and rejected

### Auth Security (lib/auth.tsx)
- Email validation before server requests
- Password complexity requirements enforced
- Username sanitization
- Rate limiting on sign in/up to prevent brute force
- Rate limits cleared on successful authentication

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

## Development Progress

### Completed

- [x] Development environment setup (Node.js v20, Expo CLI, VS Code)
- [x] Project initialization with Expo Router tabs template
- [x] Custom color theme system with light/dark mode toggle
- [x] Global theme context - dark mode persists across all screens
- [x] All main UI screens built with consistent styling
- [x] Navigation between screens using Expo Router
- [x] GitHub repository created and code pushed
- [x] Supabase project created and configured
- [x] Database tables with Row Level Security
- [x] Fixed profile creation trigger for signup
- [x] Authentication system (login/signup/logout)
- [x] Auth context with protected routes
- [x] Database hooks for CRUD operations
- [x] All screens connected to real Supabase data
- [x] Photo upload functionality (camera + gallery)
- [x] Supabase Storage buckets for images
- [x] Signed URLs for secure image viewing
- [x] Pull-to-refresh on all screens
- [x] Game dropdown menu for collection creation
- [x] Delete collection functionality
- [x] Edit item functionality
- [x] Edit collection functionality
- [x] **Status count tracking** - per-model status tracking
- [x] **Collection cover images** - upload faction logos/photos
- [x] **4-status dashboard** - New in Box, Assembled, Primed, Painted
- [x] **Collection status breakdown** - shows counts per status
- [x] **Profile editing** - username and avatar upload
- [x] **Change password** - with current password verification
- [x] **Profile-images storage bucket** - for avatar photos

### Future Enhancements

- [ ] Password reset flow (forgot password via email)
- [ ] Search and filter items
- [ ] Export data to CSV/PDF
- [ ] Premium subscription features
- [ ] Social features (sharing, following)
- [ ] Make images public option (currently all private)

---

## Project Structure

```
TabletopVault/
├── app/                          # Expo Router screens
│   ├── (auth)/                   # Auth screens
│   │   ├── _layout.tsx           # Auth stack layout
│   │   ├── login.tsx             # Login form
│   │   └── signup.tsx            # Signup form
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── _layout.tsx           # Tab bar (Home, Collections, Add, Profile)
│   │   ├── index.tsx             # Home dashboard (4-card status grid)
│   │   ├── collections.tsx       # Collections grid + cover images
│   │   ├── add.tsx               # Add item form + status counts
│   │   └── profile.tsx           # User profile & settings
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
│   └── _layout.tsx               # Root layout with AuthProvider + ThemeProvider
├── components/
│   ├── Themed.tsx                # Theme-aware Text/View components
│   └── useColorScheme.ts         # System color scheme hook
├── constants/
│   └── Colors.ts                 # Light/dark theme colors
├── hooks/
│   ├── useCollections.ts         # Collection CRUD + refresh operations
│   ├── useItems.ts               # Item CRUD + status stats + refresh hooks
│   └── useProfile.ts             # User profile operations
├── lib/
│   ├── auth.tsx                  # AuthContext + useAuth hook
│   ├── supabase.ts               # Supabase client config
│   └── theme.tsx                 # ThemeProvider + useTheme hook
├── types/
│   └── database.ts               # TypeScript interfaces + constants
├── assets/                       # Fonts and images
├── app.json                      # Expo configuration
├── package.json                  # Dependencies
└── tsconfig.json                 # TypeScript config
```

---

## Supabase Configuration

**Project URL**: `https://hsqsskxwtknmuehrldlf.supabase.co`
**Database Password**: `w1MH8S3JEkzeEt0c`

### Database Tables

| Table | Columns | Purpose |
|-------|---------|---------|
| `profiles` | id, email, username, avatar_url, is_premium, created_at | User profiles (linked to auth.users) |
| `collections` | id, user_id, name, description, is_public, cover_image_url | Groups of items with optional cover image |
| `items` | id, collection_id, user_id, name, game_system, faction, quantity, status, nib_count, assembled_count, primed_count, painted_count, based_count, purchase_price, current_value, purchase_date, notes | Individual miniatures with status counts |
| `item_images` | id, item_id, image_url, is_primary | Photos for items |

### Supabase Storage

**Bucket**: `item-images` (private)
- Stores all item photos
- Images organized by: `{user_id}/{item_id}/{timestamp}.{ext}`
- Access via signed URLs (1 hour expiry)

**Bucket**: `collection-images` (private)
- Stores collection cover images (faction logos, etc.)
- Images organized by: `{user_id}/{collection_id}/{timestamp}.{ext}`
- Access via signed URLs (1 hour expiry)

**Bucket**: `profile-images` (private)
- Stores user avatar photos
- Images organized by: `{user_id}/avatar_{timestamp}.{ext}`
- Access via signed URLs (1 hour expiry)
- RLS policies: INSERT, SELECT, DELETE for authenticated users on their own folder

### Row Level Security Policies

**profiles:**
- Users can view own profile (SELECT)
- Users can update own profile (UPDATE)
- Users can insert own profile (INSERT)
- Service role can insert profiles (INSERT) - for signup trigger

**collections:**
- Users can view own collections (SELECT)
- Users can view public collections (SELECT)
- Users can create own collections (INSERT)
- Users can update own collections (UPDATE)
- Users can delete own collections (DELETE)

**items:**
- Users can view own items (SELECT)
- Users can view items in public collections (SELECT)
- Users can create own items (INSERT)
- Users can update own items (UPDATE)
- Users can delete own items (DELETE)

**item_images:**
- Users can view own item images (SELECT)
- Users can create own item images (INSERT)
- Users can delete own item images (DELETE)

**profile-images bucket:**
- Authenticated users can INSERT to their own folder
- Authenticated users can SELECT from their own folder
- Authenticated users can DELETE from their own folder

### Database Trigger

Auto-creates profile on user signup:
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

## Key Files Reference

### Authentication

**`lib/auth.tsx`** - Auth context provider
- `AuthProvider` - Wraps app, manages auth state
- `useAuth()` - Returns { user, session, loading, signUp, signIn, signOut }

**`lib/supabase.ts`** - Supabase client
- Configured with project URL and anon key
- Uses AsyncStorage for session persistence

### Global Theme

**`lib/theme.tsx`** - Theme context provider
- `ThemeProvider` - Wraps app, manages dark mode state globally
- `useTheme()` - Returns { isDarkMode, toggleTheme }

### Database Hooks

**`hooks/useCollections.ts`**
- `useCollections(userId)` - List all collections (with refresh)
- `useCollection(id)` - Get single collection (with refresh)
- `createCollection(name, description)` - Create new
- `updateCollection(id, updates)` - Update existing
- `deleteCollection(id)` - Delete

**`hooks/useItems.ts`**
- `useItems(userId, collectionId?)` - List items (with refresh)
- `useItem(id)` - Get single item (with refresh)
- `useItemStats(userId)` - Returns { total, nibTotal, assembledTotal, primedTotal, paintedTotal }
- `useRecentItems(userId, limit)` - Get recent items (with refresh)
- `createItem(item)` - Create new with status counts
- `updateItem(id, updates)` - Update existing
- `deleteItem(id)` - Delete

**`hooks/useProfile.ts`**
- `useProfile(userId)` - Get user profile with refresh
- `updateProfile(updates)` - Update username, avatar_url, etc.

### Profile Screens

**Edit Profile (app/profile/edit.tsx)**
- Username text input
- Avatar picker (camera or gallery)
- Uploads avatar using `fetch` + `arrayBuffer()` method
- Deletes old avatar when uploading new one
- Circular avatar with `overflow: 'hidden'` container

**Change Password (app/profile/change-password.tsx)**
- Current password field (required for verification)
- New password field
- Confirm password field
- Show/hide toggles for all fields
- Validates current password via `signInWithPassword` before updating
- Uses `supabase.auth.updateUser({ password })` for the change

### Home Dashboard (app/(tabs)/index.tsx)

Features:
- App name "TabletopVault" with personalized greeting
- Theme toggle button in header
- **4-card status grid** showing:
  - New in Box count (gray)
  - Assembled count (amber)
  - Primed count (indigo)
  - Painted count (green)
- Progress bar showing % painted
- Quick stat cards (total models, collections)
- "Paint Next" suggestion card
- Action buttons (Add Item, Collections)
- Recent items list with status dots
- Pull-to-refresh support

### Profile Page (app/(tabs)/profile.tsx)

Features:
- User avatar with circular display
- Username and email display
- Member since date
- Stats row (Items count, Collections count)
- Settings section (Notifications toggle)
- Account section (Edit Profile, Change Password, Export Data)
- Support section (Help & FAQ, About)
- Log Out button
- Uses regular React Native `View` (not Themed) to avoid black background issues

### Collection Screens

**Collection List (app/(tabs)/collections.tsx)**
- Dropdown menu with 10 supported games
- Optional description field
- **Cover image picker** (camera or gallery)
- Grid layout with cover images or colored banners
- Pull-to-refresh support

**Collection Detail (app/collection/[id].tsx)**
- Cover image display (if set)
- Collection info and item list
- **4-status breakdown**: New in Box, Assembled, Primed, Painted
- Edit and Delete buttons with confirmation
- Pull-to-refresh support

**Edit Collection (app/collection/edit/[id].tsx)**
- Game dropdown (same 10 games as create)
- Description text area
- **Cover image picker** with remove option
- Save Changes button

### Item Screens

**Add Item (app/(tabs)/add.tsx)**
- Collection dropdown showing collection name
- Name, faction fields
- **"Models per Box"** quantity field
- **Status breakdown inputs**:
  - New in Box (number input)
  - Assembled (number input)
  - Primed (number input)
  - Painted (number input)
- Photo picker (camera or gallery)
- Notes text area

**Item Detail (app/item/[id].tsx)**
- Photo display with signed URL
- Game and status tags
- Quantity card
- Details list (status, game system, faction, dates)
- Notes section
- Edit and Delete buttons
- Pull-to-refresh support

**Edit Item (app/item/edit/[id].tsx)**
- Name, faction fields
- **"Models per Box"** quantity field
- **Status breakdown inputs** (same as Add form)
- Notes text area
- Save Changes button

### Type Definitions

**`types/database.ts`**
```typescript
type GameSystem = 'wh40k' | 'aos' | 'legion' | 'other';
type ItemStatus = 'nib' | 'assembled' | 'primed' | 'painted' | 'based';

interface Item {
  id: string;
  collection_id: string;
  user_id: string;
  name: string;
  game_system: GameSystem;
  faction: string | null;
  quantity: number;
  status: ItemStatus;
  nib_count: number;
  assembled_count: number;
  primed_count: number;
  painted_count: number;
  based_count: number;
  purchase_price: number | null;
  current_value: number | null;
  purchase_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Display labels
GAME_SYSTEM_LABELS: { wh40k: 'Warhammer 40K', aos: 'Age of Sigmar', ... }
STATUS_LABELS: { nib: 'Shame Pile', painted: 'Battle Ready', ... }
GAME_COLORS: { wh40k: '#3b82f6', aos: '#f59e0b', ... }
STATUS_COLORS: { nib: '#ef4444', painted: '#10b981', ... }
```

---

## Issues Resolved

### "Database error saving new user" on signup
**Cause**: RLS policies blocked the trigger from inserting into profiles table
**Fix**: Added INSERT policies for profiles table and recreated trigger with SECURITY DEFINER

### Email confirmation link not loading
**Cause**: Supabase redirect URL not configured for mobile app
**Fix**: Disabled email confirmation for development

### Dark mode not persisting across tabs
**Cause**: Each screen had local `useState` for dark mode
**Fix**: Created global `ThemeProvider` context in `lib/theme.tsx`

### Collection cover images not displaying
**Cause**: React state timing issues with `fetchCoverImages` callback
**Fix**: Added explicit database fetch with signed URL generation after collection creation

### Collections page flashing/infinite loop
**Cause**: `useFocusEffect` had `fetchCoverImages` in dependencies, causing re-renders
**Fix**: Simplified `useFocusEffect` to only call `refresh()` with empty dependency array

### Avatar showing as black square
**Cause**: Image component needs explicit dimensions and proper container clipping
**Fix**: Added `overflow: 'hidden'` to avatar container, set explicit width/height

### Avatar upload not working (deprecated FileSystem method)
**Cause**: `expo-file-system` `readAsStringAsync` is deprecated in newer Expo versions
**Fix**: Changed to use `fetch` + `arrayBuffer()` method for file uploads

### Black squares behind profile stats
**Cause**: Themed `View` component applies default background color from theme
**Fix**: Import regular React Native `View` instead of Themed `View` for profile.tsx

### Password change not persisting
**Cause**: `updateUser` may not persist without re-authentication
**Fix**: Added current password verification via `signInWithPassword` before updating

---

## Commands

```bash
# Start development server
npx expo start

# Start with tunnel (for phone testing)
npx expo start --tunnel

# Install dependencies
npm install

# Run database migration (example)
node -e "const { Client } = require('pg'); ..."
```

---

## Dependencies

```json
{
  "@expo/vector-icons": "^14.1.0",
  "@react-native-async-storage/async-storage": "^2.1.2",
  "@supabase/supabase-js": "^2.49.8",
  "base64-arraybuffer": "^1.x",
  "expo": "~54.0.0",
  "expo-file-system": "~19.0.0",
  "expo-image-picker": "~16.1.0",
  "expo-router": "~5.0.0",
  "react": "19.0.0",
  "react-native": "0.81.5",
  "pg": "^8.x" (dev dependency for database scripts)
}
```

---

## Accounts & Services

| Service | Purpose | Account/URL |
|---------|---------|-------------|
| GitHub | Code repository | github.com/martyp0916/TabletopVault |
| Supabase | Backend/database/storage | hsqsskxwtknmuehrldlf.supabase.co |
| Expo | Build & deploy | (create when ready to publish) |
| Apple Developer | iOS App Store | (create when ready - $99/year) |
| Google Play | Android Store | (create when ready - $25 one-time) |

---

## Testing the App

1. Run `npx expo start --tunnel` in the project folder
2. Scan QR code with Expo Go on iPhone
3. Sign up with email/password (no confirmation needed)
4. Log in immediately
5. Create a collection (select game, optionally add cover image)
6. Add items with status breakdown (how many NIB, assembled, primed, painted)
7. View dashboard to see overall status counts
8. View collection to see status breakdown for that collection
9. Edit items to update status counts as you paint
10. Pull down on any screen to refresh data
11. Toggle dark mode - it persists across all screens
12. Edit profile - change username and upload avatar
13. Change password - requires current password verification
14. Delete items or collections as needed
