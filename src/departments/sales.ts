import { DepartmentDefinition } from './types';

export const SalesDepartment: DepartmentDefinition = {
  id: 'sales',
  label: 'Sales',
  baseMapKey: 'base_sales',
  debugColor: 'rgba(120, 197, 255, 0.7)',
  debugFillColor: 'rgba(120, 197, 255, 0.12)',
  bounds: { x1: 0, y1: 0, x2: 160, y2: 192 },
  noWalkAreas: [
    { x1: 8, y1: 48, x2: 92, y2: 156 }
  ],
  obstacleAreas: [
    { x1: 14, y1: 52, x2: 82, y2: 66 },
    { x1: 14, y1: 90, x2: 82, y2: 104 },
    { x1: 14, y1: 128, x2: 82, y2: 142 },
    { x1: 36, y1: 62, x2: 40, y2: 154 },
    { x1: 78, y1: 62, x2: 82, y2: 154 }
  ],
  seatSpots: [
    { x: 20, y: 68, facing: 'up' },
    { x: 62, y: 68, facing: 'up' },
    { x: 20, y: 106, facing: 'up' },
    { x: 62, y: 106, facing: 'up' },
    { x: 20, y: 144, facing: 'up' },
    { x: 62, y: 144, facing: 'up' }
  ],
  defaultSpawn: { x: 80, y: 40 }
};
