/**
 * Build-time feature flags.
 *
 * SHOW_DEMO_TOOLBAR – the demo toolbar (role/user switcher, language & theme switch, data reset) is
 * shown unless `VITE_SHOW_DEMO_TOOLBAR=false`. To ship production: set that variable to `false`
 * in the CI build env (see .github/workflows/firebase-deploy.yml). The toolbar code can then be
 * deleted at leisure (DemoToolbar.tsx + the single usage in AppLayout.tsx).
 */
export const SHOW_DEMO_TOOLBAR =
  (import.meta.env.VITE_SHOW_DEMO_TOOLBAR as string | undefined) !== 'false';
