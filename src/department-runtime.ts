import * as ex from 'excalibur';
import { Agent } from './agent';
import { AgentManager, SpawnAgentOptions } from './agent-manager';
import { DepartmentDefinition } from './departments/types';

export interface DepartmentRuntime {
  department: DepartmentDefinition;
  scene: ex.Scene;
  sceneKey: string;
  agentManager: AgentManager;
  agents: Agent[];
}

interface SceneResource {
  addToScene(scene: ex.Scene): void;
}

export function createDepartmentRuntime(
  game: ex.Engine,
  department: DepartmentDefinition,
  mapResource: SceneResource,
  spawns: SpawnAgentOptions[]
): DepartmentRuntime {
  const scene = new ex.Scene();
  mapResource.addToScene(scene);

  scene.camera.pos = ex.vec(
    (department.bounds.x1 + department.bounds.x2) / 2,
    (department.bounds.y1 + department.bounds.y2) / 2
  );
  scene.camera.zoom = 4;

  const sceneKey = `department-${department.id}`;
  game.addScene(sceneKey, scene);

  const agentManager = new AgentManager(scene);
  const agents = agentManager.spawnAgents(spawns);

  return {
    department,
    scene,
    sceneKey,
    agentManager,
    agents
  };
}
