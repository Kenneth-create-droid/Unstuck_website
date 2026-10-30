import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";

import {
  useLocalSearchParams,
  useRouter
} from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";

      type ChatSession = {
        postId: string;
        requesterId: string;
        helperId: string;
        role: "REQUESTER" | "HELPER";
        status: string;

        otherUser: {
          id: string;
          firstname: string;
          lastname: string;
        };
      };

    type ChatMessage = {
      id: string;
      senderId: string;
      message: string;
      sentAt: number;
    };

export default function ChatScreen() {

  const router = useRouter();
  const { postId, matchedUserId } = useLocalSearchParams<{
  postId: string;
  matchedUserId?: string;
}>();
  

  const [session, setSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentUserId, setCurrentUserId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [completing, setCompleting] = useState(false);

  // ------------------------------------------
  // API URL
  // ------------------------------------------

  const hostUri = Constants.expoConfig?.hostUri;
  const localIp = hostUri ? hostUri.split(":")[0] : "localhost";

  const API_URL =
    Platform.OS === "web"
      ? "http://localhost:2000"
      : `http://${localIp}:2000`;

  // ------------------------------------------
  // LOAD CHAT SESSION
  // ------------------------------------------

  useEffect(() => {
    const loadChatSession = async () => {
      try {
        setLoading(true);
        setError("");

        setSession(null);
        setMessages([]);
        setMessageText("");


        // Get currently logged-in user
        const storedUser = await AsyncStorage.getItem("user");

        if (!storedUser) {
          setError("Unable to identify the logged-in user.");
          return;
        }

        const user = JSON.parse(storedUser);

        if (!user?.id) {
          setError("User information is incomplete.");
          return;
        }
        setCurrentUserId(String(user.id));

        if (!postId) {
          setError("Request information is missing.");
          return;
        }

        // Ask backend to verify this user belongs to the match
        const response = await fetch(
          `${API_URL}/api/chat/session?postId=${encodeURIComponent(
            postId
          )}&userId=${encodeURIComponent(String(user.id))}`
        );

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Unable to load chat session.");
          return;
        }

        setSession(data.session);
      } catch (err) {
        console.error("[Chat] Failed to load session:", err);
        setError("Unable to connect to the chat.");
      } finally {
        setLoading(false);
      }
    };

    loadChatSession();
  }, [postId, matchedUserId]);

  // ------------------------------------------
// LOAD / POLL CHAT MESSAGES
// ------------------------------------------

useEffect(() => {
  if (!session || !currentUserId || !postId) {
    return;
  }

  let active = true;

  const loadMessages = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/chat/messages?postId=${encodeURIComponent(
          postId
        )}&userId=${encodeURIComponent(currentUserId)}`
      );

     const data = await response.json();

if (!active) return;

if (response.ok) {
  setMessages(data.messages || []);
  return;
}

// The requester completed the request.
// The backend has deleted/closed the active chat,
// so send the helper back home.
if (
  session.role === "HELPER" &&
  (response.status === 404 || response.status === 409)
) {
  clearInterval(interval);

  Alert.alert(
    "Request Completed",
    "The requester marked this request as resolved.",
    [
      {
        text: "OK",
        onPress: () => {
          router.replace("/home");
        },
      },
    ],
    { cancelable: false }
  );
}
    } catch (err) {
      console.error("[Chat] Failed to load messages:", err);
    }
  };

  // Load immediately
  loadMessages();

  // Then check for new messages every second
  const interval = setInterval(loadMessages, 1000);

  return () => {
    active = false;
    clearInterval(interval);
  };
}, [session, currentUserId, postId, matchedUserId]);

// ------------------------------------------
// SEND MESSAGE
// ------------------------------------------

const sendMessage = async () => {
  const trimmedMessage = messageText.trim();

  if (
    !trimmedMessage ||
    !postId ||
    !currentUserId ||
    sending
  ) {
    return;
  }

  try {
    setSending(true);

    const response = await fetch(
      `${API_URL}/api/chat/message`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          userId: currentUserId,
          message: trimmedMessage,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "[Chat] Send failed:",
        data.message
      );
      return;
    }

    // Clear textbox
    setMessageText("");

    // Show sender's message immediately.
    setMessages((previousMessages) => {
      const alreadyExists =
        previousMessages.some(
          (item) => item.id === data.message.id
        );

      if (alreadyExists) {
        return previousMessages;
      }

      return [
        ...previousMessages,
        data.message,
      ];
    });

  } catch (err) {
    console.error(
      "[Chat] Failed to send message:",
      err
    );
  } finally {
    setSending(false);
  }
};

// ------------------------------------------
// COMPLETE RESOLVED REQUEST
// ------------------------------------------

const completeRequest = async () => {
  if (!postId || !currentUserId || completing) {
    return;
  }

  try {
    setCompleting(true);

    const response = await fetch(
      `${API_URL}/api/chat/complete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          userId: currentUserId,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      Alert.alert(
        "Unable to Complete",
        data.message || "The request could not be completed."
      );
      return;
    }

    // Request successfully resolved
   if (Platform.OS === "web") {
  window.alert(
    "Request Resolved\n\nGlad you got the help you needed."
  );

  router.replace("/home");
} else {
  Alert.alert(
    "Request Resolved",
    "Glad you got the help you needed.",
    [
      {
        text: "OK",
        onPress: () => {
          router.replace("/home");
        },
      },
    ],
    { cancelable: false }
  );
}
  } catch (err) {
    console.error(
      "[Chat] Failed to complete request:",
      err
    );

    Alert.alert(
      "Connection Error",
      "Unable to complete the request. Please try again."
    );
  } finally {
    setCompleting(false);
  }
};

// ------------------------------------------
// REDISPATCH UNRESOLVED REQUEST
// ------------------------------------------

const redispatchRequest = async () => {
  if (!postId || !currentUserId || completing) {
    return;
  }

  try {
    setCompleting(true);

    const response = await fetch(
      `${API_URL}/api/chat/redispatch`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          userId: currentUserId,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      if (Platform.OS === "web") {
        window.alert(
          data.message || "Unable to find another helper."
        );
      } else {
        Alert.alert(
          "Unable to Find Another Helper",
          data.message || "Please try again."
        );
      }

      return;
    }

    // Redispatch has started.
    // Send requester back to the existing searching page.
    router.replace({
        pathname: "/searching",
        params: {
          postId: String(postId),
          redispatch: "true",
        },
      });

  } catch (err) {
    console.error(
      "[Chat] Failed to redispatch request:",
      err
    );

    if (Platform.OS === "web") {
      window.alert(
        "Unable to search for another helper. Please try again."
      );
    } else {
      Alert.alert(
        "Connection Error",
        "Unable to search for another helper. Please try again."
      );
    }
  } finally {
    setCompleting(false);
  }
};

// ------------------------------------------
// DONE CONFIRMATION
// ------------------------------------------

const handleDonePress = () => {
  if (!session || session.role !== "REQUESTER") {
    return;
  }

  // ------------------------------------------
  // WEB
  // ------------------------------------------

  if (Platform.OS === "web") {
    const resolved = window.confirm(
      "Was your issue resolved?\n\nPress OK for Yes or Cancel for No."
    );

          if (resolved) {
        completeRequest();
      } else {
        redispatchRequest();
      }

    return;
  }

  // ------------------------------------------
  // IOS / ANDROID
  // ------------------------------------------

  Alert.alert(
    "Was your issue resolved?",
    "Let us know whether you got the help you needed.",
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "No",
        onPress: redispatchRequest,
      },
      {
        text: "Yes",
        onPress: completeRequest,
      },
    ]
  );
};

  // ------------------------------------------
  // ERROR
  // ------------------------------------------

  if (error || !session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons
            name="alert-circle-outline"
            size={54}
            color="#DC3545"
          />

          <Text style={styles.errorTitle}>
            Unable to Open Chat
          </Text>

          <Text style={styles.errorText}>
            {error || "Chat session could not be loaded."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isRequester = session.role === "REQUESTER";

  // ------------------------------------------
  // CHAT PAGE
  // ------------------------------------------

  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}

      <View style={styles.header}>
        <View style={styles.headerSide} />

        <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
                {session.otherUser.firstname}
              </Text>

          <Text style={styles.headerSubtitle}>
            Connected
          </Text>
        </View>

        <View style={styles.headerSide}>
          {isRequester && (
            <TouchableOpacity
                style={[
                  styles.doneButton,
                  completing && { opacity: 0.5 },
                ]}
                onPress={handleDonePress}
                disabled={completing}
              >
              <Text style={styles.doneButtonText}>
                Done
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* CHAT */}

             <KeyboardAvoidingView
                style={styles.chatContainer}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={0}
              >

                <FlatList
                  data={messages}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={[
                    styles.messagesList,
                    messages.length === 0 && styles.emptyMessagesList,
                  ]}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => {
                    const isMine =
                      String(item.senderId) ===
                      String(currentUserId);

                    return (
                      <View
                        style={[
                          styles.messageRow,
                          isMine
                            ? styles.myMessageRow
                            : styles.otherMessageRow,
                        ]}
                      >
                        <View
                          style={[
                            styles.messageBubble,
                            isMine
                              ? styles.myMessageBubble
                              : styles.otherMessageBubble,
                          ]}
                        >
                          <Text
                            style={[
                              styles.messageText,
                              isMine
                                ? styles.myMessageText
                                : styles.otherMessageText,
                            ]}
                          >
                            {item.message}
                          </Text>

                          <Text
                            style={[
                              styles.messageTime,
                              isMine &&
                                styles.myMessageTime,
                            ]}
                          >
                            {new Date(
                              item.sentAt
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                        </View>
                      </View>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.emptyChat}>
                      <Ionicons
                        name="chatbubbles-outline"
                        size={52}
                        color="#ADB5BD"
                      />

                      <Text style={styles.emptyChatTitle}>
                        Start the conversation
                      </Text>

                      <Text style={styles.emptyChatText}>
                        You're connected. Send a message below.
                      </Text>
                    </View>
                  }
                />

                {/* MESSAGE INPUT */}

                <View style={styles.inputArea}>
                  <TextInput
                    style={styles.messageInput}
                    value={messageText}
                    onChangeText={setMessageText}
                    placeholder="Type a message..."
                    placeholderTextColor="#8E8E93"
                    multiline
                    maxLength={1000}
                    onSubmitEditing={() => {
                      if (Platform.OS === "web") {
                        sendMessage();
                      }
                    }}
                  />

                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      (!messageText.trim() || sending) &&
                        styles.sendButtonDisabled,
                    ]}
                    onPress={() => {
                      Keyboard.dismiss();
                      sendMessage();
                    }}
                    disabled={
                      !messageText.trim() || sending
                    }
                  >
                    {sending ? (
                      <ActivityIndicator
                        size="small"
                        color="#FFFFFF"
                      />
                    ) : (
                      <Ionicons
                        name="send"
                        size={20}
                        color="#FFFFFF"
                      />
                    )}
                  </TouchableOpacity>
                </View>

</KeyboardAvoidingView>

      

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
  flex: 1,
  backgroundColor: "#F8F9FA",
  paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
},

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    backgroundColor: "#FFFFFF",
  },

  headerSide: {
    width: 80,
    alignItems: "flex-end",
  },

  headerCenter: {
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#182A58",
  },

  headerSubtitle: {
    fontSize: 12,
    color: "#28A745",
    marginTop: 2,
    fontWeight: "600",
  },

  doneButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#182A58",
    borderRadius: 8,
  },

  doneButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: "#6C757D",
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#182A58",
    marginTop: 16,
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: "#6C757D",
    marginBottom: 12,
  },

  chatContainer: {
  flex: 1,
},

messagesList: {
  paddingHorizontal: 16,
  paddingTop: 16,
  paddingBottom: 12,
},

emptyMessagesList: {
  flexGrow: 1,
},

emptyChat: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 30,
},

emptyChatTitle: {
  marginTop: 14,
  fontSize: 18,
  fontWeight: "700",
  color: "#182A58",
},

emptyChatText: {
  marginTop: 6,
  fontSize: 14,
  color: "#8E8E93",
  textAlign: "center",
},

messageRow: {
  width: "100%",
  marginBottom: 10,
},

myMessageRow: {
  alignItems: "flex-end",
},

otherMessageRow: {
  alignItems: "flex-start",
},

messageBubble: {
  maxWidth: "78%",
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 18,
},

myMessageBubble: {
  backgroundColor: "#182A58",
  borderBottomRightRadius: 5,
},

otherMessageBubble: {
  backgroundColor: "#FFFFFF",
  borderWidth: 1,
  borderColor: "#E9ECEF",
  borderBottomLeftRadius: 5,
},

messageText: {
  fontSize: 16,
  lineHeight: 21,
},

myMessageText: {
  color: "#FFFFFF",
},

otherMessageText: {
  color: "#212529",
},

messageTime: {
  fontSize: 10,
  color: "#8E8E93",
  marginTop: 5,
  alignSelf: "flex-end",
},

myMessageTime: {
  color: "#D7DCEA",
},

  inputArea: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 12,
  paddingVertical: 10,

  // Physically lift the whole message bar above Android controls
  marginBottom: Platform.OS === "android" ? 60 : 0,

  backgroundColor: "#FFFFFF",
  borderTopWidth: 1,
  borderTopColor: "#E9ECEF",
  gap: 8,
},

      messageInput: {
        flex: 1,
        minHeight: 44,
        maxHeight: 110,
        backgroundColor: "#F1F3F5",
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingTop: 11,
        paddingBottom: 11,
        fontSize: 16,
        color: "#212529",
      },

sendButton: {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: "#182A58",
  alignItems: "center",
  justifyContent: "center",
},

sendButtonDisabled: {
  opacity: 0.45,
},

  meta: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 3,
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#182A58",
    marginTop: 14,
  },

  errorText: {
    fontSize: 14,
    color: "#6C757D",
    textAlign: "center",
    marginTop: 8,
  },
});