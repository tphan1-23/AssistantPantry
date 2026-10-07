// Supabase Edge Function - proxies Gemini calls so the real API key never
// ships inside the app bundle. Deploy with:
//   supabase functions deploy gemini-proxy
//   supabase secrets set GEMINI_API_KEY=your_key_here
//   supabase secrets set GEMINI_MODEL=gemini-flash-latest   (optional override)
//
// Called by services/gemini.ts via supabase.functions.invoke('gemini-proxy', ...),
// which automatically attaches the signed-in user's access token - this
// function rejects any request that isn't from a real authenticated user,
// so a leaked function URL alone can't be used to spend the Gemini quota.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-flash-latest';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Kept in sync with the previous client-side prompt in services/gemini.ts -
// see Decisions & Bug Fixes Log for why it has inline few-shot examples.
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

type ExpiringIngredient = { name: string; quantity: number; unit: string };

function buildRecipePrompt(expiringItems: ExpiringIngredient[]): string {
  const ingredientList = expiringItems
    .map((item) => `${item.quantity} ${item.unit} ${item.name}`)
    .join(', ');

  return `You are a resourceful zero-waste home chef. These ingredients are expiring soon and need to be used up: ${ingredientList}.

Create 5 distinct recipes. Each must use at least one of the expiring ingredients above as a real, main component - not just a passing mention - and prefer recipes that use a larger share of the expiring quantity over ones that use only a token amount, since the goal is to actually prevent waste. Assume basic pantry staples (oil, salt, pepper, common spices, flour, butter) are available in addition to what's listed.

Make the 5 recipes genuinely different from each other, not variations on the same dish - vary both the cooking method (e.g. baked, stovetop, no-cook/raw prep, soup or stew) and the meal type (e.g. breakfast, main dish, side, snack) across the set.

For "urgentIngredientsUsed", list only the expiring ingredients (from the list above) that this specific recipe actually uses. For "additionalIngredients", list anything else needed - be realistic about what a home cook likely already has or could easily get, don't list obscure specialty items. "instructions" should be clear, numbered-in-order steps simple enough for a beginner to follow.

Return ONLY a JSON array matching this schema, no markdown code fences, no other text:
[{"title": string, "urgentIngredientsUsed": string[], "additionalIngredients": string[], "instructions": string[]}]`;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

async function callGemini(contents: unknown): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY secret is not set on this Supabase project.');
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`Gemini API error (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string') {
    throw new Error('Gemini returned no text content.');
  }
  return text;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

    // Reject anonymous/invalid callers - this is what keeps a leaked
    // function URL from being usable to spend this project's Gemini quota.
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData.user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json();

    if (body.action === 'scan') {
      const text = await callGemini([
        {
          parts: [
            { inline_data: { mime_type: 'image/jpeg', data: body.base64Image } },
            { text: SCAN_PROMPT },
          ],
        },
      ]);
      return json({ text });
    }

    if (body.action === 'recipes') {
      const text = await callGemini([{ parts: [{ text: buildRecipePrompt(body.ingredients) }] }]);
      return json({ text });
    }

    return json({ error: `Unknown action: ${body.action}` }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
