# TabletopVault - Project Status

## Overview

**App Name**: TabletopVault
**Purpose**: Mobile app for tabletop gaming collectors to track inventory, share collections, and monitor collection value
**Target Games**: Warhammer 40K, Age of Sigmar, Star Wars Legion
**Tech Stack**: React Native + Expo + TypeScript + Supabase
**Repository**: https://github.com/martyp0916/TabletopVault

---

## Development Progress

### Completed

- [x] Development environment setup (Node.js, Expo CLI, VS Code)
- [x] Project initialization with Expo Router tabs template
- [x] Custom color theme system with light/dark mode support
- [x] All main UI screens built
- [x] Navigation between screens using Expo Router
- [x] GitHub repository created and code pushed
- [x] Supabase project created and configured
- [x] Database tables set up with Row Level Security
- [x] Authentication system (login/signup/logout)
- [x] Auth context and protected routes
- [x] Database hooks for collections and items
- [x] All screens connected to real Supabase data

### Ready for Testing

The app now has a fully functional backend. Users can:
- Sign up and log in
- Create collections
- Add items to collections
- View item details
- Delete items
- View stats on dashboard
- Log out

### Future Enhancements

- [ ] Photo upload functionality
- [ ] Edit item functionality
- [ ] Edit collection functionality
- [ ] Password reset flow
- [ ] Profile editing
- [ ] Export data feature
- [ ] Premium subscription features

---

## Project Structure

```
TabletopVault/
├── app/                          # Expo Router screens
│   ├── (auth)/                   # Auth screens (login, signup)
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── _layout.tsx           # Tab bar configuration
│   │   ├── index.tsx             # Home screen (dashboard)
│   │   ├── collections.tsx       # Collections grid
│   │   ├── add.tsx               # Add item form
│   │   └── profile.tsx           # User profile & settings
│   ├── collection/
│   │   └── [id].tsx              # Collection detail screen
│   ├── item/
│   │   └── [id].tsx              # Item detail screen
│   └── _layout.tsx               # Root layout with auth
├── components/
│   └── Themed.tsx                # Theme-aware Text/View components
├── constants/
│   └── Colors.ts                 # Light/dark color definitions
├── hooks/
│   ├── useCollections.ts         # Collection CRUD hooks
│   ├── useItems.ts               # Item CRUD hooks
│   └── useProfile.ts             # Profile hooks
├── lib/
│   ├── auth.tsx                  # Auth context provider
│   └── supabase.ts               # Supabase client configuration
├── types/
│   └── database.ts               # TypeScript types for database
├── supabase/
│   └── migrations/               # Database migrations
├── assets/                       # Images and fonts
├── app.json                      # Expo configuration
├── package.json                  # Dependencies
└── tsconfig.json                 # TypeScript config
```

---

## Supabase Configuration

**Project URL**: `https://hsqsskxwtknmuehrldlf.supabase.co`

### Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (extends auth.users) |
| `collections` | User's collections/groups of items |
| `items` | Individual miniatures/models |
| `item_images` | Photos attached to items |

### Row Level Security Policies

All tables have RLS enabled with policies ensuring:
- Users can only view/edit their own data
- Public collections are viewable by all
- Auto-creates profile on user signup via trigger

---

## Key Features by Screen

### Login/Signup (`app/(auth)/`)
- Email/password authentication
- Form validation
- Error handling
- Email confirmation on signup

### Home (`app/(tabs)/index.tsx`)
- Stats: total items, battle ready, shame pile
- "On The Table" section for WIP items
- Recent activity list
- Quick action buttons

### Collections (`app/(tabs)/collections.tsx`)
- Grid of collection cards
- Create new collection modal
- Item counts per collection
- Navigate to collection detail

### Add Item (`app/(tabs)/add.tsx`)
- Collection picker
- Game system selector
- Status selector with color coding
- Saves to Supabase

### Collection Detail (`app/collection/[id].tsx`)
- Collection stats
- Items list with status indicators
- Navigate to item detail

### Item Detail (`app/item/[id].tsx`)
- Full item information
- Price/value display
- Delete functionality

### Profile (`app/(tabs)/profile.tsx`)
- User info from database
- Total items and collections stats
- Settings toggles
- Logout functionality

---

## Database Types

```typescript
type GameSystem = 'wh40k' | 'aos' | 'legion' | 'other';
type ItemStatus = 'nib' | 'assembled' | 'primed' | 'painted' | 'based';

interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface Item {
  id: string;
  collection_id: string;
  user_id: string;
  name: string;
  game_system: GameSystem;
  faction: string | null;
  quantity: number;
  status: ItemStatus;
  purchase_price: number | null;
  current_value: number | null;
  purchase_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

---

## Commands

```bash
# Start development server
npx expo start

# Start with tunnel (for testing on phone)
npx expo start --tunnel

# Install dependencies
npm install
```

---

## Accounts & Services

| Service | Purpose | Account |
|---------|---------|---------|
| GitHub | Code repository | martyp0916 |
| Supabase | Backend/database | (created) |
| Expo | Build & deploy | (needed for publishing) |
