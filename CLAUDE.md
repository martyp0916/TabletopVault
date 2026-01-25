# TabletopVault - Project Status

## Overview

**App Name**: TabletopVault
**Purpose**: Mobile app for tabletop gaming collectors to track inventory, share collections, and monitor collection value
**Target Games**: Warhammer 40K, Warhammer Age of Sigmar, Horus Heresy, Kill Team, Star Wars Legion, Star Wars Shatterpoint, Halo Flashpoint, Bolt Action, Marvel Crisis Protocol, Battle Tech
**Tech Stack**: React Native + Expo + TypeScript + Supabase
**Repository**: https://github.com/martyp0916/TabletopVault
**Last Updated**: January 21, 2025

---

## Current Status: MVP Complete + Custom Theming

The app has a fully functional backend and polished UI with a crimson/dark theme. All core features are implemented including per-model status tracking, collection cover images, photo upload, profile editing with avatar upload, password management, custom background images, and full CRUD operations. Dark mode persists globally.

### What's Working

| Feature | Status | Notes |
|---------|--------|-------|
| User signup | Working | Email/password auth with validation + rate limiting |
| User login | Working | Persists session with AsyncStorage, rate limited |
| User logout | Working | Clears session and redirects to login |
| **Profile editing** | Working | Edit username, avatar, and background image |
| **Change password** | Working | Requires current password verification |
| **Custom background image** | In Progress | Upload works, display has issues (debugging) |
| Create collection | Working | Dropdown menu with 10 supported games + cover image |
| View collections | Working | Grid layout with item counts and cover images |
| Edit collection | Working | Edit game, description, and cover image |
| Delete collection | Working | With confirmation dialog |
| Add item | Working | Models per box + status breakdown |
| Edit item | Working | Edit name, faction, quantity, status counts, notes |
| **Status count tracking** | Working | Track how many models are in each status per item |
| **Effective status display** | Working | Shows "Work in Progress" for mixed states |
| Photo upload | Working | Camera + gallery picker, uploads to Supabase Storage |
| **Avatar upload** | Working | Camera + gallery picker for profile photos |
| **Collection cover images** | Working | Upload faction logos or photos for collections |
| View items | Working | List view in collection detail |
| View item detail | Working | Shows all item properties + photo |
| Delete item | Working | With confirmation dialog, cleans up photos |
| **Dashboard** | Working | 4-card status grid + search/filter |
| **Collection stats** | Working | Shows breakdown by status |
| Pull-to-refresh | Working | All screens support pull-to-refresh |
| Global dark mode | Working | Theme persists across all tabs and screens |
| Profile page | Working | Shows user info, avatar, stats, and settings |

---

## Color Theme: Battle Ready Edition

The app uses a game-neutral aesthetic with deep crimson accents:

```typescript
// Primary Colors
crimson: '#991b1b'      // Primary accent
crimsonLight: '#b91c1c' // Hover/active states
crimsonDark: '#7f1d1d'  // Pressed states

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

### Database Schema
```sql
items table includes:
- nib_count (integer, default 0)
- assembled_count (integer, default 0)
- primed_count (integer, default 0)
- painted_count (integer, default 0)
- based_count (integer, default 0) -- kept for backwards compatibility

profiles table includes:
- background_image_url (text, nullable) -- custom app background
```

---

## Custom Background Image Feature

**Status**: In Progress (upload works, display debugging needed)

### How It Works
1. User goes to Profile → Edit Profile
2. "App Background" section allows selecting an image
3. Image uploads to `profile-images` bucket as `{user_id}/background_{timestamp}.ext`
4. Path saved to `profiles.background_image_url`
5. ThemeProvider fetches signed URL and provides to all screens
6. Root layout wraps app in ImageBackground with semi-transparent overlay

### Files Involved
- `types/database.ts` - Added `background_image_url` to User interface
- `hooks/useProfile.ts` - Added field to allowed updates
- `lib/theme.tsx` - Extended with `backgroundImageUrl`, `setBackgroundImagePath`, `refreshBackgroundImage`
- `app/_layout.tsx` - Added ImageBackground wrapper in RootLayoutNav
- `app/(tabs)/_layout.tsx` - Made tab bar transparent when background set
- `app/profile/edit.tsx` - Added background picker UI
- All tab screens - Updated to use transparent backgrounds

### Known Issue
Background appears black instead of showing the uploaded image. Debug logging added to trace the issue. Console logs show:
- `[Layout] ThemeWithProfile - profile?.background_image_url: ...`
- `[Theme] refreshBackgroundImage called with path: ...`
- `[Layout] backgroundImageUrl: SET or NULL`

---

## Profile Management

### Edit Profile (app/profile/edit.tsx)
- Edit username
- Upload avatar photo (camera or gallery)
- **Upload background image** (camera or gallery, 9:16 aspect)
- Remove background option
- Avatar stored in `profile-images` Supabase bucket
- Uses `fetch` + `arrayBuffer()` for reliable React Native uploads

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
- `useProfile`: Only allows `username`, `avatar_url`, `background_image_url`
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

## Project Structure

```
TabletopVault/
├── app/                          # Expo Router screens
│   ├── (auth)/                   # Auth screens
│   │   ├── _layout.tsx           # Auth stack layout
│   │   ├── login.tsx             # Login form with validation
│   │   └── signup.tsx            # Signup form with validation
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── _layout.tsx           # Tab bar (transparent when background set)
│   │   ├── index.tsx             # Home dashboard + search/filter
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
│   │   ├── edit.tsx              # Edit profile (username, avatar, background)
│   │   └── change-password.tsx   # Change password screen
│   └── _layout.tsx               # Root layout with ImageBackground wrapper
├── components/
│   ├── Themed.tsx                # Theme-aware Text/View components
│   └── useColorScheme.ts         # System color scheme hook
├── constants/
│   └── Colors.ts                 # Crimson theme colors (Battle Ready Edition)
├── hooks/
│   ├── useCollections.ts         # Collection CRUD with validation
│   ├── useItems.ts               # Item CRUD with validation + stats
│   └── useProfile.ts             # Profile operations with validation
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
│       └── 20250121000000_add_background_image.sql
├── types/
│   └── database.ts               # TypeScript interfaces + getEffectiveStatus()
├── .env                          # Environment variables (git ignored)
├── .env.example                  # Template for env vars
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
| `profiles` | id, email, username, avatar_url, **background_image_url**, is_premium, created_at, updated_at | User profiles |
| `collections` | id, user_id, name, description, is_public, cover_image_url, created_at, updated_at | Groups of items |
| `items` | id, collection_id, user_id, name, game_system, faction, quantity, status, nib_count, assembled_count, primed_count, painted_count, based_count, purchase_price, current_value, purchase_date, notes, created_at, updated_at | Individual miniatures |
| `item_images` | id, item_id, image_url, is_primary, created_at | Photos for items |

### Supabase Storage Buckets

**Bucket**: `item-images` (private)
- Stores all item photos
- Path: `{user_id}/{item_id}/{timestamp}.{ext}`
- Access via signed URLs (1 hour expiry)

**Bucket**: `collection-images` (private)
- Stores collection cover images
- Path: `{user_id}/{collection_id}/{timestamp}.{ext}`
- Access via signed URLs (1 hour expiry)

**Bucket**: `profile-images` (private)
- Stores user avatars and background images
- Avatar path: `{user_id}/avatar_{timestamp}.{ext}`
- Background path: `{user_id}/background_{timestamp}.{ext}`
- Access via signed URLs (1 hour expiry)

### Row Level Security Policies

All tables have RLS enabled with user-based access control:
- Users can only access their own data
- Public collections/items visible to all (when is_public = true)
- Service role used for signup trigger

---

## Key Files Reference

### Theme System (lib/theme.tsx)

```typescript
interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  backgroundImageUrl: string | null;
  setBackgroundImagePath: (path: string | null) => void;
  refreshBackgroundImage: (path?: string | null) => Promise<void>;
}
```

- Manages dark mode state globally
- Handles background image signed URL fetching
- Uses ref to avoid stale closure issues

### Type Definitions (types/database.ts)

```typescript
type GameSystem = 'wh40k' | 'aos' | 'legion' | 'other';
type ItemStatus = 'nib' | 'assembled' | 'primed' | 'painted' | 'based' | 'wip';

interface User {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  background_image_url: string | null;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
}

// Helper function
getEffectiveStatus(item: Item): ItemStatus
```

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
- [x] Custom background image upload (partial - display issues)

### In Progress
- [ ] Custom background image display (debugging)

### Future Enhancements
- [ ] Password reset flow (forgot password via email)
- [ ] Export data to CSV/PDF
- [ ] Premium subscription features
- [ ] Social features (sharing, following)
- [ ] Public image sharing option

---

## Known Issues

### Background Image Shows Black
**Status**: Debugging
**Symptoms**: Image uploads successfully, but displays as black on all tabs
**Debug logs added**: Check Expo console for `[Layout]` and `[Theme]` messages
**Possible causes**:
1. Signed URL not being generated correctly
2. ImageBackground not receiving the URL
3. Profile not refreshing after update

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
const client = new Client({
  host: 'db.hsqsskxwtknmuehrldlf.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'w1MH8S3JEkzeEt0c',
  ssl: { rejectUnauthorized: false }
});
client.connect().then(() => {
  return client.query('YOUR SQL HERE');
}).then(() => client.end());
"
```

---

## Testing the App

1. Run `npx expo start --tunnel` in the project folder
2. Scan QR code with Expo Go on iPhone
3. Sign up with email/password (validation enforced)
4. Create a collection (select game, optionally add cover image)
5. Add items with status breakdown
6. View dashboard - search/filter items, see status counts
7. Edit profile - change username, avatar, background image
8. Toggle dark mode - persists across all screens
9. Check console logs for debugging background image issues
