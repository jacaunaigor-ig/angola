/**
 * Design System — GPS Eleitoral Angola 2027
 * Mesma paleta da sala de comando: negro, vermelho e ouro da bandeira.
 */

export const THEME = {
  colors: {
    background: '#100c0b',
    surface: '#1c1412',
    surfaceElevated: '#251c18',
    border: '#3d2f28',
    borderFocus: '#f5c518',
    flagRed: '#ce1126',
    flagGold: '#f5c518',

    bastaio: '#3dbe8b',
    batalha: '#e08a3c',
    oposicao: '#e15b5b',

    sentimento: {
      positivo: '#3dbe8b',
      neutro: '#e08a3c',
      negativo: '#e15b5b',
    },

    accent: '#f5c518',
    success: '#3dbe8b',
    warning: '#e08a3c',
    danger: '#e15b5b',

    textPrimary: '#f4eee4',
    textSecondary: '#b09a82',
    textDisabled: '#7a6858',
  },

  typography: {
    fontFamily: 'Inter, SF Pro, -apple-system, Roboto, sans-serif',
    h1: { fontSize: 24, fontWeight: '700', lineHeight: 30 },
    h2: { fontSize: 20, fontWeight: '600', lineHeight: 26 },
    h3: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
    body: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
    badge: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  borderRadius: {
    sm: 8,
    md: 14,
    lg: 18,
    full: 9999,
  },
};
