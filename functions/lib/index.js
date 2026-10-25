"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.weeklyTrainingSummaryAndSessionGenerator = exports.onScorecardVerified = exports.onUserRoleUpdated = exports.inviteUser = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const node_crypto_1 = require("node:crypto");
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_2 = require("firebase-admin/firestore");
(0, app_1.initializeApp)();
const db = (0, firestore_2.getFirestore)();
const adminAuth = (0, auth_1.getAuth)();
/**
 * Callable Function: inviteUser (admin only)
 * Creates the Firebase Auth account (random throw-away password) and the Firestore profile
 * `users/{uid}` for an invited player/coach. The client then triggers Firebase's standard
 * "set your password" e-mail (sendPasswordResetEmail), which acts as the invitation.
 */
exports.inviteUser = (0, https_1.onCall)({ region: 'europe-north1' }, async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid)
        throw new https_1.HttpsError('unauthenticated', 'Sign in required.');
    const callerSnap = await db.collection('users').doc(callerUid).get();
    if (callerSnap.data()?.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Admin role required.');
    }
    const data = request.data;
    const email = (data.email || '').trim().toLowerCase();
    const name = (data.name || '').trim();
    const role = ['admin', 'coach', 'player'].includes(data.role || '') ? data.role : 'player';
    if (!email || !name)
        throw new https_1.HttpsError('invalid-argument', 'Name and email are required.');
    let uid;
    try {
        const existing = await adminAuth.getUserByEmail(email);
        uid = existing.uid;
    }
    catch {
        const created = await adminAuth.createUser({
            email,
            displayName: name,
            password: (0, node_crypto_1.randomBytes)(24).toString('base64url'),
        });
        uid = created.uid;
    }
    await db
        .collection('users')
        .doc(uid)
        .set({
        id: uid,
        email,
        name,
        role,
        groupIds: Array.isArray(data.groupIds) ? data.groupIds : [],
        currentDivision: Math.max(1, Math.min(8, Number(data.currentDivision) || 1)),
        xp: 0,
        attendanceCount: 0,
        createdAt: new Date().toISOString(),
    }, { merge: true });
    logger.info(`Invited user ${email} (${uid}) as ${role}`);
    return { uid };
});
/**
 * 2nd Gen Cloud Function Trigger: onUserRoleUpdated
 * Synchronizes user role ('admin' | 'coach' | 'player') from Firestore `users/{userId}`
 * into Firebase Authentication Custom Claims for RBAC security rules.
 */
exports.onUserRoleUpdated = (0, firestore_1.onDocumentWritten)({
    document: 'users/{userId}',
    region: 'europe-north1',
}, async (event) => {
    const afterData = event.data?.after.data();
    if (!afterData)
        return;
    const beforeData = event.data?.before.data();
    const newRole = afterData.role;
    const oldRole = beforeData?.role;
    if (!newRole || newRole === oldRole)
        return;
    const userId = event.params.userId;
    try {
        await adminAuth.setCustomUserClaims(userId, { role: newRole });
        logger.info(`Synced Firebase Custom Claim role='${newRole}' for user ${userId}`);
    }
    catch (err) {
        logger.warn(`Could not set custom claims for user ${userId} (may be seed user):`, err);
    }
});
/**
 * 2nd Gen Cloud Function Trigger: onScorecardVerified
 * Audit log only. XP & division changes are currently applied by the client when a coach verifies
 * a scorecard (see AppContext.verifyScorecard); awarding them here as well would double-count.
 * TODO (hardening): move XP/division updates here and remove them from the client.
 */
exports.onScorecardVerified = (0, firestore_1.onDocumentUpdated)({
    document: 'scorecards/{scorecardId}',
    region: 'europe-north1',
}, async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData)
        return;
    if (!beforeData.verifiedByCoach && afterData.verifiedByCoach) {
        logger.info(`Scorecard ${event.params.scorecardId} verified`, {
            playerId: afterData.playerId,
            totalStrokes: afterData.totalStrokes,
            divisionLevel: afterData.divisionLevel,
            isOfficialEvent: Boolean(afterData.isOfficialEvent),
        });
    }
});
/**
 * 2nd Gen Cloud Scheduler Hook: weeklyTrainingSummaryAndSessionGenerator
 * Runs every Monday at 07:00 Europe/Helsinki time to generate weekly summaries & recurring sessions.
 */
exports.weeklyTrainingSummaryAndSessionGenerator = (0, scheduler_1.onSchedule)({
    schedule: 'every monday 07:00',
    timeZone: 'Europe/Helsinki',
    region: 'europe-north1',
}, async () => {
    logger.info('Executing weekly training summary & recurring session check for Club 36...');
    const scorecardsSnap = await db
        .collection('scorecards')
        .where('passedDivision', '==', true)
        .limit(20)
        .get();
    logger.info(`Found ${scorecardsSnap.size} passed division rounds in Club 36 records.`);
});
//# sourceMappingURL=index.js.map