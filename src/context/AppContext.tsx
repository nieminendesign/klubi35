import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { useTranslation } from 'react-i18next';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../config/firebase';
import {
  type TrainingGroup,
  type User,
  type UserRole,
  type TrainingSession,
  type Scorecard,
  type HoleScore,
  type CourseConfig,
  type SupportedLanguage,
  getScorecardTarget,
  getTargetStrokesForHoles,
  XP_REWARDS,
} from '../types/models';
import { SEED_COURSE_CONFIG } from '../data/seedData';
import { dataService } from '../services/dataService';
import { authService } from '../services/authService';
import { setAppLanguage } from '../i18n/config';

export interface LevelUpCelebrationData {
  playerName: string;
  strokes: number;
  previousDivisionLevel: number;
  newDivisionLevel: number;
  roundXp: number;
  totalXpEarned: number;
}

export interface ToastNotification {
  message: string;
  severity: 'success' | 'info' | 'warning';
}

const LIVE_MODE = Boolean(isFirebaseConfigured && auth);

function authErrorKey(err: unknown): string | null {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return 'auth.errInvalidCredentials';
    case 'auth/email-already-in-use':
      return 'auth.errEmailInUse';
    case 'auth/weak-password':
      return 'auth.errWeakPassword';
    case 'auth/invalid-email':
      return 'auth.errInvalidEmail';
    case 'auth/too-many-requests':
      return 'auth.errTooManyRequests';
    case 'auth/network-request-failed':
      return 'auth.errNetwork';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null; // user cancelled – stay silent
    default:
      return 'auth.errGeneric';
  }
}

interface AppContextValue {
  groups: TrainingGroup[];
  users: User[];
  sessions: TrainingSession[];
  scorecards: Scorecard[];
  courseConfig: CourseConfig;
  currentUser: User;
  language: SupportedLanguage;
  isLiveFirebase: boolean;
  /** Live mode: true when a Firebase user is signed in and the profile is loaded. Local demo mode: always true. */
  isAuthenticated: boolean;
  /** True while the initial auth state / data is resolving or a sign-in/registration is in flight. */
  authBusy: boolean;
  loading: boolean;
  levelUpCelebration: LevelUpCelebrationData | null;
  toast: ToastNotification | null;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  switchActiveUser: (userId: string) => void;
  changeLanguage: (lang: SupportedLanguage) => void;
  closeLevelUpCelebration: () => void;
  closeToast: () => void;
  showToast: (message: string, severity?: 'success' | 'info' | 'warning') => void;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  registerWithEmail: (input: {
    name: string;
    email: string;
    password: string;
    groupId: string;
  }) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  toggleRsvp: (sessionId: string, playerId: string, attending: boolean) => Promise<void>;
  toggleAttendance: (sessionId: string, playerId: string) => Promise<void>;
  submitScorecard: (input: {
    playerId: string;
    divisionLevel: number;
    holes: HoleScore[];
    isOfficialEvent: boolean;
  }) => Promise<Scorecard>;
  verifyScorecard: (scorecardId: string) => Promise<void>;
  saveGroup: (group: TrainingGroup) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  saveCourseConfig: (course: CourseConfig) => Promise<void>;
  createUser: (input: {
    name: string;
    email?: string;
    role: UserRole;
    currentDivision: number;
    groupIds: string[];
  }) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  toggleUserGroupMembership: (userId: string, groupId: string) => Promise<void>;
  createSessionsBatch: (newSessions: TrainingSession[]) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  resetSeasonXpAndAttendance: () => Promise<void>;
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n, t } = useTranslation();
  const [groups, setGroups] = useState<TrainingGroup[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [courseConfig, setCourseConfig] = useState<CourseConfig>(SEED_COURSE_CONFIG);
  const [activeUserId, setActiveUserId] = useState<string>(() => dataService.getSavedActiveUserId());
  const [language, setLanguage] = useState<SupportedLanguage>(
    (i18n.language as SupportedLanguage) || 'fi'
  );
  const [isLiveFirebase, setIsLiveFirebase] = useState<boolean>(LIVE_MODE);
  const [loading, setLoading] = useState<boolean>(true);
  const [levelUpCelebration, setLevelUpCelebration] = useState<LevelUpCelebrationData | null>(null);
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [authResolved, setAuthResolved] = useState<boolean>(!LIVE_MODE);
  const [authInFlight, setAuthInFlight] = useState<boolean>(false);
  // While registering, the auth listener must not create a profile – registerWithEmail writes it once.
  const registeringRef = useRef<boolean>(false);

  // Local demo mode: load seed / LocalStorage data immediately.
  useEffect(() => {
    if (LIVE_MODE) return;
    let mounted = true;
    dataService
      .fetchAllData()
      .then((snapshot) => {
        if (!mounted) return;
        setGroups(snapshot.groups);
        setUsers(snapshot.users);
        setSessions(snapshot.sessions);
        setScorecards(snapshot.scorecards);
        setCourseConfig(snapshot.courseConfig);
        setIsLiveFirebase(snapshot.isLiveFirebase);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading Club 35 data:', err);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Live Firebase mode: Firestore requires a signed-in user, so data is loaded after authentication.
  useEffect(() => {
    if (!LIVE_MODE || !auth) return;
    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (cancelled) return;
      if (!fbUser) {
        setAuthUid(null);
        setUsers([]);
        // Groups are publicly readable so the registration form can offer a group choice.
        try {
          const publicGroups = await dataService.fetchGroupsPublic();
          if (!cancelled) setGroups(publicGroups);
        } catch (err) {
          console.warn('Could not load public groups:', err);
        }
        setAuthResolved(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const snapshot = await dataService.fetchAllData();
        if (cancelled) return;
        let nextUsers = snapshot.users;
        let profile =
          nextUsers.find((u) => u.id === fbUser.uid) ||
          nextUsers.find(
            (u) => fbUser.email && u.email?.toLowerCase() === fbUser.email.toLowerCase()
          );
        if (!profile && !registeringRef.current) {
          profile = authService.profileFromFirebaseUser(fbUser);
          nextUsers = await dataService.saveUser(profile, nextUsers);
        }
        setGroups(snapshot.groups);
        setUsers(nextUsers);
        setSessions(snapshot.sessions);
        setScorecards(snapshot.scorecards);
        setCourseConfig(snapshot.courseConfig);
        setIsLiveFirebase(true);
        if (profile) {
          setActiveUserId(profile.id);
          dataService.setSavedActiveUserId(profile.id);
        }
        setAuthUid(fbUser.uid);
      } catch (err) {
        console.error('Error loading Club 35 data after sign-in:', err);
      } finally {
        if (!cancelled) {
          setAuthResolved(true);
          setLoading(false);
        }
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const profileReady = !LIVE_MODE || users.some((u) => u.id === activeUserId);
  const isAuthenticated = !LIVE_MODE || (Boolean(authUid) && profileReady);
  const authBusy = !authResolved || authInFlight || (LIVE_MODE && loading);

  const currentUser: User =
    users.find((u) => u.id === activeUserId) ||
    users.find((u) => u.role === 'player') ||
    users[0] || {
      id: 'player-onni',
      name: 'Onni Virtanen',
      role: 'player',
      groupIds: ['grp-haastajat', 'grp-kilpa'],
      currentDivision: 5,
      xp: 2850,
      attendanceCount: 19,
      createdAt: new Date().toISOString(),
    };

  const showToast = useCallback(
    (message: string, severity: 'success' | 'info' | 'warning' = 'success') => {
      setToast({ message, severity });
    },
    []
  );

  const closeToast = useCallback(() => {
    setToast(null);
  }, []);

  const closeLevelUpCelebration = useCallback(() => {
    setLevelUpCelebration(null);
  }, []);

  const switchActiveUser = useCallback((userId: string) => {
    setActiveUserId(userId);
    dataService.setSavedActiveUserId(userId);
  }, []);

  const changeLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguage(lang);
    setAppLanguage(lang);
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setAuthInFlight(true);
      try {
        if (LIVE_MODE) {
          // Profile loading & active-user selection happen in the auth-state listener.
          await authService.firebaseSignInWithEmail(email, password);
          return true;
        }
        const user = await authService.signInWithEmail(email, password, users);
        if (!user) {
          showToast(t('auth.errInvalidCredentials'), 'warning');
          return false;
        }
        switchActiveUser(user.id);
        showToast(t('auth.loggedInSuccess', { name: user.name }), 'success');
        return true;
      } catch (err) {
        console.error('Email sign-in error:', err);
        const key = authErrorKey(err);
        if (key) showToast(t(key), 'warning');
        return false;
      } finally {
        setAuthInFlight(false);
      }
    },
    [users, switchActiveUser, showToast, t]
  );

  const registerWithEmail = useCallback(
    async (input: {
      name: string;
      email: string;
      password: string;
      groupId: string;
    }): Promise<boolean> => {
      const cleanEmail = input.email.trim().toLowerCase();
      setAuthInFlight(true);
      registeringRef.current = true;
      try {
        if (!LIVE_MODE && users.some((u) => u.email?.toLowerCase() === cleanEmail)) {
          showToast(t('auth.errEmailInUse'), 'warning');
          return false;
        }

        const newUser = await authService.registerWithEmail(input);

        // Live mode: reload profiles now that we are authenticated, and claim a profile an admin
        // may have pre-created for this e-mail address instead of creating a duplicate.
        const knownUsers = LIVE_MODE ? (await dataService.fetchAllData()).users : users;
        const existing = LIVE_MODE
          ? knownUsers.find((u) => u.email?.toLowerCase() === cleanEmail)
          : undefined;

        if (existing) {
          setUsers(knownUsers);
          switchActiveUser(existing.id);
          showToast(t('auth.registeredSuccess', { name: existing.name }), 'success');
          return true;
        }

        const nextUsers = await dataService.saveUser(
          { ...newUser, preferredLanguage: language },
          knownUsers
        );
        setUsers(nextUsers);
        switchActiveUser(newUser.id);
        if (LIVE_MODE) setAuthUid(newUser.id);
        showToast(t('auth.registeredSuccess', { name: newUser.name }), 'success');
        return true;
      } catch (err) {
        console.error('Email registration error:', err);
        const key = authErrorKey(err);
        if (key) showToast(t(key), 'warning');
        return false;
      } finally {
        registeringRef.current = false;
        setAuthInFlight(false);
      }
    },
    [language, users, switchActiveUser, showToast, t]
  );

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    setAuthInFlight(true);
    try {
      if (LIVE_MODE) {
        await authService.firebaseSignInWithGoogle();
        return true;
      }
      const user = await authService.signInWithGoogle(users);
      if (!user) return false;
      switchActiveUser(user.id);
      showToast(t('auth.loggedInSuccess', { name: user.name }), 'success');
      return true;
    } catch (err) {
      console.error('Google sign-in error:', err);
      const key = authErrorKey(err);
      if (key) showToast(t(key), 'warning');
      return false;
    } finally {
      setAuthInFlight(false);
    }
  }, [users, switchActiveUser, showToast, t]);

  const resetPassword = useCallback(
    async (email: string): Promise<boolean> => {
      const clean = email.trim();
      if (!clean) {
        showToast(t('auth.resetEnterEmail'), 'warning');
        return false;
      }
      try {
        if (!LIVE_MODE) {
          showToast(t('auth.resetLocalMode'), 'info');
          return false;
        }
        await authService.sendPasswordReset(clean);
        // Same message whether or not the account exists (no account enumeration).
        showToast(t('auth.resetEmailSent', { email: clean }), 'success');
        return true;
      } catch (err) {
        console.error('Password reset error:', err);
        const code = (err as { code?: string })?.code;
        if (code === 'auth/user-not-found') {
          showToast(t('auth.resetEmailSent', { email: clean }), 'success');
          return true;
        }
        const key = authErrorKey(err);
        if (key) showToast(t(key), 'warning');
        return false;
      }
    },
    [showToast, t]
  );

  const signOut = useCallback(async () => {
    await authService.signOut();
    if (!LIVE_MODE) {
      switchActiveUser('player-onni');
    }
  }, [switchActiveUser]);

  const toggleRsvp = useCallback(
    async (sessionId: string, playerId: string, attending: boolean) => {
      // RBAC check: Players can only RSVP for themselves
      if (currentUser.role === 'player' && currentUser.id !== playerId) {
        showToast(t('rbac.accessDenied', { role: currentUser.role }), 'warning');
        return;
      }

      const target = sessions.find((s) => s.id === sessionId);
      if (!target) return;

      const rsvpSet = new Set(target.rsvpPlayerIds);
      const declinedSet = new Set(target.declinedPlayerIds || []);

      if (attending) {
        rsvpSet.add(playerId);
        declinedSet.delete(playerId);
      } else {
        rsvpSet.delete(playerId);
        declinedSet.add(playerId);
      }

      const updatedSession: TrainingSession = {
        ...target,
        rsvpPlayerIds: Array.from(rsvpSet),
        declinedPlayerIds: Array.from(declinedSet),
      };

      const nextSessions = await dataService.saveSession(updatedSession, sessions);
      setSessions(nextSessions);
      showToast(attending ? t('dashboard.rsvpConfirmed') : t('dashboard.rsvpDeclinedStatus'), 'info');
    },
    [currentUser, sessions, showToast, t]
  );

  const toggleAttendance = useCallback(
    async (sessionId: string, playerId: string) => {
      // RBAC check: Only Coach or Admin can check in attendance
      if (currentUser.role !== 'coach' && currentUser.role !== 'admin') {
        showToast(t('rbac.accessDenied', { role: currentUser.role }), 'warning');
        return;
      }

      const targetSession = sessions.find((s) => s.id === sessionId);
      const targetPlayer = users.find((u) => u.id === playerId);
      if (!targetSession || !targetPlayer) return;

      const isAlreadyPresent = targetSession.attendedPlayerIds.includes(playerId);
      const nextAttendedIds = isAlreadyPresent
        ? targetSession.attendedPlayerIds.filter((id) => id !== playerId)
        : [...targetSession.attendedPlayerIds, playerId];

      const nextRsvpIds =
        !isAlreadyPresent && !targetSession.rsvpPlayerIds.includes(playerId)
          ? [...targetSession.rsvpPlayerIds, playerId]
          : targetSession.rsvpPlayerIds;

      const updatedSession: TrainingSession = {
        ...targetSession,
        attendedPlayerIds: nextAttendedIds,
        rsvpPlayerIds: nextRsvpIds,
      };

      const xpDelta = isAlreadyPresent
        ? -XP_REWARDS.TRAINING_ATTENDANCE
        : XP_REWARDS.TRAINING_ATTENDANCE;
      const attendanceDelta = isAlreadyPresent ? -1 : 1;

      const updatedPlayer: User = {
        ...targetPlayer,
        xp: Math.max(0, targetPlayer.xp + xpDelta),
        attendanceCount: Math.max(0, targetPlayer.attendanceCount + attendanceDelta),
      };

      const [nextSessions, nextUsers] = await Promise.all([
        dataService.saveSession(updatedSession, sessions),
        dataService.saveUser(updatedPlayer, users),
      ]);

      setSessions(nextSessions);
      setUsers(nextUsers);

      if (!isAlreadyPresent) {
        showToast(`${targetPlayer.name}: +${XP_REWARDS.TRAINING_ATTENDANCE} PTS!`, 'success');
      } else {
        showToast(`${targetPlayer.name}: −${XP_REWARDS.TRAINING_ATTENDANCE} PTS`, 'info');
      }
    },
    [currentUser, sessions, users, showToast, t]
  );

  const submitScorecard = useCallback(
    async (input: {
      playerId: string;
      divisionLevel: number;
      holes: HoleScore[];
      isOfficialEvent: boolean;
    }): Promise<Scorecard> => {
      // RBAC: Players can only submit scorecards for themselves
      const effectivePlayerId =
        currentUser.role === 'player' ? currentUser.id : input.playerId;

      const player = users.find((u) => u.id === effectivePlayerId) || currentUser;
      const totalStrokes = input.holes.reduce((sum, h) => sum + h.strokes, 0);
      const totalPutts = input.holes.reduce((sum, h) => sum + h.putts, 0);
      const totalGir = input.holes.filter((h) => h.gir).length;
      const holesCount = input.holes.length;
      const targetStrokes = getTargetStrokesForHoles(holesCount, courseConfig);
      const passedDivision = totalStrokes <= targetStrokes;

      const now = new Date();
      const isoDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')}`;

      const isAutoVerified =
        currentUser.role === 'coach' || currentUser.role === 'admin';

      const newScorecard: Scorecard = {
        id: `sc-${Date.now()}`,
        playerId: player.id,
        date: isoDate,
        divisionLevel: input.divisionLevel,
        holes: input.holes,
        holesCount,
        targetStrokes,
        courseName: courseConfig.courseName,
        totalStrokes,
        totalPutts,
        totalGir,
        passedDivision,
        isOfficialEvent: input.isOfficialEvent,
        verifiedByCoach: isAutoVerified,
      };

      if (!isAutoVerified) {
        const nextScorecards = await dataService.saveScorecard(newScorecard, scorecards);
        setScorecards(nextScorecards);
        showToast(
          `${player.name}: ${totalStrokes} ${t('dashboard.strokesUnit')} – ${t(
            'dashboard.pendingVerification'
          )}`,
          'info'
        );
        return newScorecard;
      }

      const roundXp = input.isOfficialEvent
        ? XP_REWARDS.OFFICIAL_EVENT_ROUND
        : XP_REWARDS.PRACTICE_ROUND;

      const qualifiesForLevelUp =
        passedDivision && input.divisionLevel >= player.currentDivision;

      const bonusXp = passedDivision ? XP_REWARDS.DIVISION_PASSED_BONUS : 0;
      const totalXpEarned = roundXp + bonusXp;
      const newDivisionLevel = qualifiesForLevelUp
        ? Math.min(8, Math.max(player.currentDivision, input.divisionLevel) + 1)
        : player.currentDivision;

      const updatedPlayer: User = {
        ...player,
        xp: player.xp + totalXpEarned,
        currentDivision: newDivisionLevel,
      };

      const [nextScorecards, nextUsers] = await Promise.all([
        dataService.saveScorecard(newScorecard, scorecards),
        dataService.saveUser(updatedPlayer, users),
      ]);

      setScorecards(nextScorecards);
      setUsers(nextUsers);

      if (passedDivision) {
        setLevelUpCelebration({
          playerName: player.name,
          strokes: totalStrokes,
          previousDivisionLevel: input.divisionLevel,
          newDivisionLevel,
          roundXp,
          totalXpEarned,
        });
      } else {
        showToast(
          `${player.name}: +${roundXp} PTS (${totalStrokes} ${t('dashboard.strokesUnit')})`,
          'success'
        );
      }

      return newScorecard;
    },
    [users, currentUser, scorecards, courseConfig, showToast, t]
  );

  const verifyScorecard = useCallback(
    async (scorecardId: string) => {
      // RBAC check: Only Coach or Admin can verify scorecards
      if (currentUser.role !== 'coach' && currentUser.role !== 'admin') {
        showToast(t('rbac.accessDenied', { role: currentUser.role }), 'warning');
        return;
      }

      const targetCard = scorecards.find((sc) => sc.id === scorecardId);
      if (!targetCard || targetCard.verifiedByCoach) return;

      const player = users.find((u) => u.id === targetCard.playerId);
      const updatedCard: Scorecard = {
        ...targetCard,
        verifiedByCoach: true,
      };

      const nextScorecards = await dataService.saveScorecard(updatedCard, scorecards);
      setScorecards(nextScorecards);

      if (player) {
        const roundXp = targetCard.isOfficialEvent
          ? XP_REWARDS.OFFICIAL_EVENT_ROUND
          : XP_REWARDS.PRACTICE_ROUND;
        const target = getScorecardTarget(targetCard);
        const passed = targetCard.totalStrokes <= target;
        const shouldAdvanceDivision =
          passed && targetCard.divisionLevel >= player.currentDivision;
        const nextDivision = shouldAdvanceDivision
          ? Math.min(8, targetCard.divisionLevel + 1)
          : player.currentDivision;
        const xpToAdd = passed ? roundXp + XP_REWARDS.DIVISION_PASSED_BONUS : roundXp;

        const updatedPlayer: User = {
          ...player,
          xp: player.xp + xpToAdd,
          currentDivision: nextDivision,
        };

        const nextUsers = await dataService.saveUser(updatedPlayer, users);
        setUsers(nextUsers);

        if (shouldAdvanceDivision) {
          setLevelUpCelebration({
            playerName: player.name,
            strokes: targetCard.totalStrokes,
            previousDivisionLevel: targetCard.divisionLevel,
            newDivisionLevel: nextDivision,
            roundXp,
            totalXpEarned: xpToAdd,
          });
        } else {
          showToast(t('coach.verifiedToast'), 'success');
        }
      }
    },
    [currentUser, scorecards, users, showToast, t]
  );

  const saveGroup = useCallback(
    async (group: TrainingGroup) => {
      if (currentUser.role !== 'admin') {
        showToast(t('rbac.accessDenied', { role: currentUser.role }), 'warning');
        return;
      }
      const nextGroups = await dataService.saveGroup(group, groups);
      setGroups(nextGroups);

      // Sync coach users' groupIds with group.coachIds
      let updatedUsersList = [...users];
      for (const u of users) {
        if (u.role === 'coach' || u.role === 'admin') {
          const shouldBeInGroup = group.coachIds.includes(u.id);
          const isInGroup = u.groupIds.includes(group.id);
          if (shouldBeInGroup && !isInGroup) {
            updatedUsersList = await dataService.saveUser(
              { ...u, groupIds: [...u.groupIds, group.id] },
              updatedUsersList
            );
          } else if (!shouldBeInGroup && isInGroup) {
            updatedUsersList = await dataService.saveUser(
              { ...u, groupIds: u.groupIds.filter((id) => id !== group.id) },
              updatedUsersList
            );
          }
        }
      }
      setUsers(updatedUsersList);
      showToast(`${group.name} ✓`, 'success');
    },
    [currentUser, groups, users, showToast, t]
  );

  const deleteGroup = useCallback(
    async (groupId: string) => {
      if (currentUser.role !== 'admin') {
        showToast(t('rbac.accessDenied', { role: currentUser.role }), 'warning');
        return;
      }
      const res = await dataService.deleteGroup(groupId, groups, users);
      setGroups(res.groups);
      setUsers(res.users);
      showToast(t('admin.groupRemovedToast'), 'info');
    },
    [currentUser, groups, users, showToast, t]
  );

  const saveCourseConfig = useCallback(
    async (course: CourseConfig) => {
      if (currentUser.role !== 'admin') {
        showToast(t('rbac.accessDenied', { role: currentUser.role }), 'warning');
        return;
      }
      const saved = await dataService.saveCourseConfig(course);
      setCourseConfig(saved);
      showToast(`${course.courseName} ✓`, 'success');
    },
    [currentUser, showToast, t]
  );

  const createUser = useCallback(
    async (input: {
      name: string;
      email?: string;
      role: UserRole;
      currentDivision: number;
      groupIds: string[];
    }) => {
      if (currentUser.role !== 'admin') {
        showToast(t('rbac.accessDenied', { role: currentUser.role }), 'warning');
        return;
      }
      const live = LIVE_MODE && Boolean(input.email?.trim());
      if (live) {
        try {
          await authService.inviteUser({
            name: input.name.trim(),
            email: input.email!.trim().toLowerCase(),
            role: input.role,
            currentDivision: Math.max(1, Math.min(8, input.currentDivision)),
            groupIds: input.groupIds,
          });
          const fresh = await dataService.fetchAllData();
          setUsers(fresh.users);
          showToast(t('admin.inviteSentToast', { email: input.email!.trim() }), 'success');
          return;
        } catch (err) {
          console.error('Invite via Cloud Function failed, falling back to direct Firestore profile creation:', err);
        }
      }
      const newUser: User = {
        id: `${input.role}-${Date.now()}`,
        name: input.name.trim(),
        email: input.email?.trim() || undefined,
        role: input.role,
        preferredLanguage: language,
        groupIds: input.groupIds,
        currentDivision: Math.max(1, Math.min(8, input.currentDivision)),
        xp: 0,
        attendanceCount: 0,
        createdAt: new Date().toISOString(),
      };
      const nextUsers = await dataService.saveUser(newUser, users);
      setUsers(nextUsers);
      showToast(t('admin.userAddedToast', { name: newUser.name }), 'success');
    },
    [currentUser, language, users, showToast, t]
  );

  const updateUser = useCallback(
    async (user: User) => {
      if (currentUser.role !== 'admin') {
        showToast(t('rbac.accessDenied', { role: currentUser.role }), 'warning');
        return;
      }
      const nextUsers = await dataService.saveUser(user, users);
      setUsers(nextUsers);
      showToast(`${user.name} ✓`, 'success');
    },
    [currentUser, users, showToast, t]
  );

  const deleteUser = useCallback(
    async (userId: string) => {
      if (currentUser.role !== 'admin') {
        showToast(t('rbac.accessDenied', { role: currentUser.role }), 'warning');
        return;
      }
      if (userId === currentUser.id) {
        showToast(t('admin.cannotDeleteSelf'), 'warning');
        return;
      }
      const target = users.find((u) => u.id === userId);
      const res = await dataService.deleteUser(userId, users, groups, sessions, scorecards);
      setUsers(res.users);
      setGroups(res.groups);
      setSessions(res.sessions);
      setScorecards(res.scorecards);
      showToast(t('admin.userDeletedToast', { name: target?.name || userId }), 'info');
    },
    [currentUser, users, groups, sessions, scorecards, showToast, t]
  );

  const toggleUserGroupMembership = useCallback(
    async (userId: string, groupId: string) => {
      if (currentUser.role !== 'admin') {
        showToast(t('rbac.accessDenied', { role: currentUser.role }), 'warning');
        return;
      }
      const targetUser = users.find((u) => u.id === userId);
      if (!targetUser) return;

      const hasGroup = targetUser.groupIds.includes(groupId);
      const nextGroupIds = hasGroup
        ? targetUser.groupIds.filter((id) => id !== groupId)
        : [...targetUser.groupIds, groupId];

      const updated: User = {
        ...targetUser,
        groupIds: nextGroupIds,
      };
      const nextUsers = await dataService.saveUser(updated, users);
      setUsers(nextUsers);

      // If target user is a coach or admin, also sync group.coachIds
      if (targetUser.role === 'coach' || targetUser.role === 'admin') {
        const targetGroup = groups.find((g) => g.id === groupId);
        if (targetGroup) {
          const nextCoachIds = hasGroup
            ? targetGroup.coachIds.filter((id) => id !== userId)
            : Array.from(new Set([...targetGroup.coachIds, userId]));
          const nextGroups = await dataService.saveGroup(
            { ...targetGroup, coachIds: nextCoachIds },
            groups
          );
          setGroups(nextGroups);
        }
      }

      showToast(`${targetUser.name} ✓`, 'success');
    },
    [currentUser, users, groups, showToast, t]
  );

  const createSessionsBatch = useCallback(
    async (newSessions: TrainingSession[]) => {
      if (currentUser.role !== 'admin') {
        showToast(t('rbac.accessDenied', { role: currentUser.role }), 'warning');
        return;
      }
      const nextSessions = await dataService.saveSessionsBatch(newSessions, sessions);
      setSessions(nextSessions);
      showToast(t('admin.sessionsCreatedToast', { count: newSessions.length }), 'success');
    },
    [currentUser, sessions, showToast, t]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      if (currentUser.role !== 'admin') {
        showToast(t('rbac.accessDenied', { role: currentUser.role }), 'warning');
        return;
      }
      const nextSessions = await dataService.deleteSession(sessionId, sessions);
      setSessions(nextSessions);
    },
    [currentUser, sessions, showToast, t]
  );

  const resetSeasonXpAndAttendance = useCallback(async () => {
    if (currentUser.role !== 'admin') {
      showToast(t('rbac.accessDenied', { role: currentUser.role }), 'warning');
      return;
    }

    let updatedUsersList = [...users];
    for (const u of users) {
      if (u.role === 'player' && (u.xp !== 0 || u.attendanceCount !== 0)) {
        updatedUsersList = await dataService.saveUser(
          { ...u, xp: 0, attendanceCount: 0 },
          updatedUsersList
        );
      }
    }
    setUsers(updatedUsersList);
    showToast(t('admin.seasonResetSuccessToast'), 'info');
  }, [currentUser, users, showToast, t]);

  const resetDemoData = useCallback(() => {
    const fresh = dataService.resetLocalSeedData();
    setGroups(fresh.groups);
    setUsers(fresh.users);
    setSessions(fresh.sessions);
    setScorecards(fresh.scorecards);
    setCourseConfig(fresh.courseConfig);
    setActiveUserId('player-onni');
    dataService.setSavedActiveUserId('player-onni');
    showToast(t('demoToolbar.resetConfirm'), 'info');
  }, [showToast, t]);

  return (
    <AppContext.Provider
      value={{
        groups,
        users,
        sessions,
        scorecards,
        courseConfig,
        currentUser,
        language,
        isLiveFirebase,
        isAuthenticated,
        authBusy,
        loading,
        levelUpCelebration,
        toast,
        signOut,
        resetPassword,
        switchActiveUser,
        changeLanguage,
        closeLevelUpCelebration,
        closeToast,
        showToast,
        signInWithEmail,
        registerWithEmail,
        signInWithGoogle,
        toggleRsvp,
        toggleAttendance,
        submitScorecard,
        verifyScorecard,
        saveGroup,
        deleteGroup,
        saveCourseConfig,
        createUser,
        updateUser,
        deleteUser,
        toggleUserGroupMembership,
        createSessionsBatch,
        deleteSession,
        resetSeasonXpAndAttendance,
        resetDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}
