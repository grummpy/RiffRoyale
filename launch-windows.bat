@echo off
setlocal
cd /d "%~dp0"
where python >nul 2>&1
if %ERRORLEVEL%==0 (
  python server.py
  goto :eof
)
where py >nul 2>&1
if %ERRORLEVEL%==0 (
  py -3 server.py
  goto :eof
)
echo Python 3 is required to launch Riff Royale.
echo Install Python 3 from https://www.python.org/downloads/ and run this file again.
exit /b 1
