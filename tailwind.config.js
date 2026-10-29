/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Material 3 Expressive Tonal Palettes
        m3: {
          primary: '#6750A4',
          'primary-container': '#EADDFF',
          'on-primary-container': '#21005D',
          'dark-primary': '#D0BCFF',
          'dark-primary-container': '#4F378B',
          'dark-on-primary-container': '#EADDFF',

          secondary: '#625B71',
          'secondary-container': '#E8DEF8',
          'on-secondary-container': '#1D192B',
          'dark-secondary': '#CCC2DC',
          'dark-secondary-container': '#4A4458',

          tertiary: '#7D5260',
          'tertiary-container': '#FFD8E4',
          'on-tertiary-container': '#31111D',

          surface: '#FEF7FF',
          'surface-container-low': '#F7F2FA',
          'surface-container': '#F3EDF7',
          'surface-container-high': '#ECE6F0',
          'surface-container-highest': '#E6E0E9',
          'on-surface': '#1D1B20',
          'on-surface-variant': '#49454F',

          'dark-surface': '#141218',
          'dark-surface-container-low': '#1D1B20',
          'dark-surface-container': '#211F26',
          'dark-surface-container-high': '#2B2930',
          'dark-surface-container-highest': '#36343B',
          'dark-on-surface': '#E6E0E9',
          'dark-on-surface-variant': '#CAC4D0',

          outline: '#79747E',
          'outline-variant': '#CAC4D0',
          'dark-outline': '#938F99',
          'dark-outline-variant': '#49454F',

          success: '#2e7d32',
          'success-container': '#d0f8ce',
          'dark-success': '#81c784',
          'dark-success-container': '#1b5e20',
        }
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.75rem',
        '4xl': '2.25rem',
      },
      boxShadow: {
        'm3-1': '0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.30)',
        'm3-2': '0px 2px 6px 2px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.30)',
        'm3-3': '0px 4px 8px 3px rgba(0, 0, 0, 0.15), 0px 1px 3px 0px rgba(0, 0, 0, 0.30)',
      }
    },
  },
  plugins: [],
}
