import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Check,
  LoaderCircle,
  MessageCircle,
    ChevronRight,
  Paperclip,
  Send
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getChatSession,
  getChatMessages,
  sendChatMessage,
  completeMatch,
  redispatchMatch,
} from "../api";

import "./ChatPage.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:2000";

export default function ChatPage() {

  const navigate = useNavigate();
  const [params] = useSearchParams();
  const postId = params.get("postId");
  const { user } = useAuth();
  const userId = user?.id ? String(user.id) : "";

  const loadMatchedProfile = async () => {
  if (!postId || !userId) return;

  try {
    const token = localStorage.getItem("unstuck_token");

    if (!token) return;

    const query = new URLSearchParams({
      postId,
      userId,
      includeProfile: "true"
    });

    const response = await fetch(
      `${API_BASE_URL}/api/chat/session?${query}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error("Unable to load matched student profile.");
    }

    const data = await response.json();

    setMatchedProfile(data.session?.otherUser || null);
  } catch (error) {
    console.error("[Chat] Matched profile failed:", error);
  }
};
  const [session, setSession] = useState(null);
  const [matchedProfile, setMatchedProfile] = useState(null);

  const [showMatchedProfile, setShowMatchedProfile] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const fileInputRef = useRef(null);
const [uploading, setUploading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const bottomRef = useRef(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [thankYouType, setThankYouType] = useState("helper");
  const closedRef = useRef(false);
  const pollingRef = useRef(false);

 const INACTIVITY_LIMIT = 60 * 60 * 1000;

const lastActivityRef = useRef(Date.now());
const latestMessageIdRef = useRef(null);


const helperRedirectedRef = useRef(false);

const closeHelperChat = useCallback(() => {
  if (helperRedirectedRef.current) return;

  helperRedirectedRef.current = true;
  closedRef.current = true;

  setShowThankYou(true);
}, [navigate]);


  useEffect(() => {
    let active = true;
    closedRef.current = false;
    helperRedirectedRef.current = false;
    lastActivityRef.current = Date.now();
    latestMessageIdRef.current = null;
    setLoading(true);
    setError("");
    setSession(null);
    setMessages([]);
    if (!postId || !userId) {
      setError("Missing request or login information.");
      setLoading(false);
      return () => { active = false; };
    }
   getChatSession(postId, userId)
  .then((data) => {
    if (active) {
      setSession(data.session);
    }
  })
      .catch((err) => { if (active) setError(err.message || "Unable to open chat."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [postId, userId]);

  useEffect(() => {
  if (!session || !postId || !userId) return;

  setMatchedProfile(null);
  loadMatchedProfile();
}, [session?.postId, postId, userId]);


const loadMessages = useCallback(async () => {
  if (
    !postId ||
    !userId ||
    !session ||
    closedRef.current ||
    pollingRef.current
  ) return;

  pollingRef.current = true;

  try {
    // Check whether the chat session is still active.
    if (session.role === "HELPER") {
      const sessionData = await getChatSession(postId, userId);

      if (!sessionData?.session) {
        closeHelperChat();
        return;
      }

      const currentSession = sessionData.session;

      if (
        currentSession.status === "COMPLETED" ||
        currentSession.status === "CLOSED" ||
        currentSession.status === "ENDED" ||
        currentSession.status === "REDISPATCHED"
      ) {
        closeHelperChat();
        return;
      }
    }

    const data = await getChatMessages(postId, userId);

   if (!closedRef.current) {
  const incomingMessages = data.messages || [];

  const latestMessage = incomingMessages.at(-1);

  if (latestMessage) {
    const latestId = String(latestMessage.id);

    if (latestMessageIdRef.current === null) {
      latestMessageIdRef.current = latestId;

      const sentAt = Number(latestMessage.sentAt);

      if (Number.isFinite(sentAt) && sentAt > 0) {
        lastActivityRef.current = Math.max(
          lastActivityRef.current,
          sentAt
        );
      }
    } else if (latestMessageIdRef.current !== latestId) {
      latestMessageIdRef.current = latestId;
      lastActivityRef.current = Date.now();
    }
  }

  setMessages(incomingMessages);
}
  } catch (err) {
    if (
      session.role === "HELPER" &&
      (err.status === 404 || err.status === 409 || err.status === 410)
    ) {
      closeHelperChat();
    } else {
      console.error("[Chat] Poll failed:", err);
    }
  } finally {
    pollingRef.current = false;
  }
}, [postId, userId, session, closeHelperChat]);


  useEffect(() => {
    if (!session) return;
    loadMessages();
    const timer = setInterval(loadMessages, 1000);
    return () => clearInterval(timer);
  }, [session, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleAttachmentDownload = async (attachment) => {
  if (!postId || !attachment?.publicId) return;

  try {
    const token = localStorage.getItem("unstuck_token");
    if (!token) throw new Error("Please log in again.");

    const query = new URLSearchParams({
      postId,
      publicId: attachment.publicId
    });

    const response = await fetch(
     `${API_BASE_URL}/api/chat/attachment?${query}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error("Unable to download attachment.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = attachment.name || "attachment";
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    window.alert(error.message || "Download failed.");
  }
};

  const handleFileUpload = async (file) => {
  if (!file || !postId || !userId || uploading || closedRef.current) return;

  if (file.size > 10 * 1024 * 1024) {
    window.alert("Files must be 10 MB or smaller.");
    return;
  }

  setUploading(true);

  try {
    const formData = new FormData();
    formData.append("postId", postId);
    formData.append("userId", userId);
    formData.append("file", file);

    const token = localStorage.getItem("unstuck_token");

    if (!token) {
      throw new Error("Please log in again.");
    }

    const response = await fetch(
   `${API_BASE_URL}/api/chat/upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "File upload failed.");
    }

    // The backend creates a chat message for the attachment.
    if (data.chatMessage) {
      setMessages((previous) =>
        previous.some((m) => String(m.id) === String(data.chatMessage.id))
          ? previous
          : [...previous, data.chatMessage]
      );
    }

    lastActivityRef.current = Date.now();

    console.log("[Chat] Attachment uploaded:", data.attachment?.name);
  } catch (error) {
    console.error("[Chat] Upload failed:", error);
    window.alert(error.message || "Unable to upload attachment.");
  } finally {
    setUploading(false);
  }
};

  const handleSend = async (event) => {
    event.preventDefault();
    const text = messageText.trim();
    if (!text || !postId || !userId || sending || closedRef.current) return;
    setSending(true);
    try {

const data = await sendChatMessage(postId, userId, text);

setMessageText("");

// Reset inactivity timer after successfully sending a message
lastActivityRef.current = Date.now();

if (data.message?.id != null) {
  latestMessageIdRef.current = String(data.message.id);
}

      if (data.message) {
        setMessages((prev) => prev.some((m) => String(m.id) === String(data.message.id))
          ? prev : [...prev, data.message]);
      }
    } catch (err) {
      window.alert(err.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleDoneChoice = async (resolved) => {
    if (completing || !postId || !userId || session?.role !== "REQUESTER") return;
    setCompleting(true);
    try {

            if (resolved) {
            await completeMatch(postId, userId);

            closedRef.current = true;

            setShowDone(false);
            setThankYouType("requester");
            setShowThankYou(true);
            }

      else {
        await redispatchMatch(postId, userId);
        closedRef.current = true;
        navigate(`/search?postId=${encodeURIComponent(postId)}&redispatch=true`, { replace: true });
      }
    } catch (err) {
      window.alert(err.message || "Unable to update this request.");
    } finally {
      setCompleting(false);
      setShowDone(false);
    }
  };


useEffect(() => {
  if (!session || !postId || !userId) return;

  const interval = setInterval(() => {
    if (closedRef.current) return;

    const inactiveFor = Date.now() - lastActivityRef.current;


if (inactiveFor >= INACTIVITY_LIMIT) {
  closedRef.current = true;

  setThankYouType("timeout");
  setShowThankYou(true);
}

  }, 1000);

  return () => clearInterval(interval);
}, [session, postId, userId, navigate]);


  if (loading) return <main className="unstuck-chat-state"><LoaderCircle className="unstuck-spin" size={32} /><p>Connecting to chat...</p></main>;
  if (error || !session) return <main className="unstuck-chat-state"><AlertCircle size={48} /><h2>Unable to Open Chat</h2><p>{error || "Chat session could not be loaded."}</p><button onClick={() => navigate("/home")}>Back to Home</button></main>;

  const isRequester = session.role === "REQUESTER";
  return (
    <main className="unstuck-chat-page">
      <section className="unstuck-chat-panel" aria-label="Help request chat">
        <header className="unstuck-chat-header">
          <div className="unstuck-chat-header-spacer" />
          <button
  type="button"
  className="unstuck-chat-contact unstuck-chat-profile-trigger"
  onClick={() => setShowMatchedProfile(true)}
  aria-label="View matched student's profile"
>
  <strong>
  {session.otherUser?.firstname || "Student"}
</strong>

<span className="unstuck-chat-profile-link">
  View Profile
  <ChevronRight size={14} />
</span>
</button>

          <div className="unstuck-chat-header-actions">
            {isRequester && <button className="unstuck-chat-done" disabled={completing} onClick={() => setShowDone(true)}>Done <Check size={15} /></button>}
          </div>
        </header>
        <div className="unstuck-chat-messages" role="log" aria-label="Chat messages">
          <div className="unstuck-chat-inactivity-notice">
                <AlertCircle size={14} />
                <span>
                    Chats inactive for 1hr will be automatically closed.
                </span>
                </div>
          {messages.length === 0 && (
                <div className="unstuck-chat-welcome">
                    <span className="unstuck-chat-welcome-emoji">👋</span>

                    <h3>You're connected!</h3>

                    <p>
                    Say hi and introduce yourself!
                    A friendly greeting is a great way to start helping each other.
                    </p>

                    <button
                    type="button"
                    onClick={() =>
                        setMessageText(
                        "Hey! 👋 Nice to meet you. How's your day going?"
                        )
                    }
                    >
                    ✨ Use a friendly greeting
                    </button>
                </div>
)}

          {messages.map((item) => {
            const mine = String(item.senderId) === userId;
            return <div className={`unstuck-chat-message-row ${mine ? "mine" : "theirs"}`} key={item.id}>
              <div className="unstuck-chat-bubble">
                {item.message && <p>{item.message}</p>}

                {item.attachment?.publicId && (
                  <button
                    type="button"
                    className="unstuck-chat-attachment"
                    onClick={() => handleAttachmentDownload(item.attachment)}
                    title="Download attachment"
                  >
                    <Paperclip size={17} />
                    <span>
                      {item.attachment.name || "Attachment"}
                      {Number.isFinite(Number(item.attachment.size)) && (
                        <small>
                          {" "}
                          ({(Number(item.attachment.size) / 1024).toFixed(1)} KB)
                        </small>
                      )}
                    </span>
                  </button>
                )}
                <time>{item.sentAt ? new Date(Number(item.sentAt)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</time>
              </div>
            </div>;
          })}
          <div ref={bottomRef} />
        </div>
        <form className="unstuck-chat-composer" onSubmit={handleSend}>

          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.txt"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (file) {
                handleFileUpload(file);
              }

              e.target.value = "";
            }}
          />

          <button
            type="button"
            aria-label="Attach file"
            title="Attach a file"
            disabled={uploading || completing}
            onClick={() => fileInputRef.current?.click()}
          >
                      {uploading ? (
              <LoaderCircle className="unstuck-spin" size={19} />
            ) : (
              <Paperclip size={19} />
            )}
          </button>
          <textarea aria-label="Message" placeholder="Type a message..." value={messageText} maxLength={1000} rows={1} onChange={(e) => setMessageText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
          <button type="submit" aria-label="Send message" disabled={!messageText.trim() || sending}>{sending ? <LoaderCircle className="unstuck-spin" size={19} /> : <Send size={19} />}</button>
        </form>
      </section>


{showThankYou && (
  <div className="unstuck-thankyou-overlay">
    <div
      className="unstuck-thankyou-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unstuck-thankyou-title"
    >
      <div className="unstuck-thankyou-icon">
        <Check size={30} />
      </div>


{thankYouType === "timeout" ? (
  <>
    <h2>Chat Timed Out</h2>
    <p>
      This chat was automatically closed after 1 hour
      of inactivity. Thank you for being part of the
      Unstuck community! We're always here when you
      need a helping hand.
    </p>
  </>
) : thankYouType === "requester" ? (
  <>
    <h2>Glad We Could Help!</h2>
    <p>
      We're happy you got the support you needed!
      Whenever you need a helping hand, Unstuck
      will be here to connect you with fellow students.
    </p>
  </>
) : (
  <>
    <h2>Thank You for Helping!</h2>
    <p>
      Thank you for taking the time to help a fellow student.
      Your kindness makes the Unstuck community stronger!
    </p>
  </>
)}


      <button
        type="button"
        onClick={() => navigate("/home", { replace: true })}
      >
        Return Home
      </button>
    </div>
  </div>
)}

{showMatchedProfile && (
  <div
    className="unstuck-chat-modal-backdrop"
    onClick={() => setShowMatchedProfile(false)}
  >
    <section
      className="unstuck-matched-profile-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="matched-profile-title"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="unstuck-matched-profile-close"
        onClick={() => setShowMatchedProfile(false)}
        aria-label="Close profile"
      >
        ×
      </button>

      <h2 id="matched-profile-title">
        {[
          session.otherUser?.firstname,
          session.otherUser?.lastname
        ].filter(Boolean).join(" ") || "Student Profile"}
      </h2>

      {!matchedProfile ? (
        <p>Profile information is unavailable.</p>
      ) : (
        <>
          <div className="unstuck-matched-profile-stat">
            <span>People Helped</span>
            <strong>{matchedProfile.peopleHelped ?? 0}</strong>
          </div>

          <div className="unstuck-matched-profile-stat">
            <span>Reliability Score</span>
            <strong>
              {matchedProfile.reliabilityEstablished
                ? `${matchedProfile.reliabilityScore}/100`
                : "Not yet established"}
            </strong>
          </div>

          {matchedProfile.reliabilityEstablished && (
            <>
              <div className="unstuck-matched-profile-stat">
                <span>Response Score</span>
                <strong>{matchedProfile.responseScore}/100</strong>
              </div>

              <div className="unstuck-matched-profile-stat">
                <span>Completion Score</span>
                <strong>{matchedProfile.completionScore}/100</strong>
              </div>
            </>
          )}
        </>
      )}
    </section>
  </div>
)}

      {showDone && <div className="unstuck-chat-modal-backdrop" role="presentation" onClick={() => !completing && setShowDone(false)}>
        <section className="unstuck-chat-modal" role="dialog" aria-modal="true" aria-labelledby="unstuck-chat-done-title" onClick={(e) => e.stopPropagation()}>
          <h2 id="unstuck-chat-done-title">Was your issue resolved?</h2>
          <p>Let us know whether you got the help you needed.</p>
          <div className="unstuck-chat-modal-actions">
            <button disabled={completing} onClick={() => setShowDone(false)}>Cancel</button>
            <button disabled={completing} onClick={() => handleDoneChoice(false)}>No, find another helper</button>
            <button disabled={completing} className="primary" onClick={() => handleDoneChoice(true)}>{completing ? "Please wait..." : "Yes, resolved"}</button>
          </div>
        </section>
      </div>}
    </main>
  );
}
