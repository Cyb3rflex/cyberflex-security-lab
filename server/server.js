const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const portalRoutes = require('./routes/portalRoutes');
const labRoutes = require('./routes/labRoutes');
const portalController = require('./controllers/portalController');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsing and cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Global Authentication Middleware
app.use(authMiddleware);

// Mission 01: Reconnaissance Headers
app.use((req, res, next) => {
  res.setHeader('X-Cyberflex-Recon', 'CFX{r3c0n_f1rst_st3p_d1sc0v3r}');
  res.setHeader('X-Powered-By', 'Cyberflex-Enterprise/4.2.0-beta');
  res.setHeader('Server', 'Cyberflex-Edge-Node/1.8');
  next();
});

// Mission 01: robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Disallow: /internal/
Disallow: /backup/
Disallow: /api/v1/legacy/
Disallow: /recovery/

# Internal developer notes:
# Active environment: Production Stage 2
# Reconnaissance Verification Flag: CFX{r3c0n_f1rst_st3p_d1sc0v3r}
`);
});

// Mission 02: Internal Endpoint Discovery (/internal/system-status)
app.get('/internal/system-status', (req, res) => {
  res.json({
    status: 'OPERATIONAL',
    datacenter: 'US-EAST-DC04',
    clusterHealth: '99.98%',
    activeNodes: 18,
    memoryUsage: '64.2%',
    internalNotice: 'Internal operational metrics exposed without authentication gateway.',
    flag: 'CFX{h1dd3n_d00rs_unl0ck3d}',
    unlinkedEndpoints: [
      '/internal/telemetry',
      '/backup/daily_export.tar.gz',
      '/api/v1/legacy/export-users'
    ]
  });
});

// Mission 20: Capstone Master Disaster Recovery
app.get('/recovery/master-backup', portalController.masterDisasterBackup);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/lab', labRoutes);
app.use('/api', portalRoutes);

// Static uploads serving
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Public frontend assets
app.use(express.static(path.resolve(__dirname, '../public')));

// Fallback for SPA/HTML routes
app.get('/support', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../public/support.html'));
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`  CYBERFLEX SECURITY MISSIONS LAB IS ACTIVE`);
    console.log(`  Target Portal:   http://localhost:${PORT}`);
    console.log(`  Lab Hub:         http://localhost:${PORT}/missions.html`);
    console.log(`  Environment:     Educational Local Laboratory`);
    console.log('====================================================');
  });
}

module.exports = app;
