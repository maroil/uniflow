# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 0.x (main) | ✅ |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues by emailing the maintainers directly or using [GitHub's private vulnerability reporting](https://github.com/maroil/uniflow/security/advisories/new).

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We aim to respond within 72 hours and will coordinate a fix + disclosure timeline with you.

## Security Considerations for Self-Hosted Deployments

When deploying Uniflow to your AWS account:

1. **Write keys** — treat them like API keys; rotate regularly
2. **Cognito** — use strong passwords and enable MFA for admin users
3. **IAM** — CDK follows least-privilege; do not expand permissions unless necessary
4. **Secrets Manager** — destination credentials are stored encrypted; do not log them
5. **VPC** — the Fargate audience-builder runs in a private subnet; do not assign public IPs
