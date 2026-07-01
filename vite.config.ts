import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// Only apply Node polyfills to the browser build — the SSR/nitro (Cloudflare
// workerd) environment already provides nodejs_compat, and the polyfill's
// buffer shim doesn't expose `node:buffer`, which breaks SSR bundling of
// packages like bip39, @supabase/storage-js, unstorage, srvx, crossws.
const clientOnlyPolyfills = {
  ...nodePolyfills({
    include: ["buffer", "crypto", "stream", "util", "events"],
    globals: { Buffer: true, global: true, process: true },
    protocolImports: true,
  }),
  applyToEnvironment: (env: { name: string }) => env.name === "client",
};

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [clientOnlyPolyfills],
  },
});
