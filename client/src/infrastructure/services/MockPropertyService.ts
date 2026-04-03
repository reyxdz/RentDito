import type { Property } from '../../domain/entities/Property';
import type { PropertyRepository } from '../../domain/repositories/PropertyRepository';

const MOCK_PROPERTIES: Property[] = [
  {
    id: 'prop-naval-001',
    landlordId: 'u-landlord-test', // Should map to the mock Landlord's actual user.id, wait, MockAuthService landlord has id 'u-landlord-test'
    name: 'Naval BH',
    description: 'Premier boarding house accommodation perfectly situated within the city proper.',
    propertyType: 'Boarding House',
    status: 'Active',
    address: {
      street: 'Naval',
      city: 'Naval',
      state: 'Naval',
      zipCode: '6543',
      country: 'Philippines'
    },
    metrics: {
      totalUnits: 1,
      activeUnits: 1,
      vacantUnits: 0,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

export const mockPropertyService: PropertyRepository = {
  async getPropertiesByLandlord(_landlordId: string): Promise<Property[]> {
    return new Promise((resolve) => setTimeout(() => {
      // In a real app we filter by landlordId, but here we just return the mock data for demonstration
      resolve(MOCK_PROPERTIES);
    }, 800));
  },
  
  async getPropertyById(propertyId: string): Promise<Property | null> {
    return new Promise((resolve) => setTimeout(() => {
      const prop = MOCK_PROPERTIES.find(p => p.id === propertyId);
      resolve(prop || null);
    }, 500));
  },
  
  async createProperty(property): Promise<Property> {
    return new Promise((resolve) => setTimeout(() => {
      const newProperty: Property = {
        ...property,
        id: `prop-${Date.now()}`,
        metrics: { totalUnits: 0, activeUnits: 0, vacantUnits: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      MOCK_PROPERTIES.push(newProperty);
      resolve(newProperty);
    }, 800));
  },
  
  async updateProperty(propertyId: string, updates: Partial<Property>): Promise<Property> {
    return new Promise((resolve, reject) => setTimeout(() => {
      const idx = MOCK_PROPERTIES.findIndex(p => p.id === propertyId);
      if (idx === -1) return reject(new Error("Property not found"));
      MOCK_PROPERTIES[idx] = { ...MOCK_PROPERTIES[idx], ...updates, updatedAt: new Date() };
      resolve(MOCK_PROPERTIES[idx]);
    }, 800));
  },
  
  async deleteProperty(propertyId: string): Promise<void> {
    return new Promise((resolve) => setTimeout(() => {
      const idx = MOCK_PROPERTIES.findIndex(p => p.id === propertyId);
      if (idx !== -1) MOCK_PROPERTIES.splice(idx, 1);
      resolve();
    }, 800));
  }
};
