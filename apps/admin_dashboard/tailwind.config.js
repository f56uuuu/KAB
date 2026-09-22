/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Official KAP brand palette — same tokens as kab_design_system/colors.dart.
        accent: '#FFD100',
        accentPressed: '#E6BC00',
        ink: '#0D0D0F',
        neutralGray: '#A1A1A1',
        primary: '#FFD100',
        primaryDark: '#E6BC00',
        secondary: '#0D0D0F',
        success: '#16A34A',
        warning: '#F5A623',
        danger: '#E5484D',
        surface: '#F7F7F8',
        background: '#FFFFFF',
        border: '#E7E7EA',
      },
    },
  },
  plugins: [],
};
