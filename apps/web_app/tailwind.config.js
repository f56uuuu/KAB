/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        tajawal: ['Tajawal', 'sans-serif'],
      },
      colors: {
        accent: '#FFD100',
        accentPressed: '#E6BC00',
        ink: '#0D0D0F',
        neutralGray: '#A1A1A1',
        surface: '#F7F7F8',
        background: '#FFFFFF',
        border: '#E7E7EA',
        danger: '#E5484D',
        success: '#16A34A',
        warning: '#F5A623',
      },
    },
  },
  plugins: [],
};
