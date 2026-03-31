import { OperationsDepartment } from './operations';
import { PurchaseDepartment } from './purchase';
import { SalesDepartment } from './sales';
import { DepartmentDefinition } from './types';

export const DEPARTMENTS: DepartmentDefinition[] = [
  SalesDepartment,
  PurchaseDepartment,
  OperationsDepartment
];

export function getDepartmentById(id: string): DepartmentDefinition {
  const department = DEPARTMENTS.find((item) => item.id === id);
  if (!department) {
    throw new Error(`Unknown department "${id}"`);
  }
  return department;
}
