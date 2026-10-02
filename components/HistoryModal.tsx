import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { HISTORY_RETENTION_MS } from '@/services/database';
import type { PantryItem } from '@/types/pantry';

const HOUR_MS = 60 * 60 * 1000;

type Props = {
  visible: boolean;
  items: PantryItem[];
  onClose: () => void;
  onRestore: (id: number) => void;
  onDeleteNow: (id: number) => void;
};

export default function HistoryModal({ visible, items, onClose, onRestore, onDeleteNow }: Props) {
  // Lazy initializer per the app's react-hooks/purity convention (see
  // PantryItemCard) - reads Date.now() once, not on every render.
  const [now] = useState(() => Date.now());

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.dragHandleRow}>
            <View style={styles.dragHandle} />
          </View>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.heading}>History</Text>
            <Text style={styles.subheading}>
              Used or removed items stay here for 24 hours in case you want them back.
            </Text>

            {items.length === 0 ? (
              <Text style={styles.empty}>Nothing in history right now.</Text>
            ) : (
              items.map((item) => {
                const removedAt = item.removedAtTimestamp ?? now;
                const msLeft = removedAt + HISTORY_RETENTION_MS - now;
                const hoursLeft = Math.max(1, Math.ceil(msLeft / HOUR_MS));
                const reasonLabel = item.removedReason === 'used' ? 'Marked as used' : 'Removed';

                return (
                  <View key={item.id} style={styles.row}>
                    <View style={styles.rowInfo}>
                      <Text style={styles.name}>{item.name}</Text>
                      <Text style={styles.meta}>
                        {reasonLabel} · deletes in {hoursLeft}h
                      </Text>
                    </View>
                    <View style={styles.rowActions}>
                      <Pressable
                        style={styles.restoreButton}
                        onPress={() => onRestore(item.id)}>
                        <Text style={styles.restoreText}>Restore</Text>
                      </Pressable>
                      <Pressable
                        style={styles.deleteButton}
                        onPress={() => onDeleteNow(item.id)}>
                        <Text style={styles.deleteText}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}

            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dragHandleRow: {
    alignItems: 'center',
    paddingTop: 10,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.light.cardBorder,
  },
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
  },
  subheading: {
    fontSize: 13,
    opacity: 0.65,
    marginTop: -6,
    marginBottom: 4,
  },
  empty: {
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 30,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  rowInfo: {
    flex: 1,
    paddingRight: 10,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
  },
  meta: {
    fontSize: 12,
    opacity: 0.65,
    marginTop: 2,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
  },
  restoreButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: Colors.light.chipNeutral,
  },
  restoreText: {
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#fbe4e0',
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#c0392b',
  },
  closeButton: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  closeText: {
    opacity: 0.6,
  },
});
