// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // Deno runtime (Supabase Edge Functions), not part of the Expo/Metro
    // app - different globals (Deno), different module resolution (jsr:),
    // linted/type-checked separately by the Supabase CLI, not this project.
    ignores: ["dist/*", "supabase/functions/**"],
  }
]);
