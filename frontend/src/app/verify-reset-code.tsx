import React, { useEffect, useState } from "react";

import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Platform,
    ActivityIndicator,
    KeyboardAvoidingView,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
    useLocalSearchParams,
    useRouter
} from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";

export default function VerifyResetCode() {

    const router = useRouter();

    // Email passed from forgot-password.tsx
    const { email } =
        useLocalSearchParams<{ email: string }>();

    const [code, setCode] = useState("");

    const [isVerifying, setIsVerifying] =
        useState(false);

    const [verifyCooldown, setVerifyCooldown] =
        useState(0);

    const [isResending, setIsResending] =
        useState(false);

    const [resendCooldown, setResendCooldown] =
        useState(0);


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
    // RESEND COUNTDOWN
    // --------------------------------------------

    useEffect(() => {

        if (resendCooldown <= 0) {
            return;
        }

        const timer = setInterval(() => {

            setResendCooldown((previous) => {

                if (previous <= 1) {
                    clearInterval(timer);
                    return 0;
                }

                return previous - 1;
            });

        }, 1000);

        return () => clearInterval(timer);

    }, [resendCooldown]);


    // --------------------------------------------
    // VERIFY RATE-LIMIT COUNTDOWN
    // --------------------------------------------

    useEffect(() => {

        if (verifyCooldown <= 0) {
            return;
        }

        const timer = setTimeout(() => {

            setVerifyCooldown((previous) =>
                Math.max(0, previous - 1)
            );

        }, 1000);

        return () => clearTimeout(timer);

    }, [verifyCooldown]);


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
    // VERIFY RESET CODE
    // ============================================

    const handleVerify = async () => {

        if (
            isVerifying ||
            verifyCooldown > 0
        ) {
            return;
        }


        const cleanCode =
            code.trim();


        // ----------------------------------------
        // FRONTEND VALIDATION
        // ----------------------------------------

        if (!cleanCode) {

            showAlert(
                "Verification Code Required",
                "Please enter the password reset code sent to your Ontario Tech email."
            );

            return;
        }


        if (!/^\d{6}$/.test(cleanCode)) {

            showAlert(
                "Invalid Code",
                "Please enter the 6-digit verification code."
            );

            return;
        }


        if (!email) {

            showAlert(
                "Verification Error",
                "Your email address could not be found. Please return to Forgot Password and try again."
            );

            return;
        }


        // ----------------------------------------
        // SEND CODE TO BACKEND
        // ----------------------------------------

        try {

            setIsVerifying(true);

            const normalizedEmail =
                String(email)
                    .trim()
                    .toLowerCase();


            const response = await fetch(
                `${API_URL}/forgot-password/verify`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        email: normalizedEmail,
                        code: cleanCode,
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

                router.push({
                    pathname: "/reset-password",

                    params: {
                        email: normalizedEmail
                    }

                } as any);

                return;
            }


            // ----------------------------------------
            // WRONG CODE
            // ----------------------------------------

            if (response.status === 401) {

                showAlert(
                    "Incorrect Code",
                    data.message ||
                        "The password reset code is incorrect."
                );

                setCode("");

                return;
            }


            // ----------------------------------------
            // RATE LIMITED
            // ----------------------------------------

            if (response.status === 429) {

                const retryAfter =
                    Number(
                        data.retryAfter
                    ) || 60;

                setVerifyCooldown(
                    retryAfter
                );

                setCode("");

                showAlert(
                    "Too Many Attempts",
                    data.message ||
                        `Please wait ${retryAfter} seconds before trying again.`
                );

                return;
            }


            // ----------------------------------------
            // OTHER ERROR
            // ----------------------------------------

            showAlert(
                "Verification Failed",
                data.message ||
                    "The password reset code is incorrect or has expired."
            );


        } catch (error) {

            console.error(
                "Password reset verification error:",
                error
            );

            showAlert(
                "Network Error",
                "Could not connect to the Unstuck server."
            );

        } finally {

            setIsVerifying(false);

        }
    };


    // ============================================
    // RESEND RESET CODE
    // ============================================

    const handleResend = async () => {

        if (
            isResending ||
            resendCooldown > 0
        ) {
            return;
        }


        if (!email) {

            showAlert(
                "Verification Error",
                "Your email address could not be found. Please return to Forgot Password and try again."
            );

            return;
        }


        try {

            setIsResending(true);

            const response = await fetch(
                `${API_URL}/forgot-password`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        email:
                            String(email)
                                .trim()
                                .toLowerCase(),
                    }),
                }
            );


            const data =
                await response.json();


            // ----------------------------------------
            // RESEND SUCCESS
            // ----------------------------------------

            if (response.ok) {

                setCode("");

                setResendCooldown(
                    Number(data.cooldown) || 60
                );

                showAlert(
                    "Code Sent",
                    "A new password reset code was sent to your Ontario Tech email."
                );

                return;
            }


            // ----------------------------------------
            // BACKEND COOLDOWN
            // ----------------------------------------

            if (response.status === 429) {

                const retryAfter =
                    Number(
                        data.retryAfter
                    ) || 60;

                setResendCooldown(
                    retryAfter
                );

                showAlert(
                    "Please Wait",
                    data.message ||
                        `Please wait ${retryAfter} seconds before requesting another code.`
                );

                return;
            }


            showAlert(
                "Unable to Resend",
                data.message ||
                    "We could not send another password reset code."
            );


        } catch (error) {

            console.error(
                "Reset code resend error:",
                error
            );

            showAlert(
                "Network Error",
                "Could not connect to the Unstuck server."
            );

        } finally {

            setIsResending(false);

        }
    };


    // ============================================
    // UI
    // ============================================

    return (

        <SafeAreaView style={styles.container}>

            <KeyboardAvoidingView
                style={styles.keyboardContainer}

                behavior={
                    Platform.OS === "ios"
                        ? "padding"
                        : "height"
                }
            >

                <View style={styles.content}>


                    {/* BACK BUTTON */}

                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() =>
                            router.back()
                        }
                    >

                        <Ionicons
                            name="arrow-back"
                            size={24}
                            color="#182A58"
                        />

                        <Text style={styles.backText}>
                            Back
                        </Text>

                    </TouchableOpacity>


                    {/* UNSTUCK HEADER */}

                    <View style={styles.header}>

                        <Text style={styles.brandTitle}>
                            Unstuck
                        </Text>

                        <Text style={styles.brandSubtitle}>
                            Ontario Tech Campus Support
                        </Text>

                        <View style={styles.divider} />

                    </View>


                    {/* VERIFICATION CARD */}

                    <View style={styles.card}>


                        <View
                            style={
                                styles.iconContainer
                            }
                        >

                            <Ionicons
                                name="key-outline"
                                size={42}
                                color="#182A58"
                            />

                        </View>


                        <Text style={styles.title}>
                            Verify Reset Code
                        </Text>


                        <Text
                            style={
                                styles.description
                            }
                        >
                            We sent a 6-digit password
                            reset code to your Ontario
                            Tech email.
                        </Text>


                        <Text style={styles.email}>
                            {email}
                        </Text>


                        {/* CODE INPUT */}

                        <Text style={styles.label}>
                            Verification Code
                        </Text>


                        <TextInput
                            style={styles.codeInput}

                            value={code}

                            onChangeText={(value) => {

                                const numbersOnly =
                                    value.replace(
                                        /[^0-9]/g,
                                        ""
                                    );

                                setCode(
                                    numbersOnly.slice(
                                        0,
                                        6
                                    )
                                );
                            }}

                            placeholder="000000"

                            placeholderTextColor="#A0A0A0"

                            keyboardType="number-pad"

                            maxLength={6}

                            textAlign="center"

                            autoFocus

                            returnKeyType="done"

                            onSubmitEditing={
                                handleVerify
                            }
                        />


                        <Text
                            style={
                                styles.expirationText
                            }
                        >
                            This code expires in 2 minutes.
                        </Text>


                        {/* VERIFY BUTTON */}

                        <TouchableOpacity
                            style={[
                                styles.verifyButton,

                                (
                                    isVerifying ||
                                    code.length !== 6 ||
                                    verifyCooldown > 0
                                ) &&
                                    styles.disabledButton
                            ]}

                            onPress={handleVerify}

                            disabled={
                                isVerifying ||
                                code.length !== 6 ||
                                verifyCooldown > 0
                            }
                        >

                            {isVerifying ? (

                                <ActivityIndicator
                                    color="#FFFFFF"
                                />

                            ) : (

                                <Text
                                    style={
                                        styles.verifyButtonText
                                    }
                                >

                                    {
                                        verifyCooldown > 0
                                            ? `Try Again (${verifyCooldown}s)`
                                            : "Verify Code"
                                    }

                                </Text>

                            )}

                        </TouchableOpacity>


                        {/* RESEND */}

                        <TouchableOpacity
                            style={[
                                styles.resendButton,

                                (
                                    isResending ||
                                    resendCooldown > 0
                                ) &&
                                    styles.resendDisabledButton
                            ]}

                            onPress={
                                handleResend
                            }

                            disabled={
                                isResending ||
                                resendCooldown > 0
                            }
                        >

                            {isResending ? (

                                <ActivityIndicator
                                    size="small"
                                    color="#182A58"
                                />

                            ) : (

                                <Text
                                    style={
                                        styles.resendText
                                    }
                                >

                                    {
                                        resendCooldown > 0
                                            ? `Resend Code (${resendCooldown}s)`
                                            : "Didn't receive a code? Resend Code"
                                    }

                                </Text>

                            )}

                        </TouchableOpacity>


                        {/* CHANGE EMAIL */}

                        <TouchableOpacity
                            style={
                                styles.changeEmailButton
                            }

                            onPress={() =>
                                router.back()
                            }
                        >

                            <Text
                                style={
                                    styles.changeEmailText
                                }
                            >
                                Wrong email? Return to Forgot Password
                            </Text>

                        </TouchableOpacity>


                    </View>

                </View>

            </KeyboardAvoidingView>

        </SafeAreaView>
    );
}


const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },

    keyboardContainer: {
        flex: 1,
    },

    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 30,
    },

    backButton: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 25,
    },

    backText: {
        color: "#182A58",
        fontSize: 16,
        fontWeight: "600",
        marginLeft: 6,
    },

    header: {
        marginBottom: 35,
    },

    brandTitle: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#182A58",
        letterSpacing: 1,
    },

    brandSubtitle: {
        fontSize: 15,
        color: "#182A58",
        marginTop: 5,
        marginBottom: 16,
    },

    divider: {
        height: 1,
        backgroundColor: "#182A58",
        width: "100%",
    },

    card: {
        width: "100%",
        maxWidth: 480,
        alignSelf: "center",
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 16,
        padding: 24,

        shadowColor: "#000",

        shadowOffset: {
            width: 0,
            height: 2,
        },

        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },

    iconContainer: {
        alignSelf: "center",
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "#F1F5F9",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 18,
    },

    title: {
        fontSize: 24,
        fontWeight: "800",
        color: "#182A58",
        textAlign: "center",
        marginBottom: 10,
    },

    description: {
        fontSize: 15,
        color: "#6C757D",
        textAlign: "center",
        lineHeight: 22,
    },

    email: {
        fontSize: 15,
        fontWeight: "700",
        color: "#182A58",
        textAlign: "center",
        marginTop: 8,
        marginBottom: 28,
    },

    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#182A58",
        marginBottom: 8,
    },

    codeInput: {
        height: 60,
        borderWidth: 1.5,
        borderColor: "#182A58",
        borderRadius: 10,
        paddingHorizontal: 16,
        fontSize: 26,
        fontWeight: "700",
        color: "#182A58",
        letterSpacing: 8,
    },

    expirationText: {
        fontSize: 12,
        color: "#6C757D",
        textAlign: "center",
        marginTop: 10,
    },

    verifyButton: {
        height: 52,
        backgroundColor: "#182A58",
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 24,
    },

    disabledButton: {
        opacity: 0.5,
    },

    verifyButtonText: {
        color: "#FFFFFF",
        fontSize: 17,
        fontWeight: "bold",
    },

    resendButton: {
        alignItems: "center",
        justifyContent: "center",
        marginTop: 18,
        minHeight: 30,
    },

    resendDisabledButton: {
        opacity: 0.5,
    },

    resendText: {
        color: "#182A58",
        fontSize: 14,
        fontWeight: "700",
    },

    changeEmailButton: {
        alignItems: "center",
        marginTop: 20,
    },

    changeEmailText: {
        color: "#182A58",
        fontSize: 14,
        fontWeight: "600",
    },

});