// ============================================================
// Paperfly Test Fixtures
// Mock responses from Paperfly merchant API
// ============================================================

export const PAPERFLY_LOGIN_RESPONSE = {
  token: 'paperfly-jwt-token-xyz',
  user: {
    id: 1,
    username: 'testuser',
  },
};

export const PAPERFLY_SMART_CHECK_RESPONSE = {
  totalRecords: 10,
  records: [
    { status: 'delivered', parcel_status: 'delivered' },
    { status: 'delivered', parcel_status: 'delivered' },
    { status: 'delivered', parcel_status: 'delivered' },
    { status: 'delivered', parcel_status: 'delivered' },
    { status: 'delivered', parcel_status: 'delivered' },
    { status: 'returned', parcel_status: 'returned' },
    { status: 'cancelled', parcel_status: 'cancelled' },
    { status: 'pending', parcel_status: 'pending' },
    { status: 'in_transit', parcel_status: 'in_transit' },
    { status: 'processing', parcel_status: 'processing' },
  ],
};
