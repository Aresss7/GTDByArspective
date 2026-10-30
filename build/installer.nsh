!macro customUnInstall
  ${if} ${isUpdated}
    ; Во время обновления не удаляем ярлыки и сохраняем закрепление в панели задач Windows
    Goto done_custom_uninstall
  ${endIf}
  done_custom_uninstall:
!macroend
