import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, Check, LoaderCircle, MessageCircle, Send } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getChatSession,
  getChatMessages,
  sendChatMessage,
  completeMatch,
  redispatchMatch,
} from "../api";
import "./ChatPage.css";

export default function ChatPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const postId = params.get("postId");
  const { user } = useAuth();
  const userId = user?.id ? String(user.id) : "";
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const bottomRef = useRef(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [thankYouType, setThankYouType] = useState("helper");
  const closedRef = useRef(false);
  const pollingRef = useRef(false);

  const INACTIVITY_LIMIT = 5 * 60 * 1000;

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
      .then((data) => { if (active) setSession(data.session); })
      .catch((err) => { if (active) setError(err.message || "Unable to open chat."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [postId, userId]);

  
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
          <div className="unstuck-chat-contact">
            <strong>{session.otherUser?.firstname || "Student"}</strong>
            <span><span className="unstuck-chat-online" /> Connected</span>
          </div>
          <div className="unstuck-chat-header-actions">
            {isRequester && <button className="unstuck-chat-done" disabled={completing} onClick={() => setShowDone(true)}>Done <Check size={15} /></button>}
          </div>
        </header>
        <div className="unstuck-chat-messages" role="log" aria-label="Chat messages">
          <div className="unstuck-chat-inactivity-notice">
                <AlertCircle size={14} />
                <span>
                    Chats inactive for 5 minutes will be automatically closed.
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
                <p>{item.message}</p>
                <time>{item.sentAt ? new Date(Number(item.sentAt)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</time>
              </div>
            </div>;
          })}
          <div ref={bottomRef} />
        </div>
        <form className="unstuck-chat-composer" onSubmit={handleSend}>
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
      This chat was automatically closed after 5 minutes
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
