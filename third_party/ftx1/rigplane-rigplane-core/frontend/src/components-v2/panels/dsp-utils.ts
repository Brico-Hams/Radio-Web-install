export interface DspOption {
  value: string | number;
  label: string;
}

/**
 * Returns true when the given mode string is a CW mode.
 */
export function isCwMode(mode: string): boolean {
  return mode === 'CW' || mode === 'CW-R';
}

/**
 * Builds the options array for the NR mode SegmentedButton.
 * IC-7610: NR is binary on/off (CI-V 0x16/0x40). No NR1/NR2 distinction.
 */
export function buildNrOptions(): DspOption[] {
  return [
    { value: 0, label: 'OFF' },
    { value: 1, label: 'ON' },
  ];
}

/**
 * Builds the options array for the Notch mode SegmentedButton.
 */
export function buildNotchOptions(): DspOption[] {
  return [
    { value: 'off', label: 'OFF' },
    { value: 'auto', label: 'AUTO' },
    { value: 'manual', label: 'MAN' },
  ];
}
