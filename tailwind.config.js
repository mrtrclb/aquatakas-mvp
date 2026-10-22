/** @type {import('tailwindcss').Config} */
// Yazı boyutları src/index.css içindeki --fs-* değişkenlerinden gelir: mobilde standart,
// masaüstünde (sıkıştırılmış 14px kök yerine) okunaklı sabit değerler.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontSize: {
        xs: ["var(--fs-xs)", { lineHeight: "1.4" }],
        sm: ["var(--fs-sm)", { lineHeight: "1.45" }],
        base: ["var(--fs-base)", { lineHeight: "1.55" }],
        lg: ["var(--fs-lg)", { lineHeight: "1.5" }],
        xl: ["var(--fs-xl)", { lineHeight: "1.4" }]
      }
    }
  },
  plugins: []
};
