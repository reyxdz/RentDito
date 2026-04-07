import type { Property } from '../../domain/entities/Property';
import type { PropertyRepository } from '../../domain/repositories/PropertyRepository';

// =============================================================================
// HARDCODED PROPERTY DATA
// Edit the entries below to update the public listing page.
// After editing, rebuild and redeploy: npm run build && npx vercel --prod
// =============================================================================

const MOCK_PROPERTIES: Property[] = [
  {
    id: 'prop-001',
    landlordId: 'usr_landlord_2',
    name: 'Casa de Naval Boarding House',
    description:
      'A well-maintained boarding house located in the heart of Naval, Biliran. Ideal for students and young professionals seeking affordable and comfortable accommodation. The property features a quiet neighborhood, secure parking, and a shared common area with a garden.',
    propertyType: 'Boarding House',
    status: 'Active',
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
    ],
    address: {
      street: 'P. Inocentes St., Brgy. Atienza',
      city: 'Naval',
      state: 'Biliran',
      zipCode: '6543',
      country: 'Philippines',
    },
    inclusions: ['WiFi', 'Water', 'Shared Kitchen', 'Laundry Area', 'Parking'],
    otherDetails: [
      'Curfew: 10:00 PM',
      'No pets allowed',
      'Near Naval State University (5 min walk)',
      'Near public market and church',
      'Monthly payment — due every 5th',
    ],
    metrics: {
      totalUnits: 4,
      activeUnits: 3,
      vacantUnits: 1,
      priceRange: { min: 2500, max: 4500 },
    },
    createdAt: new Date('2025-06-15'),
    updatedAt: new Date('2026-03-20'),
  },
  {
    id: 'prop-002',
    landlordId: 'usr_landlord_2',
    name: 'Cebu Heights Dormitory',
    description:
      'Modern dormitory-style accommodation near the University of Cebu. Fully furnished rooms with individual study desks, air conditioning, and 24/7 security. Perfect for college students wanting a safe, convenient, and affordable place to stay.',
    propertyType: 'Boarding House',
    status: 'Active',
    images: [
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80',
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',
      'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80',
    ],
    address: {
      street: 'Sanciangko St., Brgy. Sto. Niño',
      city: 'Cebu City',
      state: 'Cebu',
      zipCode: '6000',
      country: 'Philippines',
    },
    inclusions: ['WiFi', 'Water', 'Electricity', 'Air Conditioning', 'Study Desk', '24/7 Security'],
    otherDetails: [
      'Visitor hours: 8 AM – 8 PM only',
      'No overnight guests',
      '5-minute walk to University of Cebu',
      'Near 7-Eleven and restaurants',
      'Monthly payment — due every 1st',
    ],
    metrics: {
      totalUnits: 6,
      activeUnits: 5,
      vacantUnits: 2,
      priceRange: { min: 3000, max: 6000 },
    },
    createdAt: new Date('2025-08-01'),
    updatedAt: new Date('2026-03-15'),
  },
  {
    id: 'prop-003',
    landlordId: 'usr_landlord_2',
    name: 'Makati Residences',
    description:
      'Premium apartment units located in the business district of Makati. Each unit is fully furnished with modern interiors, smart home features, and access to a rooftop lounge. Walking distance to Ayala Center and major corporate offices.',
    propertyType: 'Apartment',
    status: 'Active',
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
      'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800&q=80',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80',
    ],
    address: {
      street: 'Salcedo Village, Brgy. Bel-Air',
      city: 'Makati',
      state: 'Metro Manila',
      zipCode: '1227',
      country: 'Philippines',
    },
    inclusions: ['WiFi', 'Water', 'Electricity', 'Air Conditioning', 'Gym Access', 'Swimming Pool', 'Parking Slot'],
    otherDetails: [
      'No smoking inside units',
      'Pet-friendly (small breeds only, with deposit)',
      '3-minute walk to Ayala MRT Station',
      'Near Greenbelt and Glorietta malls',
      'Quarterly payment option available',
    ],
    metrics: {
      totalUnits: 3,
      activeUnits: 3,
      vacantUnits: 1,
      priceRange: { min: 12000, max: 25000 },
    },
    createdAt: new Date('2025-04-10'),
    updatedAt: new Date('2026-02-28'),
  },
  {
    id: 'prop-004',
    landlordId: 'usr_landlord_2',
    name: 'QC Student Hub',
    description:
      'Budget-friendly bedspace and room-for-rent options near UP Diliman and Ateneo de Manila. Clean, well-ventilated rooms with reliable internet — built for the student lifestyle. Shared common areas include a kitchen, study lounge, and laundry station.',
    propertyType: 'Boarding House',
    status: 'Active',
    images: [
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&q=80',
      'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=800&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    ],
    address: {
      street: 'Katipunan Ave., Brgy. Loyola Heights',
      city: 'Quezon City',
      state: 'Metro Manila',
      zipCode: '1108',
      country: 'Philippines',
    },
    inclusions: ['WiFi', 'Water', 'Shared Kitchen', 'Study Lounge', 'Laundry Station'],
    otherDetails: [
      'Curfew: 11:00 PM (weekdays), 12:00 MN (weekends)',
      'No smoking, no alcohol inside premises',
      'Near UP Diliman and Ateneo (jeepney ride)',
      'Near Ministop and local eateries',
      'Monthly payment — due every 5th',
    ],
    metrics: {
      totalUnits: 5,
      activeUnits: 4,
      vacantUnits: 3,
      priceRange: { min: 2500, max: 5500 },
    },
    createdAt: new Date('2025-09-20'),
    updatedAt: new Date('2026-03-18'),
  },
  {
    id: 'prop-005',
    landlordId: 'usr_landlord_2',
    name: 'Davao Sunshine Apartments',
    description:
      'Bright and spacious studio and one-bedroom apartments in a peaceful Davao City neighborhood. Each unit comes fully furnished with a private bathroom, kitchenette, and balcony. The compound features a shared garden, covered parking, and 24-hour security.',
    propertyType: 'Apartment',
    status: 'Active',
    images: [
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
      'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800&q=80',
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80',
    ],
    address: {
      street: 'J.P. Laurel Ave., Brgy. Bajada',
      city: 'Davao City',
      state: 'Davao del Sur',
      zipCode: '8000',
      country: 'Philippines',
    },
    inclusions: ['WiFi', 'Water', 'Electricity', 'Private Bathroom', 'Kitchenette', 'Parking'],
    otherDetails: [
      'No curfew',
      'Pets allowed with ₱2,000 deposit',
      'Near SM Lanang Premier (10 min drive)',
      'Near Ateneo de Davao University',
      'Monthly or quarterly payment accepted',
    ],
    metrics: {
      totalUnits: 4,
      activeUnits: 4,
      vacantUnits: 2,
      priceRange: { min: 7000, max: 15000 },
    },
    createdAt: new Date('2025-07-05'),
    updatedAt: new Date('2026-03-10'),
  },
  {
    id: 'prop-006',
    landlordId: 'usr_landlord_2',
    name: 'Baguio Pines Lodge',
    description:
      'Cozy mountain lodge offering room rentals in the cool climate of Baguio City. Wooden interiors with a warm, cabin-like atmosphere. Shared fireplace lounge, communal kitchen, and a rooftop deck with views of the Cordillera mountains.',
    propertyType: 'Boarding House',
    status: 'Active',
    images: [
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',
      'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&q=80',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80',
    ],
    address: {
      street: 'Session Rd., Brgy. Kayang',
      city: 'Baguio City',
      state: 'Benguet',
      zipCode: '2600',
      country: 'Philippines',
    },
    inclusions: ['WiFi', 'Water', 'Shared Kitchen', 'Fireplace Lounge', 'Rooftop Deck', 'Hot Shower'],
    otherDetails: [
      'No curfew',
      'Quiet hours after 10:00 PM',
      'Near Burnham Park (10 min walk)',
      'Near SM Baguio and Session Road shops',
      'Monthly payment — due every 1st',
    ],
    metrics: {
      totalUnits: 3,
      activeUnits: 3,
      vacantUnits: 1,
      priceRange: { min: 4000, max: 8000 },
    },
    createdAt: new Date('2025-05-12'),
    updatedAt: new Date('2026-03-25'),
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

  async getPropertiesByLandlord(_landlordId: string): Promise<Property[]> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return MOCK_PROPERTIES;
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
