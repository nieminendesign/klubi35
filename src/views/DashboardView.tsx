import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  Chip,
  LinearProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  SportsGolf as SportsGolfIcon,
  EmojiEvents as EmojiEventsIcon,
  CalendarMonth as CalendarMonthIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Place as PlaceIcon,
  AccessTime as AccessTimeIcon,
  TrendingDown as TrendingDownIcon,
  Bolt as BoltIcon,
  Verified as VerifiedIcon,
  HourglassTop as HourglassTopIcon,
  History as HistoryIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import {
  DIVISIONS,
  getDefaultHolePar,
  getDivisionByLevel,
  getScorecardTarget,
  type Scorecard,
} from '../types/models';
import { formatLocalizedDate } from '../i18n/config';

export const DashboardView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    currentUser,
    users,
    groups,
    sessions,
    scorecards,
    language,
    toggleRsvp,
  } = useApp();

  const players = users.filter((u) => u.role === 'player');
  const [staffPreviewPlayerId, setStaffPreviewPlayerId] = useState<string>('player-onni');
  const [allRoundsDialogOpen, setAllRoundsDialogOpen] = useState<boolean>(false);
  const [greetingVariant] = useState<number>(() => Math.floor(Math.random() * 8) + 1);

  // If logged in as a player, always show their own dashboard.
  // If logged in as Coach or Admin, allow previewing any player without losing Coach/Admin role!
  const activePlayer =
    currentUser.role === 'player'
      ? currentUser
      : players.find((p) => p.id === staffPreviewPlayerId) ||
        players[0] ||
        currentUser;

  const currentDiv = getDivisionByLevel(activePlayer.currentDivision);
  const nextDiv =
    activePlayer.currentDivision < 8
      ? getDivisionByLevel(activePlayer.currentDivision + 1)
      : null;

  const playerScorecards = scorecards
    .filter((sc) => sc.playerId === activePlayer.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const verifiedPlayerScorecards = playerScorecards.filter((sc) => sc.verifiedByCoach);

  const currentLevelScorecards = verifiedPlayerScorecards.filter(
    (sc) => sc.divisionLevel === activePlayer.currentDivision
  );

  const personalBestOnCurrentLevel =
    currentLevelScorecards.length > 0
      ? Math.min(...currentLevelScorecards.map((sc) => sc.totalStrokes))
      : null;

  const overallBestScore =
    verifiedPlayerScorecards.length > 0
      ? Math.min(...verifiedPlayerScorecards.map((sc) => sc.totalStrokes))
      : null;

  const avgPutts =
    playerScorecards.length > 0
      ? (
          playerScorecards.reduce((sum, sc) => sum + sc.totalPutts, 0) /
          playerScorecards.length
        ).toFixed(1)
      : '—';

  const totalHolesPlayed = playerScorecards.reduce(
    (sum, sc) => sum + (sc.holesCount || sc.holes.length || 9),
    0
  );
  const totalGirHits = playerScorecards.reduce((sum, sc) => sum + sc.totalGir, 0);
  const girPercent =
    totalHolesPlayed > 0 ? Math.round((totalGirHits / totalHolesPlayed) * 100) : 0;

  const todayIso = new Date().toISOString().slice(0, 10);
  const upcomingPlayerSessions = sessions
    .filter((s) => activePlayer.groupIds.includes(s.groupId) && s.date >= todayIso)
    .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));

  const nextSession = upcomingPlayerSessions[0] || null;
  const nextSessionGroup = nextSession
    ? groups.find((g) => g.id === nextSession.groupId)
    : null;
  const isAttendingNext = nextSession
    ? nextSession.rsvpPlayerIds.includes(activePlayer.id)
    : false;
  const isDeclinedNext = nextSession
    ? Boolean(nextSession.declinedPlayerIds?.includes(activePlayer.id))
    : false;

  return (
    <Stack spacing={2.5}>
      {/* Staff quick-preview bar if logged in as Coach or Admin */}
      {currentUser.role !== 'player' && (
        <Card
          sx={{
            bgcolor: 'background.paper',
            borderLeft: '3px solid var(--mui-palette-primary-main)',
          }}
        >
          <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
            <Stack
              direction="row"
              sx={{
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {t('dashboard.staffPreviewNotice', { name: activePlayer.name })}
              </Typography>
              <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }}>
                {players.map((p) => (
                  <Chip
                    key={p.id}
                    label={p.name.split(' ')[0]}
                    size="small"
                    color={p.id === activePlayer.id ? 'primary' : 'default'}
                    variant={p.id === activePlayer.id ? 'filled' : 'outlined'}
                    onClick={() => setStaffPreviewPlayerId(p.id)}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Hero Division Card – Clean Architectural Surface with Focused Accent Highlights */}
      <Card
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderTop: `3px solid ${currentDiv.badgeColor}`,
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
          <Grid container spacing={3} sx={{ alignItems: 'stretch' }}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <Stack spacing={2} sx={{ height: '100%', justifyContent: 'space-between' }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="h2"
                    sx={{
                      fontWeight: 900,
                      mb: 1.35,
                      fontSize: {
                        xs: 'clamp(1.25rem, 5.2vw, 1.85rem)',
                        sm: '2.15rem',
                        md: '2.45rem',
                      },
                      lineHeight: 1.15,
                      letterSpacing: '-0.025em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {t(`dashboard.welcome_${greetingVariant}`, {
                      name: activePlayer.name.split(' ')[0],
                      defaultValue: t('dashboard.welcome', {
                        name: activePlayer.name.split(' ')[0],
                      }),
                    })}
                  </Typography>

                  <Stack
                    direction="row"
                    spacing={0.85}
                    useFlexGap
                    sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                  >
                    <Chip
                      size="small"
                      label={t('divisions.targetInfo')}
                      sx={{
                        height: 24,
                        fontSize: '0.73rem',
                        fontWeight: 700,
                        bgcolor: 'action.hover',
                        color: 'text.secondary',
                        border: '1px solid var(--mui-palette-divider)',
                      }}
                    />
                    {activePlayer.groupIds.map((gid) => {
                      const grp = groups.find((g) => g.id === gid);
                      if (!grp) return null;
                      return (
                        <Chip
                          key={gid}
                          size="small"
                          label={grp.name}
                          sx={{
                            height: 24,
                            fontSize: '0.73rem',
                            fontWeight: 700,
                            bgcolor: 'action.hover',
                            color: 'text.secondary',
                            border: '1px solid var(--mui-palette-divider)',
                            '&::before': {
                              content: '""',
                              display: 'inline-block',
                              width: 7,
                              height: 7,
                              borderRadius: '50%',
                              bgcolor: grp.colorTag,
                              mr: 0.75,
                              ml: 0.5,
                            },
                          }}
                        />
                      );
                    })}
                  </Stack>
                </Box>

                {/* Unified Current Level, Next Level & Target 36 Personal Best Card */}
                <Box
                  sx={{
                    p: 2.25,
                    borderRadius: 1.5,
                    bgcolor: 'action.hover',
                    border: '1px solid var(--mui-palette-divider)',
                    borderLeft: `3px solid ${currentDiv.badgeColor}`,
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2.5}
                    sx={{
                      alignItems: { xs: 'flex-start', sm: 'center' },
                    }}
                  >
                    <Box sx={{ minWidth: 200 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {t('dashboard.currentDivisionLabel')}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: 'center', mt: 0.5 }}
                      >
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: 0.5,
                            bgcolor: currentDiv.badgeColor,
                          }}
                        />
                        <Typography
                          variant="h5"
                          sx={{ fontWeight: 800, color: currentDiv.badgeColor }}
                        >
                          {t(currentDiv.nameKey)}
                        </Typography>
                      </Stack>
                    </Box>

                    <Divider
                      orientation="vertical"
                      flexItem
                      sx={{ display: { xs: 'none', sm: 'block' } }}
                    />

                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {t('dashboard.nextDivisionLabel')}
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{
                          mt: 0.5,
                          fontWeight: 700,
                          color: nextDiv ? 'text.primary' : 'success.main',
                        }}
                      >
                        {nextDiv ? (
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <span style={{ color: 'var(--mui-palette-text-secondary)' }}>→</span>
                            <span>{t(nextDiv.nameKey)}</span>
                            <Box
                              component="span"
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: nextDiv.badgeColor,
                              }}
                            />
                          </Stack>
                        ) : (
                          t('dashboard.maxDivisionReached')
                        )}
                      </Typography>
                    </Box>
                  </Stack>

                  <Box
                    sx={{
                      mt: 1.75,
                      pt: 1.5,
                      borderTop: '1px solid var(--mui-palette-divider)',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      <strong style={{ color: '#F59E0B', marginRight: 6 }}>
                        {t('dashboard.target36Badge')}
                      </strong>
                      {personalBestOnCurrentLevel !== null
                        ? personalBestOnCurrentLevel <= 35
                          ? t('dashboard.personalBestPassed', {
                              distance: t(currentDiv.distanceKey),
                              score: personalBestOnCurrentLevel,
                            })
                          : t('dashboard.personalBestFromDistance', {
                              distance: t(currentDiv.distanceKey),
                              score: personalBestOnCurrentLevel,
                              diff: personalBestOnCurrentLevel - 35,
                              nextDistance: nextDiv ? t(nextDiv.distanceKey) : '35',
                            })
                        : t('dashboard.noRoundsOnCurrentLevel', {
                            distance: t(currentDiv.distanceKey),
                          })}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </Grid>

            {/* Primary Action CTA Card on the right */}
            <Grid size={{ xs: 12, lg: 4 }}>
              <Box
                sx={{
                  height: '100%',
                  p: 2.75,
                  borderRadius: 1.5,
                  bgcolor: 'action.hover',
                  border: '1px solid var(--mui-palette-divider)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                    <SportsGolfIcon sx={{ fontSize: 22, color: 'primary.main' }} />
                    <Typography
                      variant="overline"
                      sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: '0.06em' }}
                    >
                      {t('dashboard.playCtaOverline')}
                    </Typography>
                  </Stack>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.75 }}>
                    {t('dashboard.playCtaTitle')}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
                    {t('dashboard.playCtaSubtitle')}
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={<SportsGolfIcon />}
                  onClick={() => navigate('/play')}
                  sx={{
                    py: 1.4,
                    fontSize: '0.95rem',
                    fontWeight: 700,
                  }}
                >
                  {t('dashboard.playCtaButton')}
                </Button>
              </Box>
            </Grid>
          </Grid>

          {/* 8-Level Visual Progression Stepper – Crisp & Focused */}
          <Box sx={{ mt: 3, pt: 2.5, borderTop: '1px solid var(--mui-palette-divider)' }}>
            <Stack
              direction="row"
              sx={{
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1.25,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {t('dashboard.progressionStepperTitle')}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: currentDiv.badgeColor }}>
                {t('divisions.levelProgress', {
                  current: activePlayer.currentDivision,
                  max: 8,
                })}
              </Typography>
            </Stack>

            <Grid container spacing={1}>
              {DIVISIONS.map((div) => {
                const isCompleted = div.level < activePlayer.currentDivision;
                const isCurrent = div.level === activePlayer.currentDivision;
                return (
                  <Grid key={div.level} size={{ xs: 6, sm: 3, md: 1.5 }}>
                    <Box
                      sx={{
                        p: 1.15,
                        borderRadius: 1,
                        bgcolor: isCurrent
                          ? `${div.badgeColor}14`
                          : 'transparent',
                        border: isCurrent
                          ? `1.5px solid ${div.badgeColor}`
                          : isCompleted
                          ? '1px solid rgba(16, 185, 129, 0.35)'
                          : '1px solid var(--mui-palette-divider)',
                        opacity: isCompleted || isCurrent ? 1 : 0.45,
                      }}
                    >
                      <Stack
                        direction="row"
                        sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.68rem',
                            color: isCurrent
                              ? div.badgeColor
                              : isCompleted
                              ? 'primary.main'
                              : 'text.secondary',
                          }}
                        >
                          {t('divisions.levelLabel', { level: div.level })}
                        </Typography>
                        {isCompleted && (
                          <Typography
                            variant="caption"
                            sx={{ color: 'primary.main', fontWeight: 800, fontSize: '0.7rem' }}
                          >
                            ✓
                          </Typography>
                        )}
                        {isCurrent && (
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              bgcolor: div.badgeColor,
                            }}
                          />
                        )}
                      </Stack>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isCurrent ? 800 : 600,
                          mt: 0.25,
                          fontSize: '0.82rem',
                          color: isCurrent ? 'text.primary' : 'text.secondary',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {t(div.shortLabelKey)}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </CardContent>
      </Card>

      {/* Quick KPI Stats Row */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.5 }}>
                <BoltIcon sx={{ fontSize: 17, color: '#F59E0B' }} />
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}
                >
                  {t('dashboard.stats.xpTotal')}
                </Typography>
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {activePlayer.xp}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 6, sm: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.5 }}>
                <CheckCircleIcon sx={{ fontSize: 17, color: 'primary.main' }} />
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}
                >
                  {t('dashboard.stats.attendance')}
                </Typography>
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {activePlayer.attendanceCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 6, sm: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.5 }}>
                <TrendingDownIcon sx={{ fontSize: 17, color: 'text.secondary' }} />
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}
                >
                  {t('dashboard.stats.avgPutts')}
                </Typography>
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {avgPutts}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 6, sm: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.5 }}>
                <EmojiEventsIcon sx={{ fontSize: 17, color: 'primary.main' }} />
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}
                >
                  {t('dashboard.stats.girPercent')}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  {girPercent}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={girPercent}
                  sx={{
                    flexGrow: 1,
                    height: 5,
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                    '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' },
                  }}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Split: Next Training Card + Recent Scorecards */}
      <Grid container spacing={2.5}>
        {/* Next Training Card (Personalized) */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.75 }}>
              <Stack
                direction="row"
                sx={{
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2,
                }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <CalendarMonthIcon fontSize="small" color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {t('dashboard.nextTrainingTitle')}
                  </Typography>
                </Stack>
                <Button size="small" onClick={() => navigate('/calendar')}>
                  {t('dashboard.viewFullCalendar')}
                </Button>
              </Stack>

              {nextSession ? (
                <Stack spacing={2}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 1.25,
                      bgcolor: 'action.hover',
                      border: '1px solid var(--mui-palette-divider)',
                      borderLeft: `3px solid ${nextSessionGroup?.colorTag || '#10B981'}`,
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center', mb: 1 }}
                    >
                      {nextSessionGroup && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            color: nextSessionGroup.colorTag,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {nextSessionGroup.name}
                        </Typography>
                      )}
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        •{' '}
                        {nextSession.sessionType === 'level_test_event'
                          ? t('calendar.sessionTypeEvent')
                          : t('calendar.sessionTypeTraining')}
                      </Typography>
                    </Stack>

                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.25 }}>
                      {nextSession.title}
                    </Typography>

                    <Stack spacing={0.5} sx={{ color: 'text.secondary' }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <AccessTimeIcon sx={{ fontSize: 16 }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                          {formatLocalizedDate(nextSession.date, language)} •{' '}
                          {nextSession.startTime}–{nextSession.endTime}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <PlaceIcon sx={{ fontSize: 16 }} />
                        <Typography variant="body2">{nextSession.location}</Typography>
                      </Stack>
                    </Stack>
                  </Box>

                  {/* 1-Tap RSVP Buttons */}
                  <Stack direction="row" spacing={1.25}>
                    <Button
                      fullWidth
                      variant={isAttendingNext ? 'contained' : 'outlined'}
                      color="primary"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => toggleRsvp(nextSession.id, activePlayer.id, true)}
                    >
                      {t('dashboard.rsvpAttending')}
                    </Button>
                    <Button
                      fullWidth
                      variant={isDeclinedNext ? 'contained' : 'outlined'}
                      color="inherit"
                      startIcon={<CancelIcon />}
                      onClick={() => toggleRsvp(nextSession.id, activePlayer.id, false)}
                      sx={{
                        borderColor: 'var(--mui-palette-divider)',
                        color: isDeclinedNext ? 'error.main' : 'text.secondary',
                      }}
                    >
                      {t('dashboard.rsvpDecline')}
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {t('dashboard.noUpcomingTraining')}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent 9-Hole Scorecards & Stroke Trend */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.75 }}>
              <Stack
                direction="row"
                sx={{
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1,
                  mb: 2,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {t('dashboard.recentRoundsTitle')}
                </Typography>

                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  {overallBestScore !== null && (
                    <Chip
                      size="small"
                      label={`${t('dashboard.stats.bestScore')}: ${overallBestScore}`}
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  )}
                  {playerScorecards.length > 0 && (
                    <Button
                      size="small"
                      startIcon={<HistoryIcon fontSize="small" />}
                      onClick={() => setAllRoundsDialogOpen(true)}
                    >
                      {t('dashboard.viewAllRounds', {
                        count: playerScorecards.length,
                      })}
                    </Button>
                  )}
                </Stack>
              </Stack>

              {playerScorecards.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {t('dashboard.noRoundsYet')}
                </Typography>
              ) : (
                <Stack spacing={1.25}>
                  {playerScorecards.slice(0, 3).map((sc) => {
                    const div = getDivisionByLevel(sc.divisionLevel);
                    const targetStrokes = getScorecardTarget(sc);
                    const holesPlayedCount = sc.holesCount || sc.holes.length || 9;
                    const passed = sc.totalStrokes <= targetStrokes;
                    return (
                      <Box
                        key={sc.id}
                        sx={{
                          p: 1.75,
                          borderRadius: 1.25,
                          bgcolor: 'action.hover',
                          border: '1px solid var(--mui-palette-divider)',
                          borderLeft: passed
                            ? '3px solid var(--mui-palette-primary-main)'
                            : `3px solid ${div.badgeColor}`,
                        }}
                      >
                        <Stack
                          direction="row"
                          sx={{
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 1.5,
                          }}
                        >
                          <Box>
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ alignItems: 'center', mb: 0.5 }}
                            >
                              <Typography
                                variant="subtitle2"
                                sx={{ fontWeight: 700, color: 'text.primary' }}
                              >
                                {t(div.nameKey)}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary' }}
                              >
                                • {formatLocalizedDate(sc.date, language)}
                              </Typography>
                              {passed && (
                                <Chip
                                  size="small"
                                  label={t('dashboard.passedBadge')}
                                  color="primary"
                                  sx={{
                                    height: 20,
                                    fontWeight: 800,
                                    fontSize: '0.65rem',
                                  }}
                                />
                              )}
                            </Stack>

                            <Stack
                              direction="row"
                              spacing={1.5}
                              sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                            >
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {sc.isOfficialEvent
                                  ? t('dashboard.officialRound')
                                  : t('dashboard.practiceRound')}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 0.4,
                                  color: sc.verifiedByCoach
                                    ? 'text.secondary'
                                    : 'warning.main',
                                  fontWeight: sc.verifiedByCoach ? 500 : 700,
                                }}
                              >
                                {sc.verifiedByCoach ? (
                                  <>
                                    <VerifiedIcon sx={{ fontSize: 13, color: 'primary.main' }} />
                                    {t('dashboard.verified')}
                                  </>
                                ) : (
                                  <>
                                    <HourglassTopIcon sx={{ fontSize: 13 }} />
                                    {t('dashboard.pendingVerification')}
                                  </>
                                )}
                              </Typography>
                            </Stack>
                          </Box>

                          {/* Score & Stats Pill */}
                          <Stack
                            direction="row"
                            spacing={2}
                            sx={{ alignItems: 'center' }}
                          >
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary', display: 'block' }}
                              >
                                {sc.totalPutts} {t('dashboard.puttsUnit')} • GIR{' '}
                                {sc.totalGir}/{holesPlayedCount}
                              </Typography>
                              {/* Hole-by-hole mini strip */}
                              <Stack direction="row" spacing={0.35} sx={{ mt: 0.4 }}>
                                {sc.holes.map((h) => {
                                  const holePar = getDefaultHolePar(h.holeNumber);
                                  return (
                                    <Box
                                      key={h.holeNumber}
                                      sx={{
                                        width: 17,
                                        height: 17,
                                        borderRadius: 0.5,
                                        fontSize: '0.64rem',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor:
                                          h.strokes < holePar
                                            ? 'rgba(16, 185, 129, 0.22)'
                                            : 'rgba(255, 255, 255, 0.05)',
                                        color:
                                          h.strokes < holePar
                                            ? 'primary.main'
                                            : h.strokes === holePar
                                            ? 'text.primary'
                                            : 'text.secondary',
                                        border: '1px solid var(--mui-palette-divider)',
                                      }}
                                    >
                                      {h.strokes}
                                    </Box>
                                  );
                                })}
                              </Stack>
                            </Box>

                            <Box
                              sx={{
                                minWidth: 54,
                                py: 0.65,
                                px: 1.25,
                                borderRadius: 1,
                                textAlign: 'center',
                                bgcolor: passed
                                  ? 'primary.main'
                                  : 'transparent',
                                border: passed
                                  ? 'none'
                                  : '1px solid var(--mui-palette-divider)',
                                color: passed ? 'primary.contrastText' : 'text.primary',
                              }}
                            >
                              <Typography
                                variant="h5"
                                sx={{ fontWeight: 800, lineHeight: 1.1 }}
                              >
                                {sc.totalStrokes}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ fontSize: '0.62rem', fontWeight: 700, opacity: 0.8 }}
                              >
                                / {targetStrokes}
                              </Typography>
                            </Box>
                          </Stack>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Full Scorecard History Scrollable Dialog */}
      <Dialog
        open={allRoundsDialogOpen}
        onClose={() => setAllRoundsDialogOpen(false)}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          <Stack
            direction="row"
            sx={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <HistoryIcon color="primary" fontSize="small" />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {t('dashboard.allRoundsDialogTitle', { name: activePlayer.name })}
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('dashboard.allRoundsDialogSubtitle', {
                  count: playerScorecards.length,
                })}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setAllRoundsDialogOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ maxHeight: '70vh' }}>
          <Stack spacing={1.5}>
            {playerScorecards.map((sc: Scorecard) => {
              const div = getDivisionByLevel(sc.divisionLevel);
              const targetStrokes = getScorecardTarget(sc);
              const holesPlayedCount = sc.holesCount || sc.holes.length || 9;
              const passed = sc.totalStrokes <= targetStrokes;
              return (
                <Box
                  key={sc.id}
                  sx={{
                    p: 2,
                    borderRadius: 1.25,
                    bgcolor: 'action.hover',
                    border: '1px solid var(--mui-palette-divider)',
                    borderLeft: passed
                      ? '3px solid var(--mui-palette-primary-main)'
                      : `3px solid ${div.badgeColor}`,
                  }}
                >
                  <Stack
                    direction="row"
                    sx={{
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}
                      >
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 700, color: 'text.primary' }}
                        >
                          {t(div.nameKey)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          • {formatLocalizedDate(sc.date, language)}
                        </Typography>
                        {passed && (
                          <Chip
                            size="small"
                            label={t('dashboard.passedBadge')}
                            color="primary"
                            sx={{
                              height: 20,
                              fontWeight: 800,
                              fontSize: '0.65rem',
                            }}
                          />
                        )}
                      </Stack>

                      <Stack
                        direction="row"
                        spacing={1.5}
                        sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                      >
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {sc.isOfficialEvent
                            ? t('dashboard.officialRound')
                            : t('dashboard.practiceRound')}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.4,
                            color: sc.verifiedByCoach
                              ? 'text.secondary'
                              : 'warning.main',
                            fontWeight: sc.verifiedByCoach ? 500 : 700,
                          }}
                        >
                          {sc.verifiedByCoach ? (
                            <>
                              <VerifiedIcon sx={{ fontSize: 13, color: 'primary.main' }} />
                              {t('dashboard.verified')}
                            </>
                          ) : (
                            <>
                              <HourglassTopIcon sx={{ fontSize: 13 }} />
                              {t('dashboard.pendingVerification')}
                            </>
                          )}
                        </Typography>
                      </Stack>
                    </Box>

                    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.secondary', display: 'block' }}
                        >
                          {sc.totalPutts} {t('dashboard.puttsUnit')} • GIR {sc.totalGir}/{holesPlayedCount}
                        </Typography>
                        <Stack direction="row" spacing={0.4} sx={{ mt: 0.5 }}>
                          {sc.holes.map((h) => {
                            const holePar = getDefaultHolePar(h.holeNumber);
                            return (
                              <Box
                                key={h.holeNumber}
                                sx={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: 0.5,
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  bgcolor:
                                    h.strokes < holePar
                                      ? 'rgba(16, 185, 129, 0.22)'
                                      : 'rgba(255, 255, 255, 0.05)',
                                  color:
                                    h.strokes < holePar
                                      ? 'primary.main'
                                      : h.strokes === holePar
                                      ? 'text.primary'
                                      : 'text.secondary',
                                  border: '1px solid var(--mui-palette-divider)',
                                }}
                              >
                                {h.strokes}
                              </Box>
                            );
                          })}
                        </Stack>
                      </Box>

                      <Box
                        sx={{
                          minWidth: 58,
                          py: 0.75,
                          px: 1.5,
                          borderRadius: 1,
                          textAlign: 'center',
                          bgcolor: passed ? 'primary.main' : 'transparent',
                          border: passed
                            ? 'none'
                            : '1px solid var(--mui-palette-divider)',
                          color: passed ? 'primary.contrastText' : 'text.primary',
                        }}
                      >
                        <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                          {sc.totalStrokes}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ fontSize: '0.64rem', fontWeight: 700, opacity: 0.8 }}
                        >
                          / {targetStrokes}
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 1.75 }}>
          <Button variant="contained" onClick={() => setAllRoundsDialogOpen(false)}>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
