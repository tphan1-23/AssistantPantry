export interface PantryItem {
  id: number;
  name: string;
  quantity: string;
  dateAddedTimestamp: number;
  expiryTimestamp: number;
  isConsumed: boolean;
}

export interface Recipe {
  title: string;
  urgentIngredientsUsed: string[];
  additionalIngredients: string[];
  instructions: string[];
}

export interface ScannedItem {
  name: string;
  quantity: string;
  estimated_shelf_life_days: number;
}
