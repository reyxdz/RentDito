import type { Unit } from '../../domain/entities/Unit';

// =============================================================================
// HARDCODED UNIT DATA
// Edit the entries below to update unit listings per property.
// After editing, rebuild and redeploy: npm run build && npx vercel --prod
// =============================================================================

const MOCK_UNITS: Unit[] = [
  // ── Casa de Naval Boarding House (prop-001) ──────────────────────────────
  {
    id: 'unit-001-a',
    propertyId: 'prop-001',
    name: 'Room A',
    accommodationType: 'Room for Rent',
    images: [
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',
      'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=800&q=80',
    ],
    monthlyRent: 3500,
    capacity: 2,
    currentOccupants: 2,
    vacancies: 0,
    status: 'Occupied',
    features: ['Private CR', 'Window', 'Cabinet'],
  },
  {
    id: 'unit-001-b',
    propertyId: 'prop-001',
    name: 'Room B',
    accommodationType: 'Room for Rent',
    images: [
      'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80',
      'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80',
    ],
    monthlyRent: 3000,
    capacity: 2,
    currentOccupants: 1,
    vacancies: 1,
    status: 'Available',
    features: ['Shared CR', 'Window', 'Cabinet'],
  },
  {
    id: 'unit-001-c',
    propertyId: 'prop-001',
    name: 'Room C (Bedspace)',
    accommodationType: 'Bedspace',
    images: [
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80',
    ],
    monthlyRent: 2500,
    capacity: 4,
    currentOccupants: 3,
    vacancies: 1,
    status: 'Available',
    features: ['Shared CR', 'Bunk Bed', 'Locker'],
  },
  {
    id: 'unit-001-d',
    propertyId: 'prop-001',
    name: 'Room D',
    accommodationType: 'Room for Rent',
    images: [
      'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=800&q=80',
    ],
    monthlyRent: 4500,
    capacity: 2,
    currentOccupants: 0,
    vacancies: 2,
    status: 'Available',
    features: ['Private CR', 'AC', 'Window', 'Cabinet', 'Study Desk'],
  },

  // ── Cebu Heights Dormitory (prop-002) ────────────────────────────────────
  {
    id: 'unit-002-a',
    propertyId: 'prop-002',
    name: 'Dorm Bed A1',
    accommodationType: 'Dormitory',
    images: [
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80',
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&q=80',
    ],
    monthlyRent: 3000,
    capacity: 6,
    currentOccupants: 4,
    vacancies: 2,
    status: 'Available',
    features: ['AC', 'Study Desk', 'Locker', 'Shared CR'],
  },
  {
    id: 'unit-002-b',
    propertyId: 'prop-002',
    name: 'Dorm Bed A2',
    accommodationType: 'Dormitory',
    images: [
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',
    ],
    monthlyRent: 3000,
    capacity: 6,
    currentOccupants: 6,
    vacancies: 0,
    status: 'Occupied',
    features: ['AC', 'Study Desk', 'Locker', 'Shared CR'],
  },
  {
    id: 'unit-002-c',
    propertyId: 'prop-002',
    name: 'Private Room B1',
    accommodationType: 'Room for Rent',
    images: [
      'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80',
      'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80',
    ],
    monthlyRent: 5500,
    capacity: 2,
    currentOccupants: 1,
    vacancies: 1,
    status: 'Available',
    features: ['AC', 'Private CR', 'Study Desk', 'Cabinet'],
  },
  {
    id: 'unit-002-d',
    propertyId: 'prop-002',
    name: 'Private Room B2',
    accommodationType: 'Room for Rent',
    images: [
      'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=800&q=80',
    ],
    monthlyRent: 6000,
    capacity: 2,
    currentOccupants: 2,
    vacancies: 0,
    status: 'Occupied',
    features: ['AC', 'Private CR', 'Study Desk', 'Cabinet', 'Balcony'],
  },

  // ── Makati Residences (prop-003) ─────────────────────────────────────────
  {
    id: 'unit-003-a',
    propertyId: 'prop-003',
    name: 'Unit 301 – Studio',
    accommodationType: 'Studio',
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
      'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800&q=80',
    ],
    monthlyRent: 12000,
    capacity: 1,
    currentOccupants: 1,
    vacancies: 0,
    status: 'Occupied',
    features: ['AC', 'Private CR', 'Kitchenette', 'Balcony', 'Smart Lock'],
  },
  {
    id: 'unit-003-b',
    propertyId: 'prop-003',
    name: 'Unit 402 – 1BR',
    accommodationType: 'Apartment',
    images: [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
    ],
    monthlyRent: 18000,
    capacity: 2,
    currentOccupants: 0,
    vacancies: 2,
    status: 'Available',
    features: ['AC', 'Private CR', 'Full Kitchen', 'Living Room', 'Balcony', 'Parking Slot'],
  },
  {
    id: 'unit-003-c',
    propertyId: 'prop-003',
    name: 'Unit 501 – 2BR Penthouse',
    accommodationType: 'Apartment',
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
    ],
    monthlyRent: 25000,
    capacity: 4,
    currentOccupants: 3,
    vacancies: 1,
    status: 'Available',
    features: ['AC', '2 Bathrooms', 'Full Kitchen', 'Living Room', 'Rooftop Access', '2 Parking Slots'],
  },

  // ── QC Student Hub (prop-004) ────────────────────────────────────────────
  {
    id: 'unit-004-a',
    propertyId: 'prop-004',
    name: 'Bedspace Slot A',
    accommodationType: 'Bedspace',
    images: [
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80',
    ],
    monthlyRent: 2500,
    capacity: 4,
    currentOccupants: 2,
    vacancies: 2,
    status: 'Available',
    features: ['Shared CR', 'Bunk Bed', 'Locker', 'Fan'],
  },
  {
    id: 'unit-004-b',
    propertyId: 'prop-004',
    name: 'Bedspace Slot B',
    accommodationType: 'Bedspace',
    images: [
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&q=80',
    ],
    monthlyRent: 2500,
    capacity: 4,
    currentOccupants: 4,
    vacancies: 0,
    status: 'Occupied',
    features: ['Shared CR', 'Bunk Bed', 'Locker', 'Fan'],
  },
  {
    id: 'unit-004-c',
    propertyId: 'prop-004',
    name: 'Solo Room 1',
    accommodationType: 'Room for Rent',
    images: [
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',
      'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80',
    ],
    monthlyRent: 4500,
    capacity: 1,
    currentOccupants: 0,
    vacancies: 1,
    status: 'Available',
    features: ['Private CR', 'AC', 'Study Desk', 'Cabinet'],
  },
  {
    id: 'unit-004-d',
    propertyId: 'prop-004',
    name: 'Duo Room 2',
    accommodationType: 'Room for Rent',
    images: [
      'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80',
    ],
    monthlyRent: 5500,
    capacity: 2,
    currentOccupants: 1,
    vacancies: 1,
    status: 'Available',
    features: ['Private CR', 'AC', 'Study Desk', 'Cabinet', 'Window'],
  },
  {
    id: 'unit-004-e',
    propertyId: 'prop-004',
    name: 'Bedspace Slot C',
    accommodationType: 'Bedspace',
    images: [
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80',
    ],
    monthlyRent: 2800,
    capacity: 4,
    currentOccupants: 1,
    vacancies: 3,
    status: 'Available',
    features: ['Shared CR', 'Bunk Bed', 'Locker', 'Fan', 'Window'],
  },

  // ── Davao Sunshine Apartments (prop-005) ─────────────────────────────────
  {
    id: 'unit-005-a',
    propertyId: 'prop-005',
    name: 'Studio Unit A',
    accommodationType: 'Studio',
    images: [
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80',
      'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800&q=80',
    ],
    monthlyRent: 7000,
    capacity: 1,
    currentOccupants: 1,
    vacancies: 0,
    status: 'Occupied',
    features: ['AC', 'Private CR', 'Kitchenette', 'Balcony'],
  },
  {
    id: 'unit-005-b',
    propertyId: 'prop-005',
    name: 'Studio Unit B',
    accommodationType: 'Studio',
    images: [
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
    ],
    monthlyRent: 7500,
    capacity: 2,
    currentOccupants: 0,
    vacancies: 2,
    status: 'Available',
    features: ['AC', 'Private CR', 'Kitchenette', 'Balcony', 'Parking'],
  },
  {
    id: 'unit-005-c',
    propertyId: 'prop-005',
    name: '1BR Unit C',
    accommodationType: 'Apartment',
    images: [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    ],
    monthlyRent: 12000,
    capacity: 2,
    currentOccupants: 2,
    vacancies: 0,
    status: 'Occupied',
    features: ['AC', 'Private CR', 'Full Kitchen', 'Living Area', 'Balcony', 'Parking'],
  },
  {
    id: 'unit-005-d',
    propertyId: 'prop-005',
    name: '1BR Unit D',
    accommodationType: 'Apartment',
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
    ],
    monthlyRent: 15000,
    capacity: 3,
    currentOccupants: 1,
    vacancies: 2,
    status: 'Available',
    features: ['AC', 'Private CR', 'Full Kitchen', 'Living Area', 'Balcony', 'Parking', 'Storage Room'],
  },

  // ── Baguio Pines Lodge (prop-006) ────────────────────────────────────────
  {
    id: 'unit-006-a',
    propertyId: 'prop-006',
    name: 'Pine Room',
    accommodationType: 'Room for Rent',
    images: [
      'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&q=80',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80',
    ],
    monthlyRent: 5000,
    capacity: 2,
    currentOccupants: 2,
    vacancies: 0,
    status: 'Occupied',
    features: ['Hot Shower', 'Heater', 'Private CR', 'Cabinet', 'Mountain View'],
  },
  {
    id: 'unit-006-b',
    propertyId: 'prop-006',
    name: 'Oak Room',
    accommodationType: 'Room for Rent',
    images: [
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',
    ],
    monthlyRent: 4000,
    capacity: 2,
    currentOccupants: 1,
    vacancies: 1,
    status: 'Available',
    features: ['Hot Shower', 'Shared CR', 'Cabinet'],
  },
  {
    id: 'unit-006-c',
    propertyId: 'prop-006',
    name: 'Cedar Suite',
    accommodationType: 'Room for Rent',
    images: [
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',
      'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=800&q=80',
    ],
    monthlyRent: 8000,
    capacity: 3,
    currentOccupants: 0,
    vacancies: 3,
    status: 'Available',
    features: ['Hot Shower', 'Heater', 'Private CR', 'Kitchenette', 'Mountain View', 'Fireplace'],
  },
];

// =============================================================================
// SERVICE
// =============================================================================

export const mockUnitService = {
  async getUnitsByPropertyId(propertyId: string): Promise<Unit[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return MOCK_UNITS.filter((u) => u.propertyId === propertyId);
  },

  async getUnitById(unitId: string): Promise<Unit | null> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return MOCK_UNITS.find((u) => u.id === unitId) || null;
  },
};
