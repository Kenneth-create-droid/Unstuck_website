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
import { Ionicons } from "@expo/vector-icons"; 
import Constants from "expo-constants";

export default function Signup() {
    const router = useRouter(); 

    const [firstname, setfirstname] = useState(""); 
    const [lastname, setlastname] = useState(""); 
    const [email, setemail] = useState("");
    const [password, setpassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Same dynamic API configuration used by your other Unstuck screens
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

    const handleSignup = async () => {

        // Prevent duplicate button presses
        if (isSubmitting) {
            return;
        }

        // ------------------------------------------------
        // 1. REQUIRED FIELD VALIDATION
        // ------------------------------------------------

        if (!firstname.trim() || 
            !lastname.trim() || 
            !email.trim() || 
            !password) {

            showAlert(
                "Error",
                "Please fill in all fields."
            );

            return;
        }

        // ------------------------------------------------
        // 2. NORMALIZE EMAIL
        // ------------------------------------------------

        const normalizedEmail = email.trim().toLowerCase();

        // ------------------------------------------------
        // 3. FRONTEND ONTARIO TECH DOMAIN CHECK
        // ------------------------------------------------
        // The backend ALSO performs this check.
        // This frontend check is only for faster user feedback.

        

        const allowedDomains = [
            "ontariotechu.net",
            "ontariotechu.ca",
            "gmail.com"
        ];

        const emailParts = normalizedEmail.split("@");

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

        // ------------------------------------------------
        // 4. REQUEST VERIFICATION EMAIL FROM BACKEND
        // ------------------------------------------------

        try {

            setIsSubmitting(true);

            const response = await fetch(`${API_URL}/signup`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify({
                    firstname: firstname.trim(),
                    lastname: lastname.trim(),
                    email: normalizedEmail,
                    password,
                }),
            });

            const data = await response.json();

            // ------------------------------------------------
            // 5. VERIFICATION EMAIL SUCCESSFULLY SENT
            // ------------------------------------------------

           if (response.ok) {

    // Normal production flow:
    // verification is required
    if (data.requiresVerification) {

        router.push({
            pathname: "/verify-email",
            params: {
                email: normalizedEmail
            }
        } as any);

        return;
    }

    // Development mode:
    // backend created the account immediately
    if (data.success && data.user) {

        showAlert(
            "Signup Successful",
            "Account created successfully.",
            () => {
                router.replace("/login" as any);
            }
        );

        return;
    }
}

        // Backend actually rejected signup
        showAlert(
            "Signup Failed",
            data.message || "An error occurred."
        );

                } catch (error) {

                    console.error("Signup error:", error);

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
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ScrollView 
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                onScrollBeginDrag={Keyboard.dismiss}
            >

                {/* Header */}

                <View style={styles.header}>

                    <Text style={styles.brandTitle}>
                        Unstuck
                    </Text>

                    <Text style={styles.subtitle}>
                        Get help quickly from someone nearby
                    </Text>

                    <View style={styles.divider} />

                </View>

                <Text style={styles.subtitle}>
                    Create your Ontario Tech account
                </Text>

                <View style={styles.formContainer}>

                    {/* FIRST NAME */}

                    <Text style={styles.label}>
                        First name
                    </Text>

                    <TextInput
                        onChangeText={setfirstname}
                        placeholder="First name" 
                        value={firstname} 
                        placeholderTextColor="#8E8E93" 
                        style={styles.input}
                        autoCapitalize="words"
                    />

                    {/* LAST NAME */}

                    <Text style={styles.label}>
                        Last name
                    </Text>

                    <TextInput 
                        onChangeText={setlastname}
                        value={lastname}
                        placeholder="Last name"
                        placeholderTextColor="#8E8E93" 
                        style={styles.input}
                        autoCapitalize="words"
                    />

                    {/* EMAIL */}

                    <Text style={styles.label}>
                        Ontario Tech Email
                    </Text>

                    <TextInput 
                        onChangeText={setemail}
                        value={email}
                        placeholder="name@ontariotechu.net"
                        placeholderTextColor="#8E8E93" 
                        style={styles.input} 
                        keyboardType="email-address" 
                        autoCapitalize="none"
                        autoCorrect={false}
                    />

                    <Text style={styles.emailHint}>
                        Only Ontario Tech affiliated email addresses are accepted.
                    </Text>

                    {/* PASSWORD */}

                    <Text style={styles.label}>
                        Password
                    </Text>

                    <View style={styles.passwordContainer}>

                        <TextInput 
                            onChangeText={setpassword}
                            value={password}
                            placeholder="Password"
                            placeholderTextColor="#8E8E93" 
                            style={styles.passwordInput} 
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                        />

                        <TouchableOpacity 
                            style={styles.eyeIcon} 
                            onPress={() => setShowPassword(!showPassword)}
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

                    {/* SIGNUP BUTTON */}

                    <TouchableOpacity
                        style={[
                            styles.button,
                            isSubmitting && styles.disabledButton
                        ]}
                        onPress={handleSignup}
                        disabled={isSubmitting}
                    >

                        {isSubmitting ? (

                            <ActivityIndicator
                                color="#FFFFFF"
                            />

                        ) : (

                            <Text style={styles.buttonText}>
                                Sign Up
                            </Text>

                        )}

                    </TouchableOpacity>

                    {/* LOGIN */}

                    <TouchableOpacity 
                        style={styles.loginLink} 
                        onPress={() =>
                            router.push("/login" as any)
                        }
                    >

                        <Text style={styles.loginLinkText}>

                            Already have an account?{" "}

                            <Text style={{ fontWeight: "bold" }}>
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

    label: {
        fontSize: 14,
        color: "#182A58",
        fontWeight: "500",
        marginTop: 8,
    },

    divider: {
        height: 1,
        backgroundColor: "#182A58",
        width: "100%",
    },

    formContainer: {
        marginTop: 10,
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