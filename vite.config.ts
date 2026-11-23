// @lovable.dev/vite-tanstack-config include già: TanStack Start, React, Tailwind, alias @, nitro per
// Cloudflare (solo in build), variabili VITE_*. Non aggiungerli di nuovo.
// Mai ssr.external / resolve.external: il Worker non risolve moduli a runtime.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
});
