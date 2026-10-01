import { useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View as RNView,
} from 'react-native';
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

// The heart button's own position (right:16, bottom:24, 52x52 - see styles
// below), used to compute how far the popup needs to travel from the
// button's center out to its resting centered position.
const HEART_RIGHT = 16;
const HEART_BOTTOM = 24;
const HEART_SIZE = 52;

// A single always-present heart icon is the one entry point into favorites.
// The popup grows out of the heart itself (Messenger chat-head style) but
// settles into a large, centered, scrollable panel rather than staying
// tucked in the corner.
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
      friction: 8,
      tension: 50,
    }).start();
  }

  function close() {
    Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setIsOpen(false);
      setSelectedId(null);
    });
  }

  function handleRemove(id: number) {
    onUnfavorite(id);
    setSelectedId(null);
  }

  const { width: screenW, height: screenH } = Dimensions.get('window');
  const heartCenterX = screenW - HEART_RIGHT - HEART_SIZE / 2;
  const heartCenterY = screenH - HEART_BOTTOM - HEART_SIZE / 2;
  const originX = heartCenterX - screenW / 2;
  const originY = heartCenterY - screenH / 2;

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.06, 1] });
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [originX, 0] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [originY, 0] });

  return (
    <>
      {!isOpen && (
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
      )}

      <Modal visible={isOpen} transparent animationType="none" onRequestClose={close}>
        <RNView style={styles.modalRoot}>
          {/* A full-screen tap-to-close layer *behind* the popup, as a
              sibling rather than an ancestor. An ancestor Pressable can
              still end up owning the touch responder for a drag that starts
              on plain (non-Pressable) content inside it - which is exactly
              what was breaking the ScrollView's scroll gesture and closing
              the popup on every tap. Siblings don't have that problem: a
              touch that lands on the popup's own pixels never reaches this
              layer at all. */}
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />

          <RNView
            style={[StyleSheet.absoluteFill, styles.centerWrap]}
            pointerEvents="box-none">
            <Animated.View
              style={[
                styles.popup,
                { opacity: progress, transform: [{ translateX }, { translateY }, { scale }] },
              ]}>
              <RNView style={styles.popupInner}>
                <LinearGradient colors={GRADIENT} style={styles.popupGradient}>
                  <ScrollView
                    style={styles.popupScroll}
                    contentContainerStyle={styles.popupContent}>
                    {selected ? (
                      <>
                        <Pressable
                          onPress={() => setSelectedId(null)}
                          style={styles.backRow}
                          hitSlop={8}>
                          <Text style={styles.backText}>‹ Favorites</Text>
                        </Pressable>
                        <RecipeCard
                          recipe={selected}
                          isFavorited
                          onToggleFavorite={() => handleRemove(selected.id)}
                        />
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
              </RNView>
            </Animated.View>
          </RNView>
        </RNView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  heartButtonWrap: {
    position: 'absolute',
    right: HEART_RIGHT,
    bottom: HEART_BOTTOM,
  },
  heartButton: {
    width: HEART_SIZE,
    height: HEART_SIZE,
    borderRadius: HEART_SIZE / 2,
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
  modalRoot: {
    flex: 1,
    backgroundColor: '#00000066',
  },
  centerWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popup: {
    width: '94%',
    height: '85%',
  },
  popupInner: {
    flex: 1,
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  popupGradient: {
    flex: 1,
  },
  popupScroll: {
    flex: 1,
  },
  popupContent: {
    padding: 20,
    flexGrow: 1,
  },
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: 'white',
    marginBottom: 16,
  },
  empty: {
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
    marginTop: 40,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff26',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  listRowTitleArea: {
    flex: 1,
    paddingRight: 10,
  },
  listRowText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  backRow: {
    paddingBottom: 14,
  },
  backText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
  },
});
