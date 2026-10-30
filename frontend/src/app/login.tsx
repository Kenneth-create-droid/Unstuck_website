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
    Keyboard 
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons"; 
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

export default function Login() {
    const router = useRouter(); 
    const [email, setemail] = useState("");
    const [password, setpassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const showAlert = (title: string, message: string, onOk?: () => void) => {
        if (Platform.OS === "web") {
            window.alert(`${title}: ${message}`);
            if (onOk) onOk();
        } else {
            Alert.alert(title, message, onOk ? [{ text: "OK", onPress: onOk }] : undefined);
        }
    };

    const handleLogin = async () => {
        if (!email || !password) {
            showAlert("Error", "Please fill in all fields.");
            return;
        }

        const hostUri = Constants.expoConfig?.hostUri;
            const localIp = hostUri ? hostUri.split(":")[0] : "localhost";

            const API_URL =
                Platform.OS === "web"
                    ? "http://localhost:2000"
                    : `http://${localIp}:2000`;
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const rawText = await response.text();
                console.error("Received non-JSON response:", rawText.substring(0, 300));
                showAlert("Server Error", "Received invalid response from server.");
                return;
            }

            const data = await response.json();

            if (response.ok) {
                await AsyncStorage.setItem("user", JSON.stringify(data.user));
                // Direct navigation to home screen
                router.replace("/home" as any);
            } else {
                showAlert("Login Failed", data.message || "Invalid credentials.");
            }
        } catch (error) {
            showAlert("Network Error", "Could not connect to the server.");
            console.error(error);
        }
    };

   const handleForgotPassword = () => {
    router.push("/forgot-password" as any);
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
                {/* Header Section */}
                <View style={styles.header}>
                    <Text style={styles.brandTitle}>Unstuck</Text>
                    <Text style={styles.subtitle}>Get help quickly from someone nearby</Text>
                    <View style={styles.divider} />
                </View>

                <Text style={styles.subtitle}>Please Login Below</Text>

                <View style={styles.formContainer}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput 
                        onChangeText={setemail}
                        value={email}
                        placeholder="email"
                        placeholderTextColor="#8E8E93" 
                        style={styles.input} 
                        keyboardType="email-address" 
                        autoCapitalize="none" 
                    />

                    <Text style={styles.label}>Password</Text>
                    <View style={styles.passwordContainer}>
                        <TextInput 
                            onChangeText={setpassword}
                            value={password}
                            placeholder="Password"
                            placeholderTextColor="#8E8E93" 
                            style={styles.passwordInput} 
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity 
                            style={styles.eyeIcon} 
                            onPress={() => setShowPassword(!showPassword)}
                        >
                            <Ionicons 
                                name={showPassword ? "eye-outline" : "eye-off-outline"} 
                                size={22} 
                                color="#182A58" 
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Forgot Password Button */}
                    <TouchableOpacity 
                        style={styles.forgotButton} 
                        onPress={handleForgotPassword}
                    >
                        <Text style={styles.forgotText}>Forgot Password?</Text>
                    </TouchableOpacity>

                    {/* Login Button */}
                    <TouchableOpacity style={styles.button} onPress={handleLogin}>
                        <Text style={styles.buttonText}>Log In</Text>
                    </TouchableOpacity>

                    {/* Navigation to Signup */}
                    <TouchableOpacity 
                        style={styles.signupLink} 
                        onPress={() => router.push("/signup" as any)}
                    >
                        <Text style={styles.signupLinkText}>
                            Don't have an account? <Text style={{ fontWeight: "bold" }}>Sign Up</Text>
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
  forgotButton: {
    alignSelf: "flex-end",
    marginTop: 4,
    marginBottom: 16,
  },
  forgotText: {
    color: "#182A58",
    fontSize: 14,
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#182A58",
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  signupLink: {
    marginTop: 20,
    alignItems: "center",
  },
  signupLinkText: {
    color: "#182A58",
    fontSize: 14,
  },
});