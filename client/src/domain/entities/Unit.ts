import type {  Tenancy  } from './Tenancy';

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
  
  // UI Display computed/virtual fields
  name?: string; // fallback alias for unitIdentifier used by UI
  vacancies?: number;
  currentOccupants?: number;
  monthlyRent?: number; // Used for some backwards compatibility in UI
  rentPricing?: {
    bedspace?: number;
    room?: number;
  };

  createdAt: string | Date;
  updatedAt: string | Date;
}
