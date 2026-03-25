import admin from 'firebase-admin';
import fs from 'fs';
import { Logger } from '../utils/Logger';

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (!serviceAccountJson && !serviceAccountPath) {
  Logger.warn('Firebase', 'Firebase service account not configured; Firebase features disabled');
} else if (admin.apps.length === 0) {
  if (serviceAccountJson) {
    try {
      const credentials = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(credentials),
      });
    } catch (error) {
      Logger.warn('Firebase', 'Invalid Firebase service account JSON; Firebase features disabled', {
        error,
      });
    }
  } else if (serviceAccountPath) {
    if (!fs.existsSync(serviceAccountPath)) {
      Logger.warn('Firebase', 'Firebase service account path not found; Firebase features disabled', {
        serviceAccountPath,
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
      });
    }
  }
}

export { admin };