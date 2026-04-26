import type { Inventory, InventoryStatus } from '../entities/Inventory';
import type { InventoryRecord, InventoryRecordStatus } from '../entities/InventoryRecord';

export interface InventoryFilters {
  propertyId?: string;
  status?: InventoryStatus | string;
  search?: string;
}

export interface InventoryRecordFilters {
  inventoryItemId?: string;
  tenancyId?: string;
  status?: InventoryRecordStatus | string;
}

export interface InventoryMetrics {
  activeIssued: number;
  lostDamaged: number;
  maintenance: number;
  available: number;
  mostDamagedItem: { itemName: string; damageCount: number } | null;
  depreciation: { itemName: string; cost: number; ageInMonths: number; currentEstimatedValue: number }[];
  statusDistribution: { name: string; value: number }[];
}

export interface InventoryRepository {
  getInventory(filters?: InventoryFilters): Promise<Inventory[]>;
  createItem(item: Partial<Inventory>): Promise<Inventory>;
  updateItem(id: string, item: Partial<Inventory>): Promise<Inventory>;
  deleteItem(id: string): Promise<void>;

  getRecords(filters?: InventoryRecordFilters): Promise<InventoryRecord[]>;
  issueItem(data: Partial<InventoryRecord>): Promise<InventoryRecord>;
  returnItem(recordId: string, data: { returnCondition: string; damageNotes?: string; penaltyAmount?: number; deductedFromDeposit?: boolean }): Promise<InventoryRecord>;

  getMetrics(propertyId?: string): Promise<InventoryMetrics>;
}
