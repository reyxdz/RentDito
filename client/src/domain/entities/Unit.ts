export type AccommodationType =
  | 'Bedspace'
  | 'Room for Rent'

export type UnitStatus = 'Available' | 'Occupied' | 'Maintenance';

export interface Unit {
  id: string;
  propertyId: string;
  name: string;
  accommodationType: AccommodationType[];
  images: string[];
  monthlyRent: number;
  capacity: number;
  currentOccupants: number;
  vacancies: number;
  status: UnitStatus;
  features: string[];
  otherDetails: string[];
}
