import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// For Vercel/Netlify, base can stay as "/".
// For GitHub Pages, this automatically becomes "/repo-name/" inside GitHub Actions.
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const base = process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/` : "/";

export default defineConfig({
  plugins: [react()],
  base,
});
