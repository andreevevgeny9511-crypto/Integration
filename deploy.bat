#!/bin/bash
# ============================================================
# Bitrix24 ↔ Listok Integration — Windows Deployment Script
# ============================================================
# Usage: deploy.bat [start|stop|restart|status]
# ============================================================

setlocal

set "APP_NAME=bitrix-listok-integration"
set "DEPLOY_DIR=%~dp0"

echo ============================================
echo   %APP_NAME% - Deployment Script
echo ============================================
echo.

if "%1"=="" goto usage
if "%1"=="start" goto start
if "%1"=="stop" goto stop
if "%1"=="restart" goto restart
if "%1"=="status" goto status
if "%1"=="logs" goto logs
if "%1"=="setup" goto setup
goto usage

:start
echo Starting %APP_NAME%...
cd /d "%DEPLOY_DIR%"
docker-compose up -d
echo.
echo Application started!
echo   Frontend: http://localhost
echo   API:      http://localhost/api
echo   Health:   http://localhost/health
echo.
goto end

:stop
echo Stopping %APP_NAME%...
cd /d "%DEPLOY_DIR%"
docker-compose down
echo Application stopped.
goto end

:restart
echo Restarting %APP_NAME%...
cd /d "%DEPLOY_DIR%"
docker-compose down
docker-compose up -d
echo Application restarted!
goto end

:status
echo Checking %APP_NAME% status...
cd /d "%DEPLOY_DIR%"
docker-compose ps
echo.
echo Testing health endpoint...
powershell -Command "try { (Invoke-WebRequest -Uri http://localhost/health -UseBasicParsing).Content } catch { Write-Host 'Health check failed - is the app running?' }"
echo.
goto end

:logs
echo Showing logs (Ctrl+C to exit)...
cd /d "%DEPLOY_DIR%"
docker-compose logs -f
goto end

:setup
echo Setting up %APP_NAME%...
echo.
echo Step 1: Checking Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not installed. Please install Docker Desktop first.
    goto end
)

echo Step 2: Checking .env file...
if not exist "%DEPLOY_DIR%.env" (
    echo .env file not found. Copying from .env.example...
    copy "%DEPLOY_DIR%.env.example" "%DEPLOY_DIR%.env"
    echo Please edit .env file with your credentials and run deploy.bat restart
)

echo Step 3: Building and starting services...
cd /d "%DEPLOY_DIR%"
docker-compose up -d --build

echo.
echo Setup complete!
echo   Frontend: http://localhost
echo   API:      http://localhost/api
echo   Health:   http://localhost/health
echo.
echo Next steps:
echo   1. Edit .env file with your Bitrix24 and Listok credentials
echo   2. Run deploy.bat restart
echo   3. Open the frontend in your browser
goto end

:usage
echo Usage: deploy.bat [start^|stop^|restart^|status^|logs^|setup]
echo.
echo Commands:
echo   start    - Start the application
echo   stop     - Stop the application
echo   restart  - Restart the application
echo   status   - Check application status
echo   logs     - Show application logs
echo   setup    - Full setup (build + start)
goto end

:end
endlocal
