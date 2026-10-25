import { createTheme } from '@mui/material/styles';
import { fiFI, enUS } from '@mui/material/locale';
import type { SupportedLanguage } from '../types/models';

declare module '@mui/material/styles' {
  interface CssThemeVariables {
    enabled: true;
  }
}

export function buildAppTheme(language: SupportedLanguage) {
  const muiLocale = language === 'fi' ? fiFI : enUS;

  return createTheme(
    {
      cssVariables: {
        colorSchemeSelector: 'data-mui-color-scheme',
      },
      defaultColorScheme: 'dark',
      colorSchemes: {
        dark: {
          palette: {
            primary: {
              main: '#10B981', // Crisp Fairway Emerald – primary actions & <=36 target
              light: '#34D399',
              dark: '#059669',
              contrastText: '#04130D',
            },
            secondary: {
              main: '#F59E0B', // Warm Amber / Orange Tee highlight
              light: '#FBBF24',
              dark: '#D97706',
              contrastText: '#0B0F0E',
            },
            success: {
              main: '#10B981',
            },
            warning: {
              main: '#F59E0B',
            },
            error: {
              main: '#F43F5E',
            },
            background: {
              default: '#0B0F0E', // Refined Nordic dark slate-pine
              paper: '#121816', // Clean architectural surface
            },
            text: {
              primary: '#F1F5F9',
              secondary: '#94A3B8',
            },
            divider: 'rgba(148, 163, 184, 0.12)',
          },
        },
        light: {
          palette: {
            primary: {
              main: '#0D9488', // Deep Nordic Teal-Emerald for sunlight clarity
              light: '#14B8A6',
              dark: '#0F766E',
              contrastText: '#FFFFFF',
            },
            secondary: {
              main: '#EA580C', // Crisp Terracotta Orange
              light: '#F97316',
              dark: '#C2410C',
              contrastText: '#FFFFFF',
            },
            success: {
              main: '#059669',
            },
            warning: {
              main: '#D97706',
            },
            error: {
              main: '#E11D48',
            },
            background: {
              default: '#F4F6F5', // Soft Nordic stone daylight surface
              paper: '#FFFFFF',
            },
            text: {
              primary: '#0F172A',
              secondary: '#475569',
            },
            divider: 'rgba(15, 23, 42, 0.09)',
          },
        },
      },
      typography: {
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        h1: {
          fontFamily: '"Outfit", "Inter", sans-serif',
          fontWeight: 800,
          letterSpacing: '-0.025em',
        },
        h2: {
          fontFamily: '"Outfit", "Inter", sans-serif',
          fontWeight: 800,
          letterSpacing: '-0.02em',
        },
        h3: {
          fontFamily: '"Outfit", "Inter", sans-serif',
          fontWeight: 700,
          letterSpacing: '-0.02em',
        },
        h4: {
          fontFamily: '"Outfit", "Inter", sans-serif',
          fontWeight: 700,
          letterSpacing: '-0.015em',
        },
        h5: {
          fontFamily: '"Outfit", "Inter", sans-serif',
          fontWeight: 700,
          letterSpacing: '-0.01em',
        },
        h6: {
          fontFamily: '"Outfit", "Inter", sans-serif',
          fontWeight: 600,
          letterSpacing: '-0.005em',
        },
        button: {
          textTransform: 'none',
          fontWeight: 600,
          letterSpacing: '0.01em',
        },
      },
      // Crisper, less rounded base unit (6px instead of 14px)
      shape: {
        borderRadius: 6,
      },
      components: {
        MuiCard: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              borderRadius: 10,
              border: '1px solid var(--mui-palette-divider)',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 6,
              paddingTop: 8,
              paddingBottom: 8,
              paddingLeft: 16,
              paddingRight: 16,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: 'none',
              },
            },
            sizeLarge: {
              borderRadius: 8,
              paddingTop: 11,
              paddingBottom: 11,
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: 6,
              fontWeight: 600,
              letterSpacing: '0.01em',
            },
          },
        },
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              borderRadius: 6,
            },
          },
        },
        MuiTableCell: {
          styleOverrides: {
            root: {
              borderBottom: '1px solid var(--mui-palette-divider)',
              paddingTop: 12,
              paddingBottom: 12,
            },
            head: {
              color: 'var(--mui-palette-text-secondary)',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            },
          },
        },
      },
    },
    muiLocale
  );
}
