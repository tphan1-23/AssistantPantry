import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Text, View } from '@/components/Themed';
import PantryItemCard from '@/components/PantryItemCard';
import EditItemModal from '@/components/EditItemModal';
import HistoryModal from '@/components/HistoryModal';
import Colors from '@/constants/Colors';
import {
  getAllItems,
  getHistoryItems,
  markConsumed,
  permanentlyDeleteItem,
  purgeExpiredHistory,
  removeItem,
  restoreItem,
  updateItem,
} from '@/services/database';
import type { PantryItem } from '@/types/pantry';

export default function InventoryScreen() {
  const db = useSQLiteContext();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [historyItems, setHistoryItems] = useState<PantryItem[]>([]);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const refresh = useCallback(() => {
    // Purging first means a stale app that's been closed for over 24 hours
    // won't briefly show long-expired History rows on next open.
    purgeExpiredHistory(db).then(() =>
      Promise.all([getAllItems(db), getHistoryItems(db)]).then(([active, history]) => {
        setItems(active);
        setHistoryItems(history);
      })
    );
  }, [db]);

  useFocusEffect(refresh);

  async function handleConsume(id: number) {
    await markConsumed(db, id);
    refresh();
  }

  async function handleDelete(id: number) {
    await removeItem(db, id);
    refresh();
  }

  function handleOpenEdit(id: number) {
    const item = items.find((i) => i.id === id) ?? null;
    setEditingItem(item);
  }

  async function handleSaveEdit(
    id: number,
    fields: { name: string; quantity: number; unit: string; expiryTimestamp: number }
  ) {
    await updateItem(db, id, fields);
    setEditingItem(null);
    refresh();
  }

  async function handleDeleteFromModal(id: number) {
    await removeItem(db, id);
    setEditingItem(null);
    refresh();
  }

  async function handleRestore(id: number) {
    await restoreItem(db, id);
    refresh();
  }

  async function handleDeleteNow(id: number) {
    await permanentlyDeleteItem(db, id);
    refresh();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Pantry</Text>
            <Text style={styles.subtitle}>
              {items.length === 0
                ? 'Nothing in your pantry yet'
                : `${items.length} item${items.length === 1 ? '' : 's'}`}
            </Text>
          </View>
          <Pressable style={styles.historyButton} onPress={() => setIsHistoryOpen(true)}>
            <Text style={styles.historyButtonText}>
              History{historyItems.length > 0 ? ` (${historyItems.length})` : ''}
            </Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>Use the Scan or Add tabs to get started.</Text>
        }
        renderItem={({ item }) => (
          <PantryItemCard
            item={item}
            onPress={handleOpenEdit}
            onConsume={handleConsume}
            onDelete={handleDelete}
          />
        )}
      />
      <EditItemModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEdit}
        onDelete={handleDeleteFromModal}
      />
      <HistoryModal
        visible={isHistoryOpen}
        items={historyItems}
        onClose={() => setIsHistoryOpen(false)}
        onRestore={handleRestore}
        onDeleteNow={handleDeleteNow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  historyButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: Colors.light.chipNeutral,
  },
  historyButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    flexGrow: 1,
  },
  empty: {
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 40,
  },
});
