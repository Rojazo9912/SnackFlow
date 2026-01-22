export interface CashSession {
  id: string;
  tenantId: string;
  userId: string;
  openingAmount: number;
  closingAmount?: number;
  expectedAmount?: number;
  difference?: number;
  status: CashSessionStatus;
  openedAt: string;
  closedAt?: string;
}

export type CashSessionStatus = 'open' | 'closed';

export interface CashMovement {
  id: string;
  sessionId: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  createdAt: string;
}

export type CashMovementType = 'deposit' | 'withdrawal';

export interface CashSessionWithUser extends CashSession {
  user: { id: string; name: string };
}
