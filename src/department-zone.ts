export interface DepartmentBounds {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type ZoneFacing = 'left' | 'right' | 'up' | 'down';

export interface ZoneSeatSpot {
  x: number;
  y: number;
  facing: ZoneFacing;
}

export interface DepartmentZone {
  id: string;
  bounds: DepartmentBounds;
  noWalkAreas?: DepartmentBounds[];
  obstacleAreas?: DepartmentBounds[];
  seatSpots?: ZoneSeatSpot[];
}

export function normalizeZoneBounds(bounds: DepartmentBounds): DepartmentBounds {
  const minX = Math.min(bounds.x1, bounds.x2);
  const maxX = Math.max(bounds.x1, bounds.x2);
  const minY = Math.min(bounds.y1, bounds.y2);
  const maxY = Math.max(bounds.y1, bounds.y2);

  return {
    x1: minX,
    y1: minY,
    x2: maxX,
    y2: maxY
  };
}
