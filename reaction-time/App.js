import React, { useState, useEffect, useRef, useCallback } from "react";
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
  foul: "#f97316",
  surface: "#18181f",
  accent: "#6366f1",
  accentBottom: "#a78bfa",
  accentMuted: "rgba(99, 102, 241, 0.15)",
  accentBottomMuted: "rgba(167, 139, 250, 0.15)",
  text: "#fafafa",
  textMuted: "rgba(250, 250, 250, 0.55)",
  textDim: "rgba(250, 250, 250, 0.35)",
  border: "rgba(255, 255, 255, 0.08)",
};

const NO_SCORE = Number.MAX_SAFE_INTEGER;

const PHASE = {
  IDLE: "idle",
  WAITING: "waiting",
  GO: "go",
  RESULT: "result",
};

const PLAYERS = {
  top: {
    accent: COLORS.accent,
    accentBorder: "rgba(99, 102, 241, 0.5)",
    inverted: true,
  },
  bottom: {
    accent: COLORS.accentBottom,
    accentBorder: "rgba(167, 139, 250, 0.5)",
    inverted: false,
  },
};

function HomeScreen({ onSelectSolo, onSelectMulti }) {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.homeContent}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>Réaction</Text>
            <Text style={styles.logoSub}>Time</Text>
          </View>
          <Text style={styles.homeTagline}>Testez vos réflexes</Text>

          <View style={styles.modesContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.modeCard,
                pressed && styles.modeCardPressed,
              ]}
              onPress={onSelectSolo}
            >
              <View style={styles.modeIcon}>
                <Text style={styles.modeIconText}>1</Text>
              </View>
              <View style={styles.modeInfo}>
                <Text style={styles.modeTitle}>Solo</Text>
                <Text style={styles.modeDescription}>
                  Mesurez votre temps de réaction
                </Text>
              </View>
              <Text style={styles.modeArrow}>›</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.modeCard,
                pressed && styles.modeCardPressed,
              ]}
              onPress={onSelectMulti}
            >
              <View style={[styles.modeIcon, styles.modeIconBottom]}>
                <Text style={[styles.modeIconText, styles.modeIconTextBottom]}>
                  2
                </Text>
              </View>
              <View style={styles.modeInfo}>
                <Text style={styles.modeTitle}>1vs1</Text>
                <Text style={styles.modeDescription}>
                  Appuyez chacun pour lancer
                </Text>
              </View>
              <Text style={styles.modeArrow}>›</Text>
            </Pressable>

            <View style={[styles.modeCard, styles.modeCardDisabled]}>
              <View style={[styles.modeIcon, styles.modeIconDisabled]}>
                <Text style={[styles.modeIconText, styles.modeIconTextDisabled]}>
                  3
                </Text>
              </View>
              <View style={styles.modeInfo}>
                <Text style={[styles.modeTitle, styles.modeTitleDisabled]}>
                  Multi
                </Text>
              </View>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Bientôt</Text>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function getZoneBackground(phase, fouled, started, score) {
  if ((phase === PHASE.IDLE || phase === PHASE.RESULT) && started) {
    return COLORS.idle;
  }
  if (fouled) return COLORS.foul;
  if (phase === PHASE.GO && score !== null) return COLORS.idle;
  if (phase === PHASE.GO) return COLORS.go;
  if (phase === PHASE.WAITING) return COLORS.waiting;
  return COLORS.idle;
}

function getZoneMessage(phase, fouled, score, started, opponentReady) {
  if ((phase === PHASE.IDLE || phase === PHASE.RESULT) && started) {
    return {
      main: "Prêt",
      subtitle: opponentReady ? null : "En attente…",
    };
  }
  if ((phase === PHASE.IDLE || phase === PHASE.RESULT) && opponentReady) {
    return { main: "À vous", subtitle: "Adversaire prêt" };
  }
  if (phase === PHASE.RESULT) {
    if (fouled) {
      return { main: "Trop tôt !", subtitle: "Rappuyez pour rejouer" };
    }
    if (score !== null) {
      return {
        main: `${score}`,
        subtitle: "millisecondes",
        hint: "Rappuyez pour rejouer",
      };
    }
    return { main: "—", subtitle: "Rappuyez pour rejouer" };
  }
  if (fouled) return { main: "Trop tôt !", subtitle: null };
  if (phase === PHASE.GO && score !== null) {
    return { main: `${score}`, subtitle: "millisecondes", hint: "En attente…" };
  }
  if (phase === PHASE.GO) return { main: "CLIQUEZ !", subtitle: null };
  if (phase === PHASE.WAITING) return { main: "Attendez…", subtitle: null };
  return { main: "Appuyez pour commencer", subtitle: null };
}

function getPlayerKeyFromY(y, height) {
  return y < height / 2 ? "top" : "bottom";
}

function playerHasActiveTouch(playerKey, activeTouches) {
  for (const tracked of activeTouches.values()) {
    if (tracked.playerKey === playerKey) return true;
  }
  return false;
}

function getOutcome(playerKey, phase, started, winners) {
  if (phase !== PHASE.RESULT || started) return null;
  if (winners.top && winners.bottom) return "tie";
  if (winners[playerKey]) return "win";
  if (winners.top || winners.bottom) return "lose";
  return null;
}

function getOutcomeLabel(outcome) {
  if (outcome === "win") return "Gagné";
  if (outcome === "lose") return "Perdu";
  if (outcome === "tie") return "Égalité";
  return null;
}

function PlayerZone({
  playerKey,
  phase,
  started,
  opponentReady,
  pressed,
  fouled,
  score,
  winners,
}) {
  const config = PLAYERS[playerKey];
  const isLobby = phase === PHASE.IDLE || phase === PHASE.RESULT;
  const isReady = isLobby && started;
  const isNudged = isLobby && !started && opponentReady;
  const outcome = getOutcome(playerKey, phase, started, winners);
  const outcomeLabel = getOutcomeLabel(outcome);
  const { main, subtitle, hint } = getZoneMessage(
    phase,
    fouled,
    score,
    started,
    opponentReady
  );
  const isResult =
    phase === PHASE.RESULT && !fouled && score !== null && !started;
  const isGo = phase === PHASE.GO && !fouled && score === null;
  const isClicked = phase === PHASE.GO && !fouled && score !== null;
  const showFoulStyle = fouled && !started;
  const showAccentBorder =
    isReady || isNudged || isClicked || outcome === "win" || outcome === "tie";

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const readyPulse = useRef(new Animated.Value(1)).current;
  const readyLoop = useRef(null);

  useEffect(() => {
    if (outcome === "win") {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.04,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    scaleAnim.setValue(1);
  }, [outcome, scaleAnim]);

  useEffect(() => {
    if (isReady) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.03,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();

      readyLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(readyPulse, {
            toValue: 0.55,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(readyPulse, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      );
      readyLoop.current.start();
    } else {
      readyLoop.current?.stop();
      readyPulse.setValue(1);
    }
    return () => readyLoop.current?.stop();
  }, [isReady, scaleAnim, readyPulse]);

  useEffect(() => {
    if (isClicked) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isClicked, score, scaleAnim]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.playerZone,
        {
          backgroundColor: getZoneBackground(phase, fouled, started, score),
          borderColor:
            outcome === "win"
              ? "rgba(34, 197, 94, 0.55)"
              : outcome === "lose"
                ? "rgba(239, 68, 68, 0.25)"
                : outcome === "tie"
                  ? config.accentBorder
                  : showAccentBorder
                    ? config.accentBorder
                    : COLORS.border,
          borderWidth: outcome ? 2 : showAccentBorder ? 2 : 1,
          transform: [{ scale: scaleAnim }],
        },
        outcome === "win" && styles.playerZoneWinner,
        outcome === "win" && { shadowColor: COLORS.go },
        outcome === "tie" && styles.playerZoneTie,
        outcome === "tie" && { shadowColor: config.accent },
        pressed &&
          (phase === PHASE.WAITING || phase === PHASE.GO) &&
          styles.playerZonePressed,
      ]}
    >
      {outcome === "win" ? <View style={styles.winOverlay} /> : null}
      {outcome === "lose" ? <View style={styles.loseOverlay} /> : null}
      {outcome === "tie" ? (
        <View
          style={[styles.tieOverlay, { backgroundColor: config.accentMuted }]}
        />
      ) : null}
      {isReady ? (
        <Animated.View
          style={[
            styles.readyOverlay,
            { backgroundColor: config.accentMuted, opacity: readyPulse },
          ]}
        />
      ) : null}
      {isNudged ? (
        <View
          style={[styles.nudgeOverlay, { borderColor: config.accentBorder }]}
        />
      ) : null}
      {isClicked ? (
        <View
          style={[styles.clickedOverlay, { backgroundColor: config.accentMuted }]}
        />
      ) : null}
      <View
        style={[
          styles.playerZoneContent,
          config.inverted && styles.playerZoneInverted,
        ]}
      >
        {outcomeLabel ? (
          <View
            style={[
              styles.outcomeBadge,
              outcome === "win" && styles.outcomeBadgeWin,
              outcome === "lose" && styles.outcomeBadgeLose,
              outcome === "tie" && styles.outcomeBadgeTie,
              outcome === "tie" && { borderColor: config.accentBorder },
            ]}
          >
            <Text
              style={[
                styles.outcomeBadgeText,
                outcome === "win" && styles.outcomeBadgeTextWin,
                outcome === "lose" && styles.outcomeBadgeTextLose,
                outcome === "tie" && styles.outcomeBadgeTextTie,
                outcome === "tie" && { color: config.accent },
              ]}
            >
              {outcomeLabel}
            </Text>
          </View>
        ) : isReady ? (
          <View
            style={[
              styles.readyBadge,
              { backgroundColor: config.accentMuted, borderColor: config.accentBorder },
            ]}
          >
            <Text style={[styles.readyBadgeText, { color: config.accent }]}>
              ✓ Prêt
            </Text>
          </View>
        ) : null}
        <Text
          style={[
            styles.zoneMainText,
            isGo && styles.zoneMainTextGo,
            (isResult || isClicked) && styles.zoneMainTextResult,
            showFoulStyle && styles.zoneMainTextFoul,
            isReady && [styles.zoneMainTextReady, { color: config.accent }],
            isNudged && styles.zoneMainTextNudged,
          ]}
        >
          {main}
        </Text>
        {subtitle ? <Text style={styles.zoneSubtitle}>{subtitle}</Text> : null}
        {hint ? <Text style={styles.zoneHint}>{hint}</Text> : null}
      </View>
    </Animated.View>
  );
}

function MultiGame({ onBack }) {
  const [phase, setPhase] = useState(PHASE.IDLE);
  const [started, setStarted] = useState({ top: false, bottom: false });
  const [pressed, setPressed] = useState({ top: false, bottom: false });
  const [scores, setScores] = useState({ top: null, bottom: null });
  const [fouls, setFouls] = useState({ top: false, bottom: false });
  const [winners, setWinners] = useState({ top: false, bottom: false });

  const phaseRef = useRef(PHASE.IDLE);
  const startedRef = useRef({ top: false, bottom: false });
  const scoresRef = useRef({ top: null, bottom: null });
  const foulsRef = useRef({ top: false, bottom: false });
  const goTimestampRef = useRef(null);
  const goTimeoutRef = useRef(null);
  const padHeightRef = useRef(0);
  const activeTouchesRef = useRef(new Map());

  const clearTimers = useCallback(() => {
    clearTimeout(goTimeoutRef.current);
    goTimeoutRef.current = null;
  }, []);

  const resetLobby = useCallback(() => {
    startedRef.current = { top: false, bottom: false };
    setStarted({ top: false, bottom: false });
  }, []);

  const syncPressedVisual = useCallback(() => {
    const next = { top: false, bottom: false };
    for (const tracked of activeTouchesRef.current.values()) {
      next[tracked.playerKey] = true;
    }
    setPressed(next);
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const computeWinners = useCallback((finalScores, finalFouls) => {
    const topFouled = finalFouls.top;
    const bottomFouled = finalFouls.bottom;
    const topScore = finalScores.top;
    const bottomScore = finalScores.bottom;

    if (topFouled && bottomFouled) {
      return { top: false, bottom: false };
    }
    if (topFouled && bottomScore !== null) {
      return { top: false, bottom: true };
    }
    if (bottomFouled && topScore !== null) {
      return { top: true, bottom: false };
    }
    if (topScore !== null && bottomScore !== null) {
      if (topScore === bottomScore) {
        return { top: true, bottom: true };
      }
      return topScore < bottomScore
        ? { top: true, bottom: false }
        : { top: false, bottom: true };
    }
    return { top: false, bottom: false };
  }, []);

  const tryFinishRound = useCallback(() => {
    const currentScores = scoresRef.current;
    const currentFouls = foulsRef.current;
    const topDone = currentFouls.top || currentScores.top !== null;
    const bottomDone = currentFouls.bottom || currentScores.bottom !== null;
    if (topDone && bottomDone) {
      setPhase(PHASE.RESULT);
      setWinners(computeWinners(currentScores, currentFouls));
      resetLobby();
    }
  }, [computeWinners, resetLobby]);

  const beginWaiting = useCallback(() => {
    clearTimers();
    goTimestampRef.current = null;
    scoresRef.current = { top: null, bottom: null };
    foulsRef.current = { top: false, bottom: false };
    startedRef.current = { top: false, bottom: false };
    setScores({ top: null, bottom: null });
    setFouls({ top: false, bottom: false });
    setStarted({ top: false, bottom: false });
    setWinners({ top: false, bottom: false });
    setPhase(PHASE.WAITING);

    const randomDelay = (Math.floor(Math.random() * 7) + 4) * 1000;
    goTimeoutRef.current = setTimeout(() => {
      if (phaseRef.current !== PHASE.WAITING) return;
      goTimestampRef.current = Date.now();
      setPhase(PHASE.GO);
    }, randomDelay);
  }, [clearTimers]);

  const recordFoul = useCallback(
    (playerKey) => {
      if (foulsRef.current[playerKey] || scoresRef.current[playerKey] !== null) {
        return;
      }
      foulsRef.current = { ...foulsRef.current, [playerKey]: true };
      setFouls({ ...foulsRef.current });
      tryFinishRound();
    },
    [tryFinishRound]
  );

  const recordScore = useCallback(
    (playerKey) => {
      if (
        !goTimestampRef.current ||
        foulsRef.current[playerKey] ||
        scoresRef.current[playerKey] !== null
      ) {
        return;
      }
      const reactionTime = Date.now() - goTimestampRef.current;
      scoresRef.current = { ...scoresRef.current, [playerKey]: reactionTime };
      setScores({ ...scoresRef.current });
      tryFinishRound();
    },
    [tryFinishRound]
  );

  const handleZonePress = useCallback(
    (playerKey) => {
      const currentPhase = phaseRef.current;

      if (currentPhase === PHASE.IDLE || currentPhase === PHASE.RESULT) {
        if (startedRef.current[playerKey]) return;

        foulsRef.current = { ...foulsRef.current, [playerKey]: false };
        scoresRef.current = { ...scoresRef.current, [playerKey]: null };
        setFouls({ ...foulsRef.current });
        setScores({ ...scoresRef.current });
        setWinners({ top: false, bottom: false });

        const nextStarted = { ...startedRef.current, [playerKey]: true };
        startedRef.current = nextStarted;
        setStarted(nextStarted);

        if (nextStarted.top && nextStarted.bottom) {
          beginWaiting();
        }
        return;
      }

      if (currentPhase === PHASE.WAITING) {
        recordFoul(playerKey);
        return;
      }

      if (currentPhase === PHASE.GO) {
        recordScore(playerKey);
      }
    },
    [beginWaiting, recordFoul, recordScore]
  );

  const handleTouchStart = useCallback(
    (event) => {
      const height = padHeightRef.current;
      if (!height) return;

      const activeTouches = activeTouchesRef.current;
      let changed = false;

      for (const touch of event.nativeEvent.changedTouches) {
        const playerKey = getPlayerKeyFromY(touch.locationY, height);
        if (playerHasActiveTouch(playerKey, activeTouches)) continue;

        activeTouches.set(touch.identifier, { playerKey });
        changed = true;
      }

      if (changed) syncPressedVisual();
    },
    [syncPressedVisual]
  );

  const handleTouchEnd = useCallback(
    (event) => {
      const height = padHeightRef.current;
      if (!height) return;

      const activeTouches = activeTouchesRef.current;
      let changed = false;

      for (const touch of event.nativeEvent.changedTouches) {
        const tracked = activeTouches.get(touch.identifier);
        if (!tracked) continue;

        activeTouches.delete(touch.identifier);
        changed = true;
        handleZonePress(tracked.playerKey);
      }

      if (changed) syncPressedVisual();
    },
    [handleZonePress, syncPressedVisual]
  );

  const handlePadLayout = useCallback((event) => {
    padHeightRef.current = event.nativeEvent.layout.height;
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            onPress={() => {
              clearTimers();
              onBack();
            }}
          >
            <Text style={styles.backButtonText}>‹ Accueil</Text>
          </Pressable>
        </View>

        <View style={styles.multiWrapper}>
          <View
            style={styles.multiScreen}
            collapsable={false}
            onLayout={handlePadLayout}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => false}
            onResponderTerminationRequest={() => false}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            <PlayerZone
              playerKey="top"
              phase={phase}
              started={started.top}
              opponentReady={started.bottom}
              pressed={pressed.top}
              fouled={fouls.top}
              score={scores.top}
              winners={winners}
            />
            <View style={styles.zoneDivider} pointerEvents="none" />
            <PlayerZone
              playerKey="bottom"
              phase={phase}
              started={started.bottom}
              opponentReady={started.top}
              pressed={pressed.bottom}
              fouled={fouls.bottom}
              score={scores.bottom}
              winners={winners}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function SoloGame({ onBack }) {
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
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
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
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
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
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            onPress={onBack}
          >
            <Text style={styles.backButtonText}>‹ Accueil</Text>
          </Pressable>
          {showStats && (
            <View style={styles.bestBadge}>
              <Text style={styles.bestLabel}>Record</Text>
              <Text style={styles.bestValue}>{bestScore} ms</Text>
            </View>
          )}
        </View>

        <Animated.View
          style={[styles.gameWrapper, { transform: [{ scale: pulseAnim }] }]}
        >
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
              {subtitle ? (
                <Text style={styles.subtitle}>{subtitle}</Text>
              ) : null}
            </Animated.View>
          </Pressable>
        </Animated.View>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.resetButton,
              pressed && styles.resetButtonPressed,
            ]}
            onPress={handleResetClick}
          >
            <Text style={styles.resetButtonText}>Réinitialiser</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

export default function App() {
  const [screen, setScreen] = useState("home");

  if (screen === "home") {
    return (
      <HomeScreen
        onSelectSolo={() => setScreen("solo")}
        onSelectMulti={() => setScreen("multi")}
      />
    );
  }

  if (screen === "multi") {
    return <MultiGame onBack={() => setScreen("home")} />;
  }

  return <SoloGame onBack={() => setScreen("home")} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  safeArea: {
    flex: 1,
  },
  homeContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  logo: {
    fontSize: 56,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -2,
    lineHeight: 60,
  },
  logoSub: {
    fontSize: 28,
    fontWeight: "300",
    color: COLORS.accent,
    letterSpacing: 8,
    textTransform: "uppercase",
    marginTop: -4,
  },
  homeTagline: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 56,
  },
  modesContainer: {
    gap: 16,
  },
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeCardPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    transform: [{ scale: 0.98 }],
  },
  modeCardDisabled: {
    opacity: 0.45,
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.accentMuted,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.25)",
  },
  modeIconBottom: {
    backgroundColor: COLORS.accentBottomMuted,
    borderColor: "rgba(167, 139, 250, 0.25)",
  },
  modeIconDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: COLORS.border,
  },
  modeIconText: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.accent,
  },
  modeIconTextBottom: {
    color: COLORS.accentBottom,
  },
  modeIconTextDisabled: {
    color: COLORS.textDim,
  },
  modeInfo: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  modeTitleDisabled: {
    color: COLORS.textMuted,
  },
  modeDescription: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  modeDescriptionDisabled: {
    fontSize: 14,
    color: COLORS.textDim,
    lineHeight: 20,
  },
  modeArrow: {
    fontSize: 28,
    fontWeight: "300",
    color: COLORS.textMuted,
    marginLeft: 8,
  },
  comingSoonBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textDim,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    paddingVertical: 6,
    paddingRight: 12,
  },
  backButtonPressed: {
    opacity: 0.6,
  },
  backButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.accent,
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
  multiWrapper: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  multiScreen: {
    flex: 1,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  playerZone: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  playerZonePressed: {
    opacity: 0.92,
  },
  playerZoneWinner: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  playerZoneTie: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  winOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(34, 197, 94, 0.12)",
  },
  loseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  tieOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  readyOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  nudgeOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderRadius: 0,
  },
  clickedOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  readyBadge: {
    position: "absolute",
    top: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  readyBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  outcomeBadge: {
    position: "absolute",
    top: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  outcomeBadgeWin: {
    backgroundColor: "rgba(34, 197, 94, 0.18)",
    borderColor: "rgba(34, 197, 94, 0.45)",
  },
  outcomeBadgeLose: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  outcomeBadgeTie: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  outcomeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  outcomeBadgeTextWin: {
    color: "#4ade80",
  },
  outcomeBadgeTextLose: {
    color: "rgba(248, 113, 113, 0.85)",
  },
  outcomeBadgeTextTie: {
    color: COLORS.textMuted,
  },
  playerZoneContent: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  playerZoneInverted: {
    transform: [{ rotate: "180deg" }],
  },
  zoneDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  zoneMainText: {
    fontSize: 24,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  zoneMainTextGo: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 2,
  },
  zoneMainTextResult: {
    fontSize: 64,
    fontWeight: "800",
    letterSpacing: -2,
    lineHeight: 72,
  },
  zoneMainTextFoul: {
    fontSize: 28,
    fontWeight: "700",
  },
  zoneMainTextReady: {
    fontSize: 32,
    fontWeight: "800",
  },
  zoneMainTextNudged: {
    fontSize: 28,
    fontWeight: "700",
  },
  zoneSubtitle: {
    fontSize: 15,
    fontWeight: "400",
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 8,
  },
  zoneHint: {
    fontSize: 14,
    fontWeight: "400",
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 20,
    lineHeight: 20,
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
