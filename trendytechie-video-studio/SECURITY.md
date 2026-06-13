# Security Guidelines

This document outlines important security practices for this project.

## Sensitive Data

**Never commit the following to version control:**

- `.env.local` - Local environment variables
- `firebase-applet-config.json` - Firebase credentials
- `GEMINI_API_KEY` - API keys for Gemini
- GitHub personal access tokens
- Any other API keys or secrets

## Setup Instructions

### Firebase Configuration

1. Copy the example config:
   ```bash
   cp firebase-applet-config.json.example firebase-applet-config.json
   ```

2. Update `firebase-applet-config.json` with your actual Firebase credentials

3. **DO NOT** commit this file (it's in `.gitignore`)

### Environment Variables

1. Copy the example file:
   ```bash
   cp .env.example .env.local
   ```

2. Add your actual values:
   ```
   GEMINI_API_KEY=your_actual_key_here
   APP_URL=http://localhost:3000
   ```

3. **DO NOT** commit `.env.local`

## GitHub API Security

When syncing to GitHub:

- Store GitHub tokens securely (use GitHub Secrets or environment variables)
- Never pass tokens in request bodies that might be logged
- Default to creating **private repositories** for sensitive content
- Review created repositories' access permissions

## Additional Security Practices

- Rotate API keys regularly
- Use strong, unique passwords for all services
- Enable 2FA on your GitHub account
- Monitor repository access logs
- Keep dependencies up to date with security patches

## If Credentials are Exposed

1. **Immediately revoke** any exposed tokens/keys
2. **Regenerate** new credentials
3. **Force push** to remove from git history (if already committed)
4. **Monitor** for unauthorized access
