import type { Property } from '../../domain/entities/Property';
import type { ListingFilters, FilterOptions } from '../../domain/entities/ListingFilters';

const PROPERTY_TYPES = ['Boarding House', 'House for Rent', 'Apartment', 'Dormitory', 'Studio', 'Mixed Use'] as const;

const PROPERTY_CATEGORIES = [
  { type: 'reviewCenters', label: 'Review Centers' },
  { type: 'schools', label: 'Schools and Universities' },
  { type: 'commercialEstablishments', label: 'Commercial Establishments' },
];

export function useFilterOptions(properties: Property[], selectedProvince: string | 'All' = 'All'): FilterOptions {
  // Extract unique provinces and cities from properties
  const provinces = Array.from(new Set(properties.map((p) => p.address.state)))
    .filter(Boolean)
    .sort();

  const propertiesForCities = selectedProvince !== 'All'
    ? properties.filter(p => p.address.state === selectedProvince)
    : properties;

  const cities = Array.from(new Set(propertiesForCities.map((p) => p.address.city)))
    .filter(Boolean)
    .sort();

  return {
    propertyTypes: PROPERTY_TYPES as any,
    provinces,
    cities,
    categories: PROPERTY_CATEGORIES,
  };
}

export function applyListingFilters(
  properties: Property[],
  filters: ListingFilters,
  propertyMatchesSelectedVenues: (property: Property) => boolean
): Property[] {
  return properties.filter((p) => {
    // Search filter
    const q = filters.searchTerm.toLowerCase();
    if (
      q &&
      !p.name.toLowerCase().includes(q) &&
      !p.address.city.toLowerCase().includes(q) &&
      !p.address.state.toLowerCase().includes(q)
    ) {
      return false;
    }

    // Property type filter
    if (filters.propertyType !== 'All' && p.propertyType !== filters.propertyType) {
      return false;
    }

    // Province filter
    if (filters.province !== 'All' && p.address.state !== filters.province) {
      return false;
    }

    // City filter
    if (filters.city !== 'All' && p.address.city !== filters.city) {
      return false;
    }

    // Venue filter
    if (!propertyMatchesSelectedVenues(p)) {
      return false;
    }

    return true;
  });
}
