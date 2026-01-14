/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cubase: {
          bg: '#1a1a2e',
          surface: '#16213e',
          accent: '#0f3460',
          highlight: '#e94560',
          text: '#eaeaea',
          muted: '#94a3b8',
        }
      }
    },
  },
  plugins: [],
}
