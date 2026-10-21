import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./" // alan adında (aquagram.com.tr) ve github.io/aquatakas-mvp altında aynı derleme çalışır
});
