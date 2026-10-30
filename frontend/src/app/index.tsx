// this is the file we will use when we are trying to load our files for us

import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LandingPage from "./landing-page";

export default function Index() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        checkUserSession();
    }, []);

    const checkUserSession = async () => {
        try {
            const userData = await AsyncStorage.getItem("user");
            if (userData !== null) {
                setIsLoggedIn(true);
                router.replace("/home" as any);
            }
        } catch (error) {
            console.error("Error checking user session:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Show a loading spinner while checking local storage
    if (isLoading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#182A58" />
            </View>
        );
    }

    // If logged in, return null while router.replace navigates to /home
    if (isLoggedIn) {
        return null;
    }

    // Default to LandingPage if no active session is found
    return <LandingPage />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
    },
});