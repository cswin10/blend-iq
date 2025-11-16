/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f1ff',
          100: '#b3d9ff',
          200: '#80c1ff',
          300: '#4da9ff',
          400: '#1a91ff',
          500: '#0066cc',
          600: '#004d99',
          700: '#003366',
          800: '#001a33',
          900: '#000d1a',
        },
        navy: {
          50: '#e6f0f5',
          100: '#b3d4e0',
          200: '#80b8cc',
          300: '#4d9cb8',
          400: '#1a80a3',
          500: '#003d5c',
          600: '#002e45',
          700: '#001f2e',
          800: '#000f17',
          900: '#00080b',
        },
        cyan: {
          50: '#e6ffff',
          100: '#b3ffff',
          200: '#80ffff',
          300: '#4dffff',
          400: '#1affff',
          500: '#00cccc',
          600: '#009999',
          700: '#006666',
          800: '#003333',
          900: '#001a1a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
