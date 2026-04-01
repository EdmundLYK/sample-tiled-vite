import { DepartmentDefinition } from './types';

export const OperationsDepartment: DepartmentDefinition = {
  id: 'operations',
  label: 'Operations',
  baseMapKey: 'base_operations',
  debugColor: 'rgba(164, 255, 138, 0.75)',
  debugFillColor: 'rgba(164, 255, 138, 0.12)',
  bounds: { x1: 592, y1: 0, x2: 800, y2: 240 },
  noWalkAreas: [
    { x1: 628, y1: 56, x2: 718, y2: 150 }
  ],
  obstacleAreas: [
    { x1: 628, y1: 56, x2: 718, y2: 150 }
  ],
  defaultSpawn: { x: 672, y: 48 }
};
