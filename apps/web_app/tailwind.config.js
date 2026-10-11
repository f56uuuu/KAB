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
        'tour-pop': { '0%': { opacity: '0', transform: 'translateY(16px) scale(.94)' }, '70%': { opacity: '1', transform: 'translateY(-2px) scale(1.01)' }, '100%': { transform: 'none' } },
        'tour-bounce': { '0%,100%': { transform: 'translateY(0) rotate(0)' }, '30%': { transform: 'translateY(-8px) rotate(-8deg)' }, '60%': { transform: 'translateY(0) rotate(6deg)' } },
        'tour-ping': { '0%': { transform: 'scale(1)', opacity: '.9' }, '100%': { transform: 'scale(1.08)', opacity: '0' } },
        'tour-fade': { from: { opacity: '0' }, to: { opacity: '1' } },
        'tour-confetti': {
          '0%': { transform: 'translate(0,0) rotate(0) scale(.4)', opacity: '0' },
          '15%': { opacity: '1' },
          '100%': { transform: 'translate(var(--x), calc(var(--y) + 140px)) rotate(var(--r)) scale(1)', opacity: '0' },
        },
        'slide-up': { from: { transform: 'translateY(24px)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
        pulse_ring: { '0%': { transform: 'scale(0.6)', opacity: '0.9' }, '100%': { transform: 'scale(2.2)', opacity: '0' } },
        greet: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '15%,85%': { opacity: '1', transform: 'none' },
          '100%': { opacity: '0', transform: 'translateY(-14px)' },
        },
      },
      animation: {
        'tour-pop': 'tour-pop .45s cubic-bezier(.2,.9,.25,1) both',
        'tour-bounce': 'tour-bounce 1.6s ease-in-out .3s infinite',
        'tour-ping': 'tour-ping 1.2s ease-out infinite',
        'tour-fade': 'tour-fade .3s ease-out both',
        'tour-confetti': 'tour-confetti 1.4s cubic-bezier(.15,.7,.3,1) both',
        'slide-up': 'slide-up .35s cubic-bezier(.2,.8,.2,1) both',
        pulse_ring: 'pulse_ring 1.6s ease-out infinite',
        greet: 'greet 1.1s ease-in-out both',
      },
    },
  },
  plugins: [],
};
