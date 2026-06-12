import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the build works both at user.github.io/repo/ (project
  // pages) and at a custom domain root, without hardcoding the repo name.
  base: "./",
  build: {
    target: "es2022",
  },
});
