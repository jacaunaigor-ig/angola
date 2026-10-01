/**
 * Design System - GPS Eleitoral Angola 2027
 * Padrão Dark Mode Tático (Otimizado para poupança de bateria em ecrãs OLED em campo)
 */

export const THEME = {
  colors: {
    // Cores Estruturais
    background: '#0F172A',      // Fundo Principal (Azul-Noite muito escuro)
    surface: '#1E293B',         // Fundo de Cards e Painéis
    surfaceElevated: '#334155', // Fundo de Inputs, Dropdowns e BottomSheet Header
    border: '#334155',          // Bordas discretas
    borderFocus: '#38BDF8',     // Destaque de seleção ativa

    // Cores Políticas e Zonamento Estratégico
    bastaio: '#10B981',         // Verde Esmeralda (Zonas Seguras / Bastiões)
    batalha: '#F97316',         // Laranja Alerta (Campos de Batalha / Zonas Cinzentas)
    oposicao: '#EF4444',        // Vermelho Carmim (Zonas Críticas / Oposição)

    // Sentimento do Eleitorado
    sentimento: {
      positivo: '#10B981',      // 🙂 Verde
      neutro: '#F59E0B',        // 😐 Âmbar
      negativo: '#EF4444',      // 🙁 Vermelho
    },

    // Acentos e Indicadores
    accent: '#38BDF8',          // Azul Elétrico (GPS ativo / Ações secundárias)
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',

    // Tipografia e Legibilidade
    textPrimary: '#F8FAFC',     // Branco Suave (alto contraste para luz solar)
    textSecondary: '#94A3B8',   // Cinza Neutro (rótulos e metadados)
    textDisabled: '#64748B',
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
    sm: 6,
    md: 12,
    lg: 18,
    full: 9999,
  },
};
