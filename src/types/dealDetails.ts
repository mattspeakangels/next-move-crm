export interface CommercialLine {
  id: string;
  product: string;
  variant: string;
  quantity: string;
  dealerPrice: string;
  suggestedPrice: string;
  endUserPrice: string;
}
export interface CommercialDetails {
  dealerId: string;
  endUserId: string;
  salesMode: 'direct' | 'tender';
  tenderDeadline: string;
  competitor: string;
  lines: CommercialLine[];
  notes: string;
  vas?: { managedBy: 'blaklader' | 'dealer' | 'customer'; technique: string; logo: string; position: string; dimensions: string; colours: string; quantity: string; moq: string; processing: string; setupCost: string; discount: string } | null;
}

export type OperationalStage = 'offer' | 'outcome' | 'award' | 'order' | 'vas' | 'shipped' | 'delivered';
export interface FlowEvent { id: string; stage: OperationalStage; note: string; at: number }
export interface RenderingVersion { id: string; name: string; reference: string; emailReference: string; status: 'draft' | 'sent' | 'approved' | 'changes_requested'; createdAt: number; history: { status: RenderingVersion['status']; at: number }[] }
export interface OperationalFlow { events: FlowEvent[]; renderings: RenderingVersion[]; tracking: string }
