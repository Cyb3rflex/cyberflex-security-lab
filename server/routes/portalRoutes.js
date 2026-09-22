const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const portalController = require('../controllers/portalController');

// Configure upload storage (intentionally insecure: keeps original extension)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve(__dirname, '../../uploads'));
  },
  filename: function (req, file, cb) {
    const safeName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, safeName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Products & Search (SQLi)
router.get('/products', portalController.getProducts);
router.get('/products/search', portalController.handleSearchProducts);

// Comments (Stored XSS)
router.get('/comments', portalController.getComments);
router.post('/comments', portalController.postComment);

// Support (Reflected XSS & Ticket attachments)
router.get('/support/search', portalController.searchSupport);
router.get('/support/tickets/:id/attachments', portalController.getTicketAttachments);

// Orders & IDOR
router.get('/orders', portalController.getOrders);
router.get('/orders/:id', portalController.getOrderById);
router.post('/orders', portalController.createOrder);

// Profile, CSRF, Mass Assignment & IDOR
router.get('/user/profile', portalController.getUserProfile);
router.get('/users/profile', portalController.getUserProfile);
router.post('/user/update-email', portalController.updateEmail);
router.post('/v2/users/update', portalController.updateProfileV2);

// Documents & Path Traversal
router.get('/documents/view', portalController.handleViewDocument);

// File Upload
router.post('/upload/avatar', upload.single('avatar'), portalController.handleAvatarUpload);

// Legacy API Enumeration
router.get('/v1/legacy/export-users', portalController.exportUsersLegacy);

// JWT Weakness Verification
router.get('/jwt/admin-report', portalController.adminReportJwt);

// Sandboxed Command Injection
router.post('/admin/diagnostics/ping', portalController.handleDiagnosticsPing);

// Broken Function Level Auth
router.post('/admin/system-maintenance', portalController.systemMaintenance);
router.get('/admin/system-maintenance', portalController.systemMaintenance);

// Vault & Stats
router.get('/vault/audit-records', portalController.getAuditRecords);
router.get('/admin/executive-stats', portalController.getExecutiveStats);

module.exports = router;
