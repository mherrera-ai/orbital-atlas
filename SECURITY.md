# Security Policy

Orbital Atlas is a static portfolio project and should not require secrets, private API keys, or production credentials to run.

Before publishing or cutting a release, run `npm run public:audit` to confirm required public files are present and no high-confidence secret patterns are present in publishable source files.

## Reporting A Vulnerability

Please report suspected security issues privately to the repository owner instead of opening a public issue. If GitHub Security Advisories are enabled for the repository, use that path first; otherwise use the contact method listed on Michael Herrera's GitHub profile.
