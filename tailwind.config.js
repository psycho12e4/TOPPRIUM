export default {
  content: [
    './src/**/*.{html,js}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dce7ff',
          200: '#bcd0ff',
          300: '#8fb2ff',
          400: '#5d8bff',
          500: '#3b6bf6',
          600: '#2b52e0',
          700: '#2440bd',
          800: '#223a99',
          900: '#21367a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        brand: '0 22px 45px -18px rgba(37, 82, 224, 0.35)',
      },
    },
  },
  plugins: [],
}
