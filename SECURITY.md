# Security Policy

## Supported version

Security fixes are applied to the latest version on the `main` branch.

## Reporting a vulnerability

Do not disclose a suspected vulnerability in a public issue, discussion, or pull request.

Use GitHub's **Report a vulnerability** option in the Security tab to send a private report. If private vulnerability reporting is unavailable, open a minimal issue asking the maintainer for a private contact channel without including exploit details.

Please include:

- the affected version or commit;
- reproduction steps or a proof of concept;
- the expected impact;
- any suggested mitigation.

## Deployment boundary

AgentCV is currently a single-user local application. Its API does not implement authentication, account isolation, or authorization. Bind it to a loopback address such as `127.0.0.1` and do not publish it directly to the internet or an untrusted LAN.

Resume content and profile images are sensitive personal data. Local databases, uploads, exports, and environment files must not be committed or attached to public reports.
