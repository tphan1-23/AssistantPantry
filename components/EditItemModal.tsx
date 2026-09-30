import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { Text, View } from '@/components/Themed';
import DateField from '@/components/DateField';
import { BRAND_COLOR } from '@/constants/Colors';
import type { PantryItem } from '@/types/pantry';

type Props = {
  item: PantryItem | null;
  onClose: () => void;
  onSave: (id: number, fields: { name: string; quantity: number; unit: string; expiryTimestamp: number }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

export default function EditItemModal({ item, onClose, onSave, onDelete }: Props) {
  return (
    <Modal visible={item !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Keyed by item id: remounts with fresh initial state per item instead
              of syncing via an effect, per React's rules-of-hooks purity guidance. */}
          {item && (
            <EditItemForm key={item.id} item={item} onClose={onClose} onSave={onSave} onDelete={onDelete} />
          )}
        </View>
      </View>
    </Modal>
  );
}

function EditItemForm({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item: PantryItem;
  onClose: () => void;
  onSave: Props['onSave'];
  onDelete: Props['onDelete'];
}) {
  const [name, setName] = useState(item.name);
  const [quantityText, setQuantityText] = useState(String(item.quantity));
  const [unit, setUnit] = useState(item.unit);
  const [expiryDate, setExpiryDate] = useState(new Date(item.expiryTimestamp));
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
      await onSave(item.id, {
        name: trimmedName,
        quantity,
        unit: unit.trim() || 'item',
        expiryTimestamp: expiryDate.getTime(),
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert('Remove item?', `Remove ${item.name} from your pantry?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onDelete(item.id) },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.heading}>Edit Item</Text>

      <Text style={styles.fieldLabel}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

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
          <TextInput style={styles.input} value={unit} onChangeText={setUnit} />
        </View>
      </View>

      <DateField label="Expiry date" value={expiryDate} onChange={setExpiryDate} />

      <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
        <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
      </Pressable>

      <Pressable style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteButtonText}>Remove from Pantry</Text>
      </Pressable>

      <Pressable style={styles.cancelButton} onPress={onClose}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#00000066',
  },
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  scrollContent: {
    padding: 20,
    gap: 14,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
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
  cancelButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelText: {
    opacity: 0.6,
  },
});
