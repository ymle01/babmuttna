/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light", "dark", "cupcake", "bumblebee", "emerald", "corporate", "synthwave", "retro", "cyberpunk", "valentine", "halloween", "garden", "forest", "aqua", "lofi", "pastel", "fantasy", "wireframe", "black", "luxury", "dracula"], // 사용할 테마들
    darkTheme: "dark", // 다크모드 기본 테마
    base: true, // 기본 스타일 적용
    styled: true, // 컴포넌트 스타일 적용
    utils: true, // 유틸리티 클래스 적용
  },
}

