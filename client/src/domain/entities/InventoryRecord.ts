import type {  Inventory, InventoryCondition  } from './Inventory';
import type {  Tenancy  } from './Tenancy';
import type {  User  } from './User';

export type InventoryRecordStatus = 'active' | 'returned' | 'damaged' | 'lost';

export interface InventoryRecord {
  id: string;
  inventoryItemId: string;
  inventoryItem?: Inventory;
  tenancyId: string;
  tenancy?: Tenancy;
  
  issuedByUserId: string;
  issuedByUser?: User;
  issuedDate: string | Date;
  
  returnDate?: string | Date;
  returnCondition?: InventoryCondition;
  
  damageNotes?: string;
  penaltyAmount?: number;
  deductedFromDeposit?: boolean;
  
  signedFormUrl?: string;
  status: InventoryRecordStatus;
  
  createdAt: string | Date;
  updatedAt: string | Date;
}
