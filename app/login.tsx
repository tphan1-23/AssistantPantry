import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import { Text, View } from '@/components/Themed';
import GradientButton from '@/components/GradientButton';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { alert } from '@/utils/alert';

// After this many consecutive wrong-password attempts (not other errors
// like a network failure), suggest resetting the password instead of just
// letting the user keep guessing.
const SUGGEST_RESET_AFTER_ATTEMPTS = 2;

export default function LoginScreen() {
  const { signIn, requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  async function handleSignIn() {
    if (!email.trim() || !password) {
      alert('Missing info', 'Enter your email and password.');
      return;
    }
    setIsSubmitting(true);
    try {
      await signIn(email.trim(), password);
      setFailedAttempts(0);
      router.replace('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const isWrongCredentials = message.toLowerCase().includes('invalid login credentials');
      const nextFailedAttempts = isWrongCredentials ? failedAttempts + 1 : failedAttempts;
      setFailedAttempts(nextFailedAttempts);

      if (isWrongCredentials && nextFailedAttempts >= SUGGEST_RESET_AFTER_ATTEMPTS) {
        alert('Still not working?', "That's the wrong password a couple of times now - want to reset it?", [
          { text: 'Try again', style: 'cancel' },
          { text: 'Reset Password', onPress: handleForgotPassword },
        ]);
      } else {
        alert('Could not sign in', message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      alert('Email needed', 'Enter your email above first, then tap "Forgot password?" again.');
      return;
    }
    try {
      await requestPasswordReset(trimmedEmail);
      setFailedAttempts(0);
      alert('Check your email', `We sent a password reset link to ${trimmedEmail}.`);
    } catch (error) {
      alert('Could not send reset email', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PantryAssistant</Text>
        <Text style={styles.subtitle}>Sign in to your pantry.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setFailedAttempts(0);
          }}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
        />

        <Text style={styles.fieldLabel}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="••••••••"
        />

        <View style={styles.buttonWrap}>
          <GradientButton title="Sign In" onPress={handleSignIn} loading={isSubmitting} />
        </View>
      </View>

      <View style={styles.linksColumn}>
        <Link href="/signup" style={styles.linkRow}>
          <Text style={styles.linkText}>
            New user? <Text style={styles.linkTextBold}>Sign up</Text>
          </Text>
        </Link>
        <Pressable style={styles.linkRow} onPress={handleForgotPassword}>
          <Text style={styles.linkText}>Forgot password?</Text>
        </Pressable>
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
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
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
  linksColumn: {
    alignItems: 'center',
    gap: 10,
  },
  linkRow: {
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    opacity: 0.8,
    textAlign: 'center',
  },
  linkTextBold: {
    fontWeight: '700',
    opacity: 1,
  },
});
