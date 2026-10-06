import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { router } from 'expo-router';

import { Text, View } from '@/components/Themed';
import DateField from '@/components/DateField';
import GradientButton from '@/components/GradientButton';
import Colors, { BRAND_COLOR } from '@/constants/Colors';
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
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const scanned = takePendingScan();
    if (!scanned || scanned.length === 0) {
      router.back();
      return;
    }

    getAllItems().then((existingItems) => {
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
  }, []);

  function updateDraft(key: string, patch: Partial<Draft>) {
    setDrafts((prev) => prev?.map((d) => (d.key === key ? { ...d, ...patch } : d)) ?? prev);
  }

  function removeDraft(key: string) {
    setDrafts((prev) => prev?.filter((d) => d.key !== key) ?? prev);
  }

  async function handleAddAll() {
    if (!drafts) return;
    setIsSaving(true);
    try {
      for (const draft of drafts) {
        const quantity = Math.max(1, parseInt(draft.quantityText, 10) || 1);
        if (draft.mergeChoice === 'merge' && draft.matchedItem) {
          await incrementQuantity(draft.matchedItem.id, quantity);
        } else {
          await insertItem({
            name: draft.name.trim() || 'Unnamed item',
            quantity,
            unit: draft.unit.trim() || 'item',
            expiryTimestamp: draft.expiryDate.getTime(),
          });
        }
      }
      Alert.alert('Added to pantry', undefined, [{ text: 'OK', onPress: () => router.back() }]);
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

        {drafts.length === 0 && (
          <Text style={styles.empty}>No items left to add. Go back to scan again if needed.</Text>
        )}

        {drafts.map((draft) => (
          <View key={draft.key} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.fieldLabel}>Name</Text>
              <Pressable
                onPress={() => removeDraft(draft.key)}
                style={styles.removeButton}
                hitSlop={8}>
                <Text style={styles.removeButtonText}>Remove</Text>
              </Pressable>
            </View>
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

      <View style={styles.addButtonWrap}>
        <GradientButton
          title={drafts.length === 0 ? 'Nothing to Add' : `Add ${drafts.length} to Pantry`}
          onPress={handleAddAll}
          disabled={drafts.length === 0}
          loading={isSaving}
        />
      </View>
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
    padding: 16,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  removeButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#fbe4e0',
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#c0392b',
  },
  empty: {
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 12,
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
    backgroundColor: '#fff3cd88',
    borderRadius: 12,
    padding: 12,
  },
  warningText: {
    fontSize: 13,
    color: '#8a6100',
  },
  matchBanner: {
    gap: 8,
    backgroundColor: '#e7f3ff88',
    borderRadius: 12,
    padding: 12,
  },
  matchText: {
    fontSize: 13,
  },
  choiceChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    backgroundColor: 'white',
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
  addButtonWrap: {
    margin: 16,
  },
});
