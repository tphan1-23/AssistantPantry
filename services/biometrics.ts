import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricCheckResult =
  | { ok: true }
  | { ok: false; reason: 'no-hardware' | 'not-enrolled' | 'failed' };

/** Prompts Face ID / Touch ID / fingerprint, with a distinct reason on failure so callers can show a clear message instead of a generic "didn't work." */
export async function confirmWithBiometrics(promptMessage: string): Promise<BiometricCheckResult> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return { ok: false, reason: 'no-hardware' };

  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!isEnrolled) return { ok: false, reason: 'not-enrolled' };

  const result = await LocalAuthentication.authenticateAsync({ promptMessage });
  return result.success ? { ok: true } : { ok: false, reason: 'failed' };
}
