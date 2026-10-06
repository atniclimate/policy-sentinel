# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in policy-sentinel, please report it
responsibly. **Do not create a public GitHub issue for security vulnerabilities.**

### How to report

1. **GitHub Security Advisories (preferred):** Go to the repository's
   Security tab > Advisories > "Report a vulnerability"
2. **Email:** Contact the project maintainers directly

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

### Response timeline

- **Acknowledgment:** Within 48 hours
- **Assessment:** Within 1 week
- **Fix or mitigation:** Depends on severity

## Tribal Data Exposure

**Tribal data exposure is considered a critical security issue.**

If you discover that Tribe-specific data (corpus configurations, sovereignty
framing, T2/T3 classified data) has been committed to the public engine
repository, report it immediately using the process above. This includes:

- Real organizational policy corpora
- Tribal governance documents or references
- Configuration files containing Tribe-specific sovereignty framing
- Any data classified as T2 or T3 under the Tiered Sovereign Data Framework

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.x     | Yes       |

## Security Design

policy-sentinel is designed with the following security principles:

- **No telemetry:** The engine does not transmit data to any external endpoint
- **Offline-first:** Network access is always opt-in
- **Sovereignty boundary enforcement:** The TSDF gate prevents unauthorized
  data export
- **Pre-commit sovereignty guard:** Scans for Tribal data patterns before
  commits reach the repository
