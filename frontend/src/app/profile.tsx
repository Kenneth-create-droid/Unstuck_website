import React, { useEffect, useState } from "react";
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ActivityIndicator,
    SafeAreaView,
    Platform,
    StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";

export default function ProfileScreen() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const hostUri = Constants.expoConfig?.hostUri;
    const localIp = hostUri ? hostUri.split(":")[0] : "localhost";
    const API_URL = Platform.OS === "web" ? "http://localhost:2000" : `http://${localIp}:2000`;

    useEffect(() => {
        loadUserProfile();
    }, []);

    const loadUserProfile = async () => {
        try {
            const storedUser = await AsyncStorage.getItem("user");
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                setUser(parsed);

                if (parsed?.id) {
                    const res = await fetch(`${API_URL}/api/user/profile?userId=${parsed.id}`);
                    if (res.ok) {
                        const updatedData = await res.json();
                        setUser((prev: any) => ({ ...prev, ...updatedData }));
                        await AsyncStorage.setItem("user", JSON.stringify({ ...parsed, ...updatedData }));
                    }
                }
            }
        } catch (err) {
            console.error("Failed to load user profile:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            if (user?.id) {
                await fetch(`${API_URL}/api/location/deactivate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: user.id }),
                });
            }
            await AsyncStorage.removeItem("user");
            setUser(null);
            router.replace("/");
        } catch (err) {
            console.error("Logout error:", err);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Top Navigation */}
            <View style={styles.topNav}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                        console.log("BACK PRESSED");
                        router.replace("/home");
                    }}
                >
                    <Ionicons name="arrow-back" size={24} color="#182A58" />
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
              
            </View>

            {/* Centered Main Profile Box */}
            <View style={styles.centerContainer}>
                <View style={styles.profileCard}>
                    <View style={styles.avatarWrapper}>
                        <Ionicons name="person-circle" size={100} color="#182A58" />
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color="#182A58" style={{ marginVertical: 20 }} />
                    ) : (
                        <View style={styles.infoSection}>
                            <Text style={styles.profileName}>
                                {user?.firstname && user?.lastname
                                    ? `${user.firstname} ${user.lastname}`
                                    : "User Profile"}
                            </Text>

                            <View style={styles.detailRow}>
                                <Ionicons name="mail-outline" size={18} color="#6C757D" />
                                <Text style={styles.detailText}>{user?.email || "No email provided"}</Text>
                            </View>

                            <View style={styles.helpedContainer}>
    <Ionicons
        name="heart-outline"
        size={24}
        color="#182A58"
    />

                    <View>
                        <Text style={styles.helpedNumber}>
                            {user?.people_helped ?? 0}
                        </Text>

                        <Text style={styles.helpedLabel}>
                            People Helped
                        </Text>
                    </View>
                </View>
                        </View>
                    )}

                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.logoutButtonText}>Log Out</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: "#F8F9FA",
        // Dynamic top padding to prevent notch/status bar overlap
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    },
   topNav: { 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === "ios" ? 16 : 20, 
    paddingBottom: 10,
    zIndex: 100,
    elevation: 100,
},
   backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignSelf: "flex-start",
    zIndex: 101,
},
    backText: { fontSize: 16, fontWeight: "600", color: "#182A58" },

  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 120,
},
    profileCard: {
        backgroundColor: "#FFFFFF",
        width: "100%",
        maxWidth: 440,
        borderRadius: 20,
        padding: 32,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E9ECEF",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    avatarWrapper: { marginBottom: 16 },
    infoSection: { alignItems: "center", width: "100%", marginBottom: 28 },
    profileName: { fontSize: 24, fontWeight: "800", color: "#182A58", marginBottom: 12 },
    
    detailRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginVertical: 4,
    },
    detailText: { fontSize: 16, color: "#495057", fontWeight: "500" },

    helpedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 22,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: "#F8F9FA",
    borderRadius: 14,
    width: "100%",
},

helpedNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: "#182A58",
},

helpedLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6C757D",
},

    logoutButton: {
        backgroundColor: "#DC3545",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        borderRadius: 12,
        width: "100%",
        gap: 8,
    },
    logoutButtonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 16 },
});