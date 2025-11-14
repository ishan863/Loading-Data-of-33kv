# PSS Loading Data System - One-Click Deploy Script
# Run this script to deploy your website to Firebase Hosting

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   PSS Loading Data System Deployer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "🔍 Checking Node.js installation..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js first:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://nodejs.org/" -ForegroundColor White
    Write-Host "2. Install LTS version" -ForegroundColor White
    Write-Host "3. Restart PowerShell" -ForegroundColor White
    Write-Host "4. Run this script again" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✅ Node.js $nodeVersion installed" -ForegroundColor Green
Write-Host ""

# Check if Firebase CLI is installed
Write-Host "🔍 Checking Firebase CLI..." -ForegroundColor Yellow
$firebaseVersion = firebase --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Firebase CLI not found. Installing..." -ForegroundColor Yellow
    Write-Host ""
    npm install -g firebase-tools
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install Firebase CLI" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "✅ Firebase CLI installed successfully!" -ForegroundColor Green
} else {
    Write-Host "✅ Firebase CLI $firebaseVersion installed" -ForegroundColor Green
}
Write-Host ""

# Check if user is logged in to Firebase
Write-Host "🔍 Checking Firebase login..." -ForegroundColor Yellow
$firebaseUser = firebase login:list 2>$null
if ($LASTEXITCODE -ne 0 -or $firebaseUser -notmatch "@") {
    Write-Host "⚠️  Not logged in to Firebase" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opening browser for Firebase login..." -ForegroundColor Cyan
    firebase login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Firebase login failed" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Write-Host "✅ Logged in to Firebase" -ForegroundColor Green
Write-Host ""

# Confirm deployment
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "         Ready to Deploy!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Project: pss-loading-data-4e817" -ForegroundColor White
Write-Host "URL: https://pss-loading-data-4e817.web.app" -ForegroundColor White
Write-Host ""
$confirm = Read-Host "Deploy now? (Y/N)"

if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host ""
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 0
}

Write-Host ""
Write-Host "🚀 Deploying to Firebase Hosting..." -ForegroundColor Cyan
Write-Host ""

# Deploy
firebase deploy --only hosting

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   ✅ DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Your website is now live at:" -ForegroundColor Cyan
    Write-Host "   https://pss-loading-data-4e817.web.app" -ForegroundColor White
    Write-Host ""
    Write-Host "📊 Firebase Console:" -ForegroundColor Cyan
    Write-Host "   https://console.firebase.google.com/project/pss-loading-data-4e817" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Open the website and test login" -ForegroundColor White
    Write-Host "2. Add staff users (if not already done)" -ForegroundColor White
    Write-Host "3. Share the URL with your team" -ForegroundColor White
    Write-Host "4. Share USER-MANUAL.md with users" -ForegroundColor White
    Write-Host ""
    
    $openBrowser = Read-Host "Open website in browser? (Y/N)"
    if ($openBrowser -eq "Y" -or $openBrowser -eq "y") {
        Start-Process "https://pss-loading-data-4e817.web.app"
    }
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Check your internet connection" -ForegroundColor White
    Write-Host "2. Verify you have permission to deploy" -ForegroundColor White
    Write-Host "3. Run: firebase login --reauth" -ForegroundColor White
    Write-Host "4. Try deploying again" -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Read-Host "Press Enter to exit"
