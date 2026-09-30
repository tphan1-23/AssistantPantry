import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Text, View } from '@/components/Themed';
import DateField from '@/components/DateField';
import { BRAND_COLOR } from '@/constants/Colors';
import { deletePantryItem, getItemById, insertItem, updateItem } from '@/services/database';

const DAY_MS = 24 * 60 * 60 * 1000;

export default function ItemFormScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const itemId = id ? Number(id) : null;
  const isEditing = itemId !== null;

  const [name, setName] = useState('');
  const [quantityText, setQuantityText] = useState('1');
  const [unit, setUnit] = useState('item');
  const [expiryDate, setExpiryDate] = useState(() => new Date(Date.now() + 7 * DAY_MS));
  const [isLoaded, setIsLoaded] = useState(!isEditing);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (itemId === null) return;
    getItemById(db, itemId).then((item) => {
      if (item) {
        setName(item.name);
        setQuantityText(String(item.quantity));
        setUnit(item.unit);
        setExpiryDate(new Date(item.expiryTimestamp));
      }
      setIsLoaded(true);
    });
  }, [db, itemId]);

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Name required', 'Give this item a name before saving.');
      return;
    }
    const quantity = Math.max(1, parseInt(quantityText, 10) || 1);

    setIsSaving(true);
    try {
      if (isEditing && itemId !== null) {
        await updateItem(db, itemId, {
          name: trimmedName,
          quantity,
          unit: unit.trim() || 'item',
          expiryTimestamp: expiryDate.getTime(),
        });
      } else {
        await insertItem(db, {
          name: trimmedName,
          quantity,
          unit: unit.trim() || 'item',
          expiryTimestamp: expiryDate.getTime(),
        });
      }
      router.back();
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  }

  function handleDelete() {
    if (itemId === null) return;
    Alert.alert('Remove item?', `Remove ${name} from your pantry?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deletePantryItem(db, itemId);
          router.back();
        },
      },
    ]);
  }

  if (!isLoaded) {
    return <View style={styles.center} />;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: isEditing ? 'Edit Item' : 'Add Item' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.fieldLabel}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Ricola Cough Drops"
          autoFocus={!isEditing}
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
          <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
        </Pressable>

        {isEditing && (
          <Pressable style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Remove from Pantry</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  deleteButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#c0392b',
  },
  deleteButtonText: {
    color: '#c0392b',
    fontWeight: '600',
  },
});
