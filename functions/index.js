const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Storage } = require("@google-cloud/storage");

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const storage = new Storage();

/**
 * HTTP Cloud Function that exports Firestore to Google Cloud Storage
 * Triggered by Cloud Scheduler daily
 */
exports.firestoreBackup = functions.https.onRequest(async (req, res) => {
  try {
    // Validate request origin (Cloud Scheduler)
    const authToken = req.headers.authorization?.split("Bearer ")[1];
    const expectedToken = process.env.CLOUD_SCHEDULER_TOKEN;

    if (!authToken || authToken !== expectedToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || admin.apps[0].options.projectId;
    const bucketName = process.env.BACKUP_BUCKET_NAME;

    if (!bucketName) {
      throw new Error("BACKUP_BUCKET_NAME environment variable not set");
    }

    console.log(`[Backup] Starting Firestore export for project: ${projectId}`);
    console.log(`[Backup] Target bucket: ${bucketName}`);

    // Create backup filename with timestamp
    const now = new Date();
    const timestamp = now.toISOString().split(".")[0].replace(/[:-]/g, "");
    const backupFileName = `firestore-backup-${now.toISOString().split("T")[0]}-${timestamp}.json`;
    const backupPath = `firestore-backups/${backupFileName}`;

    // Export all collections from Firestore
    const db = admin.firestore();
    const backup = {};
    const collectionsToBackup = [
      "contacts",
      "deals",
      "offers",
      "products",
      "activities",
      "assets",
      "salesTransactions",
    ];

    // Export each collection
    for (const collection of collectionsToBackup) {
      console.log(`[Backup] Exporting collection: ${collection}`);
      const snapshot = await db.collection(collection).get();
      backup[collection] = [];

      snapshot.forEach((doc) => {
        backup[collection].push({
          id: doc.id,
          ...doc.data(),
        });
      });

      console.log(`[Backup] Exported ${backup[collection].length} documents from ${collection}`);
    }

    // Add metadata
    backup._metadata = {
      exportedAt: new Date().toISOString(),
      projectId,
      version: "1.0",
      collections: collectionsToBackup,
      documentCount: Object.values(backup)
        .filter((v) => Array.isArray(v))
        .reduce((sum, arr) => sum + arr.length, 0),
    };

    // Upload to Cloud Storage
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(backupPath);

    await file.save(JSON.stringify(backup, null, 2), {
      metadata: {
        contentType: "application/json",
        metadata: {
          timestamp: new Date().toISOString(),
          projectId,
        },
      },
    });

    console.log(`[Backup] Successfully uploaded backup to gs://${bucketName}/${backupPath}`);

    // Cleanup old backups (keep only last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [files] = await bucket.getFiles({ prefix: "firestore-backups/" });

    for (const oldFile of files) {
      const fileDate = new Date(oldFile.metadata.timeCreated);
      if (fileDate < thirtyDaysAgo) {
        console.log(`[Backup] Deleting old backup: ${oldFile.name}`);
        await oldFile.delete();
      }
    }

    return res.status(200).json({
      success: true,
      message: "Backup completed successfully",
      backupPath,
      documentCount: backup._metadata.documentCount,
      timestamp: backup._metadata.exportedAt,
    });
  } catch (error) {
    console.error("[Backup] Error during export:", error);

    return res.status(500).json({
      error: "Backup failed",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Cloud Function to restore Firestore from backup (manual trigger)
 * WARNING: This will overwrite existing data!
 */
exports.firestoreRestore = functions.https.onRequest(async (req, res) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authToken = req.headers.authorization?.split("Bearer ")[1];
    const expectedToken = process.env.CLOUD_SCHEDULER_TOKEN;

    if (!authToken || authToken !== expectedToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { backupPath } = req.body;

    if (!backupPath) {
      return res.status(400).json({ error: "backupPath required in request body" });
    }

    const bucketName = process.env.BACKUP_BUCKET_NAME;
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(backupPath);

    // Download backup
    console.log(`[Restore] Downloading backup from gs://${bucketName}/${backupPath}`);
    const [contents] = await file.download();
    const backup = JSON.parse(contents.toString());

    // Validate backup structure
    if (!backup._metadata || !backup._metadata.collections) {
      throw new Error("Invalid backup file structure");
    }

    const db = admin.firestore();
    let restoredDocuments = 0;

    // Restore each collection
    for (const collection of backup._metadata.collections) {
      if (!Array.isArray(backup[collection])) {
        console.warn(`[Restore] Skipping invalid collection: ${collection}`);
        continue;
      }

      console.log(`[Restore] Restoring collection: ${collection}`);

      for (const docData of backup[collection]) {
        const { id, ...data } = docData;
        await db.collection(collection).doc(id).set(data, { merge: false });
        restoredDocuments++;
      }

      console.log(`[Restore] Restored ${backup[collection].length} documents to ${collection}`);
    }

    return res.status(200).json({
      success: true,
      message: "Restore completed successfully",
      backupPath,
      restoredDocuments,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Restore] Error during restore:", error);

    return res.status(500).json({
      error: "Restore failed",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});
