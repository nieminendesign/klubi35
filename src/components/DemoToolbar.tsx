import React, { useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  Select,
  MenuItem,
  ListSubheader,
  Button,
  ButtonGroup,
  Chip,
  IconButton,
  Tooltip,
  type SelectChangeEvent,
} from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import {
  RestartAlt as RestartAltIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  CloudDone as CloudDoneIcon,
  Storage as StorageIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { SUPPORTED_LANGUAGES } from '../i18n/config';
import { getDivisionByLevel } from '../types/models';
import { AuthModal } from './AuthModal';

export const DemoToolbar: React.FC = () => {
  const { t } = useTranslation();
  const {
    users,
    currentUser,
    switchActiveUser,
    language,
    changeLanguage,
    resetDemoData,
    isLiveFirebase,
    isAuthenticated,
    signOut,
  } = useApp();
  const { mode, setMode } = useColorScheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const isTvRoute = location.pathname === '/leaderboard-tv';

  const admins = users.filter((u) => u.role === 'admin');
  const coaches = users.filter((u) => u.role === 'coach');
  const players = users.filter((u) => u.role === 'player');

  const handleUserChange = (e: SelectChangeEvent<string>) => {
    const newUserId = e.target.value;
    switchActiveUser(newUserId);
    const selected = users.find((u) => u.id === newUserId);
    if (!selected) return;

    if (isTvRoute) {
      navigate(
        selected.role === 'admin'
          ? '/admin'
          : selected.role === 'coach'
          ? '/coach'
          : '/dashboard'
      );
      return;
    }

    // Enforce RBAC navigation transitions when switching roles
    if (selected.role === 'admin' && location.pathname === '/dashboard') {
      navigate('/admin');
    } else if (selected.role === 'coach' && location.pathname === '/admin') {
      navigate('/coach');
    } else if (selected.role === 'coach' && location.pathname === '/dashboard') {
      navigate('/coach');
    } else if (
      selected.role === 'player' &&
      (location.pathname === '/admin' || location.pathname === '/coach')
    ) {
      navigate('/dashboard');
    }
  };

  const toggleColorMode = () => {
    setMode(mode === 'light' ? 'dark' : 'light');
  };

  return (
    <Box
      sx={{
        bgcolor: '#090D0C',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        color: '#E2E8F0',
        px: { xs: 1.5, md: 3 },
        py: 0.65,
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
          maxWidth: 1440,
          mx: 'auto',
        }}
      >
        {/* Left: Subtle Data source indicator */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Tooltip
            title={
              isLiveFirebase
                ? t('demoToolbar.dataSourceFirebase')
                : t('demoToolbar.dataSourceLocal')
            }
          >
            <Chip
              icon={
                isLiveFirebase ? (
                  <CloudDoneIcon
                    sx={{ fontSize: '13px !important', color: '#38BDF8 !important' }}
                  />
                ) : (
                  <StorageIcon
                    sx={{ fontSize: '13px !important', color: '#94A3B8 !important' }}
                  />
                )
              }
              label={
                isLiveFirebase
                  ? t('demoToolbar.dataSourceFirebase')
                  : t('demoToolbar.dataSourceLocal')
              }
              size="small"
              sx={{
                bgcolor: 'transparent',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#94A3B8',
                fontSize: '0.7rem',
                height: 22,
                borderRadius: 0.75,
              }}
            />
          </Tooltip>
        </Stack>

        {/* Right: Role & User Switcher + Auth + TV View + Language Switcher FI | EN */}
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', flexWrap: 'wrap' }}
        >
          <Typography
            variant="caption"
            sx={{
              color: '#64748B',
              fontWeight: 600,
              display: { xs: 'none', sm: 'inline' },
            }}
          >
            {t('demoToolbar.activeUser')}:
          </Typography>

          <Select
            size="small"
            value={currentUser.id}
            onChange={handleUserChange}
            sx={{
              minWidth: { xs: 175, sm: 245 },
              height: 30,
              bgcolor: 'rgba(255, 255, 255, 0.04)',
              color: '#F1F5F9',
              fontSize: '0.8rem',
              fontWeight: 600,
              borderRadius: 1,
              '.MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.14)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.28)',
              },
              '.MuiSvgIcon-root': {
                color: '#94A3B8',
              },
            }}
          >
            <ListSubheader
              sx={{
                bgcolor: '#0F1513',
                color: '#94A3B8',
                fontWeight: 700,
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                lineHeight: '28px',
              }}
            >
              {t('roles.admin')}
            </ListSubheader>
            {admins.map((u) => (
              <MenuItem key={u.id} value={u.id} sx={{ fontSize: '0.84rem' }}>
                {u.name} (Admin)
              </MenuItem>
            ))}

            <ListSubheader
              sx={{
                bgcolor: '#0F1513',
                color: '#94A3B8',
                fontWeight: 700,
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                lineHeight: '28px',
              }}
            >
              {t('roles.coach')}
            </ListSubheader>
            {coaches.map((u) => (
              <MenuItem key={u.id} value={u.id} sx={{ fontSize: '0.84rem' }}>
                {u.name}
              </MenuItem>
            ))}

            <ListSubheader
              sx={{
                bgcolor: '#0F1513',
                color: '#94A3B8',
                fontWeight: 700,
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                lineHeight: '28px',
              }}
            >
              {t('demoToolbar.playersGroupHeader')}
            </ListSubheader>
            {players.map((u) => {
              const div = getDivisionByLevel(u.currentDivision);
              return (
                <MenuItem key={u.id} value={u.id} sx={{ fontSize: '0.84rem' }}>
                  <Stack
                    direction="row"
                    sx={{
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      gap: 1.5,
                    }}
                  >
                    <span>{u.name}</span>
                    <Box
                      component="span"
                      sx={{
                        px: 0.85,
                        py: 0.15,
                        borderRadius: 0.75,
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        bgcolor: `${div.badgeColor}20`,
                        color: div.badgeColor,
                        border: `1px solid ${div.badgeColor}55`,
                      }}
                    >
                      {t(div.shortLabelKey)}
                    </Box>
                  </Stack>
                </MenuItem>
              );
            })}
          </Select>

          {/* Firebase Auth Login / Logout Button */}
          {isLiveFirebase && isAuthenticated ? (
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<LogoutIcon sx={{ fontSize: 15 }} />}
              onClick={() => void signOut()}
              sx={{
                height: 30,
                py: 0,
                px: 1.1,
                fontSize: '0.75rem',
                borderRadius: 1,
                borderColor: 'rgba(255, 255, 255, 0.15)',
                color: '#CBD5E1',
                display: { xs: 'none', md: 'inline-flex' },
              }}
            >
              {t('auth.signOutBtn')}
            </Button>
          ) : (
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<LoginIcon sx={{ fontSize: 15 }} />}
              onClick={() => setAuthModalOpen(true)}
              sx={{
                height: 30,
                py: 0,
                px: 1.1,
                fontSize: '0.75rem',
                borderRadius: 1,
                borderColor: 'rgba(255, 255, 255, 0.15)',
                color: '#CBD5E1',
                display: { xs: 'none', md: 'inline-flex' },
              }}
            >
              {t('demoToolbar.loginBtn')}
            </Button>
          )}

          {/* Language Switcher FI | EN */}
          <ButtonGroup size="small" aria-label="Language switcher" sx={{ height: 30 }}>
            {SUPPORTED_LANGUAGES.map((langObj) => {
              const active = language === langObj.code;
              return (
                <Button
                  key={langObj.code}
                  onClick={() => changeLanguage(langObj.code)}
                  sx={{
                    py: 0,
                    px: 1.1,
                    minWidth: 34,
                    fontSize: '0.73rem',
                    fontWeight: 700,
                    borderRadius: 1,
                    bgcolor: active ? '#10B981' : 'transparent',
                    color: active ? '#04130D' : '#94A3B8',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    '&:hover': {
                      bgcolor: active ? '#059669' : 'rgba(255,255,255,0.08)',
                    },
                  }}
                >
                  {langObj.label}
                </Button>
              );
            })}
          </ButtonGroup>

          {/* Color Scheme Switcher */}
          <Tooltip
            title={
              mode === 'light'
                ? t('demoToolbar.darkMode')
                : t('demoToolbar.lightMode')
            }
          >
            <IconButton
              size="small"
              onClick={toggleColorMode}
              sx={{
                color: '#CBD5E1',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 1,
                width: 30,
                height: 30,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
              }}
            >
              {mode === 'light' ? (
                <DarkModeIcon sx={{ fontSize: 16 }} />
              ) : (
                <LightModeIcon sx={{ fontSize: 16 }} />
              )}
            </IconButton>
          </Tooltip>

          {/* Reset Demo Data */}
          <Tooltip title={t('demoToolbar.resetData')}>
            <IconButton
              size="small"
              onClick={resetDemoData}
              sx={{
                color: '#64748B',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 1,
                width: 30,
                height: 30,
                '&:hover': { color: '#F8FAFC', bgcolor: 'rgba(255,255,255,0.08)' },
              }}
            >
              <RestartAltIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </Box>
  );
};
