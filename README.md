# Cyberflex Security Missions Lab

An educational, self-contained, intentionally vulnerable cybersecurity training web application and penetration testing laboratory.

Developed for authorized security education, computer science students, and penetration testing apprentices to practice real-world vulnerability identification, exploitation, evidence collection, and secure code remediation.

---

## ⚠️ Educational Security Disclaimer & Authorization Boundary

> [!IMPORTANT]
> **STRICT LOCAL AUTHORIZATION ONLY:**
> This software is an educational security laboratory intended exclusively for authorized training against your own local instance.
> * The laboratory runs 100% locally on `http://localhost:3000`.
> * It does NOT contain functionality intended to attack external systems, public websites, arbitrary IP addresses, or third-party infrastructure.
> * It does NOT contain malware, ransomware, spyware, keyloggers, botnet components, or host-compromising persistence mechanisms.
> * Command-injection challenges are sandboxed within the application context.

---

## Technology Stack

* **Frontend**: HTML5, Vanilla CSS3 (Custom enterprise design system), Vanilla JavaScript (ES6+).
* **Backend**: Node.js, Express.js.
* **Database**: SQLite (Zero-dependency built-in engine via `node:sqlite`).
* **Architecture**: Corporate portal for fictional enterprise **Cyberflex Industries** with integrated Security Missions Hub.

---

## System Requirements

* **Node.js**: Version 18.0.0 or higher (Node 20+ or Node 22/24 recommended for zero-native-build built-in SQLite).
* **NPM**: Version 8.0.0 or higher.
* **Operating Systems Supported**:
  * **Windows**: Native Windows 10/11 (PowerShell / Command Prompt).
  * **WSL**: Windows Subsystem for Linux (Ubuntu / Debian).
  * **Linux**: Ubuntu 20.04+, Debian 11+, Fedora, Arch Linux, Alpine.
  * **macOS**: macOS Ventura, Sonoma, Sequoia (Intel and Apple Silicon M1/M2/M3/M4).

---

## Quick Start & Installation

### 1. Clone or Download Repository
```bash
git clone <repository-url>
cd cyberflex-security-lab
```

### 2. Install Dependencies
```bash
npm install
```
*(On Windows PowerShell, use `npm.cmd install` if execution policy restricts PowerShell scripts).*

### 3. Initialize the Laboratory
```bash
npm run setup
```
This script creates the database schema, seeds realistic enterprise records, initializes all 20 missions + flags, and configures test assets.

### 4. Start the Application
```bash
npm start
```

For live reloading during development or source inspection:
```bash
npm run dev
```

### 5. Access the Platform
Open your browser and navigate to:
* **Cyberflex Corporate Portal**: [`http://localhost:3000`](http://localhost:3000)
* **Security Missions Hub**: [`http://localhost:3000/missions.html`](http://localhost:3000/missions.html)
* **Defensive Patching Lab**: [`http://localhost:3000/defensive.html`](http://localhost:3000/defensive.html)

---

## Mission Progression Structure

The lab features 20 progressive security challenges across three major professional tiers:

### Level 1 — Security Apprentice (Beginner)
* **Mission 01 — The First Look**: Passive reconnaissance, response headers, `robots.txt`.
* **Mission 02 — What's Behind the Door?**: Hidden directory and unlinked diagnostic route discovery.
* **Mission 03 — The Strange Search**: SQL injection via `UNION SELECT` to dump vault tables.
* **Mission 04 — A Message From Someone Else**: Reflected Cross-Site Scripting (Reflected XSS).
* **Mission 05 — The Comment Nobody Sanitized**: Stored Persistent Cross-Site Scripting (Stored XSS).
* **Mission 06 — Who Am I?**: Authentication weaknesses, username enumeration, default credentials.
* **Mission 07 — That's Not My Account**: Insecure Direct Object Reference (IDOR) on client contracts.

### Level 2 — Security Analyst (Intermediate)
* **Mission 08 — Forged Request**: Parameter manipulation and client-side price tampering.
* **Mission 09 — The Untrusted Upload**: Insecure file upload bypassing extension checks.
* **Mission 10 — Walking Through the Files**: Path traversal using `../` to access server configuration.
* **Mission 11 — The Forgotten Endpoint**: API enumeration and unauthenticated legacy route leakage.
* **Mission 12 — Trust the Token?**: JWT algorithm confusion (`alg: none`) and weak secret key cracking.
* **Mission 13 — The Missing Protection**: Cross-Site Request Forgery (CSRF) on state-changing endpoints.
* **Mission 14 — Behind the Command**: Sandboxed command injection in network diagnostic tools.

### Level 3 — Penetration Tester (Advanced)
* **Mission 15 — Chain Reaction**: Chaining IDOR → password reset PIN → administrative takeover.
* **Mission 16 — API Breach**: REST API mass assignment and privilege escalation.
* **Mission 17 — The Admin Problem**: Broken Function Level Authorization (BFLA).
* **Mission 18 — Full Security Assessment**: Comprehensive black-box assessment against ticket attachments.
* **Mission 19 — Find the Unknown**: Zero-day business logic flaw in promotional coupon calculations.
* **Mission 20 — Final Assessment (Capstone)**: Multi-stage capstone challenge requiring proxy header bypass.

### Level 4 / Defensive Mode
* **Mission 21 — Patch The Application**: Interactive code review, security patch toggling, and automated fix verification.

---

## Laboratory Reset System

To restore the laboratory to its pristine initial state (wiping test files, resetting database records, clearing student attempts and restoring original flags):

```bash
npm run reset
```

---

## Automated Verification & Testing

To run the automated validation test suite that exercises all 20 missions, flag validations, hint deductions, and defensive patch verifications:

```bash
npm test
```

---

## Project Architecture

```text
cyberflex-security-lab/
├── server/
│   ├── server.js               # Express application server & routes mounting
│   ├── database/
│   │   ├── db.js               # Database connection wrapper (node:sqlite)
│   │   └── schema.sql          # DDL tables for corporate & training data
│   ├── routes/
│   │   ├── portalRoutes.js     # Cyberflex corporate endpoints
│   │   ├── authRoutes.js       # Authentication endpoints
│   │   └── labRoutes.js        # Missions, flags, hints & student scoring
│   ├── controllers/
│   │   ├── portalController.js # Corporate feature logic & vulnerability targets
│   │   ├── labController.js    # Mission progression & hint deduction logic
│   │   └── authController.js   # Session management & credential validation
│   ├── middleware/
│   │   ├── auth.js             # Session/JWT middleware
│   │   ├── logger.js           # Student training activity logger
│   │   └── defensive.js        # Defensive patch state checker
│   └── vulnerabilities/
│       └── vulnerabilityEngine.js # Sandboxed command runner & vulnerability logic
├── public/
│   ├── index.html              # Cyberflex corporate homepage
│   ├── login.html              # Sign in portal
│   ├── register.html           # Registration portal
│   ├── dashboard.html          # Customer portal dashboard
│   ├── profile.html            # Profile settings (CSRF & Mass assignment)
│   ├── products.html           # Product catalog (SQLi target)
│   ├── orders.html             # Orders & invoices (IDOR target)
│   ├── comments.html           # Community reviews (Stored XSS target)
│   ├── upload.html             # Attachment portal (File upload target)
│   ├── admin.html              # Administrative console (Command injection target)
│   ├── support.html            # Support knowledge base (Reflected XSS target)
│   ├── missions.html           # Security Missions Command Center
│   ├── mission.html            # Dedicated mission detail workspace
│   ├── defensive.html          # Defensive Mode & Patch Lab
│   ├── css/
│   │   ├── portal.css          # Modern enterprise design system
│   │   └── lab.css             # Security training styles & terminal themes
│   └── js/
│       ├── portal.js           # Corporate client scripts
│       ├── lab.js              # Lab hub & filtering scripts
│       └── mission.js          # Mission workspace & flag submission logic
├── database/
│   ├── schema.sql              # Clean DDL schema
│   └── seed.js                 # Seed data generator
├── missions/
│   └── missions.json           # Canonical definitions for all 21 missions
├── docs/
│   ├── instructor/
│   │   └── INSTRUCTOR_GUIDE.md # Confidential solutions & pedagogical guides
│   └── student/
│       ├── STUDENT_GUIDE.md    # Scope, rules of engagement, toolkit
│       └── PENTEST_REPORT_TEMPLATE.md # Professional report template
├── scripts/
│   ├── setup.js                # Laboratory initialization script
│   └── reset.js                # State reset script
├── test/
│   └── verify-missions.js      # Automated mission verification test suite
├── package.json
└── README.md
```

---

## License

This project is licensed under the MIT License for educational and instructional purposes.
