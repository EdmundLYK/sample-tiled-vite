import { DepartmentDefinition } from './types';

export const PurchaseDepartment: DepartmentDefinition = {
  id: 'purchase',
  label: 'Purchase',
  baseMapKey: 'base_purchase',
  debugColor: 'rgba(255, 171, 118, 0.7)',
  debugFillColor: 'rgba(255, 171, 118, 0.12)',
  bounds: { x1: 320, y1: 0, x2: 528, y2: 240 },
  noWalkAreas: [
    { x1: 354, y1: 56, x2: 446, y2: 152 }
  ],
  obstacleAreas: [
    { x1: 354, y1: 56, x2: 446, y2: 152 }
  ],
  defaultSpawn: { x: 400, y: 40 }
};
