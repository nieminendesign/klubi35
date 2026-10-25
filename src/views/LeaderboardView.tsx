import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  EmojiEvents as EmojiEventsIcon,
  Tv as TvIcon,
  Bolt as BoltIcon,
  AutoAwesome as AutoAwesomeIcon,
  Flag as FlagIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { getDivisionByLevel, getScorecardTarget } from '../types/models';
import { formatLocalizedDate } from '../i18n/config';

export const LeaderboardView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, users, groups, scorecards, language } = useApp();

  const isTvMode = location.pathname === '/leaderboard-tv';
  const isStaff = currentUser.role === 'coach' || currentUser.role === 'admin';

  const rankedPlayers = users
    .filter((u) => u.role === 'player')
    .sort((a, b) => b.xp - a.xp || b.attendanceCount - a.attendanceCount);

  const wallOfFameRounds = scorecards
    .filter((sc) => sc.totalStrokes <= getScorecardTarget(sc) && sc.verifiedByCoach)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Box
      sx={{
        p: isTvMode ? { xs: 2, md: 4 } : 0,
        maxWidth: isTvMode ? 1680 : 'none',
        mx: 'auto',
      }}
    >
      <Stack spacing={2.5}>
        {/* Header Bar */}
        <Card
          sx={{
            borderTop: '3px solid var(--mui-palette-primary-main)',
          }}
        >
          <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
              }}
            >
              <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 1.25,
                    bgcolor: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <EmojiEventsIcon sx={{ fontSize: 26, color: 'primary.main' }} />
                </Box>
                <Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography variant={isTvMode ? 'h4' : 'h5'} sx={{ fontWeight: 800 }}>
                      {t('leaderboard.title')}
                    </Typography>
                    {isTvMode && (
                      <Chip
                        size="small"
                        label="CLUBHOUSE LIVE TV"
                        color="primary"
                        sx={{ fontWeight: 800 }}
                      />
                    )}
                  </Stack>
                  <Stack
                    direction="row"
                    spacing={1}
                    useFlexGap
                    sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 0.6 }}
                  >
                    <Chip
                      size="small"
                      label={t('leaderboard.subtitleBadgePoints')}
                      sx={{
                        height: 22,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        bgcolor: 'rgba(245, 158, 11, 0.1)',
                        color: '#F59E0B',
                        border: '1px solid rgba(245, 158, 11, 0.28)',
                      }}
                    />
                    <Chip
                      size="small"
                      label={t('leaderboard.subtitleBadgePar')}
                      sx={{
                        height: 22,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        bgcolor: 'rgba(16, 185, 129, 0.1)',
                        color: 'primary.main',
                        border: '1px solid rgba(16, 185, 129, 0.28)',
                      }}
                    />
                  </Stack>
                </Box>
              </Stack>

              {!isTvMode && isStaff && (
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<TvIcon />}
                  onClick={() => navigate('/leaderboard-tv')}
                >
                  {t('leaderboard.openTvMode')}
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Main 16:9 Friendly 2-Column Layout */}
        <Grid container spacing={2.5}>
          {/* Left Column: XP & Training Attendance Leaderboard */}
          <Grid size={{ xs: 12, lg: 7 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', mb: 2 }}
                >
                  <BoltIcon sx={{ color: '#F59E0B', fontSize: 22 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {t('leaderboard.xpLeaderboardTitle')}
                  </Typography>
                </Stack>

                <TableContainer>
                  <Table size={isTvMode ? 'medium' : 'small'}>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('leaderboard.rank')}</TableCell>
                        <TableCell>{t('leaderboard.player')}</TableCell>
                        <TableCell>{t('leaderboard.division')}</TableCell>
                        <TableCell align="center">
                          {t('leaderboard.attendance')}
                        </TableCell>
                        <TableCell align="right">{t('leaderboard.xp')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rankedPlayers.map((player, index) => {
                        const rank = index + 1;
                        const div = getDivisionByLevel(player.currentDivision);
                        const primaryGroup = groups.find((g) =>
                          player.groupIds.includes(g.id)
                        );

                        return (
                          <TableRow
                            key={player.id}
                            sx={{
                              bgcolor:
                                rank === 1
                                  ? 'rgba(16, 185, 129, 0.05)'
                                  : 'transparent',
                            }}
                          >
                            <TableCell
                              sx={{
                                fontWeight: 800,
                                color: rank <= 3 ? 'primary.main' : 'text.secondary',
                              }}
                            >
                              #{rank}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {player.name}
                              </Typography>
                              {primaryGroup && (
                                <Typography
                                  variant="caption"
                                  sx={{ color: 'text.secondary' }}
                                >
                                  {primaryGroup.name}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={t(div.nameKey)}
                                sx={{
                                  height: 22,
                                  fontSize: '0.72rem',
                                  bgcolor: `${div.badgeColor}14`,
                                  color: div.badgeColor,
                                  border: `1px solid ${div.badgeColor}45`,
                                  fontWeight: 700,
                                }}
                              />
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>
                              {player.attendanceCount}x
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                fontWeight: 800,
                                color: rank <= 3 ? '#F59E0B' : 'text.primary',
                              }}
                            >
                              {player.xp} PTS
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column: 36 Club Wall of Fame (Rounds <= 36) */}
          <Grid size={{ xs: 12, lg: 5 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', mb: 0.5 }}
                >
                  <AutoAwesomeIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {t('leaderboard.wallOfFameTitle')}
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  {t('leaderboard.wallOfFameDesc')}
                </Typography>

                <Stack spacing={1.5}>
                  {wallOfFameRounds.map((sc) => {
                    const player = users.find((u) => u.id === sc.playerId);
                    const passedDiv = getDivisionByLevel(sc.divisionLevel);
                    const unlockedNextDiv =
                      sc.divisionLevel < 8
                        ? getDivisionByLevel(sc.divisionLevel + 1)
                        : passedDiv;

                    return (
                      <Box
                        key={sc.id}
                        sx={{
                          p: 1.75,
                          borderRadius: 1.25,
                          bgcolor: 'action.hover',
                          border: '1px solid var(--mui-palette-divider)',
                          borderLeft: `3px solid ${unlockedNextDiv.badgeColor}`,
                        }}
                      >
                        <Stack
                          direction="row"
                          spacing={1.5}
                          sx={{
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Box>
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ alignItems: 'center' }}
                            >
                              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                {player?.name || sc.playerId}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                • {formatLocalizedDate(sc.date, language)}
                              </Typography>
                            </Stack>

                            <Typography
                              variant="caption"
                              sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}
                            >
                              {t('leaderboard.unlockedDivision')}: {t(passedDiv.nameKey)}
                            </Typography>

                            <Stack
                              direction="row"
                              spacing={0.75}
                              sx={{ alignItems: 'center', mt: 0.75 }}
                            >
                              <FlagIcon
                                sx={{ fontSize: 15, color: unlockedNextDiv.badgeColor }}
                              />
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: 700,
                                  color: unlockedNextDiv.badgeColor,
                                }}
                              >
                                → {t(unlockedNextDiv.nameKey)}
                              </Typography>
                            </Stack>
                          </Box>

                          <Box
                            sx={{
                              minWidth: 56,
                              py: 0.75,
                              px: 1.25,
                              borderRadius: 1,
                              bgcolor: 'primary.main',
                              color: 'primary.contrastText',
                              textAlign: 'center',
                            }}
                          >
                            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                              {sc.totalStrokes}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 700, fontSize: '0.62rem' }}
                            >
                              / {getScorecardTarget(sc)}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
};
