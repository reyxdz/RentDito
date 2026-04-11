import type { PropertyType } from './Property';
import type { SelectedVenue } from './VenueFilter';
import type { AccommodationType } from './Unit';

export interface ListingFilters {
  searchTerm: string;
  propertyType: PropertyType | 'All';
  accommodationType: AccommodationType | 'All';
  province: string | 'All';
  city: string | 'All';
  selectedVenues: SelectedVenue[];
}

export interface FilterOptions {
  propertyTypes: PropertyType[];
  accommodationTypes: AccommodationType[];
  provinces: string[];
  cities: string[];
  categories: { type: string; label: string }[];
}
