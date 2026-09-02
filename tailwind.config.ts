import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Bang mau do skill ui-ux-pro-max khuyen nghi cho san pham giao duc:
        // teal lam mau chinh, amber cho CTA, xanh la cho diem so.
        brand: {
          50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4',
          400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e',
          800: '#115e59', 900: '#134e4a',
        },
        mango: {
          50: '#fff8eb', 100: '#ffefc7', 200: '#ffdc88',
          300: '#ffc449', 400: '#ffab20', 500: '#f98807', 600: '#dd6402',
          700: '#b74506', 800: '#94350c', 900: '#7a2c0d',
        },
        mint: {
          50: '#eefbf4', 100: '#d6f5e3', 200: '#b0e9cc', 300: '#7cd7ae',
          400: '#46bd8c', 500: '#22a271', 600: '#15825b', 700: '#11684b',
          800: '#10523c', 900: '#0e4433',
        },
      },
      fontFamily: {
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        pop: '0 10px 0 -4px rgba(13, 148, 136, 0.18), 0 18px 40px -18px rgba(15, 23, 42, 0.45)',
        card: '0 1px 2px rgba(15,23,42,.06), 0 12px 32px -20px rgba(15,23,42,.45)',
      },
      keyframes: {
        pop: { '0%': { transform: 'scale(.94)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        wiggle: { '0%,100%': { transform: 'rotate(-2deg)' }, '50%': { transform: 'rotate(2deg)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
      },
      animation: {
        pop: 'pop .25s ease-out both',
        wiggle: 'wiggle 1.2s ease-in-out infinite',
        float: 'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
