import react from "react";

// now we will also import view which is like div from html 
// we also import things like text to render any text in pur react page
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

// style sheet is for the color and designs similat to css
// touchable opacoity is to actually make the buttons fade 

// WE WILL ALSO IMPORT A ROUTER TO QUICKLY CHANGE AND NAVIGATE BETWEEN PAGES 
import { useRouter } from "expo-router"; 

function LandingPage() {

    // now we use our useRouter for useful purposes
    const router = useRouter(); // this will help us navigate between pages

    return (
    <View style={styles.container}> 

        {/* Header Section */}
        <View style={styles.header}>
            <Text style={styles.brandTitle}>Unstuck</Text>
            <Text style={styles.subtitle}>Get help quickly from someone nearby</Text>
            <View style={styles.divider} />
        </View>

        {/* Button Section */}
        <View style={styles.buttonContainer}>
            <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={() => router.push("/signup" as any)}
            >
                <Text style={styles.primaryButtonText}>Signup</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={() => router.push("/login" as any)}
            >
                <Text style={styles.secondaryButtonText}>Login</Text>
            </TouchableOpacity>
        </View>

    </View>
)
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 40,
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
  primaryButton: {
    backgroundColor: "#182A58",
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 16,
  },

  buttonContainer: {
    flex: 1,
    justifyContent: "flex-start", // Pushes buttons UP toward the top/divider
    paddingTop: 200,               // Adjust this number (e.g., 10, 20, 50) to fine-tune the distance


    width: "100%",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
    letterSpacing: 1,
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#182A58",
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#182A58",
    fontWeight: "bold",
    fontSize: 15,
    letterSpacing: 1,
  },
});

export default LandingPage; 

