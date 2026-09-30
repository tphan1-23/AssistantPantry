# PantryAssistant

A mobile app that reduces food waste by turning photos of receipts or fridge contents into a tracked pantry inventory, and suggesting zero-waste recipes for items about to expire.

Built with Expo (React Native + TypeScript), an offline-first `expo-sqlite` database, and Gemini for multimodal item extraction and recipe generation.

## Setup

```bash
npm install
cp .env.example .env   # then fill in EXPO_PUBLIC_GEMINI_API_KEY
npx expo start
```

Scan the QR code with the Expo Go app on your phone (Android: in-app scanner; iOS: use the regular Camera app), or press `a` / `i` for an Android/iOS simulator.

If the default model (`gemini-flash-latest`) is returning 503 "high demand" errors, set `EXPO_PUBLIC_GEMINI_MODEL` in `.env` to a lighter model like `gemini-flash-lite-latest`.

## Project structure

```
app/                 # Expo Router screens (file-based routing)
  _layout.tsx          # Root layout: SQLiteProvider + tab navigator
  index.tsx            # Inventory screen (home)
  scan.tsx             # Camera / gallery scan screen (freeze-frame preview before processing)
  review-scan.tsx      # Review/edit scanned items + duplicate-merge prompt before saving
  item-form.tsx        # Add or edit a single item manually (shared by both flows)
  recipes.tsx          # Zero-waste recipe generation screen
components/
  PantryItemCard.tsx
  RecipeCard.tsx
  DateField.tsx         # Reusable date picker field
services/
  database.ts           # expo-sqlite schema + queries + duplicate-matching heuristic
  gemini.ts             # Gemini (@google/genai) integration
  scanSession.ts         # In-memory handoff of scan results between screens
types/
  pantry.ts              # Shared TypeScript types
```

## How it works

1. **Scan**: capture a photo (camera or gallery) of a receipt, fridge, or single item. The camera freezes on the captured frame so you don't have to keep holding the phone steady while it's analyzed — confirm with "Use This Photo" or "Retake".
2. Gemini extracts each food item, a quantity + unit, and either a real expiration date read from the packaging or a conservative shelf-life estimate. Gemini also flags low-confidence guesses (e.g. it can't see inside an opaque container) rather than presenting them as fact.
3. **Review**: before anything is saved, you can edit each item's name/quantity/unit/expiry date. If an item looks like something already in your pantry, you're prompted to merge quantities or add it as a separate entry.
4. **Manual add/edit**: add an item by hand from the Pantry screen, or tap any existing item to edit its quantity or expiry date.
5. **Recipes**: items expiring within 72 hours are sent to Gemini, which generates zero-waste recipes prioritizing those ingredients.
