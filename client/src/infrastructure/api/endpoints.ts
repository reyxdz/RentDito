export const ENDPOINTS = {
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    REFRESH: '/api/auth/refresh',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    LOGOUT: '/api/auth/logout',
  },
  USER: {
    ME: '/api/users/me',
    UPDATE_ME: '/api/users/me',
    CHANGE_PASSWORD: '/api/users/me/password',
    UPLOAD_AVATAR: '/api/users/me/avatar',
    VERIFY: '/api/users/me/verify',
  },
  LANDLORD_APPLICATIONS: {
    ROOT: '/api/landlord-applications',
    ME: '/api/landlord-applications/me',
    APPROVE: (id: string) => `/api/landlord-applications/${id}/approve`,
    REJECT: (id: string) => `/api/landlord-applications/${id}/reject`,
  },
  TEAM: {
    ROOT: '/api/team',
    INVITE: '/api/team/invite',
    UPDATE: (id: string) => `/api/team/${id}`,
    UPDATE_PERMISSIONS: (id: string) => `/api/team/${id}/permissions`,
    UPDATE_PROPERTIES: (id: string) => `/api/team/${id}/properties`,
    DELETE: (id: string) => `/api/team/${id}`,
  },
  PROPERTIES: {
    ROOT: '/api/properties',
    DETAILS: (id: string) => `/api/properties/${id}`,
    STATUS: (id: string) => `/api/properties/${id}/status`,
    IMAGES: (id: string) => `/api/properties/${id}/images`,
    UNITS: (id: string) => `/api/properties/${id}/units`,
  },
  UNITS: {
    ROOT: '/api/units',
    DETAILS: (id: string) => `/api/units/${id}`,
    STATUS: (id: string) => `/api/units/${id}/status`,
    IMAGES: (id: string) => `/api/units/${id}/images`,
  },
  TENANCIES: {
    ROOT: '/api/tenancies',
    DETAILS: (id: string) => `/api/tenancies/${id}`,
  },
  INQUIRIES: {
    ROOT: '/api/inquiries',
    DETAILS: (id: string) => `/api/inquiries/${id}`,
  },
  VISITS: {
    ROOT: '/api/visits',
    DETAILS: (id: string) => `/api/visits/${id}`,
  },
  APPLICATIONS: {
    ROOT: '/api/applications',
    DETAILS: (id: string) => `/api/applications/${id}`,
  },
  CONTRACTS: {
    ROOT: '/api/contracts',
    DETAILS: (id: string) => `/api/contracts/${id}`,
  },
  BILLS: {
    ROOT: '/api/bills',
    DETAILS: (id: string) => `/api/bills/${id}`,
  },
  TICKETS: {
    ROOT: '/api/tickets',
    DETAILS: (id: string) => `/api/tickets/${id}`,
  },
  INVENTORY: {
    ROOT: '/api/inventory',
    DETAILS: (id: string) => `/api/inventory/${id}`,
  }
} as const;
