import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const base =
    env.VITE_BASE_PATH ??
    (process.env.VERCEL ? "/" : mode === "production" ? "/LMS/" : "/");

  return {
    plugins: [react()],
    base,
    build: {
      outDir: "dist",
      sourcemap: false,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            charts: ["recharts"],
            motion: ["framer-motion"],
            ui: ["@headlessui/react", "lucide-react"],
          },
        },
      },
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-router-dom", "axios"],
    },
  };
});
