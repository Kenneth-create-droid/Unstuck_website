import React, { useState } from "react";
import {
    Text,
    View,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
    Keyboard,
    ActivityIndicator
} from "react-native";

import {
    useLocalSearchParams,
    useRouter
} from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";


export default function ResetPassword() {

    const router = useRouter();

    const { email } =
        useLocalSearchParams<{ email: string }>();


    const [password, setPassword] =
        useState("");

    const [confirmPassword, setConfirmPassword] =
        useState("");

    const [showPassword, setShowPassword] =
        useState(false);

    const [
        showConfirmPassword,
        setShowConfirmPassword
    ] = useState(false);

    const [isSubmitting, setIsSubmitting] =
        useState(false);


    // --------------------------------------------
    // API CONFIGURATION
    // --------------------------------------------

    const hostUri =
        Constants.expoConfig?.hostUri;

    const localIp =
        hostUri
            ? hostUri.split(":")[0]
            : "localhost";

    const API_URL =
        Platform.OS === "web"
            ? "http://localhost:2000"
            : `http://${localIp}:2000`;


    // --------------------------------------------
    // ALERT HELPER
    // --------------------------------------------

    const showAlert = (
        title: string,
        message: string,
        onOk?: () => void
    ) => {

        if (Platform.OS === "web") {

            window.alert(
                `${title}: ${message}`
            );

            if (onOk) {
                onOk();
            }

        } else {

            Alert.alert(
                title,
                message,
                onOk
                    ? [
                        {
                            text: "OK",
                            onPress: onOk
                        }
                    ]
                    : undefined
            );
        }
    };


    // ============================================
    // RESET PASSWORD
    // ============================================

    const handleResetPassword = async () => {

        if (isSubmitting) {
            return;
        }


        // ----------------------------------------
        // 1. REQUIRED FIELDS
        // ----------------------------------------

        if (!password || !confirmPassword) {

            showAlert(
                "Password Required",
                "Please enter and confirm your new password."
            );

            return;
        }


        // ----------------------------------------
        // 2. PASSWORD LENGTH
        // ----------------------------------------

        if (password.length < 8) {

            showAlert(
                "Password Too Short",
                "Your new password must be at least 8 characters long."
            );

            return;
        }


        // ----------------------------------------
        // 3. PASSWORDS MUST MATCH
        // ----------------------------------------

        if (password !== confirmPassword) {

            showAlert(
                "Passwords Do Not Match",
                "Please make sure both password fields match."
            );

            return;
        }


        // ----------------------------------------
        // 4. EMAIL MUST EXIST
        // ----------------------------------------

        if (!email) {

            showAlert(
                "Reset Error",
                "Your password reset session could not be found. Please start again."
            );

            return;
        }


        // ----------------------------------------
        // 5. SEND NEW PASSWORD TO BACKEND
        // ----------------------------------------

        try {

            setIsSubmitting(true);

            const normalizedEmail =
                String(email)
                    .trim()
                    .toLowerCase();


            const response = await fetch(
                `${API_URL}/forgot-password/reset`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        email: normalizedEmail,
                        password
                    }),
                }
            );


            const contentType =
                response.headers.get(
                    "content-type"
                );


            if (
                !contentType ||
                !contentType.includes(
                    "application/json"
                )
            ) {

                showAlert(
                    "Server Error",
                    "Received an invalid response from the server."
                );

                return;
            }


            const data =
                await response.json();


            // ----------------------------------------
            // SUCCESS
            // ----------------------------------------

            if (response.ok) {

                showAlert(
                    "Password Reset Successful",
                    "Your password has been changed successfully. You can now log in with your new password.",
                    () => {

                        router.replace(
                            "/login" as any
                        );

                    }
                );

                return;
            }


            // ----------------------------------------
            // BACKEND REJECTED RESET
            // ----------------------------------------

            showAlert(
                "Password Reset Failed",
                data.message ||
                    "Unable to reset your password."
            );


        } catch (error) {

            console.error(
                "Password reset error:",
                error
            );

            showAlert(
                "Network Error",
                "Could not connect to the Unstuck server."
            );

        } finally {

            setIsSubmitting(false);

        }
    };


    // ============================================
    // UI
    // ============================================

    return (

        <KeyboardAvoidingView
            style={{ flex: 1 }}

            behavior={
                Platform.OS === "ios"
                    ? "padding"
                    : "height"
            }
        >

            <ScrollView
                contentContainerStyle={
                    styles.scrollContainer
                }

                keyboardShouldPersistTaps="handled"

                showsVerticalScrollIndicator={false}

                onScrollBeginDrag={
                    Keyboard.dismiss
                }
            >


                {/* HEADER */}

                <View style={styles.header}>

                    <Text style={styles.brandTitle}>
                        Unstuck
                    </Text>

                    <Text style={styles.subtitle}>
                        Get help quickly from someone nearby
                    </Text>

                    <View style={styles.divider} />

                </View>


                {/* PAGE TITLE */}

                <Text style={styles.pageTitle}>
                    Create New Password
                </Text>


                <Text style={styles.description}>
                    Your email has been verified.
                    Create a new password for your
                    Unstuck account.
                </Text>


                <Text style={styles.email}>
                    {email}
                </Text>


                <View style={styles.formContainer}>


                    {/* NEW PASSWORD */}

                    <Text style={styles.label}>
                        New Password
                    </Text>


                    <View
                        style={
                            styles.passwordContainer
                        }
                    >

                        <TextInput
                            onChangeText={
                                setPassword
                            }

                            value={password}

                            placeholder="New password"

                            placeholderTextColor="#8E8E93"

                            style={
                                styles.passwordInput
                            }

                            secureTextEntry={
                                !showPassword
                            }

                            autoCapitalize="none"

                            autoCorrect={false}
                        />


                        <TouchableOpacity
                            style={styles.eyeIcon}

                            onPress={() =>
                                setShowPassword(
                                    !showPassword
                                )
                            }
                        >

                            <Ionicons
                                name={
                                    showPassword
                                        ? "eye-outline"
                                        : "eye-off-outline"
                                }

                                size={22}

                                color="#182A58"
                            />

                        </TouchableOpacity>

                    </View>


                    <Text style={styles.passwordHint}>
                        Password must be at least 8 characters.
                    </Text>


                    {/* CONFIRM PASSWORD */}

                    <Text style={styles.label}>
                        Confirm New Password
                    </Text>


                    <View
                        style={
                            styles.passwordContainer
                        }
                    >

                        <TextInput
                            onChangeText={
                                setConfirmPassword
                            }

                            value={
                                confirmPassword
                            }

                            placeholder="Confirm new password"

                            placeholderTextColor="#8E8E93"

                            style={
                                styles.passwordInput
                            }

                            secureTextEntry={
                                !showConfirmPassword
                            }

                            autoCapitalize="none"

                            autoCorrect={false}

                            returnKeyType="done"

                            onSubmitEditing={
                                handleResetPassword
                            }
                        />


                        <TouchableOpacity
                            style={styles.eyeIcon}

                            onPress={() =>
                                setShowConfirmPassword(
                                    !showConfirmPassword
                                )
                            }
                        >

                            <Ionicons
                                name={
                                    showConfirmPassword
                                        ? "eye-outline"
                                        : "eye-off-outline"
                                }

                                size={22}

                                color="#182A58"
                            />

                        </TouchableOpacity>

                    </View>


                    {/* RESET BUTTON */}

                    <TouchableOpacity
                        style={[
                            styles.button,

                            isSubmitting &&
                                styles.disabledButton
                        ]}

                        onPress={
                            handleResetPassword
                        }

                        disabled={
                            isSubmitting
                        }
                    >

                        {isSubmitting ? (

                            <ActivityIndicator
                                color="#FFFFFF"
                            />

                        ) : (

                            <Text
                                style={
                                    styles.buttonText
                                }
                            >
                                Reset Password
                            </Text>

                        )}

                    </TouchableOpacity>


                    {/* LOGIN */}

                    <TouchableOpacity
                        style={styles.loginLink}

                        onPress={() =>
                            router.replace(
                                "/login" as any
                            )
                        }
                    >

                        <Text
                            style={
                                styles.loginLinkText
                            }
                        >
                            Return to Login
                        </Text>

                    </TouchableOpacity>


                </View>

            </ScrollView>

        </KeyboardAvoidingView>
    );
}


const styles = StyleSheet.create({

    scrollContainer: {
        flexGrow: 1,
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },

    header: {
        marginBottom: 20,
    },

    brandTitle: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#182A58",
        letterSpacing: 1,
    },

    subtitle: {
        fontSize: 16,
        color: "#182A58",
        marginTop: 6,
        marginBottom: 16,
    },

    divider: {
        height: 1,
        backgroundColor: "#182A58",
        width: "100%",
    },

    pageTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#182A58",
        marginBottom: 8,
    },

    description: {
        fontSize: 14,
        color: "#6C757D",
        lineHeight: 21,
        marginBottom: 8,
    },

    email: {
        fontSize: 14,
        color: "#182A58",
        fontWeight: "700",
        marginBottom: 20,
    },

    formContainer: {
        marginTop: 4,
    },

    label: {
        fontSize: 14,
        color: "#182A58",
        fontWeight: "500",
        marginTop: 8,
    },

    passwordContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#182A58",
        borderRadius: 8,
        marginVertical: 8,
    },

    passwordInput: {
        flex: 1,
        height: 50,
        paddingHorizontal: 16,
        fontSize: 16,
        color: "#182A58",
    },

    eyeIcon: {
        paddingHorizontal: 12,
    },

    passwordHint: {
        fontSize: 12,
        color: "#6C757D",
        marginBottom: 10,
    },

    button: {
        backgroundColor: "#182A58",
        height: 50,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 24,
    },

    disabledButton: {
        opacity: 0.65,
    },

    buttonText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "bold",
    },

    loginLink: {
        marginTop: 20,
        alignItems: "center",
    },

    loginLinkText: {
        color: "#182A58",
        fontSize: 14,
        fontWeight: "700",
    },

});