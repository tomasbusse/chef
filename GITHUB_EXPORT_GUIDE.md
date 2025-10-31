# How to Push Your Chef Projects to GitHub

Chef now includes a built-in feature to push your generated code directly to GitHub! This guide will help you export your projects in just a few clicks.

## 🎯 Quick Overview

When you're happy with the code Chef has generated, you can push it directly to a new GitHub repository without downloading files or using git commands.

## 📍 Finding the Button

1. **Start a chat** with Chef and generate some code
2. Look at the **header toolbar** (top of the page)
3. Find the **"Push to GitHub"** button with the GitHub icon (📦)
   - It's located between the "Download Code" and "Share" buttons
   - The button is only enabled when you have files in your project

## 🔑 Getting a GitHub Personal Access Token

Before you can push to GitHub, you need a Personal Access Token:

1. Go to [GitHub Token Settings](https://github.com/settings/tokens/new?scopes=repo)
2. Give your token a name (e.g., "Chef Export")
3. Select the **`repo`** scope (this allows creating repositories)
4. Click **"Generate token"**
5. **Copy the token immediately** - you won't be able to see it again!
6. Store it securely (e.g., in a password manager)

## 📤 Exporting Your Project

### Step 1: Click "Push to GitHub"
Click the button in the header toolbar to open the export dialog.

### Step 2: Fill in the Required Information

**Required Fields:**
- **GitHub Personal Access Token**: Paste the token you created
- **GitHub Username**: Your GitHub username (not email)
- **Repository Name**: Choose a name for your new repository (e.g., `my-awesome-app`)

**Optional Fields:**
- **Description**: A brief description of your project
- **Commit Message**: Default is "Initial commit from Chef" - you can customize this
- **Make repository private**: Check this box if you want a private repository

### Step 3: Export!
Click the **"Export to GitHub"** button and wait a few seconds.

## ✅ What Happens Next

1. Chef creates a new repository on your GitHub account
2. All your project files are uploaded
3. A success message appears with the number of files uploaded
4. Your new repository opens automatically in a new tab
5. You can now clone it, share it, or continue working on it!

## 📋 What Gets Exported?

- ✅ All **text files** in your project (`.js`, `.ts`, `.html`, `.css`, `.json`, etc.)
- ✅ Files in subdirectories (full folder structure is preserved)
- ❌ Binary files are excluded
- ❌ `node_modules` and `.git` folders are excluded

## 🔧 Troubleshooting

### "Repository already exists" Error
The repository name you chose already exists in your GitHub account. Try a different name.

### "GitHub token is required" Error
Make sure you've pasted your Personal Access Token in the first field.

### "No files to export" Error
You need to generate some code in Chef first. The export button is disabled when there are no files.

### Token Permission Error
Your token might not have the correct permissions. Make sure you selected the `repo` scope when creating it.

## 🔒 Security Notes

- **Your token is NOT stored** - you need to enter it each time you export
- **Never share your token** - it has full access to your repositories
- **Revoke tokens** you no longer use in [GitHub settings](https://github.com/settings/tokens)
- Consider using a dedicated token for Chef with limited scope

## 💡 Tips

1. **Use descriptive repository names**: Choose names that clearly describe your project
2. **Add descriptions**: Help others (and future you) understand what the project does
3. **Private by default**: Start with private repositories, make them public later if needed
4. **Commit messages matter**: Customize the commit message to describe what Chef built

## 🚀 After Exporting

Once your code is on GitHub, you can:

- **Clone it locally**: `git clone https://github.com/username/repo-name.git`
- **Share it**: Send the GitHub URL to collaborators
- **Deploy it**: Use services like Vercel, Netlify, or GitHub Pages
- **Continue development**: Make changes, commit, and push updates
- **Create issues**: Track bugs and features
- **Accept contributions**: Let others submit pull requests

## 🎓 Example Workflow

1. **Chat with Chef**: "Build me a todo app with React"
2. **Review the code**: Make sure everything looks good
3. **Click "Push to GitHub"**
4. **Enter credentials**:
   - Token: `ghp_xxxxxxxxxxxx`
   - Username: `yourname`
   - Repo name: `chef-todo-app`
   - Description: `A todo app built with Chef AI`
5. **Export**: Wait a few seconds
6. **Success!**: Your repo is live at `github.com/yourname/chef-todo-app`

## 📚 Related Features

- **Download Code**: Download as a ZIP file for local development
- **Deploy to Vercel**: One-click deployment (coming soon)
- **Share**: Get a shareable link to your Chef project

## ❓ FAQ

**Q: Can I push to an existing repository?**  
A: Not yet. Currently, you can only create new repositories. To update an existing repo, download the code and push manually.

**Q: What if I want to make changes after pushing?**  
A: Clone the repository to your computer, make changes, and push updates using standard git commands.

**Q: Is there a limit to how many repositories I can create?**  
A: GitHub has its own limits. Free accounts can have unlimited public repos and limited private repos.

**Q: Can I push to an organization instead of my personal account?**  
A: Not directly. Use your organization's name as the username, but you'll need a token with org permissions.

**Q: Does this work with GitHub Enterprise?**  
A: No, only public GitHub (github.com) is supported.

---

**Need help?** Join our [Discord community](https://discord.gg/convex) or check out the [Chef documentation](https://github.com/get-convex/chef).

Happy coding! 🚀
