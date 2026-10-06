import { GoogleGenAI, createPartFromBase64, createUserContent } from '@google/genai';

import type { Recipe, ScannedItem } from '@/types/pantry';

const MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-flash-latest';

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('EXPO_PUBLIC_GEMINI_API_KEY is not set. Add it to your .env file.');
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

function parseJsonArray<T>(text: string | undefined, label: string): T[] {
  if (!text) {
    throw new Error(`Gemini returned an empty response while ${label}.`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Gemini returned malformed JSON while ${label}.`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`Gemini response was not a JSON array while ${label}.`);
  }
  return parsed as T[];
}

const SCAN_PROMPT = `You are analyzing a photo of a receipt, a fridge/pantry, or a single food or drink item.

For each distinct food/drink item you can identify, return an object with:
- "name": a specific product name when a brand/label is actually visible (e.g. "Ricola Honey Herb Cough Drops", not just "candy"), or a clear, specific description for unpackaged/home-cooked food (e.g. "Grilled Chicken Breast", "Leftover Spaghetti" - never a vague catch-all like "food" or "snack").
- "quantity": an integer count of distinct units (e.g. a 6-pack of soda is quantity 6, unit "can" - not quantity 1, unit "6-pack"). For something sold/measured by weight or volume with no individually countable units (a bag of rice, a gallon of milk), use quantity 1 and put the size in "unit" instead.
- "unit": a short word/phrase for what's being counted (e.g. "can", "bottle", "2lb bag", "gallon"). Use "item" if genuinely unsure.
- "expiry_date": if you can actually read a printed expiration, "best by", or "use by" date on the packaging, return it as "YYYY-MM-DD". Otherwise null. Do NOT guess a date — only fill this in if the text is genuinely visible and legible in the photo.
- "estimated_shelf_life_days": only used when expiry_date is null. A conservative, category-appropriate shelf-life estimate in days (e.g. fresh leafy greens ~5-7, raw poultry ~2, cooked leftovers ~4, canned goods ~365, fresh-baked bread ~5) - not one generic number for everything.
- "confidence": "high" if you identified the item and any date from clearly visible text/labeling, or "low" if you are guessing contents you cannot actually verify (e.g. a closed cup, an opaque or sealed container, blurry packaging).
- "note": null, or a short explanation when confidence is "low" (e.g. "Cup is opaque; contents assumed from cup branding only").

Never confidently invent specifics you cannot see. If contents are hidden, say so via low confidence and a note rather than presenting a guess as fact. If the photo is a receipt, read the printed item names/quantities directly rather than guessing from icons or memory of the store's typical products.

Examples of good vs. bad identification:
- GOOD: {"name": "Fage Total 0% Greek Yogurt", "quantity": 1, "unit": "32oz tub", "confidence": "high", ...} — specific brand/product actually read off a legible label.
- BAD: {"name": "yogurt", ...} — too vague when the label was actually readable in the photo.
- GOOD (opaque container): {"name": "Unidentified leftovers", "quantity": 1, "unit": "container", "confidence": "low", "note": "Container is opaque; contents and expiry can't be verified from this photo."}
- BAD (opaque container): {"name": "Chicken Soup", "confidence": "high", ...} — inventing specific contents of something you can't actually see into.

Return ONLY a JSON array matching this schema, no markdown code fences, no other text:
[{"name": string, "quantity": number, "unit": string, "expiry_date": string | null, "estimated_shelf_life_days": number | null, "confidence": "high" | "low", "note": string | null}]`;

export async function scanImageForItems(base64Image: string): Promise<ScannedItem[]> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: createUserContent([createPartFromBase64(base64Image, 'image/jpeg'), SCAN_PROMPT]),
    config: { responseMimeType: 'application/json' },
  });

  return parseJsonArray<ScannedItem>(response.text, 'scanning the image');
}

export type ExpiringIngredient = { name: string; quantity: number; unit: string };

export async function generateZeroWasteRecipes(
  expiringItems: ExpiringIngredient[]
): Promise<Recipe[]> {
  const ai = getClient();
  // Quantities matter here, not just names - "6 eggs" vs "1 egg" should
  // plausibly lead Gemini toward different recipes (and toward using more
  // of what's expiring, not just a token amount of it).
  const ingredientList = expiringItems
    .map((item) => `${item.quantity} ${item.unit} ${item.name}`)
    .join(', ');

  const prompt = `You are a resourceful zero-waste home chef. These ingredients are expiring soon and need to be used up: ${ingredientList}.

Create 5 distinct recipes. Each must use at least one of the expiring ingredients above as a real, main component - not just a passing mention - and prefer recipes that use a larger share of the expiring quantity over ones that use only a token amount, since the goal is to actually prevent waste. Assume basic pantry staples (oil, salt, pepper, common spices, flour, butter) are available in addition to what's listed.

Make the 5 recipes genuinely different from each other, not variations on the same dish - vary both the cooking method (e.g. baked, stovetop, no-cook/raw prep, soup or stew) and the meal type (e.g. breakfast, main dish, side, snack) across the set.

For "urgentIngredientsUsed", list only the expiring ingredients (from the list above) that this specific recipe actually uses. For "additionalIngredients", list anything else needed - be realistic about what a home cook likely already has or could easily get, don't list obscure specialty items. "instructions" should be clear, numbered-in-order steps simple enough for a beginner to follow.

Return ONLY a JSON array matching this schema, no markdown code fences, no other text:
[{"title": string, "urgentIngredientsUsed": string[], "additionalIngredients": string[], "instructions": string[]}]`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });

  return parseJsonArray<Recipe>(response.text, 'generating recipes');
}
