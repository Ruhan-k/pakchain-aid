# 🚀 Quick Start: Upload to GitHub

## Step-by-Step Commands

### 1. Navigate to Project
```cmd
cd "C:\Users\User\Desktop\PAKCHAIN AID\project-bolt-sb1-5xbq1vbq (1)\project"
```

### 2. Initialize Git (if not done)
```cmd
git init
```

### 3. Add All Files
```cmd
git add .
```

### 4. Create First Commit
```cmd
git commit -m "Initial commit: PakChain Aid project"
```

### 5. Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `pakchain-aid`
3. Click "Create repository"
4. **DO NOT** initialize with README

### 6. Connect and Push
```cmd
git remote add origin https://github.com/YOUR-USERNAME/pakchain-aid.git
git branch -M main
git push -u origin main
```

**Replace `YOUR-USERNAME` with your GitHub username**

**If asked for password:** Use a Personal Access Token (not your password)
- Create at: https://github.com/settings/tokens
- Select `repo` scope

---

## Next: Configure Azure

After pushing to GitHub:
1. Azure Portal → `pakchain-aid-api` → Deployment Center
2. Source: GitHub
3. Authorize and select your repository
4. Branch: `main`
5. Save

Azure will automatically deploy!

---

For detailed instructions, see `GITHUB_DEPLOYMENT_GUIDE.md`

