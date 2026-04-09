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

// Uytengso Boarding House Property
import uyImg1 from '../../assets/properties/uytengso/images/u.jpg';
import uyImg2 from '../../assets/properties/uytengso/images/y.jpg';
import uyImg3 from '../../assets/properties/uytengso/images/t.jpg';    
import uyImg4 from '../../assets/properties/uytengso/images/e.jpg';
import uyImg5 from '../../assets/properties/uytengso/images/n.jpg';
import uyImg6 from '../../assets/properties/uytengso/images/s.jpg';
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
    propertyType: 'Mixed Use',
    status: 'Active',
    images: [
      wdImg1, wdImg2, wdImg3, wdImg4, wdImg5, wdImg6, wdImg7, wdImg8, wdImg9, wdImg10
    ],
    address: {
      street: 'Sikatuna Street',
      city: 'Cebu City',
      state: 'Cebu',
      zipCode: '6543',
      country: 'Philippines',
    },
    inclusions: ['WiFi', 'Foam', 'Pillow', 'Table', 'Chair', 'Clip Fan', 'Electric Rice Cooker', 'Can Cook', 'Can Wash Clothes', 'No Curfew'],
    reviewCenters: [
      { name: 'Ecel Review Center', walking: '6 minutes', commute: ' ' },
      { name: 'Manor Review Center', walking: '8 minutes', commute: ' ' },
      { name: 'Powerdev Review Center', walking: '8 minutes', commute: ' ' },
      { name: 'Padilla Review Center', walking: '8 minutes', commute: ' ' },
      { name: 'Prime Review Center', walking: '8 minutes', commute: ' ' },
      { name: 'Alcoron Review Center', walking: '20 minutes', commute: '16 minutes' },
    ],
    schools: [
      { name: 'Velez College of Nursing', walking: '10 minutes', commute: '4 minutes' },
      { name: 'Cebu Normal University', walking: '10 minutes', commute: '5 minutes' },
      { name: 'University of San Carlos', walking: '16 minutes', commute: '15 minutes' },
      { name: 'University of Visayas Main', walking: '10 minutes', commute: ' ' },
      { name: 'University of Cebu Main', walking: '14 minutes', commute: '13 minutes' },
      { name: 'Asian College of Technology', walking: '12 minutes', commute: ' ' },
    ],
    commercialEstablishments: [
      { name: 'Naval Town Market', walking: '5 minutes', commute: '12 minutes' },
      { name: 'SM Mall', walking: '20 minutes', commute: '30 minutes' },
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
  {
    id: 'prop-uytengson-boardings',
    landlordId: 'usr_landlord_2',
    name: 'Uytengso Boardings House',
    description:
      'A beautiful and well-maintained property. Ideal for students, young professionals, and reviewees seeking affordable and comfortable accommodation.',
    propertyType: 'Boarding House',
    status: 'Active',
    images: [
      uyImg1, uyImg2, uyImg3, uyImg4, uyImg5, uyImg6
      
    ],
    address: {
      street: 'Uytengso Street',
      city: 'Cebu City',
      state: 'Cebu',
      zipCode: '6543',
      country: 'Philippines',
    },
    inclusions: ['WiFi', 'Foam', 'Pillow', 'Table', 'Chair', 'Clip Fan', 'Electric Rice Cooker', 'Can Cook', 'Can Wash Clothes', 'No Curfew'],
    reviewCenters: [
      { name: 'Mega Review Center', walking: '4 minutes', commute: '15 minutes' },
      { name: 'Gold Rank Review Center', walking: '4 minutes', commute: '18 minutes' },
      { name: 'Alcorcon Review Center', walking: '12 minutes', commute: '12 minutes' },
      { name: 'Falcon Review Center', walking: '8 minutes', commute: '18 minutes' },
      { name: 'Top Rank Review Center', walking: '', commute: '5 minutes' },
      { name: 'Gillesania Review Center', walking: '', commute: '20 minutes' },
      { name: 'Rojas Review Center', walking: '', commute: '20 minutes' },
      { name: 'Review Innovation', walking: '', commute: '15 minutes' },
    ],
    schools: [
      { name: 'ACT', walking: '10 minutes', commute: '5 minutes' },
      { name: 'Cebu Normal University', walking: '5 minutes', commute: '' },
      { name: 'South Western University', walking: '3 minutes', commute: '' },
      { name: 'University of Cebu', walking: '', commute: '12 minutes' },
      { name: 'UC Main', walking: '', commute: '12 minutes' },
    ],
    commercialEstablishments: [
      { name: 'Robinson Fuente', walking: '', commute: '5 minutes' },
      { name: 'Robinson Cybergate', walking: '', commute: '8 minutes' },
      
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
      reviewCenters: [],
      schools: [],
      commercialEstablishments: [],
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
