@echo off
echo Starting Laravel development server...
cd /d "%~dp0"
php artisan serve
pause
