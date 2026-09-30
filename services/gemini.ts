import { GoogleGenAI, createPartFromBase64, createUserContent } from '@google/genai';

import type { Recipe, ScannedItem } from '@/types/pantry';

const MODEL = 'gemini-flash-latest';

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

export async function scanImageForItems(base64Image: string): Promise<ScannedItem[]> {
  const ai = getClient();
  const prompt =
    'Analyze this receipt or fridge image. Extract all food items, estimate quantity, ' +
    'and assign a conservative estimated shelf life in days. ' +
    'Return ONLY a JSON array matching this schema: ' +
    '[{"name": string, "quantity": string, "estimated_shelf_life_days": number}]. ' +
    'Output strictly valid JSON, no other text.';

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: createUserContent([createPartFromBase64(base64Image, 'image/jpeg'), prompt]),
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
