# Configuração do agente, host e USB/CAT

A página Configuração prepara comandos locais ; não os executa, instala drivers ou abre portas. Modelo, porta e baud são explícitos. O inventário não identifica automaticamente a porta CAT.

Sem opt-in CAT, o agente apenas enumera dispositivos. O assistente não ativa PTT, ATU, VOX, RTS ou DTR. Drivers USB podem produzir impulsos ao abrir ; valide a instalação e mantenha paragem local.

O host exige certificado/chave TLS, URL HTTPS do agente e CA de confiança. Certificado/chave cliente mTLS são um par opcional ; as origens permitidas são explícitas. Configure BRICOHAM_ADMIN_TOKEN e BRICOHAM_STATION_AGENT_TOKEN distintos no ambiente local, nunca em URLs ou comandos partilhados. Configure o mesmo segredo de enlace no agente conforme a guia de implantação.

1. Escolha sistema do agente e perfil série, não uma primitiva de rede de família.
2. Identifique porta por interface/fabricante e documentação ; nunca escolha automaticamente o primeiro COM ou ttyUSB.
3. Introduza baud e bits de paragem iguais aos do rádio.
4. Copie o comando no computador do agente. Acesso remoto exige certificado/chave TLS e configuração do host.
5. Instale o wheel do host ; prepare e copie o comando no coordenador. Verifique certificados, hostname e segredos antes de ligar.
6. Para clientes móveis permita apenas origens exatas, por exemplo https://localhost e capacitor://localhost, separadas por vírgula.
7. Limites e opt-ins de potência/PTT/áudio requerem ficheiros administrativos locais documentados.

[Referência técnica (ES)](../../despliegue-seguro.md)
