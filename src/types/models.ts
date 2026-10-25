export type UserRole = 'admin' | 'coach' | 'player';
export type SupportedLanguage = 'fi' | 'en';

// Collection: 'groups'
export interface TrainingGroup {
  id: string;
  name: string; // e.g., "Starttiryhmä 8–10v", "Haastajat 11–13v"
  description: string;
  colorTag: string; // Hex color for calendar visual coding
  coachIds: string[];
}

// Collection: 'users'
export interface User {
  id: string;
  email?: string;
  name: string;
  role: UserRole;
  preferredLanguage?: SupportedLanguage;
  groupIds: string[]; // Groups the player belongs to, or coach instructs
  avatarUrl?: string;
  currentDivision: number; // 1 to 8 (applicable for players)
  xp: number;
  attendanceCount: number;
  createdAt: string;
}

// Static Config Constant: DIVISIONS
export interface Division {
  level: number; // 1 to 8
  nameKey: string; // i18n translation key e.g., 'divisions.level_6.name'
  distanceKey: string; // i18n key e.g., 'divisions.level_6.distance' ("Oranssi tii" / "Orange Tee")
  shortLabelKey: string; // e.g., 'divisions.level_6.short'
  badgeColor: string;
  targetScore: number; // 36 for 9 holes (4 per hole)
}

export interface GpsPoint {
  lat: number;
  lng: number;
}

export interface TeeDivisionSpot {
  divisionLevel: number; // 1 to 8 (25m, 50m, 100m, 150m, 200m, Orange, Red, Yellow)
  distanceMeters: number; // e.g., 25, 50, 100, 150, 200, 225, 267, 307
  gps: GpsPoint; // Tee spot GPS coordinates for on-course tee navigation
}

export interface CourseHoleConfig {
  holeNumber: number; // 1 to 9
  officialPar: number; // Official Järvenranta Par (3, 4, or 5)
  club36TargetPar: number; // 4 strokes per hole
  hcpIndex: number; // Men/Club HCP index
  descriptionFi: string;
  descriptionEn: string;
  greenGps: GpsPoint; // Green center GPS coordinates
  teeSpots: TeeDivisionSpot[]; // 8 tee spots (Levels 1..8)
}

export interface CourseConfig {
  id: string;
  clubName: string; // e.g. "Lakeside Golf Vammala"
  courseName: string; // e.g. "Järvenranta – Etuysi (Väylät 1–9)"
  address: string;
  defaultHoleCount: number; // e.g. 9
  supportedHoleCounts: number[]; // e.g. [3, 6, 9]
  holes: CourseHoleConfig[];
}

// Collection: 'sessions'
export interface TrainingSession {
  id: string;
  groupId: string;
  title: string; // e.g., "Lähipelitreeni: Bunkkeri & Pitchit"
  sessionType: 'training' | 'level_test_event';
  date: string; // ISO date YYYY-MM-DD
  startTime: string; // e.g., "17:00"
  endTime: string; // e.g., "18:15"
  location: string; // e.g., "Lähipelialue", "Range", "Ysi-kenttä"
  coachId: string;
  rsvpPlayerIds: string[]; // Players who clicked "Osallistun / Attending"
  attendedPlayerIds: string[]; // Players checked in by Coach (+50 XP awarded)
  declinedPlayerIds?: string[]; // Players who clicked "En pääse / Decline"
}

export interface HoleScore {
  holeNumber: number; // 1 to 9
  strokes: number;
  putts: number;
  gir: boolean; // Reached green in <= 2 strokes from the division starting point
}

// Collection: 'scorecards'
export interface Scorecard {
  id: string;
  playerId: string;
  date: string;
  divisionLevel: number; // 1 to 8
  holes: HoleScore[];
  holesCount?: number; // 3, 6, or 9 (defaults to holes.length)
  targetStrokes?: number; // holesCount * 4 (12, 24, or 36)
  courseName?: string; // e.g. "Järvenranta – Etuysi"
  totalStrokes: number;
  totalPutts: number;
  totalGir: number;
  passedDivision: boolean; // true if totalStrokes <= targetStrokes
  isOfficialEvent: boolean;
  verifiedByCoach: boolean;
  notes?: string;
}

export const JARVENRANTA_DEFAULT_PARS = [4, 3, 4, 4, 3, 5, 4, 4, 4] as const;

export function getDefaultHolePar(holeNumber: number, course?: CourseConfig): number {
  const fromCourse = course?.holes.find((h) => h.holeNumber === holeNumber)?.officialPar;
  if (fromCourse) return fromCourse;
  return JARVENRANTA_DEFAULT_PARS[holeNumber - 1] ?? 4;
}

export function getTargetStrokesForHoles(holesCount: number, course?: CourseConfig): number {
  let sum = 0;
  for (let i = 1; i <= holesCount; i++) {
    sum += getDefaultHolePar(i, course);
  }
  return sum;
}

export function isGirHit(strokes: number, putts: number, holePar: number): boolean {
  const maxApproachStrokes = Math.max(1, holePar - 2); // Par 3 -> 1, Par 4 -> 2, Par 5 -> 3
  return strokes - putts <= maxApproachStrokes;
}

export function getScorecardTarget(sc: Scorecard, course?: CourseConfig): number {
  const count = sc.holesCount || sc.holes.length || 9;
  if (sc.targetStrokes && !(count === 9 && sc.targetStrokes === 36)) {
    return sc.targetStrokes;
  }
  return getTargetStrokesForHoles(count, course);
}

export const XP_REWARDS = {
  TRAINING_ATTENDANCE: 50,
  PRACTICE_ROUND: 100,
  OFFICIAL_EVENT_ROUND: 200,
  DIVISION_PASSED_BONUS: 500,
} as const;

export const DIVISIONS: Division[] = [
  {
    level: 1,
    nameKey: 'divisions.level_1.name',
    distanceKey: 'divisions.level_1.distance',
    shortLabelKey: 'divisions.level_1.short',
    badgeColor: '#38BDF8', // Crisp Sky
    targetScore: 35,
  },
  {
    level: 2,
    nameKey: 'divisions.level_2.name',
    distanceKey: 'divisions.level_2.distance',
    shortLabelKey: 'divisions.level_2.short',
    badgeColor: '#14B8A6', // Nordic Teal
    targetScore: 35,
  },
  {
    level: 3,
    nameKey: 'divisions.level_3.name',
    distanceKey: 'divisions.level_3.distance',
    shortLabelKey: 'divisions.level_3.short',
    badgeColor: '#10B981', // Fairway Emerald
    targetScore: 35,
  },
  {
    level: 4,
    nameKey: 'divisions.level_4.name',
    distanceKey: 'divisions.level_4.distance',
    shortLabelKey: 'divisions.level_4.short',
    badgeColor: '#22C55E', // Turf Green
    targetScore: 35,
  },
  {
    level: 5,
    nameKey: 'divisions.level_5.name',
    distanceKey: 'divisions.level_5.distance',
    shortLabelKey: 'divisions.level_5.short',
    badgeColor: '#818CF8', // Refined Indigo
    targetScore: 35,
  },
  {
    level: 6,
    nameKey: 'divisions.level_6.name',
    distanceKey: 'divisions.level_6.distance',
    shortLabelKey: 'divisions.level_6.short',
    badgeColor: '#F97316', // Orange Tee
    targetScore: 35,
  },
  {
    level: 7,
    nameKey: 'divisions.level_7.name',
    distanceKey: 'divisions.level_7.distance',
    shortLabelKey: 'divisions.level_7.short',
    badgeColor: '#F43F5E', // Red Tee
    targetScore: 35,
  },
  {
    level: 8,
    nameKey: 'divisions.level_8.name',
    distanceKey: 'divisions.level_8.distance',
    shortLabelKey: 'divisions.level_8.short',
    badgeColor: '#EAB308', // Yellow Tee
    targetScore: 35,
  },
];

export function getDivisionByLevel(level: number): Division {
  return DIVISIONS.find((d) => d.level === level) || DIVISIONS[0];
}
