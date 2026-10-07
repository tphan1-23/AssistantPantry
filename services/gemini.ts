import { supabase } from '@/services/supabase';
import type { Recipe, ScannedItem } from '@/types/pantry';

// The real Gemini API key lives only on the server now (a Supabase Edge
// Function, supabase/functions/gemini-proxy) - see Decisions & Bug Fixes
// Log. Calling it through supabase.functions.invoke automatically attaches
// the signed-in user's access token, which the function requires.
async function invokeGeminiProxy(body: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ text?: string; error?: string }>(
    'gemini-proxy',
    { body }
  );
  if (error) throw new Error(error.message);
  if (!data || data.error) throw new Error(data?.error ?? 'Unknown error from gemini-proxy');
  if (!data.text) throw new Error('gemini-proxy returned no text content.');
  return data.text;
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
  const text = await invokeGeminiProxy({ action: 'scan', base64Image });
  return parseJsonArray<ScannedItem>(text, 'scanning the image');
}

export type ExpiringIngredient = { name: string; quantity: number; unit: string };

export async function generateZeroWasteRecipes(
  expiringItems: ExpiringIngredient[]
): Promise<Recipe[]> {
  const text = await invokeGeminiProxy({ action: 'recipes', ingredients: expiringItems });
  return parseJsonArray<Recipe>(text, 'generating recipes');
}
