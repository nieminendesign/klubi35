import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import type {
  TrainingGroup,
  User,
  TrainingSession,
  Scorecard,
  CourseConfig,
} from '../types/models';
import {
  SEED_GROUPS,
  SEED_USERS,
  SEED_SESSIONS,
  SEED_SCORECARDS,
  SEED_COURSE_CONFIG,
} from '../data/seedData';

const STORAGE_KEYS = {
  GROUPS: 'club36_groups_v3',
  USERS: 'club36_users_v2',
  SESSIONS: 'club36_sessions_v3',
  SCORECARDS: 'club36_scorecards_v3',
  COURSE: 'club36_course_v3',
  ACTIVE_USER_ID: 'club36_active_user_id_v1',
};

function loadLocal<T>(key: string, seedFallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(seedFallback));
      return structuredClone(seedFallback);
    }
    return JSON.parse(raw) as T[];
  } catch {
    return structuredClone(seedFallback);
  }
}

function loadLocalObject<T>(key: string, seedFallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(seedFallback));
      return structuredClone(seedFallback);
    }
    return JSON.parse(raw) as T;
  } catch {
    return structuredClone(seedFallback);
  }
}

function saveLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('LocalStorage save failed:', err);
  }
}

export interface Club36Snapshot {
  groups: TrainingGroup[];
  users: User[];
  sessions: TrainingSession[];
  scorecards: Scorecard[];
  courseConfig: CourseConfig;
  isLiveFirebase: boolean;
}

export const dataService = {
  isLiveFirebase(): boolean {
    return Boolean(isFirebaseConfigured && db);
  },

  getSavedActiveUserId(): string {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_USER_ID) || 'player-onni';
    } catch {
      return 'player-onni';
    }
  },

  setSavedActiveUserId(userId: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, userId);
    } catch {
      // ignore
    }
  },

  async fetchGroupsPublic(): Promise<TrainingGroup[]> {
    if (!(isFirebaseConfigured && db)) return [];
    const snap = await getDocs(collection(db, 'groups'));
    return snap.docs.map((d) => d.data() as TrainingGroup);
  },

  async fetchAllData(): Promise<Club36Snapshot> {
    if (isFirebaseConfigured && db) {
      try {
        const [groupsSnap, usersSnap, sessionsSnap, scorecardsSnap, coursesSnap] =
          await Promise.all([
            getDocs(collection(db, 'groups')),
            getDocs(collection(db, 'users')),
            getDocs(query(collection(db, 'sessions'), orderBy('date', 'asc'))),
            getDocs(query(collection(db, 'scorecards'), orderBy('date', 'desc'))),
            getDocs(collection(db, 'courses')),
          ]);

        // NOTE: The client never seeds Firestore (security rules only allow admins to write groups etc.).
        // Use `functions/scripts/bootstrap.mjs` once to create the initial groups and the first admin.
        const loadedCourse =
          coursesSnap.docs.length > 0
            ? (coursesSnap.docs[0].data() as CourseConfig)
            : structuredClone(SEED_COURSE_CONFIG);

        return {
          groups: groupsSnap.docs.map((d) => d.data() as TrainingGroup),
          users: usersSnap.docs.map((d) => d.data() as User),
          sessions: sessionsSnap.docs.map((d) => d.data() as TrainingSession),
          scorecards: scorecardsSnap.docs.map((d) => d.data() as Scorecard),
          courseConfig: loadedCourse,
          isLiveFirebase: true,
        };
      } catch (err) {
        // In live mode never silently fall back to demo data – surface the error to the caller.
        console.error('Firestore read failed:', err);
        throw err;
      }
    }

    return {
      groups: loadLocal(STORAGE_KEYS.GROUPS, SEED_GROUPS),
      users: loadLocal(STORAGE_KEYS.USERS, SEED_USERS),
      sessions: loadLocal(STORAGE_KEYS.SESSIONS, SEED_SESSIONS),
      scorecards: loadLocal(STORAGE_KEYS.SCORECARDS, SEED_SCORECARDS),
      courseConfig: loadLocalObject(STORAGE_KEYS.COURSE, SEED_COURSE_CONFIG),
      isLiveFirebase: false,
    };
  },

  async seedFirestoreIfEmpty(): Promise<void> {
    if (!db) return;
    const batch = writeBatch(db);
    for (const g of SEED_GROUPS) {
      batch.set(doc(db, 'groups', g.id), g);
    }
    for (const u of SEED_USERS) {
      batch.set(doc(db, 'users', u.id), u);
    }
    for (const s of SEED_SESSIONS) {
      batch.set(doc(db, 'sessions', s.id), s);
    }
    for (const sc of SEED_SCORECARDS) {
      batch.set(doc(db, 'scorecards', sc.id), sc);
    }
    batch.set(doc(db, 'courses', SEED_COURSE_CONFIG.id), SEED_COURSE_CONFIG);
    await batch.commit();
  },

  async saveCourseConfig(course: CourseConfig): Promise<CourseConfig> {
    saveLocal(STORAGE_KEYS.COURSE, course);
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'courses', course.id), course, { merge: true });
    }
    return course;
  },

  async saveUser(user: User, allUsers: User[]): Promise<User[]> {
    const updated = allUsers.some((u) => u.id === user.id)
      ? allUsers.map((u) => (u.id === user.id ? user : u))
      : [...allUsers, user];

    saveLocal(STORAGE_KEYS.USERS, updated);
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'users', user.id), user, { merge: true });
    }
    return updated;
  },

  async deleteUser(
    userId: string,
    allUsers: User[],
    allGroups: TrainingGroup[],
    allSessions: TrainingSession[],
    allScorecards: Scorecard[]
  ): Promise<{
    users: User[];
    groups: TrainingGroup[];
    sessions: TrainingSession[];
    scorecards: Scorecard[];
  }> {
    const updatedUsers = allUsers.filter((u) => u.id !== userId);
    const updatedGroups = allGroups.map((g) => ({
      ...g,
      coachIds: g.coachIds.filter((cid) => cid !== userId),
    }));
    const updatedSessions = allSessions.map((s) => ({
      ...s,
      rsvpPlayerIds: s.rsvpPlayerIds.filter((pid) => pid !== userId),
      attendedPlayerIds: s.attendedPlayerIds.filter((pid) => pid !== userId),
      declinedPlayerIds: (s.declinedPlayerIds || []).filter((pid) => pid !== userId),
    }));
    const updatedScorecards = allScorecards.filter((sc) => sc.playerId !== userId);

    saveLocal(STORAGE_KEYS.USERS, updatedUsers);
    saveLocal(STORAGE_KEYS.GROUPS, updatedGroups);
    saveLocal(STORAGE_KEYS.SESSIONS, updatedSessions);
    saveLocal(STORAGE_KEYS.SCORECARDS, updatedScorecards);

    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'users', userId));
    }

    return {
      users: updatedUsers,
      groups: updatedGroups,
      sessions: updatedSessions,
      scorecards: updatedScorecards,
    };
  },

  async saveGroup(group: TrainingGroup, allGroups: TrainingGroup[]): Promise<TrainingGroup[]> {
    const updated = allGroups.some((g) => g.id === group.id)
      ? allGroups.map((g) => (g.id === group.id ? group : g))
      : [...allGroups, group];

    saveLocal(STORAGE_KEYS.GROUPS, updated);
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'groups', group.id), group, { merge: true });
    }
    return updated;
  },

  async deleteGroup(
    groupId: string,
    allGroups: TrainingGroup[],
    allUsers: User[]
  ): Promise<{ groups: TrainingGroup[]; users: User[] }> {
    const updatedGroups = allGroups.filter((g) => g.id !== groupId);
    const updatedUsers = allUsers.map((u) => ({
      ...u,
      groupIds: u.groupIds.filter((id) => id !== groupId),
    }));
    saveLocal(STORAGE_KEYS.GROUPS, updatedGroups);
    saveLocal(STORAGE_KEYS.USERS, updatedUsers);
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'groups', groupId));
    }
    return { groups: updatedGroups, users: updatedUsers };
  },

  async saveSession(
    session: TrainingSession,
    allSessions: TrainingSession[]
  ): Promise<TrainingSession[]> {
    const updated = allSessions.some((s) => s.id === session.id)
      ? allSessions.map((s) => (s.id === session.id ? session : s))
      : [...allSessions, session];

    saveLocal(STORAGE_KEYS.SESSIONS, updated);
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'sessions', session.id), session, { merge: true });
    }
    return updated;
  },

  async saveSessionsBatch(
    newSessions: TrainingSession[],
    allSessions: TrainingSession[]
  ): Promise<TrainingSession[]> {
    const updated = [...allSessions, ...newSessions].sort((a, b) =>
      `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`)
    );
    saveLocal(STORAGE_KEYS.SESSIONS, updated);

    if (isFirebaseConfigured && db) {
      const batch = writeBatch(db);
      for (const s of newSessions) {
        batch.set(doc(db, 'sessions', s.id), s);
      }
      await batch.commit();
    }
    return updated;
  },

  async deleteSession(
    sessionId: string,
    allSessions: TrainingSession[]
  ): Promise<TrainingSession[]> {
    const updated = allSessions.filter((s) => s.id !== sessionId);
    saveLocal(STORAGE_KEYS.SESSIONS, updated);
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'sessions', sessionId));
    }
    return updated;
  },

  async saveScorecard(scorecard: Scorecard, allScorecards: Scorecard[]): Promise<Scorecard[]> {
    const updated = allScorecards.some((sc) => sc.id === scorecard.id)
      ? allScorecards.map((sc) => (sc.id === scorecard.id ? scorecard : sc))
      : [scorecard, ...allScorecards];

    saveLocal(STORAGE_KEYS.SCORECARDS, updated);
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'scorecards', scorecard.id), scorecard, { merge: true });
    }
    return updated;
  },

  resetLocalSeedData(): Club36Snapshot {
    saveLocal(STORAGE_KEYS.GROUPS, SEED_GROUPS);
    saveLocal(STORAGE_KEYS.USERS, SEED_USERS);
    saveLocal(STORAGE_KEYS.SESSIONS, SEED_SESSIONS);
    saveLocal(STORAGE_KEYS.SCORECARDS, SEED_SCORECARDS);
    saveLocal(STORAGE_KEYS.COURSE, SEED_COURSE_CONFIG);
    return {
      groups: structuredClone(SEED_GROUPS),
      users: structuredClone(SEED_USERS),
      sessions: structuredClone(SEED_SESSIONS),
      scorecards: structuredClone(SEED_SCORECARDS),
      courseConfig: structuredClone(SEED_COURSE_CONFIG),
      isLiveFirebase: false,
    };
  },
};
