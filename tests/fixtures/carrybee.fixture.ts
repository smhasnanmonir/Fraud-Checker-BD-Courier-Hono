// ============================================================
// Carrybee Test Fixtures
// Mock responses from Carrybee NextAuth API
// ============================================================

export const CARRYBEE_CSRF_RESPONSE = {
  csrfToken: 'carrybee-csrf-token-abc',
  callbackUrl: 'https://merchant.carrybee.com/login',
};

export const CARRYBEE_SESSION_RESPONSE = {
  accessToken: 'carrybee-access-token-xyz',
  user: {
    id: 'user-123',
    phone: '+8801712345678',
    selectedBusinessId: 'business-456',
  },
};

export const CARRYBEE_FRAUD_RESPONSE = {
  error: null,
  data: {
    total_order: 10,
    cancelled_order: 0,
    success_rate: 100.0,
  },
};
