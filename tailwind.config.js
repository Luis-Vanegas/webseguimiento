/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: '#0A1E3D',
        accent: '#29B6E8',
      },
    },
  },
  plugins: [],
}
