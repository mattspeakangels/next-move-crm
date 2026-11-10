export interface CustomerRequest {
  id: string;
  workspaceId: string;
  ownerId: string;
  contactId: string;
  dealId: string;
  category: 'after_sales' | 'marketing';
  kind: string;
  description: string;
  status: 'open' | 'in_progress' | 'closed';
  department: string;
  nextAction: string;
  dueDate: string;
  references: string;
  createdAt: number;
  updatedAt: number;
}
