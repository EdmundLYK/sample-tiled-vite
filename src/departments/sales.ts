import { DepartmentDefinition } from './types';

const SALES_COLUMNS = 4;
const SALES_ROWS = 6;
const SALES_SEAT_START_X = 68;
const SALES_SEAT_START_Y = 56;
const SALES_SEAT_STEP_X = 42;
const SALES_SEAT_STEP_Y = 34;
const SALES_DESK_START_X = SALES_SEAT_START_X;
const SALES_DESK_START_Y = SALES_SEAT_START_Y - 12;
const SALES_DESK_HALF_WIDTH = 12;
const SALES_DESK_HALF_HEIGHT = 8;

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

const SALES_DESK_OBSTACLES: DepartmentDefinition['obstacleAreas'] = [];
for (let row = 0; row < SALES_ROWS; row += 1) {
  for (let col = 0; col < SALES_COLUMNS; col += 1) {
    const deskX = SALES_DESK_START_X + col * SALES_SEAT_STEP_X;
    const deskY = SALES_DESK_START_Y + row * SALES_SEAT_STEP_Y;
    SALES_DESK_OBSTACLES.push({
      x1: deskX - SALES_DESK_HALF_WIDTH,
      y1: deskY - SALES_DESK_HALF_HEIGHT,
      x2: deskX + SALES_DESK_HALF_WIDTH,
      y2: deskY + SALES_DESK_HALF_HEIGHT
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
  noWalkAreas: SALES_DESK_OBSTACLES,
  obstacleAreas: SALES_DESK_OBSTACLES,
  seatSpots: SALES_SEAT_SPOTS,
  defaultSpawn: { x: 128, y: 30 }
};
