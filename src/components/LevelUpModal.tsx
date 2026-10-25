import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  Stack,
  Chip,
} from '@mui/material';
import {
  EmojiEvents as EmojiEventsIcon,
  AutoAwesome as AutoAwesomeIcon,
  Flag as FlagIcon,
} from '@mui/icons-material';
import confetti from 'canvas-confetti';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { getDivisionByLevel } from '../types/models';

export const LevelUpModal: React.FC = () => {
  const { t } = useTranslation();
  const { levelUpCelebration, closeLevelUpCelebration } = useApp();

  useEffect(() => {
    if (!levelUpCelebration) return;

    const triggerConfetti = () => {
      try {
        void confetti({
          particleCount: 80,
          spread: 75,
          origin: { y: 0.55 },
          colors: ['#10B981', '#F97316', '#EAB308', '#38BDF8', '#FFFFFF'],
        });
        setTimeout(() => {
          void confetti({
            particleCount: 55,
            angle: 60,
            spread: 55,
            origin: { x: 0.1, y: 0.6 },
          });
          void confetti({
            particleCount: 55,
            angle: 120,
            spread: 55,
            origin: { x: 0.9, y: 0.6 },
          });
        }, 300);
      } catch {
        // ignore if canvas not supported
      }
    };

    triggerConfetti();
  }, [levelUpCelebration]);

  if (!levelUpCelebration) return null;

  const newDivision = getDivisionByLevel(levelUpCelebration.newDivisionLevel);

  return (
    <Dialog
      open={Boolean(levelUpCelebration)}
      onClose={closeLevelUpCelebration}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            bgcolor: '#111715',
            borderTop: `4px solid ${newDivision.badgeColor}`,
            border: '1px solid rgba(255, 255, 255, 0.14)',
            color: '#F8FAFC',
            textAlign: 'center',
            p: { xs: 1.5, sm: 3 },
            boxShadow: '0 24px 64px rgba(0,0,0,0.75)',
          },
        },
      }}
    >
      <DialogContent>
        <Stack spacing={2.5} sx={{ alignItems: 'center' }}>
          <Chip
            size="small"
            icon={<AutoAwesomeIcon sx={{ color: '#04130D !important' }} />}
            label={t('levelUpModal.badge')}
            sx={{
              bgcolor: '#10B981',
              color: '#04130D',
              fontWeight: 800,
              letterSpacing: '0.06em',
              px: 1,
            }}
          />

          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: `${newDivision.badgeColor}14`,
              border: `2px solid ${newDivision.badgeColor}`,
            }}
          >
            <EmojiEventsIcon sx={{ fontSize: 44, color: newDivision.badgeColor }} />
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 800, color: '#FFFFFF' }}>
            {t('levelUpModal.title', { name: levelUpCelebration.playerName })}
          </Typography>

          <Typography variant="body1" sx={{ color: '#94A3B8' }}>
            {t('levelUpModal.subtitle', { strokes: levelUpCelebration.strokes })}
          </Typography>

          {/* Unlocked Division Highlight Box */}
          <Box
            sx={{
              width: '100%',
              p: 2.25,
              borderRadius: 1.5,
              bgcolor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderLeft: `4px solid ${newDivision.badgeColor}`,
            }}
          >
            <Typography
              variant="overline"
              sx={{ color: '#94A3B8', fontWeight: 700, letterSpacing: '0.08em' }}
            >
              {t('levelUpModal.unlockedLabel')}
            </Typography>
            <Stack
              direction="row"
              spacing={1.25}
              sx={{ alignItems: 'center', justifyContent: 'center', mt: 0.75 }}
            >
              <FlagIcon sx={{ color: newDivision.badgeColor, fontSize: 26 }} />
              <Typography
                variant="h5"
                sx={{ fontWeight: 800, color: newDivision.badgeColor }}
              >
                {t(newDivision.nameKey)}
              </Typography>
            </Stack>
          </Box>

          {/* XP Breakdown */}
          <Box
            sx={{
              width: '100%',
              py: 1.25,
              px: 2,
              borderRadius: 1.5,
              bgcolor: 'rgba(16, 185, 129, 0.09)',
              border: '1px solid rgba(16, 185, 129, 0.28)',
            }}
          >
            <Typography variant="h6" sx={{ color: '#34D399', fontWeight: 800 }}>
              {t('levelUpModal.xpAwarded', { xp: levelUpCelebration.totalXpEarned })}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8' }}>
              {t('levelUpModal.xpBreakdown', { roundXp: levelUpCelebration.roundXp })}
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={closeLevelUpCelebration}
            sx={{
              mt: 1,
              py: 1.4,
              fontSize: '0.96rem',
              fontWeight: 700,
              bgcolor: newDivision.badgeColor,
              color: '#0B0F0E',
              '&:hover': {
                bgcolor: newDivision.badgeColor,
                filter: 'brightness(1.08)',
              },
            }}
          >
            {t('levelUpModal.continueBtn')}
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
