; Atalhos na área de trabalho para as pastas de mídia do utilizador.
; Nomes alinhados com core/desktop-media-shortcuts.ts (DESKTOP_MEDIA_SHORTCUTS).

!macro customInstall
  CreateDirectory "$PROFILE\livepraise\imagens"
  CreateDirectory "$PROFILE\livepraise\videos"
  CreateShortCut "$DESKTOP\Live Praise - Imagens.lnk" "$PROFILE\livepraise\imagens" "" "$INSTDIR\LivePraise.exe" 0
  CreateShortCut "$DESKTOP\Live Praise - Videos.lnk" "$PROFILE\livepraise\videos" "" "$INSTDIR\LivePraise.exe" 0
!macroend

!macro customUnInstall
  Delete "$DESKTOP\Live Praise - Imagens.lnk"
  Delete "$DESKTOP\Live Praise - Videos.lnk"
!macroend
