/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50:  '#eef5ef',
          100: '#d5e6d7',
          400: '#3d7a4d',
          500: '#2a5a37',
          600: '#1c3d27',
          700: '#16321f',
          800: '#0f2617',
        },
        cream: '#F7F4EC',
        amberpmb: '#E9A23B',
      },
      boxShadow: {
        soft: '0 6px 24px -12px rgba(22,50,31,0.18)',
        pill: '0 2px 8px -2px rgba(22,50,31,0.35)',
      },
      keyframes: {
        'fade-up':   { '0%':{opacity:'0',transform:'translateY(10px)'},'100%':{opacity:'1',transform:'translateY(0)'} },
        'fade-in':   { '0%':{opacity:'0'},'100%':{opacity:'1'} },
        'pop':       { '0%':{transform:'scale(.96)',opacity:'0'},'100%':{transform:'scale(1)',opacity:'1'} },
        'slide-in':  { '0%':{transform:'translateX(-12px)',opacity:'0'},'100%':{transform:'translateX(0)',opacity:'1'} },
        'shimmer':   { '0%':{backgroundPosition:'-200% 0'},'100%':{backgroundPosition:'200% 0'} },
        'pulse-dot': { '0%,100%':{transform:'scale(1)',opacity:'1'},'50%':{transform:'scale(1.4)',opacity:'.5'} },
        'grow':      { '0%':{width:'0%'} },
      },
      animation: {
        'fade-up':  'fade-up .5s ease-out both',
        'fade-in':  'fade-in .4s ease-out both',
        'pop':      'pop .35s cubic-bezier(.2,.9,.3,1.2) both',
        'slide-in': 'slide-in .35s ease-out both',
        'shimmer':  'shimmer 2.4s linear infinite',
        'pulse-dot':'pulse-dot 1.6s ease-in-out infinite',
        'grow':     'grow 1s ease-out both',
      },
    },
  },
  plugins: [],
};
