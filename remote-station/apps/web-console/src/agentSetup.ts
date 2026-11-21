import profiles from './agent-profiles.json'

export type AgentSetup = {
  os: 'windows' | 'posix'; agentFile: string; port: string; remote: boolean
  certificate: string; privateKey: string; clientCa: string
  cat: boolean; model: string; serialPort: string; baud: string; stopBits: string
}
export type HostSetup = {
  os: 'windows' | 'posix'; port: string; certificate: string; privateKey: string
  agentUrl: string; agentCa: string; clientCertificate: string; clientKey: string; origins: string
}
export class SetupError extends Error {
  readonly reason: 'invalidNumber' | 'invalidSetup'
  constructor(reason: 'invalidNumber' | 'invalidSetup') { super(reason); this.reason = reason }
}
function path(value: string): string {
  if (!value || value !== value.trim() || value.startsWith('-') ||
    value.length > 256 || Array.from(value).some((character) => character.charCodeAt(0) < 32 ||
      character.charCodeAt(0) === 127)) throw new SetupError('invalidSetup')
  return value
}
function integer(value: string, min: number, max: number): string {
  const number = Number(value)
  if (!/^\d+$/.test(value) || !Number.isInteger(number) || number < min || number > max) {
    throw new SetupError('invalidNumber')
  }
  return String(number)
}
function command(os: AgentSetup['os'], args: string[]): string {
  const quote = os === 'windows'
    ? (value: string) => `'${value.replaceAll("'", "''")}'`
    : (value: string) => `'${value.replaceAll("'", "'\"'\"'")}'`
  return `${os === 'windows' ? 'py -3.12' : 'python3'} ${args.map(quote).join(' ')}`
}
export function buildAgentCommand(input: AgentSetup): string {
  const args = [path(input.agentFile), '--port', integer(input.port, 1, 65535)]
  if (input.remote) {
    args.push('--host', '0.0.0.0', '--tls-cert', path(input.certificate), '--tls-key', path(input.privateKey))
    if (input.clientCa) args.push('--tls-client-ca', path(input.clientCa))
  }
  if (input.cat) {
    if (!profiles.some((profile) => profile.model === input.model) ||
      (input.stopBits !== '1' && input.stopBits !== '2')) throw new SetupError('invalidSetup')
    args.push('--enable-experimental-cat', '--serial-model', input.model,
      '--serial-port', path(input.serialPort), '--serial-baud', integer(input.baud, 300, 115200),
      '--serial-stopbits', input.stopBits)
  }
  return command(input.os, args)
}

export function buildHostCommand(input: HostSetup): string {
  let url: URL
  try { url = new URL(input.agentUrl) }
  catch { throw new SetupError('invalidSetup') }
  if (url.protocol !== 'https:' || url.username || url.password ||
    url.pathname !== '/' || url.search || url.hash || input.agentUrl !== input.agentUrl.trim()) {
    throw new SetupError('invalidSetup')
  }
  const args = ['-m', 'bricoham_remote_station', '--host', '0.0.0.0',
    '--port', integer(input.port, 1, 65535),
    '--tls-cert', path(input.certificate), '--tls-key', path(input.privateKey),
    '--station-agent-url', url.origin, '--station-agent-ca', path(input.agentCa)]
  if (!!input.clientCertificate !== !!input.clientKey) throw new SetupError('invalidSetup')
  if (input.clientCertificate) {
    args.push('--station-agent-client-cert', path(input.clientCertificate),
      '--station-agent-client-key', path(input.clientKey))
  }
  for (const origin of input.origins.split(',').map((value) => value.trim()).filter(Boolean)) {
    if (origin !== 'capacitor://localhost') {
      let parsed: URL
      try { parsed = new URL(origin) }
      catch { throw new SetupError('invalidSetup') }
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password ||
        parsed.search || parsed.hash || parsed.pathname !== '/' || parsed.origin !== origin) {
        throw new SetupError('invalidSetup')
      }
    }
    args.push('--client-origin', origin)
  }
  return command(input.os, args)
}
