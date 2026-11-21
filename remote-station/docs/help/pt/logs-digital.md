# Logbook e digitais WSJT-X

O logbook local usa SQLite, criação QSO por função e exportação ADIF. Sem sincronização ou importação automática. Confira indicativo, hora, frequência e modo.

O agente recebe estado/decodes UDP passivos de instância WSJT-X identificada. UDP local não é autenticado nem autoriza controlo. WSJT-X instala-se à parte ; motor TX e áudio digital não estão integrados.

1. Configure porta UDP e ID exatos de WSJT-X no agente.
2. Não exponha UDP à Internet nem trate decode como autorização TX.
3. Guarde QSO explicitamente e exporte ADIF.
4. Valide downloads de ficheiros em cada cliente móvel.

[Referência técnica (ES)](../../logbook.md)
