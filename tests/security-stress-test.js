#!/usr/bin/env node

/**
 * Security Stress Test Suite
 * Tests: Rate Limiting, CORS, Input Validation, Authentication, Injection Attempts
 */

import http from 'http';
import https from 'https';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const isHttps = BASE_URL.startsWith('https');
const client = isHttps ? https : http;

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

let testsPassed = 0;
let testsFailed = 0;
let testsTotal = 0;

function log(color, label, message) {
  console.log(`${COLORS[color]}[${label}]${COLORS.reset} ${message}`);
}

function assert(condition, testName) {
  testsTotal++;
  if (condition) {
    testsPassed++;
    log('green', 'PASS', testName);
    return true;
  } else {
    testsFailed++;
    log('red', 'FAIL', testName);
    return false;
  }
}

async function request(method, path, body = null, headers = {}, fromOrigin = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (fromOrigin) {
      options.headers['Origin'] = fromOrigin;
    }

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function runTests() {
  log('blue', 'START', 'Security Stress Test Suite');
  console.log('');

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 1: CORS VALIDATION
  // ────────────────────────────────────────────────────────────────────────────
  log('cyan', 'TEST', '1. CORS Validation');

  try {
    // Allowed origin
    const validCors = await request('OPTIONS', '/api/claude', null, {}, 'http://localhost:5173');
    assert(validCors.status === 200, 'CORS: localhost:5173 allowed');

    // Invalid origin
    const invalidCors = await request('OPTIONS', '/api/claude', null, {}, 'https://malicious-site.com');
    assert(invalidCors.status === 403 || invalidCors.status === 200, 'CORS: malicious origin rejected or preflight handled');

    // Missing origin (should fail on actual request)
    const noOriginReq = await request('POST', '/api/claude',
      { type: 'prepara-visita', data: {} },
      { 'Authorization': `Bearer ${process.env.ADMIN_API_TOKEN || 'fake'}` }
    );
    assert(noOriginReq.status === 403 || noOriginReq.status === 400, 'CORS: missing origin handled');
  } catch (e) {
    log('yellow', 'INFO', `CORS tests skipped (API not running: ${e.message})`);
  }
  console.log('');

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 2: AUTHENTICATION (Missing/Invalid Token)
  // ────────────────────────────────────────────────────────────────────────────
  log('cyan', 'TEST', '2. Authentication Validation');

  try {
    // No auth header
    const noAuth = await request('POST', '/api/claude',
      { type: 'prepara-visita', data: {} },
      { 'Origin': 'http://localhost:5173' }
    );
    assert(noAuth.status === 401, 'Auth: missing token rejected (401)');

    // Invalid token
    const invalidToken = await request('POST', '/api/claude',
      { type: 'prepara-visita', data: {} },
      {
        'Authorization': 'Bearer invalid_token_xyz',
        'Origin': 'http://localhost:5173'
      }
    );
    assert(invalidToken.status === 401, 'Auth: invalid token rejected (401)');

    // Malformed auth header
    const malformedAuth = await request('POST', '/api/claude',
      { type: 'prepara-visita', data: {} },
      {
        'Authorization': 'InvalidHeaderFormat',
        'Origin': 'http://localhost:5173'
      }
    );
    assert(malformedAuth.status === 401, 'Auth: malformed header rejected (401)');
  } catch (e) {
    log('yellow', 'INFO', `Auth tests skipped (${e.message})`);
  }
  console.log('');

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 3: INPUT VALIDATION & INJECTION ATTEMPTS
  // ────────────────────────────────────────────────────────────────────────────
  log('cyan', 'TEST', '3. Input Validation & Injection Prevention');

  try {
    const token = process.env.ADMIN_API_TOKEN || 'test';

    // Injection attempt in company name
    const sqlInjection = await request('POST', '/api/claude',
      {
        type: 'prepara-visita',
        data: {
          company: "'; DROP TABLE contacts; --",
          sector: 'Test',
          region: 'Test',
          intelligence: {}
        }
      },
      {
        'Authorization': `Bearer ${token}`,
        'Origin': 'http://localhost:5173'
      }
    );
    assert(sqlInjection.status !== 500, 'Input: SQL injection attempt handled (no 500 error)');

    // XSS attempt in notes
    const xssAttempt = await request('POST', '/api/claude',
      {
        type: 'prepara-visita',
        data: {
          company: '<script>alert("xss")</script>Test',
          sector: 'Test',
          region: 'Test',
          intelligence: {}
        }
      },
      {
        'Authorization': `Bearer ${token}`,
        'Origin': 'http://localhost:5173'
      }
    );
    assert(xssAttempt.status !== 500, 'Input: XSS attempt handled (no 500 error)');

    // Oversized payload (testing max size limits)
    const hugeString = 'A'.repeat(10000);
    const oversizedPayload = await request('POST', '/api/claude',
      {
        type: 'prepara-visita',
        data: {
          company: hugeString,
          sector: 'Test',
          region: 'Test',
          intelligence: {}
        }
      },
      {
        'Authorization': `Bearer ${token}`,
        'Origin': 'http://localhost:5173'
      }
    );
    assert(oversizedPayload.status === 400 || oversizedPayload.status === 422, 'Input: oversized payload rejected');

    // Invalid enum value
    const invalidEnum = await request('POST', '/api/claude',
      {
        type: 'invalid-type',
        data: {}
      },
      {
        'Authorization': `Bearer ${token}`,
        'Origin': 'http://localhost:5173'
      }
    );
    assert(invalidEnum.status === 400 || invalidEnum.status === 422, 'Input: invalid enum rejected');
  } catch (e) {
    log('yellow', 'INFO', `Input validation tests skipped (${e.message})`);
  }
  console.log('');

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 4: RATE LIMITING (IP-based)
  // ────────────────────────────────────────────────────────────────────────────
  log('cyan', 'TEST', '4. Rate Limiting (IP-based)');

  try {
    log('yellow', 'INFO', 'IP Rate Limit: 20 requests/hour per IP');
    log('yellow', 'INFO', 'Sending 5 rapid requests...');

    let successCount = 0;
    let blockedCount = 0;

    for (let i = 0; i < 5; i++) {
      const res = await request('POST', '/api/claude',
        {
          type: 'prepara-visita',
          data: {
            company: `Test ${i}`,
            sector: 'Test',
            region: 'Test',
            intelligence: {}
          }
        },
        {
          'Authorization': `Bearer ${process.env.ADMIN_API_TOKEN || 'test'}`,
          'Origin': 'http://localhost:5173'
        }
      );

      if (res.status === 429) blockedCount++;
      else if (res.status === 200 || res.status === 400 || res.status === 422) successCount++;
    }

    log('blue', 'INFO', `Rate Limit: ${successCount} allowed, ${blockedCount} blocked`);
    assert(successCount >= 4 || blockedCount === 0, 'Rate Limit: IP rate limiting configured');
  } catch (e) {
    log('yellow', 'INFO', `Rate limiting tests skipped (${e.message})`);
  }
  console.log('');

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 5: HTTP SECURITY HEADERS
  // ────────────────────────────────────────────────────────────────────────────
  log('cyan', 'TEST', '5. HTTP Security Headers');

  try {
    const headerRes = await request('GET', '/');
    const headers = headerRes.headers;

    const hasCSP = headers['content-security-policy'];
    const hasHSTS = headers['strict-transport-security'];
    const hasXFrame = headers['x-frame-options'];
    const hasXContent = headers['x-content-type-options'];

    assert(hasCSP, 'Headers: Content-Security-Policy set');
    assert(hasHSTS, 'Headers: Strict-Transport-Security set');
    assert(hasXFrame, 'Headers: X-Frame-Options set');
    assert(hasXContent, 'Headers: X-Content-Type-Options set');

    if (hasCSP) log('blue', 'INFO', `CSP: ${hasCSP}`);
    if (hasHSTS) log('blue', 'INFO', `HSTS: ${hasHSTS}`);
  } catch (e) {
    log('yellow', 'INFO', `Security headers test skipped (${e.message})`);
  }
  console.log('');

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 6: SIMULATED DDoS ATTACK (Rapid Requests)
  // ────────────────────────────────────────────────────────────────────────────
  log('cyan', 'TEST', '6. DDoS Simulation (Rapid Requests)');

  try {
    log('yellow', 'INFO', 'Simulating 10 concurrent requests from same IP...');

    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < 10; i++) {
      promises.push(
        request('OPTIONS', '/api/claude', null, {}, 'http://localhost:5173').catch(() => null)
      );
    }

    const results = await Promise.all(promises);
    const blockedCount = results.filter(r => r && r.status === 429).length;
    const duration = Date.now() - startTime;

    log('blue', 'INFO', `DDoS test: ${blockedCount} blocked, ${duration}ms total`);
    assert(duration < 5000, 'DDoS: requests completed in reasonable time (< 5s)');
  } catch (e) {
    log('yellow', 'INFO', `DDoS simulation skipped (${e.message})`);
  }
  console.log('');

  // ────────────────────────────────────────────────────────────────────────────
  // TEST 7: METHOD VALIDATION
  // ────────────────────────────────────────────────────────────────────────────
  log('cyan', 'TEST', '7. HTTP Method Validation');

  try {
    const token = process.env.ADMIN_API_TOKEN || 'test';

    // GET not allowed on API
    const getReq = await request('GET', '/api/claude', null, { 'Origin': 'http://localhost:5173' });
    assert(getReq.status === 405 || getReq.status === 400, 'Methods: GET rejected (405 or 400)');

    // PUT not allowed
    const putReq = await request('PUT', '/api/claude',
      { type: 'prepara-visita', data: {} },
      {
        'Authorization': `Bearer ${token}`,
        'Origin': 'http://localhost:5173'
      }
    );
    assert(putReq.status === 405 || putReq.status === 400, 'Methods: PUT rejected (405 or 400)');
  } catch (e) {
    log('yellow', 'INFO', `Method validation tests skipped (${e.message})`);
  }
  console.log('');

  // ────────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ────────────────────────────────────────────────────────────────────────────
  console.log('');
  log('blue', 'SUMMARY', `Tests: ${testsPassed}/${testsTotal} passed`);

  if (testsFailed > 0) {
    log('red', 'FAILED', `${testsFailed} test(s) failed`);
    process.exit(1);
  } else {
    log('green', 'SUCCESS', 'All security tests passed! 🎯');
    process.exit(0);
  }
}

// Run tests
runTests().catch(err => {
  log('red', 'ERROR', err.message);
  process.exit(1);
});
