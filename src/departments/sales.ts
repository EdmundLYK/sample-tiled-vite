import { DepartmentDefinition } from './types';

const SALES_COLUMNS = 4;
const SALES_ROWS = 6;
const SALES_SEAT_START_X = 68;
const SALES_SEAT_START_Y = 56;
const SALES_SEAT_STEP_X = 42;
const SALES_SEAT_STEP_Y = 34;
const SALES_DESK_BLOCK = { x1: 56, y1: 38, x2: 218, y2: 234 };

const SALES_SEAT_SPOTS: DepartmentDefinition['seatSpots'] = [];
for (let row = 0; row < SALES_ROWS; row += 1) {
  for (let col = 0; col < SALES_COLUMNS; col += 1) {
    SALES_SEAT_SPOTS.push({
      x: SALES_SEAT_START_X + col * SALES_SEAT_STEP_X,
      y: SALES_SEAT_START_Y + row * SALES_SEAT_STEP_Y,
      facing: 'up'
    });
  }
}

export const SalesDepartment: DepartmentDefinition = {
  id: 'sales',
  label: 'Sales',
  baseMapKey: 'base_sales',
  debugColor: 'rgba(120, 197, 255, 0.7)',
  debugFillColor: 'rgba(120, 197, 255, 0.12)',
  bounds: { x1: 48, y1: 0, x2: 256, y2: 240 },
  noWalkAreas: [
    SALES_DESK_BLOCK
  ],
  obstacleAreas: [
    SALES_DESK_BLOCK
  ],
  seatSpots: SALES_SEAT_SPOTS,
  defaultSpawn: { x: 128, y: 30 }
};
