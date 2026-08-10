/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.html',
    './solutions/**/*.html',
    './case-studies/**/*.html',
    './components/**/*.html',
    './assets/js/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'rgb(10 15 28 / <alpha-value>)',
          raised: 'rgb(15 23 42 / <alpha-value>)',
          panel: 'rgb(17 24 39 / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(226 232 240 / <alpha-value>)',
          muted: 'rgb(148 163 184 / <alpha-value>)',
          faint: 'rgb(100 116 139 / <alpha-value>)',
        },
        brand: {
          DEFAULT: 'rgb(59 130 246 / <alpha-value>)',
          soft: 'rgb(96 165 250 / <alpha-value>)',
          deep: 'rgb(37 99 235 / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        sans: ['"Manrope"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 18px 40px -24px rgba(0, 0, 0, 0.65)',
        lift: '0 22px 50px -20px rgba(37, 99, 235, 0.28)',
        glow: '0 0 0 1px rgba(59, 130, 246, 0.25), 0 12px 36px -12px rgba(59, 130, 246, 0.45)',
      },
      maxWidth: {
        site: '1200px',
      },
      backgroundImage: {
        hero:
          'radial-gradient(ellipse 70% 55% at 15% 0%, rgba(59,130,246,0.18), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 15%, rgba(37,99,235,0.12), transparent 50%), linear-gradient(180deg, #0a0f1c 0%, #0f172a 55%, #0a0f1c 100%)',
      },
      transitionTimingFunction: {
        soft: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
