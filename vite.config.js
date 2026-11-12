import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    watch: {
      ignored: ["**/FBD6FC32-*/**", "**/_preview/**", "**/.git/**"],
    },
  },
});
