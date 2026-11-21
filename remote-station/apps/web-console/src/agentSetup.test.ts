import { describe, expect, it } from 'vitest'
import { buildAgentCommand, buildHostCommand, type AgentSetup, type HostSetup } from './agentSetup'

const agent: AgentSetup = {
  os:'windows', agentFile:"C:\\Radio's tools\\agent.pyz", port:'8788', remote:false,
  certificate:'', privateKey:'', clientCa:'', cat:false, model:'', serialPort:'', baud:'', stopBits:'1',
}
const host: HostSetup = {
  os:'windows', port:'8787', certificate:'host.crt', privateKey:'host.key',
  agentUrl:'https://station.example.org:8788', agentCa:'ca.crt',
  clientCertificate:'client.crt', clientKey:'client.key',
  origins:'https://localhost, capacitor://localhost',
}

describe('local setup commands', () => {
  it('quotes paths and shell metacharacters without enabling CAT or transmission by default', () => {
    expect(buildAgentCommand(agent)).toBe("py -3.12 'C:\\Radio''s tools\\agent.pyz' '--port' '8788'")
    expect(buildAgentCommand({ ...agent, os:'posix', agentFile:"radio's;$HOME/agent.pyz" }))
      .toBe(`python3 'radio'"'"'s;$HOME/agent.pyz' '--port' '8788'`)
  })
  it('requires explicit supported CAT parameters and validates their boundaries', () => {
    const cat = { ...agent, cat:true, model:'KX2', serialPort:'COM7', baud:'38400' }
    expect(buildAgentCommand(cat)).toContain("'--serial-model' 'KX2' '--serial-port' 'COM7'")
    for (const patch of [{ model:'IC-7800' }, { serialPort:'' }, { serialPort:'COM7\nTX;' },
      { baud:'299' }, { baud:'115201' }, { baud:'38400.5' }, { stopBits:'3' }]) {
      expect(() => buildAgentCommand({ ...cat, ...patch })).toThrow()
    }
    for (const port of ['0','65536','1.5','-1','']) expect(() => buildAgentCommand({ ...agent, port })).toThrow()
    for (const port of ['1','65535']) expect(buildAgentCommand({ ...agent, port })).toContain(`'${port}'`)
    for (const baud of ['300','115200']) expect(buildAgentCommand({ ...cat, baud })).toContain(`'${baud}'`)
  })
  it('requires TLS material for remote agent listening', () => {
    expect(() => buildAgentCommand({ ...agent, remote:true })).toThrow()
    expect(buildAgentCommand({ ...agent, remote:true, certificate:'radio.crt', privateKey:'radio.key', clientCa:'clients.crt' }))
      .toContain("'--host' '0.0.0.0' '--tls-cert' 'radio.crt' '--tls-key' 'radio.key' '--tls-client-ca' 'clients.crt'")
  })
  it('prepares a verified TLS/mTLS host link but rejects unsafe URLs and incomplete identities', () => {
    expect(buildHostCommand(host)).toContain("'--station-agent-url' 'https://station.example.org:8788' '--station-agent-ca' 'ca.crt'")
    expect(buildHostCommand(host)).toContain("'--station-agent-client-cert' 'client.crt' '--station-agent-client-key' 'client.key'")
    expect(buildHostCommand(host)).toContain("'--client-origin' 'https://localhost' '--client-origin' 'capacitor://localhost'")
    for (const agentUrl of ['http://station','https://user:secret@station','https://station/api','https://station?token=secret','https://station#secret']) {
      expect(() => buildHostCommand({ ...host, agentUrl })).toThrow()
    }
    for (const patch of [{ agentCa:'' }, { certificate:'' }, { privateKey:'' }, { clientKey:'' },
      { origins:'*' }, { origins:'http://localhost' }, { origins:'https://localhost/path' }]) {
      expect(() => buildHostCommand({ ...host, ...patch })).toThrow()
    }
  })
})
