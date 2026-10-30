import React, { useEffect, useState, useRef } from "react";
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    Switch,
    Alert,
    StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import Constants from "expo-constants";

export default function Home() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [helpText, setHelpText] = useState("");
    const [isAvailable, setIsAvailable] = useState(false);
    const [incomingRequest, setIncomingRequest] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);
    const locationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const hostUri = Constants.expoConfig?.hostUri;
    const localIp = hostUri ? hostUri.split(":")[0] : "localhost";
    const API_URL = Platform.OS === "web" ? "http://localhost:2000" : `http://${localIp}:2000`;

    useEffect(() => {
        loadUserData();
        return () => {
            if (locationTimerRef.current) clearInterval(locationTimerRef.current);
        };
    }, []);

    // Active polling for candidate offers when Available is ON
   // Active polling for candidate offers when Available is ON
useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;

    const pollStatus = async () => {
        if (!isAvailable || !user?.id) return;

        try {
            const res = await fetch(`${API_URL}/api/user/status?userId=${user.id}`);
            const data = await res.json();

            if (isMounted) {
                if (data.status === "BUSY" && data.postID) {
                    const expiresAt = data.expiresAt || data.postDetails?.expiresAt;
                    setIncomingRequest({
                        postId: data.postID,
                        subject: data.subject || data.postDetails?.subject || "Nearby Help Request",
                        description: data.description || data.postDetails?.description || "A student nearby requires course assistance!",
                        expiresAt: expiresAt,
                    });
                } else {
                    setIncomingRequest(null);
                    setTimeLeft(null);
                }
            }
        } catch (err) {
            console.error("Status polling error:", err);
        } finally {
            // Schedule the next poll ONLY after this request finishes
            if (isMounted && isAvailable) {
                timeoutId = setTimeout(pollStatus, 1500);
            }
        }
    };

    if (isAvailable && user?.id) {
        pollStatus();
    } else {
        setIncomingRequest(null);
        setTimeLeft(null);
    }

    return () => {
        isMounted = false;
        if (timeoutId) clearTimeout(timeoutId);
    };
}, [isAvailable, user]);
    // Live countdown interval
    useEffect(() => {
        if (!incomingRequest?.expiresAt) {
            setTimeLeft(null);
            return;
        }

        const updateCountdown = () => {
            const remaining = Math.max(0, Math.ceil((incomingRequest.expiresAt - Date.now()) / 1000));
            setTimeLeft(remaining);
        };

        updateCountdown();
        const countdownInterval = setInterval(updateCountdown, 1000);

        return () => clearInterval(countdownInterval);
    }, [incomingRequest]);

    const loadUserData = async () => {
        const storedUser = await AsyncStorage.getItem("user");
        if (storedUser) setUser(JSON.parse(storedUser));
    };

    const handleAvailabilityToggle = async (value: boolean) => {
        setIsAvailable(value);

        if (value) {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permission Denied", "Location access is required to receive requests.");
                setIsAvailable(false);
                return;
            }

            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const currentCoords = { lat: location.coords.latitude, lng: location.coords.longitude };
            lastLocationRef.current = currentCoords;

            await fetch(`${API_URL}/api/location/activate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id, lat: currentCoords.lat, lng: currentCoords.lng }),
            });

            locationTimerRef.current = setInterval(async () => {
                try {
                    const newLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    const newCoords = { lat: newLoc.coords.latitude, lng: newLoc.coords.longitude };

                    if (lastLocationRef.current) {
                        await fetch(`${API_URL}/api/location/update`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                userId: user.id,
                                oldLat: lastLocationRef.current.lat,
                                oldLng: lastLocationRef.current.lng,
                                newLat: newCoords.lat,
                                newLng: newCoords.lng,
                            }),
                        });
                    }
                    lastLocationRef.current = newCoords;
                } catch (err) {
                    console.error("Location sync error:", err);
                }
            },  30 * 1000);
        } else {
            // 1. Instantly clear offer card & timer on UI
            setIncomingRequest(null);
            setTimeLeft(null);

            // 2. Clear location sync interval
            if (locationTimerRef.current) clearInterval(locationTimerRef.current);

            // 3. Deactivate in backend (which releases job offer in server.js)
            await fetch(`${API_URL}/api/location/deactivate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id }),
            });
            lastLocationRef.current = null;
        }
    };

    const handleRequest = async () => {
        if (!helpText.trim()) return;

        try {
            const currentHelpText = helpText;
            setHelpText("");

            setIsAvailable(false);
            if (locationTimerRef.current) {
                clearInterval(locationTimerRef.current);
                locationTimerRef.current = null;
            }

            await fetch(`${API_URL}/api/location/deactivate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id }),
            }).catch((err) => console.error("Deactivation error on request submit:", err));

            let location = await Location.getLastKnownPositionAsync();
            if (!location) {
                location = await Location.getCurrentPositionAsync({ 
                    accuracy: Location.Accuracy.Balanced 
                });
            }

            const response = await fetch(`${API_URL}/api/request/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.id,
                    subject: "General Course Help",
                    description: currentHelpText,
                    lat: location.coords.latitude,
                    lng: location.coords.longitude,
                }),
            });

            const data = await response.json();

            if (response.ok && data.postId) {
                router.push({
                    pathname: "/searching",
                    params: { postId: data.postId, t: Date.now().toString() },
                });
            } else {
                Alert.alert("Error", "Could not submit help request.");
            }
        } catch (err) {
            console.error("Submit request error:", err);
            Alert.alert("Error", "Failed to connect to request server.");
        }
    };

    const handleRespondToOffer = async (action: "ACCEPT" | "PASS") => {
        if (!incomingRequest) return;

        try {
            const res = await fetch(`${API_URL}/api/request/respond`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    postId: incomingRequest.postId,
                    candidateId: user.id,
                    action,
                }),
            });

            if (res.ok) {
                if (action === "ACCEPT") {
                    router.push({
                        pathname: "/chat",
                        params: { postId: incomingRequest.postId, matchedUserId: user.id }
                    });
                }
                setIncomingRequest(null);
                setTimeLeft(null);
            }
        } catch (err) {
            console.error("Respond offer error:", err);
        }
    };

    if (!user) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#182A58" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                    <View style={styles.mainWrapper}>
                        {/* Header */}
                        <View style={styles.headerRow}>
                            <View style={styles.brandContainer}>
                                <Text style={styles.brandTitle}>Unstuck</Text>
                                <Text style={styles.subtitle}>Get help quickly from someone nearby</Text>
                            </View>
                            <TouchableOpacity style={styles.profileButton} onPress={() => router.push("/profile")}>
                                <Ionicons name="person-circle-outline" size={20} color="#FFFFFF" />
                                <Text style={styles.profileButtonText}>Profile</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Card 1: Ask for Help */}
                        <View style={[styles.card, styles.largeCard]}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="create-outline" size={24} color="#182A58" />
                                <Text style={styles.cardTitle}>Ask for help on Campus</Text>
                            </View>
                            <TextInput
                                style={styles.textArea}
                                multiline
                                numberOfLines={6}
                                placeholder="e.g. Does any one know where SCI1120U is or does anyone understand this concept"
                                placeholderTextColor="#8E8E93"
                                value={helpText}
                                onChangeText={setHelpText}
                            />
                            <TouchableOpacity style={styles.requestButton} onPress={handleRequest}>
                                <Text style={styles.requestButtonText}>Submit Request</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Card 2: Status Switch */}
                        <View style={styles.statusCard}>
                            <View style={styles.statusInfo}>
                                <View style={[styles.statusDot, isAvailable ? styles.dotActive : styles.dotInactive]} />
                                <Text style={styles.statusTitle}>Available to Help</Text>
                            </View>
                            <Switch
                                value={isAvailable}
                                onValueChange={handleAvailabilityToggle}
                                trackColor={{ false: "#E5E5EA", true: "#182A58" }}
                                thumbColor="#FFFFFF"
                                style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }}
                            />
                        </View>

                        {/* Card 3: Nearby Request Offer */}
                        <View style={[styles.card, styles.nearbyCard]}>
                            <View style={styles.cardHeaderContainer}>
                                <View style={styles.cardHeader}>
                                    <Ionicons name="location-outline" size={24} color="#182A58" />
                                    <Text style={styles.cardTitle}>Nearby Help Request</Text>
                                </View>
                                {timeLeft !== null && (
                                    <View style={styles.timerBadge}>
                                        <Ionicons name="time-outline" size={16} color="#DC3545" />
                                        <Text style={styles.timerText}>{timeLeft}s</Text>
                                    </View>
                                )}
                            </View>

                            {incomingRequest ? (
                                <View style={styles.incomingContainer}>
                                    <View style={styles.requestBox}>
                                        <Text style={styles.requestSubject}>{incomingRequest.subject}</Text>
                                        <Text style={styles.requestDescription}>{incomingRequest.description}</Text>
                                    </View>
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.acceptButton]}
                                            onPress={() => handleRespondToOffer("ACCEPT")}
                                        >
                                            <Text style={styles.acceptButtonText}>Accept</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.passButton]}
                                            onPress={() => handleRespondToOffer("PASS")}
                                        >
                                            <Text style={styles.passButtonText}>Pass</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.emptyStateContainer}>
                                    <Text style={styles.emptyStateText}>
                                        {isAvailable ? "Searching for nearby help requests..." : "Turn ON availability to receive requests"}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: "#F8F9FA",
        // Adds safe dynamic top padding for Android/notched displays
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F9FA" },
    scrollContainer: { 
        paddingTop: Platform.OS === "ios" ? 16 : 24, // Extra breathing room from system status bar
        paddingBottom: 24, 
        paddingHorizontal: 16, 
        alignItems: "center" 
    },
    mainWrapper: { width: "100%", maxWidth: 840 },
    
    headerRow: { 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: 24,
        width: "100%",
        gap: 12
    },
    brandContainer: { flex: 1, paddingRight: 8 },
    brandTitle: { fontSize: 28, fontWeight: "800", color: "#182A58", letterSpacing: 0.5 },
    subtitle: { fontSize: 14, color: "#6C757D", marginTop: 2 },
    profileButton: { 
        backgroundColor: "#182A58", 
        flexDirection: "row", 
        alignItems: "center", 
        paddingHorizontal: 14, 
        paddingVertical: 10, 
        borderRadius: 20, 
        gap: 6,
        flexShrink: 0,
        alignSelf: "flex-start"
    },
    profileButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
    
    card: { 
        backgroundColor: "#FFFFFF", 
        borderRadius: 16, 
        padding: 24, 
        marginBottom: 20, 
        borderWidth: 1, 
        borderColor: "#E9ECEF", 
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2 
    },
    largeCard: { paddingBottom: 24 },
    nearbyCard: { minHeight: 200, justifyContent: "space-between" },

    cardHeaderContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    cardTitle: { fontSize: 18, fontWeight: "700", color: "#182A58" },
    
    timerBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFEBEB", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 },
    timerText: { color: "#DC3545", fontSize: 14, fontWeight: "bold" },
    
    textArea: { 
        backgroundColor: "#F8F9FA", 
        borderWidth: 1, 
        borderColor: "#CED4DA", 
        borderRadius: 12, 
        padding: 16, 
        fontSize: 15, 
        height: 160, 
        textAlignVertical: "top", 
        color: "#212529",
        marginTop: 12,
        marginBottom: 16
    },
    
    requestButton: { backgroundColor: "#182A58", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
    requestButtonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 16 },
    
    statusCard: { 
        backgroundColor: "#FFFFFF", 
        borderRadius: 16, 
        paddingHorizontal: 24, 
        paddingVertical: 20, 
        marginBottom: 20, 
        borderWidth: 1, 
        borderColor: "#E9ECEF", 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center",
        elevation: 2 
    },
    statusInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
    statusDot: { width: 12, height: 12, borderRadius: 6 },
    dotActive: { backgroundColor: "#34C759" },
    dotInactive: { backgroundColor: "#8E8E93" },
    statusTitle: { fontSize: 17, fontWeight: "700", color: "#182A58" },
    
    incomingContainer: { flex: 1, justifyContent: "space-between", marginTop: 8 },
    requestBox: { backgroundColor: "#F8F9FA", borderRadius: 12, padding: 18, borderLeftWidth: 5, borderLeftColor: "#182A58", marginBottom: 16 },
    requestSubject: { fontSize: 13, fontWeight: "bold", color: "#6C757D", textTransform: "uppercase", marginBottom: 6 },
    requestDescription: { fontSize: 15, color: "#212529", lineHeight: 22 },
    
    actionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
    actionButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
    acceptButton: { backgroundColor: "#182A58" },
    acceptButtonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 15 },
    passButton: { backgroundColor: "#F8F9FA", borderWidth: 1, borderColor: "#CED4DA" },
    passButtonText: { color: "#495057", fontWeight: "bold", fontSize: 15 },

    emptyStateContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 24 },
    emptyStateText: { color: "#6C757D", textAlign: "center", fontSize: 15, fontWeight: "500" },
});