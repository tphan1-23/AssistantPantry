import { Pressable, StyleSheet } from 'react-native';

import BottomSheetModal from '@/components/BottomSheetModal';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { HISTORY_RETENTION_MS } from '@/services/database';
import type { PantryItem } from '@/types/pantry';

const HOUR_MS = 60 * 60 * 1000;

type Props = {
  visible: boolean;
  items: PantryItem[];
  /**
   * Timestamp captured by the caller at the moment it opened the sheet
   * (an ordinary event handler, not render/effect code - see
   * Decisions & Bug Fixes Log for why `now` isn't computed in here).
   */
  now: number;
  onClose: () => void;
  onRestore: (id: number) => void;
  onDeleteNow: (id: number) => void;
};

export default function HistoryModal({ visible, items, now, onClose, onRestore, onDeleteNow }: Props) {
  return (
    <BottomSheetModal visible={visible} onClose={onClose} contentContainerStyle={styles.scrollContent}>
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
          const hoursLeft = Math.min(24, Math.max(1, Math.ceil(msLeft / HOUR_MS)));
          // Deliberately just the item's name, nothing else (no quantity/unit)
          // - this is a log of *what* left the pantry, not a restatement of
          // how much of it there was.
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
                <Pressable style={styles.restoreButton} onPress={() => onRestore(item.id)}>
                  <Text style={styles.restoreText}>Restore</Text>
                </Pressable>
                <Pressable style={styles.deleteButton} onPress={() => onDeleteNow(item.id)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}
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
});
