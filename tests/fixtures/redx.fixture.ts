// ============================================================
// RedX Test Fixtures
// Mock responses from RedX API
// ============================================================

export const REDX_LOGIN_RESPONSE = {
  data: {
    accessToken: 'redx-access-token-abc',
    refreshToken: 'redx-refresh-token',
    expiresIn: 3600,
  },
};

export const REDX_PARCEL_RESPONSE = {
  data: {
    totalParcel: 25,
    deliveredParcel: 20,
    returnedParcel: 3,
    cancelParcel: 2,
  },
};
