@echo off
setlocal

REM Check input
if "%~1"=="" (
    echo Usage: flash.bat File.c [COMx]
    exit /b 1
)

set "FILE=%~n1"

REM Default port = COM9
set "PORT=COM9"

REM Override if user provides port
if not "%~2"=="" (
    set "PORT=%~2"
)

echo.
echo ==============================
echo   STC8 Flash Automation Tool
echo ==============================
echo Using port: %PORT%

REM Step 1: Compile
echo.
echo [1/3] Compiling %1 with SDCC...
sdcc "%~1"
if errorlevel 1 (
    echo Compilation failed!
    exit /b 1
)

REM Step 2: Convert IHX -> HEX
echo.
echo [2/3] Converting %FILE%.ihx to %FILE%.hex...
packihx "%FILE%.ihx" > "%FILE%.hex"
if errorlevel 1 (
    echo Conversion failed!
    exit /b 1
)

REM Step 3: Flash
echo.
echo [3/3] Flashing %FILE%.hex using stcgal...
stcgal -p %PORT% "%FILE%.hex"
if errorlevel 1 (
    echo Flashing failed!
    echo Try pressing reset or reconnecting device.
    exit /b 1
)

echo.
echo ✅ Done!
pause