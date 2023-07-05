import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function App() {
  const [gameActive, setGameActive] = useState(false);
  const [timerActive, setTimerActive] = useState(false);

  const [time, setTime] = useState(0);
  const [score, setScore] = useState(Number.MAX_SAFE_INTEGER);
  const [bestScore, setBestScore] = useState(Number.MAX_SAFE_INTEGER);
  const [currentTimeout, setCurrentTimeout] = useState(null);
  const [message, setMessage] = useState("Click to start");

  useEffect(() => {
    if (score !== Number.MAX_SAFE_INTEGER) {
      setMessage(`Your score is ${score}ms`);
    }
  }, [score]);
  const startTimer = () => {
    setTime(Date.now());
    setTimerActive(true);
    setMessage("Click when screen turns green");
  };

  const stopTimer = (newTime) => {
    if (newTime) {
      const newScore = newTime - time;
      setScore(newScore);
      if (newScore < bestScore) {
        setBestScore(newScore);
      }
    }
    setGameActive(false);
    setTimerActive(false);
    setTime(0);
    clearTimeout(currentTimeout);
    setCurrentTimeout(null);
  };
  const handleScreenClick = () => {
    if (!gameActive) {
      setMessage("Wait for green");
      const randomDelay = Math.floor(Math.random() * 1) + 1;
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
      setMessage("Too early, try again");
    }
    return;
  };

  const handleResetClick = () => {
    setScore(Number.MAX_SAFE_INTEGER);
    setBestScore(Number.MAX_SAFE_INTEGER);
    setMessage("Click to start");
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.screen, gameActive && styles.gameActive, timerActive && styles.timerActive]}
        onPress={handleScreenClick}
        activeOpacity={0.9}
      >
        <View style={styles.screen_1}>
          <Text style={styles.counter}>{bestScore !== Number.MAX_SAFE_INTEGER && `Best: ${bestScore}ms`}</Text>
        </View>
        <View style={styles.screen_2}>
          <Text style={styles.counter}>{message}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.startButton} activeOpacity={0.9} onPress={handleResetClick}>
        <Text style={styles.startButtonText}>RESET</Text>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  screen: {
    flex: 8,
    width: "100%",
    height: "100%",
    backgroundColor: "grey",
    justifyContent: "center",
    alignItems: "center",
  },
  screen_1: {
    flex: 4,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  screen_2: {
    flex: 6,
    width: "100%",
    alignItems: "center",
    paddingTop: 50,
  },

  gameActive: {
    backgroundColor: "red",
  },
  timerActive: {
    backgroundColor: "green",
  },
  counter: {
    fontSize: 25,
    color: "white",
  },
  startButton: {
    flex: 1,
    width: "100%",
    backgroundColor: "blue",
    justifyContent: "center",
    alignItems: "center",
  },
  startButtonText: {
    fontSize: 20,
    color: "white",
  },
});
