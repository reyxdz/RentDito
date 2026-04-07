import type { Property } from '../../domain/entities/Property';
import type { PropertyRepository } from '../../domain/repositories/PropertyRepository';

import wdImg1 from '../../assets/properties/white_dorm/images/image1.jpg';
import wdImg2 from '../../assets/properties/white_dorm/images/image2.jpg';
import wdImg3 from '../../assets/properties/white_dorm/images/image3.jpg';
import wdImg4 from '../../assets/properties/white_dorm/images/image4.jpg';
import wdImg5 from '../../assets/properties/white_dorm/images/image5.jpg';
import wdImg6 from '../../assets/properties/white_dorm/images/image6.jpg';
import wdImg7 from '../../assets/properties/white_dorm/images/image7.jpg';
import wdImg8 from '../../assets/properties/white_dorm/images/image8.jpg';
import wdImg9 from '../../assets/properties/white_dorm/images/image9.jpg';
import wdImg10 from '../../assets/properties/white_dorm/images/image10.jpg';

// =============================================================================
// HARDCODED PROPERTY DATA
// Edit the entries below to update the public listing page.
// After editing, rebuild and redeploy: npm run build && npx vercel --prod
// =============================================================================

const MOCK_PROPERTIES: Property[] = [
  {
    id: 'prop-white-dorm',
    landlordId: 'usr_landlord_2',
    name: 'White Dorm Property',
    description:
      'A beautiful and well-maintained property. Ideal for students and young professionals seeking affordable and comfortable accommodation.',
    propertyType: 'Boarding House',
    status: 'Active',
    images: [
      wdImg1, wdImg2, wdImg3, wdImg4, wdImg5, wdImg6, wdImg7, wdImg8, wdImg9, wdImg10
    ],
    address: {
      street: 'Naval Town',
      city: 'Naval',
      state: 'Biliran',
      zipCode: '6543',
      country: 'Philippines',
    },
    inclusions: ['WiFi', 'Foam', 'Pillow', 'Table', 'Chair', 'Clip Fan', 'Electric Rice Cooker'],
    otherDetails: [
      'Utility bills are excluded but each room has its own submeters',
      'Near local amenities',
      'Can cook',
      'Can do laundry',
      'No curfew'
    ],
    metrics: {
      totalUnits: 10,
      activeUnits: 8,
      vacantUnits: 2,
      priceRange: { min: 2500, max: 5000 },
    },
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date(),
  },
];

// =============================================================================
// SERVICE IMPLEMENTATION
// =============================================================================

export const mockPropertyService: PropertyRepository & {
  getAllProperties(): Promise<Property[]>;
} = {
  async getAllProperties(): Promise<Property[]> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return MOCK_PROPERTIES.filter((p) => p.status === 'Active');
  },

  async getPropertiesByLandlord(landlordId: string): Promise<Property[]> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return MOCK_PROPERTIES.filter((p) => p.landlordId === landlordId);
  },

  async getPropertyById(propertyId: string): Promise<Property | null> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return MOCK_PROPERTIES.find((p) => p.id === propertyId) || null;
  },

  async createProperty(property): Promise<Property> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const newProperty: Property = {
      ...property,
      id: `prop-${Date.now()}`,
      images: [],
      inclusions: [],
      otherDetails: [],
      metrics: { totalUnits: 0, activeUnits: 0, vacantUnits: 0, priceRange: { min: 0, max: 0 } },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    MOCK_PROPERTIES.push(newProperty);
    return newProperty;
  },

  async updateProperty(propertyId: string, updates: Partial<Property>): Promise<Property> {
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        const idx = MOCK_PROPERTIES.findIndex((p) => p.id === propertyId);
        if (idx === -1) return reject(new Error('Property not found'));
        MOCK_PROPERTIES[idx] = { ...MOCK_PROPERTIES[idx], ...updates, updatedAt: new Date() };
        resolve(MOCK_PROPERTIES[idx]);
      }, 800);
    });
    return MOCK_PROPERTIES.find((p) => p.id === propertyId)!;
  },

  async deleteProperty(propertyId: string): Promise<void> {
    await new Promise<void>((resolve) =>
      setTimeout(() => {
        const idx = MOCK_PROPERTIES.findIndex((p) => p.id === propertyId);
        if (idx !== -1) MOCK_PROPERTIES.splice(idx, 1);
        resolve();
      }, 800)
    );
  },
};
