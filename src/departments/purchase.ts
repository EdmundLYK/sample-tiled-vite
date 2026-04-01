import { DepartmentDefinition } from './types';

const PURCHASE_COLUMNS = 4;
const PURCHASE_ROWS = 6;
const PURCHASE_SEAT_START_X = 276;
const PURCHASE_SEAT_START_Y = 56;
const PURCHASE_SEAT_STEP_X = 42;
const PURCHASE_SEAT_STEP_Y = 34;
const PURCHASE_DESK_BLOCK = { x1: 264, y1: 38, x2: 426, y2: 234 };

const PURCHASE_SEAT_SPOTS: DepartmentDefinition['seatSpots'] = [];
for (let row = 0; row < PURCHASE_ROWS; row += 1) {
  for (let col = 0; col < PURCHASE_COLUMNS; col += 1) {
    PURCHASE_SEAT_SPOTS.push({
      x: PURCHASE_SEAT_START_X + col * PURCHASE_SEAT_STEP_X,
      y: PURCHASE_SEAT_START_Y + row * PURCHASE_SEAT_STEP_Y,
      facing: 'up'
    });
  }
}

export const PurchaseDepartment: DepartmentDefinition = {
  id: 'purchase',
  label: 'Purchase',
  baseMapKey: 'base_purchase',
  debugColor: 'rgba(255, 171, 118, 0.7)',
  debugFillColor: 'rgba(255, 171, 118, 0.12)',
  bounds: { x1: 256, y1: 0, x2: 464, y2: 240 },
  noWalkAreas: [
    PURCHASE_DESK_BLOCK
  ],
  obstacleAreas: [
    PURCHASE_DESK_BLOCK
  ],
  seatSpots: PURCHASE_SEAT_SPOTS,
  defaultSpawn: { x: 336, y: 40 }
};
