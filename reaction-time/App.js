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
import {
  PHASE,
  createPlayerArray,
  getPartyLayout,
  getPartyZoneOrientation,
  getPlayerIndexFromTouch,
  computePartyRankings,
} from "./gameLogic";

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

const PARTY_PLAYER_COLORS = [
  { accent: "#6366f1", accentMuted: "rgba(99, 102, 241, 0.15)", accentBorder: "rgba(99, 102, 241, 0.5)" },
  { accent: "#a78bfa", accentMuted: "rgba(167, 139, 250, 0.15)", accentBorder: "rgba(167, 139, 250, 0.5)" },
  { accent: "#f472b6", accentMuted: "rgba(244, 114, 182, 0.15)", accentBorder: "rgba(244, 114, 182, 0.5)" },
  { accent: "#fbbf24", accentMuted: "rgba(251, 191, 36, 0.15)", accentBorder: "rgba(251, 191, 36, 0.5)" },
  { accent: "#22d3ee", accentMuted: "rgba(34, 211, 238, 0.15)", accentBorder: "rgba(34, 211, 238, 0.5)" },
  { accent: "#34d399", accentMuted: "rgba(52, 211, 153, 0.15)", accentBorder: "rgba(34, 197, 94, 0.5)" },
  { accent: "#fb923c", accentMuted: "rgba(251, 146, 60, 0.15)", accentBorder: "rgba(251, 146, 60, 0.5)" },
  { accent: "#60a5fa", accentMuted: "rgba(96, 165, 250, 0.15)", accentBorder: "rgba(96, 165, 250, 0.5)" },
  { accent: "#a3e635", accentMuted: "rgba(163, 230, 53, 0.15)", accentBorder: "rgba(163, 230, 53, 0.5)" },
  { accent: "#e879f9", accentMuted: "rgba(232, 121, 249, 0.15)", accentBorder: "rgba(232, 121, 249, 0.5)" },
];

const MIN_PLAYERS = 1;
const MAX_PLAYERS = 5;
const DEFAULT_PLAYERS = 2;

function getPlayerCountSubtitle(count) {
  if (count === 1) return "Mesurez votre temps de réaction";
  if (count === 2) return "Appuyez chacun pour lancer";
  return "Placez-vous autour de l'écran, chacun sur sa zone numérotée.";
}

function formatRank(rank) {
  if (rank === 1) return "1er";
  return `${rank}e`;
}

function HomeScreen({ onSelectPlay }) {
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
              onPress={onSelectPlay}
            >
              <View style={styles.modeIcon}>
                <Text style={styles.modeIconText}>▶</Text>
              </View>
              <View style={styles.modeInfo}>
                <Text style={styles.modeTitle}>Jouer</Text>
                <Text style={styles.modeDescription}>
                  Choisissez le nombre de joueurs
                </Text>
              </View>
              <Text style={styles.modeArrow}>›</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function PlayerCountScreen({ onBack, onStart }) {
  const [playerCount, setPlayerCount] = useState(DEFAULT_PLAYERS);
  const layout = getPartyLayout(playerCount);

  const decrease = () =>
    setPlayerCount((count) => Math.max(MIN_PLAYERS, count - 1));
  const increase = () =>
    setPlayerCount((count) => Math.min(MAX_PLAYERS, count + 1));

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
        </View>

        <View style={styles.partySetupContent}>
          <Text style={styles.partySetupTitle}>Combien de joueurs ?</Text>
          <Text style={styles.partySetupSubtitle}>
            {getPlayerCountSubtitle(playerCount)}
          </Text>

          <View style={styles.partyStepper}>
            <Pressable
              style={({ pressed }) => [
                styles.partyStepperButton,
                playerCount <= MIN_PLAYERS && styles.partyStepperButtonDisabled,
                pressed && playerCount > MIN_PLAYERS && styles.partyStepperButtonPressed,
              ]}
              onPress={decrease}
              disabled={playerCount <= MIN_PLAYERS}
            >
              <Text style={styles.partyStepperButtonText}>−</Text>
            </Pressable>

            <View style={styles.partyStepperValue}>
              <Text style={styles.partyStepperNumber}>{playerCount}</Text>
              <Text style={styles.partyStepperLabel}>
                joueur{playerCount > 1 ? "s" : ""}
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.partyStepperButton,
                playerCount >= MAX_PLAYERS && styles.partyStepperButtonDisabled,
                pressed && playerCount < MAX_PLAYERS && styles.partyStepperButtonPressed,
              ]}
              onPress={increase}
              disabled={playerCount >= MAX_PLAYERS}
            >
              <Text style={styles.partyStepperButtonText}>+</Text>
            </Pressable>
          </View>

          <View style={styles.partyPreview}>
            {layout.rows.map((row, rowIndex) => (
              <View key={`preview-row-${rowIndex}`} style={styles.partyPreviewRow}>
                {row.map((playerIndex, colIndex) => {
                  const color = PARTY_PLAYER_COLORS[playerIndex];
                  const orientation = getPartyZoneOrientation(
                    rowIndex,
                    colIndex,
                    layout
                  );
                  return (
                    <View
                      key={`preview-${playerIndex}`}
                      style={[
                        styles.partyPreviewCell,
                        {
                          backgroundColor: color.accentMuted,
                          borderColor: color.accentBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.partyPreviewCellText,
                          { color: color.accent },
                          orientation === "top" && styles.partyZoneOrientationTop,
                          orientation === "left" && styles.partyZoneOrientationLeft,
                          orientation === "right" && styles.partyZoneOrientationRight,
                        ]}
                      >
                        {playerIndex + 1}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.partyStartButton,
              pressed && styles.partyStartButtonPressed,
            ]}
            onPress={() => onStart(playerCount)}
          >
            <Text style={styles.partyStartButtonText}>Commencer</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function getPartyZoneMessage(
  phase,
  fouled,
  score,
  started,
  readyCount,
  playerCount,
  rank,
  compact
) {
  const isLobby = phase === PHASE.IDLE || phase === PHASE.RESULT;
  const othersReady = readyCount > 0 && readyCount < playerCount;

  if (isLobby && started) {
    return {
      main: compact ? null : "Prêt",
      subtitle: othersReady ? null : compact ? null : "En attente…",
    };
  }
  if (isLobby && othersReady && !started) {
    return {
      main: compact ? null : "À vous",
      subtitle: compact ? null : `${readyCount}/${playerCount} prêts`,
    };
  }
  if (phase === PHASE.RESULT && !started) {
    if (fouled) {
      return {
        main: compact ? "Trop tôt" : "Trop tôt !",
        subtitle: rank !== null ? formatRank(rank) : compact ? null : "Rappuyez pour rejouer",
        hint: rank === null && !compact ? "Rappuyez pour rejouer" : null,
        rankLabel: rank !== null ? formatRank(rank) : null,
      };
    }
    if (score !== null && rank !== null) {
      return {
        main: compact ? `${score}` : `${score}`,
        subtitle: compact ? formatRank(rank) : "millisecondes",
        hint: compact ? null : "Rappuyez pour rejouer",
        rankLabel: formatRank(rank),
      };
    }
    return {
      main: compact ? "—" : "—",
      subtitle: compact ? null : "Rappuyez pour rejouer",
    };
  }
  if (fouled) {
    return { main: compact ? "Trop tôt" : "Trop tôt !", subtitle: null };
  }
  if (phase === PHASE.GO && score !== null) {
    return {
      main: `${score}`,
      subtitle: compact ? "ms" : "millisecondes",
      hint: compact ? null : "En attente…",
    };
  }
  if (phase === PHASE.GO) {
    return { main: compact ? "Go !" : "CLIQUEZ !", subtitle: null };
  }
  if (phase === PHASE.WAITING) {
    return { main: compact ? "Attendez" : "Attendez…", subtitle: null };
  }
  return {
    main: compact ? "Tap" : "Appuyez",
    subtitle: compact ? null : "pour commencer",
  };
}

function PartyPlayerZone({
  playerIndex,
  phase,
  started,
  readyCount,
  playerCount,
  pressed,
  fouled,
  score,
  rank,
  orientation,
  compact,
}) {
  const config = PARTY_PLAYER_COLORS[playerIndex];
  const isLobby = phase === PHASE.IDLE || phase === PHASE.RESULT;
  const isReady = isLobby && started;
  const othersReady = readyCount > 0;
  const isNudged = isLobby && !started && othersReady;
  const isWinner = phase === PHASE.RESULT && !started && rank === 1 && !fouled && score !== null;
  const { main, subtitle, hint, rankLabel } = getPartyZoneMessage(
    phase,
    fouled,
    score,
    started,
    readyCount,
    playerCount,
    rank,
    compact
  );
  const isResult =
    phase === PHASE.RESULT &&
    !started &&
    (fouled || (score !== null && rank !== null));
  const isGo = phase === PHASE.GO && !fouled && score === null;
  const isClicked = phase === PHASE.GO && !fouled && score !== null;
  const showFoulStyle = fouled;
  const showAccentBorder = isReady || isNudged || isClicked || isWinner;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const readyPulse = useRef(new Animated.Value(1)).current;
  const readyLoop = useRef(null);

  useEffect(() => {
    if (isWinner) {
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
  }, [isWinner, scaleAnim]);

  useEffect(() => {
    if (isReady) {
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
  }, [isReady, readyPulse]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.partyPlayerZone,
        {
          backgroundColor: getZoneBackground(phase, fouled, started, score),
          borderColor: isWinner
            ? "rgba(34, 197, 94, 0.55)"
            : showAccentBorder
              ? config.accentBorder
              : COLORS.border,
          borderWidth: isWinner || showAccentBorder ? 2 : 1,
          transform: [{ scale: scaleAnim }],
        },
        isWinner && styles.playerZoneWinner,
        isWinner && { shadowColor: COLORS.go },
        pressed &&
          (phase === PHASE.WAITING || phase === PHASE.GO) &&
          styles.playerZonePressed,
      ]}
    >
      {isWinner ? <View style={styles.winOverlay} /> : null}
      {phase === PHASE.RESULT && !started && rank !== null && rank > 1 && !fouled ? (
        <View style={styles.loseOverlay} />
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
        <View style={[styles.nudgeOverlay, { borderColor: config.accentBorder }]} />
      ) : null}
      {isClicked ? (
        <View style={[styles.clickedOverlay, { backgroundColor: config.accentMuted }]} />
      ) : null}
      <View
        style={[
          styles.partyPlayerZoneContent,
          orientation === "top" && styles.partyZoneOrientationTop,
          orientation === "left" && styles.partyZoneOrientationLeft,
          orientation === "right" && styles.partyZoneOrientationRight,
          compact && styles.partyPlayerZoneContentCompact,
        ]}
      >
        {isReady ? (
          <Text style={[styles.partyReadyText, { color: config.accent }]}>
            {compact ? "✓" : "✓ Prêt"}
          </Text>
        ) : null}

        {isResult && rankLabel ? (
          <Text
            style={[
              styles.partyRankLabel,
              compact && styles.partyRankLabelCompact,
              isWinner && styles.partyRankLabelWinner,
            ]}
          >
            {rankLabel}
          </Text>
        ) : null}

        {main ? (
          <Text
            style={[
              compact ? styles.partyZoneMainTextCompact : styles.zoneMainText,
              isGo && !compact && styles.zoneMainTextGo,
              isResult && !compact && styles.zoneMainTextResult,
              isResult && compact && styles.partyZoneResultCompact,
              showFoulStyle && (compact ? styles.partyZoneFoulCompact : styles.zoneMainTextFoul),
              isReady && !compact && [styles.zoneMainTextReady, { color: config.accent }],
              isNudged && !compact && styles.zoneMainTextNudged,
            ]}
          >
            {main}
          </Text>
        ) : null}
        {subtitle ? (
          <Text
            style={[
              compact ? styles.partyZoneSubtitleCompact : styles.zoneSubtitle,
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
        {hint ? <Text style={styles.zoneHint}>{hint}</Text> : null}
      </View>
    </Animated.View>
  );
}

function getChangedTouches(event) {
  return event.nativeEvent.changedTouches ?? [];
}

function getActiveTouches(event) {
  return event.nativeEvent.touches ?? [];
}

function isKnownPlayer(player) {
  return player !== null && player !== undefined && player !== -1;
}

function mapHasPlayer(map, player) {
  for (const assigned of map.values()) {
    if (assigned === player) return true;
  }
  return false;
}

// A finger held still can be re-issued by the OS with a new identifier, so a
// zone keeps its player assignment for as long as any finger stays on it.
function collectStickyTouches(event, previousTouches, getTouchPlayer, dropChanged) {
  const nextTouches = new Map();
  const endedIds = dropChanged
    ? new Set(Array.from(getChangedTouches(event), (touch) => touch.identifier))
    : null;

  for (const touch of getActiveTouches(event)) {
    if (endedIds && endedIds.has(touch.identifier)) continue;
    const tracked = previousTouches.get(touch.identifier);
    const player = tracked !== undefined ? tracked : getTouchPlayer(touch);
    if (!isKnownPlayer(player)) continue;
    nextTouches.set(touch.identifier, player);
  }

  return nextTouches;
}

// While fingers rest on screen the OS sometimes emits a spurious end/start
// burst for a finger that never left. During GO a lift must be acted on
// instantly because it is the measurement, so only the foul phase waits for the
// zone to stay empty before committing.
const FOUL_CONFIRM_MS = 120;

function usePadTouchTracking({
  phaseRef,
  getTouchPlayer,
  createArmedState,
  onPress,
  onVisualUpdate,
}) {
  const activeTouchesRef = useRef(new Map());
  const armedRef = useRef(createArmedState());
  const pendingReleasesRef = useRef(new Map());
  const releaseTimersRef = useRef(new Set());

  const isHoldPhase = useCallback(
    () => phaseRef.current === PHASE.WAITING || phaseRef.current === PHASE.GO,
    [phaseRef]
  );

  const publishVisual = useCallback(() => {
    onVisualUpdate(activeTouchesRef.current, armedRef.current);
  }, [onVisualUpdate]);

  const cancelPendingReleases = useCallback(() => {
    for (const timer of releaseTimersRef.current) {
      clearTimeout(timer);
    }
    releaseTimersRef.current.clear();
    pendingReleasesRef.current.clear();
  }, []);

  const resetTracking = useCallback(() => {
    cancelPendingReleases();
    activeTouchesRef.current = new Map();
    armedRef.current = createArmedState();
    publishVisual();
  }, [cancelPendingReleases, createArmedState, publishVisual]);

  const applyTouchSnapshot = useCallback(
    (event, dropChanged) => {
      activeTouchesRef.current = collectStickyTouches(
        event,
        activeTouchesRef.current,
        getTouchPlayer,
        dropChanged
      );

      const holding = isHoldPhase();
      for (const player of activeTouchesRef.current.values()) {
        if (holding) armedRef.current[player] = true;
        pendingReleasesRef.current.delete(player);
      }
    },
    [getTouchPlayer, isHoldPhase]
  );

  const applyRelease = useCallback(
    (player, releasedAt) => {
      armedRef.current[player] = false;
      onPress(player, releasedAt);
    },
    [onPress]
  );

  const confirmFoul = useCallback(
    (player, releasedAt) => {
      if (pendingReleasesRef.current.get(player) !== releasedAt) return;
      pendingReleasesRef.current.delete(player);
      if (mapHasPlayer(activeTouchesRef.current, player)) return;

      applyRelease(player, releasedAt);
      publishVisual();
    },
    [applyRelease, publishVisual]
  );

  const scheduleFoul = useCallback(
    (player, releasedAt) => {
      pendingReleasesRef.current.set(player, releasedAt);
      const timer = setTimeout(() => {
        releaseTimersRef.current.delete(timer);
        confirmFoul(player, releasedAt);
      }, FOUL_CONFIRM_MS);
      releaseTimersRef.current.add(timer);
    },
    [confirmFoul]
  );

  const handlePadTouchStart = useCallback(
    (event) => {
      applyTouchSnapshot(event, false);
      publishVisual();
    },
    [applyTouchSnapshot, publishVisual]
  );

  const handlePadTouchMove = useCallback(
    (event) => {
      applyTouchSnapshot(event, false);
      publishVisual();
    },
    [applyTouchSnapshot, publishVisual]
  );

  const handlePadTouchRelease = useCallback(
    (event, shouldPress) => {
      const releasedAt = Date.now();
      const isWaiting = phaseRef.current === PHASE.WAITING;
      const endedPlayers = new Set();

      for (const touch of getChangedTouches(event)) {
        const tracked = activeTouchesRef.current.get(touch.identifier);
        const player = tracked !== undefined ? tracked : getTouchPlayer(touch);
        if (isKnownPlayer(player)) endedPlayers.add(player);
      }

      applyTouchSnapshot(event, true);

      if (shouldPress) {
        for (const player of endedPlayers) {
          if (mapHasPlayer(activeTouchesRef.current, player)) continue;

          if (isWaiting) {
            scheduleFoul(player, releasedAt);
          } else {
            applyRelease(player, releasedAt);
          }
        }
      }

      publishVisual();
    },
    [
      applyRelease,
      applyTouchSnapshot,
      getTouchPlayer,
      phaseRef,
      publishVisual,
      scheduleFoul,
    ]
  );

  useEffect(() => cancelPendingReleases, [cancelPendingReleases]);

  return {
    handlePadTouchStart,
    handlePadTouchMove,
    handlePadTouchRelease,
    resetTracking,
  };
}

function PartyGame({ playerCount, onBack }) {
  const layout = getPartyLayout(playerCount);
  const compact = playerCount > 4;

  const [phase, setPhase] = useState(PHASE.IDLE);
  const [started, setStarted] = useState(() => createPlayerArray(playerCount, false));
  const [pressed, setPressed] = useState(() => createPlayerArray(playerCount, false));
  const [scores, setScores] = useState(() => createPlayerArray(playerCount, null));
  const [fouls, setFouls] = useState(() => createPlayerArray(playerCount, false));
  const [rankings, setRankings] = useState(() => createPlayerArray(playerCount, null));

  const phaseRef = useRef(PHASE.IDLE);
  const startedRef = useRef(createPlayerArray(playerCount, false));
  const scoresRef = useRef(createPlayerArray(playerCount, null));
  const foulsRef = useRef(createPlayerArray(playerCount, false));
  const goTimestampRef = useRef(null);
  const goTimeoutRef = useRef(null);
  const padSizeRef = useRef({ width: 0, height: 0 });
  const pressHandlerRef = useRef(() => {});

  const readyCount = started.filter(Boolean).length;

  const clearTimers = useCallback(() => {
    clearTimeout(goTimeoutRef.current);
    goTimeoutRef.current = null;
  }, []);

  const resetLobby = useCallback(() => {
    const next = createPlayerArray(playerCount, false);
    startedRef.current = next;
    setStarted(next);
  }, [playerCount]);

  const createArmedState = useCallback(
    () => createPlayerArray(playerCount, false),
    [playerCount]
  );

  const updatePressedVisual = useCallback(
    (activeTouches, armed) => {
      const next = createPlayerArray(playerCount, false);
      const currentPhase = phaseRef.current;

      if (currentPhase === PHASE.WAITING || currentPhase === PHASE.GO) {
        for (let i = 0; i < playerCount; i++) {
          next[i] = armed[i];
        }
      } else {
        for (const playerIndex of activeTouches.values()) {
          next[playerIndex] = true;
        }
      }

      setPressed(next);
    },
    [playerCount]
  );

  const getTouchPlayerIndex = useCallback(
    (touch) => {
      const { width, height } = padSizeRef.current;
      if (width === 0 || height === 0) return -1;
      return getPlayerIndexFromTouch(
        touch.locationX,
        touch.locationY,
        width,
        height,
        layout
      );
    },
    [layout]
  );

  const notifyPress = useCallback((playerIndex, releasedAt) => {
    pressHandlerRef.current(playerIndex, releasedAt);
  }, []);

  const {
    handlePadTouchStart,
    handlePadTouchMove,
    handlePadTouchRelease,
    resetTracking,
  } = usePadTouchTracking({
    phaseRef,
    getTouchPlayer: getTouchPlayerIndex,
    createArmedState,
    onPress: notifyPress,
    onVisualUpdate: updatePressedVisual,
  });

  const updatePhase = useCallback((nextPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const allPlayersReady = useCallback((readyState) => {
    return readyState.every(Boolean);
  }, []);

  const allPlayersDone = useCallback((currentScores, currentFouls) => {
    for (let i = 0; i < playerCount; i++) {
      if (!currentFouls[i] && currentScores[i] === null) return false;
    }
    return true;
  }, [playerCount]);

  const tryFinishRound = useCallback(() => {
    const currentScores = scoresRef.current;
    const currentFouls = foulsRef.current;
    if (
      phaseRef.current !== PHASE.WAITING &&
      phaseRef.current !== PHASE.GO
    ) {
      return;
    }
    if (allPlayersDone(currentScores, currentFouls)) {
      updatePhase(PHASE.RESULT);
      setRankings(computePartyRankings(currentScores, currentFouls, playerCount));
      resetLobby();
    }
  }, [allPlayersDone, playerCount, resetLobby, updatePhase]);

  const beginWaiting = useCallback(() => {
    if (phaseRef.current !== PHASE.IDLE && phaseRef.current !== PHASE.RESULT) {
      return;
    }
    clearTimers();
    goTimestampRef.current = null;
    scoresRef.current = createPlayerArray(playerCount, null);
    foulsRef.current = createPlayerArray(playerCount, false);
    startedRef.current = createPlayerArray(playerCount, false);
    setScores(createPlayerArray(playerCount, null));
    setFouls(createPlayerArray(playerCount, false));
    setStarted(createPlayerArray(playerCount, false));
    setRankings(createPlayerArray(playerCount, null));
    resetTracking();
    updatePhase(PHASE.WAITING);

    const randomDelay = (Math.floor(Math.random() * 7) + 4) * 1000;
    goTimeoutRef.current = setTimeout(() => {
      if (phaseRef.current !== PHASE.WAITING) return;
      goTimestampRef.current = Date.now();
      updatePhase(PHASE.GO);
    }, randomDelay);
  }, [clearTimers, playerCount, resetTracking, updatePhase]);

  const recordFoul = useCallback(
    (playerIndex) => {
      if (foulsRef.current[playerIndex] || scoresRef.current[playerIndex] !== null) {
        return;
      }
      const nextFouls = [...foulsRef.current];
      nextFouls[playerIndex] = true;
      foulsRef.current = nextFouls;
      setFouls(nextFouls);
      tryFinishRound();
    },
    [tryFinishRound]
  );

  const recordScore = useCallback(
    (playerIndex, releasedAt) => {
      if (
        !goTimestampRef.current ||
        foulsRef.current[playerIndex] ||
        scoresRef.current[playerIndex] !== null
      ) {
        return;
      }
      const reactionTime = releasedAt - goTimestampRef.current;
      const nextScores = [...scoresRef.current];
      nextScores[playerIndex] = reactionTime;
      scoresRef.current = nextScores;
      setScores(nextScores);
      tryFinishRound();
    },
    [tryFinishRound]
  );

  const handleLobbyPresses = useCallback(
    (playerIndices) => {
      if (phaseRef.current !== PHASE.IDLE && phaseRef.current !== PHASE.RESULT) {
        return;
      }

      const nextStarted = [...startedRef.current];
      const nextFouls = [...foulsRef.current];
      const nextScores = [...scoresRef.current];
      let changed = false;

      for (const playerIndex of playerIndices) {
        if (nextStarted[playerIndex]) continue;
        nextStarted[playerIndex] = true;
        nextFouls[playerIndex] = false;
        nextScores[playerIndex] = null;
        changed = true;
      }

      if (!changed) return;

      foulsRef.current = nextFouls;
      scoresRef.current = nextScores;
      startedRef.current = nextStarted;
      setFouls(nextFouls);
      setScores(nextScores);
      setRankings(createPlayerArray(playerCount, null));
      setStarted(nextStarted);

      if (allPlayersReady(nextStarted)) {
        beginWaiting();
      }
    },
    [allPlayersReady, beginWaiting, playerCount]
  );

  const handlePlayerPress = useCallback(
    (playerIndex, releasedAt) => {
      const currentPhase = phaseRef.current;

      if (currentPhase === PHASE.IDLE || currentPhase === PHASE.RESULT) {
        handleLobbyPresses([playerIndex]);
        return;
      }

      if (currentPhase === PHASE.WAITING) {
        recordFoul(playerIndex);
        return;
      }

      if (currentPhase === PHASE.GO) {
        // The lift may predate GO when it is confirmed just after the switch.
        if (goTimestampRef.current && releasedAt < goTimestampRef.current) {
          recordFoul(playerIndex);
          return;
        }
        recordScore(playerIndex, releasedAt);
      }
    },
    [handleLobbyPresses, recordFoul, recordScore]
  );

  pressHandlerRef.current = handlePlayerPress;

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
          <View style={styles.partyHeaderBadge}>
            <Text style={styles.partyHeaderBadgeText}>{playerCount} joueurs</Text>
          </View>
        </View>

        <View style={styles.multiWrapper}>
          <View
            style={styles.multiScreen}
            collapsable={false}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              padSizeRef.current = { width, height };
            }}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => false}
            onResponderTerminationRequest={() => false}
            onTouchStart={handlePadTouchStart}
            onTouchMove={handlePadTouchMove}
            onTouchEnd={(event) => handlePadTouchRelease(event, true)}
            onTouchCancel={(event) => handlePadTouchRelease(event, false)}
          >
            {layout.rows.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.partyRow} pointerEvents="none">
                {row.map((playerIndex, colIndex) => (
                  <View
                    key={`zone-${playerIndex}`}
                    style={styles.partyCell}
                    collapsable={false}
                    pointerEvents="none"
                  >
                    <PartyPlayerZone
                      playerIndex={playerIndex}
                      phase={phase}
                      started={started[playerIndex]}
                      readyCount={readyCount}
                      playerCount={playerCount}
                      pressed={pressed[playerIndex]}
                      fouled={fouls[playerIndex]}
                      score={scores[playerIndex]}
                      rank={rankings[playerIndex]}
                      orientation={getPartyZoneOrientation(
                        rowIndex,
                        colIndex,
                        layout
                      )}
                      compact={compact}
                    />
                  </View>
                ))}
              </View>
            ))}

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
  if (phase === PHASE.WAITING) {
    return { main: "Attendez…", subtitle: "Ne cliquez pas trop tôt" };
  }
  return {
    main: "Appuyez pour commencer",
    subtitle: "Testez votre temps de réaction",
  };
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
            styles.mainText,
            styles.duoMainText,
            isGo && styles.mainTextGo,
            (isResult || isClicked) && styles.mainTextResult,
            isReady && { fontSize: 32, fontWeight: "800", color: config.accent },
            isNudged && styles.duoMainTextNudged,
          ]}
        >
          {main}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, styles.duoMainText]}>{subtitle}</Text>
        ) : null}
        {hint ? <Text style={[styles.subtitle, styles.duoHint]}>{hint}</Text> : null}
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
  const padSizeRef = useRef({ width: 0, height: 0 });
  const pressHandlerRef = useRef(() => {});

  const clearTimers = useCallback(() => {
    clearTimeout(goTimeoutRef.current);
    goTimeoutRef.current = null;
  }, []);

  const resetLobby = useCallback(() => {
    startedRef.current = { top: false, bottom: false };
    setStarted({ top: false, bottom: false });
  }, []);

  const createArmedState = useCallback(
    () => ({ top: false, bottom: false }),
    []
  );

  const updatePressedVisual = useCallback((activeTouches, armed) => {
    const currentPhase = phaseRef.current;
    const next = { top: false, bottom: false };

    if (currentPhase === PHASE.WAITING || currentPhase === PHASE.GO) {
      next.top = armed.top;
      next.bottom = armed.bottom;
    } else {
      for (const playerKey of activeTouches.values()) {
        next[playerKey] = true;
      }
    }

    setPressed(next);
  }, []);

  const getTouchPlayerKey = useCallback((touch) => {
    const { height } = padSizeRef.current;
    if (height === 0) return null;
    return touch.locationY < height / 2 ? "top" : "bottom";
  }, []);

  const notifyPress = useCallback((playerKey, releasedAt) => {
    pressHandlerRef.current(playerKey, releasedAt);
  }, []);

  const {
    handlePadTouchStart,
    handlePadTouchMove,
    handlePadTouchRelease,
    resetTracking,
  } = usePadTouchTracking({
    phaseRef,
    getTouchPlayer: getTouchPlayerKey,
    createArmedState,
    onPress: notifyPress,
    onVisualUpdate: updatePressedVisual,
  });

  const updatePhase = useCallback((nextPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

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
    if (
      phaseRef.current !== PHASE.WAITING &&
      phaseRef.current !== PHASE.GO
    ) {
      return;
    }
    if (topDone && bottomDone) {
      updatePhase(PHASE.RESULT);
      setWinners(computeWinners(currentScores, currentFouls));
      resetLobby();
    }
  }, [computeWinners, resetLobby, updatePhase]);

  const beginWaiting = useCallback(() => {
    if (phaseRef.current !== PHASE.IDLE && phaseRef.current !== PHASE.RESULT) {
      return;
    }
    clearTimers();
    goTimestampRef.current = null;
    scoresRef.current = { top: null, bottom: null };
    foulsRef.current = { top: false, bottom: false };
    startedRef.current = { top: false, bottom: false };
    setScores({ top: null, bottom: null });
    setFouls({ top: false, bottom: false });
    setStarted({ top: false, bottom: false });
    setWinners({ top: false, bottom: false });
    resetTracking();
    updatePhase(PHASE.WAITING);

    const randomDelay = (Math.floor(Math.random() * 7) + 4) * 1000;
    goTimeoutRef.current = setTimeout(() => {
      if (phaseRef.current !== PHASE.WAITING) return;
      goTimestampRef.current = Date.now();
      updatePhase(PHASE.GO);
    }, randomDelay);
  }, [clearTimers, resetTracking, updatePhase]);

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
    (playerKey, releasedAt) => {
      if (
        !goTimestampRef.current ||
        foulsRef.current[playerKey] ||
        scoresRef.current[playerKey] !== null
      ) {
        return;
      }
      const reactionTime = releasedAt - goTimestampRef.current;
      scoresRef.current = { ...scoresRef.current, [playerKey]: reactionTime };
      setScores({ ...scoresRef.current });
      tryFinishRound();
    },
    [tryFinishRound]
  );

  const handleLobbyPresses = useCallback(
    (playerKeys) => {
      if (phaseRef.current !== PHASE.IDLE && phaseRef.current !== PHASE.RESULT) {
        return;
      }

      const nextStarted = { ...startedRef.current };
      let changed = false;

      for (const playerKey of playerKeys) {
        if (nextStarted[playerKey]) continue;
        nextStarted[playerKey] = true;
        foulsRef.current = { ...foulsRef.current, [playerKey]: false };
        scoresRef.current = { ...scoresRef.current, [playerKey]: null };
        changed = true;
      }

      if (!changed) return;

      setFouls({ ...foulsRef.current });
      setScores({ ...scoresRef.current });
      setWinners({ top: false, bottom: false });
      startedRef.current = nextStarted;
      setStarted(nextStarted);

      if (nextStarted.top && nextStarted.bottom) {
        beginWaiting();
      }
    },
    [beginWaiting]
  );

  const handlePlayerPress = useCallback(
    (playerKey, releasedAt) => {
      const currentPhase = phaseRef.current;

      if (currentPhase === PHASE.IDLE || currentPhase === PHASE.RESULT) {
        handleLobbyPresses([playerKey]);
        return;
      }

      if (currentPhase === PHASE.WAITING) {
        recordFoul(playerKey);
        return;
      }

      if (currentPhase === PHASE.GO) {
        if (goTimestampRef.current && releasedAt < goTimestampRef.current) {
          recordFoul(playerKey);
          return;
        }
        recordScore(playerKey, releasedAt);
      }
    },
    [handleLobbyPresses, recordFoul, recordScore]
  );

  pressHandlerRef.current = handlePlayerPress;

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
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              padSizeRef.current = { width, height };
            }}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => false}
            onResponderTerminationRequest={() => false}
            onTouchStart={handlePadTouchStart}
            onTouchMove={handlePadTouchMove}
            onTouchEnd={(event) => handlePadTouchRelease(event, true)}
            onTouchCancel={(event) => handlePadTouchRelease(event, false)}
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
  const [tooEarly, setTooEarly] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);

  const getBgColor = () => {
    if (tooEarly) return COLORS.foul;
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
      setTooEarly(false);
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
      setTooEarly(false);
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
      setTooEarly(true);
      setMessage("Trop tôt !");
      setSubtitle("Réessayez");
    }
  };

  const handleResetClick = () => {
    setTooEarly(false);
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
  const [partyPlayerCount, setPartyPlayerCount] = useState(DEFAULT_PLAYERS);

  if (screen === "home") {
    return <HomeScreen onSelectPlay={() => setScreen("player-setup")} />;
  }

  if (screen === "player-setup") {
    return (
      <PlayerCountScreen
        onBack={() => setScreen("home")}
        onStart={(count) => {
          if (count === 1) setScreen("solo");
          else if (count === 2) setScreen("multi");
          else {
            setPartyPlayerCount(count);
            setScreen("party");
          }
        }}
      />
    );
  }

  if (screen === "party") {
    return (
      <PartyGame
        key={partyPlayerCount}
        playerCount={partyPlayerCount}
        onBack={() => setScreen("player-setup")}
      />
    );
  }

  if (screen === "multi") {
    return <MultiGame onBack={() => setScreen("player-setup")} />;
  }

  return <SoloGame onBack={() => setScreen("player-setup")} />;
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
  modeIconParty: {
    backgroundColor: "rgba(34, 211, 238, 0.15)",
    borderColor: "rgba(34, 211, 238, 0.25)",
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
  modeIconTextParty: {
    color: "#22d3ee",
    fontSize: 16,
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
    alignSelf: "stretch",
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
  duoMainText: {
    width: "100%",
  },
  duoMainTextNudged: {
    fontSize: 28,
    fontWeight: "700",
  },
  duoHint: {
    marginTop: 20,
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
  partySetupContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    justifyContent: "center",
  },
  partySetupTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 8,
  },
  partySetupSubtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 40,
  },
  partyStepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginBottom: 32,
  },
  partyStepperButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  partyStepperButtonPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    transform: [{ scale: 0.96 }],
  },
  partyStepperButtonDisabled: {
    opacity: 0.35,
  },
  partyStepperButtonText: {
    fontSize: 28,
    fontWeight: "300",
    color: COLORS.text,
    lineHeight: 30,
  },
  partyStepperValue: {
    alignItems: "center",
    minWidth: 120,
  },
  partyStepperNumber: {
    fontSize: 48,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -1,
  },
  partyStepperLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  partyPreview: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 32,
    aspectRatio: 0.65,
    maxHeight: 220,
    alignSelf: "center",
    width: "100%",
    maxWidth: 280,
  },
  partyPreviewRow: {
    flex: 1,
    flexDirection: "row",
  },
  partyPreviewCell: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  partyPreviewCellText: {
    fontSize: 18,
    fontWeight: "800",
  },
  partyStartButton: {
    backgroundColor: COLORS.accentMuted,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.35)",
  },
  partyStartButtonPressed: {
    backgroundColor: "rgba(99, 102, 241, 0.25)",
    transform: [{ scale: 0.98 }],
  },
  partyStartButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.accent,
    letterSpacing: 0.3,
  },
  partyHeaderBadge: {
    backgroundColor: "rgba(34, 211, 238, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.25)",
  },
  partyHeaderBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#22d3ee",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  partyRow: {
    flex: 1,
    flexDirection: "row",
  },
  partyCell: {
    flex: 1,
  },
  partyPlayerZone: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  partyPlayerZoneContent: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  partyPlayerZoneContentCompact: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  partyZoneOrientationTop: {
    transform: [{ rotate: "180deg" }],
  },
  partyZoneOrientationLeft: {
    transform: [{ rotate: "90deg" }],
  },
  partyZoneOrientationRight: {
    transform: [{ rotate: "-90deg" }],
  },
  partyReadyText: {
    fontSize: 12,
    fontWeight: "700",
  },
  partyRankLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textMuted,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  partyRankLabelCompact: {
    fontSize: 10,
    marginBottom: 2,
    marginTop: 22,
  },
  partyRankLabelWinner: {
    color: "#4ade80",
  },
  partyZoneMainTextCompact: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },
  partyZoneResultCompact: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 18,
  },
  partyZoneFoulCompact: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 20,
  },
  partyZoneSubtitleCompact: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 2,
  },
});
