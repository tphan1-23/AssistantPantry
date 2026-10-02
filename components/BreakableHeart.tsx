import { useState } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";

type Props = {
  /** Whether this heart represents something currently favorited (solid vs outline). */
  filled: boolean;
  size?: number;
  color?: string;
  /** Called immediately when toggling on; called after the break animation finishes when toggling off. */
  onPress: () => void;
};

// A heart that, when removing a favorite, visibly cracks into two pieces and
// falls away before disappearing - rather than just shaking and fading as a
// single glyph.
export default function BreakableHeart({
  filled,
  size = 24,
  color = "#d6336c",
  onPress,
}: Props) {
  const [isBreaking, setIsBreaking] = useState(false);
  const [shakeX] = useState(() => new Animated.Value(0));
  const [leftX] = useState(() => new Animated.Value(0));
  const [leftRotate] = useState(() => new Animated.Value(0));
  const [rightX] = useState(() => new Animated.Value(0));
  const [rightRotate] = useState(() => new Animated.Value(0));
  const [fallY] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(1));

  function handlePress() {
    if (!filled) {
      onPress();
      return;
    }

    setIsBreaking(true);
    Animated.sequence([
      Animated.sequence([
        Animated.timing(shakeX, {
          toValue: 3,
          duration: 45,
          useNativeDriver: true,
        }),
        Animated.timing(shakeX, {
          toValue: -3,
          duration: 45,
          useNativeDriver: true,
        }),
        Animated.timing(shakeX, {
          toValue: 3,
          duration: 45,
          useNativeDriver: true,
        }),
        Animated.timing(shakeX, {
          toValue: 0,
          duration: 45,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(leftX, {
          toValue: -size * 0.6,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.timing(leftRotate, {
          toValue: -1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.timing(rightX, {
          toValue: size * 0.6,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.timing(rightRotate, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.timing(fallY, {
          toValue: size * 0.7,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 260,
          delay: 140,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onPress();
      setIsBreaking(false);
      shakeX.setValue(0);
      leftX.setValue(0);
      leftRotate.setValue(0);
      rightX.setValue(0);
      rightRotate.setValue(0);
      fallY.setValue(0);
      opacity.setValue(1);
    });
  }

  const leftRotateDeg = leftRotate.interpolate({
    inputRange: [-1, 0],
    outputRange: ["-50deg", "0deg"],
  });
  const rightRotateDeg = rightRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "50deg"],
  });

  if (!filled) {
    return (
      <Pressable
        onPress={handlePress}
        hitSlop={10}
        style={{ width: size, height: size }}
      >
        <Text
          style={{ fontSize: size, lineHeight: size, color, opacity: 0.45 }}
        >
          ♡
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={isBreaking}
      hitSlop={10}
      style={{ width: size, height: size }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.half,
          styles.leftHalf,
          {
            width: size / 2,
            height: size,
            opacity,
            transform: [
              { translateX: shakeX },
              { translateX: leftX },
              { translateY: fallY },
              { rotate: leftRotateDeg },
            ],
          },
        ]}
      >
        <Text style={{ width: size, fontSize: size, lineHeight: size, color }}>
          ♥
        </Text>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.half,
          styles.rightHalf,
          {
            left: size / 2,
            width: size / 2,
            height: size,
            opacity,
            transform: [
              { translateX: shakeX },
              { translateX: rightX },
              { translateY: fallY },
              { rotate: rightRotateDeg },
            ],
          },
        ]}
      >
        <Text
          style={{
            position: "absolute",
            left: -size / 2,
            width: size,
            fontSize: size,
            lineHeight: size,
            color,
          }}
        >
          ♥
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  half: {
    position: "absolute",
    top: 0,
    overflow: "hidden",
  },
  leftHalf: {},
  rightHalf: {},
});
