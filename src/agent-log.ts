export type AgentActionType = 'CREATE_SO' | 'CREATE_PO' | 'STOCK_TRANSFER' | 'IDLE' | (string & {});

export type AgentCommandDirection = 'left' | 'right' | 'up' | 'down';

export interface AgentLog {
  action_type: AgentActionType;
  durationMs?: number;
  direction?: AgentCommandDirection;
  note?: string;
}
