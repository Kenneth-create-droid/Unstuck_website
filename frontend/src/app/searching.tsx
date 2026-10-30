import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";

export default function SearchingScreen() {
  const router = useRouter();
  const { postId, redispatch } = useLocalSearchParams<{
  postId: string;
  redispatch?: string;
}>();

const isRedispatch = redispatch === "true";

  // Countdown State (5-second grace window)
  const [countdown, setCountdown] = useState(
  isRedispatch ? 0 : 5
);

const [canCancelWindow, setCanCancelWindow] = useState(
  !isRedispatch
);

const [isAnalyzing, setIsAnalyzing] = useState(
  !isRedispatch
);

const [isApproved, setIsApproved] = useState(false);
  // Search Engine State
  const [currentRing, setCurrentRing] = useState(0);
  const [candidatesEvaluated, setCandidatesEvaluated] = useState(0);
  const [isMatched, setIsMatched] = useState(false);

  // Ref lock to prevent double-navigation / alert loops
  const isTerminatedRef = useRef(false);

  const hostUri = Constants.expoConfig?.hostUri;
  const localIp = hostUri ? hostUri.split(":")[0] : "localhost";
  const API_URL = Platform.OS === "web" ? "http://localhost:2000" : `http://${localIp}:2000`;

  // 1. Uber-style 5-second countdown timer
  useEffect(() => {

  // Don't start the countdown while
  // OpenAI is analyzing the request.
  if (isAnalyzing) {
    return;
  }

  if (countdown > 0) {

    const timer = setTimeout(() => {
      setCountdown((previous) => previous - 1);
    }, 1000);

    return () => clearTimeout(timer);

  } else {

    setCanCancelWindow(false);

  }

}, [countdown, isAnalyzing]);

  // 2. Synchronized Polling for Redis Engine Progress
  useEffect(() => {
    if (!postId) return;

    const interval = setInterval(async () => {
      if (isTerminatedRef.current) return;

      try {
        const res = await fetch(`${API_URL}/api/request/progress?postId=${postId}`);
        if (!res.ok) return;

        const data = await res.json();

             // ------------------------------------------
// CONTENT ANALYSIS STATE
// ------------------------------------------

          if (!isRedispatch) {
              if (data.status === "ANALYZING") {
                setIsAnalyzing(true);
                setIsApproved(false);
              }
              else if (data.status === "APPROVED") {
                setIsAnalyzing(false);
                setIsApproved(true);
              }
              else {
                setIsAnalyzing(false);
                setIsApproved(false);
              }
            } else {
              // Redispatch has already passed request analysis.
              setIsAnalyzing(false);
              setIsApproved(false);
            }


          // ------------------------------------------
          // MATCHING PROGRESS
          // ------------------------------------------

          setCurrentRing(
            Number(data.currentRing || 0)
          );

          setCandidatesEvaluated(
            data.candidatesEvaluated || 0
          );


          // ------------------------------------------
          // MATCH FOUND
          // ------------------------------------------

          if (data.status === "MATCHED") {

            isTerminatedRef.current = true;
            setIsMatched(true);
            clearInterval(interval);

            setTimeout(() => {

              router.replace({
                pathname: "/chat",

                params: {
                  postId,
                  matchedUserId:
                    data.matchedUserId
                },
              });

            }, 800);
          }


          // ------------------------------------------
          // CONTENT REJECTED
          // ------------------------------------------

          else if (data.status === "REJECTED") {

            isTerminatedRef.current = true;
            clearInterval(interval);

            Alert.alert(
              "Request Not Submitted",

              data.message ||
                "Your request doesn't meet Unstuck's community guidelines. Please edit it and try again.",

              [
                {
                  text: "Return Home",

                  onPress: () =>
                    router.replace("/home"),
                },
              ],

              {
                cancelable: false
              }
            );
          }


          // ------------------------------------------
          // MATCHING FAILED
          // ------------------------------------------

          else if (data.status === "FAILED") {

            isTerminatedRef.current = true;
            clearInterval(interval);

            Alert.alert(
              "Unable to Find Helpers",

              "We searched all nearby campus spatial rings but couldn't find an available helper right now.",

              [
                {
                  text: "Return Home",

                  onPress: () =>
                    router.replace("/home"),
                },
              ],

              {
                cancelable: false
              }
            );
          }

          // ------------------------------------------
          // NO HELPER FOUND
          // ------------------------------------------
          else if (data.status === "FAILED") {
            isTerminatedRef.current = true;
            clearInterval(interval);

            Alert.alert(
              "Unable to Find Helpers",
              "We searched all nearby campus spatial rings but couldn't find an available helper right now.",
              [
                {
                  text: "Return Home",
                  onPress: () => router.replace("/home"),
                },
              ],
              { cancelable: false }
            );
          }
      } catch (err) {
        console.error("Progress polling error:", err);
      }
    }, 1000);

    return () => clearInterval(interval);
}, [postId, isRedispatch]);

  // Cancel Request Action
  const handleCancel = async () => {
    if (isTerminatedRef.current) return;
    isTerminatedRef.current = true;

    try {
      await fetch(`${API_URL}/api/request/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
    } catch (err) {
      console.error("Cancel request error:", err);
    } finally {
      router.replace("/home");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* Header */}
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#003C71" />
        </TouchableOpacity>

        {/* Main Status Card */}
        <View style={styles.card}>
         {isMatched || isApproved ? (
            <Ionicons name="checkmark-circle" size={56} color="#10B981" style={{ marginBottom: 12 }} />
          ) : (
            <ActivityIndicator size="large" color="#003C71" style={{ marginBottom: 16 }} />
          )}

          <Text style={styles.title}>
            {isMatched
              ? "Helper Found!"
              : isRedispatch
                ? "Finding Another Helper..."
                : isAnalyzing
                  ? "Analyzing Your Request..."
                  : isApproved
                    ? "Request Approved!"
                    : "Finding Nearby Helper..."}
          </Text>
          
         

        <Text style={styles.subtitle}>
          {isMatched
            ? "Connecting you to your campus helper..."
            : isRedispatch
              ? `Continuing your search from Ring ${currentRing}...`
              : isAnalyzing
                ? "Checking that your request follows Unstuck's community guidelines..."
                : isApproved
                  ? "Your request meets Unstuck's community guidelines."
                  : canCancelWindow
                    ? `Broadcasting request in ${countdown}s...`
                    : `Searching Ring ${currentRing} on campus...`}
        </Text>
          {/* Metrics Display */}
          {!isAnalyzing && !isApproved && (
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>
                  {currentRing}
                </Text>

                <Text style={styles.metricLabel}>
                  Search Radius (Ring)
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>
                  {candidatesEvaluated}
                </Text>

                <Text style={styles.metricLabel}>
                  Helpers Evaluated
                </Text>
              </View>
            </View>
          )}
          
        </View>

        {/* Cancel Button */}
        {!isMatched && (
          <TouchableOpacity 
            style={[styles.cancelButton, canCancelWindow ? styles.graceButton : styles.standardButton]} 
            onPress={handleCancel}
          >
            <Text style={styles.cancelText}>
              {canCancelWindow ? `Cancel Request (${countdown}s)` : "Stop Searching"}
            </Text>
          </TouchableOpacity>
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", justifyContent: "center", alignItems: "center" },
  content: { width: "90%", maxWidth: 480, alignItems: "center" },
  backButton: { alignSelf: "flex-start", marginBottom: 16 },
  
  card: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    marginBottom: 20,
  },
  
  title: { fontSize: 20, fontWeight: "800", color: "#003C71", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#64748B", marginBottom: 24, textAlign: "center" },

  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 18,
  },
  metricItem: { alignItems: "center", flex: 1 },
  metricValue: { fontSize: 22, fontWeight: "800", color: "#003C71" },
  metricLabel: { fontSize: 12, color: "#64748B", marginTop: 2 },
  divider: { width: 1, height: 30, backgroundColor: "#E2E8F0" },

  cancelButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  graceButton: { backgroundColor: "#DC2626" },
  standardButton: { backgroundColor: "#64748B" },
  cancelText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
});