export const MOCK_PROPERTIES = [
  {
    name: 'White Dorm Property',
    description: 'A beautiful and well-maintained property. Ideal for students and young professionals seeking affordable and comfortable accommodation.',
    propertyType: 'Mixed Use',
    status: 'Active',
    images: [
      '/src/assets/properties/white_dorm/images/image1.jpg',
      '/src/assets/properties/white_dorm/images/image2.jpg',
      '/src/assets/properties/white_dorm/images/image3.jpg',
    ],
    address: {
      street: 'Sikatuna Street',
      city: 'Cebu City',
      province: 'Cebu',
      zipCode: '6543',
      country: 'Philippines',
    },
    inclusions: ['WiFi', 'Foam', 'Pillow', 'Table', 'Chair', 'Clip Fan', 'Electric Rice Cooker', 'Can Cook', 'Can Wash Clothes', 'No Curfew'],
    venues: {
      reviewCenters: [
        { name: 'Ecel Review Center', distance: '6 minutes walking' },
        { name: 'Manor Review Center', distance: '8 minutes walking' },
      ],
      schools: [
        { name: 'Velez College of Nursing', distance: '10 minutes walking' },
        { name: 'Cebu Normal University', distance: '10 minutes walking' },
      ],
      commercial: [
        { name: 'Ayala Cebu Business Park', distance: '28 minutes walking' },
      ],
    },
    // The metric fields are auto-calculated, but we can set defaults
    totalUnits: 7,
    occupiedUnits: 0,
    vacantUnits: 7,
    occupancyRate: 0,
  },
  {
    name: 'Uytengso Boardings House',
    description: 'A beautiful and well-maintained property. Ideal for students, young professionals, and reviewees seeking affordable and comfortable accommodation.',
    propertyType: 'Boarding House',
    status: 'Active',
    images: [
      '/src/assets/properties/uytengso/images/u.jpg',
      '/src/assets/properties/uytengso/images/y.jpg',
      '/src/assets/properties/uytengso/images/t.jpg',
    ],
    address: {
      street: 'Uytengso Street',
      city: 'Cebu City',
      province: 'Cebu',
      zipCode: '6543',
      country: 'Philippines',
    },
    inclusions: ['WiFi', 'Foam', 'Pillow', 'Table', 'Chair', 'Clip Fan', 'Electric Rice Cooker', 'Can Cook', 'Can Wash Clothes', 'No Curfew'],
    venues: {
      reviewCenters: [
        { name: 'Mega Review Center', distance: '4 minutes walking' },
        { name: 'Gold Rank Review Center', distance: '4 minutes walking' },
      ],
      schools: [
        { name: 'ACT', distance: '10 minutes walking' },
        { name: 'Cebu Normal University', distance: '5 minutes walking' },
      ],
      commercial: [
        { name: 'Robinson Fuente', distance: '5 minutes commute' },
      ],
    },
    totalUnits: 1,
    occupiedUnits: 0,
    vacantUnits: 1,
    occupancyRate: 0,
  }
];

export const MOCK_UNITS = [
  {
    // White Dorm Units
    propertyIndex: 0,
    unitIdentifier: 'Room 2',
    accommodationType: 'room',
    images: ['/src/assets/properties/white_dorm/units/room2/room2_img1.jpg'],
    roomRent: 18000,
    bedspaceRent: 2500,
    capacity: 8,
    maxOccupants: 8,
    status: 'vacant',
    features: ['Foam', 'Pillow', 'WiFi', 'Clip Fan', 'Table', 'Chair'],
    deposit: 5000,
  },
  {
    propertyIndex: 0,
    unitIdentifier: 'Room 3',
    accommodationType: 'room',
    images: ['/src/assets/properties/white_dorm/units/room3/room3_img1.jpg'],
    roomRent: 10000,
    bedspaceRent: 2500,
    capacity: 4,
    maxOccupants: 4,
    status: 'vacant',
    features: ['Foam', 'Pillow', 'WiFi', 'Clip Fan', 'Table', 'Chair'],
    deposit: 5000,
  },
  {
    propertyIndex: 0,
    unitIdentifier: 'Room 4',
    accommodationType: 'room',
    images: ['/src/assets/properties/white_dorm/units/room4/room4_img1.jpg'],
    roomRent: 5000,
    bedspaceRent: 2500,
    capacity: 2,
    maxOccupants: 2,
    status: 'vacant',
    features: ['Foam', 'Pillow', 'WiFi', 'Clip Fan', 'Table', 'Chair'],
    deposit: 5000,
  },
  {
    // Uytengso Units
    propertyIndex: 1,
    unitIdentifier: 'Room 1',
    accommodationType: 'room',
    images: ['/src/assets/properties/uytengso/units/room1/room1_t.jpg'],
    roomRent: 20000,
    bedspaceRent: 2500,
    capacity: 8,
    maxOccupants: 8,
    status: 'vacant',
    features: ['Foam', 'Pillow', 'WiFi', 'Clip Fan', 'Table', 'Chair'],
    deposit: 5000,
  },
  {
    propertyIndex: 1,
    unitIdentifier: 'Door 5 - Room 2',
    accommodationType: 'room',
    images: ['/src/assets/properties/uytengso/units/Door_5/room2/dr5r4.jpg'],
    roomRent: 2500,
    capacity: 4,
    maxOccupants: 4,
    status: 'vacant',
    features: ['Foam', 'Pillow', 'WiFi', 'Clip Fan', 'Table', 'Chair'],
    deposit: 5000,
  }
];
