import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Tabs,
  Tab,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Checkbox,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  AdminPanelSettings as AdminPanelSettingsIcon,
  GroupAdd as GroupAddIcon,
  PersonAdd as PersonAddIcon,
  People as PeopleIcon,
  EventRepeat as EventRepeatIcon,
  DeleteOutlined as DeleteOutlineIcon,
  Edit as EditIcon,
  LockPerson as LockPersonIcon,
  Close as CloseIcon,
  GolfCourse as GolfCourseIcon,
  MyLocation as MyLocationIcon,
  Restore as RestoreIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import {
  DIVISIONS,
  getDivisionByLevel,
  type CourseConfig,
  type TrainingGroup,
  type TrainingSession,
  type UserRole,
} from '../types/models';
import { SEED_COURSE_CONFIG } from '../data/seedData';
import { formatLocalizedDate } from '../i18n/config';

const GROUP_COLOR_SWATCHES = [
  '#38BDF8',
  '#10B981',
  '#F97316',
  '#818CF8',
  '#F43F5E',
  '#EAB308',
];

function addWeeksToIsoDate(isoDate: string, weeksToAdd: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + weeksToAdd * 7);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const AdminPortalView: React.FC = () => {
  const { t } = useTranslation();
  const {
    currentUser,
    groups,
    users,
    sessions,
    language,
    switchActiveUser,
    saveGroup,
    deleteGroup,
    createUser,
    updateUser,
    deleteUser,
    toggleUserGroupMembership,
    createSessionsBatch,
    deleteSession,
    courseConfig,
    saveCourseConfig,
    resetSeasonXpAndAttendance,
  } = useApp();

  const [activeTab, setActiveTab] = useState<number>(0);
  const [seasonResetConfirmOpen, setSeasonResetConfirmOpen] = useState<boolean>(false);
  const [rosterSort, setRosterSort] = useState<
    'name_asc' | 'name_desc' | 'newest' | 'oldest'
  >('name_asc');

  // Course & GPS Editor State
  const [draftCourse, setDraftCourse] = useState<CourseConfig>(courseConfig);
  const [selectedCourseHole, setSelectedCourseHole] = useState<number>(1);
  const [courseSavedNotice, setCourseSavedNotice] = useState<boolean>(false);

  React.useEffect(() => {
    setDraftCourse(courseConfig);
  }, [courseConfig]);

  // Group Form State
  const [editingGroupId, setEditingGroupId] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');
  const [groupDesc, setGroupDesc] = useState<string>('');
  const [groupColor, setGroupColor] = useState<string>('#10B981');
  const [groupCoachIds, setGroupCoachIds] = useState<string[]>(['coach-joonas']);

  // Group Member Assignment Dialog State
  const [managingGroupId, setManagingGroupId] = useState<string | null>(null);

  // Add New User Dialog State
  const [addUserOpen, setAddUserOpen] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('player');
  const [newUserDivision, setNewUserDivision] = useState<number>(1);
  const [newUserGroupIds, setNewUserGroupIds] = useState<string[]>(
    groups[0] ? [groups[0].id] : []
  );

  // Schedule Builder Form State
  const todayIso = new Date().toISOString().slice(0, 10);
  const [sessionGroupId, setSessionGroupId] = useState<string>(
    groups[0]?.id || 'grp-haastajat'
  );
  const [sessionTitle, setSessionTitle] = useState<string>(
    'Lähipeli & 35-tavoitekierros'
  );
  const [sessionType, setSessionType] = useState<'training' | 'level_test_event'>(
    'training'
  );
  const [sessionDate, setSessionDate] = useState<string>(todayIso);
  const [startTime, setStartTime] = useState<string>('17:00');
  const [endTime, setEndTime] = useState<string>('18:15');
  const [location, setLocation] = useState<string>('Lähipelialue & Ysi-kenttä');
  const [coachId, setCoachId] = useState<string>('coach-joonas');
  const [repeatWeekly, setRepeatWeekly] = useState<boolean>(true);
  const [repeatWeeksCount, setRepeatWeeksCount] = useState<number>(4);

  const coaches = users.filter((u) => u.role === 'coach' || u.role === 'admin');
  const adminUser = users.find((u) => u.role === 'admin');
  const managingGroup = groups.find((g) => g.id === managingGroupId) || null;

  const sortedUsers = React.useMemo(() => {
    const copy = [...users];
    if (rosterSort === 'name_asc') {
      return copy.sort((a, b) => a.name.localeCompare(b.name, 'fi'));
    }
    if (rosterSort === 'name_desc') {
      return copy.sort((a, b) => b.name.localeCompare(a.name, 'fi'));
    }
    if (rosterSort === 'newest') {
      return copy.sort((a, b) =>
        (b.createdAt || '').localeCompare(a.createdAt || '')
      );
    }
    return copy.sort((a, b) =>
      (a.createdAt || '').localeCompare(b.createdAt || '')
    );
  }, [users, rosterSort]);

  if (currentUser.role !== 'admin') {
    return (
      <Card sx={{ maxWidth: 620, mx: 'auto', mt: 4, textAlign: 'center', p: 2.5 }}>
        <CardContent>
          <LockPersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1.5 }} />
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
            {t('admin.restrictedTitle')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            {t('admin.restrictedDesc', { role: currentUser.role.toUpperCase() })}
          </Typography>
          {adminUser && (
            <Button
              variant="contained"
              size="large"
              startIcon={<AdminPanelSettingsIcon />}
              onClick={() => switchActiveUser(adminUser.id)}
            >
              {t('admin.switchToAdminBtn')} ({adminUser.name})
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const handleEditGroup = (g: TrainingGroup) => {
    setEditingGroupId(g.id);
    setGroupName(g.name);
    setGroupDesc(g.description);
    setGroupColor(g.colorTag);
    setGroupCoachIds(g.coachIds);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    const payload: TrainingGroup = {
      id: editingGroupId || `grp-${Date.now()}`,
      name: groupName.trim(),
      description: groupDesc.trim(),
      colorTag: groupColor,
      coachIds: groupCoachIds,
    };

    await saveGroup(payload);
    setEditingGroupId('');
    setGroupName('');
    setGroupDesc('');
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    await createUser({
      name: newUserName.trim(),
      email: newUserEmail.trim() || undefined,
      role: newUserRole,
      currentDivision: newUserDivision,
      groupIds: newUserGroupIds,
    });

    setNewUserName('');
    setNewUserEmail('');
    setNewUserRole('player');
    setNewUserDivision(1);
    setAddUserOpen(false);
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionTitle.trim()) return;

    const count = repeatWeekly ? Math.max(1, Math.min(20, repeatWeeksCount)) : 1;
    const batchToCreate: TrainingSession[] = [];

    for (let w = 0; w < count; w++) {
      batchToCreate.push({
        id: `sess-${Date.now()}-${w}`,
        groupId: sessionGroupId,
        title:
          count > 1
            ? `${sessionTitle.trim()} (${t('admin.weekSuffix', { week: w + 1 })})`
            : sessionTitle.trim(),
        sessionType,
        date: addWeeksToIsoDate(sessionDate, w),
        startTime,
        endTime,
        location: location.trim(),
        coachId,
        rsvpPlayerIds: [],
        attendedPlayerIds: [],
      });
    }

    await createSessionsBatch(batchToCreate);
  };

  return (
    <Stack spacing={2.5}>
      {/* Admin Header & Tabs */}
      <Card>
        <CardContent sx={{ p: { xs: 2.25, md: 2.75 }, pb: '0 !important' }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              mb: 1,
            }}
          >
            <Box>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', mb: 0.25 }}
              >
                <AdminPanelSettingsIcon color="primary" fontSize="small" />
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {t('admin.title')}
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('admin.subtitle')}
              </Typography>
            </Box>

            <Button
              variant="contained"
              color="primary"
              startIcon={<PersonAddIcon />}
              onClick={() => setAddUserOpen(true)}
            >
              {t('admin.addUserBtn')}
            </Button>
          </Stack>

          <Tabs
            value={activeTab}
            onChange={(_e, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label={t('admin.tabGroups')} sx={{ fontWeight: 700 }} />
            <Tab label={t('admin.tabSchedule')} sx={{ fontWeight: 700 }} />
            <Tab label={t('admin.tabCourse')} sx={{ fontWeight: 700 }} />
          </Tabs>
        </CardContent>
      </Card>

      {/* TAB 0: Group & Roster Manager */}
      {activeTab === 0 && (
        <Grid container spacing={2.5}>
          {/* Create / Edit Group Form + Group List */}
          <Grid size={{ xs: 12, lg: 5 }}>
            <Card>
              <CardContent sx={{ p: 2.75 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', mb: 2 }}
                >
                  <GroupAddIcon color="primary" fontSize="small" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {t('admin.createGroupTitle')}
                  </Typography>
                </Stack>

                <Box component="form" onSubmit={handleSaveGroup}>
                  <Stack spacing={2}>
                    <TextField
                      label={t('admin.groupName')}
                      placeholder={t('admin.groupNamePlaceholder')}
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      required
                      fullWidth
                      size="small"
                    />
                    <TextField
                      label={t('admin.groupDesc')}
                      placeholder={t('admin.groupDescPlaceholder')}
                      value={groupDesc}
                      onChange={(e) => setGroupDesc(e.target.value)}
                      multiline
                      rows={2}
                      fullWidth
                      size="small"
                    />

                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          display: 'block',
                          mb: 0.75,
                          color: 'text.secondary',
                        }}
                      >
                        {t('admin.groupColor')}
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        {GROUP_COLOR_SWATCHES.map((hex) => (
                          <Box
                            key={hex}
                            onClick={() => setGroupColor(hex)}
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: 1,
                              bgcolor: hex,
                              cursor: 'pointer',
                              border:
                                groupColor === hex
                                  ? '2px solid #FFFFFF'
                                  : '1px solid transparent',
                            }}
                          />
                        ))}
                      </Stack>
                    </Box>

                    <FormControl fullWidth size="small">
                      <InputLabel>{t('admin.assignCoaches')}</InputLabel>
                      <Select
                        multiple
                        label={t('admin.assignCoaches')}
                        value={groupCoachIds}
                        onChange={(e) =>
                          setGroupCoachIds(
                            typeof e.target.value === 'string'
                              ? e.target.value.split(',')
                              : e.target.value
                          )
                        }
                      >
                        {coaches.map((c) => (
                          <MenuItem key={c.id} value={c.id}>
                            {c.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Stack direction="row" spacing={1}>
                      <Button type="submit" variant="contained" fullWidth>
                        {t('admin.saveGroupBtn')}
                      </Button>
                      {editingGroupId && (
                        <Button
                          variant="outlined"
                          color="inherit"
                          onClick={() => {
                            setEditingGroupId('');
                            setGroupName('');
                            setGroupDesc('');
                          }}
                        >
                          {t('admin.cancelEditBtn')}
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </Box>

                {/* Existing Training Groups List */}
                <Stack spacing={1.25} sx={{ mt: 2.5 }}>
                  {groups.map((g) => {
                    const groupPlayerCount = users.filter(
                      (u) => u.role === 'player' && u.groupIds.includes(g.id)
                    ).length;

                    return (
                      <Box
                        key={g.id}
                        sx={{
                          p: 1.5,
                          borderRadius: 1,
                          bgcolor: 'action.hover',
                          border: '1px solid var(--mui-palette-divider)',
                          borderLeft: `3px solid ${g.colorTag}`,
                        }}
                      >
                        <Stack
                          direction="row"
                          sx={{
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                          }}
                        >
                          <Box sx={{ pr: 1 }}>
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ alignItems: 'center', mb: 0.25 }}
                            >
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {g.name}
                              </Typography>
                              <Chip
                                size="small"
                                label={t('admin.groupMembersCount', {
                                  count: groupPlayerCount,
                                })}
                                sx={{
                                  height: 20,
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  bgcolor: `${g.colorTag}20`,
                                  color: g.colorTag,
                                }}
                              />
                            </Stack>
                            <Typography
                              variant="caption"
                              sx={{ color: 'text.secondary', display: 'block' }}
                            >
                              {g.description}
                            </Typography>
                          </Box>

                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title={t('admin.manageGroupMembersBtn')}>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => setManagingGroupId(g.id)}
                              >
                                <PeopleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleEditGroup(g)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => deleteGroup(g.id)}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </Stack>

                        <Button
                          size="small"
                          variant="text"
                          startIcon={<PeopleIcon sx={{ fontSize: 15 }} />}
                          onClick={() => setManagingGroupId(g.id)}
                          sx={{ mt: 0.75, fontSize: '0.75rem', px: 0.75, py: 0.25 }}
                        >
                          {t('admin.manageGroupMembersBtn')}
                        </Button>
                      </Box>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Roster & User Role / Group Assignment / Add & Delete Table */}
          <Grid size={{ xs: 12, lg: 7 }}>
            <Card>
              <CardContent sx={{ p: 2.75 }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  sx={{
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {t('admin.rosterTitle')} ({users.length})
                  </Typography>

                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                  >
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>{t('admin.rosterSortLabel')}</InputLabel>
                      <Select
                        label={t('admin.rosterSortLabel')}
                        value={rosterSort}
                        onChange={(e) =>
                          setRosterSort(
                            e.target.value as
                              | 'name_asc'
                              | 'name_desc'
                              | 'newest'
                              | 'oldest'
                          )
                        }
                        sx={{ fontSize: '0.82rem' }}
                      >
                        <MenuItem value="name_asc">
                          {t('admin.rosterSortNameAsc')}
                        </MenuItem>
                        <MenuItem value="name_desc">
                          {t('admin.rosterSortNameDesc')}
                        </MenuItem>
                        <MenuItem value="newest">
                          {t('admin.rosterSortNewest')}
                        </MenuItem>
                        <MenuItem value="oldest">
                          {t('admin.rosterSortOldest')}
                        </MenuItem>
                      </Select>
                    </FormControl>

                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PersonAddIcon />}
                      onClick={() => setAddUserOpen(true)}
                    >
                      {t('admin.addUserBtn')}
                    </Button>
                  </Stack>
                </Stack>

                {/* Mobile Responsive Cards View (xs / sm) */}
                <Stack
                  spacing={1.25}
                  sx={{ display: { xs: 'flex', md: 'none' } }}
                >
                  {sortedUsers.map((u) => {
                    const isSelf = u.id === currentUser.id;
                    const div = getDivisionByLevel(u.currentDivision);
                    return (
                      <Box
                        key={u.id}
                        sx={{
                          p: 1.75,
                          borderRadius: 1.25,
                          bgcolor: 'action.hover',
                          border: '1px solid var(--mui-palette-divider)',
                          borderLeft: `3px solid ${div.badgeColor}`,
                        }}
                      >
                        <Stack
                          direction="row"
                          sx={{
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            mb: 1.5,
                          }}
                        >
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {u.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: 'text.secondary', display: 'block' }}
                            >
                              {u.email}
                            </Typography>
                          </Box>

                          <Tooltip
                            title={
                              isSelf
                                ? t('admin.cannotDeleteSelf')
                                : t('admin.deleteUserTooltip')
                            }
                          >
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={isSelf}
                                onClick={() => void deleteUser(u.id)}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>

                        <Grid container spacing={1.25} sx={{ mb: 1.5 }}>
                          <Grid size={{ xs: 6 }}>
                            <FormControl fullWidth size="small">
                              <InputLabel>{t('admin.table.role')}</InputLabel>
                              <Select
                                label={t('admin.table.role')}
                                value={u.role}
                                onChange={(e) =>
                                  updateUser({
                                    ...u,
                                    role: e.target.value as UserRole,
                                  })
                                }
                                sx={{ fontSize: '0.82rem' }}
                              >
                                <MenuItem value="player">{t('roles.player')}</MenuItem>
                                <MenuItem value="coach">{t('roles.coach')}</MenuItem>
                                <MenuItem value="admin">{t('roles.admin')}</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>

                          <Grid size={{ xs: 6 }}>
                            <FormControl fullWidth size="small">
                              <InputLabel>{t('admin.table.division')}</InputLabel>
                              <Select
                                label={t('admin.table.division')}
                                value={u.currentDivision}
                                onChange={(e) =>
                                  updateUser({
                                    ...u,
                                    currentDivision: Number(e.target.value),
                                  })
                                }
                                sx={{ fontSize: '0.82rem' }}
                              >
                                {DIVISIONS.map((d) => (
                                  <MenuItem key={d.level} value={d.level}>
                                    {d.level}: {t(d.shortLabelKey)}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                        </Grid>

                        <Box>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                              fontWeight: 600,
                              display: 'block',
                              mb: 0.6,
                            }}
                          >
                            {t('admin.table.groups')}
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={0.75}
                            useFlexGap
                            sx={{ flexWrap: 'wrap' }}
                          >
                            {groups.map((grp) => {
                              const assigned = u.groupIds.includes(grp.id);
                              return (
                                <Chip
                                  key={grp.id}
                                  size="small"
                                  label={grp.name.split(' ')[0]}
                                  onClick={() =>
                                    void toggleUserGroupMembership(u.id, grp.id)
                                  }
                                  sx={{
                                    cursor: 'pointer',
                                    height: 26,
                                    fontSize: '0.74rem',
                                    fontWeight: assigned ? 700 : 500,
                                    bgcolor: assigned
                                      ? `${grp.colorTag}20`
                                      : 'transparent',
                                    color: assigned ? grp.colorTag : 'text.secondary',
                                    border: assigned
                                      ? `1px solid ${grp.colorTag}`
                                      : '1px solid var(--mui-palette-divider)',
                                  }}
                                />
                              );
                            })}
                          </Stack>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>

                {/* Desktop Table View (md+) */}
                <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('admin.table.name')}</TableCell>
                        <TableCell>{t('admin.table.role')}</TableCell>
                        <TableCell>{t('admin.table.division')}</TableCell>
                        <TableCell>{t('admin.table.groups')}</TableCell>
                        <TableCell align="right">{t('admin.table.actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedUsers.map((u) => {
                        const isSelf = u.id === currentUser.id;
                        return (
                          <TableRow key={u.id} hover>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {u.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary', fontSize: '0.7rem' }}
                              >
                                {u.email}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Select
                                size="small"
                                value={u.role}
                                onChange={(e) =>
                                  updateUser({
                                    ...u,
                                    role: e.target.value as UserRole,
                                  })
                                }
                                sx={{ fontSize: '0.8rem', height: 30 }}
                              >
                                <MenuItem value="player">{t('roles.player')}</MenuItem>
                                <MenuItem value="coach">{t('roles.coach')}</MenuItem>
                                <MenuItem value="admin">{t('roles.admin')}</MenuItem>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                size="small"
                                value={u.currentDivision}
                                onChange={(e) =>
                                  updateUser({
                                    ...u,
                                    currentDivision: Number(e.target.value),
                                  })
                                }
                                sx={{ fontSize: '0.8rem', height: 30 }}
                              >
                                {DIVISIONS.map((d) => (
                                  <MenuItem key={d.level} value={d.level}>
                                    {d.level}: {t(d.shortLabelKey)}
                                  </MenuItem>
                                ))}
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Stack
                                direction="row"
                                spacing={0.5}
                                useFlexGap
                                sx={{ flexWrap: 'wrap' }}
                              >
                                {groups.map((grp) => {
                                  const assigned = u.groupIds.includes(grp.id);
                                  return (
                                    <Chip
                                      key={grp.id}
                                      size="small"
                                      label={grp.name.split(' ')[0]}
                                      onClick={() =>
                                        void toggleUserGroupMembership(u.id, grp.id)
                                      }
                                      sx={{
                                        cursor: 'pointer',
                                        height: 22,
                                        fontSize: '0.7rem',
                                        fontWeight: assigned ? 700 : 500,
                                        bgcolor: assigned
                                          ? `${grp.colorTag}20`
                                          : 'transparent',
                                        color: assigned ? grp.colorTag : 'text.secondary',
                                        border: assigned
                                          ? `1px solid ${grp.colorTag}`
                                          : '1px solid var(--mui-palette-divider)',
                                      }}
                                    />
                                  );
                                })}
                              </Stack>
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip
                                title={
                                  isSelf
                                    ? t('admin.cannotDeleteSelf')
                                    : t('admin.deleteUserTooltip')
                                }
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    disabled={isSelf}
                                    onClick={() => void deleteUser(u.id)}
                                  >
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
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
        </Grid>
      )}

      {/* TAB 1: Season Schedule Builder with "Repeat Weekly" Batch Write */}
      {activeTab === 1 && (
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card>
              <CardContent sx={{ p: 2.75 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', mb: 2 }}
                >
                  <EventRepeatIcon color="primary" fontSize="small" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {t('admin.scheduleBuilderTitle')}
                  </Typography>
                </Stack>

                <Box component="form" onSubmit={handleCreateSchedule}>
                  <Stack spacing={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>{t('admin.sessionGroup')}</InputLabel>
                      <Select
                        label={t('admin.sessionGroup')}
                        value={sessionGroupId}
                        onChange={(e) => setSessionGroupId(e.target.value)}
                      >
                        {groups.map((g) => (
                          <MenuItem key={g.id} value={g.id}>
                            {g.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField
                      label={t('admin.sessionTitle')}
                      value={sessionTitle}
                      onChange={(e) => setSessionTitle(e.target.value)}
                      required
                      fullWidth
                      size="small"
                    />

                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          color: 'text.secondary',
                          display: 'block',
                          mb: 0.6,
                        }}
                      >
                        {t('admin.sessionType')}
                      </Typography>
                      <ToggleButtonGroup
                        fullWidth
                        size="small"
                        exclusive
                        color="primary"
                        value={sessionType}
                        onChange={(_e, val) => {
                          if (val !== null) {
                            setSessionType(val as 'training' | 'level_test_event');
                          }
                        }}
                      >
                        <ToggleButton
                          value="training"
                          sx={{ flex: 1, fontWeight: 700, borderRadius: 1 }}
                        >
                          {t('calendar.sessionTypeTraining')}
                        </ToggleButton>
                        <ToggleButton
                          value="level_test_event"
                          sx={{ flex: 1, fontWeight: 700, borderRadius: 1 }}
                        >
                          {t('calendar.sessionTypeEvent')}
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>

                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          type="date"
                          label={t('admin.sessionDate')}
                          value={sessionDate}
                          onChange={(e) => setSessionDate(e.target.value)}
                          fullWidth
                          size="small"
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 4 }}>
                        <TextField
                          type="time"
                          label={t('admin.startTime')}
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          fullWidth
                          size="small"
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 4 }}>
                        <TextField
                          type="time"
                          label={t('admin.endTime')}
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          fullWidth
                          size="small"
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                      </Grid>
                    </Grid>

                    <TextField
                      label={t('admin.location')}
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      fullWidth
                      size="small"
                    />

                    <FormControl fullWidth size="small">
                      <InputLabel>{t('admin.assignedCoach')}</InputLabel>
                      <Select
                        label={t('admin.assignedCoach')}
                        value={coachId}
                        onChange={(e) => setCoachId(e.target.value)}
                      >
                        {coaches.map((c) => (
                          <MenuItem key={c.id} value={c.id}>
                            {c.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Repeat Weekly (Monista viikoittain) Option */}
                    <Box
                      sx={{
                        p: 1.75,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                        border: '1px solid var(--mui-palette-divider)',
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Switch
                            checked={repeatWeekly}
                            onChange={(e) => setRepeatWeekly(e.target.checked)}
                            color="primary"
                            size="small"
                          />
                        }
                        label={
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {t('admin.repeatWeeklyLabel')}
                          </Typography>
                        }
                      />

                      {repeatWeekly && (
                        <TextField
                          type="number"
                          label={t('admin.repeatWeeksCount')}
                          value={repeatWeeksCount}
                          onChange={(e) =>
                            setRepeatWeeksCount(
                              Math.max(1, Math.min(20, Number(e.target.value) || 1))
                            )
                          }
                          fullWidth
                          size="small"
                          sx={{ mt: 1.25 }}
                        />
                      )}
                    </Box>

                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      startIcon={<EventRepeatIcon />}
                    >
                      {t('admin.createSessionsBtn', {
                        count: repeatWeekly ? repeatWeeksCount : 1,
                      })}
                    </Button>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Scheduled Sessions List */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Card>
              <CardContent sx={{ p: 2.75 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  ({sessions.length}) {t('calendar.title')}
                </Typography>

                <Stack spacing={1} sx={{ maxHeight: 540, overflowY: 'auto', pr: 0.5 }}>
                  {sessions.map((s) => {
                    const grp = groups.find((g) => g.id === s.groupId);
                    return (
                      <Box
                        key={s.id}
                        sx={{
                          p: 1.25,
                          borderRadius: 1,
                          bgcolor: 'action.hover',
                          border: '1px solid var(--mui-palette-divider)',
                          borderLeft: `3px solid ${grp?.colorTag || '#10B981'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            {grp && (
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: 700,
                                  color: grp.colorTag,
                                  textTransform: 'uppercase',
                                }}
                              >
                                {grp.name}
                              </Typography>
                            )}
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              • {formatLocalizedDate(s.date, language)} {s.startTime}–
                              {s.endTime}
                            </Typography>
                          </Stack>
                          <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.25 }}>
                            {s.title}
                          </Typography>
                        </Box>

                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deleteSession(s.id)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* TAB 2: Course & GPS Tee Spot Configuration (Lakeside Golf Vammala – Järvenranta Etuysi) */}
      {activeTab === 2 && (() => {
        const activeHoleObj =
          draftCourse.holes.find((h) => h.holeNumber === selectedCourseHole) ||
          draftCourse.holes[0];

        const updateHoleField = (
          holeNum: number,
          updater: (
            hole: CourseConfig['holes'][number]
          ) => CourseConfig['holes'][number]
        ) => {
          setDraftCourse((prev) => ({
            ...prev,
            holes: prev.holes.map((h) =>
              h.holeNumber === holeNum ? updater(h) : h
            ),
          }));
          setCourseSavedNotice(false);
        };

        const handleCaptureCurrentGpsForTee = (
          holeNum: number,
          divLevel: number
        ) => {
          if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const lat = Number(pos.coords.latitude.toFixed(6));
              const lng = Number(pos.coords.longitude.toFixed(6));
              updateHoleField(holeNum, (h) => ({
                ...h,
                teeSpots: h.teeSpots.map((ts) =>
                  ts.divisionLevel === divLevel
                    ? { ...ts, gps: { lat, lng } }
                    : ts
                ),
              }));
            },
            () => {
              // ignore geolocation permission denial silently
            },
            { enableHighAccuracy: true, timeout: 8000 }
          );
        };

        const handleCaptureCurrentGpsForGreen = (holeNum: number) => {
          if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const lat = Number(pos.coords.latitude.toFixed(6));
              const lng = Number(pos.coords.longitude.toFixed(6));
              updateHoleField(holeNum, (h) => ({
                ...h,
                greenGps: { lat, lng },
              }));
            },
            () => {},
            { enableHighAccuracy: true, timeout: 8000 }
          );
        };

        const handleSaveCourseSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          await saveCourseConfig(draftCourse);
          setCourseSavedNotice(true);
        };

        const handleResetDefaultCourse = async () => {
          setDraftCourse(SEED_COURSE_CONFIG);
          await saveCourseConfig(SEED_COURSE_CONFIG);
          setCourseSavedNotice(true);
        };

        return (
          <Box component="form" onSubmit={handleSaveCourseSubmit}>
            <Grid container spacing={2.5}>
              {/* Left Column: Course General Info & Default Hole Count */}
              <Grid size={{ xs: 12, lg: 4 }}>
                <Card>
                  <CardContent sx={{ p: 2.75 }}>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center', mb: 1 }}
                    >
                      <GolfCourseIcon color="primary" fontSize="small" />
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {t('admin.courseConfigTitle')}
                      </Typography>
                    </Stack>
                    <Typography
                      variant="body2"
                      sx={{ color: 'text.secondary', mb: 2.25 }}
                    >
                      {t('admin.courseConfigSubtitle')}
                    </Typography>

                    <Stack spacing={2}>
                      <TextField
                        label={t('admin.courseClubLabel')}
                        value={draftCourse.clubName}
                        onChange={(e) => {
                          setDraftCourse((prev) => ({
                            ...prev,
                            clubName: e.target.value,
                          }));
                          setCourseSavedNotice(false);
                        }}
                        fullWidth
                        size="small"
                      />

                      <TextField
                        label={t('admin.courseNameLabel')}
                        value={draftCourse.courseName}
                        onChange={(e) => {
                          setDraftCourse((prev) => ({
                            ...prev,
                            courseName: e.target.value,
                          }));
                          setCourseSavedNotice(false);
                        }}
                        fullWidth
                        size="small"
                      />

                      <TextField
                        label={t('admin.courseAddressLabel')}
                        value={draftCourse.address}
                        onChange={(e) => {
                          setDraftCourse((prev) => ({
                            ...prev,
                            address: e.target.value,
                          }));
                          setCourseSavedNotice(false);
                        }}
                        fullWidth
                        size="small"
                      />

                      <FormControl fullWidth size="small">
                        <InputLabel>{t('admin.defaultHolesCountLabel')}</InputLabel>
                        <Select
                          label={t('admin.defaultHolesCountLabel')}
                          value={draftCourse.defaultHoleCount}
                          onChange={(e) => {
                            setDraftCourse((prev) => ({
                              ...prev,
                              defaultHoleCount: Number(e.target.value),
                            }));
                            setCourseSavedNotice(false);
                          }}
                        >
                          <MenuItem value={3}>{t('play.holesOption3')}</MenuItem>
                          <MenuItem value={6}>{t('play.holesOption6')}</MenuItem>
                          <MenuItem value={9}>{t('play.holesOption9')}</MenuItem>
                        </Select>
                      </FormControl>

                      {/* Summary of Järvenranta Front 9 Total Par & Lengths */}
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 1,
                          bgcolor: 'action.hover',
                          border: '1px solid var(--mui-palette-divider)',
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            color: 'text.secondary',
                            display: 'block',
                            mb: 0.5,
                          }}
                        >
                          {draftCourse.clubName} • {draftCourse.courseName}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          Par{' '}
                          {draftCourse.holes.reduce(
                            (sum, h) => sum + h.officialPar,
                            0
                          )}{' '}
                          • Keltainen{' '}
                          {draftCourse.holes.reduce(
                            (sum, h) =>
                              sum +
                              (h.teeSpots.find((ts) => ts.divisionLevel === 8)
                                ?.distanceMeters || 0),
                            0
                          )}{' '}
                          m • Punainen{' '}
                          {draftCourse.holes.reduce(
                            (sum, h) =>
                              sum +
                              (h.teeSpots.find((ts) => ts.divisionLevel === 7)
                                ?.distanceMeters || 0),
                            0
                          )}{' '}
                          m
                        </Typography>
                      </Box>

                      <Stack spacing={1}>
                        <Button
                          type="submit"
                          variant="contained"
                          color="primary"
                          fullWidth
                          startIcon={<SaveIcon />}
                        >
                          {t('admin.saveCourseBtn')}
                        </Button>

                        <Button
                          type="button"
                          variant="outlined"
                          color="inherit"
                          size="small"
                          fullWidth
                          startIcon={<RestoreIcon />}
                          onClick={() => void handleResetDefaultCourse()}
                        >
                          {t('admin.resetDefaultCourseBtn')}
                        </Button>
                      </Stack>

                      {courseSavedNotice && (
                        <Chip
                          color="primary"
                          size="small"
                          label={t('admin.courseSavedSuccess')}
                          sx={{ fontWeight: 700 }}
                        />
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Right Column: Per-Hole Editor (Väylät 1–9) & 8 Division Tee GPS Spots */}
              <Grid size={{ xs: 12, lg: 8 }}>
                <Card>
                  <CardContent sx={{ p: 2.75 }}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.5}
                      sx={{
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        mb: 2,
                      }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {t('admin.selectHoleToEdit')}
                      </Typography>

                      <Stack
                        direction="row"
                        spacing={0.6}
                        useFlexGap
                        sx={{ flexWrap: 'wrap' }}
                      >
                        {draftCourse.holes.map((h) => {
                          const isSelected = h.holeNumber === selectedCourseHole;
                          return (
                            <Button
                              key={h.holeNumber}
                              size="small"
                              variant={isSelected ? 'contained' : 'outlined'}
                              color={isSelected ? 'primary' : 'inherit'}
                              onClick={() => setSelectedCourseHole(h.holeNumber)}
                              sx={{
                                minWidth: 38,
                                px: 1,
                                fontWeight: 800,
                              }}
                            >
                              #{h.holeNumber}
                            </Button>
                          );
                        })}
                      </Stack>
                    </Stack>

                    {activeHoleObj && (
                      <Stack spacing={2.25}>
                        {/* Hole Par, HCP, Description & Green GPS */}
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 1.25,
                            bgcolor: 'action.hover',
                            border: '1px solid var(--mui-palette-divider)',
                          }}
                        >
                          <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
                            <Grid size={{ xs: 6, sm: 2.5 }}>
                              <FormControl fullWidth size="small">
                                <InputLabel>{t('admin.holeParLabel')}</InputLabel>
                                <Select
                                  label={t('admin.holeParLabel')}
                                  value={activeHoleObj.officialPar}
                                  onChange={(e) =>
                                    updateHoleField(
                                      activeHoleObj.holeNumber,
                                      (h) => ({
                                        ...h,
                                        officialPar: Number(e.target.value),
                                      })
                                    )
                                  }
                                >
                                  <MenuItem value={3}>Par 3</MenuItem>
                                  <MenuItem value={4}>Par 4</MenuItem>
                                  <MenuItem value={5}>Par 5</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>

                            <Grid size={{ xs: 6, sm: 2.5 }}>
                              <TextField
                                type="number"
                                label={t('admin.holeHcpLabel')}
                                value={activeHoleObj.hcpIndex}
                                onChange={(e) =>
                                  updateHoleField(
                                    activeHoleObj.holeNumber,
                                    (h) => ({
                                      ...h,
                                      hcpIndex: Math.max(
                                        1,
                                        Math.min(18, Number(e.target.value) || 1)
                                      ),
                                    })
                                  )
                                }
                                fullWidth
                                size="small"
                              />
                            </Grid>

                            <Grid size={{ xs: 6, sm: 3.5 }}>
                              <TextField
                                type="number"
                                label={`${t('admin.greenGpsLabel')} Lat`}
                                value={activeHoleObj.greenGps.lat}
                                onChange={(e) =>
                                  updateHoleField(
                                    activeHoleObj.holeNumber,
                                    (h) => ({
                                      ...h,
                                      greenGps: {
                                        ...h.greenGps,
                                        lat: Number(e.target.value) || 0,
                                      },
                                    })
                                  )
                                }
                                slotProps={{ htmlInput: { step: '0.00001' } }}
                                fullWidth
                                size="small"
                              />
                            </Grid>

                            <Grid size={{ xs: 6, sm: 3.5 }}>
                              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                <TextField
                                  type="number"
                                  label={`${t('admin.greenGpsLabel')} Lng`}
                                  value={activeHoleObj.greenGps.lng}
                                  onChange={(e) =>
                                    updateHoleField(
                                      activeHoleObj.holeNumber,
                                      (h) => ({
                                        ...h,
                                        greenGps: {
                                          ...h.greenGps,
                                          lng: Number(e.target.value) || 0,
                                        },
                                      })
                                    )
                                  }
                                  slotProps={{ htmlInput: { step: '0.00001' } }}
                                  fullWidth
                                  size="small"
                                />
                                <Tooltip title={t('admin.useCurrentGpsBtn')}>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() =>
                                      handleCaptureCurrentGpsForGreen(
                                        activeHoleObj.holeNumber
                                      )
                                    }
                                  >
                                    <MyLocationIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                              <TextField
                                label={t('admin.holeNoteLabel')}
                                value={activeHoleObj.descriptionFi || ''}
                                onChange={(e) =>
                                  updateHoleField(
                                    activeHoleObj.holeNumber,
                                    (h) => ({
                                      ...h,
                                      descriptionFi: e.target.value,
                                    })
                                  )
                                }
                                fullWidth
                                size="small"
                              />
                            </Grid>
                          </Grid>
                        </Box>

                        {/* 8 Division Tee Spots (Distances + GPS Coordinates) */}
                        <Stack spacing={1.25}>
                          {DIVISIONS.map((div) => {
                            const spot = activeHoleObj.teeSpots.find(
                              (ts) => ts.divisionLevel === div.level
                            ) || {
                              divisionLevel: div.level,
                              distanceMeters: 100,
                              gps: { lat: 61.4223, lng: 23.0018 },
                            };

                            return (
                              <Box
                                key={div.level}
                                sx={{
                                  p: 1.35,
                                  borderRadius: 1,
                                  bgcolor: 'action.hover',
                                  border: '1px solid var(--mui-palette-divider)',
                                  borderLeft: `3px solid ${div.badgeColor}`,
                                }}
                              >
                                <Grid
                                  container
                                  spacing={1.25}
                                  sx={{ alignItems: 'center' }}
                                >
                                  <Grid size={{ xs: 12, sm: 3.5 }}>
                                    <Typography
                                      variant="subtitle2"
                                      sx={{
                                        fontWeight: 700,
                                        color: div.badgeColor,
                                      }}
                                    >
                                      {t(div.nameKey)}
                                    </Typography>
                                  </Grid>

                                  <Grid size={{ xs: 4, sm: 2.2 }}>
                                    <TextField
                                      type="number"
                                      label={t('admin.teeDistanceMetersLabel')}
                                      value={spot.distanceMeters}
                                      onChange={(e) => {
                                        const val = Math.max(
                                          5,
                                          Number(e.target.value) || 0
                                        );
                                        updateHoleField(
                                          activeHoleObj.holeNumber,
                                          (h) => ({
                                            ...h,
                                            teeSpots: h.teeSpots.map((ts) =>
                                              ts.divisionLevel === div.level
                                                ? { ...ts, distanceMeters: val }
                                                : ts
                                            ),
                                          })
                                        );
                                      }}
                                      fullWidth
                                      size="small"
                                    />
                                  </Grid>

                                  <Grid size={{ xs: 4, sm: 2.65 }}>
                                    <TextField
                                      type="number"
                                      label={t('admin.teeLatLabel')}
                                      value={spot.gps.lat}
                                      onChange={(e) => {
                                        const val = Number(e.target.value) || 0;
                                        updateHoleField(
                                          activeHoleObj.holeNumber,
                                          (h) => ({
                                            ...h,
                                            teeSpots: h.teeSpots.map((ts) =>
                                              ts.divisionLevel === div.level
                                                ? {
                                                    ...ts,
                                                    gps: { ...ts.gps, lat: val },
                                                  }
                                                : ts
                                            ),
                                          })
                                        );
                                      }}
                                      slotProps={{ htmlInput: { step: '0.00001' } }}
                                      fullWidth
                                      size="small"
                                    />
                                  </Grid>

                                  <Grid size={{ xs: 4, sm: 2.65 }}>
                                    <TextField
                                      type="number"
                                      label={t('admin.teeLngLabel')}
                                      value={spot.gps.lng}
                                      onChange={(e) => {
                                        const val = Number(e.target.value) || 0;
                                        updateHoleField(
                                          activeHoleObj.holeNumber,
                                          (h) => ({
                                            ...h,
                                            teeSpots: h.teeSpots.map((ts) =>
                                              ts.divisionLevel === div.level
                                                ? {
                                                    ...ts,
                                                    gps: { ...ts.gps, lng: val },
                                                  }
                                                : ts
                                            ),
                                          })
                                        );
                                      }}
                                      slotProps={{ htmlInput: { step: '0.00001' } }}
                                      fullWidth
                                      size="small"
                                    />
                                  </Grid>

                                  <Grid
                                    size={{ xs: 12, sm: 1 }}
                                    sx={{ textAlign: 'right' }}
                                  >
                                    <Tooltip title={t('admin.useCurrentGpsBtn')}>
                                      <IconButton
                                        size="small"
                                        color="primary"
                                        onClick={() =>
                                          handleCaptureCurrentGpsForTee(
                                            activeHoleObj.holeNumber,
                                            div.level
                                          )
                                        }
                                      >
                                        <MyLocationIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Grid>
                                </Grid>
                              </Box>
                            );
                          })}
                        </Stack>
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );
      })()}

      {/* DIALOG 1: Add New Player / User */}
      <Dialog
        open={addUserOpen}
        onClose={() => setAddUserOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          <Stack
            direction="row"
            sx={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <PersonAddIcon color="primary" fontSize="small" />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {t('admin.addUserModalTitle')}
              </Typography>
            </Stack>
            <IconButton size="small" onClick={() => setAddUserOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>

        <Box component="form" onSubmit={handleAddUser}>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                label={t('admin.userNameLabel')}
                placeholder={t('admin.userNamePlaceholder')}
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                required
                fullWidth
                size="small"
              />

              <TextField
                type="email"
                label={t('admin.userEmailLabel')}
                placeholder="pelaaja@club36.fi"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                fullWidth
                size="small"
              />

              <FormControl fullWidth size="small">
                <InputLabel>{t('admin.userRoleLabel')}</InputLabel>
                <Select
                  label={t('admin.userRoleLabel')}
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                >
                  <MenuItem value="player">{t('roles.player')}</MenuItem>
                  <MenuItem value="coach">{t('roles.coach')}</MenuItem>
                  <MenuItem value="admin">{t('roles.admin')}</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>{t('admin.userDivisionLabel')}</InputLabel>
                <Select
                  label={t('admin.userDivisionLabel')}
                  value={newUserDivision}
                  onChange={(e) => setNewUserDivision(Number(e.target.value))}
                >
                  {DIVISIONS.map((d) => (
                    <MenuItem key={d.level} value={d.level}>
                      {t(d.nameKey)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>{t('admin.userGroupsLabel')}</InputLabel>
                <Select
                  multiple
                  label={t('admin.userGroupsLabel')}
                  value={newUserGroupIds}
                  onChange={(e) =>
                    setNewUserGroupIds(
                      typeof e.target.value === 'string'
                        ? e.target.value.split(',')
                        : e.target.value
                    )
                  }
                >
                  {groups.map((g) => (
                    <MenuItem key={g.id} value={g.id}>
                      {g.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button color="inherit" onClick={() => setAddUserOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="contained" startIcon={<PersonAddIcon />}>
              {t('admin.createUserSubmitBtn')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* DIALOG 2: Manage Group Members (Assign / Remove Players for a Specific Group) */}
      <Dialog
        open={Boolean(managingGroup)}
        onClose={() => setManagingGroupId(null)}
        maxWidth="sm"
        fullWidth
      >
        {managingGroup && (
          <>
            <DialogTitle sx={{ fontWeight: 800 }}>
              <Stack
                direction="row"
                sx={{ justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {t('admin.groupMembersModalTitle', { group: managingGroup.name })}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {t('admin.groupMembersModalSubtitle')}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => setManagingGroupId(null)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            </DialogTitle>

            <DialogContent dividers>
              <Stack spacing={1}>
                {users
                  .filter((u) => u.role === 'player')
                  .map((player) => {
                    const isMember = player.groupIds.includes(managingGroup.id);
                    const div = getDivisionByLevel(player.currentDivision);

                    return (
                      <Box
                        key={player.id}
                        onClick={() =>
                          void toggleUserGroupMembership(player.id, managingGroup.id)
                        }
                        sx={{
                          p: 1.25,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          bgcolor: isMember
                            ? 'rgba(16, 185, 129, 0.08)'
                            : 'action.hover',
                          border: isMember
                            ? `1px solid ${managingGroup.colorTag}`
                            : '1px solid var(--mui-palette-divider)',
                        }}
                      >
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Checkbox
                            checked={isMember}
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
                          color={isMember ? 'primary' : 'default'}
                          variant={isMember ? 'filled' : 'outlined'}
                          label={
                            isMember
                              ? t('admin.inGroupBadge')
                              : t('admin.addToGroupBadge')
                          }
                          sx={{ height: 24, fontSize: '0.72rem' }}
                        />
                      </Box>
                    );
                  })}
              </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 1.5 }}>
              <Button variant="contained" onClick={() => setManagingGroupId(null)}>
                {t('common.close')}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Bottom Admin Action: Annual / Season XP & Attendance Reset */}
      <Card
        sx={{
          borderLeft: '3px solid #F43F5E',
        }}
      >
        <CardContent sx={{ p: { xs: 2.25, md: 2.75 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
            }}
          >
            <Box sx={{ maxWidth: 720 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {t('admin.seasonResetTitle')}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                {t('admin.seasonResetDesc')}
              </Typography>
            </Box>

            <Button
              variant="outlined"
              color="error"
              startIcon={<RestoreIcon />}
              onClick={() => setSeasonResetConfirmOpen(true)}
              sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {t('admin.seasonResetBtn')}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* DIALOG 3: Confirm Annual / Season XP & Attendance Reset */}
      <Dialog
        open={seasonResetConfirmOpen}
        onClose={() => setSeasonResetConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {t('admin.seasonResetConfirmTitle')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('admin.seasonResetConfirmDesc')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setSeasonResetConfirmOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<RestoreIcon />}
            onClick={async () => {
              await resetSeasonXpAndAttendance();
              setSeasonResetConfirmOpen(false);
            }}
          >
            {t('admin.seasonResetConfirmBtn')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
