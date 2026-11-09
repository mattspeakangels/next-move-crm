export interface CustomerCommunication {
  id: string; ownerId: string; workspaceId: string; contactId: string; dealId: string;
  subject: string; reference: string; receivedAt: string; classification: 'request' | 'update';
  description: string; department: string; nextAction: string; createdAt: number; updatedAt: number;
}
