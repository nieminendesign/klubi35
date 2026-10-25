import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  SportsGolf as SportsGolfIcon,
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  EmojiEvents as EmojiEventsIcon,
  DeleteOutlined as DeleteOutlineIcon,
  RestartAlt as RestartAltIcon,
  MyLocation as MyLocationIcon,
  Explore as ExploreIcon,
  Visibility as VisibilityIcon,
  Map as MapIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import {
  DIVISIONS,
  getDivisionByLevel,
  getDefaultHolePar,
  getTargetStrokesForHoles,
  isGirHit,
  type HoleScore,
  type GpsPoint,
} from '../types/models';

interface DraftHoleScore {
  holeNumber: number;
  recorded: boolean;
  strokes: number;
  putts: number;
  gir: boolean;
}

const DRAFT_STORAGE_KEY = 'club36_active_round_draft_v2';

function createEmptyNineHoles(): DraftHoleScore[] {
  return Array.from({ length: 9 }, (_, idx) => ({
    holeNumber: idx + 1,
    recorded: false,
    strokes: 4,
    putts: 2,
    gir: true,
  }));
}

function calculateDistanceMeters(a: GpsPoint, b: GpsPoint): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Math.round(R * c);
}

function calculateCompassBearing(from: GpsPoint, to: GpsPoint): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const brng = (toDeg(Math.atan2(y, x)) + 360) % 360;
  const dirs = ['N ↑', 'NE ↗', 'E →', 'SE ↘', 'S ↓', 'SW ↙', 'W ←', 'NW ↖'];
  return dirs[Math.round(brng / 45) % 8];
}

export const PlayScorecardView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, users, courseConfig, language, submitScorecard } = useApp();

  const players = users.filter((u) => u.role === 'player');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(
    currentUser.role === 'player' ? currentUser.id : players[0]?.id || currentUser.id
  );

  const selectedPlayer =
    users.find((u) => u.id === selectedPlayerId) || currentUser;

  const [divisionLevel, setDivisionLevel] = useState<number>(
    selectedPlayer.currentDivision
  );
  const [holesToPlay, setHolesToPlay] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.holesToPlay === 'number' && parsed.holesToPlay >= 1 && parsed.holesToPlay <= 9) {
          return parsed.holesToPlay;
        }
      }
    } catch {
      // ignore
    }
    return courseConfig.defaultHoleCount || 9;
  });
  const [isOfficialEvent, setIsOfficialEvent] = useState<boolean>(true);
  const [activeHoleIndex, setActiveHoleIndex] = useState<number>(0);
  const [holes, setHoles] = useState<DraftHoleScore[]>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.holes) && parsed.holes.length === 9) {
          return parsed.holes;
        }
      }
    } catch {
      // Fallback to empty scorecard
    }
    return createEmptyNineHoles();
  });

  // Tee placement mode: 'gps' (default GPS tee navigation) vs 'visual' (direct entry)
  const [teeMode, setTeeMode] = useState<'visual' | 'gps'>('gps');
  const [gpsWatching, setGpsWatching] = useState<boolean>(false);
  const [userGpsPos, setUserGpsPos] = useState<GpsPoint | null>(null);

  const [discardDialogOpen, setDiscardDialogOpen] = useState<boolean>(false);
  const [discardToastOpen, setDiscardToastOpen] = useState<boolean>(false);

  useEffect(() => {
    if (currentUser.role === 'player') {
      setSelectedPlayerId(currentUser.id);
      setDivisionLevel(currentUser.currentDivision);
    }
  }, [currentUser.id, currentUser.role, currentUser.currentDivision]);

  // Prevent selecting a harder division than the selected player's current unlocked division
  useEffect(() => {
    if (divisionLevel > selectedPlayer.currentDivision) {
      setDivisionLevel(selectedPlayer.currentDivision);
    }
  }, [divisionLevel, selectedPlayer.currentDivision]);

  useEffect(() => {
    if (activeHoleIndex >= holesToPlay) {
      setActiveHoleIndex(Math.max(0, holesToPlay - 1));
    }
  }, [holesToPlay, activeHoleIndex]);

  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          playerId: selectedPlayerId,
          divisionLevel,
          holesToPlay,
          isOfficialEvent,
          holes,
        })
      );
    } catch {
      // Ignore storage errors
    }
  }, [selectedPlayerId, divisionLevel, holesToPlay, isOfficialEvent, holes]);

  // Live Browser Geolocation Watcher when GPS mode is active
  useEffect(() => {
    if (!gpsWatching || !('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserGpsPos({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        setGpsWatching(false);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [gpsWatching]);

  const activeHolesSlice = holes.slice(0, holesToPlay);
  const activeHole = holes[activeHoleIndex] || holes[0];
  const courseHoles = courseConfig?.holes || [];
  const courseHole =
    courseHoles.find((ch) => ch.holeNumber === activeHole.holeNumber) ||
    courseHoles[0];
  const activeTeeSpot =
    courseHole?.teeSpots?.find((ts) => ts.divisionLevel === divisionLevel) ||
    courseHole?.teeSpots?.[0];

  const recordedHoles = activeHolesSlice.filter((h) => h.recorded);
  const playedHolesCount = recordedHoles.length;
  const hasStartedRound = playedHolesCount > 0;
  const isRoundComplete = playedHolesCount === holesToPlay;

  const roundTargetStrokes = getTargetStrokesForHoles(holesToPlay, courseConfig);
  const totalStrokes = recordedHoles.reduce((sum, h) => sum + h.strokes, 0);
  const totalPutts = recordedHoles.reduce((sum, h) => sum + h.putts, 0);
  const totalGir = recordedHoles.filter((h) => h.gir).length;

  const targetPaceForPlayed = recordedHoles.reduce(
    (sum, h) => sum + getDefaultHolePar(h.holeNumber, courseConfig),
    0
  );
  const paceDiff = totalStrokes - targetPaceForPlayed;
  const isOnPace = hasStartedRound && totalStrokes <= targetPaceForPlayed;
  const isTotalUnderTarget = isRoundComplete && totalStrokes <= roundTargetStrokes;

  const distanceToTee =
    userGpsPos && activeTeeSpot
      ? calculateDistanceMeters(userGpsPos, activeTeeSpot.gps)
      : null;
  const distanceToGreen =
    userGpsPos && courseHole
      ? calculateDistanceMeters(userGpsPos, courseHole.greenGps)
      : null;
  const bearingToTee =
    userGpsPos && activeTeeSpot
      ? calculateCompassBearing(userGpsPos, activeTeeSpot.gps)
      : '';

  const updateHoleValue = (holeIdx: number, nextStrokes: number, nextPutts: number) => {
    const holePar = getDefaultHolePar(holeIdx + 1, courseConfig);
    const clampedStrokes = Math.max(1, Math.min(12, nextStrokes));
    const clampedPutts = Math.max(0, Math.min(clampedStrokes, nextPutts));
    const gir = isGirHit(clampedStrokes, clampedPutts, holePar);

    setHoles((prev) =>
      prev.map((h, i) =>
        i === holeIdx
          ? {
              ...h,
              recorded: true,
              strokes: clampedStrokes,
              putts: clampedPutts,
              gir,
            }
          : h
      )
    );
  };

  const clearSingleHole = (holeIdx: number) => {
    const holePar = getDefaultHolePar(holeIdx + 1, courseConfig);
    setHoles((prev) =>
      prev.map((h, i) =>
        i === holeIdx
          ? {
              ...h,
              recorded: false,
              strokes: holePar,
              putts: 2,
              gir: true,
            }
          : h
      )
    );
  };

  const handleDiscardRound = () => {
    setHoles(createEmptyNineHoles());
    setActiveHoleIndex(0);
    setDiscardDialogOpen(false);
    setDiscardToastOpen(true);
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  const handleSubmitRound = async (customRecordedList?: DraftHoleScore[]) => {
    const listToSubmit = customRecordedList || activeHolesSlice;
    if (listToSubmit.length === 0 || listToSubmit.some((h) => !h.recorded)) return;

    const finalHoles: HoleScore[] = listToSubmit.map((h) => ({
      holeNumber: h.holeNumber,
      strokes: h.strokes,
      putts: h.putts,
      gir: h.gir,
    }));

    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignore
    }

    await submitScorecard({
      playerId: selectedPlayer.id,
      divisionLevel,
      holes: finalHoles,
      isOfficialEvent,
    });
    setHoles(createEmptyNineHoles());
    setActiveHoleIndex(0);
    navigate('/dashboard');
  };

  const selectedDivisionObj = getDivisionByLevel(divisionLevel);

  return (
    <Stack spacing={2.5}>
      {/* Top Setup Card: Course Info, Player, Division, Holes Count (3 / 6 / 9 / 1..9) */}
      <Card>
        <CardContent sx={{ p: { xs: 2.25, md: 2.75 } }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
              <SportsGolfIcon color="primary" />
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {t('play.title')}
              </Typography>
            </Stack>

            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              {currentUser.role !== 'player' && (
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{t('play.selectPlayer')}</InputLabel>
                    <Select
                      label={t('play.selectPlayer')}
                      value={selectedPlayerId}
                      onChange={(e) => {
                        const pid = e.target.value;
                        setSelectedPlayerId(pid);
                        const p = users.find((u) => u.id === pid);
                        if (p) setDivisionLevel(p.currentDivision);
                      }}
                    >
                      {players.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.name} ({t('divisions.levelLabel', { level: p.currentDivision })})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              <Grid size={{ xs: 12, md: currentUser.role !== 'player' ? 4 : 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('play.selectDivision')}</InputLabel>
                  <Select
                    label={t('play.selectDivision')}
                    value={Math.min(divisionLevel, selectedPlayer.currentDivision)}
                    onChange={(e) =>
                      setDivisionLevel(
                        Math.min(Number(e.target.value), selectedPlayer.currentDivision)
                      )
                    }
                  >
                    {DIVISIONS.map((div) => {
                      const isLocked = div.level > selectedPlayer.currentDivision;
                      return (
                        <MenuItem
                          key={div.level}
                          value={div.level}
                          disabled={isLocked}
                        >
                          {isLocked ? `🔒 ${t(div.nameKey)}` : t(div.nameKey)}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: currentUser.role !== 'player' ? 4 : 6 }}>
                <ToggleButtonGroup
                  fullWidth
                  size="small"
                  exclusive
                  value={isOfficialEvent ? 'official' : 'practice'}
                  onChange={(_e, val) => {
                    if (val !== null) setIsOfficialEvent(val === 'official');
                  }}
                >
                  <ToggleButton value="official" sx={{ fontWeight: 700, borderRadius: 1 }}>
                    {t('play.officialEventOption')}
                  </ToggleButton>
                  <ToggleButton value="practice" sx={{ fontWeight: 600, borderRadius: 1 }}>
                    {t('play.practiceOption')}
                  </ToggleButton>
                </ToggleButtonGroup>
              </Grid>

              {/* Editable Holes Count (3 / 6 / 9) + Tee Spot Mode (Visual / GPS) */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.25}
                  sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      color: 'text.secondary',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t('play.holesCountLabel')}:
                  </Typography>
                  <ToggleButtonGroup
                    fullWidth
                    size="small"
                    exclusive
                    value={holesToPlay}
                    onChange={(_e, val) => {
                      if (val !== null) setHolesToPlay(Number(val));
                    }}
                  >
                    <ToggleButton
                      value={3}
                      sx={{ flex: 1, fontWeight: 700, borderRadius: 1 }}
                    >
                      {t('play.holesOption3')}
                    </ToggleButton>
                    <ToggleButton
                      value={6}
                      sx={{ flex: 1, fontWeight: 700, borderRadius: 1 }}
                    >
                      {t('play.holesOption6')}
                    </ToggleButton>
                    <ToggleButton
                      value={9}
                      sx={{ flex: 1, fontWeight: 700, borderRadius: 1 }}
                    >
                      {t('play.holesOption9')}
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.25}
                  sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      color: 'text.secondary',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t('play.teeModeLabel')}:
                  </Typography>
                  <ToggleButtonGroup
                    fullWidth
                    size="small"
                    exclusive
                    value={teeMode}
                    onChange={(_e, val) => {
                      if (val !== null) {
                        setTeeMode(val);
                        if (val === 'gps') {
                          setGpsWatching(true);
                        }
                      }
                    }}
                  >
                    <ToggleButton
                      value="gps"
                      sx={{ flex: 1, fontWeight: 700, fontSize: '0.8rem', borderRadius: 1 }}
                    >
                      <ExploreIcon sx={{ fontSize: 16, mr: 0.75 }} />
                      {t('play.gpsModeNavigate')}
                    </ToggleButton>
                    <ToggleButton
                      value="visual"
                      sx={{ flex: 1, fontWeight: 700, fontSize: '0.8rem', borderRadius: 1 }}
                    >
                      <VisibilityIcon sx={{ fontSize: 16, mr: 0.75 }} />
                      {t('play.gpsModeVisual')}
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
              </Grid>

              {hasStartedRound && (
                <Grid size={{ xs: 12 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={() => setDiscardDialogOpen(true)}
                  >
                    {t('play.discardRoundBtn')}
                  </Button>
                </Grid>
              )}
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      {/* Stylized Compact Live Pace Bar */}
      <Card
        sx={{
          borderLeft: !hasStartedRound
            ? '4px solid var(--mui-palette-divider)'
            : isOnPace
            ? '4px solid #10B981'
            : paceDiff <= 2
            ? '4px solid #F59E0B'
            : '4px solid #F43F5E',
        }}
      >
        <CardContent sx={{ py: 1.5, px: { xs: 2, md: 2.5 }, '&:last-child': { pb: 1.5 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.25}
            sx={{
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
            }}
          >
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'block',
                }}
              >
                {t(selectedDivisionObj.nameKey)} •{' '}
                {t('play.livePaceTitle', {
                  target: roundTargetStrokes,
                  holes: holesToPlay,
                })}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.15 }}>
                {!hasStartedRound
                  ? t('play.paceNotStarted')
                  : t('play.pacePlayedStatus', {
                      played: playedHolesCount,
                      totalHoles: holesToPlay,
                      target: targetPaceForPlayed,
                    })}
              </Typography>
            </Box>

            <Chip
              label={
                !hasStartedRound
                  ? t('play.paceChipNotStarted', { target: roundTargetStrokes })
                  : isOnPace
                  ? t('play.paceUnder', {
                      diff: paceDiff === 0 ? 'Par' : `${paceDiff}`,
                      strokes: totalStrokes,
                      target: roundTargetStrokes,
                    })
                  : t('play.paceOver', {
                      diff: `+${paceDiff}`,
                      strokes: totalStrokes,
                      target: roundTargetStrokes,
                    })
              }
              sx={{
                fontWeight: 800,
                fontSize: '0.82rem',
                height: 30,
                px: 0.5,
                bgcolor: !hasStartedRound
                  ? 'action.hover'
                  : isOnPace
                  ? 'rgba(16, 185, 129, 0.14)'
                  : paceDiff <= 2
                  ? 'rgba(245, 158, 11, 0.14)'
                  : 'rgba(244, 63, 94, 0.14)',
                color: !hasStartedRound
                  ? 'text.secondary'
                  : isOnPace
                  ? '#10B981'
                  : paceDiff <= 2
                  ? '#F59E0B'
                  : '#F43F5E',
                border: `1px solid ${
                  !hasStartedRound
                    ? 'var(--mui-palette-divider)'
                    : isOnPace
                    ? '#10B98155'
                    : paceDiff <= 2
                    ? '#F59E0B55'
                    : '#F43F5E55'
                }`,
              }}
            />
          </Stack>

          <LinearProgress
            variant="determinate"
            value={Math.min(100, (playedHolesCount / holesToPlay) * 100)}
            sx={{
              mt: 1.25,
              height: 4,
              borderRadius: 1,
              bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': {
                bgcolor: !hasStartedRound
                  ? 'text.secondary'
                  : isOnPace
                  ? '#10B981'
                  : paceDiff <= 2
                  ? '#F59E0B'
                  : '#F43F5E',
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Main Split: Hole-by-Hole Stepper & Scorecard Strip */}
      <Grid container spacing={2.5}>
        {/* Hole-by-Hole Mobile Stepper + Optional GPS Tee Navigation */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
              {/* Hole Selector Pills 1..holesToPlay */}
              <Stack
                direction="row"
                spacing={0.6}
                sx={{
                  justifyContent: 'flex-start',
                  mb: 2.5,
                  overflowX: 'auto',
                  pb: 0.5,
                }}
              >
                {activeHolesSlice.map((h, idx) => {
                  const isCurrent = idx === activeHoleIndex;
                  return (
                    <Button
                      key={h.holeNumber}
                      variant={isCurrent ? 'contained' : 'outlined'}
                      color={isCurrent ? 'primary' : h.recorded ? 'primary' : 'inherit'}
                      onClick={() => setActiveHoleIndex(idx)}
                      sx={{
                        flex: 1,
                        minWidth: 38,
                        height: 38,
                        p: 0,
                        fontWeight: 700,
                        borderRadius: 1,
                        borderColor: h.recorded
                          ? 'primary.main'
                          : 'var(--mui-palette-divider)',
                        bgcolor:
                          !isCurrent && h.recorded
                            ? 'rgba(16, 185, 129, 0.08)'
                            : undefined,
                      }}
                    >
                      {h.holeNumber}
                    </Button>
                  );
                })}
              </Stack>

              {/* Current Hole Title, Järvenranta Par/Distance & Status Badge */}
              <Stack
                direction="row"
                sx={{
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 1.5,
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    {t('play.holeTitle', { number: activeHole.holeNumber })}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: 'primary.main', fontWeight: 700, display: 'block' }}
                  >
                    {t('play.holeParInfo', {
                      officialPar: courseHole?.officialPar || 4,
                      hcp: courseHole?.hcpIndex || 10,
                      distance: activeTeeSpot?.distanceMeters || 50,
                    })}
                  </Typography>
                  {courseHole && (
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', display: 'block', mt: 0.35 }}
                    >
                      {language === 'en'
                        ? courseHole.descriptionEn
                        : courseHole.descriptionFi}
                    </Typography>
                  )}
                </Box>

                {activeHole.recorded ? (
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Chip
                      size="small"
                      icon={<CheckCircleIcon sx={{ fontSize: '15px !important' }} />}
                      label={
                        activeHole.gir
                          ? t('play.girAchieved')
                          : t('play.girMissed', {
                              approach: activeHole.strokes - activeHole.putts,
                            })
                      }
                      color={activeHole.gir ? 'primary' : 'default'}
                      variant={activeHole.gir ? 'outlined' : 'filled'}
                    />
                    <Button
                      size="small"
                      color="inherit"
                      startIcon={<RestartAltIcon fontSize="small" />}
                      onClick={() => clearSingleHole(activeHoleIndex)}
                      sx={{ fontSize: '0.72rem', color: 'text.secondary' }}
                    >
                      {t('play.clearHoleBtn')}
                    </Button>
                  </Stack>
                ) : (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={t('play.holeNotPlayed')}
                    sx={{ color: 'text.secondary' }}
                  />
                )}
              </Stack>

              {/* Tee Spot Status Indicator right above Score Entry (Visual Hint or GPS Distance) */}
              <Box sx={{ mb: 2 }}>
                {teeMode === 'visual' ? (
                  <Box
                    sx={{
                      py: 1.15,
                      px: 1.5,
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                      border: '1px solid var(--mui-palette-divider)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <VisibilityIcon sx={{ fontSize: 17, color: 'text.secondary', flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      {t('play.gpsVisualHint', {
                        distance: activeTeeSpot?.distanceMeters || 50,
                      })}
                    </Typography>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      p: 1.75,
                      borderRadius: 1.25,
                      bgcolor:
                        distanceToTee !== null && distanceToTee <= 8
                          ? 'rgba(16, 185, 129, 0.1)'
                          : 'action.hover',
                      border:
                        distanceToTee !== null && distanceToTee <= 8
                          ? '1.5px solid #10B981'
                          : '1px solid var(--mui-palette-divider)',
                    }}
                  >
                    <Stack spacing={1.25}>
                      <Stack
                        direction="row"
                        spacing={1}
                        useFlexGap
                        sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}
                      >
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                          <MyLocationIcon color="primary" sx={{ fontSize: 18 }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {t(selectedDivisionObj.shortLabelKey)} ({activeTeeSpot?.distanceMeters} m)
                          </Typography>
                        </Stack>

                        {activeTeeSpot && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            startIcon={<MapIcon fontSize="small" />}
                            component="a"
                            href={`https://www.google.com/maps/search/?api=1&query=${activeTeeSpot.gps.lat},${activeTeeSpot.gps.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ fontSize: '0.74rem', py: 0.35, px: 1.1 }}
                          >
                            {t('play.gpsOpenMapsBtn')}
                          </Button>
                        )}
                      </Stack>

                      {userGpsPos && distanceToTee !== null && distanceToGreen !== null && (
                        <Grid container spacing={1}>
                          <Grid size={{ xs: 6 }}>
                            <Box
                              sx={{
                                p: 1,
                                borderRadius: 1,
                                bgcolor: 'background.paper',
                                border: '1px solid var(--mui-palette-divider)',
                              }}
                            >
                              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                {t('play.gpsDistanceToTee', {
                                  tee: `${activeTeeSpot?.distanceMeters}m`,
                                })}
                              </Typography>
                              <Typography
                                variant="h5"
                                sx={{
                                  fontWeight: 800,
                                  color: distanceToTee <= 8 ? 'primary.main' : '#F59E0B',
                                }}
                              >
                                {distanceToTee} m {distanceToTee > 8 ? bearingToTee : '✓'}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Box
                              sx={{
                                p: 1,
                                borderRadius: 1,
                                bgcolor: 'background.paper',
                                border: '1px solid var(--mui-palette-divider)',
                              }}
                            >
                              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                {t('play.gpsDistanceToGreen')}
                              </Typography>
                              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                                {distanceToGreen} m
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      )}

                      {distanceToTee !== null && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            color: distanceToTee <= 8 ? 'primary.main' : 'text.primary',
                          }}
                        >
                          {distanceToTee <= 8
                            ? `✓ ${t('play.gpsAtTeeSpot')}`
                            : t('play.gpsWalkTowardsTee', {
                                meters: distanceToTee,
                                dir: bearingToTee,
                              })}
                        </Typography>
                      )}

                      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button
                          size="small"
                          variant={gpsWatching ? 'contained' : 'outlined'}
                          color="primary"
                          startIcon={<MyLocationIcon />}
                          onClick={() => setGpsWatching((prev) => !prev)}
                        >
                          {gpsWatching
                            ? t('play.gpsStopTrackingBtn')
                            : t('play.gpsStartTrackingBtn')}
                        </Button>

                        {activeTeeSpot && (
                          <>
                            <Button
                              size="small"
                              variant="outlined"
                              color="inherit"
                              onClick={() => {
                                setGpsWatching(false);
                                setUserGpsPos({
                                  lat: activeTeeSpot.gps.lat + 0.00028,
                                  lng: activeTeeSpot.gps.lng - 0.00018,
                                });
                              }}
                              sx={{ fontSize: '0.72rem' }}
                            >
                              {t('play.gpsSimulateFairwayBtn')}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              onClick={() => {
                                setGpsWatching(false);
                                setUserGpsPos({
                                  lat: activeTeeSpot.gps.lat + 0.00001,
                                  lng: activeTeeSpot.gps.lng,
                                });
                              }}
                              sx={{ fontSize: '0.72rem' }}
                            >
                              {t('play.gpsSimulateOnTeeBtn')}
                            </Button>
                          </>
                        )}
                      </Stack>
                    </Stack>
                  </Box>
                )}
              </Box>

              {/* Crisp + / - Stepper Controls & 1-Tap Quick Score Buttons */}
              <Stack spacing={2}>
                {/* STROKES STEPPER */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1.25,
                    bgcolor: 'action.hover',
                    border: '1px solid var(--mui-palette-divider)',
                  }}
                >
                  <Stack
                    direction="row"
                    sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {t('play.strokesLabel')}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {t('play.targetParShort', {
                          officialPar: courseHole?.officialPar || 4,
                        })}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center' }}>
                      <IconButton
                        onClick={() =>
                          updateHoleValue(
                            activeHoleIndex,
                            activeHole.recorded ? activeHole.strokes - 1 : 3,
                            activeHole.recorded ? activeHole.putts : 1
                          )
                        }
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 1.25,
                          bgcolor: 'background.paper',
                          border: '1px solid var(--mui-palette-divider)',
                        }}
                      >
                        <RemoveIcon />
                      </IconButton>

                      <Typography
                        variant="h3"
                        sx={{
                          fontWeight: 800,
                          minWidth: 52,
                          textAlign: 'center',
                          color: !activeHole.recorded
                            ? 'text.secondary'
                            : activeHole.strokes <= 3
                            ? 'primary.main'
                            : activeHole.strokes === 4
                            ? 'text.primary'
                            : '#F59E0B',
                        }}
                      >
                        {activeHole.recorded ? activeHole.strokes : '—'}
                      </Typography>

                      <IconButton
                        onClick={() =>
                          updateHoleValue(
                            activeHoleIndex,
                            activeHole.recorded ? activeHole.strokes + 1 : 4,
                            activeHole.recorded ? activeHole.putts : 2
                          )
                        }
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 1.25,
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          '&:hover': { bgcolor: 'primary.dark' },
                        }}
                      >
                        <AddIcon />
                      </IconButton>
                    </Stack>
                  </Stack>

                  {/* 1-Tap Quick Score Buttons (2..7) */}
                  <Box
                    sx={{
                      mt: 1.75,
                      pt: 1.5,
                      borderTop: '1px solid var(--mui-palette-divider)',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontWeight: 600,
                        display: 'block',
                        mb: 0.75,
                      }}
                    >
                      {t('play.quickScoreLabel')}
                    </Typography>
                    <Stack direction="row" spacing={0.75}>
                      {[2, 3, 4, 5, 6, 7].map((scoreVal) => {
                        const isSelected =
                          activeHole.recorded && activeHole.strokes === scoreVal;
                        return (
                          <Button
                            key={scoreVal}
                            size="small"
                            variant={isSelected ? 'contained' : 'outlined'}
                            color={isSelected ? 'primary' : 'inherit'}
                            onClick={() =>
                              updateHoleValue(
                                activeHoleIndex,
                                scoreVal,
                                activeHole.recorded
                                  ? Math.min(activeHole.putts, scoreVal)
                                  : Math.min(2, scoreVal - 1)
                              )
                            }
                            sx={{
                              flex: 1,
                              minWidth: 0,
                              py: 0.6,
                              fontWeight: 700,
                              borderColor: 'var(--mui-palette-divider)',
                            }}
                          >
                            {scoreVal}
                          </Button>
                        );
                      })}
                    </Stack>
                  </Box>
                </Box>

                {/* PUTTS STEPPER */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1.25,
                    bgcolor: 'action.hover',
                    border: '1px solid var(--mui-palette-divider)',
                  }}
                >
                  <Stack
                    direction="row"
                    sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {t('play.puttsLabel')}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {t('play.girFormulaHint', {
                          maxApproach: Math.max(1, (courseHole?.officialPar || 4) - 2),
                        })}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center' }}>
                      <IconButton
                        onClick={() =>
                          updateHoleValue(
                            activeHoleIndex,
                            activeHole.recorded ? activeHole.strokes : 4,
                            activeHole.recorded ? activeHole.putts - 1 : 1
                          )
                        }
                        sx={{
                          width: 46,
                          height: 46,
                          borderRadius: 1.25,
                          bgcolor: 'background.paper',
                          border: '1px solid var(--mui-palette-divider)',
                        }}
                      >
                        <RemoveIcon fontSize="small" />
                      </IconButton>

                      <Typography
                        variant="h4"
                        sx={{
                          fontWeight: 800,
                          minWidth: 48,
                          textAlign: 'center',
                          color: activeHole.recorded ? 'text.primary' : 'text.secondary',
                        }}
                      >
                        {activeHole.recorded ? activeHole.putts : '—'}
                      </Typography>

                      <IconButton
                        onClick={() =>
                          updateHoleValue(
                            activeHoleIndex,
                            activeHole.recorded ? activeHole.strokes : 4,
                            activeHole.recorded ? activeHole.putts + 1 : 2
                          )
                        }
                        sx={{
                          width: 46,
                          height: 46,
                          borderRadius: 1.25,
                          bgcolor: 'background.paper',
                          border: '1px solid var(--mui-palette-divider)',
                        }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Box>

                {/* Prev / Next Hole Navigation (or Submit Round on Last Hole) */}
                <Stack direction="row" spacing={1.5}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="inherit"
                    disabled={activeHoleIndex === 0}
                    startIcon={<ArrowBackIcon />}
                    onClick={() => setActiveHoleIndex((i) => Math.max(0, i - 1))}
                    sx={{ borderColor: 'var(--mui-palette-divider)' }}
                  >
                    {t('play.prevHole')}
                  </Button>
                  {activeHoleIndex >= holesToPlay - 1 ? (
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      disabled={!isRoundComplete}
                      startIcon={<EmojiEventsIcon />}
                      onClick={() => void handleSubmitRound()}
                      sx={{ fontWeight: 700 }}
                    >
                      {isRoundComplete
                        ? `${t('play.submitRoundBtn', { totalHoles: holesToPlay })} (${totalStrokes} / ${roundTargetStrokes})`
                        : `${t('play.submitRoundBtn', { totalHoles: holesToPlay })} (${playedHolesCount} / ${holesToPlay})`}
                    </Button>
                  ) : (
                    <Button
                      fullWidth
                      variant="contained"
                      endIcon={<ArrowForwardIcon />}
                      onClick={() =>
                        setActiveHoleIndex((i) => Math.min(holesToPlay - 1, i + 1))
                      }
                    >
                      {t('play.nextHole')}
                    </Button>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Scorecard Overview & Submit */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
              <Stack
                direction="row"
                sx={{
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1.5,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {t('play.scorecardSummaryTitle', { totalHoles: holesToPlay })}
                </Typography>

                <Chip
                  size="small"
                  variant="outlined"
                  label={`${playedHolesCount} / ${holesToPlay}`}
                  color={isRoundComplete ? 'primary' : 'default'}
                  sx={{ fontWeight: 700 }}
                />
              </Stack>

              <TableContainer sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('play.holeHeader')}</TableCell>
                      <TableCell align="center">Par</TableCell>
                      <TableCell align="center">{t('play.strokesHeader')}</TableCell>
                      <TableCell align="center">{t('play.puttsHeader')}</TableCell>
                      <TableCell align="center">{t('play.girHeader')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activeHolesSlice.map((h, idx) => {
                      const ch = courseConfig.holes.find(
                        (c) => c.holeNumber === h.holeNumber
                      );
                      const holePar = ch?.officialPar || 4;
                      return (
                        <TableRow
                          key={h.holeNumber}
                          hover
                          selected={idx === activeHoleIndex}
                          onClick={() => setActiveHoleIndex(idx)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell sx={{ fontWeight: 700 }}>#{h.holeNumber}</TableCell>
                          <TableCell align="center" sx={{ color: 'text.secondary' }}>
                            {holePar}
                          </TableCell>
                          <TableCell align="center">
                            {h.recorded ? (
                              <Box
                                component="span"
                                sx={{
                                  display: 'inline-block',
                                  minWidth: 28,
                                  py: 0.2,
                                  px: 0.75,
                                  borderRadius: 0.75,
                                  fontWeight: 700,
                                  fontSize: '0.82rem',
                                  bgcolor:
                                    h.strokes < holePar
                                      ? 'rgba(16, 185, 129, 0.16)'
                                      : 'transparent',
                                  color:
                                    h.strokes < holePar
                                      ? 'primary.main'
                                      : h.strokes === holePar
                                      ? 'text.primary'
                                      : '#F59E0B',
                                  border: '1px solid var(--mui-palette-divider)',
                                }}
                              >
                                {h.strokes}
                              </Box>
                            ) : (
                              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                —
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{ color: h.recorded ? 'text.primary' : 'text.secondary' }}
                          >
                            {h.recorded ? h.putts : '—'}
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              color: !h.recorded
                                ? 'text.secondary'
                                : h.gir
                                ? 'primary.main'
                                : 'text.secondary',
                              fontWeight: 700,
                            }}
                          >
                            {!h.recorded ? '—' : h.gir ? '✓' : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 800 }}>{t('play.totalRowLabel')}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>
                        {roundTargetStrokes}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800, fontSize: '1.05rem' }}>
                        {hasStartedRound ? totalStrokes : '—'}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>
                        {hasStartedRound ? totalPutts : '—'}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>
                        {hasStartedRound ? `${totalGir}/${playedHolesCount}` : '—'}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Outcome Banner ONLY when all selected holes are recorded */}
              {isRoundComplete ? (
                <Box
                  sx={{
                    p: 1.75,
                    mb: 2,
                    borderRadius: 1.25,
                    bgcolor: isTotalUnderTarget
                      ? 'rgba(16, 185, 129, 0.08)'
                      : 'rgba(245, 158, 11, 0.08)',
                    borderLeft: isTotalUnderTarget
                      ? '3px solid #10B981'
                      : '3px solid #F59E0B',
                    border: '1px solid var(--mui-palette-divider)',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      color: isTotalUnderTarget ? 'primary.main' : '#F59E0B',
                    }}
                  >
                    {isTotalUnderTarget
                      ? t('play.targetReachedBanner', {
                          score: totalStrokes,
                          target: roundTargetStrokes,
                          totalHoles: holesToPlay,
                        })
                      : t('play.targetCloseBanner', {
                          score: totalStrokes,
                          diff: totalStrokes - roundTargetStrokes,
                          target: roundTargetStrokes,
                        })}
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    p: 1.5,
                    mb: 2,
                    borderRadius: 1.25,
                    bgcolor: 'action.hover',
                    border: '1px solid var(--mui-palette-divider)',
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {t('play.incompleteRoundHint', {
                      played: playedHolesCount,
                      totalHoles: holesToPlay,
                    })}
                  </Typography>
                </Box>
              )}

              <Stack spacing={1.25}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  color="primary"
                  disabled={!isRoundComplete}
                  startIcon={<EmojiEventsIcon />}
                  onClick={() => void handleSubmitRound()}
                  sx={{
                    py: 1.5,
                    fontSize: '0.98rem',
                    fontWeight: 700,
                  }}
                >
                  {isRoundComplete
                    ? `${t('play.submitRoundBtn', { totalHoles: holesToPlay })} (${totalStrokes} / ${roundTargetStrokes})`
                    : `${t('play.submitRoundBtn', { totalHoles: holesToPlay })} (${playedHolesCount} / ${holesToPlay})`}
                </Button>

                {/* If player started e.g. 9 holes, played at least 3 holes, and wants to end the round early */}
                {!isRoundComplete && playedHolesCount >= 3 && (
                  <Button
                    variant="outlined"
                    color="primary"
                    fullWidth
                    onClick={() => setHolesToPlay(playedHolesCount)}
                  >
                    {t('play.finishPartialRoundBtn', { played: playedHolesCount })}
                  </Button>
                )}

                {hasStartedRound && (
                  <Button
                    variant="outlined"
                    color="error"
                    fullWidth
                    startIcon={<DeleteOutlineIcon />}
                    onClick={() => setDiscardDialogOpen(true)}
                  >
                    {t('play.discardRoundBtn')}
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Confirm Discard Started Round Dialog */}
      <Dialog
        open={discardDialogOpen}
        onClose={() => setDiscardDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {t('play.discardRoundConfirmTitle')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('play.discardRoundConfirmDesc', {
              count: playedHolesCount,
              totalHoles: holesToPlay,
            })}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setDiscardDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={handleDiscardRound}
          >
            {t('play.discardRoundBtn')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={discardToastOpen}
        autoHideDuration={3500}
        onClose={() => setDiscardToastOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setDiscardToastOpen(false)}
          severity="info"
          variant="filled"
          sx={{ fontWeight: 600 }}
        >
          {t('play.roundDiscardedToast')}
        </Alert>
      </Snackbar>
    </Stack>
  );
};
