@echo off
echo Building Next.js frontend...
call npx next build

echo Creating static directory in API folder...
if not exist api\static mkdir api\static

echo Copying built files to API static directory...
xcopy /E /I /Y out\* api\static\

echo Ensuring proper static file structure...
if not exist api\static\_next mkdir api\static\_next
if exist out\_next xcopy /E /I /Y out\_next\* api\static\_next\

echo Frontend build complete and copied to API static directory!
