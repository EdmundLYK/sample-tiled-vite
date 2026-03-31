import { DepartmentDefinition } from './types';

export const PurchaseDepartment: DepartmentDefinition = {
  id: 'purchase',
  label: 'Purchase',
  baseMapKey: 'base_purchase',
  debugColor: 'rgba(255, 171, 118, 0.7)',
  debugFillColor: 'rgba(255, 171, 118, 0.12)',
  bounds: { x1: 224, y1: 0, x2: 384, y2: 192 },
  noWalkAreas: [
    { x1: 258, y1: 56, x2: 350, y2: 152 }
  ],
  obstacleAreas: [
    { x1: 258, y1: 56, x2: 350, y2: 152 }
  ],
  defaultSpawn: { x: 304, y: 40 }
};
