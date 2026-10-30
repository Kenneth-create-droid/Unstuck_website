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
import { useRouter } from "expo-router";
import Constants from "expo-constants";

export default function ForgotPassword() {

    const router = useRouter();

    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Same API configuration used by your signup page
    const hostUri = Constants.expoConfig?.hostUri;
    const localIp = hostUri ? hostUri.split(":")[0] : "localhost";

    const API_URL =
        Platform.OS === "web"
            ? "http://localhost:2000"
            : `http://${localIp}:2000`;


    const showAlert = (
        title: string,
        message: string,
        onOk?: () => void
    ) => {

        if (Platform.OS === "web") {

            window.alert(`${title}: ${message}`);

            if (onOk) {
                onOk();
            }

        } else {

            Alert.alert(
                title,
                message,
                onOk
                    ? [{ text: "OK", onPress: onOk }]
                    : undefined
            );
        }
    };


    const handleSendResetCode = async () => {

        if (isSubmitting) {
            return;
        }


        // --------------------------------------------
        // 1. EMAIL REQUIRED
        // --------------------------------------------

        if (!email.trim()) {

            showAlert(
                "Email Required",
                "Please enter your Ontario Tech email address."
            );

            return;
        }


        // --------------------------------------------
        // 2. NORMALIZE EMAIL
        // --------------------------------------------

        const normalizedEmail =
            email.trim().toLowerCase();


        // --------------------------------------------
        // 3. ONTARIO TECH EMAIL CHECK
        // --------------------------------------------

        const allowedDomains = [
            "ontariotechu.net",
            "ontariotechu.ca"
        ];

        const emailParts =
            normalizedEmail.split("@");

        if (
            emailParts.length !== 2 ||
            !allowedDomains.includes(emailParts[1])
        ) {

            showAlert(
                "Ontario Tech Email Required",
                "Please use your Ontario Tech email address ending in @ontariotechu.net or @ontariotechu.ca."
            );

            return;
        }


        // --------------------------------------------
        // 4. REQUEST PASSWORD RESET CODE
        // --------------------------------------------

        try {

            setIsSubmitting(true);

            const response = await fetch(
                `${API_URL}/forgot-password`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        email: normalizedEmail
                    }),
                }
            );


            const contentType =
                response.headers.get("content-type");

            if (
                !contentType ||
                !contentType.includes("application/json")
            ) {

                showAlert(
                    "Server Error",
                    "Received an invalid response from the server."
                );

                return;
            }


            const data = await response.json();


            // --------------------------------------------
            // 5. RESET CODE SENT
            // --------------------------------------------

            if (response.ok) {

                router.push({
                    pathname: "/verify-reset-code",
                    params: {
                        email: normalizedEmail
                    }
                } as any);

                return;
            }


            // --------------------------------------------
            // 6. BACKEND REJECTED REQUEST
            // --------------------------------------------

            showAlert(
                "Password Reset Failed",
                data.message ||
                    "Unable to send password reset code."
            );


        } catch (error) {

            console.error(
                "Forgot password error:",
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
                onScrollBeginDrag={Keyboard.dismiss}
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
                    Forgot Password
                </Text>

                <Text style={styles.description}>
                    Enter the Ontario Tech email associated
                    with your Unstuck account. We'll send
                    you a 6-digit verification code.
                </Text>


                <View style={styles.formContainer}>

                    {/* EMAIL */}

                    <Text style={styles.label}>
                        Ontario Tech Email
                    </Text>

                    <TextInput
                        onChangeText={setEmail}
                        value={email}
                        placeholder="name@ontariotechu.net"
                        placeholderTextColor="#8E8E93"
                        style={styles.input}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />


                    <Text style={styles.emailHint}>
                        Use the Ontario Tech email connected
                        to your Unstuck account.
                    </Text>


                    {/* SEND CODE */}

                    <TouchableOpacity
                        style={[
                            styles.button,
                            isSubmitting &&
                                styles.disabledButton
                        ]}
                        onPress={handleSendResetCode}
                        disabled={isSubmitting}
                    >

                        {isSubmitting ? (

                            <ActivityIndicator
                                color="#FFFFFF"
                            />

                        ) : (

                            <Text style={styles.buttonText}>
                                Send Reset Code
                            </Text>

                        )}

                    </TouchableOpacity>


                    {/* BACK TO LOGIN */}

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
                            Remember your password?{" "}

                            <Text
                                style={{
                                    fontWeight: "bold"
                                }}
                            >
                                Log In
                            </Text>

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

    input: {
        height: 50,
        borderWidth: 1,
        borderColor: "#182A58",
        borderRadius: 8,
        paddingHorizontal: 16,
        marginVertical: 8,
        fontSize: 16,
        color: "#182A58",
    },

    emailHint: {
        fontSize: 12,
        color: "#6C757D",
        marginBottom: 6,
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
    },

});