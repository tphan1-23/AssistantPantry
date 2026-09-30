import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Text, View } from '@/components/Themed';
import DateField from '@/components/DateField';
import { BRAND_COLOR } from '@/constants/Colors';
import { insertItem } from '@/services/database';

const DAY_MS = 24 * 60 * 60 * 1000;

export default function AddItemScreen() {
  const db = useSQLiteContext();

  const [name, setName] = useState('');
  const [quantityText, setQuantityText] = useState('1');
  const [unit, setUnit] = useState('item');
  const [expiryDate, setExpiryDate] = useState(() => new Date(Date.now() + 7 * DAY_MS));
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Name required', 'Give this item a name before saving.');
      return;
    }
    const quantity = Math.max(1, parseInt(quantityText, 10) || 1);

    setIsSaving(true);
    try {
      await insertItem(db, {
        name: trimmedName,
        quantity,
        unit: unit.trim() || 'item',
        expiryTimestamp: expiryDate.getTime(),
      });
      setName('');
      setQuantityText('1');
      setUnit('item');
      setExpiryDate(new Date(Date.now() + 7 * DAY_MS));
      router.navigate('/');
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.fieldLabel}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Ricola Cough Drops"
        />

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={styles.fieldLabel}>Quantity</Text>
            <TextInput
              style={styles.input}
              value={quantityText}
              onChangeText={setQuantityText}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.fieldLabel}>Unit</Text>
            <TextInput style={styles.input} value={unit} onChangeText={setUnit} placeholder="item" />
          </View>
        </View>

        <DateField label="Expiry date" value={expiryDate} onChange={setExpiryDate} />

        <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
          <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Add to Pantry'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  flex1: {
    flex: 1,
    gap: 6,
  },
  saveButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: BRAND_COLOR,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
});
