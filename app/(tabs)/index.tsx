import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import Avatar from '@/components/Avatar';
import { Text, View } from '@/components/Themed';
import PantryItemCard from '@/components/PantryItemCard';
import EditItemModal from '@/components/EditItemModal';
import HistoryModal from '@/components/HistoryModal';
import ProfileModal from '@/components/ProfileModal';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
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
  const { session } = useAuth();
  const user = session?.user;
  const [items, setItems] = useState<PantryItem[]>([]);
  const [historyItems, setHistoryItems] = useState<PantryItem[]>([]);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyOpenedAt, setHistoryOpenedAt] = useState(() => Date.now());
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const refresh = useCallback(() => {
    // Purging first means a stale app that's been closed for over 24 hours
    // won't briefly show long-expired History rows on next open.
    purgeExpiredHistory().then(() =>
      Promise.all([getAllItems(), getHistoryItems()]).then(([active, history]) => {
        setItems(active);
        setHistoryItems(history);
      })
    );
  }, []);

  useFocusEffect(refresh);

  async function handleConsume(id: number) {
    await markConsumed(id);
    refresh();
  }

  async function handleDelete(id: number) {
    await removeItem(id);
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
    await updateItem(id, fields);
    setEditingItem(null);
    refresh();
  }

  async function handleDeleteFromModal(id: number) {
    await removeItem(id);
    setEditingItem(null);
    refresh();
  }

  async function handleRestore(id: number) {
    await restoreItem(id);
    refresh();
  }

  async function handleDeleteNow(id: number) {
    await permanentlyDeleteItem(id);
    refresh();
  }

  function handleOpenHistory() {
    // Purges + re-fetches right now, not just whatever was loaded on last
    // tab focus - History can otherwise show rows that are already past
    // the 24-hour window if the tab's been sitting open a while. Capturing
    // "now" here (an event handler, not render/effect code) is also what
    // keeps the countdown inside HistoryModal from going stale the longer
    // the tab sits open - see Decisions & Bug Fixes Log.
    refresh();
    setHistoryOpenedAt(Date.now());
    setIsHistoryOpen(true);
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
          <View style={styles.headerButtons}>
            <Pressable style={styles.historyButton} onPress={handleOpenHistory}>
              <SymbolView
                name={{ ios: 'clock.arrow.circlepath', android: 'history', web: 'history' }}
                tintColor={Colors.light.text}
                size={20}
              />
            </Pressable>
            <Pressable onPress={() => setIsProfileOpen(true)}>
              <Avatar
                avatarUrl={user?.user_metadata?.avatar_url}
                label={user?.user_metadata?.username || user?.email || '?'}
                size={36}
              />
            </Pressable>
          </View>
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
        now={historyOpenedAt}
        onClose={() => setIsHistoryOpen(false)}
        onRestore={handleRestore}
        onDeleteNow={handleDeleteNow}
      />
      <ProfileModal visible={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
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
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  historyButton: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.chipNeutral,
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
