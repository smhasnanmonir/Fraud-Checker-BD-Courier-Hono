// ============================================================
// Pathao Test Fixtures
// Mock responses from Pathao merchant API
// ============================================================

export const PATHAO_LOGIN_RESPONSE = {
  access_token: 'pathao-jwt-token-xyz',
  token_type: 'Bearer',
  expires_in: 3600,
};

export const PATHAO_SUCCESS_RESPONSE = {
  data: {
    customer: {
      successful_delivery: 5,
      total_delivery: 7,
    },
  },
};
