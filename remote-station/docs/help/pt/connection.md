# Ligação e autenticação

A consola web usa o seu próprio host. Android/iOS exigem URL HTTPS sem credenciais, caminho ou parâmetros. O token fica apenas em memória, nunca em ficheiros, cookies ou armazenamento local.

Admin e operador usam controlos autorizados; ouvinte recebe RX e dados permitidos, não PTT. Convidado tem acesso restrito. Uma sessão ligada não prova que exista rádio físico ligado.

1. Introduza host HTTPS quando pedido e token da sua função.
2. Prima Ligar e reveja avisos de permissões/disponibilidade do agente.
3. Configure CA/hostname fiáveis e origens autorizadas ; nunca ignore erro de certificado.
4. Desligue antes de alterar host ou credenciais.

[Referência técnica (ES)](../../despliegue-seguro.md)
