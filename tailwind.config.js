/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'var(--brand-primary, #F59E0B)',
          primaryHover: 'var(--brand-primary-hover, #D97706)',
          primaryLight: 'var(--brand-primary-light, #FEF3C7)',
          accent: 'var(--brand-accent, #DC2626)',
          accentHover: 'var(--brand-accent-hover, #B91C1C)',
          surface: 'var(--brand-surface, #FAFAFA)',
          card: 'var(--brand-card, #FFFFFF)',
          cardHover: 'var(--brand-card-hover, #FFF7ED)',
          ink: 'var(--brand-ink, #18181B)',
          inkSoft: 'var(--brand-ink-soft, #6B7280)',
          border: 'var(--brand-border, #E5E7EB)',
          charcoal: '#1E293B',
          charcoalDark: '#0F172A',
        },
        // Alias retrocompatible durante la transición
        fries: {
          base: 'var(--brand-card, #FFFFFF)',
          surface: 'var(--brand-surface, #FAFAFA)',
          card: 'var(--brand-card, #FFFFFF)',
          cardHover: 'var(--brand-card-hover, #FFF7ED)',
          ink: 'var(--brand-ink, #18181B)',
          inkSoft: 'var(--brand-ink-soft, #6B7280)',
          amber: 'var(--brand-primary, #F59E0B)',
          amberDark: 'var(--brand-primary-hover, #D97706)',
          amberLight: 'var(--brand-primary-light, #FEF3C7)',
          gold: 'var(--brand-primary, #FACC15)',
          goldLight: 'var(--brand-primary-light, #FEF08A)',
          chipotle: 'var(--brand-accent, #DC2626)',
          chipotleDark: 'var(--brand-accent-hover, #B91C1C)',
          charcoal: '#1E293B',
          charcoalDark: '#0F172A',
          border: 'var(--brand-border, #E5E7EB)',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        display: ['Outfit', 'sans-serif']
      },
      boxShadow: {
        'premium': '0 20px 45px -15px rgba(24, 24, 27, 0.12), 0 0 1px 1px rgba(24, 24, 27, 0.04)',
        'premium-hover': '0 28px 55px -15px rgba(245, 158, 11, 0.30), 0 12px 25px -10px rgba(250, 204, 21, 0.25)',
        'glass': '0 8px 32px 0 rgba(24, 24, 27, 0.10)'
      }
    },
  },
  plugins: [],
}
