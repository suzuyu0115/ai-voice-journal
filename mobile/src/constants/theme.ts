export const COLORS = {
  primary: '#4A90E2',
  primaryDark: '#2F72C8',
  primaryLight: '#D6E8FA',

  background: '#F5F6FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF5FF',

  textPrimary: '#1A1B2E',
  textSecondary: '#6E7191',
  textTertiary: '#B0B3C6',

  success: '#34D399',
  warning: '#FBBF24',
  error: '#EF4444',
  errorLight: '#FEE2E2',

  border: '#E8EAF0',
  divider: '#F0F2F8',

  // Conversation bubbles
  bubbleUser: '#EBF4FF',
  bubbleUserText: '#1A4F8A',
  bubbleAI: '#FFFFFF',
  bubbleAIText: '#1A1B2E',

  // Streak / gamification (keep existing)
  streakOrange: '#F97316',
};

export const SHADOWS = {
  sm: {
    shadowColor: '#4A5568',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#4A5568',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  primary: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  }),
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 999,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
