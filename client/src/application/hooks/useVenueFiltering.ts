import { useMemo } from 'react';
import type { Property } from '../../domain/entities/Property';
import type { SelectedVenue } from '../../domain/entities/VenueFilter';

export function useVenueFiltering(properties: Property[], selectedVenues: SelectedVenue[]) {
  // Extract all unique venues from a specific category
  const getUniqueVenuesByCategory = (categoryType: SelectedVenue['category']) => {
    const venues: { name: string; count: number }[] = [];
    const venueNames = new Set<string>();

    properties.forEach((p) => {
      const categoryVenues = p[categoryType];
      categoryVenues.forEach((venue) => {
        venueNames.add(venue.name);
      });
    });

    venueNames.forEach((name) => {
      const count = properties.filter((p) =>
        p[categoryType].some((v) => v.name === name)
      ).length;
      venues.push({ name, count });
    });

    return venues.sort((a, b) => b.count - a.count);
  };

  // Check if a property matches any of the selected venues
  const propertyMatchesSelectedVenues = (property: Property): boolean => {
    if (selectedVenues.length === 0) return true;

    return selectedVenues.some((selectedVenue) => {
      const categoryVenues = property[selectedVenue.category];
      return categoryVenues.some((v) => v.name === selectedVenue.name);
    });
  };

  // Get all venues currently selected
  const getSelectedVenuesByCategory = (categoryType: SelectedVenue['category']) => {
    return selectedVenues.filter((v) => v.category === categoryType);
  };

  return {
    getUniqueVenuesByCategory,
    propertyMatchesSelectedVenues,
    getSelectedVenuesByCategory,
  };
}
