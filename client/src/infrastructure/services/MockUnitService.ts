import type { Unit } from '../../domain/entities/Unit';

import rm2Img1 from '../../assets/properties/white_dorm/units/room2/room2_img1.jpg';
import rm2Img2 from '../../assets/properties/white_dorm/units/room2/room2_img2.jpg';
import rm2Img3 from '../../assets/properties/white_dorm/units/room2/room2_img3.jpg';
import rm2Img4 from '../../assets/properties/white_dorm/units/room2/room2_img4.jpg';
import rm2Img5 from '../../assets/properties/white_dorm/units/room2/room2_img5.jpg';
import rm2Img6 from '../../assets/properties/white_dorm/units/room2/room2_img6.jpg';
import rm2Img7 from '../../assets/properties/white_dorm/units/room2/room2_img7.jpg';
// Uytengso Boarding House Unit
import uyRm1Img1 from '../../assets/properties/uytengso/units/room1/room1_t.jpg';
import uyRm1Img2 from '../../assets/properties/uytengso/units/room1/room1_u.jpg';
import uyRm1Img3 from '../../assets/properties/uytengso/units/room1/room1_y.jpg';

// =============================================================================
// HAR
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
    id: 'unit-uytengso',
    propertyId: 'prop-uytengson-boardings',
    name: 'Room 1',
    accommodationType: 'Bedspace',
    images: [
      uyRm1Img1, uyRm1Img2, uyRm1Img3
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
