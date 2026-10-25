import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  CalendarMonth as CalendarMonthIcon,
  AccessTime as AccessTimeIcon,
  Place as PlaceIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HowToReg as HowToRegIcon,
  EmojiEvents as EmojiEventsIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { getDivisionByLevel, type TrainingSession } from '../types/models';
import { formatLocalizedDate } from '../i18n/config';

export const CalendarView: React.FC = () => {
  const { t } = useTranslation();
  const {
    currentUser,
    groups,
    users,
    sessions,
    language,
    toggleRsvp,
    toggleAttendance,
  } = useApp();

  const isStaff = currentUser.role === 'coach' || currentUser.role === 'admin';
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>(
    isStaff ? 'all' : 'my_groups'
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  React.useEffect(() => {
    setSelectedGroupFilter(currentUser.role === 'player' ? 'my_groups' : 'all');
  }, [currentUser.role, currentUser.id]);

  const filteredSessions = sessions
    .filter((s) => {
      if (selectedGroupFilter === 'all') return true;
      if (selectedGroupFilter === 'my_groups') {
        return currentUser.groupIds.includes(s.groupId);
      }
      return s.groupId === selectedGroupFilter;
    })
    .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));

  const activeSession: TrainingSession | null =
    sessions.find((s) => s.id === activeSessionId) || null;

  const myGroupNames = groups
    .filter((g) => currentUser.groupIds.includes(g.id))
    .map((g) => g.name)
    .join(', ');

  return (
    <Stack spacing={2.5}>
      {/* Calendar Header & Role-Aware Filter Chips */}
      <Card>
        <CardContent sx={{ p: { xs: 2.25, md: 2.75 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'center' },
            }}
          >
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <CalendarMonthIcon color="primary" fontSize="small" />
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {t('calendar.title')}
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                {currentUser.role === 'player'
                  ? t('calendar.subtitlePlayer', { groups: myGroupNames || '—' })
                  : t('calendar.subtitleStaff')}
              </Typography>
            </Box>

            {/* Filter Chips */}
            <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {currentUser.role === 'player' && (
                <Chip
                  size="small"
                  label={t('calendar.myGroupsOnly')}
                  color={selectedGroupFilter === 'my_groups' ? 'primary' : 'default'}
                  variant={selectedGroupFilter === 'my_groups' ? 'filled' : 'outlined'}
                  onClick={() => setSelectedGroupFilter('my_groups')}
                />
              )}
              <Chip
                size="small"
                label={t('calendar.filterAllGroups')}
                color={selectedGroupFilter === 'all' ? 'primary' : 'default'}
                variant={selectedGroupFilter === 'all' ? 'filled' : 'outlined'}
                onClick={() => setSelectedGroupFilter('all')}
              />
              {groups.map((grp) => {
                const isSelected = selectedGroupFilter === grp.id;
                return (
                  <Chip
                    key={grp.id}
                    size="small"
                    label={grp.name}
                    onClick={() => setSelectedGroupFilter(grp.id)}
                    sx={{
                      bgcolor: isSelected ? `${grp.colorTag}22` : 'transparent',
                      color: isSelected ? grp.colorTag : 'text.secondary',
                      border: isSelected
                        ? `1px solid ${grp.colorTag}`
                        : '1px solid var(--mui-palette-divider)',
                    }}
                  />
                );
              })}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Calendar Sessions Grid */}
      <Grid container spacing={2}>
        {filteredSessions.map((session) => {
          const grp = groups.find((g) => g.id === session.groupId);
          const coach = users.find((u) => u.id === session.coachId);
          const isEvent = session.sessionType === 'level_test_event';
          const isPlayerAttending = session.rsvpPlayerIds.includes(currentUser.id);
          const isPlayerDeclined = Boolean(
            session.declinedPlayerIds?.includes(currentUser.id)
          );

          return (
            <Grid key={session.id} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderLeft: `3px solid ${grp?.colorTag || '#10B981'}`,
                }}
              >
                <CardContent sx={{ p: 2.25 }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 1.25,
                    }}
                  >
                    {grp && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: grp.colorTag,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {grp.name}
                      </Typography>
                    )}
                    {isEvent ? (
                      <Chip
                        size="small"
                        icon={<EmojiEventsIcon sx={{ fontSize: '14px !important' }} />}
                        label={t('calendar.sessionTypeEvent')}
                        color="secondary"
                        sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }}
                      />
                    ) : (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {t('calendar.sessionTypeTraining')}
                      </Typography>
                    )}
                  </Stack>

                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, minHeight: 48 }}>
                    {session.title}
                  </Typography>

                  <Stack spacing={0.6} sx={{ color: 'text.secondary', mb: 2 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: 'text.primary' }}
                      >
                        {formatLocalizedDate(session.date, language)} • {session.startTime}–
                        {session.endTime}
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <PlaceIcon sx={{ fontSize: 16 }} />
                      <Typography variant="body2">{session.location}</Typography>
                    </Stack>

                    {coach && (
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <PersonIcon sx={{ fontSize: 16 }} />
                        <Typography variant="body2">
                          {t('calendar.coach')}: {coach.name}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>

                  {/* Attendance & RSVP Counter */}
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={t('calendar.rsvpCount', { count: session.rsvpPlayerIds.length })}
                      sx={{ height: 22, fontSize: '0.72rem' }}
                    />
                    {session.attendedPlayerIds.length > 0 && (
                      <Chip
                        size="small"
                        color="primary"
                        variant="outlined"
                        label={t('calendar.attendedCount', {
                          count: session.attendedPlayerIds.length,
                        })}
                        sx={{ height: 22, fontSize: '0.72rem' }}
                      />
                    )}
                  </Stack>

                  {/* Player 1-Tap RSVP or Staff Open Check-in Button */}
                  {currentUser.role === 'player' ? (
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          fullWidth
                          variant={isPlayerAttending ? 'contained' : 'outlined'}
                          color="primary"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => toggleRsvp(session.id, currentUser.id, true)}
                        >
                          {t('dashboard.rsvpAttending')}
                        </Button>
                        <Button
                          size="small"
                          fullWidth
                          variant={isPlayerDeclined ? 'contained' : 'outlined'}
                          color="inherit"
                          startIcon={<CancelIcon />}
                          onClick={() => toggleRsvp(session.id, currentUser.id, false)}
                          sx={{
                            borderColor: 'var(--mui-palette-divider)',
                            color: isPlayerDeclined ? 'error.main' : 'text.secondary',
                          }}
                        >
                          {t('dashboard.rsvpDecline')}
                        </Button>
                      </Stack>
                      <Button
                        size="small"
                        variant="text"
                        sx={{ color: 'text.secondary', fontSize: '0.78rem' }}
                        onClick={() => setActiveSessionId(session.id)}
                      >
                        {t('calendar.openSessionDetails')}
                      </Button>
                    </Stack>
                  ) : (
                    <Button
                      fullWidth
                      variant="outlined"
                      color="primary"
                      startIcon={<HowToRegIcon />}
                      onClick={() => setActiveSessionId(session.id)}
                    >
                      {t('calendar.openSessionDetails')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Session Details & 1-Tap Attendance Check-in Modal */}
      {activeSession && (
        <Dialog
          open={Boolean(activeSession)}
          onClose={() => setActiveSessionId(null)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 800 }}>{activeSession.title}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2.25}>
              <Box
                sx={{
                  p: 1.75,
                  borderRadius: 1.25,
                  bgcolor: 'action.hover',
                  border: '1px solid var(--mui-palette-divider)',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatLocalizedDate(activeSession.date, language)} •{' '}
                  {activeSession.startTime}–{activeSession.endTime}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4 }}>
                  {t('calendar.location')}: {activeSession.location}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4 }}>
                  {t('calendar.coach')}:{' '}
                  {users.find((u) => u.id === activeSession.coachId)?.name || '—'}
                </Typography>
              </Box>

              {/* Player RSVP list */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  {t('calendar.rsvpPlayersList', {
                    count: activeSession.rsvpPlayerIds.length,
                  })}
                </Typography>
                <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  {activeSession.rsvpPlayerIds.map((pid) => {
                    const p = users.find((u) => u.id === pid);
                    if (!p) return null;
                    return (
                      <Chip
                        key={pid}
                        label={p.name}
                        variant="outlined"
                        size="small"
                      />
                    );
                  })}
                </Stack>
              </Box>

              {/* Coach / Admin Interactive 1-Tap Attendance Check-In List */}
              {isStaff && (
                <>
                  <Divider />
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, color: 'primary.main' }}
                    >
                      {t('calendar.attendanceCheckInTitle')}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}
                    >
                      {t('calendar.attendanceCheckInHelp')}
                    </Typography>

                    <Stack spacing={0.75}>
                      {users
                        .filter(
                          (u) =>
                            u.role === 'player' &&
                            (u.groupIds.includes(activeSession.groupId) ||
                              activeSession.rsvpPlayerIds.includes(u.id))
                        )
                        .map((player) => {
                          const isCheckedIn = activeSession.attendedPlayerIds.includes(
                            player.id
                          );
                          const div = getDivisionByLevel(player.currentDivision);
                          return (
                            <Box
                              key={player.id}
                              onClick={() =>
                                toggleAttendance(activeSession.id, player.id)
                              }
                              sx={{
                                p: 1,
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                bgcolor: isCheckedIn
                                  ? 'rgba(16, 185, 129, 0.1)'
                                  : 'action.hover',
                                border: isCheckedIn
                                  ? '1px solid var(--mui-palette-primary-main)'
                                  : '1px solid var(--mui-palette-divider)',
                              }}
                            >
                              <Stack
                                direction="row"
                                spacing={1}
                                sx={{ alignItems: 'center' }}
                              >
                                <Checkbox
                                  checked={isCheckedIn}
                                  color="primary"
                                  size="small"
                                  sx={{ p: 0.5 }}
                                />
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {player.name}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{ color: 'text.secondary' }}
                                  >
                                    {t(div.nameKey)} • {player.xp} PTS
                                  </Typography>
                                </Box>
                              </Stack>

                              <Chip
                                size="small"
                                color={isCheckedIn ? 'primary' : 'default'}
                                variant={isCheckedIn ? 'filled' : 'outlined'}
                                label={
                                  isCheckedIn
                                    ? t('calendar.checkedInBadge')
                                    : t('calendar.markPresent')
                                }
                              />
                            </Box>
                          );
                        })}
                    </Stack>
                  </Box>
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setActiveSessionId(null)} variant="contained">
              OK
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Stack>
  );
};
