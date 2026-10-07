// Injects "Add to Home Screen" tags into the web export's index.html.
//
// Needed because app.json's web.output is "single" (required - the
// "static"/"server" modes crash during server-side prerendering, since the
// Supabase client touches browser-only storage at module load time). In
// "single" mode, Expo's CLI skips app/+html.tsx entirely and generates a
// fixed internal HTML template that only understands a few config-driven
// tags (viewport, theme-color, favicon) - not the PWA manifest link or
// Apple's iOS-specific meta tags, so those have to be added here instead,
// after the fact. Run automatically via `npm run export:web`.
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error(`patch-web-manifest: ${indexPath} not found - run "expo export --platform web" first.`);
  process.exit(1);
}

const html = fs.readFileSync(indexPath, 'utf8');

if (html.includes('rel="manifest"')) {
  console.log('patch-web-manifest: tags already present, skipping.');
  process.exit(0);
}

const extraTags = `    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="/favicon.ico" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Pantry" />
  </head>`;

fs.writeFileSync(indexPath, html.replace('</head>', extraTags));
console.log('patch-web-manifest: injected PWA meta tags into dist/index.html');
