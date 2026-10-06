import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are not set. Add them to your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No browser redirect flow on native - email confirmation/recovery
    // links open in a browser, not back into the app, so this just avoids
    // a warning. The password-recovery deep link (app/reset-password.tsx)
    // instead reads the `code` param itself and calls
    // exchangeCodeForSession - which is also why flowType is 'pkce': it's
    // the flow that hands back a plain `code` query param instead of
    // tokens in a URL fragment, which is awkward to parse on native.
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
