# Cyberflex Security Missions Lab — Student Handbook

Welcome to the **Cyberflex Security Missions Lab**, an authorized, offline cybersecurity training laboratory designed to develop professional application security and penetration testing skills.

---

## 1. Scope & Rules of Engagement

> [!IMPORTANT]
> **STRICT LOCAL TESTING SCOPE:**
> Your assessment activities are strictly limited to your local lab instance running at `http://localhost:3000`.
> Under no circumstances should you direct automated scanning or exploit payloads toward external IP addresses, third-party infrastructure, or unauthorized hosts.

### Rules of Engagement:
1. All testing must be conducted locally.
2. Automated denial-of-service or heavy multi-threaded flooding is prohibited.
3. Every mission objective should be verified with clear evidence (screenshots, HTTP request/response transcripts, and captured flags).
4. Flags follow the standard format: `CFX{unique_flag_here}`.

---

## 2. Recommended Assessment Toolkit

You do not need heavy or complex tools to start. The following lightweight tools are ideal:

1. **Modern Web Browser** (Chrome, Firefox, Edge):
   - **DevTools (F12)**:
     - **Network Tab**: Inspect HTTP headers, request payloads, response bodies, and cookies.
     - **Console Tab**: Test DOM script execution, inspect JavaScript variables, decode base64 tokens.
     - **Application/Storage Tab**: Inspect session cookies (`cfx_session`), local storage.
2. **cURL or HTTPie**:
   - For rapid command-line HTTP testing and header manipulation:
     ```bash
     curl -i http://localhost:3000/robots.txt
     curl -i -H "X-Cyberflex-Internal: true" http://localhost:3000/recovery/master-backup
     ```
3. **API Client** (Postman, Thunder Client, or curl):
   - For sending custom POST/PUT JSON payloads to API v1 and v2 endpoints.

---

## 3. The 10-Step Professional Security Workflow

```
1. Reconnaissance      → Identify public headers, robots directives, tech stack
2. Enumeration         → Discover hidden endpoints, parameter names, user IDs
3. Discovery           → Test inputs for abnormal behaviors (quotes, tags, delimiters)
4. Validation          → Confirm whether the condition is exploitable
5. Exploitation        → Execute targeted payload to extract proof-of-concept data
6. Impact Analysis     → Determine business impact (confidentiality, integrity, availability)
7. Evidence Collection → Capture request/response transcripts and the mission flag
8. Reporting           → Document the finding using the pentest report template
9. Remediation         → Explain how the development team should fix the code
10. Retesting          → Verify that the patched code resists the original attack
```

---

## 4. Getting Started

1. Clone or download the repository to your local computer.
2. Initialize the laboratory:
   ```bash
   npm run setup
   ```
3. Start the application:
   ```bash
   npm start
   ```
4. Open your browser to:
   - Corporate Portal: `http://localhost:3000`
   - Missions Command Center: `http://localhost:3000/missions.html`
5. Begin with **Mission 01 — The First Look** and work your way up to the Level 3 Capstone!
