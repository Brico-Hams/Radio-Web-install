# Rotores, acopladores e potência

Rotor rotctld usa posição, alvo, limites mecânicos, lease e STOP. Liga por loopback e não autentica processos locais. Paragem incerta bloqueia movimento.

IC-7300 oferece RF PWR CAT e inserir/bypass ATU com limites/permissões locais. FTX-1 PC limita consignas field/SPA-1. Não há sintonia automática nem controlo genérico de amplificadores/acopladores. A camada de acessórios supervisiona acoplador e amplificador: o amplificador arranca em STANDBY e volta a STANDBY ao desligar, com ROE alta, falha ou paragem de emergência; a sintonia só arranca por pedido explícito com 10 W ou menos, e dispositivos sem protocolo documentado ficam como pendiente de fuente.

1. Configure limites físicos e paragem independente do rotor.
2. Leia posição antes de mover e mantenha STOP acessível.
3. Leia potência/estado do acoplador antes de ajustar ; respeite unidades por modelo.
4. Não confunda inserir ATU com TUNE, nem consigna com medição.

[Referência técnica (ES)](../../control-potencia-acoplador.md)
