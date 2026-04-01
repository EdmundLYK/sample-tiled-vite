import { DepartmentDefinition } from './types';

export const OperationsDepartment: DepartmentDefinition = {
  id: 'operations',
  label: 'Operations',
  baseMapKey: 'base_operations',
  debugColor: 'rgba(164, 255, 138, 0.75)',
  debugFillColor: 'rgba(164, 255, 138, 0.12)',
  bounds: { x1: 464, y1: 0, x2: 672, y2: 240 },
  noWalkAreas: [
    { x1: 500, y1: 56, x2: 590, y2: 150 }
  ],
  obstacleAreas: [
    { x1: 500, y1: 56, x2: 590, y2: 150 }
  ],
  defaultSpawn: { x: 544, y: 48 }
};
