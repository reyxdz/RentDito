import type { Unit } from '../../domain/entities/Unit';
// White dorm unit images ========================================================
// Room 2
import rm2Img1 from '../../assets/properties/white_dorm/units/room2/room2_img1.jpg';
import rm2Img2 from '../../assets/properties/white_dorm/units/room2/room2_img2.jpg';
import rm2Img3 from '../../assets/properties/white_dorm/units/room2/room2_img3.jpg';
import rm2Img4 from '../../assets/properties/white_dorm/units/room2/room2_img4.jpg';
import rm2Img5 from '../../assets/properties/white_dorm/units/room2/room2_img5.jpg';
import rm2Img6 from '../../assets/properties/white_dorm/units/room2/room2_img6.jpg';
import rm2Img7 from '../../assets/properties/white_dorm/units/room2/room2_img7.jpg';
// Room 3 
import rm3Img1 from '../../assets/properties/white_dorm/units/room3/room3_img1.jpg';
import rm3Img2 from '../../assets/properties/white_dorm/units/room3/room3_img2.jpg';
import rm3Img3 from '../../assets/properties/white_dorm/units/room3/room3_img3.jpg';
import rm3Img4 from '../../assets/properties/white_dorm/units/room3/room3_img4.jpg';
// Room 4
import rm4Img1 from '../../assets/properties/white_dorm/units/room4/room4_img1.jpg';
import rm4Img2 from '../../assets/properties/white_dorm/units/room4/room4_img2.jpg';
import rm4Img3 from '../../assets/properties/white_dorm/units/room4/room4_img3.jpg';

// Room 6
import rm6Img1 from '../../assets/properties/white_dorm/units/room6/room6_img1.jpg';
import rm6Img2 from '../../assets/properties/white_dorm/units/room6/room6_img2.jpg';
import rm6Img3 from '../../assets/properties/white_dorm/units/room6/room6_img3.jpg';

//==============================================================================



// =============================================================================
// HARDCODED UNIT DATA
// Edit the entries below to update unit listings per property.
// After editing, rebuild and redeploy: npm run build && npx vercel --prod
// =============================================================================

const MOCK_UNITS: Unit[] = [
  // ── White Dorm Property (prop-white-dorm) ────────────────────────────────
  {
    id: 'unit-white-dorm-room2',
    propertyId: 'prop-white-dorm',
    name: 'Room 2',
    accommodationType: 'Bedspace',
    images: [
      rm2Img1, rm2Img2, rm2Img3, rm2Img4, rm2Img5, rm2Img6, rm2Img7
    ],
    monthlyRent: 2500,
    capacity: 8,
    currentOccupants: 0,
    vacancies: 8,
    status: 'Available',
    features: ['Foam', 'Pillow', 'WiFi', 'Clip Fan', 'Table', 'Chair'],
    otherDetails: [
      'Vacant as a room or for Bedspace',
    ],
  },
    {
    id: 'unit-white-dorm-room3',
    propertyId: 'prop-white-dorm',
    name: 'Room 3',
    accommodationType: 'Bedspace',
    images: [
      rm3Img1, rm3Img2, rm3Img3, rm3Img4
    ],
    monthlyRent: 2500,
    capacity: 4,
    currentOccupants: 0,
    vacancies: 4,
    status: 'Available',
    features: ['Foam', 'Pillow', 'WiFi', 'Clip Fan', 'Table', 'Chair'],
    otherDetails: [
      'Vacant as a room or for Bedspace',
    ],
  },
      {
    id: 'unit-white-dorm-room4',
    propertyId: 'prop-white-dorm',
    name: 'Room 4',
    accommodationType: 'Bedspace',
    images: [
      rm4Img1, rm4Img2, rm4Img3
    ],
    monthlyRent: 2500,
    capacity: 2,
    currentOccupants: 0,
    vacancies: 2,
    status: 'Available',
    features: ['Foam', 'Pillow', 'WiFi', 'Clip Fan', 'Table', 'Chair'],
    otherDetails: [
      'Vacant as a room or for Bedspace',
    ],
  },

      {
    id: 'unit-white-dorm-room6',
    propertyId: 'prop-white-dorm',
    name: 'Room 6',
    accommodationType: 'Bedspace',
    images: [
      rm6Img1, rm6Img2, rm6Img3
    ],
    monthlyRent: 2500,
    capacity: 4,
    currentOccupants: 0,
    vacancies: 4,
    status: 'Available',
    features: ['Foam', 'Pillow', 'WiFi', 'Clip Fan', 'Table', 'Chair'],
    otherDetails: [
      'Vacant as a room or for Bedspace',
    ],
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
