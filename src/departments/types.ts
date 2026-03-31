import { DepartmentZone } from '../department-zone';

export interface DepartmentDefinition extends DepartmentZone {
  label: string;
  baseMapKey: string;
  debugColor: string;
  debugFillColor: string;
  defaultSpawn: {
    x: number;
    y: number;
  };
}
