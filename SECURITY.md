# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of FeedWell seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via:
- **Email**: [INSERT YOUR EMAIL]
- **GitHub Security Advisory**: Use the "Report a vulnerability" button on the Security tab

### What to Include

Please include the following information in your report:
- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity and complexity

### Our Commitment

- We will confirm receipt of your vulnerability report
- We will provide regular updates on our progress
- We will credit you in the security advisory (unless you prefer to remain anonymous)
- We will work with you to understand and resolve the issue

## Security Best Practices

### For Users
- Keep FeedWell updated to the latest version
- Only add RSS feeds from trusted sources
- Review app permissions before granting
- Use the backup feature regularly
- Report suspicious behavior

### For Developers
- Follow secure coding practices
- Sanitize user inputs
- Validate RSS feed URLs
- Use HTTPS for network requests
- Keep dependencies updated
- Review code before committing

## Known Security Considerations

### Local Data Storage
- All data stored locally on device using AsyncStorage/SafeStorage
- No cloud sync or external data transmission
- Backup files are stored in local device storage

### RSS Feed Parsing
- RSS feeds are fetched from user-provided URLs
- HTML content is sanitized to remove tracking scripts
- Ad-blocking removes potentially malicious ad content

### Privacy
- No analytics or tracking
- No data collection
- No external API calls except RSS feed fetching
- No user accounts or authentication

## Disclosure Policy

- Security vulnerabilities will be disclosed after a fix is released
- We follow responsible disclosure practices
- Credit will be given to security researchers (with permission)

## Security Updates

Security updates will be released as:
- Patch versions (x.x.X) for critical vulnerabilities
- Minor versions (x.X.x) for moderate vulnerabilities
- Documented in release notes and CHANGELOG

## Contact

For security-related questions or concerns:
- Website: [www.SepehrMohammady.ir](https://www.sepehrmohammady.ir/)
- GitHub: @SepehrMohammady

---

**Last Updated**: November 17, 2025
