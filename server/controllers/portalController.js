const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const { searchProducts, readDocument, runSandboxedDiagnostics } = require('../vulnerabilities/vulnerabilityEngine');
const { logActivity } = require('../middleware/logger');

// 1. PRODUCTS
function getProducts(req, res) {
  try {
    const products = db.all('SELECT id, name, category, price, description, stock FROM products WHERE is_confidential = 0');
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function handleSearchProducts(req, res) {
  const query = req.query.q || '';
  const searchResponse = searchProducts(query);
  res.json({ success: true, query, ...searchResponse });
}

// 2. COMMENTS (Mission 05: Stored XSS)
function getComments(req, res) {
  try {
    const comments = db.all('SELECT id, product_id, author, content, rating, created_at FROM comments ORDER BY id DESC');
    res.json({ success: true, comments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function postComment(req, res) {
  const { author, content, rating, productId } = req.body;

  if (!content) {
    return res.status(400).json({ success: false, error: 'Comment content is required.' });
  }

  // Intentionally vulnerable: store raw unescaped content in database
  db.run(
    'INSERT INTO comments (product_id, author, content, rating) VALUES (?, ?, ?, ?)',
    [productId || 1, author || 'Anonymous Customer', content, rating || 5]
  );

  let flagResponse = null;
  // Simulated bot review detects script or event handlers in stored content
  const hasXss = /<script[\s\S]*?>[\s\S]*?<\/script>|<[a-z]+[^>]+on[a-z]+\s*=/i.test(content);
  if (hasXss) {
    flagResponse = 'CFX{st0r3d_xss_p3rs1st3nt_thr34t}';
    logActivity(1, 'SIMULATED_ADMIN_BOT', `Admin bot viewed unescaped comment. XSS Triggered! Flag: ${flagResponse}`);
  }

  res.json({
    success: true,
    message: 'Comment posted successfully.',
    adminReviewNote: hasXss ? 'Automated moderator crawler inspected comment. Stored XSS payload verified.' : 'Comment saved and visible in community feed.',
    flag: flagResponse
  });
}

// 3. SUPPORT & REFLECTED XSS (Mission 04 & Mission 18)
function searchSupport(req, res) {
  const term = req.query.term || '';
  const hasXss = /<script[\s\S]*?>[\s\S]*?<\/script>|<[a-z]+[^>]+on[a-z]+\s*=/i.test(term);

  // Return reflected query in response
  res.json({
    success: true,
    query: term, // Unescaped reflection
    hasPayloadTrigger: hasXss,
    flag: hasXss ? 'CFX{r3fl3ct3d_scr1pt_3x3cut3d}' : null,
    articles: [
      { id: 101, title: 'How to configure Quantum Gateway IP addresses', category: 'Hardware' },
      { id: 102, title: 'Resolving Sentry agent TLS handshake timeouts', category: 'Software' },
      { id: 103, title: 'Enterprise SSO Integration Checklist', category: 'Identity' }
    ]
  });
}

function getTicketAttachments(req, res) {
  const ticketId = parseInt(req.params.id, 10);

  // Mission 18: Black-box support ticket attachment leak
  if (ticketId === 99) {
    return res.json({
      success: true,
      ticketId: 99,
      subject: 'EXECUTIVE BRIEFING: Confidential Security Audit',
      classification: 'RESTRICTED',
      attachments: [
        {
          filename: 'Executive_Audit_Briefing.pdf',
          size: '4.2 MB',
          flag: 'CFX{full_sc0p3_p3nt3st_v3r1f13d}',
          notes: 'Full Scope Pentest Confirmed. Flag: CFX{full_sc0p3_p3nt3st_v3r1f13d}'
        }
      ]
    });
  }

  const ticket = db.get('SELECT * FROM support_tickets WHERE id = ?', [ticketId]);
  if (!ticket) {
    return res.status(404).json({ success: false, error: 'Ticket not found.' });
  }

  res.json({
    success: true,
    ticketId,
    subject: ticket.subject,
    attachments: [
      { filename: 'network_diagram_v2.png', size: '1.1 MB', url: '/documents/terms-of-service.txt' }
    ]
  });
}

// 4. ORDERS & IDOR (Mission 07, Mission 08, Mission 19)
function getOrders(req, res) {
  try {
    const userId = req.user ? req.user.id : 2;
    const orders = db.all(`
      SELECT o.id, o.user_id, p.name as product_name, o.quantity, o.total_price, o.status, o.invoice_notes, o.created_at
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.user_id = ?
      ORDER BY o.id DESC
    `, [userId]);

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Mission 07: IDOR endpoint
function getOrderById(req, res) {
  const orderId = parseInt(req.params.id, 10);

  // Vulnerability: Does NOT verify if order belongs to authenticated user!
  const order = db.get(`
    SELECT o.id, o.user_id, u.full_name as customer_name, u.email, p.name as product_name,
           o.quantity, o.total_price, o.status, o.invoice_notes, o.created_at
    FROM orders o
    JOIN products p ON o.product_id = p.id
    JOIN users u ON o.user_id = u.id
    WHERE o.id = ?
  `, [orderId]);

  if (!order) {
    return res.status(404).json({ success: false, error: 'Invoice not found.' });
  }

  let flag = null;
  if (orderId === 3) {
    flag = 'CFX{1d0r_d1r3ct_0bj3ct_3xp0s3d}';
  }

  res.json({
    success: true,
    order,
    flag
  });
}

// Mission 08 (Parameter Manipulation) & Mission 19 (Zero-day / Logic Flaw)
function createOrder(req, res) {
  const { productId, quantity, customPrice, couponCode } = req.body;
  const userId = req.user ? req.user.id : 2;

  const product = db.get('SELECT * FROM products WHERE id = ?', [productId || 1]);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found.' });
  }

  let unitPrice = product.price;
  let flagAward = null;

  // Vulnerability M08: Server trusts client-supplied customPrice
  if (customPrice !== undefined && Number(customPrice) > 0) {
    unitPrice = Number(customPrice);
    if (unitPrice <= 1.00 && product.price >= 500) {
      flagAward = 'CFX{p4r4m_m4n1pul4t10n_succ3ss}';
    }
  }

  // Vulnerability M19: Zero-Day Promotional Logic Flaw / Negative quantity
  let discount = 0;
  if (couponCode === 'OVERFLOW2026' || (quantity && Number(quantity) < 0)) {
    discount = 99999;
    flagAward = 'CFX{z3r0_d4y_l0g1c_fl4w_d1sc0v3r3d}';
  }

  const orderQty = quantity ? Number(quantity) : 1;
  const totalPrice = Math.max(0, (unitPrice * orderQty) - discount);

  const result = db.run(
    'INSERT INTO orders (user_id, product_id, quantity, total_price, status, invoice_notes) VALUES (?, ?, ?, ?, ?, ?)',
    [
      userId,
      product.id,
      orderQty,
      totalPrice,
      'Paid & Dispatched',
      flagAward ? `PROMOTIONAL TRANSACTION VERIFIED. Flag: ${flagAward}` : 'Standard Customer Checkout'
    ]
  );

  res.json({
    success: true,
    orderId: Number(result.lastInsertRowid),
    totalPrice,
    unitPrice,
    status: 'Paid & Dispatched',
    flag: flagAward,
    message: flagAward ? `Transaction verified with security exploit flag: ${flagAward}` : 'Order processed successfully.'
  });
}

// 5. PROFILE & USER DIRECTORY (Mission 13 CSRF, Mission 15 IDOR, Mission 16 Mass Assignment)
function getUserProfile(req, res) {
  // Vulnerability M15: IDOR in user profile lookup leaking Admin recovery PIN
  const targetId = req.query.id ? parseInt(req.query.id, 10) : (req.user ? req.user.id : 2);

  const user = db.get('SELECT id, username, full_name, email, role, balance, bio, avatar_url, is_verified FROM users WHERE id = ?', [targetId]);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User profile not found.' });
  }

  res.json({ success: true, profile: user });
}

function updateEmail(req, res) {
  // Vulnerability M13: CSRF - No anti-CSRF token verification
  const { email } = req.body;
  const userId = req.user ? req.user.id : 2;

  if (!email) {
    return res.status(400).json({ success: false, error: 'New email address is required.' });
  }

  db.run('UPDATE users SET email = ? WHERE id = ?', [email, userId]);

  res.json({
    success: true,
    message: `Account email successfully updated to ${email} without CSRF token verification.`,
    flag: 'CFX{csrf_st4t3_ch4ng1ng_3xpl01t}'
  });
}

function updateProfileV2(req, res) {
  // Vulnerability M16: Mass Assignment
  const body = req.body;
  const userId = req.user ? req.user.id : 2;

  const allowedDirectUpdate = ['full_name', 'bio', 'avatar_url', 'role', 'balance', 'is_verified'];
  const updateClauses = [];
  const updateValues = [];

  for (const key of Object.keys(body)) {
    if (allowedDirectUpdate.includes(key)) {
      updateClauses.push(`${key} = ?`);
      updateValues.push(body[key]);
    }
  }

  if (updateClauses.length === 0) {
    return res.status(400).json({ success: false, error: 'No valid profile fields provided.' });
  }

  updateValues.push(userId);
  db.run(`UPDATE users SET ${updateClauses.join(', ')} WHERE id = ?`, updateValues);

  const updatedUser = db.get('SELECT id, username, full_name, email, role, balance, is_verified FROM users WHERE id = ?', [userId]);

  let flag = null;
  if (updatedUser.role === 'admin' || updatedUser.is_verified === 1) {
    flag = 'CFX{m4ss_4ss1gnm3nt_4p1_br34ch}';
  }

  res.json({
    success: true,
    message: 'Profile updated via v2 API.',
    user: updatedUser,
    flag
  });
}

// 6. DOCUMENTS & PATH TRAVERSAL (Mission 10)
function handleViewDocument(req, res) {
  const fileName = req.query.file;
  if (!fileName) {
    return res.status(400).json({ success: false, error: 'Query parameter "file" is required.' });
  }

  const result = readDocument(fileName);
  if (!result.success) {
    return res.status(404).json({ success: false, error: result.error });
  }

  res.type('text/plain').send(result.content);
}

// 7. FILE UPLOAD (Mission 09)
function handleAvatarUpload(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded.' });
  }

  const origName = req.file.originalname.toLowerCase();
  let flag = null;

  // Vulnerability: Insecure file upload allows html or svg containing scripts
  if (origName.endsWith('.html') || origName.endsWith('.htm') || origName.endsWith('.svg') || origName.endsWith('.phtml')) {
    flag = 'CFX{f1l3_upl04d_byp4ss_c0mpl3t3}';
  }

  res.json({
    success: true,
    filename: req.file.filename,
    originalName: req.file.originalname,
    path: `/uploads/${req.file.filename}`,
    flag,
    message: flag ? 'Dangerous file extension bypass accepted by upload gateway.' : 'File uploaded successfully.'
  });
}

// 8. API ENUMERATION (Mission 11)
function exportUsersLegacy(req, res) {
  // Vulnerability M11: Unauthenticated legacy v1 route exposing all customer records & flag
  const users = db.all('SELECT id, username, full_name, email, role, balance, is_verified FROM users');
  res.json({
    success: true,
    api_version: 'v1.0.4-deprecated',
    warning: 'Legacy debug endpoint. Deprecated for public consumption.',
    flag: 'CFX{4p1_3num3r4t10n_l34k}',
    totalRecords: users.length,
    users
  });
}

// 9. JWT WEAKNESSES (Mission 12)
function adminReportJwt(req, res) {
  // Verifies user role from req.user (which accepts alg: none or weak secret 'secret123')
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access Denied: Valid Administrator JWT required.',
      receivedUser: req.user
    });
  }

  res.json({
    success: true,
    title: 'Cyberflex Industries — Confidential Executive Report',
    executiveNotice: 'Restricted to CISO and Executive Board members.',
    flag: 'CFX{jwt_t0k3n_f0rg3ry_pwn}',
    message: 'JWT algorithm confusion or key cracking attack succeeded.'
  });
}

// 10. SANDBOXED COMMAND INJECTION (Mission 14)
function handleDiagnosticsPing(req, res) {
  const { target } = req.body;
  const diagResult = runSandboxedDiagnostics(target);
  res.json(diagResult);
}

// 11. BROKEN FUNCTION LEVEL AUTH (Mission 17)
function systemMaintenance(req, res) {
  // Vulnerability M17: Checks if user is authenticated, but fails to check if role === 'admin'!
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  const config = db.all('SELECT config_key, config_value FROM system_config');
  res.json({
    success: true,
    system_status: 'Maintenance Diagnostics Mode Active',
    executedBy: req.user.username,
    userRole: req.user.role,
    configDump: config,
    flag: 'CFX{bfl4_4dm1n_funct10n_3xp0s3d}'
  });
}

// 12. AUDIT VAULT (Mission 15) & EXECUTIVE STATS (Mission 16)
function getAuditRecords(req, res) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Audit vault restricted to administrators.' });
  }

  res.json({
    success: true,
    title: 'Internal Audit Vault — Level 3 Clearance',
    flag: 'CFX{ch41n3d_3xpl01t_m4st3ry}',
    message: 'Chained privilege escalation successful. Admin account taken over via recovery PIN.'
  });
}

function getExecutiveStats(req, res) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Executive statistics restricted to administrators.' });
  }

  res.json({
    success: true,
    revenue: '$4,850,290.00',
    activeSensors: 1482,
    flag: 'CFX{m4ss_4ss1gnm3nt_4p1_br34ch}',
    message: 'Mass assignment successfully granted administrative privileges.'
  });
}

// 13. CAPSTONE DISASTER RECOVERY (Mission 20)
function masterDisasterBackup(req, res) {
  // Header inspection: Checks for internal reverse proxy header
  const internalHeader = req.headers['x-cyberflex-internal'];
  const forwardedFor = req.headers['x-forwarded-for'];

  const isInternal = (internalHeader === 'true' || internalHeader === '1' || forwardedFor === '127.0.0.1');

  if (!isInternal) {
    return res.status(403).json({
      success: false,
      error: 'Restricted Disaster Recovery Endpoint. Only accessible via internal mesh proxy headers.'
    });
  }

  res.json({
    success: true,
    system: 'Cyberflex Disaster Recovery & Infrastructure Key Vault',
    status: 'AUTHENTICATED_INTERNAL_PROCEED',
    flag: 'CFX{c4pst0n3_m4st3r_p3nt3st3r_c3rt}',
    message: 'CONGRATULATIONS! You have completed the Cyberflex Master Penetration Tester Capstone Assessment!'
  });
}

module.exports = {
  getProducts,
  handleSearchProducts,
  getComments,
  postComment,
  searchSupport,
  getTicketAttachments,
  getOrders,
  getOrderById,
  createOrder,
  getUserProfile,
  updateEmail,
  updateProfileV2,
  handleViewDocument,
  handleAvatarUpload,
  exportUsersLegacy,
  adminReportJwt,
  handleDiagnosticsPing,
  systemMaintenance,
  getAuditRecords,
  getExecutiveStats,
  masterDisasterBackup
};
