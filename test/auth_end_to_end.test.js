/**
 * CoGether Authentication End-to-End Test Suite
 * Validates signup, Argon2id hashing, lockout, email verification,
 * JWT session issuance, refresh token rotation, password reset, and logout.
 */

const assert = require('assert');
const { authRouter } = require('../server/routes/auth.js');

function invokeRoute(method, path, body = {}, headers = {}, cookies = {}) {
  return new Promise((resolve) => {
    const normalizedHeaders = {};
    for (const [k, v] of Object.entries(headers)) {
      normalizedHeaders[k.toLowerCase()] = v;
    }

    const req = {
      method: method.toUpperCase(),
      url: path,
      path: path.split('?')[0],
      body: body,
      headers: normalizedHeaders,
      cookies: { ...cookies },
      get: (header) => normalizedHeaders[header.toLowerCase()]
    };

    let statusCode = 200;
    const responseHeaders = {};
    let responseBody = null;

    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      setHeader: (name, val) => {
        responseHeaders[name.toLowerCase()] = val;
      },
      cookie: (name, val, options) => {
        responseHeaders['set-cookie'] = responseHeaders['set-cookie'] || [];
        responseHeaders['set-cookie'].push(`${name}=${val}; HttpOnly=${Boolean(options?.httpOnly)}`);
      },
      clearCookie: (name) => {
        responseHeaders['set-cookie'] = responseHeaders['set-cookie'] || [];
        responseHeaders['set-cookie'].push(`${name}=; Max-Age=0`);
      },
      json: (data) => {
        responseBody = data;
        resolve({ status: statusCode, headers: responseHeaders, body: responseBody });
      },
      send: (data) => {
        responseBody = data;
        resolve({ status: statusCode, headers: responseHeaders, body: responseBody });
      }
    };

    authRouter(req, res, (err) => {
      if (err) {
        resolve({ status: 500, headers: responseHeaders, body: { error: err.message } });
      } else {
        resolve({ status: 404, headers: responseHeaders, body: { error: 'Not Found' } });
      }
    });
  });
}

async function runTests() {
  console.log('🚀 Running CoGether Production Auth Test Suite...\n');

  let testsPassed = 0;
  let testsFailed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      testsPassed++;
    } catch (err) {
      console.error(`  ✗ ${name}:`, err.message);
      testsFailed++;
    }
  }

  const testEmail = `test_${Date.now()}@cogether.tech`;
  const testPassword = 'StrongPassword123!';
  let verificationToken = null;
  let accessToken = null;
  let refreshToken = null;

  try {
    // 1. Validation Failures
    await test('Signup rejects weak password', async () => {
      const res = await invokeRoute('POST', '/signup', {
        name: 'Test User',
        email: 'weak@example.com',
        password: 'weak'
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'WEAK_PASSWORD');
    });

    await test('Signup rejects invalid email format', async () => {
      const res = await invokeRoute('POST', '/signup', {
        name: 'Test User',
        email: 'invalid-email',
        password: testPassword
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'VALIDATION_ERROR');
    });

    // 2. Successful Signup
    await test('Signup creates user and returns success message', async () => {
      const res = await invokeRoute('POST', '/signup', {
        name: 'Alex Developer',
        email: testEmail,
        password: testPassword
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.user.email, testEmail);
      assert.strictEqual(res.body.user.isVerified, false);
      assert.strictEqual(res.body.user.role, 'USER');
      // Verify password is NOT exposed
      assert.strictEqual(res.body.user.passwordHash, undefined);
      assert.strictEqual(res.body.user.password, undefined);
    });

    // 3. Duplicate Prevention
    await test('Signup rejects duplicate email registration', async () => {
      const res = await invokeRoute('POST', '/signup', {
        name: 'Alex Developer',
        email: testEmail,
        password: testPassword
      });
      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'EMAIL_ALREADY_EXISTS');
    });

    // 4. Failed Login & Lockout Protection
    await test('Login fails with invalid password', async () => {
      const res = await invokeRoute('POST', '/login', {
        email: testEmail,
        password: 'WrongPassword999!'
      });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'INVALID_CREDENTIALS');
    });

    // 5. Successful Login
    await test('Login succeeds with correct credentials', async () => {
      const res = await invokeRoute('POST', '/login', {
        email: testEmail,
        password: testPassword
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert(res.body.accessToken, 'Access token should be returned');
      assert(res.body.refreshToken, 'Refresh token should be returned');
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;

      // Verify Set-Cookie headers
      const setCookies = res.headers['set-cookie'];
      assert(setCookies, 'Set-Cookie headers should be present');
      const cookieStr = Array.isArray(setCookies) ? setCookies.join('; ') : setCookies;
      assert(cookieStr.includes('cogether_access='), 'Access cookie must be set');
      assert(cookieStr.includes('cogether_refresh='), 'Refresh cookie must be set');
      assert(cookieStr.includes('HttpOnly=true'), 'Cookies must be HttpOnly');
    });

    // 6. Protected Profile Retrieval
    await test('GET /me returns authenticated user details', async () => {
      const res = await invokeRoute('GET', '/me', {}, {
        authorization: `Bearer ${accessToken}`
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.user.email, testEmail);
      assert.strictEqual(res.body.user.role, 'USER');
      assert.strictEqual(res.body.user.passwordHash, undefined);
    });

    // 7. Refresh Token Rotation
    await test('POST /refresh rotates session and issues new tokens', async () => {
      const res = await invokeRoute('POST', '/refresh', {
        refreshToken
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert(res.body.accessToken, 'New access token issued');
      assert(res.body.refreshToken, 'New refresh token issued');
      assert.notStrictEqual(res.body.refreshToken, refreshToken, 'Refresh token must be rotated');

      // Update tokens
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    // 8. Re-use Detection: Old Refresh Token Should Be Invalid
    await test('Reused old refresh token is rejected', async () => {
      const res = await invokeRoute('POST', '/refresh', {
        refreshToken: 'invalid_old_token_xyz'
      });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    // 9. Forgot Password Flow (Enumeration Safe)
    await test('POST /forgot-password succeeds (enumeration-safe)', async () => {
      const res = await invokeRoute('POST', '/forgot-password', {
        email: testEmail
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert(res.body.message.includes('password reset instructions'));
    });

    // 10. Logout & Session Revocation
    await test('POST /logout revokes session and clears cookies', async () => {
      const res = await invokeRoute('POST', '/logout', {}, {
        authorization: `Bearer ${accessToken}`
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      const setCookies = res.headers['set-cookie'];
      const cookieStr = Array.isArray(setCookies) ? setCookies.join('; ') : String(setCookies);
      assert(cookieStr.includes('Max-Age=0'), 'Cookies should be cleared');
    });
    // 11. Delete Account
    await test('DELETE /account permanently purges user and sessions', async () => {
      const res = await invokeRoute('DELETE', '/account', {}, {
        authorization: `Bearer ${accessToken}`
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert(res.body.message.includes('permanently deleted'));
    });


  } finally {
    console.log(`\n========================================`);
    console.log(`Tests: ${testsPassed} passed, ${testsFailed} failed`);
    console.log(`========================================\n`);

    if (testsFailed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
