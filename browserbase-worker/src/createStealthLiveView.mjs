// browserbase-worker/src/createStealthLiveView.mjs
// Creates a Browserbase session with stealth settings and prints a Live View (debug) URL.
// Usage:
//   node src/createStealthLiveView.mjs [--advanced]
//
// Env vars required:
//   BROWSERBASE_API_KEY
//   BROWSERBASE_PROJECT_ID
//
// Notes:
// - Basic stealth is applied by Browserbase by default. Use --advanced to request Advanced Stealth if your plan supports it.
// - The printed debuggerFullscreenUrl is a shareable link you can open to watch and control the live session.

import 'dotenv/config';
import Browserbase from '@browserbasehq/sdk';

function getEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`[ERROR] Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

const args = process.argv.slice(2);
const useAdvancedStealth = args.includes('--advanced');

const API_KEY = getEnv('BROWSERBASE_API_KEY');
const PROJECT_ID = getEnv('BROWSERBASE_PROJECT_ID');

const bb = new Browserbase({ apiKey: API_KEY });

async function main() {
  try {
    const session = await bb.sessions.create({
      projectId: PROJECT_ID,
      // Leave proxies unspecified to avoid failures on accounts without proxy entitlement.
      browserSettings: {
        ...(useAdvancedStealth ? { advancedStealth: true } : {}),
        // solveCaptchas defaults to true; keep default unless you need to disable.
      },
    });

    console.log(`[OK] Created session: ${session?.id}`);

    // Retrieve Live View (debug) URLs
    const liveViewLinks = await bb.sessions.debug(session.id);

    const fullscreen = liveViewLinks?.debuggerFullscreenUrl;
    const withBorders = liveViewLinks?.debuggerUrl;

    if (!fullscreen && !withBorders) {
      console.error('[WARN] No live view URLs returned by Browserbase. Check session status and account permissions.');
    }

    // Output useful URLs
    console.log('Live View (fullscreen):');
    if (fullscreen) console.log(fullscreen);

    console.log('Live View (with borders):');
    if (withBorders) console.log(withBorders);

    // Tip: hide navbar for fullscreen link if desired
    if (fullscreen) {
      const hiddenNavbar = `${fullscreen}${fullscreen.includes('?') ? '&' : '?'}navbar=false`;
      console.log('Live View (fullscreen, navbar hidden):');
      console.log(hiddenNavbar);
    }

    console.log('\nNext steps:');
    console.log('- Open a Live View link above to watch/control the session in real-time.');
    console.log('- Use the Browserbase Session Inspector from the Dashboard to view DevTools-like logs, DOM, and network.');
    console.log('- To request Advanced Stealth (if your plan supports it), run with --advanced');
  } catch (err) {
    console.error('[ERROR] Failed to create session or fetch live view URLs:', err?.message || err);
    process.exit(1);
  }
}

main();
