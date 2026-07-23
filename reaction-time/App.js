import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  SafeAreaView,
} from "react-native";
import { StatusBar } from "expo-status-bar";

const COLORS = {
  idle: "#0f0f14",
  waiting: "#dc2626",
  go: "#22c55e",
  surface: "#18181f",
  accent: "#6366f1",
  accentMuted: "rgba(99, 102, 241, 0.15)",
  text: "#fafafa",
  textMuted: "rgba(250, 250, 250, 0.55)",
  textDim: "rgba(250, 250, 250, 0.35)",
  border: "rgba(255, 255, 255, 0.08)",
};

const NO_SCORE = Number.MAX_SAFE_INTEGER;

export default function App() {
  const [gameActive, setGameActive] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [time, setTime] = useState(0);
  const [score, setScore] = useState(NO_SCORE);
  const [bestScore, setBestScore] = useState(NO_SCORE);
  const [currentTimeout, setCurrentTimeout] = useState(null);
  const [message, setMessage] = useState("Appuyez pour commencer");
  const [subtitle, setSubtitle] = useState("Testez votre temps de réaction");

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);

  const getBgColor = () => {
    if (timerActive) return COLORS.go;
    if (gameActive) return COLORS.waiting;
    return COLORS.idle;
  };

  useEffect(() => {
    if (gameActive && !timerActive) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.02, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
    return () => pulseLoop.current?.stop();
  }, [gameActive, timerActive]);

  const startTimer = () => {
    setTime(Date.now());
    setTimerActive(true);
    setMessage("CLIQUEZ !");
    setSubtitle("");
  };

  const stopTimer = (newTime) => {
    if (newTime) {
      const newScore = newTime - time;
      setMessage(`${newScore}`);
      setSubtitle("millisecondes");
      setScore(newScore);
      if (newScore < bestScore) {
        setBestScore(newScore);
      }
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.3, duration: 80, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
    setGameActive(false);
    setTimerActive(false);
    setTime(0);
    clearTimeout(currentTimeout);
    setCurrentTimeout(null);
  };

  const handleScreenClick = () => {
    if (!gameActive) {
      setMessage("Attendez…");
      setSubtitle("Ne cliquez pas trop tôt");
      const randomDelay = Math.floor(Math.random() * 7) + 4;
      setGameActive(true);
      setCurrentTimeout(
        setTimeout(() => {
          startTimer();
        }, randomDelay * 1000)
      );
      return;
    }
    if (timerActive) {
      stopTimer(Date.now());
      return;
    }
    if (gameActive && !timerActive) {
      stopTimer();
      setMessage("Trop tôt !");
      setSubtitle("Réessayez");
    }
  };

  const handleResetClick = () => {
    setScore(NO_SCORE);
    setBestScore(NO_SCORE);
    setMessage("Appuyez pour commencer");
    setSubtitle("Testez votre temps de réaction");
  };

  const isResult = score !== NO_SCORE && !gameActive;
  const showStats = bestScore !== NO_SCORE;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Réaction</Text>
          {showStats && (
            <View style={styles.bestBadge}>
              <Text style={styles.bestLabel}>Record</Text>
              <Text style={styles.bestValue}>{bestScore} ms</Text>
            </View>
          )}
        </View>

        <Animated.View style={[styles.gameWrapper, { transform: [{ scale: pulseAnim }] }]}>
          <Pressable
            style={[styles.screen, { backgroundColor: getBgColor() }]}
            onPress={handleScreenClick}
          >
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
              <Text
                style={[
                  styles.mainText,
                  timerActive && styles.mainTextGo,
                  isResult && styles.mainTextResult,
                ]}
              >
                {message}
              </Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </Animated.View>
          </Pressable>
        </Animated.View>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [styles.resetButton, pressed && styles.resetButtonPressed]}
            onPress={handleResetClick}
          >
            <Text style={styles.resetButtonText}>Réinitialiser</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  bestBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.accentMuted,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.25)",
  },
  bestLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  bestValue: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  gameWrapper: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  screen: {
    flex: 1,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  mainText: {
    fontSize: 28,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  mainTextGo: {
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: 2,
  },
  mainTextResult: {
    fontSize: 72,
    fontWeight: "800",
    letterSpacing: -2,
    lineHeight: 80,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "400",
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  resetButton: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resetButtonPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    transform: [{ scale: 0.98 }],
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
});
