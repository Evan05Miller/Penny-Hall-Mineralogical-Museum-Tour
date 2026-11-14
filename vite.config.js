import { defineConfig } from "vite";

export default defineConfig({
  base: "/Penny-Hall-Mineralogical-Museum-Tour/",
  server: {
    port: 5173,
    watch: {
      ignored: ["**/FBD6FC32-*/**", "**/_preview/**", "**/.git/**"],
    },
  },
});
