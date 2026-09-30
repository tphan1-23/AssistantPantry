import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Text, View } from '@/components/Themed';
import DateField from '@/components/DateField';
import { BRAND_COLOR } from '@/constants/Colors';
import {
  expiryTimestampForScannedItem,
  findMatchingItem,
  getAllItems,
  incrementQuantity,
  insertItem,
} from '@/services/database';
import { takePendingScan } from '@/services/scanSession';
import type { PantryItem, ScannedItem } from '@/types/pantry';

type Draft = {
  key: string;
  name: string;
  quantityText: string;
  unit: string;
  expiryDate: Date;
  confidence: ScannedItem['confidence'];
  note: string | null;
  matchedItem: PantryItem | null;
  mergeChoice: 'merge' | 'new';
};

export default function ReviewScanScreen() {
  const db = useSQLiteContext();
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const scanned = takePendingScan();
    if (!scanned || scanned.length === 0) {
      router.replace('/scan');
      return;
    }

    getAllItems(db).then((existingItems) => {
      const built: Draft[] = scanned.map((item, index) => {
        const match = findMatchingItem(existingItems, item.name);
        return {
          key: `${index}-${item.name}`,
          name: item.name,
          quantityText: String(item.quantity || 1),
          unit: item.unit || 'item',
          expiryDate: new Date(expiryTimestampForScannedItem(item)),
          confidence: item.confidence,
          note: item.note,
          matchedItem: match,
          mergeChoice: match ? 'merge' : 'new',
        };
      });
      setDrafts(built);
    });
  }, [db]);

  function updateDraft(key: string, patch: Partial<Draft>) {
    setDrafts((prev) => prev?.map((d) => (d.key === key ? { ...d, ...patch } : d)) ?? prev);
  }

  async function handleAddAll() {
    if (!drafts) return;
    setIsSaving(true);
    try {
      for (const draft of drafts) {
        const quantity = Math.max(1, parseInt(draft.quantityText, 10) || 1);
        if (draft.mergeChoice === 'merge' && draft.matchedItem) {
          await incrementQuantity(db, draft.matchedItem.id, quantity);
        } else {
          await insertItem(db, {
            name: draft.name.trim() || 'Unnamed item',
            quantity,
            unit: draft.unit.trim() || 'item',
            expiryTimestamp: draft.expiryDate.getTime(),
          });
        }
      }
      router.dismissTo('/index');
    } catch (error) {
      Alert.alert('Could not save items', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  }

  if (!drafts) {
    return <View style={styles.center} />;
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.heading}>Review scanned items</Text>
        <Text style={styles.subheading}>Check names, quantities, and dates before adding.</Text>

        {drafts.map((draft) => (
          <View key={draft.key} style={styles.card}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={draft.name}
              onChangeText={(text) => updateDraft(draft.key, { name: text })}
            />

            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.fieldLabel}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  value={draft.quantityText}
                  onChangeText={(text) => updateDraft(draft.key, { quantityText: text })}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.fieldLabel}>Unit</Text>
                <TextInput
                  style={styles.input}
                  value={draft.unit}
                  onChangeText={(text) => updateDraft(draft.key, { unit: text })}
                />
              </View>
            </View>

            <DateField
              label="Expiry date"
              value={draft.expiryDate}
              onChange={(date) => updateDraft(draft.key, { expiryDate: date })}
            />

            {draft.confidence === 'low' && (
              <View style={styles.warningBanner}>
                <Text style={styles.warningText}>
                  ⚠ Low confidence{draft.note ? `: ${draft.note}` : ' — double check this before adding.'}
                </Text>
              </View>
            )}

            {draft.matchedItem && (
              <View style={styles.matchBanner}>
                <Text style={styles.matchText}>
                  You already have {draft.matchedItem.quantity} {draft.matchedItem.unit}{' '}
                  {draft.matchedItem.name} in your pantry.
                </Text>
                <View style={styles.row}>
                  <Pressable
                    style={[styles.choiceChip, draft.mergeChoice === 'merge' && styles.choiceChipActive]}
                    onPress={() => updateDraft(draft.key, { mergeChoice: 'merge' })}>
                    <Text
                      style={[
                        styles.choiceChipText,
                        draft.mergeChoice === 'merge' && styles.choiceChipTextActive,
                      ]}>
                      Merge with existing
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.choiceChip, draft.mergeChoice === 'new' && styles.choiceChipActive]}
                    onPress={() => updateDraft(draft.key, { mergeChoice: 'new' })}>
                    <Text
                      style={[
                        styles.choiceChipText,
                        draft.mergeChoice === 'new' && styles.choiceChipTextActive,
                      ]}>
                      Add as separate item
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <Pressable style={styles.addButton} onPress={handleAddAll} disabled={isSaving}>
        <Text style={styles.addButtonText}>{isSaving ? 'Saving...' : 'Add to Pantry'}</Text>
      </Pressable>
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
    gap: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
  },
  subheading: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 2,
    marginBottom: 4,
  },
  card: {
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
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
    paddingVertical: 8,
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
  warningBanner: {
    backgroundColor: '#fff3cd55',
    borderRadius: 8,
    padding: 10,
  },
  warningText: {
    fontSize: 13,
    color: '#8a6100',
  },
  matchBanner: {
    gap: 8,
    backgroundColor: '#e7f3ff33',
    borderRadius: 8,
    padding: 10,
  },
  matchText: {
    fontSize: 13,
  },
  choiceChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
    alignItems: 'center',
  },
  choiceChipActive: {
    backgroundColor: BRAND_COLOR,
    borderColor: BRAND_COLOR,
  },
  choiceChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  choiceChipTextActive: {
    color: 'white',
  },
  addButton: {
    margin: 16,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: BRAND_COLOR,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
});
