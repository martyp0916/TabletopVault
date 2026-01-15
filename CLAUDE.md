# TabletopVault - Project Status

## Overview

**App Name**: TabletopVault
**Purpose**: Mobile app for tabletop gaming collectors to track inventory, share collections, and monitor collection value
**Target Games**: Warhammer 40K, Age of Sigmar, Star Wars Legion
**Tech Stack**: React Native + Expo + TypeScript + Supabase
**Repository**: https://github.com/martyp0916/TabletopVault
**Last Updated**: January 2025

---

## Current Status: MVP Complete + Photo Upload

The app has a fully functional backend and is ready for testing. All core features are implemented and connected to Supabase, including photo upload functionality.

### What's Working

| Feature | Status | Notes |
|---------|--------|-------|
| User signup | Working | Email/password auth (email confirmation disabled for dev) |
| User login | Working | Persists session with AsyncStorage |
| User logout | Working | Clears session and redirects to login |
| Create collection | Working | Modal form, saves to database |
| View collections | Working | Grid layout with item counts |
| Add item | Working | Full form with game/status/price fields |
| **Photo upload** | Working | Camera + gallery picker, uploads to Supabase Storage |
| View items | Working | List view in collection detail |
| View item detail | Working | Shows all item properties + photo |
| Delete item | Working | With confirmation dialog, cleans up photos |
| Dashboard stats | Working | Real-time from database |
| Profile page | Working | Shows user info and stats |

---

## Development Progress

### Completed

- [x] Development environment setup (Node.js v20, Expo CLI, VS Code)
- [x] Project initialization with Expo Router tabs template
- [x] Custom color theme system with light/dark mode toggle
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
- [x] Supabase Storage bucket for private image storage
- [x] Signed URLs for secure image viewing

### Future Enhancements

- [ ] Edit item functionality
- [ ] Edit/delete collection functionality
- [ ] Password reset flow
- [ ] Profile editing (username, avatar)
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
│   │   ├── index.tsx             # Home dashboard
│   │   ├── collections.tsx       # Collections grid
│   │   ├── add.tsx               # Add item form + photo picker
│   │   └── profile.tsx           # User profile & settings
│   ├── collection/
│   │   └── [id].tsx              # Collection detail (dynamic route)
│   ├── item/
│   │   └── [id].tsx              # Item detail + photo display (dynamic route)
│   └── _layout.tsx               # Root layout with AuthProvider
├── components/
│   ├── Themed.tsx                # Theme-aware Text/View components
│   └── useColorScheme.ts         # System color scheme hook
├── constants/
│   └── Colors.ts                 # Light/dark theme colors
├── hooks/
│   ├── useCollections.ts         # Collection CRUD operations
│   ├── useItems.ts               # Item CRUD + stats hooks
│   └── useProfile.ts             # User profile operations
├── lib/
│   ├── auth.tsx                  # AuthContext + useAuth hook
│   └── supabase.ts               # Supabase client config
├── types/
│   └── database.ts               # TypeScript interfaces + constants
├── supabase/
│   └── migrations/               # SQL migration files
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
| `collections` | id, user_id, name, description, is_public, cover_image_url | Groups of items |
| `items` | id, collection_id, user_id, name, game_system, faction, quantity, status, purchase_price, current_value, purchase_date, notes | Individual miniatures |
| `item_images` | id, item_id, image_url, is_primary | Photos for items |

### Supabase Storage

**Bucket**: `item-images` (private)
- Stores all item photos
- Images organized by: `{user_id}/{item_id}/{timestamp}.{ext}`
- Access via signed URLs (1 hour expiry)

**Storage Policies**:
- Users can upload (INSERT) - authenticated users
- Users can view (SELECT) - authenticated users
- Users can delete (DELETE) - authenticated users

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

### Database Trigger

Auto-creates profile on user signup:
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Auth Settings

- Email confirmation: **Disabled** (for development)
- To re-enable: Supabase Dashboard → Authentication → Providers → Email → Toggle "Confirm email"

---

## Key Files Reference

### Authentication

**`lib/auth.tsx`** - Auth context provider
- `AuthProvider` - Wraps app, manages auth state
- `useAuth()` - Returns { user, session, loading, signUp, signIn, signOut }

**`lib/supabase.ts`** - Supabase client
- Configured with project URL and anon key
- Uses AsyncStorage for session persistence

### Database Hooks

**`hooks/useCollections.ts`**
- `useCollections(userId)` - List all collections
- `useCollection(id)` - Get single collection
- `createCollection(name, description)` - Create new
- `updateCollection(id, updates)` - Update existing
- `deleteCollection(id)` - Delete

**`hooks/useItems.ts`**
- `useItems(userId, collectionId?)` - List items
- `useItem(id)` - Get single item
- `useItemStats(userId)` - Get total/battleReady/shamePile counts
- `useRecentItems(userId, limit)` - Get recent items
- `createItem(item)` - Create new (returns { data, error })
- `updateItem(id, updates)` - Update existing
- `deleteItem(id)` - Delete

**`hooks/useProfile.ts`**
- `useProfile(userId)` - Get user profile
- `updateProfile(updates)` - Update profile

### Photo Upload (app/(tabs)/add.tsx)

- `pickImage(useCamera)` - Opens camera or gallery
- `showImageOptions()` - Shows action sheet to choose camera/gallery
- `uploadImage(itemId)` - Uploads to Supabase Storage, returns file path
- Images saved to `item_images` table with `is_primary: true`

### Photo Display (app/item/[id].tsx)

- Fetches primary image from `item_images` table
- Creates signed URL for private bucket access
- Displays image or placeholder if none exists
- Cleans up storage on item deletion

### Type Definitions

**`types/database.ts`**
```typescript
type GameSystem = 'wh40k' | 'aos' | 'legion' | 'other';
type ItemStatus = 'nib' | 'assembled' | 'primed' | 'painted' | 'based';

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
**Fix**: Disabled email confirmation for development (can re-enable for production with deep linking)

---

## Commands

```bash
# Start development server
npx expo start

# Start with tunnel (for phone testing)
npx expo start --tunnel

# Install dependencies
npm install

# Connect to database (for debugging)
node -e "const { Client } = require('pg'); ..."
```

---

## Dependencies

```json
{
  "@expo/vector-icons": "^14.1.0",
  "@react-native-async-storage/async-storage": "^2.1.2",
  "@supabase/supabase-js": "^2.49.8",
  "expo": "~53.0.0",
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
5. Create a collection
6. Add items to collection (try adding a photo!)
7. View item details to see the photo
8. View dashboard stats update in real-time
