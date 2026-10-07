; NOVERA Studio — Windows installer (built on Linux by tools/build_win.py; SRC / OUTFILE come from the command line)
; per-user install (no admin rights, no UAC prompt), app files in %LOCALAPPDATA%\Programs\NOVERA Studio.
; Projects stay in the app's data folder (%APPDATA%\NOVERA Studio) + Documents\NOVERA Studio\Projects — never removed.
Unicode true
!include "MUI2.nsh"

!define APPNAME "NOVERA Studio"
!define APPEXE "NOVERA Studio.exe"
!define UNKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\NOVERAStudio"

Name "${APPNAME}"
Caption "تثبيت NOVERA Studio @VNN@"
OutFile "${OUTFILE}"
InstallDir "$LOCALAPPDATA\Programs\${APPNAME}"
InstallDirRegKey HKCU "Software\${APPNAME}" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
BrandingText "NOVERA"
ManifestDPIAware true

VIProductVersion "@VERSION@.0"
VIAddVersionKey /LANG=0 "ProductName" "NOVERA Studio"
VIAddVersionKey /LANG=0 "FileDescription" "NOVERA Studio Setup"
VIAddVersionKey /LANG=0 "CompanyName" "NOVERA"
VIAddVersionKey /LANG=0 "FileVersion" "@VERSION@"
VIAddVersionKey /LANG=0 "ProductVersion" "@VERSION@"
VIAddVersionKey /LANG=0 "LegalCopyright" "NOVERA"

!define MUI_ICON "${SRC}/NOVERA.ico"
!define MUI_UNICON "${SRC}/NOVERA.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "أهلاً بيك في NOVERA Studio"
!define MUI_WELCOMEPAGE_TEXT "برنامج NOVERA لتصميم المطابخ والأثاث — خطة القص والملصقات ودليل التجميع والأسعار.$\r$\n$\r$\nالنسخة دي للتجربة على الكمبيوتر (@VNN@). البرنامج بيشتغل من غير إنترنت، ومشاريعك بتتحفظ على الجهاز وكمان كملفات في «المستندات ← NOVERA Studio ← Projects».$\r$\n$\r$\nلو عندك نسخة قديمة، التثبيت ده هيحدّثها ومشاريعك هتفضل زي ما هي.$\r$\n$\r$\n$_CLICK"
!define MUI_FINISHPAGE_TITLE "خلصنا ✓"
!define MUI_FINISHPAGE_TEXT "NOVERA Studio اتثبت على الجهاز، وهتلاقي أيقونته على سطح المكتب وفي قايمة ابدأ."
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APPEXE}"
!define MUI_FINISHPAGE_RUN_TEXT "افتح NOVERA Studio دلوقتي"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Arabic"

Section "NOVERA Studio"
  ; an open copy would lock its files — close it first
  nsExec::Exec 'taskkill /IM "${APPEXE}" /F'
  Sleep 800
  SetOutPath "$INSTDIR"
  RMDir /r "$INSTDIR\resources\app"
  File /r "${SRC}/*"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\${APPEXE}" "" "$INSTDIR\NOVERA.ico" 0
  CreateShortcut "$SMPROGRAMS\${APPNAME}.lnk" "$INSTDIR\${APPEXE}" "" "$INSTDIR\NOVERA.ico" 0
  WriteRegStr HKCU "Software\${APPNAME}" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${UNKEY}" "DisplayName" "${APPNAME}"
  WriteRegStr HKCU "${UNKEY}" "DisplayVersion" "@VERSION@"
  WriteRegStr HKCU "${UNKEY}" "Publisher" "NOVERA"
  WriteRegStr HKCU "${UNKEY}" "DisplayIcon" "$INSTDIR\NOVERA.ico"
  WriteRegStr HKCU "${UNKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNKEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKCU "${UNKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNKEY}" "NoRepair" 1
  WriteRegDWORD HKCU "${UNKEY}" "EstimatedSize" 300000
SectionEnd

Section "Uninstall"
  nsExec::Exec 'taskkill /IM "${APPEXE}" /F'
  Sleep 800
  Delete "$DESKTOP\${APPNAME}.lnk"
  Delete "$SMPROGRAMS\${APPNAME}.lnk"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${UNKEY}"
  DeleteRegKey HKCU "Software\${APPNAME}"
  ; the projects (AppData + Documents\NOVERA Studio) are kept on purpose
SectionEnd
