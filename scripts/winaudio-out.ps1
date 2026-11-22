<#
  Plays raw PCM (s16le, mono, 48 kHz) read from stdin on a Windows output device through winmm waveOut.
  The device is selected by name; a prefix match is accepted because waveOutGetDevCaps truncates names to 31 chars.
  Exits when stdin closes, after the queued audio has been played.
    -List         print the output device names, one per line, and exit
    -Device NAME  output device (empty = Windows default)
#>
param(
  [string]$Device = "",
  [switch]$List
)

$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;

public static class WinAudioOut {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  struct WAVEOUTCAPS {
    public ushort wMid; public ushort wPid; public uint vDriverVersion;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string szPname;
    public uint dwFormats; public ushort wChannels; public ushort wReserved1; public uint dwSupport;
  }

  [StructLayout(LayoutKind.Sequential)]
  struct WAVEFORMATEX {
    public ushort wFormatTag; public ushort nChannels; public uint nSamplesPerSec; public uint nAvgBytesPerSec;
    public ushort nBlockAlign; public ushort wBitsPerSample; public ushort cbSize;
  }

  [StructLayout(LayoutKind.Sequential)]
  struct WAVEHDR {
    public IntPtr lpData; public uint dwBufferLength; public uint dwBytesRecorded; public IntPtr dwUser;
    public uint dwFlags; public uint dwLoops; public IntPtr lpNext; public IntPtr reserved;
  }

  [DllImport("winmm.dll")] static extern uint waveOutGetNumDevs();
  [DllImport("winmm.dll", CharSet = CharSet.Unicode)] static extern uint waveOutGetDevCaps(UIntPtr id, ref WAVEOUTCAPS caps, uint size);
  [DllImport("winmm.dll")] static extern uint waveOutOpen(out IntPtr handle, uint deviceId, ref WAVEFORMATEX format, IntPtr callback, IntPtr instance, uint flags);
  [DllImport("winmm.dll")] static extern uint waveOutPrepareHeader(IntPtr handle, IntPtr header, uint size);
  [DllImport("winmm.dll")] static extern uint waveOutUnprepareHeader(IntPtr handle, IntPtr header, uint size);
  [DllImport("winmm.dll")] static extern uint waveOutWrite(IntPtr handle, IntPtr header, uint size);
  [DllImport("winmm.dll")] static extern uint waveOutReset(IntPtr handle);
  [DllImport("winmm.dll")] static extern uint waveOutClose(IntPtr handle);

  const uint WHDR_DONE = 1;
  const int BUFFERS = 8;
  const int BUFFER_BYTES = 1920; // 20 ms of 48 kHz mono s16

  public static string[] Names() {
    uint count = waveOutGetNumDevs();
    string[] names = new string[count];
    for (uint i = 0; i < count; i++) {
      WAVEOUTCAPS caps = new WAVEOUTCAPS();
      waveOutGetDevCaps((UIntPtr)i, ref caps, (uint)Marshal.SizeOf(typeof(WAVEOUTCAPS)));
      names[i] = caps.szPname;
    }
    return names;
  }

  static uint Find(string name) {
    if (String.IsNullOrEmpty(name)) return 0xFFFFFFFF; // WAVE_MAPPER
    string[] names = Names();
    for (uint i = 0; i < names.Length; i++) if (String.Equals(names[i], name, StringComparison.OrdinalIgnoreCase)) return i;
    for (uint i = 0; i < names.Length; i++) {
      if (names[i].Length > 0 && (name.StartsWith(names[i], StringComparison.OrdinalIgnoreCase) || names[i].StartsWith(name, StringComparison.OrdinalIgnoreCase))) return i;
    }
    throw new InvalidOperationException("Dispositivo de salida no encontrado: " + name);
  }

  public static void Play(string device) {
    uint id = Find(device);
    WAVEFORMATEX format = new WAVEFORMATEX();
    format.wFormatTag = 1; format.nChannels = 1; format.nSamplesPerSec = 48000; format.wBitsPerSample = 16;
    format.nBlockAlign = 2; format.nAvgBytesPerSec = 96000; format.cbSize = 0;
    IntPtr handle;
    if (waveOutOpen(out handle, id, ref format, IntPtr.Zero, IntPtr.Zero, 0) != 0) throw new InvalidOperationException("No se pudo abrir la salida de audio.");
    int headerSize = Marshal.SizeOf(typeof(WAVEHDR));
    int flagsOffset = (int)Marshal.OffsetOf(typeof(WAVEHDR), "dwFlags");
    IntPtr[] headers = new IntPtr[BUFFERS];
    for (int i = 0; i < BUFFERS; i++) {
      headers[i] = Marshal.AllocHGlobal(headerSize);
      WAVEHDR hdr = new WAVEHDR();
      hdr.lpData = Marshal.AllocHGlobal(BUFFER_BYTES);
      hdr.dwBufferLength = BUFFER_BYTES;
      Marshal.StructureToPtr(hdr, headers[i], false);
      waveOutPrepareHeader(handle, headers[i], (uint)headerSize);
      Marshal.WriteInt32(headers[i], flagsOffset, (int)(Marshal.ReadInt32(headers[i], flagsOffset) | WHDR_DONE));
    }
    Stream input = Console.OpenStandardInput();
    byte[] chunk = new byte[BUFFER_BYTES];
    int next = 0;
    try {
      while (true) {
        int filled = 0;
        while (filled < BUFFER_BYTES) {
          int read = input.Read(chunk, filled, BUFFER_BYTES - filled);
          if (read <= 0) break;
          filled += read;
        }
        if (filled == 0) break;
        for (int i = filled; i < BUFFER_BYTES; i++) chunk[i] = 0;
        // Wait (bounded) for the next ring slot to be free; if the device stalls, drop the audio instead of blocking.
        int waited = 0;
        while ((Marshal.ReadInt32(headers[next], flagsOffset) & WHDR_DONE) == 0 && waited < 400) { Thread.Sleep(5); waited += 5; }
        if ((Marshal.ReadInt32(headers[next], flagsOffset) & WHDR_DONE) == 0) continue;
        WAVEHDR hdr = (WAVEHDR)Marshal.PtrToStructure(headers[next], typeof(WAVEHDR));
        Marshal.Copy(chunk, 0, hdr.lpData, BUFFER_BYTES);
        Marshal.WriteInt32(headers[next], flagsOffset, (int)(Marshal.ReadInt32(headers[next], flagsOffset) & ~WHDR_DONE));
        waveOutWrite(handle, headers[next], (uint)headerSize);
        next = (next + 1) % BUFFERS;
        if (filled < BUFFER_BYTES) break;
      }
      // Let the queued buffers finish playing.
      for (int i = 0; i < BUFFERS; i++) {
        int waited = 0;
        while ((Marshal.ReadInt32(headers[i], flagsOffset) & WHDR_DONE) == 0 && waited < 1000) { Thread.Sleep(5); waited += 5; }
      }
    } finally {
      waveOutReset(handle);
      for (int i = 0; i < BUFFERS; i++) {
        waveOutUnprepareHeader(handle, headers[i], (uint)headerSize);
        WAVEHDR hdr = (WAVEHDR)Marshal.PtrToStructure(headers[i], typeof(WAVEHDR));
        Marshal.FreeHGlobal(hdr.lpData);
        Marshal.FreeHGlobal(headers[i]);
      }
      waveOutClose(handle);
    }
  }
}
"@

if ($List) {
  [WinAudioOut]::Names() | ForEach-Object { $_ }
  exit 0
}

try {
  [WinAudioOut]::Play($Device)
} catch {
  [Console]::Error.WriteLine($_.Exception.Message)
  exit 2
}
