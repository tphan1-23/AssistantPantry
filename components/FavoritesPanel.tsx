import { useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import BreakableHeart from '@/components/BreakableHeart';
import RecipeCard from '@/components/RecipeCard';
import { Text, View } from '@/components/Themed';
import type { FavoriteRecipe } from '@/types/pantry';

type Props = {
  favorites: FavoriteRecipe[];
  onUnfavorite: (id: number) => void;
};

const GRADIENT = ['#FFB3C6', '#FF6F9C', '#D6336C'] as const;

// A single always-present heart icon is the one entry point into favorites.
// The popup grows out of the heart itself (Messenger chat-head style)
// instead of just fading in centered on screen.
export default function FavoritesPanel({ favorites, onUnfavorite }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [progress] = useState(() => new Animated.Value(0));
  const selected = favorites.find((f) => f.id === selectedId) ?? null;

  function open() {
    setIsOpen(true);
    Animated.spring(progress, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 55,
    }).start();
  }

  function close() {
    Animated.timing(progress, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setIsOpen(false);
      setSelectedId(null);
    });
  }

  function handleRemove(id: number) {
    onUnfavorite(id);
    setSelectedId(null);
  }

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.08, 1] });
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [46, 0] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [70, 0] });

  return (
    <>
      <Pressable style={styles.heartButtonWrap} onPress={open}>
        <LinearGradient colors={GRADIENT} style={styles.heartButton}>
          <Text style={styles.heartButtonIcon}>♥</Text>
        </LinearGradient>
        {favorites.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{favorites.length}</Text>
          </View>
        )}
      </Pressable>

      <Modal visible={isOpen} transparent animationType="none" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Animated.View
            style={[
              styles.popup,
              { opacity: progress, transform: [{ translateX }, { translateY }, { scale }] },
            ]}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <LinearGradient colors={GRADIENT} style={styles.popupGradient}>
                <ScrollView contentContainerStyle={styles.popupContent}>
                  {selected ? (
                    <>
                      <Pressable
                        onPress={() => setSelectedId(null)}
                        style={styles.backRow}
                        hitSlop={8}>
                        <Text style={styles.backText}>‹ Favorites</Text>
                      </Pressable>
                      <RecipeCard recipe={selected} isFavorited onToggleFavorite={() => handleRemove(selected.id)} />
                    </>
                  ) : (
                    <>
                      <Text style={styles.heading}>💕 Favorite Recipes</Text>
                      {favorites.length === 0 ? (
                        <Text style={styles.empty}>No favorite recipes yet.</Text>
                      ) : (
                        favorites.map((fav) => (
                          <View key={fav.id} style={styles.listRow}>
                            <Pressable
                              style={styles.listRowTitleArea}
                              onPress={() => setSelectedId(fav.id)}>
                              <Text style={styles.listRowText}>{fav.title}</Text>
                            </Pressable>
                            <BreakableHeart
                              filled
                              size={22}
                              color="white"
                              onPress={() => handleRemove(fav.id)}
                            />
                          </View>
                        ))
                      )}
                    </>
                  )}
                </ScrollView>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  heartButtonWrap: {
    position: 'absolute',
    right: 16,
    bottom: 24,
  },
  heartButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  heartButtonIcon: {
    color: 'white',
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    backgroundColor: '#3A2418',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    backgroundColor: '#00000055',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 16,
    paddingBottom: 92,
  },
  popup: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '75%',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  popupGradient: {
    borderRadius: 24,
  },
  popupContent: {
    padding: 18,
  },
  heading: {
    fontSize: 19,
    fontWeight: '800',
    color: 'white',
    marginBottom: 14,
  },
  empty: {
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
    paddingVertical: 20,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff26',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  listRowTitleArea: {
    flex: 1,
    paddingRight: 10,
  },
  listRowText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  backRow: {
    paddingBottom: 12,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
});
