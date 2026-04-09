export type CategoryType = 'reviewCenters' | 'schools' | 'commercialEstablishments';

export interface SelectedVenue {
  name: string;
  category: CategoryType;
}

export interface VenueFilter {
  venues: SelectedVenue[];
}
