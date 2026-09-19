/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		opacity: Object.fromEntries(Array.from({ length: 101 }, (_, i) => [i, `${i / 100}`])),
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: {
  				DEFAULT: '#080B0D',
  				secondary: '#0C1014',
  			},
  			card: {
  				DEFAULT: '#111820',
  				hover: '#161D24',
  			},
  			foreground: {
  				DEFAULT: '#F8FAFC',
  				secondary: '#9CA3AF',
  			},
  			primary: {
  				DEFAULT: '#83D5ED',
  				foreground: '#080B0D',
  			},
  			secondary: {
  				DEFAULT: '#7C3AED',
  				foreground: '#F8FAFC',
  			},
  			accent: {
  				DEFAULT: '#0F766E',
  				foreground: '#F8FAFC',
  			},
  			gold: '#D4A853',
  			success: '#22C55E',
  			warning: '#F59E0B',
  			danger: '#EF4444',
  			border: '#1C2329',
  			input: '#1C2329',
  			ring: '#83D5ED',
  		},
  		fontFamily: {
  			heading: ['Tajawal', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  			body: ['Tajawal', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  			mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			},
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
