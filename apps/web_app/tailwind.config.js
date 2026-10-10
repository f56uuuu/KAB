/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        tajawal: ['Tajawal', 'system-ui', 'sans-serif'],
      },
      colors: {
        // brand (fixed in both themes)
        accent: '#FFD100',
        accentPressed: '#E6BC00',
        ink: '#0D0D0F',
        neutralGray: '#A1A1A1',
        // semantic (switch with the theme)
        background: v('bg'),
        surface: v('surface'),
        raised: v('raised'),
        fg: v('fg'),
        muted: v('muted'),
        border: v('border'),
        danger: '#E5484D',
        success: '#22A06B',
        warning: '#F5A623',
      },
      borderRadius: {
        sheet: '28px',
      },
      boxShadow: {
        float: '0 8px 30px rgb(0 0 0 / 0.14)',
        sheet: '0 -10px 40px rgb(0 0 0 / 0.12)',
      },
      keyframes: {
        'slide-up': { from: { transform: 'translateY(24px)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
        pulse_ring: { '0%': { transform: 'scale(0.6)', opacity: '0.9' }, '100%': { transform: 'scale(2.2)', opacity: '0' } },
        greet: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '15%,85%': { opacity: '1', transform: 'none' },
          '100%': { opacity: '0', transform: 'translateY(-14px)' },
        },
      },
      animation: {
        'slide-up': 'slide-up .35s cubic-bezier(.2,.8,.2,1) both',
        pulse_ring: 'pulse_ring 1.6s ease-out infinite',
        greet: 'greet 1.1s ease-in-out both',
      },
    },
  },
  plugins: [],
};
