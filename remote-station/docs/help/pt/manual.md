# Ajuda Bricohams Radio Workspace - Remote Station

Guia do software disponível. Experimental não significa validado com hardware. O rádio liga-se fisicamente ao agente; o cliente liga-se ao host.


<a id="installation"></a>

## Instalação e arquitetura

O host coordenador disponibiliza a consola HTML5/JavaScript e autoriza acessos. O agente sem interface gráfica funciona junto do rádio em Windows, Linux, macOS ou Raspberry Pi com Python compatível. O ZIPAPP não precisa de Node.js para executar.

Instale Python 3.12 ou superior e agente/host distribuídos. Áudio requer sounddevice e PortAudio quando aplicável. O APK é debug; iOS requer macOS/Xcode. Não se declara validação física ou multiplataforma.

1. Ligue o rádio por USB ou interface série documentada ao computador do agente.
2. Configure tokens distintos por função e um segredo separado no enlace host→agente remoto.
3. Inicie o agente explicitamente configurado, depois o host e a consola.
4. Mantenha agente, sistema operativo e dependências atualizados.

[Referência técnica (ES)](../../instalacion.md)

<a id="connection"></a>

## Ligação e autenticação

A consola web usa o seu próprio host. Android/iOS exigem URL HTTPS sem credenciais, caminho ou parâmetros. O token fica apenas em memória, nunca em ficheiros, cookies ou armazenamento local.

Admin e operador usam controlos autorizados; ouvinte recebe RX e dados permitidos, não PTT. Convidado tem acesso restrito. Uma sessão ligada não prova que exista rádio físico ligado.

1. Introduza host HTTPS quando pedido e token da sua função.
2. Prima Ligar e reveja avisos de permissões/disponibilidade do agente.
3. Configure CA/hostname fiáveis e origens autorizadas ; nunca ignore erro de certificado.
4. Desligue antes de alterar host ou credenciais.

[Referência técnica (ES)](../../despliegue-seguro.md)

<a id="configuration"></a>

## Configuração do agente, host e USB/CAT

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

<a id="cat"></a>

## Rádios, funções e compatibilidade

O catálogo distingue candidatos, perfis de consultas, sintaxe de família e hardware verificado. Um perfil CAT não garante todas as funções, firmware, interface USB ou amplificador. Nenhum rádio é testado neste ambiente.

FTX-1 : FA/FB MAIN/SUB, MD0/MD1 e consigna PC experimentais com opt-ins/readback. MAIN/SUB não seleciona automaticamente o transmissor. Não se inventa interface SPA-1 independente. Espectro/waterfall nativo continua unsupported, sem SDR substituto ou simulação oculta.

1. Consulte Protocolos e rádios candidatos para perfil e consultas exatos.
2. Leia o estado antes de mudar frequência, modo ou potência.
3. Perante erro, TX/ATU ou resposta incerta, peça RX e releia ; não repita TX.
4. Consulte matriz técnica e documentação do modelo/firmware.

[Referência técnica (ES)](../../compatibilidad.md)

<a id="audio"></a>

## Áudio RX e microfone remoto

RX utiliza entrada explícita do agente e AudioWorklet. TX utiliza microfone real, PCM16LE mono 48 kHz e WebSocket autenticado host→agente. Não é WebRTC nem áudio digital WSJT-X.

Para TX escolha índice, nome exato e canal DAC, configure localmente entrada USB do rádio e desligue VOX. O DAC permanece silenciado até confirmar PTT. Não há fallback para o microfone local se a sessão áudio for exigida.

1. Prima Ouvir RX e autorize só as permissões necessárias.
2. Para fonia, consulte PTT, confirme RX e prepare o microfone remoto.
3. Espere canal pronto, ative a caixa de sessão e mantenha PTT.
4. Soltar pede RX ; desligar microfone liberta pistas. Perda de foco/canal, áudio antigo ou congestão terminam a sessão.
5. Níveis, rotas USB e áudio móvel exigem aceitação física.

[Referência técnica (ES)](../../audio-tx.md)

<a id="safety"></a>

## PTT, limites e segurança RF

PTT FTX-1 experimental vem desligado e pode emitir RF real. Exige MAIN VFO simplex LSB/USB sem split/clarificador TX e limites locais de frequência, consigna PC e duração. Potência CAT é consigna, não RF medida.

O lease CAT exclusivo dura dois segundos, renova enquanto premido e tem teto absoluto. STOP incerto bloqueia START e repete RX. Software não garante paragem com perda USB/processo, VOX/PTT local nem proteção contra todos os ataques.

1. Use PARAR TX / confirmar RX antes do primeiro START.
2. Respeite autorização, limites de banda e proteções RF locais.
3. Conserve paragem física independente de USB e acesso ao operador da estação.
4. Não exponha portas CAT, rotctld ou UDP WSJT-X ; use TLS, firewall e segredos separados.
5. CW virtual e TX digital ativo não estão implementados ; não há botões fictícios em substituição.

[Referência técnica (ES)](../../ptt-ftx1.md)

<a id="accessories"></a>

## Rotores, acopladores e potência

Rotor rotctld usa posição, alvo, limites mecânicos, lease e STOP. Liga por loopback e não autentica processos locais. Paragem incerta bloqueia movimento.

IC-7300 oferece RF PWR CAT e inserir/bypass ATU com limites/permissões locais. FTX-1 PC limita consignas field/SPA-1. Não há sintonia automática nem controlo genérico de amplificadores/acopladores.

1. Configure limites físicos e paragem independente do rotor.
2. Leia posição antes de mover e mantenha STOP acessível.
3. Leia potência/estado do acoplador antes de ajustar ; respeite unidades por modelo.
4. Não confunda inserir ATU com TUNE, nem consigna com medição.

[Referência técnica (ES)](../../control-potencia-acoplador.md)

<a id="logs-digital"></a>

## Logbook e digitais WSJT-X

O logbook local usa SQLite, criação QSO por função e exportação ADIF. Sem sincronização ou importação automática. Confira indicativo, hora, frequência e modo.

O agente recebe estado/decodes UDP passivos de instância WSJT-X identificada. UDP local não é autenticado nem autoriza controlo. WSJT-X instala-se à parte ; motor TX e áudio digital não estão integrados.

1. Configure porta UDP e ID exatos de WSJT-X no agente.
2. Não exponha UDP à Internet nem trate decode como autorização TX.
3. Guarde QSO explicitamente e exporte ADIF.
4. Valide downloads de ficheiros em cada cliente móvel.

[Referência técnica (ES)](../../logbook.md)

<a id="mobile"></a>

## Android, tablet, iPhone e iPad

Clientes partilham consola responsive e controlos disponíveis. Android pede microfone ao preparar áudio, não ao entrar. iOS inclui descrição de utilização.

APK debug compilado, sem assinatura de produção ou teste em tablet. Projetos iPhone/iPad preparados, sem IPA validada. Agente Android USB OTG independente ainda não implementado.

1. Use certificado confiável para o dispositivo e origem nativa permitida no host.
2. Mantenha app em primeiro plano durante PTT ; ocultar/fechar pede RX e liberta microfone.
3. Se um diálogo cancelar preparação, repita gesto após conceder permissão ; TX não se repete.
4. Valide ciclo de vida, áudio e download ADIF antes de aceitação final.

[Referência técnica (ES)](../../clientes-moviles.md)

<a id="troubleshooting"></a>

## Diagnóstico e resolução de problemas

401 : token ausente/inválido ; 403 : função/origem proibida ; 409 : recurso ocupado/sessão incerta ; 503/502 : agente/configuração/enlace indisponível. Veja código e logs sem partilhar segredos.

CAT busy durante PTT é deliberado. Se RX for incerto, use paragem física. DAC renomeado, áudio antigo, sample rate não suportado ou permissão negada bloqueiam áudio em vez de escolher outro dispositivo silenciosamente.

1. Verifique /healthz, certificados, hostname e relógio.
2. Verifique cabo/driver USB, porta explícita, baud e ausência de outra aplicação a usar CAT.
3. Reveja tokens/funções/origens sem segredos em URLs, capturas ou tickets.
4. Verifique PortAudio/sounddevice, nome/canal DAC, VOX desligado e permissão microfone.
5. Distinga demonstração e telemetria real ; preserve erro inicial e nunca anuncie sucesso após STOP incerto.

[Referência técnica (ES)](../../diagnostico.md)
