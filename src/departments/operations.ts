import { DepartmentDefinition } from './types';

export const OperationsDepartment: DepartmentDefinition = {
  id: 'operations',
  label: 'Operations',
  baseMapKey: 'base_operations',
  debugColor: 'rgba(164, 255, 138, 0.75)',
  debugFillColor: 'rgba(164, 255, 138, 0.12)',
  bounds: { x1: 0, y1: 224, x2: 160, y2: 416 },
  noWalkAreas: [
    { x1: 36, y1: 280, x2: 126, y2: 374 }
  ],
  obstacleAreas: [
    { x1: 36, y1: 280, x2: 126, y2: 374 }
  ],
  defaultSpawn: { x: 80, y: 272 }
};
