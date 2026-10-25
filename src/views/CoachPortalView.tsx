import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Tabs,
  Tab,
  Chip,
  Button,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  FactCheck as FactCheckIcon,
  Verified as VerifiedIcon,
  AccessTime as AccessTimeIcon,
  Place as PlaceIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { getDivisionByLevel, getScorecardTarget } from '../types/models';
import { formatLocalizedDate } from '../i18n/config';

export const CoachPortalView: React.FC = () => {
  const { t } = useTranslation();
  const {
    currentUser,
    groups,
    users,
    sessions,
    scorecards,
    language,
    toggleAttendance,
    verifyScorecard,
  } = useApp();

  const [activeTab, setActiveTab] = useState<number>(0);
  const [sessionScope, setSessionScope] = useState<string>('assigned');
  const [groupFilter, setGroupFilter] = useState<string>('assigned');
  const [expandedSessionId, setExpandedSessionId] = useState<string>(
    sessions[0]?.id || 'sess-1'
  );

  // Determine which groups the current coach/admin is assigned to
  const coachAssignedGroupIds = currentUser.groupIds;

  const visibleSessions = sessions.filter((s) => {
    if (sessionScope === 'all') return true;
    if (sessionScope === 'assigned') {
      return coachAssignedGroupIds.includes(s.groupId);
    }
    return s.groupId === sessionScope;
  });

  const players = users.filter((u) => {
    if (u.role !== 'player') return false;
    if (groupFilter === 'all') return true;
    if (groupFilter === 'assigned') {
      return u.groupIds.some((gid) => coachAssignedGroupIds.includes(gid));
    }
    return u.groupIds.includes(groupFilter);
  });

  const pendingScorecards = scorecards.filter((sc) => !sc.verifiedByCoach);

  return (
    <Stack spacing={2.5}>
      {/* Coach Portal Header & Tabs */}
      <Card>
        <CardContent sx={{ p: { xs: 2.25, md: 2.75 }, pb: '0 !important' }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              mb: 1.5,
            }}
          >
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <FactCheckIcon color="primary" fontSize="small" />
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {t('coach.title')}
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                {t('coach.subtitle')}
              </Typography>
            </Box>

            {pendingScorecards.length > 0 && (
              <Chip
                size="small"
                color="secondary"
                label={t('coach.pendingVerificationsTitle', {
                  count: pendingScorecards.length,
                })}
                onClick={() => setActiveTab(1)}
                sx={{ fontWeight: 700, cursor: 'pointer' }}
              />
            )}
          </Stack>

          <Tabs
            value={activeTab}
            onChange={(_e, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label={t('coach.tabSessions')} sx={{ fontWeight: 700 }} />
            <Tab
              label={`${t('coach.tabProgression')} (${pendingScorecards.length})`}
              sx={{ fontWeight: 700 }}
            />
          </Tabs>
        </CardContent>
      </Card>

      {/* TAB 0: Today's & Upcoming Sessions + 1-Tap Attendance Check-In */}
      {activeTab === 0 && (
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
            }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('coach.quickAttendanceInfo')}
            </Typography>

            <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={`${t('coach.filterAssignedGroups')} (${coachAssignedGroupIds.length})`}
                color={sessionScope === 'assigned' ? 'primary' : 'default'}
                variant={sessionScope === 'assigned' ? 'filled' : 'outlined'}
                onClick={() => setSessionScope('assigned')}
              />
              <Chip
                size="small"
                label={`${t('coach.filterAllClubGroups')} (${groups.length})`}
                color={sessionScope === 'all' ? 'primary' : 'default'}
                variant={sessionScope === 'all' ? 'filled' : 'outlined'}
                onClick={() => setSessionScope('all')}
              />
              {groups.map((g) => (
                <Chip
                  key={g.id}
                  size="small"
                  label={g.name}
                  onClick={() => setSessionScope(g.id)}
                  sx={{
                    bgcolor: sessionScope === g.id ? `${g.colorTag}20` : 'transparent',
                    color: sessionScope === g.id ? g.colorTag : 'text.secondary',
                    border:
                      sessionScope === g.id
                        ? `1px solid ${g.colorTag}`
                        : '1px solid var(--mui-palette-divider)',
                  }}
                />
              ))}
            </Stack>
          </Stack>

          <Grid container spacing={2}>
            {visibleSessions.slice(0, 8).map((session) => {
              const grp = groups.find((g) => g.id === session.groupId);
              const isExpanded = expandedSessionId === session.id;
              const groupPlayers = users.filter(
                (u) =>
                  u.role === 'player' &&
                  (u.groupIds.includes(session.groupId) ||
                    session.rsvpPlayerIds.includes(u.id))
              );

              return (
                <Grid key={session.id} size={{ xs: 12, md: 6 }}>
                  <Card
                    sx={{
                      borderLeft: `3px solid ${grp?.colorTag || '#10B981'}`,
                      borderColor: isExpanded
                        ? 'var(--mui-palette-primary-main)'
                        : undefined,
                    }}
                  >
                    <CardContent sx={{ p: 2.25 }}>
                      <Box
                        onClick={() => setExpandedSessionId(session.id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <Stack
                          direction="row"
                          sx={{
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 0.75,
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
                          <Chip
                            size="small"
                            variant="outlined"
                            color={
                              session.attendedPlayerIds.length > 0 ? 'primary' : 'default'
                            }
                            label={t('calendar.attendedCount', {
                              count: session.attendedPlayerIds.length,
                            })}
                            sx={{ height: 22, fontSize: '0.72rem' }}
                          />
                        </Stack>

                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.75 }}>
                          {session.title}
                        </Typography>

                        <Stack
                          direction="row"
                          spacing={2}
                          sx={{ color: 'text.secondary', mb: 2, flexWrap: 'wrap' }}
                        >
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                            <AccessTimeIcon sx={{ fontSize: 15 }} />
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                              {formatLocalizedDate(session.date, language)} •{' '}
                              {session.startTime}–{session.endTime}
                            </Typography>
                          </Stack>
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                            <PlaceIcon sx={{ fontSize: 15 }} />
                            <Typography variant="caption">{session.location}</Typography>
                          </Stack>
                        </Stack>
                      </Box>

                      {/* 1-Tap Junior Attendance Checklist */}
                      <Stack spacing={0.75}>
                        {groupPlayers.map((player) => {
                          const isPresent = session.attendedPlayerIds.includes(player.id);
                          const isRsvpd = session.rsvpPlayerIds.includes(player.id);
                          const div = getDivisionByLevel(player.currentDivision);

                          return (
                            <Box
                              key={player.id}
                              onClick={() => toggleAttendance(session.id, player.id)}
                              sx={{
                                p: 1,
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                bgcolor: isPresent
                                  ? 'rgba(16, 185, 129, 0.08)'
                                  : 'action.hover',
                                border: isPresent
                                  ? '1px solid rgba(16, 185, 129, 0.4)'
                                  : '1px solid var(--mui-palette-divider)',
                              }}
                            >
                              <Stack
                                direction="row"
                                spacing={1}
                                sx={{ alignItems: 'center' }}
                              >
                                <Checkbox
                                  checked={isPresent}
                                  color="primary"
                                  size="small"
                                  sx={{ p: 0.5 }}
                                />
                                <Box>
                                  <Stack
                                    direction="row"
                                    spacing={1}
                                    sx={{ alignItems: 'center' }}
                                  >
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                      {player.name}
                                    </Typography>
                                    {isRsvpd && (
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color: 'text.secondary',
                                          fontSize: '0.68rem',
                                        }}
                                      >
                                        • RSVP
                                      </Typography>
                                    )}
                                  </Stack>
                                  <Typography
                                    variant="caption"
                                    sx={{ color: 'text.secondary' }}
                                  >
                                    {t(div.shortLabelKey)} • {player.xp} PTS
                                  </Typography>
                                </Box>
                              </Stack>

                              <Chip
                                size="small"
                                color={isPresent ? 'primary' : 'default'}
                                variant={isPresent ? 'filled' : 'outlined'}
                                label={
                                  isPresent ? '+50 PTS ✓' : t('calendar.markPresent')
                                }
                                sx={{ height: 24, fontSize: '0.72rem' }}
                              />
                            </Box>
                          );
                        })}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Stack>
      )}

      {/* TAB 1: Player Progression & Scorecard Verification */}
      {activeTab === 1 && (
        <Stack spacing={2.5}>
          {/* Pending Scorecards Verification Queue */}
          <Card
            sx={{
              borderLeft:
                pendingScorecards.length > 0
                  ? '3px solid #F59E0B'
                  : '1px solid var(--mui-palette-divider)',
            }}
          >
            <CardContent sx={{ p: 2.75 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                {t('coach.pendingVerificationsTitle', { count: pendingScorecards.length })}
              </Typography>

              {pendingScorecards.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {t('coach.noPendingScorecards')}
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {pendingScorecards.map((sc) => {
                    const player = users.find((u) => u.id === sc.playerId);
                    const div = getDivisionByLevel(sc.divisionLevel);
                    const nextDiv =
                      sc.divisionLevel < 8
                        ? getDivisionByLevel(sc.divisionLevel + 1)
                        : null;
                    const targetStrokes = getScorecardTarget(sc);
                    const holesPlayedCount = sc.holesCount || sc.holes.length || 9;
                    const passed = sc.totalStrokes <= targetStrokes;

                    return (
                      <Grid key={sc.id} size={{ xs: 12, md: 6 }}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 1.25,
                            bgcolor: 'action.hover',
                            border: '1px solid var(--mui-palette-divider)',
                            borderLeft: passed
                              ? '3px solid #10B981'
                              : '3px solid #F59E0B',
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={1.5}
                            sx={{
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                            }}
                          >
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                {player?.name || sc.playerId}
                              </Typography>
                              <Stack
                                direction="row"
                                spacing={1}
                                sx={{ alignItems: 'center', mt: 0.5, mb: 0.75 }}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: 700, color: div.badgeColor }}
                                >
                                  {t(div.nameKey)}
                                </Typography>
                                {passed && nextDiv && (
                                  <Chip
                                    size="small"
                                    label={`→ ${t(nextDiv.shortLabelKey)}`}
                                    color="primary"
                                    sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                                  />
                                )}
                              </Stack>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {formatLocalizedDate(sc.date, language)} • {sc.totalPutts}{' '}
                                {t('dashboard.puttsUnit')} • GIR {sc.totalGir}/{holesPlayedCount}
                              </Typography>
                            </Box>

                            <Box sx={{ textAlign: 'right' }}>
                              <Typography
                                variant="h4"
                                sx={{
                                  fontWeight: 800,
                                  color: passed ? 'primary.main' : 'text.primary',
                                }}
                              >
                                {sc.totalStrokes}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                / {targetStrokes}
                              </Typography>
                            </Box>
                          </Stack>

                          <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            startIcon={<VerifiedIcon />}
                            onClick={() => verifyScorecard(sc.id)}
                            sx={{ mt: 2, fontWeight: 700 }}
                          >
                            {t('coach.verifyBtn')} {passed ? '(+500 PTS & Level Up)' : ''}
                          </Button>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </CardContent>
          </Card>

          {/* Junior Progression Roster Table Filtered by Group */}
          <Card>
            <CardContent sx={{ p: 2.75 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  mb: 2,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {t('coach.tabProgression')}
                </Typography>

                <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  <Chip
                    size="small"
                    label={`${t('coach.filterAssignedGroups')} (${coachAssignedGroupIds.length})`}
                    color={groupFilter === 'assigned' ? 'primary' : 'default'}
                    variant={groupFilter === 'assigned' ? 'filled' : 'outlined'}
                    onClick={() => setGroupFilter('assigned')}
                  />
                  <Chip
                    size="small"
                    label={t('calendar.filterAllGroups')}
                    color={groupFilter === 'all' ? 'primary' : 'default'}
                    variant={groupFilter === 'all' ? 'filled' : 'outlined'}
                    onClick={() => setGroupFilter('all')}
                  />
                  {groups.map((g) => (
                    <Chip
                      key={g.id}
                      size="small"
                      label={g.name}
                      onClick={() => setGroupFilter(g.id)}
                      sx={{
                        bgcolor: groupFilter === g.id ? `${g.colorTag}20` : 'transparent',
                        color: groupFilter === g.id ? g.colorTag : 'text.secondary',
                        border:
                          groupFilter === g.id
                            ? `1px solid ${g.colorTag}`
                            : '1px solid var(--mui-palette-divider)',
                      }}
                    />
                  ))}
                </Stack>
              </Stack>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('coach.playerTable.player')}</TableCell>
                      <TableCell>{t('coach.playerTable.groups')}</TableCell>
                      <TableCell>{t('coach.playerTable.currentDivision')}</TableCell>
                      <TableCell align="center">
                        {t('coach.playerTable.personalBest')}
                      </TableCell>
                      <TableCell align="center">
                        {t('coach.playerTable.attendance')}
                      </TableCell>
                      <TableCell align="right">{t('coach.playerTable.xp')}</TableCell>
                      <TableCell align="right">{t('coach.playerTable.actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {players.map((p) => {
                      const div = getDivisionByLevel(p.currentDivision);
                      const levelCards = scorecards.filter(
                        (sc) =>
                          sc.playerId === p.id &&
                          sc.divisionLevel === p.currentDivision &&
                          sc.verifiedByCoach
                      );
                      const pb =
                        levelCards.length > 0
                          ? Math.min(...levelCards.map((c) => c.totalStrokes))
                          : null;
                      const pendingForPlayer = scorecards.find(
                        (sc) => sc.playerId === p.id && !sc.verifiedByCoach
                      );

                      return (
                        <TableRow key={p.id} hover>
                          <TableCell sx={{ fontWeight: 700 }}>{p.name}</TableCell>
                          <TableCell>
                            <Stack
                              direction="row"
                              spacing={0.5}
                              useFlexGap
                              sx={{ flexWrap: 'wrap' }}
                            >
                              {p.groupIds.map((gid) => {
                                const grp = groups.find((g) => g.id === gid);
                                if (!grp) return null;
                                return (
                                  <Typography
                                    key={gid}
                                    variant="caption"
                                    sx={{
                                      px: 0.75,
                                      py: 0.15,
                                      borderRadius: 0.75,
                                      border: '1px solid var(--mui-palette-divider)',
                                      color: 'text.secondary',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {grp.name}
                                  </Typography>
                                );
                              })}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={t(div.nameKey)}
                              sx={{
                                height: 24,
                                bgcolor: `${div.badgeColor}14`,
                                color: div.badgeColor,
                                border: `1px solid ${div.badgeColor}45`,
                                fontWeight: 700,
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            {pb !== null ? (
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 700,
                                  color:
                                    pb <= 35
                                      ? 'primary.main'
                                      : pb <= 37
                                      ? '#F59E0B'
                                      : 'text.primary',
                                }}
                              >
                                {pb} / 35
                              </Typography>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>
                            {p.attendanceCount}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {p.xp} PTS
                          </TableCell>
                          <TableCell align="right">
                            {pendingForPlayer ? (
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                startIcon={<VerifiedIcon sx={{ fontSize: 15 }} />}
                                onClick={() => verifyScorecard(pendingForPlayer.id)}
                                sx={{ py: 0.25, px: 1.25, fontSize: '0.75rem' }}
                              >
                                {t('coach.verifyShortBtn', {
                                  score: pendingForPlayer.totalStrokes,
                                })}
                              </Button>
                            ) : (
                              <Chip
                                size="small"
                                variant="outlined"
                                label={t('coach.allVerifiedStatus')}
                                sx={{ height: 22, fontSize: '0.7rem', color: 'text.secondary' }}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Stack>
      )}
    </Stack>
  );
};
