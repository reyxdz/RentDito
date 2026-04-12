import type {  Property  } from './Property';

export type InventoryCondition = 'new' | 'good' | 'fair' | 'poor' | 'damaged';
export type InventoryStatus = 'available' | 'issued' | 'maintenance' | 'retired';

export interface Inventory {
  id: string;
  propertyId: string;
  property?: Property;
  
  itemName: string;
  serialNumber?: string;
  condition: InventoryCondition;
  quantity: number;
  status: InventoryStatus;
  
  purchaseDate?: string | Date;
  purchaseCost?: number;
  
  createdAt: string | Date;
  updatedAt: string | Date;
}
