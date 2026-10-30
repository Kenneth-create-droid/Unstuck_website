import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";

export default function VerifyEmail() {
  const router = useRouter();

  // Email passed to this screen from signup.tsx
  const { email } = useLocalSearchParams<{ email: string }>();

  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyCooldown, setVerifyCooldown] = useState(0);

  const [isResending, setIsResending] = useState(false);
const [resendCooldown, setResendCooldown] = useState(0);

  // Same API configuration used by the other Unstuck screens
  const hostUri = Constants.expoConfig?.hostUri;
  const localIp = hostUri ? hostUri.split(":")[0] : "localhost";

  const API_URL =
    Platform.OS === "web"
      ? "http://localhost:2000"
      : `http://${localIp}:2000`;

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

  // ------------------------------------------------
  // VERIFY 6-DIGIT CODE
  // ------------------------------------------------

  const handleVerify = async () => {
    if (isVerifying) {
      return;
    }

    const cleanCode = code.trim();

    // Basic frontend validation
    if (!cleanCode) {
      showAlert(
        "Verification Code Required",
        "Please enter the verification code sent to your Ontario Tech email."
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
        "Your email address could not be found. Please return to signup and try again."
      );

      return;
    }

    try {
      setIsVerifying(true);

      const response = await fetch(
        `${API_URL}/signup/verify`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: String(email)
              .trim()
              .toLowerCase(),

            code: cleanCode,
          }),
        }
      );

      const data = await response.json();

      // --------------------------------------------
      // SUCCESS
      // --------------------------------------------

      if (response.ok && data.user) {
        // NOW the user actually exists.
        // Safe to create the local login session.
        await AsyncStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );

        showAlert(
          "Email Verified",
          "Your Unstuck account has been created successfully.",
          () => {
            router.replace("/home" as any);
          }
        );

        return;
      }

      // --------------------------------------------
// WRONG VERIFICATION CODE
// --------------------------------------------

if (response.status === 401) {
  showAlert(
    "Incorrect Code",
    data.message ||
      "The verification code is incorrect."
  );

  // Clear the wrong code so the student can try again
  setCode("");

  return;
}


// --------------------------------------------
// RATE LIMITED
// --------------------------------------------

if (response.status === 429) {

  const retryAfter =
    Number(data.retryAfter) || 60;

  // Start frontend countdown
  setVerifyCooldown(retryAfter);

  // Clear incorrect code
  setCode("");

  showAlert(
    "Too Many Attempts",
    data.message ||
      `Please wait ${retryAfter} seconds before trying again.`
  );

  return;
}


// --------------------------------------------
// OTHER ERRORS
// --------------------------------------------

showAlert(
  "Verification Failed",
  data.message ||
    "The verification code is incorrect or has expired."
);
    } catch (error) {
      console.error(
        "Email verification error:",
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

  const handleResend = async () => {
  if (isResending || resendCooldown > 0) {
    return;
  }

  if (!email) {
    showAlert(
      "Verification Error",
      "Your email address could not be found. Please return to signup and try again."
    );
    return;
  }

  try {
    setIsResending(true);

    const response = await fetch(
      `${API_URL}/signup/resend`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: String(email).trim().toLowerCase(),
        }),
      }
    );

    const data = await response.json();

    // Successful resend
    if (response.ok) {
      setCode("");

      // Backend currently returns cooldown: 60.
      setResendCooldown(
        Number(data.cooldown) || 60
      );

      showAlert(
        "Code Sent",
        "A new verification code was sent to your Ontario Tech email."
      );

      return;
    }

    // Backend rate limit / cooldown
    if (response.status === 429) {
      const retryAfter = Number(data.retryAfter) || 60;

      setResendCooldown(retryAfter);

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
        "We could not send another verification code."
    );

  } catch (error) {
    console.error(
      "Resend verification error:",
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
            onPress={() => router.back()}
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

            <View style={styles.iconContainer}>

              <Ionicons
                name="mail-outline"
                size={42}
                color="#182A58"
              />

            </View>


            <Text style={styles.title}>
              Verify Your Email
            </Text>


            <Text style={styles.description}>
              We sent a 6-digit verification
              code to your Ontario Tech email.
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
                // Only allow numbers
                const numbersOnly =
                  value.replace(/[^0-9]/g, "");

                // Maximum 6 digits
                setCode(
                  numbersOnly.slice(0, 6)
                );
              }}

              placeholder="000000"

              placeholderTextColor="#A0A0A0"

              keyboardType="number-pad"

              maxLength={6}

              textAlign="center"

              autoFocus

              returnKeyType="done"

              onSubmitEditing={handleVerify}
            />


            <Text style={styles.expirationText}>
              This code expires in 2 minutes.
            </Text>


            {/* VERIFY BUTTON */}

            <TouchableOpacity
             style={[
                styles.verifyButton,
                (isVerifying ||
                    code.length !== 6 ||
                    verifyCooldown > 0) &&
                    styles.disabledButton,
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

                <Text style={styles.verifyButtonText}>

                    {verifyCooldown > 0
                    ? `Try Again (${verifyCooldown}s)`
                    : "Verify Email"}

                </Text>

                )}
            </TouchableOpacity>

            {/* RESEND CODE */}

                <TouchableOpacity
                style={[
                    styles.resendButton,
                    (isResending || resendCooldown > 0) &&
                    styles.resendDisabledButton,
                ]}
                onPress={handleResend}
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
                    <Text style={styles.resendText}>
                    {resendCooldown > 0
                        ? `Resend Code (${resendCooldown}s)`
                        : "Didn't receive a code? Resend Code"}
                    </Text>
                )}
                </TouchableOpacity>


            {/* CHANGE EMAIL */}

            <TouchableOpacity
              style={styles.changeEmailButton}

              onPress={() => router.back()}
            >

              <Text style={styles.changeEmailText}>
                Wrong email? Return to signup
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

// Resend verification code button
resendButton: {
  alignItems: "center",
  justifyContent: "center",
  marginTop: 18,
  minHeight: 30,
},

// Makes the resend button visually disabled during cooldown
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