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
- "name": a specific product name (e.g. "Ricola Honey Herb Cough Drops", not just "candy").
- "quantity": an integer count of that item visible (e.g. 6). Default to 1 if you can't count units individually.
- "unit": a short word for what's being counted (e.g. "drops", "cans", "bottle", "bag", "gallon", "lb"). Use "item" if unsure.
- "expiry_date": if you can actually read a printed expiration, "best by", or "use by" date on the packaging, return it as "YYYY-MM-DD". Otherwise null. Do NOT guess a date — only fill this in if the text is genuinely visible and legible in the photo.
- "estimated_shelf_life_days": only used when expiry_date is null. A conservative typical shelf-life estimate in days for that product type.
- "confidence": "high" if you identified the item and any date from clearly visible text/labeling, or "low" if you are guessing contents you cannot actually verify (e.g. a closed cup, an opaque or sealed container, blurry packaging).
- "note": null, or a short explanation when confidence is "low" (e.g. "Cup is opaque; contents assumed from cup branding only").

Never confidently invent specifics you cannot see. If contents are hidden, say so via low confidence and a note rather than presenting a guess as fact.

Return ONLY a JSON array matching this schema, no other text:
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

export async function generateZeroWasteRecipes(expiringItemNames: string[]): Promise<Recipe[]> {
  const ai = getClient();
  const prompt =
    'You are a zero-waste chef. Create 3 recipes prioritizing these expiring ingredients: ' +
    `${expiringItemNames.join(', ')}. Assume basic pantry staples (oil, salt, spices) are available. ` +
    'Return ONLY a JSON array matching this schema: ' +
    '[{"title": string, "urgentIngredientsUsed": string[], "additionalIngredients": string[], "instructions": string[]}]. ' +
    'Output strictly valid JSON, no other text.';

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });

  return parseJsonArray<Recipe>(response.text, 'generating recipes');
}
