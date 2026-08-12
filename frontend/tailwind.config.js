/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        navy: {
          900: '#0A0F1D',
          800: '#0D1424',
          700: '#131B2E',
          600: '#1A2540',
          500: '#1E2D4A',
          400: '#2A364F',
          300: '#3A4E6E',
        },
        cyan:  { neon: '#00F5D4' },
        emerald: { neon: '#10B981' },
        amber:   { neon: '#F59E0B' },
        coral:   { neon: '#FF2E93' },
      },
      boxShadow: {
        'glow-cyan':   '0 0 12px rgba(0,245,212,0.4), 0 0 40px rgba(0,245,212,0.15)',
        'glow-emerald':'0 0 12px rgba(16,185,129,0.4), 0 0 40px rgba(16,185,129,0.15)',
        'glow-amber':  '0 0 12px rgba(245,158,11,0.4), 0 0 40px rgba(245,158,11,0.15)',
        'glow-coral':  '0 0 14px rgba(255,46,147,0.5), 0 0 48px rgba(255,46,147,0.2)',
        'glow-blue':   '0 0 12px rgba(59,130,246,0.4), 0 0 40px rgba(59,130,246,0.15)',
        'card':        '0 4px 24px rgba(0,0,0,0.4)',
      },
      animation: {
        'pulse-slow':   'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'ping-slow':    'ping 2s cubic-bezier(0,0,0.2,1) infinite',
        'scan':         'scan 2.5s linear infinite',
        'wave':         'wave 1.2s ease-in-out infinite',
        'glow-pulse':   'glowPulse 2s ease-in-out infinite',
        'float':        'float 3s ease-in-out infinite',
        'spin-slow':    'spin 4s linear infinite',
      },
      keyframes: {
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(400%)' },
        },
        wave: {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%':      { transform: 'scaleY(1.2)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.6' },
          '50%':      { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}
