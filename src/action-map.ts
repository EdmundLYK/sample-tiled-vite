import { AgentActionType } from './agent-log';

export type AgentBehaviorKind = 'typing' | 'walking' | 'idle';

export interface ActionMapEntry {
  behavior: AgentBehaviorKind;
  defaultDurationMs: number;
}

export const ACTION_MAP: Partial<Record<AgentActionType, ActionMapEntry>> = {
  CREATE_SO: {
    behavior: 'typing',
    defaultDurationMs: 5000
  },
  CREATE_PO: {
    behavior: 'typing',
    defaultDurationMs: 5000
  },
  STOCK_TRANSFER: {
    behavior: 'walking',
    defaultDurationMs: 2200
  },
  IDLE: {
    behavior: 'idle',
    defaultDurationMs: 1800
  }
};

const DEFAULT_ACTION_MAP_ENTRY: ActionMapEntry = {
  behavior: 'idle',
  defaultDurationMs: 1800
};

export function getActionMapEntry(actionType: AgentActionType): ActionMapEntry {
  return ACTION_MAP[actionType] ?? DEFAULT_ACTION_MAP_ENTRY;
}
