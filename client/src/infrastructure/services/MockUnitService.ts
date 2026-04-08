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
// Room 7
import rm7Img1 from '../../assets/properties/white_dorm/units/room7/room7_img1.jpg';
import rm7Img2 from '../../assets/properties/white_dorm/units/room7/room7_img2.jpg';
import rm7Img3 from '../../assets/properties/white_dorm/units/room7/room7_img3.jpg';
import rm7Img4 from '../../assets/properties/white_dorm/units/room7/room7_img4.jpg';
import rm7Img5 from '../../assets/properties/white_dorm/units/room7/room7_img5.jpg';
// Room 15
import rm15Img1 from '../../assets/properties/white_dorm/units/room15/room15_img1.jpg';
import rm15Img2 from '../../assets/properties/white_dorm/units/room15/room15_img2.jpg';
import rm15Img3 from '../../assets/properties/white_dorm/units/room15/room15_img3.jpg';
import rm15Img4 from '../../assets/properties/white_dorm/units/room15/room15_img4.jpg';
import rm15Img5 from '../../assets/properties/white_dorm/units/room15/room15_img5.jpg';
// Room 16
import rm16Img1 from '../../assets/properties/white_dorm/units/room16/room16_img1.jpg';
import rm16Img2 from '../../assets/properties/white_dorm/units/room16/room16_img2.jpg';
import rm16Img3 from '../../assets/properties/white_dorm/units/room16/room16_img3.jpg';
import rm16Img4 from '../../assets/properties/white_dorm/units/room16/room16_img4.jpg';
import rm16Img5 from '../../assets/properties/white_dorm/units/room16/room16_img5.jpg';
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
    {
    id: 'unit-white-dorm-room7',
    propertyId: 'prop-white-dorm',
    name: 'Room 7',
    accommodationType: 'Bedspace',
    images: [
      rm7Img1, rm7Img2, rm7Img3, rm7Img4, rm7Img5
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
    id: 'unit-white-dorm-room15',
    propertyId: 'prop-white-dorm',
    name: 'Room 15',
    accommodationType: 'Bedspace',
    images: [
      rm15Img1, rm15Img2, rm15Img3, rm15Img4, rm15Img5
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
    id: 'unit-white-dorm-room16',
    propertyId: 'prop-white-dorm',
    name: 'Room 16',
    accommodationType: 'Bedspace',
    images: [
      rm16Img1, rm16Img2, rm16Img3, rm16Img4, rm16Img5
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
