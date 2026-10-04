# Time card checks

Run value/selection tests with Node 22.18+ (Node 25 used for this change):

```sh
node --test packages/ui/tests/time-card-value.test.mjs
```

Run the browser fixture from the repository root after `npm ci`:

```sh
npx vite --config packages/ui/tests/vite.config.mts
```

Open http://127.0.0.1:3018 and click **Run checks**. This mounts the actual
production `TimeCard` in React StrictMode, with real browser layout and WAAPI.
It covers typing/colon/caret behavior, commit/cancel, invalid drafts, bounds,
rapid steps, the approved slide timings, the two-digit Torph fallback,
legacy intervals, cleanup and reduced motion. Only the OS media preference is
simulated for the reduced-motion checks. The fixture never writes Sip prefs.

Also check the real Settings page: persistence after reload, both themes, the
290px desktop panel, narrow layouts, and native keyboard/paste interaction.
The fixture's synthetic events supplement those manual browser checks.

Production motion settings live in `src/time-card/timing.ts`. The standalone
`prototypes/time-cards.html` remains the design artifact, including DialKit and
preview mode; those tools are not imported into production. Torph supplies digit
identity and footer wording; the input and single-digit footer slides use WAAPI.
