import { createTheme, type ThemeOptions } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    customAccent?: Palette['primary'];
  }
  interface PaletteOptions {
    customAccent?: PaletteOptions['primary'];
  }
}

const getDesignTokens = (mode: 'light' | 'dark'): ThemeOptions => ({
  palette: {
    mode,
    primary: {
      main: '#5a31e8',
      light: '#7e5cf5',
      dark: '#3f1ab5',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#2bd0f8',
      light: '#6deadf',
      dark: '#1b9bb9',
      contrastText: '#ffffff',
    },
    background: {
      default: mode === 'light' ? '#f8f9fc' : '#0b0816',
      paper: mode === 'light' ? '#ffffff' : '#120d23',
    },
    text: {
      primary: mode === 'light' ? '#120b29' : '#ffffff',
      secondary: mode === 'light' ? '#6c728e' : '#a0a5b9',
    },
    error: { main: '#ff4c51' },
    warning: { main: '#ffb400' },
    info: { main: '#16b1ff' },
    success: { main: '#56ca00' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontFamily: '"Outfit", "Inter", sans-serif', fontWeight: 700, letterSpacing: '-0.025em' },
    h2: { fontFamily: '"Outfit", "Inter", sans-serif', fontWeight: 700, letterSpacing: '-0.015em' },
    h3: { fontFamily: '"Outfit", "Inter", sans-serif', fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontFamily: '"Outfit", "Inter", sans-serif', fontWeight: 600 },
    h5: { fontFamily: '"Outfit", "Inter", sans-serif', fontWeight: 600 },
    h6: { fontFamily: '"Outfit", "Inter", sans-serif', fontWeight: 500 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '8px 24px',
          boxShadow: 'none',
          transition: 'all 0.2s ease-in-out',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #7e5cf5 0%, #5a31e8 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #6c46ed 0%, #4b24ca 100%)',
            boxShadow: mode === 'light' ? '0 8px 20px -6px rgba(90, 49, 232, 0.5)' : '0 8px 20px -6px rgba(126, 92, 245, 0.4)',
            transform: 'translateY(-1px)',
          },
        },
        outlinedPrimary: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
            backgroundColor: mode === 'light' ? 'rgba(90, 49, 232, 0.04)' : 'rgba(126, 92, 245, 0.08)',
          },
        },
      },
      defaultProps: { disableElevation: true },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: mode === 'light' 
            ? '0px 8px 32px rgba(18, 11, 41, 0.06)' 
            : '0px 8px 32px rgba(0, 0, 0, 0.4)',
          border: mode === 'light' 
            ? '1px solid rgba(220, 224, 234, 0.6)' 
            : '1px solid rgba(64, 53, 99, 0.4)',
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'light' ? '#ffffff' : '#120d23',
          color: mode === 'light' ? '#120b29' : '#ffffff',
          boxShadow: mode === 'light' 
            ? '0px 4px 20px rgba(18, 11, 41, 0.03)' 
            : '0px 4px 20px rgba(0, 0, 0, 0.3)',
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        elevation1: {
          boxShadow: mode === 'light' 
            ? '0px 4px 20px rgba(18, 11, 41, 0.04)' 
            : '0px 4px 20px rgba(0, 0, 0, 0.3)',
        },
      },
    },
  },
});

export const createAppTheme = (mode: 'light' | 'dark') => createTheme(getDesignTokens(mode));
