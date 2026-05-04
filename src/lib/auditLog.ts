import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { AuditLog, AuditOperation } from '../types';

export async function logAuditEvent(
  userId: string,
  collectionName: string,
  documentId: string,
  operation: AuditOperation,
  previousValues?: Record<string, any>,
  newValues?: Record<string, any>
) {
  try {
    const changes = calculateChanges(previousValues || {}, newValues || {});

    const auditEntry: Omit<AuditLog, 'id'> = {
      timestamp: Date.now(),
      collection: collectionName,
      documentId,
      operation,
      changes: Object.keys(changes).length > 0 ? changes : undefined,
      previousValues: previousValues && Object.keys(previousValues).length > 0 ? previousValues : undefined,
      newValues: newValues && Object.keys(newValues).length > 0 ? newValues : undefined,
    };

    const auditCollection = collection(db, 'users', userId, 'audit_logs');
    await addDoc(auditCollection, auditEntry);
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

function calculateChanges(
  previous: Record<string, any>,
  current: Record<string, any>
): Record<string, { from: any; to: any }> {
  const changes: Record<string, { from: any; to: any }> = {};

  // Check for updated/new fields
  for (const key in current) {
    if (previous[key] !== current[key]) {
      changes[key] = { from: previous[key], to: current[key] };
    }
  }

  // Check for deleted fields
  for (const key in previous) {
    if (!(key in current)) {
      changes[key] = { from: previous[key], to: undefined };
    }
  }

  return changes;
}

export async function getAuditLogs(userId: string, limit = 100): Promise<AuditLog[]> {
  try {
    const auditCollection = collection(db, 'users', userId, 'audit_logs');
    const snapshot = await getDocs(auditCollection);

    const logs: AuditLog[] = [];
    snapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...(doc.data() as Omit<AuditLog, 'id'>) });
    });

    return logs.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return [];
  }
}
