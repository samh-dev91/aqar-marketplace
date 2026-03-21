import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B4F72',
          foreground: '#ffffff',
          50: '#EBF5FB',
          100: '#D6EAF8',
          200: '#AED6F1',
          500: '#2E86C1',
          700: '#1B4F72',
          900: '#0E2A3D',
        },
        gold: {
          DEFAULT: '#D4AC0D',
          50: '#FEF9E7',
          100: '#FCF3CF',
          500: '#D4AC0D',
          600: '#B7950B',
        },
        success: '#1E8449',
        warning: '#D35400',
        danger: '#922B21',
        background: '#F4F6F9',
      },
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
        tajawal: ['Tajawal', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
