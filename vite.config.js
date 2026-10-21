import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/" // aquagram.com.tr kökünde yayında; /tur/..., /ilan/... gibi derin adresler için mutlak yol gerekir
});
