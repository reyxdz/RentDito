import type { Unit } from '../entities/Unit';

export interface UnitRepository {
  getUnitsByProperty(propertyId: string): Promise<Unit[]>;
  getUnitById(unitId: string): Promise<Unit | null>;
  createUnit(propertyId: string, unitParams: Omit<Unit, 'id' | 'createdAt' | 'updatedAt' | 'slots'>): Promise<Unit>;
  updateUnit(unitId: string, updates: Partial<Unit>): Promise<Unit>;
  deleteUnit(unitId: string): Promise<void>;
}
