@echo off
setlocal enabledelayedexpansion

set DESTINO=C:\Sistema\siscontrol
set ORIGEM=C:\deploy
set LOGFILE=%ORIGEM%\deploy-log.txt
set NSSM=C:\nssm\win64\nssm.exe

:: Cabeçalho no log
echo. >> %LOGFILE%
echo ============================================== >> %LOGFILE%
echo [INICIO %DATE% %TIME%] Iniciando deploy... >> %LOGFILE%
echo ============================================== >> %LOGFILE%
echo Iniciando deploy...

:: Parando serviços
echo Parando serviços...
echo Parando serviços... >> %LOGFILE%
"%NSSM%" stop sistemaFFApp >> %LOGFILE% 2>&1
"%NSSM%" stop sistemaFFServer >> %LOGFILE% 2>&1

timeout /t 3 >nul

:: Copiando arquivos
echo Copiando arquivos do deploy...
echo Copiando arquivos do deploy... >> %LOGFILE%
xcopy "%ORIGEM%\*" "%DESTINO%\" /E /H /Y >> %LOGFILE% 2>&1


:: Iniciando serviços
echo Iniciando serviços...
echo Iniciando serviços... >> %LOGFILE%
"%NSSM%" start sistemaFFApp >> %LOGFILE% 2>&1
"%NSSM%" start sistemaFFServer >> %LOGFILE% 2>&1

:: Finalizando
echo. >> %LOGFILE%
echo ============================================== >> %LOGFILE%
echo [FIM %DATE% %TIME%] Deploy finalizado. >> %LOGFILE%
echo ============================================== >> %LOGFILE%

echo.
echo ✅ Deploy finalizado com sucesso!
pause
exit
