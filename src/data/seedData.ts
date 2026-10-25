import {
  type TrainingGroup,
  type User,
  type TrainingSession,
  type Scorecard,
  type HoleScore,
  type CourseConfig,
  type CourseHoleConfig,
  type GpsPoint,
  type TeeDivisionSpot,
  getDefaultHolePar,
  getTargetStrokesForHoles,
  isGirHit,
} from '../types/models';

function haversineMeters(a: GpsPoint, b: GpsPoint): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function pointAlongPolylineFromStart(
  pathFromGreen: GpsPoint[],
  targetMetersFromGreen: number
): GpsPoint {
  if (pathFromGreen.length === 0) {
    return { lat: 61.422787, lng: 23.002271 };
  }
  if (pathFromGreen.length === 1 || targetMetersFromGreen <= 0) {
    return {
      lat: Number(pathFromGreen[0].lat.toFixed(6)),
      lng: Number(pathFromGreen[0].lng.toFixed(6)),
    };
  }

  let accumulated = 0;
  for (let i = 0; i < pathFromGreen.length - 1; i++) {
    const start = pathFromGreen[i];
    const end = pathFromGreen[i + 1];
    const segLen = haversineMeters(start, end);
    if (segLen <= 0.001) continue;

    if (accumulated + segLen >= targetMetersFromGreen) {
      const remain = targetMetersFromGreen - accumulated;
      const t = Math.max(0, Math.min(1, remain / segLen));
      return {
        lat: Number((start.lat + (end.lat - start.lat) * t).toFixed(6)),
        lng: Number((start.lng + (end.lng - start.lng) * t).toFixed(6)),
      };
    }
    accumulated += segLen;
  }

  const last = pathFromGreen[pathFromGreen.length - 1];
  return {
    lat: Number(last.lat.toFixed(6)),
    lng: Number(last.lng.toFixed(6)),
  };
}

function buildHoleTeeSpotsAlongFairway(params: {
  yellowMeters: number;
  redMeters: number;
  orangeMeters: number;
  greenGps: GpsPoint;
  fairwayPointsTeeToGreen: GpsPoint[]; // Ordered from Tee -> Green (e.g. [vayla1, vayla2])
  redGps: GpsPoint;
  yellowGps: GpsPoint;
  dryZoneMaxLevels1To6?: boolean; // True on Hole 5 where only Red & Yellow carry water
}): TeeDivisionSpot[] {
  const {
    yellowMeters,
    redMeters,
    orangeMeters,
    greenGps,
    fairwayPointsTeeToGreen,
    redGps,
    yellowGps,
    dryZoneMaxLevels1To6 = false,
  } = params;

  // Build path starting at Green (0m) and walking back along the fairway centerline
  const waypointsFromGreen = [...fairwayPointsTeeToGreen].reverse();
  const pathFromGreenToRed: GpsPoint[] = dryZoneMaxLevels1To6
    ? [greenGps, ...waypointsFromGreen]
    : [greenGps, ...waypointsFromGreen, redGps];

  const nominalDistances: Record<number, number> = {
    1: 25,
    2: 50,
    3: Math.min(100, redMeters),
    4: Math.min(150, redMeters),
    5: Math.min(200, redMeters),
    6: orangeMeters,
    7: redMeters,
    8: yellowMeters,
  };

  return [1, 2, 3, 4, 5, 6, 7, 8].map((level) => {
    if (level === 8) {
      return {
        divisionLevel: 8,
        distanceMeters: yellowMeters,
        gps: {
          lat: Number(yellowGps.lat.toFixed(6)),
          lng: Number(yellowGps.lng.toFixed(6)),
        },
      };
    }
    if (level === 7) {
      return {
        divisionLevel: 7,
        distanceMeters: redMeters,
        gps: {
          lat: Number(redGps.lat.toFixed(6)),
          lng: Number(redGps.lng.toFixed(6)),
        },
      };
    }

    const targetDist = nominalDistances[level];
    const gpsPoint = pointAlongPolylineFromStart(pathFromGreenToRed, targetDist);
    return {
      divisionLevel: level,
      distanceMeters: targetDist,
      gps: gpsPoint,
    };
  });
}

const JARVENRANTA_HOLES: CourseHoleConfig[] = [
  {
    holeNumber: 1,
    officialPar: 4,
    club36TargetPar: 4,
    hcpIndex: 12,
    descriptionFi: 'Avausväylä klubitalon edustalta. Oikealla bunkkereita, vasemmalla out-raja.',
    descriptionEn: 'Opening Par 4 from the clubhouse. Fairway bunkers on the right, OB left.',
    greenGps: { lat: 61.425254, lng: 23.004721 },
    teeSpots: buildHoleTeeSpotsAlongFairway({
      yellowMeters: 307,
      redMeters: 267,
      orangeMeters: 225,
      yellowGps: { lat: 61.422787, lng: 23.002271 },
      redGps: { lat: 61.423096, lng: 23.002588 },
      fairwayPointsTeeToGreen: [{ lat: 61.424306, lng: 23.004101 }],
      greenGps: { lat: 61.425254, lng: 23.004721 },
    }),
  },
  {
    holeNumber: 2,
    officialPar: 3,
    club36TargetPar: 4,
    hcpIndex: 18,
    descriptionFi: 'Lyhyt par 3, jossa viheriön edessä syvä hiekkaeste ja kalteva griini.',
    descriptionEn: 'Short Par 3 guarded by a deep front bunker and a sloped green.',
    greenGps: { lat: 61.425169, lng: 23.006709 },
    teeSpots: buildHoleTeeSpotsAlongFairway({
      yellowMeters: 120,
      redMeters: 97,
      orangeMeters: 85,
      yellowGps: { lat: 61.425612, lng: 23.004829 },
      redGps: { lat: 61.425561, lng: 23.005153 },
      fairwayPointsTeeToGreen: [],
      greenGps: { lat: 61.425169, lng: 23.006709 },
    }),
  },
  {
    holeNumber: 3,
    officialPar: 4,
    club36TargetPar: 4,
    hcpIndex: 6,
    descriptionFi: 'Haastava par 4, jonka avauslyöntiä rajaavat bunkkerit molemmin puolin väylää.',
    descriptionEn: 'Challenging Par 4 framed by fairway bunkers on both sides.',
    greenGps: { lat: 61.423072, lng: 23.003456 },
    teeSpots: buildHoleTeeSpotsAlongFairway({
      yellowMeters: 326,
      redMeters: 254,
      orangeMeters: 215,
      yellowGps: { lat: 61.42521, lng: 23.007536 },
      redGps: { lat: 61.424788, lng: 23.006483 },
      fairwayPointsTeeToGreen: [
        { lat: 61.423855, lng: 23.004564 },
        { lat: 61.423424, lng: 23.003855 },
      ],
      greenGps: { lat: 61.423072, lng: 23.003456 },
    }),
  },
  {
    holeNumber: 4,
    officialPar: 4,
    club36TargetPar: 4,
    hcpIndex: 8,
    descriptionFi: 'Tasainen par 4 Riippilänjärven rantamaisemissa.',
    descriptionEn: 'Lakeside Par 4 along the shore of Lake Riippilänjärvi.',
    greenGps: { lat: 61.424716, lng: 23.008395 },
    teeSpots: buildHoleTeeSpotsAlongFairway({
      yellowMeters: 330,
      redMeters: 283,
      orangeMeters: 235,
      yellowGps: { lat: 61.422787, lng: 23.003646 },
      redGps: { lat: 61.422971, lng: 23.004596 },
      fairwayPointsTeeToGreen: [
        { lat: 61.423762, lng: 23.005886 },
        { lat: 61.424413, lng: 23.00777 },
      ],
      greenGps: { lat: 61.424716, lng: 23.008395 },
    }),
  },
  {
    holeNumber: 5,
    officialPar: 3,
    club36TargetPar: 4,
    hcpIndex: 10,
    descriptionFi:
      'Veden ylityksen vaativa par 3 (vain punainen ja keltainen tii veden takana; tasot 1–6 kuivalla puolella).',
    descriptionEn:
      'Water-carry Par 3 (only Red and Yellow tees behind water; Levels 1–6 play from the dry side).',
    greenGps: { lat: 61.423246, lng: 23.012793 },
    teeSpots: buildHoleTeeSpotsAlongFairway({
      yellowMeters: 150,
      redMeters: 110,
      orangeMeters: 52,
      yellowGps: { lat: 61.42429, lng: 23.011701 },
      redGps: { lat: 61.424097, lng: 23.011936 },
      // On Hole 5, Väylä_2 (61.423656, 23.013127) is the furthest dry point after the water (~52m from green)
      // and Väylä_1 (61.423504, 23.012933) is closer to the green (~30m from green)
      fairwayPointsTeeToGreen: [
        { lat: 61.423656, lng: 23.013127 },
        { lat: 61.423504, lng: 23.012933 },
      ],
      greenGps: { lat: 61.423246, lng: 23.012793 },
      dryZoneMaxLevels1To6: true,
    }),
  },
  {
    holeNumber: 6,
    officialPar: 5,
    club36TargetPar: 4,
    hcpIndex: 2,
    descriptionFi: 'Etuysin ainoa par 5 Riippilänjärven tuntumassa (HCP 2).',
    descriptionEn: 'The only Par 5 on the front nine, running alongside the lake (HCP 2).',
    greenGps: { lat: 61.422511, lng: 23.004058 },
    teeSpots: buildHoleTeeSpotsAlongFairway({
      yellowMeters: 523,
      redMeters: 423,
      orangeMeters: 340,
      yellowGps: { lat: 61.422769, lng: 23.012113 },
      redGps: { lat: 61.423595, lng: 23.010947 },
      fairwayPointsTeeToGreen: [
        { lat: 61.423944, lng: 23.008401 },
        { lat: 61.423093, lng: 23.005595 },
      ],
      greenGps: { lat: 61.422511, lng: 23.004058 },
    }),
  },
  {
    holeNumber: 7,
    officialPar: 4,
    club36TargetPar: 4,
    hcpIndex: 16,
    descriptionFi: 'Lyhyehkö par 4, joka tarjoaa hyvän birdie- ja par-mahdollisuuden.',
    descriptionEn: 'Reachable Par 4 offering a great scoring opportunity.',
    greenGps: { lat: 61.422538, lng: 23.007259 },
    teeSpots: buildHoleTeeSpotsAlongFairway({
      yellowMeters: 307,
      redMeters: 256,
      orangeMeters: 215,
      yellowGps: { lat: 61.42221, lng: 23.002372 },
      redGps: { lat: 61.422055, lng: 23.00331 },
      fairwayPointsTeeToGreen: [
        { lat: 61.421759, lng: 23.005506 },
        { lat: 61.422187, lng: 23.006753 },
      ],
      greenGps: { lat: 61.422538, lng: 23.007259 },
    }),
  },
  {
    holeNumber: 8,
    officialPar: 4,
    club36TargetPar: 4,
    hcpIndex: 14,
    descriptionFi: 'Järven tuntumassa kulkeva par 4, jossa tuulen suunnalla on iso merkitys.',
    descriptionEn: 'Lakeside Par 4 where wind direction plays a key role.',
    greenGps: { lat: 61.419694, lng: 23.00774 },
    teeSpots: buildHoleTeeSpotsAlongFairway({
      yellowMeters: 306,
      redMeters: 259,
      orangeMeters: 220,
      yellowGps: { lat: 61.422356, lng: 23.008019 },
      redGps: { lat: 61.421988, lng: 23.008223 },
      fairwayPointsTeeToGreen: [
        { lat: 61.421084, lng: 23.007707 },
        { lat: 61.420046, lng: 23.007323 },
      ],
      greenGps: { lat: 61.419694, lng: 23.00774 },
    }),
  },
  {
    holeNumber: 9,
    officialPar: 4,
    club36TargetPar: 4,
    hcpIndex: 4,
    descriptionFi: 'Etuysin päättävä par 4 takaisin kohti klubitaloa.',
    descriptionEn: 'Closing Par 4 leading back toward the Lakeside clubhouse.',
    greenGps: { lat: 61.421801, lng: 23.002318 },
    teeSpots: buildHoleTeeSpotsAlongFairway({
      yellowMeters: 355,
      redMeters: 304,
      orangeMeters: 250,
      yellowGps: { lat: 61.419611, lng: 23.006782 },
      redGps: { lat: 61.419882, lng: 23.006101 },
      fairwayPointsTeeToGreen: [
        { lat: 61.420667, lng: 23.005136 },
        { lat: 61.42158, lng: 23.003264 },
      ],
      greenGps: { lat: 61.421801, lng: 23.002318 },
    }),
  },
];

export const SEED_COURSE_CONFIG: CourseConfig = {
  id: 'lakeside-jarvenranta-etuysi',
  clubName: 'Lakeside Golf Vammala',
  courseName: 'Järvenranta – Etuysi (Väylät 1–9)',
  address: 'Sastamalantie 1901, 38100 Sastamala',
  defaultHoleCount: 9,
  supportedHoleCounts: [3, 6, 9],
  holes: JARVENRANTA_HOLES,
};

function getRelativeDateISO(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildHoleScores(strokesArr: number[], puttsArr: number[]): HoleScore[] {
  return strokesArr.map((strokes, idx) => {
    const holeNumber = idx + 1;
    const putts = puttsArr[idx] ?? 2;
    const holePar = getDefaultHolePar(holeNumber);
    return {
      holeNumber,
      strokes,
      putts,
      gir: isGirHit(strokes, putts, holePar),
    };
  });
}

function createSeedScorecard(
  id: string,
  playerId: string,
  offsetDays: number,
  divisionLevel: number,
  strokesArr: number[],
  puttsArr: number[],
  isOfficialEvent: boolean,
  verifiedByCoach: boolean
): Scorecard {
  const holes = buildHoleScores(strokesArr, puttsArr);
  const totalStrokes = holes.reduce((acc, h) => acc + h.strokes, 0);
  const totalPutts = holes.reduce((acc, h) => acc + h.putts, 0);
  const totalGir = holes.filter((h) => h.gir).length;
  const targetStrokes = getTargetStrokesForHoles(holes.length);

  return {
    id,
    playerId,
    date: getRelativeDateISO(offsetDays),
    divisionLevel,
    holes,
    holesCount: holes.length,
    targetStrokes,
    courseName: 'Järvenranta – Etuysi',
    totalStrokes,
    totalPutts,
    totalGir,
    passedDivision: totalStrokes <= targetStrokes,
    isOfficialEvent,
    verifiedByCoach,
  };
}

export const SEED_GROUPS: TrainingGroup[] = [
  {
    id: 'grp-startti',
    name: 'Starttiryhmä 8–10v',
    description: 'Aloittelijoiden peli-iloa, golfin perustaitoja sekä 25m–50m kenttähaasteita.',
    colorTag: '#38BDF8',
    coachIds: ['coach-noora'],
  },
  {
    id: 'grp-haastajat',
    name: 'Haastajat 11–13v',
    description: 'Aktiivisten junioreiden lajiryhmä (100m–200m tasot ja kohti Oranssia tiitä).',
    colorTag: '#10B981',
    coachIds: ['coach-joonas'],
  },
  {
    id: 'grp-kilpa',
    name: 'Kilpajunnut 13–15v',
    description: 'Tavoitteelliset juniorit (200m, Oranssi tii, Punainen tii ja Keltainen tii).',
    colorTag: '#F97316',
    coachIds: ['coach-joonas', 'admin-mikko'],
  },
];

export const SEED_USERS: User[] = [
  // 1 Admin
  {
    id: 'admin-mikko',
    email: 'mikko.laaksonen@club36golf.fi',
    name: 'Mikko Laaksonen',
    role: 'admin',
    preferredLanguage: 'fi',
    groupIds: ['grp-kilpa'],
    currentDivision: 8,
    xp: 4500,
    attendanceCount: 42,
    createdAt: '2026-01-10T09:00:00Z',
  },
  // 2 Coaches
  {
    id: 'coach-joonas',
    email: 'joonas.niemi@club36golf.fi',
    name: 'Joonas Niemi (PGA Pro)',
    role: 'coach',
    preferredLanguage: 'fi',
    groupIds: ['grp-haastajat', 'grp-kilpa'],
    currentDivision: 8,
    xp: 3800,
    attendanceCount: 38,
    createdAt: '2026-01-12T09:00:00Z',
  },
  {
    id: 'coach-noora',
    email: 'noora.makinen@club36golf.fi',
    name: 'Noora Mäkinen',
    role: 'coach',
    preferredLanguage: 'fi',
    groupIds: ['grp-startti'],
    currentDivision: 7,
    xp: 3200,
    attendanceCount: 34,
    createdAt: '2026-01-15T09:00:00Z',
  },
  // 8 Junior Players spread across divisions 1 to 6
  {
    id: 'player-onni',
    email: 'onni.virtanen@juniori.fi',
    name: 'Onni Virtanen',
    role: 'player',
    preferredLanguage: 'fi',
    groupIds: ['grp-haastajat', 'grp-kilpa'],
    currentDivision: 5, // Level 5: 200m (Personal best 38 strokes -> 2 strokes from Level 6: Orange Tee)
    xp: 2850,
    attendanceCount: 19,
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'player-aada',
    email: 'aada.korhonen@juniori.fi',
    name: 'Aada Korhonen',
    role: 'player',
    preferredLanguage: 'fi',
    groupIds: ['grp-kilpa'],
    currentDivision: 5, // Level 5: 200m (1 stroke away from Orange Tee + has a pending 35-stroke round!)
    xp: 3125,
    attendanceCount: 22,
    createdAt: '2026-03-02T10:00:00Z',
  },
  {
    id: 'player-eeli',
    email: 'eeli.laine@juniori.fi',
    name: 'Eeli Laine',
    role: 'player',
    preferredLanguage: 'fi',
    groupIds: ['grp-kilpa'],
    currentDivision: 6, // Level 6: Orange Tee
    xp: 3650,
    attendanceCount: 24,
    createdAt: '2026-03-01T11:00:00Z',
  },
  {
    id: 'player-sofia',
    email: 'sofia.heikkinen@juniori.fi',
    name: 'Sofia Heikkinen',
    role: 'player',
    preferredLanguage: 'fi',
    groupIds: ['grp-haastajat'],
    currentDivision: 4, // Level 4: 150m
    xp: 2350,
    attendanceCount: 18,
    createdAt: '2026-03-05T12:00:00Z',
  },
  {
    id: 'player-veeti',
    email: 'veeti.koskinen@juniori.fi',
    name: 'Veeti Koskinen',
    role: 'player',
    preferredLanguage: 'fi',
    groupIds: ['grp-haastajat'],
    currentDivision: 3, // Level 3: 100m
    xp: 1925,
    attendanceCount: 15,
    createdAt: '2026-03-08T12:00:00Z',
  },
  {
    id: 'player-isla',
    email: 'isla.jarvinen@juniori.fi',
    name: 'Isla Järvinen',
    role: 'player',
    preferredLanguage: 'fi',
    groupIds: ['grp-startti'],
    currentDivision: 2, // Level 2: 50m (Super diligent beginner with 23 trainings!)
    xp: 2775,
    attendanceCount: 23,
    createdAt: '2026-03-10T12:00:00Z',
  },
  {
    id: 'player-ella',
    email: 'ella.salminen@juniori.fi',
    name: 'Ella Salminen',
    role: 'player',
    preferredLanguage: 'fi',
    groupIds: ['grp-startti', 'grp-haastajat'],
    currentDivision: 3, // Level 3: 100m
    xp: 2100,
    attendanceCount: 17,
    createdAt: '2026-03-12T12:00:00Z',
  },
  {
    id: 'player-lukas',
    email: 'lukas.lehtonen@juniori.fi',
    name: 'Lukas Lehtonen',
    role: 'player',
    preferredLanguage: 'fi',
    groupIds: ['grp-startti'],
    currentDivision: 1, // Level 1: 25m
    xp: 1250,
    attendanceCount: 14,
    createdAt: '2026-04-01T12:00:00Z',
  },
];

export const SEED_SESSIONS: TrainingSession[] = [
  {
    id: 'sess-1',
    groupId: 'grp-haastajat',
    title: 'Lähipelitreeni: Bunkkeri, Pitchit & 35-vauhtikoe',
    sessionType: 'training',
    date: getRelativeDateISO(0), // Today!
    startTime: '17:00',
    endTime: '18:15',
    location: 'Lähipelialue & Viheriö 1',
    coachId: 'coach-joonas',
    rsvpPlayerIds: ['player-onni', 'player-sofia', 'player-veeti', 'player-ella'],
    attendedPlayerIds: ['player-sofia', 'player-veeti'],
  },
  {
    id: 'sess-2',
    groupId: 'grp-startti',
    title: 'Puttikellon mestaruus & 25m–50m lähestymiset',
    sessionType: 'training',
    date: getRelativeDateISO(0), // Today!
    startTime: '16:00',
    endTime: '17:00',
    location: 'Harjoitusviheriö & Par 3 -kenttä',
    coachId: 'coach-noora',
    rsvpPlayerIds: ['player-isla', 'player-lukas', 'player-ella'],
    attendedPlayerIds: ['player-isla'],
  },
  {
    id: 'sess-3',
    groupId: 'grp-kilpa',
    title: '200m & Oranssi tii: Väylälyönnit ja pelistrategia',
    sessionType: 'training',
    date: getRelativeDateISO(1), // Tomorrow
    startTime: '17:30',
    endTime: '19:00',
    location: 'Range & Väylät 1–4',
    coachId: 'coach-joonas',
    rsvpPlayerIds: ['player-onni', 'player-aada', 'player-eeli'],
    attendedPlayerIds: [],
  },
  {
    id: 'sess-4',
    groupId: 'grp-haastajat',
    title: 'Virallinen 35 Klubi Tasokoepäivä (9 reikää)',
    sessionType: 'level_test_event',
    date: getRelativeDateISO(2),
    startTime: '16:30',
    endTime: '18:45',
    location: 'Ysi-kenttä (Tii 1)',
    coachId: 'coach-joonas',
    rsvpPlayerIds: ['player-onni', 'player-sofia', 'player-veeti', 'player-ella'],
    attendedPlayerIds: [],
  },
  {
    id: 'sess-5',
    groupId: 'grp-startti',
    title: 'Virallinen 35 Klubi Tasokoepäivä: 25m & 50m (9 reikää)',
    sessionType: 'level_test_event',
    date: getRelativeDateISO(3),
    startTime: '16:00',
    endTime: '17:45',
    location: 'Ysi-kenttä (25m / 50m tii)',
    coachId: 'coach-noora',
    rsvpPlayerIds: ['player-isla', 'player-lukas'],
    attendedPlayerIds: [],
  },
  {
    id: 'sess-6',
    groupId: 'grp-kilpa',
    title: 'Virallinen 35 Klubi Tasokoepäivä: 200m & Oranssi tii',
    sessionType: 'level_test_event',
    date: getRelativeDateISO(4),
    startTime: '17:00',
    endTime: '19:15',
    location: 'Pääkenttä (Reiät 1–9)',
    coachId: 'coach-joonas',
    rsvpPlayerIds: ['player-onni', 'player-aada', 'player-eeli'],
    attendedPlayerIds: [],
  },
  {
    id: 'sess-7',
    groupId: 'grp-startti',
    title: 'Rautalyönnin osuma & hauska tiimiviesti',
    sessionType: 'training',
    date: getRelativeDateISO(5),
    startTime: '16:00',
    endTime: '17:00',
    location: 'Range (Alakatos)',
    coachId: 'coach-noora',
    rsvpPlayerIds: ['player-isla', 'player-lukas', 'player-ella'],
    attendedPlayerIds: [],
  },
  {
    id: 'sess-8',
    groupId: 'grp-haastajat',
    title: 'Wedge-etäisyyskontrolli (50m / 75m / 100m)',
    sessionType: 'training',
    date: getRelativeDateISO(6),
    startTime: '17:00',
    endTime: '18:15',
    location: 'Range & Lähipelialue',
    coachId: 'coach-joonas',
    rsvpPlayerIds: ['player-onni', 'player-sofia', 'player-veeti'],
    attendedPlayerIds: [],
  },
  {
    id: 'sess-9',
    groupId: 'grp-kilpa',
    title: 'Paineensieto & Up-and-Down haastekisa',
    sessionType: 'training',
    date: getRelativeDateISO(7),
    startTime: '18:00',
    endTime: '19:30',
    location: 'Lähipelialue & Viheriö 9',
    coachId: 'coach-joonas',
    rsvpPlayerIds: ['player-aada', 'player-eeli'],
    attendedPlayerIds: [],
  },
];

export const SEED_SCORECARDS: Scorecard[] = [
  // Onni Virtanen (Level 5: 200m) - PB on 200m is 38 strokes (2 strokes from Orange Tee!), passed Level 4 (150m) with 35
  createSeedScorecard(
    'sc-onni-1',
    'player-onni',
    -2,
    5, // Level 5: 200m -> Total 38 strokes
    [4, 4, 5, 4, 4, 5, 4, 4, 4],
    [2, 2, 2, 2, 1, 2, 2, 2, 2],
    true,
    true
  ),
  createSeedScorecard(
    'sc-onni-2',
    'player-onni',
    -7,
    5, // Level 5: 200m -> Total 40 strokes
    [5, 4, 5, 4, 5, 4, 4, 5, 4],
    [2, 2, 2, 2, 2, 2, 1, 2, 2],
    false,
    true
  ),
  createSeedScorecard(
    'sc-onni-3',
    'player-onni',
    -15,
    4, // Passed Level 4: 150m with 35 strokes!
    [4, 4, 3, 4, 4, 4, 4, 4, 4],
    [2, 1, 1, 2, 2, 2, 2, 2, 1],
    true,
    true
  ),
  createSeedScorecard(
    'sc-onni-4',
    'player-onni',
    -24,
    4, // Level 4: 150m practice round -> 38 strokes
    [4, 5, 4, 4, 4, 5, 4, 4, 4],
    [2, 2, 2, 2, 2, 2, 1, 2, 2],
    false,
    true
  ),
  createSeedScorecard(
    'sc-onni-5',
    'player-onni',
    -35,
    3, // Passed Level 3: 100m with 35 strokes!
    [4, 3, 4, 4, 4, 4, 4, 4, 4],
    [2, 2, 1, 2, 2, 1, 2, 2, 2],
    true,
    true
  ),
  createSeedScorecard(
    'sc-onni-6',
    'player-onni',
    -48,
    2, // Passed Level 2: 50m with 34 strokes!
    [3, 4, 4, 4, 3, 4, 4, 4, 4],
    [1, 2, 2, 1, 1, 2, 2, 2, 1],
    true,
    true
  ),

  // Aada Korhonen (Level 5: 200m) - PB verified is 37 strokes (1 stroke from Orange Tee), PLUS a pending 35-stroke round awaiting Coach verification!
  createSeedScorecard(
    'sc-aada-pending',
    'player-aada',
    -1,
    5, // Level 5: 200m -> Shot 35! Pending verification by Coach to unlock Level 6: Orange Tee!
    [4, 4, 4, 3, 4, 4, 4, 4, 4],
    [2, 1, 2, 1, 2, 2, 1, 2, 2],
    true,
    false
  ),
  createSeedScorecard(
    'sc-aada-1',
    'player-aada',
    -6,
    5, // Level 5: 200m -> Shot 37 (1 stroke away from Orange Tee)
    [4, 4, 4, 4, 5, 4, 4, 4, 4],
    [2, 2, 2, 1, 2, 2, 2, 2, 2],
    true,
    true
  ),
  createSeedScorecard(
    'sc-aada-2',
    'player-aada',
    -18,
    4, // Passed Level 4: 150m with 34 strokes
    [4, 3, 4, 4, 4, 3, 4, 4, 4],
    [1, 1, 2, 2, 2, 1, 2, 2, 1],
    true,
    true
  ),

  // Eeli Laine (Already on Level 6: Orange Tee!)
  createSeedScorecard(
    'sc-eeli-1',
    'player-eeli',
    -3,
    6, // Level 6: Orange Tee -> Shot 38 strokes
    [4, 5, 4, 4, 4, 5, 4, 4, 4],
    [2, 2, 2, 2, 1, 2, 2, 2, 2],
    false,
    true
  ),
  createSeedScorecard(
    'sc-eeli-2',
    'player-eeli',
    -10,
    5, // Passed Level 5: 200m with 35 strokes -> Unlocked Orange Tee!
    [4, 4, 4, 3, 4, 4, 4, 4, 4],
    [2, 2, 1, 1, 2, 2, 2, 1, 2],
    true,
    true
  ),

  // Sofia Heikkinen (Level 4: 150m)
  createSeedScorecard(
    'sc-sofia-1',
    'player-sofia',
    -4,
    4, // Level 4: 150m -> 39 strokes
    [4, 5, 4, 4, 5, 4, 4, 5, 4],
    [2, 2, 2, 2, 2, 2, 2, 2, 2],
    false,
    true
  ),
  createSeedScorecard(
    'sc-sofia-2',
    'player-sofia',
    -12,
    3, // Passed Level 3: 100m with 35 strokes!
    [4, 4, 4, 4, 3, 4, 4, 4, 4],
    [2, 2, 2, 1, 2, 2, 2, 2, 1],
    true,
    true
  ),

  // Veeti Koskinen (Level 3: 100m)
  createSeedScorecard(
    'sc-veeti-1',
    'player-veeti',
    -5,
    3, // Level 3: 100m -> 39 strokes
    [4, 4, 5, 4, 5, 4, 5, 4, 4],
    [2, 2, 2, 2, 2, 2, 2, 2, 2],
    false,
    true
  ),
  createSeedScorecard(
    'sc-veeti-2',
    'player-veeti',
    -14,
    2, // Passed Level 2: 50m with 35 strokes
    [4, 4, 3, 4, 4, 4, 4, 4, 4],
    [1, 2, 1, 2, 2, 2, 2, 1, 2],
    true,
    true
  ),

  // Isla Järvinen (Level 2: 50m)
  createSeedScorecard(
    'sc-isla-1',
    'player-isla',
    -3,
    2, // Level 2: 50m -> 37 strokes (1 stroke from 100m!)
    [4, 4, 4, 4, 5, 4, 4, 4, 4],
    [2, 2, 1, 2, 2, 2, 2, 2, 1],
    true,
    true
  ),
  createSeedScorecard(
    'sc-isla-2',
    'player-isla',
    -9,
    1, // Passed Level 1: 25m with 33 strokes!
    [3, 4, 4, 3, 4, 4, 3, 4, 4],
    [1, 2, 1, 1, 2, 2, 1, 2, 1],
    true,
    true
  ),

  // Ella Salminen (Level 3: 100m)
  createSeedScorecard(
    'sc-ella-1',
    'player-ella',
    -4,
    3, // Level 3: 100m -> 38 strokes
    [4, 4, 5, 4, 4, 5, 4, 4, 4],
    [2, 2, 2, 2, 2, 2, 1, 2, 2],
    false,
    true
  ),
  createSeedScorecard(
    'sc-ella-2',
    'player-ella',
    -16,
    2, // Passed Level 2: 50m with 35 strokes
    [4, 3, 4, 4, 4, 4, 4, 4, 4],
    [2, 2, 2, 2, 1, 2, 2, 1, 2],
    true,
    true
  ),

  // Lukas Lehtonen (Level 1: 25m) - Pending 35-stroke round on 25m awaiting Coach verification!
  createSeedScorecard(
    'sc-lukas-pending',
    'player-lukas',
    -1,
    1, // Level 1: 25m -> 35 strokes! Pending coach verification
    [4, 3, 4, 4, 4, 4, 4, 4, 4],
    [2, 2, 2, 1, 2, 2, 2, 1, 2],
    true,
    false
  ),
  createSeedScorecard(
    'sc-lukas-1',
    'player-lukas',
    -8,
    1, // Level 1: 25m -> 41 strokes
    [5, 4, 5, 5, 4, 5, 4, 5, 4],
    [2, 2, 2, 2, 2, 2, 2, 2, 2],
    false,
    true
  ),
];
