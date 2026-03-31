import * as ex from 'excalibur';
import { Agent } from './agent';
import { AgentLog } from './agent-log';

export interface SpawnAgentOptions {
  id: string;
  pos: ex.Vector;
  z?: number;
}

export class AgentManager {
  private readonly agents = new Map<string, Agent>();
  private readonly logsByAgent = new Map<string, AgentLog>();

  constructor(private readonly scene: ex.Scene) {}

  spawnAgent({ id, pos, z = 100 }: SpawnAgentOptions): Agent {
    if (this.agents.has(id)) {
      throw new Error(`Agent with id "${id}" already exists`);
    }

    const agent = new Agent({ id, pos: pos.clone() });
    agent.z = z;
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

  getDebugSnapshot(): Array<{ id: string; mode: 'command' | 'autonomous'; actionType: string; remainingMs: number }> {
    return this.getAllAgents().map((agent) => ({
      id: agent.id,
      ...agent.getDebugStatus()
    }));
  }
}
