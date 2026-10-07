import { Link, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Text, View } from '@/components/Themed';
import GradientButton from '@/components/GradientButton';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { alert } from '@/utils/alert';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignUp() {
    if (!username.trim() || !email.trim() || !password) {
      alert('Missing info', 'Enter a username, email, and password.');
      return;
    }
    if (password.length < 6) {
      alert('Password too short', 'Use at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords don't match", 'Double check both password fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      await signUp(email.trim(), password, username.trim());
      alert(
        'Check your email',
        'We sent a confirmation link. Confirm your email, then sign in.',
        [{ text: 'OK', onPress: () => router.replace('/login') }]
      );
    } catch (error) {
      alert('Could not sign up', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Start tracking your own pantry.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholder="e.g. thanhp"
        />

        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
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
          <GradientButton title="Sign Up" onPress={handleSignUp} loading={isSubmitting} />
        </View>
      </View>

      <Link href="/login" style={styles.linkRow}>
        <Text style={styles.linkText}>Already have an account? <Text style={styles.linkTextBold}>Sign in</Text></Text>
      </Link>
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
