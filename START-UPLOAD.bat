@echo off
echo ========================================
echo   PSS Excel Data Upload - Quick Start
echo ========================================
echo.
echo Starting local server...
echo Open this URL in your browser:
echo.
echo    http://localhost:8000/upload-excel.html
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

cd /d "%~dp0"
python -m http.server 8000
