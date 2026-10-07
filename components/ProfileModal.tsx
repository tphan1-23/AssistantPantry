import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import Avatar from '@/components/Avatar';
import BottomSheetModal from '@/components/BottomSheetModal';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { confirmWithBiometrics } from '@/services/biometrics';
import { getCachedPassword } from '@/services/credentialCache';
import { uploadAvatar } from '@/services/profile';
import { alert } from '@/utils/alert';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const BIOMETRIC_FAILURE_MESSAGES: Record<string, string> = {
  'no-hardware': "This device doesn't support Face ID/fingerprint authentication.",
  'not-enrolled': 'No Face ID/fingerprint is set up on this device yet - add one in your device settings.',
  failed: 'Authentication was not completed.',
};

export default function ProfileModal({ visible, onClose }: Props) {
  const { session, updateProfile, signOut } = useAuth();
  const user = session?.user;

  const [username, setUsername] = useState<string>(user?.user_metadata?.username ?? '');
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [isCheckingBiometrics, setIsCheckingBiometrics] = useState(false);

  if (!user) return null;
  // Narrowed above, but TS doesn't carry that through the closures below
  // (a captured outer variable could theoretically change by the time a
  // handler runs) - this stable local reference keeps the rest of the
  // component from needing `user!`/optional-chaining everywhere.
  const currentUser = user;

  async function handlePickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.6,
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]?.base64) return;

    setIsUploadingAvatar(true);
    try {
      const url = await uploadAvatar(currentUser.id, result.assets[0].base64);
      await updateProfile({ avatarUrl: url });
    } catch (error) {
      alert('Could not update photo', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleSaveUsername() {
    const trimmed = username.trim();
    if (!trimmed) {
      alert('Username required', 'Enter a username before saving.');
      return;
    }
    setIsSavingUsername(true);
    try {
      await updateProfile({ username: trimmed });
    } catch (error) {
      alert('Could not save username', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSavingUsername(false);
    }
  }

  async function handleTogglePasswordReveal() {
    if (revealedPassword !== null) {
      setRevealedPassword(null);
      return;
    }
    if (!currentUser.email) return;

    setIsCheckingBiometrics(true);
    try {
      const check = await confirmWithBiometrics('Confirm to view your password');
      if (!check.ok) {
        alert('Could not verify', BIOMETRIC_FAILURE_MESSAGES[check.reason]);
        return;
      }
      const cached = await getCachedPassword(currentUser.email);
      if (!cached) {
        alert(
          'Not saved on this device',
          "Your password isn't cached here yet - sign out and sign back in (or set a new one) to save it for Face ID reveal."
        );
        return;
      }
      setRevealedPassword(cached);
    } finally {
      setIsCheckingBiometrics(false);
    }
  }

  function handleSignOut() {
    alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          onClose();
          signOut();
        },
      },
    ]);
  }

  return (
    <BottomSheetModal visible={visible} onClose={onClose} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.heading}>Account</Text>

      <Pressable style={styles.avatarRow} onPress={handlePickAvatar} disabled={isUploadingAvatar}>
        <Avatar
          avatarUrl={user.user_metadata?.avatar_url}
          label={username || user.email || '?'}
          size={72}
        />
        <Text style={styles.avatarHint}>
          {isUploadingAvatar ? 'Uploading…' : 'Tap to change photo'}
        </Text>
      </Pressable>

      <Text style={styles.fieldLabel}>Username</Text>
      <View style={styles.inlineRow}>
        <TextInput
          style={[styles.input, styles.flex1]}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholder="Add a username"
        />
        <Pressable style={styles.saveChip} onPress={handleSaveUsername} disabled={isSavingUsername}>
          <Text style={styles.saveChipText}>{isSavingUsername ? 'Saving…' : 'Save'}</Text>
        </Pressable>
      </View>

      <Text style={styles.fieldLabel}>Email</Text>
      <Text style={styles.readonlyValue}>{user.email}</Text>

      <Text style={styles.fieldLabel}>Password</Text>
      <View style={styles.inlineRow}>
        <Text style={[styles.readonlyValue, styles.flex1, styles.passwordValue]}>
          {revealedPassword ?? '••••••••'}
        </Text>
        <Pressable
          style={styles.saveChip}
          onPress={handleTogglePasswordReveal}
          disabled={isCheckingBiometrics}>
          <Text style={styles.saveChipText}>
            {isCheckingBiometrics ? '…' : revealedPassword !== null ? 'Hide' : 'Show'}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>
        To change your password, sign out and use &quot;Forgot password?&quot; on the sign-in screen.
      </Text>

      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </Pressable>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
  },
  avatarRow: {
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
  },
  avatarHint: {
    fontSize: 13,
    opacity: 0.65,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    opacity: 0.6,
    marginTop: 4,
  },
  readonlyValue: {
    fontSize: 15,
    opacity: 0.8,
  },
  passwordValue: {
    letterSpacing: 1,
  },
  hint: {
    fontSize: 12,
    opacity: 0.55,
    marginTop: -4,
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
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
  saveChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.light.chipNeutral,
  },
  saveChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  signOutButton: {
    paddingVertical: 12,
    borderRadius: 26,
    alignItems: 'center',
    backgroundColor: '#fbe4e0',
    marginTop: 16,
  },
  signOutButtonText: {
    fontWeight: '700',
    color: '#c0392b',
  },
});
