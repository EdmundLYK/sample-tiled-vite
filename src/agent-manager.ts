import * as ex from 'excalibur';
import { Agent } from './agent';

export interface SpawnAgentOptions {
  id: string;
  pos: ex.Vector;
  z?: number;
}

export class AgentManager {
  private readonly agents = new Map<string, Agent>();

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
}
