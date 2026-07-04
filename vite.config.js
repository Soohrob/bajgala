import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages serves the app from /bajgala/ — local dev stays at /
  base: process.env.GITHUB_PAGES ? "/bajgala/" : "/",
});
