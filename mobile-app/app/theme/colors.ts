export const Colors = {
  background: '#0F172A',      // Slate-900 background (exact web body bg)
  card: '#1E293B',            // Slate-800 card background (exact web card bg)
  cardElevated: '#334155',    // Slate-700 card elevation (exact web inputs/elevations)
  text: '#F1F5F9',            // Slate-100 text
  textSecondary: '#94A3B8',   // Slate-400 text
  textMuted: '#64748B',       // Slate-500 text
  border: '#334155',          // Slate-700 border (exact web border)
  divider: '#1E293B',         // Divider lines (Slate-800)
  
  // Rating states (aligned with Tailwind custom states)
  buy: '#10B981',        // Teal/Emerald Green
  sell: '#EF4444',       // Red
  hold: '#F59E0B',       // Amber
  watchlist: '#6366F1',  // Indigo (matching web config)
  avoid: '#6B7280',      // Muted Gray
  risk: '#F97316',       // Orange
  
  // General helpers
  primary: '#14B8A6',    // Brand Teal (matching web config)
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};
export type ColorTheme = typeof Colors;
