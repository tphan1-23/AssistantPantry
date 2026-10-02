import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import type { PantryItem } from '@/types/pantry';

const DAY_MS = 24 * 60 * 60 * 1000;
const URGENT_WITHIN_MS = 72 * 60 * 60 * 1000;

type Props = {
  item: PantryItem;
  onPress: (id: number) => void;
  onConsume: (id: number) => void;
  onDelete: (id: number) => void;
};

export default function PantryItemCard({ item, onPress, onConsume, onDelete }: Props) {
  // Lazy initializer: the one sanctioned place to read an impure value like
  // Date.now() during render, so the purity lint rule doesn't flag it.
  const [now] = useState(() => Date.now());
  const msRemaining = item.expiryTimestamp - now;
  const daysRemaining = Math.ceil(msRemaining / DAY_MS);
  const isUrgent = msRemaining <= URGENT_WITHIN_MS;
  const isExpired = msRemaining <= 0;

  const statusLabel = isExpired
    ? 'Expired'
    : daysRemaining === 1
      ? '1 day left'
      : `${daysRemaining} days left`;

  return (
    <View style={styles.card}>
      <Pressable style={styles.info} onPress={() => onPress(item.id)}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.quantity}>
          {item.quantity} {item.unit}
        </Text>
        <Text style={[styles.status, isUrgent && styles.statusUrgent]}>{statusLabel}</Text>
      </Pressable>
      <View style={styles.actions}>
        <Pressable onPress={() => onConsume(item.id)} style={styles.actionButton}>
          <Text style={styles.actionText}>Used</Text>
        </Pressable>
        <Pressable onPress={() => onDelete(item.id)} style={styles.actionButton}>
          <Text style={styles.actionText}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    marginBottom: 10,
    shadowColor: '#8B5E3C',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  quantity: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 2,
  },
  status: {
    fontSize: 13,
    marginTop: 4,
  },
  statusUrgent: {
    color: '#d9480f',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: Colors.light.chipNeutral,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
