# PantryAssistant

A mobile app that reduces food waste by turning photos of receipts or fridge contents into a tracked pantry inventory, and suggesting zero-waste recipes for items about to expire.

Built with Expo (React Native + TypeScript), an offline-first `expo-sqlite` database, and Gemini for multimodal item extraction and recipe generation.

## Setup

```bash
npm install
cp .env.example .env   # then fill in EXPO_PUBLIC_GEMINI_API_KEY
npx expo start
```

Scan the QR code with the Expo Go app on your phone, or press `a` / `i` for an Android/iOS simulator, or `w` for web.

## Project structure

```
app/                # Expo Router screens (file-based routing)
  _layout.tsx        # Root layout: SQLiteProvider + tab navigator
  index.tsx          # Inventory screen (home)
  scan.tsx            # Camera / gallery scan screen
  recipes.tsx         # Zero-waste recipe generation screen
components/
  PantryItemCard.tsx
  RecipeCard.tsx
services/
  database.ts         # expo-sqlite schema + queries
  gemini.ts           # Gemini (@google/genai) integration
types/
  pantry.ts           # Shared TypeScript types
```

## How it works

1. **Scan**: capture a photo (camera or gallery) of a receipt or fridge contents.
2. Gemini extracts each food item, an estimated quantity, and a conservative shelf-life estimate, returned as strict JSON.
3. Items are inserted into the local SQLite database with a computed expiry timestamp.
4. **Recipes**: items expiring within 72 hours are sent to Gemini, which generates zero-waste recipes prioritizing those ingredients.
