import type { Tenancy } from './Tenancy';

export type AccommodationType = 'room' | 'bedspace';
export type UnitStatus = 'vacant' | 'occupied' | 'reserved' | 'maintenance';

export interface Slot {
  slotNumber: number;
  status: string;
  tenancyId?: string;
  tenancy?: Tenancy;
}

export interface Unit {
  id: string;
  propertyId: string;
  unitIdentifier: string;
  accommodationType: AccommodationType;
  images: string[];
  
  roomRent?: number;
  bedspaceRent?: number;
  perHeadRate?: number;
  
  deposit: number;
  capacity: number;
  maxOccupants: number;
  sizeSqm?: number;
  
  features: string[];
  status: UnitStatus;
  
  slots?: Slot[];
  
  createdAt: string | Date;
  updatedAt: string | Date;
}
