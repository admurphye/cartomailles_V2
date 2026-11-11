// Private Node.js operator tool. No worker, transport, HTTP route or writes.
const ERRORS = new Set(['SEND_FAILED', 'ACK_FAILED', 'DELIVERY_UNCERTAIN', 'PROVIDER_CHANGED', 'IDEMPOTENCY_CONFLICT', 'PROVIDER_REJECTED', 'PROVIDER_CONFIGURATION', 'RATE_LIMIT', 'CONCURRENT_REQUEST']);
const CODES = new Set(['PARTIAL_REFUND', 'REFUND_PENDING', 'REFUND_AMBIGUOUS', 'DISPUTE', 'ZERO_INVOICE', 'CREDIT_NOTE', 'PRORATION', 'PAYMENT_UNCONFIRMED', 'OUT_OF_BAND', 'PAUSED_COLLECTION', 'REVIEW_REQUIRED']);
const hash = (v) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
function millis(v) {
  const n = v?.toMillis?.();
  if (!Number.isSafeInteger(n) || !Number.isFinite(new Date(n).getTime())) throw new Error('INVALID_RECORD');
  return n;
}
function summarize(id, data, environment, now, pendingMs) {
  const reference = hash(id) ? id : null;
  try {
    if (!reference || data.notificationId !== id || !hash(data.caseId) || data.environment !== environment ||
        !['pending', 'processing', 'sent', 'blocked'].includes(data.status) ||
        !Number.isSafeInteger(data.attempts) || data.attempts < 0 ||
        !Array.isArray(data.codes) || !data.codes.length || data.codes.length > 11 || data.codes.some((c) => !CODES.has(c)) ||
        (data.lastErrorCode !== null && !ERRORS.has(data.lastErrorCode))) throw new Error();
    const dates = {};
    for (const key of ['detectedAt', 'createdAt', 'updatedAt', 'nextAttemptAt', 'firstAttemptAt', 'leaseUntil', 'sentAt']) {
      dates[key] = data[key] === null ? null : new Date(millis(data[key])).toISOString();
    }
    if (!dates.detectedAt || !dates.createdAt || !dates.updatedAt || !dates.nextAttemptAt ||
        (data.attempts === 0) !== (data.firstAttemptAt === null) ||
        (data.status === 'processing') !== (data.leaseUntil !== null) ||
        (data.status === 'sent') !== (data.sentAt !== null) ||
        (data.status !== 'pending' && data.firstAttemptAt === null)) throw new Error();
    let deadline = null;
    if (data.firstAttemptAt !== null) {
      if (!Number.isSafeInteger(data.retentionMs) || data.retentionMs < 120000) throw new Error();
      deadline = millis(data.firstAttemptAt) + data.retentionMs - 60000;
      dates.safeRetryUntil = new Date(deadline).toISOString();
    }
    if (data.status === 'sent') return null;
    const reasons = [];
    if (data.status === 'blocked') reasons.push('BLOCKED');
    if (['PROVIDER_REJECTED', 'PROVIDER_CONFIGURATION', 'IDEMPOTENCY_CONFLICT', 'PROVIDER_CHANGED'].includes(data.lastErrorCode)) reasons.push('PERMANENT_ERROR');
    if (['ACK_FAILED', 'SEND_FAILED', 'DELIVERY_UNCERTAIN'].includes(data.lastErrorCode)) reasons.push('DELIVERY_UNCERTAIN');
    if (deadline !== null && (now >= deadline || millis(data.nextAttemptAt) >= deadline)) reasons.push('IDEMPOTENCY_WINDOW_EXHAUSTED');
    if (data.status === 'pending' && now - millis(data.detectedAt) >= pendingMs) reasons.push('PENDING_TOO_LONG');
    if (data.status === 'processing' && millis(data.leaseUntil) <= now) reasons.push('LEASE_EXPIRED');
    if (!reasons.length) return null;
    return { notificationId: reference, caseId: data.caseId, status: data.status, codes: [...new Set(data.codes)], lastErrorCode: data.lastErrorCode, attempts: data.attempts, reasons, dates };
  } catch {
    return { notificationId: reference, reasons: ['INVALID_RECORD'] };
  }
}

async function inspectNotifications({ readPage, environment, now = Date.now(), pendingMs = 6 * 3600000, maxPages = 20 }) {
  if (!['test', 'live'].includes(environment) || !Number.isSafeInteger(now) || !Number.isSafeInteger(pendingMs) || pendingMs < 60000 || !Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > 1000) throw new Error('INVALID_CONFIGURATION');
  const report = { environment, checkedAt: new Date(now).toISOString(), pendingThresholdMs: pendingMs, complete: false, scanned: 0, anomalies: [], errorCode: null, nextCursor: null };
  const seen = new Set();
  let cursor = null;
  try {
    for (let page = 0; page < maxPages; page++) {
      const docs = await readPage(cursor, 100);
      if (!Array.isArray(docs) || docs.length > 100) throw new Error();
      for (const doc of docs) {
        if (seen.has(doc.id)) continue;
        seen.add(doc.id);
        report.scanned++;
        const anomaly = summarize(doc.id, doc.data, environment, now, pendingMs);
        if (anomaly) report.anomalies.push(anomaly);
      }
      if (docs.length < 100) { report.complete = true; break; }
      const next = docs.at(-1).id;
      if (!hash(next) || next === cursor) throw new Error();
      cursor = next;
      report.nextCursor = cursor;
    }
  } catch { report.errorCode = 'FIRESTORE_SCAN_FAILED'; }
  if (report.complete) report.nextCursor = null;
  return report;
}

async function main(args = process.argv.slice(2)) {
  // Explicit target and opt-in; credentials use ADC, never the app's write-capable key.
  if (args.length !== 3 || args[0] !== '--read-only' || !/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(args[1]) || !['test', 'live'].includes(args[2]) || process.env.FIRESTORE_EMULATOR_HOST) throw new Error('INVALID_CONFIGURATION');
  const { initializeApp, applicationDefault, deleteApp } = await import('firebase-admin/app');
  const { getFirestore, FieldPath } = await import('firebase-admin/firestore');
  const app = initializeApp({ projectId: args[1], credential: applicationDefault() }, 'review-notification-monitor');
  let db;
  try {
    db = getFirestore(app);
    const collection = db.collection('stripeEnvironments').doc(args[2]).collection('reviewNotifications');
    const report = await inspectNotifications({ environment: args[2], readPage: async (cursor, limit) => {
      let query = collection.orderBy(FieldPath.documentId()).limit(limit);
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.get();
      return snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
    } });
    console.log(JSON.stringify(report, null, 2));
    return !report.complete || report.errorCode ? 2 : report.anomalies.length ? 1 : 0;
  } finally {
    try { if (db) await db.terminate(); } finally { await deleteApp(app); }
  }
}
module.exports = { inspectNotifications, summarize, main };
if (require.main === module) {
  const timeout = setTimeout(() => { console.error('MONITOR_TIMEOUT'); process.exit(2); }, 60000);
  main().then((code) => { process.exitCode = code; }).catch(() => {
    console.error('MONITOR_FAILED'); process.exitCode = 2;
  }).finally(() => clearTimeout(timeout));
}
