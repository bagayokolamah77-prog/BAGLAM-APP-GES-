@echo off
chcp 65001 >nul
title Mise en ligne - Gestion Boutique Pro
cd /d "%~dp0"

echo ==================================================
echo    Mise en ligne de Gestion Boutique Pro
echo    Projet Firebase : baglam-app-ges
echo ==================================================
echo.

where node >nul 2>nul
if errorlevel 1 goto :no_node

where firebase >nul 2>nul
if errorlevel 1 goto :install_cli
goto :login

:install_cli
echo Installation de l'outil Firebase, une seule fois...
call npm install -g firebase-tools
if errorlevel 1 goto :fail

:login
echo.
echo Connexion au compte Google proprietaire du projet...
call firebase login
if errorlevel 1 goto :fail

echo.
echo Envoi de l'application, des regles et des index Firestore...
call firebase deploy --project baglam-app-ges
if errorlevel 1 goto :fail

echo.
echo ==================================================
echo    Termine ! L'application est en ligne :
echo    https://baglam-app-ges.web.app
echo ==================================================
start "" "https://baglam-app-ges.web.app"
pause
exit /b 0

:no_node
echo [ERREUR] Node.js n'est pas installe sur cet ordinateur.
echo Installez la version LTS depuis https://nodejs.org
echo puis relancez ce fichier.
start "" "https://nodejs.org"
pause
exit /b 1

:fail
echo.
echo [ERREUR] La mise en ligne a echoue.
echo Lisez le message ci-dessus et la section Depannage du guide.
pause
exit /b 1
