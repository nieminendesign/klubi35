import React, { useState } from 'react';
import {
  Box,
  Container,
  Stack,
  Typography,
  Button,
  ButtonGroup,
  Chip,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Badge,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarMonthIcon,
  SportsGolf as SportsGolfIcon,
  FactCheck as FactCheckIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  EmojiEvents as EmojiEventsIcon,
  MenuBook as MenuBookIcon,
  Bolt as BoltIcon,
  TvOff as TvOffIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { getDivisionByLevel } from '../types/models';
import { SUPPORTED_LANGUAGES } from '../i18n/config';
import { SHOW_DEMO_TOOLBAR } from '../config/features';
import { DemoToolbar } from './DemoToolbar';
import { LevelUpModal } from './LevelUpModal';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const { currentUser, scorecards, language, changeLanguage, toast, closeToast } =
    useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [drillsModalOpen, setDrillsModalOpen] = useState(false);

  const isTvMode = location.pathname === '/leaderboard-tv';
  const currentDivision = getDivisionByLevel(currentUser.currentDivision);
  const pendingVerificationsCount = scorecards.filter((sc) => !sc.verifiedByCoach).length;

  const isCoachOrAdmin =
    currentUser.role === 'coach' || currentUser.role === 'admin';
  const isAdmin = currentUser.role === 'admin';

  // Strict Role-Based Navigation Items:
  // - Players see ONLY: Oma polku (/dashboard), Treenikalenteri (/calendar), Pelaa 9 reikää (/play), 36-klubi & XP (/leaderboard)
  // - Coaches additionally see: Ohjaamo (/coach)
  // - Admins see all views including: Hallinta (/admin)
  const allNavItems = [
    {
      path: '/dashboard',
      label: t('nav.dashboard'),
      icon: <DashboardIcon fontSize="small" />,
      visible: true,
    },
    {
      path: '/play',
      label: t('nav.play'),
      icon: <SportsGolfIcon fontSize="small" />,
      highlight: true,
      visible: true,
    },
    {
      path: '/calendar',
      label: t('nav.calendar'),
      icon: <CalendarMonthIcon fontSize="small" />,
      visible: true,
    },
    {
      path: '/coach',
      label: t('nav.coach'),
      icon: (
        <Badge badgeContent={pendingVerificationsCount} color="secondary">
          <FactCheckIcon fontSize="small" />
        </Badge>
      ),
      visible: isCoachOrAdmin,
    },
    {
      path: '/admin',
      label: t('nav.admin'),
      icon: <AdminPanelSettingsIcon fontSize="small" />,
      visible: isAdmin,
    },
    {
      path: '/leaderboard',
      label: t('nav.leaderboard'),
      icon: <EmojiEventsIcon fontSize="small" />,
      visible: true,
    },
  ];

  const visibleNavItems = allNavItems.filter((item) => item.visible);

  // Clean 16:9 Presentation View without navigation bars for /leaderboard-tv
  if (isTvMode) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          color: 'text.primary',
          position: 'relative',
        }}
      >
        {children}

        {/* Subtle Floating Corner Controls in 16:9 TV Mode */}
        <Stack
          direction="row"
          spacing={1}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 20,
            zIndex: 1300,
            p: 0.75,
            borderRadius: 1.25,
            bgcolor: 'rgba(9, 13, 12, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            alignItems: 'center',
            opacity: 0.75,
            transition: 'opacity 0.2s ease',
            '&:hover': { opacity: 1 },
          }}
        >
          <ButtonGroup size="small" sx={{ height: 28 }}>
            {SUPPORTED_LANGUAGES.map((langObj) => {
              const active = language === langObj.code;
              return (
                <Button
                  key={langObj.code}
                  onClick={() => changeLanguage(langObj.code)}
                  sx={{
                    py: 0,
                    px: 1,
                    minWidth: 32,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    bgcolor: active ? '#10B981' : 'transparent',
                    color: active ? '#04130D' : '#CBD5E1',
                  }}
                >
                  {langObj.label}
                </Button>
              );
            })}
          </ButtonGroup>

          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<TvOffIcon sx={{ fontSize: 15 }} />}
            onClick={() => navigate('/leaderboard')}
            sx={{
              height: 28,
              py: 0,
              px: 1.25,
              fontSize: '0.74rem',
              color: '#F1F5F9',
              borderColor: 'rgba(255, 255, 255, 0.2)',
            }}
          >
            {t('demoToolbar.exitTvViewBtn')}
          </Button>
        </Stack>

        <LevelUpModal />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        color: 'text.primary',
        pb: { xs: 10, md: 5 },
      }}
    >
      {/* Sticky Top Wrapper: Demo Toolbar (optional) + Main Club 35 App Header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1200,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.14)',
        }}
      >
        {SHOW_DEMO_TOOLBAR && <DemoToolbar />}

        <Box
          component="header"
          sx={{
            borderBottom: '1px solid var(--mui-palette-divider)',
            bgcolor: 'background.paper',
            backdropFilter: 'blur(12px)',
            py: 1.25,
            px: { xs: 2, md: 3 },
          }}
        >
        <Container maxWidth="xl" disableGutters>
          <Stack
            direction="row"
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            {/* Brand Logo & Title */}
            <Stack
              direction="row"
              spacing={1.5}
              onClick={() => navigate('/dashboard')}
              sx={{ alignItems: 'center', cursor: 'pointer' }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 1.25,
                  bgcolor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'primary.contrastText',
                  fontWeight: 900,
                  fontSize: '1.05rem',
                  fontFamily: '"Outfit", sans-serif',
                  letterSpacing: '-0.03em',
                }}
              >
                35
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                  {t('app.title')}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  {t('app.subtitle')}
                </Typography>
              </Box>
            </Stack>

            {/* Desktop Navigation Links (Filtered by Role!) */}
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ alignItems: 'center', display: { xs: 'none', md: 'flex' } }}
            >
              {visibleNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Button
                    key={item.path}
                    startIcon={item.icon}
                    variant={isActive ? 'contained' : item.highlight ? 'outlined' : 'text'}
                    color="primary"
                    onClick={() => navigate(item.path)}
                    sx={{
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 1,
                      fontSize: '0.84rem',
                      fontWeight: isActive ? 700 : 600,
                      borderColor:
                        item.highlight && !isActive
                          ? 'rgba(16, 185, 129, 0.45)'
                          : undefined,
                      color: isActive
                        ? 'primary.contrastText'
                        : item.highlight
                        ? 'primary.main'
                        : 'text.secondary',
                      '&:hover': {
                        color: isActive ? 'primary.contrastText' : 'text.primary',
                      },
                    }}
                  >
                    {item.label}
                  </Button>
                );
              })}

              {/* Modular Phase 2 Training Bank / Drills Preview Button */}
              <Button
                size="small"
                startIcon={<MenuBookIcon fontSize="small" />}
                onClick={() => setDrillsModalOpen(true)}
                sx={{
                  ml: 0.5,
                  px: 1.25,
                  py: 0.65,
                  fontSize: '0.8rem',
                  borderRadius: 1,
                  border: '1px dashed var(--mui-palette-divider)',
                  color: 'text.secondary',
                }}
              >
                {t('nav.drillsSoon')}
              </Button>
            </Stack>

            {/* Right: Active User Status Indicators */}
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Chip
                size="small"
                icon={<BoltIcon sx={{ color: '#F59E0B !important', fontSize: '16px !important' }} />}
                label={`${currentUser.xp} PTS`}
                sx={{
                  height: 28,
                  fontWeight: 700,
                  bgcolor: 'rgba(245, 158, 11, 0.1)',
                  color: '#F59E0B',
                  border: '1px solid rgba(245, 158, 11, 0.28)',
                }}
              />
              {currentUser.role === 'player' ? (
                <Chip
                  size="small"
                  label={t(currentDivision.nameKey)}
                  sx={{
                    height: 28,
                    fontWeight: 700,
                    bgcolor: `${currentDivision.badgeColor}14`,
                    color: currentDivision.badgeColor,
                    border: `1px solid ${currentDivision.badgeColor}45`,
                    display: { xs: 'none', sm: 'inline-flex' },
                  }}
                />
              ) : (
                <Chip
                  size="small"
                  label={t(`roles.${currentUser.role}`)}
                  variant="outlined"
                  sx={{
                    height: 28,
                    fontWeight: 700,
                    display: { xs: 'none', sm: 'inline-flex' },
                  }}
                />
              )}
            </Stack>
          </Stack>
        </Container>
        </Box>
      </Box>

      {/* Main Page Content */}
      <Container maxWidth="xl" sx={{ pt: { xs: 2.5, md: 3 }, px: { xs: 2, md: 3 } }}>
        {children}
      </Container>

      {/* Mobile Bottom Navigation Bar (Filtered by Role!) */}
      <Paper
        elevation={0}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          display: { xs: 'block', md: 'none' },
          borderTop: '1px solid var(--mui-palette-divider)',
          bgcolor: 'background.paper',
        }}
      >
        <BottomNavigation
          showLabels
          value={location.pathname}
          onChange={(_e, newValue) => navigate(newValue)}
          sx={{ bgcolor: 'transparent', height: 62 }}
        >
          {visibleNavItems.map((item) => (
            <BottomNavigationAction
              key={item.path}
              value={item.path}
              label={item.label}
              icon={item.icon}
              sx={{
                minWidth: 50,
                px: 0.5,
                '& .MuiBottomNavigationAction-label': {
                  fontSize: '0.66rem',
                  fontWeight: 600,
                },
              }}
            />
          ))}
        </BottomNavigation>
      </Paper>

      {/* Phase 2 Extensibility Preview Dialog: Drills / Training Bank */}
      <Dialog
        open={drillsModalOpen}
        onClose={() => setDrillsModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>{t('drillsPreview.title')}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            {t('drillsPreview.description')}
          </Typography>
          <Stack spacing={1}>
            {[
              t('drillsPreview.sample1'),
              t('drillsPreview.sample2'),
              t('drillsPreview.sample3'),
            ].map((sample, idx) => (
              <Box
                key={idx}
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                  border: '1px solid var(--mui-palette-divider)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                ⛳ {sample}
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDrillsModalOpen(false)} variant="contained">
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Full-Screen Celebratory Level-Up Modal */}
      <LevelUpModal />

      {/* Toast Notification Snackbar */}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3500}
        onClose={closeToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ mb: { xs: 8, md: 2 } }}
      >
        {toast ? (
          <Alert
            onClose={closeToast}
            severity={toast.severity}
            variant="filled"
            sx={{ fontWeight: 600, borderRadius: 1 }}
          >
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
};
