module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: '#D4AF37',
        'gold-light': '#E8C84A',
        'gold-dark': '#B8962E',
        ivory: '#FFF8F0',
        'ivory-light': '#FFFCF7',
        blush: '#F8E8E8',
        text: '#2D2D2D',
        'text-muted': '#6B7280',
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'fade-in-up': 'fade-in-up 0.5s ease-out',
        'fade-in-down': 'fade-in-down 0.5s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'spin-slow': 'spin 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'gradient-premium': 'radial-gradient(circle at top right, rgba(212,175,55,.08), transparent 40%)',
        'gradient-hero': 'linear-gradient(135deg, #FFF8F0 0%, #FDF6E9 50%, #FFF8F0 100%)',
      },
      boxShadow: {
        'premium': '0 4px 24px rgba(212,175,55,0.12)',
        'premium-lg': '0 8px 40px rgba(212,175,55,0.15)',
        'card': '0 2px 12px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.10)',
      },
    },
  },
  plugins: [],
}
