// ============================================================
// Steadfast Test Fixtures
// Mock responses from Steadfast web interface
// ============================================================

export const STEADFAST_LOGIN_PAGE_HTML = `
<!DOCTYPE html>
<html>
<head><title>Login</title></head>
<body>
  <form method="POST" action="/login">
    <input type="hidden" name="_token" value="csrf-token-abc123" />
    <input type="email" name="email" />
    <input type="password" name="password" />
  </form>
</body>
</html>
`;

export const STEADFAST_FRAUD_RESPONSE = {
  success_count: 3,
  cancel_count: 1,
  total_count: 4,
};

export const STEADFAST_LOGOUT_PAGE_HTML = `
<!DOCTYPE html>
<html>
<head><meta name="csrf-token" content="logout-csrf-token-xyz" /></head>
<body></body>
</html>
`;
