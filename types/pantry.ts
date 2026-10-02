export interface PantryItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  dateAddedTimestamp: number;
  expiryTimestamp: number;
  isConsumed: boolean;
  /** When this item left the Pantry list (used or removed); null while still active. */
  removedAtTimestamp: number | null;
  /** Why it left the Pantry list - drives the label shown in History. */
  removedReason: 'used' | 'removed' | null;
}

export interface Recipe {
  title: string;
  urgentIngredientsUsed: string[];
  additionalIngredients: string[];
  instructions: string[];
}

export interface FavoriteRecipe extends Recipe {
  id: number;
}

export type ScanConfidence = 'high' | 'low';

export interface ScannedItem {
  name: string;
  quantity: number;
  unit: string;
  /** ISO date (YYYY-MM-DD) read directly from packaging, if visible. */
  expiry_date: string | null;
  /** Used only when expiry_date isn't available. */
  estimated_shelf_life_days: number | null;
  /** 'low' when Gemini is guessing rather than reading real label/date info. */
  confidence: ScanConfidence;
  /** Explanation shown to the user when confidence is low. */
  note: string | null;
}
