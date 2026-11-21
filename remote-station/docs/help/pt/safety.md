# PTT, limites e segurança RF

PTT FTX-1 experimental vem desligado e pode emitir RF real. Exige MAIN VFO simplex LSB/USB sem split/clarificador TX e limites locais de frequência, consigna PC e duração. Potência CAT é consigna, não RF medida.

O lease CAT exclusivo dura dois segundos, renova enquanto premido e tem teto absoluto. STOP incerto bloqueia START e repete RX. Software não garante paragem com perda USB/processo, VOX/PTT local nem proteção contra todos os ataques.

1. Use PARAR TX / confirmar RX antes do primeiro START.
2. Respeite autorização, limites de banda e proteções RF locais.
3. Conserve paragem física independente de USB e acesso ao operador da estação.
4. Não exponha portas CAT, rotctld ou UDP WSJT-X ; use TLS, firewall e segredos separados.
5. CW virtual e TX digital ativo não estão implementados ; não há botões fictícios em substituição.

[Referência técnica (ES)](../../ptt-ftx1.md)
