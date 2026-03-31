import * as ex from 'excalibur';
import { Agent } from './agent';
import { AgentLog } from './agent-log';
import { AgentBehaviorKind } from './action-map';
import { DepartmentZone } from './department-zone';

export interface SpawnAgentOptions {
  id: string;
  pos: ex.Vector;
  z?: number;
  departmentZone?: DepartmentZone;
}

export class AgentManager {
  private readonly agents = new Map<string, Agent>();
  private readonly logsByAgent = new Map<string, AgentLog>();

  constructor(private readonly scene: ex.Scene) {}

  spawnAgent({ id, pos, z = 100, departmentZone }: SpawnAgentOptions): Agent {
    if (this.agents.has(id)) {
      throw new Error(`Agent with id "${id}" already exists`);
    }

    const agent = new Agent({ id, pos: pos.clone() });
    agent.z = z;
    if (departmentZone) {
      agent.setDepartmentZone(departmentZone);
    }
    this.agents.set(id, agent);
    this.scene.add(agent);
    return agent;
  }

  spawnAgents(spawns: SpawnAgentOptions[]): Agent[] {
    return spawns.map((spawn) => this.spawnAgent(spawn));
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  updateLogs(agentId: string, log: AgentLog): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Cannot update logs for unknown agent "${agentId}"`);
    }

    this.logsByAgent.set(agentId, log);
    agent.applyLog(log);
    console.log(`[AgentManager] ${agentId} -> ${log.action_type}`, log);
  }

  getLastLog(agentId: string): AgentLog | undefined {
    return this.logsByAgent.get(agentId);
  }

  assignAgentToZone(agentId: string, departmentZone: DepartmentZone): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Cannot assign department zone to unknown agent "${agentId}"`);
    }

    agent.setDepartmentZone(departmentZone);
  }

  getDebugSnapshot(): Array<{
    id: string;
    zoneId: string | null;
    state: 'active' | 'inactive';
    mode: 'command' | 'autonomous';
    actionType: string;
    behavior: AgentBehaviorKind | 'walk' | 'idle' | 'sit';
    remainingMs: number;
  }> {
    return this.getAllAgents().map((agent) => ({
      id: agent.id,
      zoneId: agent.getDepartmentZoneId(),
      ...agent.getDebugStatus()
    }));
  }
}
