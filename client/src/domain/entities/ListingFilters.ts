import type { PropertyType } from './Property';
import type { SelectedVenue } from './VenueFilter';

export interface ListingFilters {
  searchTerm: string;
  propertyType: PropertyType | 'All';
  province: string | 'All';
  city: string | 'All';
  selectedVenues: SelectedVenue[];
}

export interface FilterOptions {
  propertyTypes: PropertyType[];
  provinces: string[];
  cities: string[];
  categories: { type: string; label: string }[];
}
