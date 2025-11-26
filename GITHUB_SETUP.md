# GitHub Repository Setup Instructions

## Quick Setup Guide

### Step 1: Create Repository on GitHub

1. **Go to GitHub**: Visit https://github.com/new
2. **Repository Name**: `registry-stagehand-worker` (or your preferred name)
3. **Description**: Bulgarian Business Verification System with CompanyBook API
4. **Visibility**: Choose Private (recommended) or Public
5. **Important**: DO NOT initialize with README, .gitignore, or license (we already have these)
6. **Click**: "Create repository"

### Step 2: Copy Your Repository URL

After creating, GitHub will show you a page with the repository URL. It will look like:
```
https://github.com/YOUR_USERNAME/registry-stagehand-worker.git
```

Copy this URL!

### Step 3: Connect and Push

Once you have the URL, run these commands (replace with your actual URL):

```bash
cd /home/administrator/Documents/registry_stagehand_worker
git remote add origin https://github.com/YOUR_USERNAME/registry-stagehand-worker.git
git branch -M main
git push -u origin main
```

### Authentication Options

#### Option A: Personal Access Token (Recommended)
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select scopes: `repo` (full control of private repositories)
4. Copy the token
5. When git prompts for password, paste the token

#### Option B: SSH Keys
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy public key
cat ~/.ssh/id_ed25519.pub

# Add to GitHub: Settings → SSH and GPG keys → New SSH key
# Then use SSH URL: git@github.com:YOUR_USERNAME/registry-stagehand-worker.git
```

### Step 4: Verify

After pushing, visit your GitHub repository in the browser to verify all files are there.

---

## Current Project State

✅ **Already Done**:
- Git repository initialized
- 38 files committed (7,576 lines)
- Includes:
  - Updated registry_check edge function (CompanyBook API)
  - Registry local worker (operational)
  - Database migrations
  - Comprehensive documentation
  - .gitignore configured

✅ **Protected Files** (not in git):
- `.env` files
- `node_modules/`
- `logs/` directory
- Sensitive credentials

---

## Accessing from Other Devices

### On Your Phone or Other Computer:

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/registry-stagehand-worker.git
cd registry-stagehand-worker

# Install dependencies
cd browserbase-worker
npm install

# Create .env file (you'll need to add your credentials)
cp .env.example .env
nano .env  # or use your preferred editor
```

### Keep Synced:

```bash
# Pull latest changes
git pull origin main

# Make changes, then commit and push
git add .
git commit -m "Your commit message"
git push origin main
```

---

## Important Notes

⚠️ **Never commit**:
- `.env` files (Supabase keys, API credentials)
- `node_modules/` directory
- Log files with sensitive data
- Any passwords or API keys

✅ **Safe to commit**:
- Source code
- Database migrations
- Configuration templates
- Documentation
- Package.json files

---

## Need Help?

If you encounter authentication issues:
1. Make sure you have the correct repository URL
2. Verify your GitHub credentials
3. Check that your Personal Access Token has `repo` permissions
4. For SSH, ensure your SSH key is added to GitHub

---

**Ready to push?** Let me know your GitHub repository URL and I'll complete the push for you!
