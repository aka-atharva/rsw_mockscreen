@echo off
echo Building Next.js frontend...
call npx next build

echo Creating static directory in API folder...
if not exist api\static mkdir api\static

echo Copying built files to API static directory...
xcopy /E /I /Y out\* api\static\

echo Frontend build complete and copied to API static directory!
