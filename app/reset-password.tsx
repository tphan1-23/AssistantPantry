import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TextInput } from 'react-native';

import { Text, View } from '@/components/Themed';
import GradientButton from '@/components/GradientButton';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';

// Reached only via the deep link in Supabase's password-recovery email
// (pantryassistant://reset-password?code=...&type=recovery) - never
// navigated to from inside the app. See AuthContext's RESET_REDIRECT_URL
// and login.tsx's "Forgot password?" link.
export default function ResetPasswordScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { exchangeRecoveryCode, updatePassword } = useAuth();

  // Starts true only when there's actually a code to exchange - the
  // no-code case is handled as a plain render branch below instead of
  // being mirrored into state, so the effect never needs to call setState
  // synchronously (only from the promise's own callbacks, which is the
  // sanctioned pattern - see Decisions & Bug Fixes Log re: HistoryModal).
  const [isExchanging, setIsExchanging] = useState(() => !!code);
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    exchangeRecoveryCode(code)
      .catch((error) => {
        if (!cancelled) {
          setExchangeError(
            error instanceof Error ? error.message : 'This reset link has expired or already been used.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsExchanging(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code, exchangeRecoveryCode]);

  if (!code) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Link no longer valid</Text>
        <Text style={styles.subtitle}>
          This reset link is missing its code. Request a new one from the sign-in screen.
        </Text>
        <GradientButton title="Back to Sign In" onPress={() => router.replace('/login')} />
      </View>
    );
  }

  async function handleSetPassword() {
    if (newPassword.length < 6) {
      Alert.alert('Password too short', 'Use at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Passwords don't match", 'Double check both fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      await updatePassword(newPassword);
      Alert.alert('Password updated', undefined, [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    } catch (error) {
      Alert.alert('Could not update password', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isExchanging) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.subtitle}>Verifying your reset link…</Text>
      </View>
    );
  }

  if (exchangeError) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Link no longer valid</Text>
        <Text style={styles.subtitle}>{exchangeError}</Text>
        <GradientButton title="Back to Sign In" onPress={() => router.replace('/login')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Set a new password</Text>
        <Text style={styles.subtitle}>Choose something you haven&apos;t used before.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>New Password</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="At least 6 characters"
        />

        <Text style={styles.fieldLabel}>Confirm Password</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="••••••••"
        />

        <View style={styles.buttonWrap}>
          <GradientButton title="Update Password" onPress={handleSetPassword} loading={isSubmitting} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    gap: 20,
  },
  header: {
    gap: 4,
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  card: {
    gap: 10,
    padding: 18,
    borderRadius: 18,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    shadowColor: '#8B5E3C',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  buttonWrap: {
    marginTop: 8,
  },
});
