/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Pure White Canvas & Crisp Slate Backgrounds
        base: '#FFFFFF',          // Pure clean white background
        baseAlt: '#F8FAFC',       // Subtle clean background for alternate sections
        surface: '#FFFFFF',       // Clean white surface for cards and panels
        raised: '#F1F5F9',        // Slate-100 for subtle elevated sections
        card: '#FFFFFF',          // Card background
        cardHover: '#F8FAFC',     // Card hover state
        hairline: '#E2E8F0',      // Subtle clean border (slate-200)
        hairlineLight: '#CBD5E1', // Defined border (slate-300)

        // High-Contrast Crisp Typography
        ink: '#0F172A',           // Dark slate-900 primary text
        inkDim: '#334155',        // Slate-700 secondary text
        muted: '#64748B',         // Slate-500 muted text
        dim: '#94A3B8',           // Slate-400 dim text

        // Primary Theme: Red Accents (Qualys Red)
        qred: {
          DEFAULT: '#DC2626',     // Crisp vivid red
          glow: '#EF4444',
          hover: '#B91C1C',
          subtle: '#FEF2F2',      // Red-50
          border: '#FECACA',      // Red-200
          dim: '#991B1B',
          ring: 'rgba(220, 38, 38, 0.2)',
        },

        // Secondary Theme: Vibrant Blue (Professional Enterprise Blue)
        qblue: {
          DEFAULT: '#2563EB',     // Blue-600
          hover: '#1D4ED8',       // Blue-700
          subtle: '#EFF6FF',      // Blue-50
          border: '#BFDBFE',      // Blue-200
          dim: '#1E40AF',         // Blue-800
        },

        // Severity Palette (Refined for Light Mode)
        critical: '#DC2626',
        criticalBg: '#FEF2F2',
        high: '#EA580C',
        highBg: '#FFF7ED',
        medium: '#D97706',
        mediumBg: '#FFFBEB',
        low: '#2563EB',
        lowBg: '#EFF6FF',
        info: '#0284C7',

        // Cloud & Status Signals
        cyan: {
          DEFAULT: '#0284C7',
          glow: '#0284C7',
          subtle: '#F0F9FF',
          dim: '#0369A1',
        },
        phosphor: '#16A34A',
        phosphorDim: '#15803D',
        purpleNeon: '#7C3AED',
        purpleBg: '#F5F3FF',
        amberNeon: '#D97706',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
        sans: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        'red-glow': '0 4px 14px 0 rgba(237, 28, 36, 0.2)',
        'red-pill': '0 2px 8px rgba(237, 28, 36, 0.3)',
        'card-glow': '0 2px 10px 0 rgba(0, 0, 0, 0.05)',
        'cyber-panel': '0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(237, 28, 36, 0.1)',
      },
    },
  },
  plugins: [],
}
