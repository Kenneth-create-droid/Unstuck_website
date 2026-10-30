import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LogOut, 
  MapPin, 
  User, 
  Send, 
  Radio, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Sparkles, 
  HelpCircle,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  Compass,
  Layers,
  Award,
  Zap,
  BookOpen
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { 
  activateLocation, 
  deactivateLocation, 
  getUserStatus, 
  submitHelpRequest, 
  getRequestStatus, 
  acceptOffer, 
  passOffer, 
  cancelHelpRequest,
  getChatSession,
  sendChatMessage,
  completeMatch,
  DEFAULT_CAMPUS_LOCATION 
} from "../api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./HomePageSimple.css";

// Match the Expo app's 30-second GPS refresh interval.
const LOCATION_SYNC_MS = 30 * 1000;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:2000";

const REQUEST_COURSES = [
  { code: "", name: "General Campus Help (No Course)" },
  { code: "ENGR 4111U", name: "Capstone Systems Design I" },
  { code: "SOFE 4790U", name: "Distributed Systems" },
  { code: "SOFE 4590U", name: "Embedded Systems" },
  { code: "SOFE 4640U", name: "Mobile Application Development" },
  { code: "SOFE 4850U", name: "User Experience Design" },
  { code: "ARTE 4110U", name: "Deep Learning Architecture and Algorithms" }
];

export default function HomePage() {
  const { user, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
  window.scrollTo(0, 0);
}, []);

  // Availability & Location State
  const [isAvailable, setIsAvailable] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(DEFAULT_CAMPUS_LOCATION);
  const [locationStatus, setLocationStatus] = useState("Off");
  const lastLocationRef = useRef(null);
  const locationTimerRef = useRef(null);
  const availabilityRef = useRef(false);
  const locationBusyRef = useRef(false);
  const availabilityGenerationRef = useRef(0);
  

  // Incoming Help Offer State (Candidate mode)
  const [incomingOffer, setIncomingOffer] = useState(null);
  const passedOffersRef = useRef(new Set());
  const [countdown, setCountdown] = useState(null);
  const enteringChatRef = useRef(false);
  const mountedRef = useRef(true);
  const [selectedCourse, setSelectedCourse] = useState("");
 

  // Help Request Modal State (Requester mode)
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submittingReq, setSubmittingReq] = useState(false);
  const [reqError, setReqError] = useState("");

  // Searching State (Requester waiting for match)
  const [activePostId, setActivePostId] = useState(null);
  const [searchJob, setSearchJob] = useState(null);

  // Active Chat Session
  const [activeChat, setActiveChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

  // System notification
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else {
      refreshProfile();
    }
  }, [user]);

  // On unmount, stop GPS tracking and release availability in Redis.
  // This cleanup runs on unmount, NOT every time isAvailable changes.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      availabilityGenerationRef.current += 1;
      if (locationTimerRef.current) clearInterval(locationTimerRef.current);
      locationTimerRef.current = null;
     if (
        availabilityRef.current &&
        user?.id &&
        !enteringChatRef.current
      ) {
        deactivateLocation({ userId: user.id }).catch((err) =>
          console.error("Unmount deactivation failed:", err)
        );
      }
      availabilityRef.current = false;
    };
  }, [user?.id]);

  const stopLocationTracking = () => {
    availabilityGenerationRef.current += 1;
    availabilityRef.current = false;
    if (locationTimerRef.current) clearInterval(locationTimerRef.current);
    locationTimerRef.current = null;
    lastLocationRef.current = null;
    setIsAvailable(false);
    setLocationStatus("Off");
    setIncomingOffer(null);
    setCountdown(null);
  };

  // Use the same payload as the working Expo app.
  const syncLocation = async (generation) => {
    if (!availabilityRef.current || locationBusyRef.current ||
        generation !== availabilityGenerationRef.current || !user?.id) return;

    locationBusyRef.current = true;
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 12000,
          maximumAge: 10000
        });
      });
      if (!availabilityRef.current || generation !== availabilityGenerationRef.current) return;

      const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const oldCoords = lastLocationRef.current;
      if (!oldCoords) return;

      const response = await fetch(`${API_BASE_URL}/api/location/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          oldLat: oldCoords.lat,
          oldLng: oldCoords.lng,
          newLat: newCoords.lat,
          newLng: newCoords.lng
        })
      });
      if (!response.ok) throw new Error(`Location update failed (${response.status})`);
      if (!availabilityRef.current || generation !== availabilityGenerationRef.current) return;

      lastLocationRef.current = newCoords;
      setCurrentCoords(newCoords);
      console.log("[Location] Redis spatial position updated", newCoords);
    } catch (err) {
      console.error("Location sync error:", err);
      // Keep the previous known coordinates; retry at the next interval.
    } finally {
      locationBusyRef.current = false;
    }
  };

  // ---------------- 1. AVAILABILITY & REDIS SPATIAL TOGGLE ----------------
  const handleToggleAvailable = async (e) => {
    const nextState = e.target.checked;
    if (!user?.id) return;

    if (nextState) {
      if (availabilityRef.current) return;
      const generation = ++availabilityGenerationRef.current;
      setLocationStatus("Locating...");

      if (!("geolocation" in navigator)) {
        setLocationStatus("Off");
        showNotice("Location needed", "Your browser does not support location access.");
        return;
      }

      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 8000
          });
        });
        if (!mountedRef.current || generation !== availabilityGenerationRef.current) return;

        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        await activateLocation({ userId: user.id, lat: coords.lat, lng: coords.lng });
        if (!mountedRef.current || generation !== availabilityGenerationRef.current) {
          await deactivateLocation({ userId: user.id }).catch(() => {});
          return;
        }

        lastLocationRef.current = coords;
        availabilityRef.current = true;
        setCurrentCoords(coords);
        setIsAvailable(true);
        setLocationStatus("Active (Redis H3 Indexed)");
        showNotice("Active in Keneca Mesh", `Your ID #${user.id} is now registered in the Redis H3 spatial index.`);

        locationTimerRef.current = setInterval(() => {
          syncLocation(generation);
        }, LOCATION_SYNC_MS);
      } catch (err) {
        console.error("Failed to activate location:", err);
        if (mountedRef.current && generation === availabilityGenerationRef.current) {
          setIsAvailable(false);
          setLocationStatus("Off");
          showNotice("Location needed", "Enable location access and check your connection to receive nearby requests.");
        }
      }
    } else {
      stopLocationTracking();
      try {
        await deactivateLocation({ userId: user.id });
        showNotice("Offline", "You have been safely removed from the Redis spatial index.");
      } catch (err) {
        console.error("Failed to deactivate in Redis:", err);
        showNotice("Error", "Could not confirm deactivation in Redis.");
      }
    }
  };

  // ---------------- 2. ACTIVE POLLING FOR CANDIDATE OFFERS ----------------
  useEffect(() => {
    if (!isAvailable || !user?.id) {
      setIncomingOffer(null);
      return;
    }

    let timeoutId = null;
    let active = true;

    const pollStatus = async () => {
      try {
        const data = await getUserStatus(user.id);
        if (!active) return;

       if (
          data.status === "BUSY" &&
          data.postID &&
          data.postDetails?.status === "PENDING_CANDIDATE" &&
          !passedOffersRef.current.has(String(data.postID))
        ) {
          const expires = data.expiresAt || (Date.now() + 20000);
          setIncomingOffer({
            postId: data.postID,
            subject: data.subject || "Nearby Help Request",
            description: data.description || "A student nearby requires course assistance!",
            expiresAt: expires
          });
                  } else {
              setIncomingOffer(null);
            }
      } catch (err) {
        if (active) console.error("User status polling error:", err);
      } finally {
        if (active) timeoutId = setTimeout(pollStatus, 1500);
      }
    };

    pollStatus();
    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isAvailable, user]);

  // Live Countdown Timer for Candidate Offer
  useEffect(() => {
    if (!incomingOffer?.expiresAt) {
      setCountdown(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((incomingOffer.expiresAt - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        setIncomingOffer(null);
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [incomingOffer]);

  // ---------------- 3. SUBMIT HELP REQUEST (REQUESTER MODE) ----------------
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setReqError("");

    if (!description.trim()) {
      setReqError("Please explain what you need help with.");
      return;
    }

    try {
      setSubmittingReq(true);
      if (availabilityRef.current) {
        stopLocationTracking();
        await deactivateLocation({ userId: user.id });
      }
      if (!navigator.geolocation) throw new Error("Location is required to find nearby helpers.");
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000 });
      });
      const res = await submitHelpRequest({
        userId: user.id,
        subject: selectedCourse
          ? REQUEST_COURSES.find(c => c.code === selectedCourse)?.name
          : "General Campus Help",
        courseCode: selectedCourse || null,
        description,
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });

      if (res.success && res.postId) {
        setShowRequestModal(false);
        navigate(`/search?postId=${encodeURIComponent(res.postId)}`);
       setSubject("");
        setSelectedCourse("");
        setDescription("");
      }
    } catch (err) {
      setReqError(err.message || "Failed to submit request.");
    } finally {
      setSubmittingReq(false);
    }
  };

  // Poll Search Job Status (Requester Mode)
  useEffect(() => {
    if (!activePostId) return;

    const pollJob = async () => {
      try {
        const job = await getRequestStatus(activePostId);
        setSearchJob(job);

        if (job.status === "REJECTED") {
  setActivePostId(null);
  setSearchJob(null);

  showNotice(
    "Request Rejected",
    job.message ||
      "Your request doesn't meet Unstuck's community guidelines. Please edit it and try again."
  );

  return;
}

        if (job.status === "MATCHED" && job.chatSessionId) {
          setActivePostId(null);
          setActiveChat({
            sessionId: job.chatSessionId,
            partnerName: job.matchedUserName || "Matched Helper"
          });
        }

          
         else if (job.status === "FAILED") {
          showNotice("Search Ended", "No available helpers were found in nearby cells. Please try again later.");
          setActivePostId(null);
        }
      } catch (err) {
        console.error("Job polling error:", err);
      }
    };

    pollJob();
    const interval = setInterval(pollJob, 1500);
    return () => clearInterval(interval);
  }, [activePostId]);

  // ---------------- 4. CANDIDATE ACTIONS (ACCEPT / PASS) ----------------
  const handleAccept = async () => {
  if (!incomingOffer || !user?.id) return;

  const postId = String(incomingOffer.postId);

  try {
    const response = await acceptOffer({
      postId,
      helperId: user.id
    });

    console.log("[ACCEPT] Success:", response);

    // Prevent polling from redisplaying the accepted offer.
    passedOffersRef.current.add(postId);

    setIncomingOffer(null);
    setCountdown(null);
    enteringChatRef.current = true;

    // Open the dedicated chat page.
    navigate(`/chat?postId=${encodeURIComponent(postId)}`, {
      replace: true
    });

  } catch (err) {
    console.error("[ACCEPT] Failed:", err);

    showNotice(
      "Accept failed",
      err.message || "Unable to accept this request."
    );
  }
};
  const handlePass = async () => {
  if (!incomingOffer) return;

  const postId = String(incomingOffer.postId);

  // Immediately hide this offer and prevent polling from restoring it.
  passedOffersRef.current.add(postId);
  setIncomingOffer(null);
  setCountdown(null);

  try {
    const response = await passOffer({
      postId,
      helperId: user.id
    });

    console.log("[PASS] Backend response:", response);

  } catch (err) {
    console.error("[PASS] Failed:", err);

    // Allow the offer to reappear if the backend rejected the action.
    passedOffersRef.current.delete(postId);

    showNotice(
      "Pass failed",
      err.message || "Could not pass the request. Please try again."
    );
  }
};

  // ---------------- 5. CHAT ROOM HANDLERS ----------------
  useEffect(() => {
    if (!activeChat?.sessionId || !user?.id) return;

    const pollMessages = async () => {
      try {
        const res = await getChatSession(activeChat.sessionId, user.id);
        if (res.messages) {
          setChatMessages(res.messages);
        }
        if (res.status === "COMPLETED") {
          showNotice("Session Completed", "This help session has ended.");
          setActiveChat(null);
          refreshProfile();
        }
      } catch (err) {
        console.error("Chat poll error:", err);
      }
    };

    pollMessages();
    const interval = setInterval(pollMessages, 1500);
    return () => clearInterval(interval);
  }, [activeChat, user]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeChat) return;
    const text = chatInput.trim();
    setChatInput("");

    try {
      await sendChatMessage(activeChat.sessionId, {
        senderId: user.id,
        text
      });
      setChatMessages((prev) => [...prev, { senderId: user.id, text, timestamp: Date.now() }]);
    } catch (err) {
      console.error("Send message error:", err);
    }
  };

  const handleCompleteSession = async () => {
    if (!activeChat) return;
    try {
      await completeMatch(activeChat.sessionId, user.id);
      setActiveChat(null);
      showNotice("Session Completed", "Thank you for supporting your Ontario Tech peer!");
      refreshProfile();
    } catch (err) {
      console.error("Complete session error:", err);
    }
  };

  const showNotice = (title, message) => {
    setNotice({ title, message });
    setTimeout(() => setNotice(null), 4500);
  };

  if (!user) return null;

  return (
    <div className="web-viewport">
      <Navbar />

      {/* Floating System Notice */}
      {notice && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          background: "var(--primary-900)",
          color: "#FFFFFF",
          padding: "1rem 1.5rem",
          borderRadius: "14px",
          boxShadow: "var(--shadow-xl)",
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          maxWidth: "420px",
          border: "1px solid rgba(255,255,255,0.15)"
        }}>
          <Sparkles size={20} color="var(--accent-orange)" />
          <div>
            <div style={{ fontWeight: "700", fontSize: "0.95rem" }}>{notice.title}</div>
            <div style={{ fontSize: "0.85rem", opacity: 0.85, marginTop: "2px" }}>{notice.message}</div>
          </div>
        </div>
      )}

      {/* SIMPLE STUDENT HOME — adapted from the original mobile app */}
      <main className="unstuck-home">
        <div className="unstuck-home-inner">
          <header className="unstuck-home-header">
            <div>
              <h1>Welcome back, {user.firstname}! <span aria-hidden="true">👋</span></h1>
              <p>Get help quickly from someone nearby on campus.</p>
            </div>
          </header>

          {/* The primary action stays simple, just like the mobile version. */}
          <section className="unstuck-simple-card unstuck-ask-card">
            <div className="unstuck-card-title"><MessageSquare size={22} /><h2>Ask for help on campus</h2></div>
            <p className="unstuck-card-hint">Stuck on a course concept or trying to find a campus room? Tell us what you need.</p>
            <form onSubmit={handleCreateRequest}>

  <div style={{ marginBottom: "1rem" }}>
    <label
      htmlFor="request-course"
      style={{
        display: "block",
        fontWeight: 600,
        fontSize: "0.9rem",
        marginBottom: "0.5rem"
      }}
    >
      Course (Optional)
    </label>

    <select
      id="request-course"
      className="form-input-box"
      value={selectedCourse}
      onChange={(e) => setSelectedCourse(e.target.value)}
      disabled={submittingReq}
      style={{
        width: "100%",
        marginBottom: "0.25rem"
      }}
    >
      {REQUEST_COURSES.map((course) => (
        <option key={course.code || "general"} value={course.code}>
          {course.code
            ? `${course.code} — ${course.name}`
            : course.name}
        </option>
      ))}
    </select>
  </div>

  <textarea
    className="unstuck-help-textarea"
                placeholder="e.g. Does anyone know where SCI1120U is, or can someone explain this calculus concept?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1500}
                required
              />
              {reqError && <p className="unstuck-error" role="alert">{reqError}</p>}
              <div className="unstuck-submit-row">
                <span>Requests are reviewed for community safety.</span>
                <button className="unstuck-primary-btn" type="submit" disabled={submittingReq || !!activePostId || !!activeChat}>
                  {submittingReq ? "Submitting..." : "Submit Request"} <Send size={16} />
                </button>
              </div>
            </form>
          </section>

          <section className="unstuck-simple-card unstuck-availability-card">
            <div className="unstuck-availability-label">
              <span className={`unstuck-status-dot ${isAvailable ? "active" : ""}`} />
              <div><h2>Available to Help</h2><p>{isAvailable ? "You're available for nearby requests." : "Turn this on to help other students nearby."}</p></div>
            </div>
            <label className="unstuck-toggle" aria-label="Available to help">
              <input type="checkbox" checked={isAvailable} onChange={handleToggleAvailable} />
              <span className="unstuck-toggle-track" />
            </label>
          </section>

          <section className="unstuck-simple-card">
            <div className="unstuck-offer-heading">
              <div className="unstuck-card-title"><MapPin size={22} /><h2>Nearby Help Request</h2></div>
              {incomingOffer && <span className="unstuck-countdown"><Clock size={15} /> {countdown ?? 20}s</span>}
            </div>
            {incomingOffer ? (
              <div className="unstuck-offer-body">
                <div className="unstuck-request-details">
                  <strong>{incomingOffer.subject}</strong>
                  <p>{incomingOffer.description}</p>
                </div>
                <div className="unstuck-offer-actions">
                  <button type="button" className="unstuck-primary-btn" onClick={handleAccept}><CheckCircle2 size={17} /> Accept</button>
                  <button type="button" className="unstuck-secondary-btn" onClick={handlePass}><XCircle size={17} /> Pass</button>
                </div>
              </div>
            ) : (
              <div className="unstuck-empty-offer">
                <Radio size={26} />
                <p>{isAvailable ? "You're ready! We'll show a request here when a nearby student needs help." : "Turn on availability to receive nearby help requests."}</p>
              </div>
            )}
          </section>

          <div className="unstuck-impact-line"><Award size={18} /> <span>Students you've helped</span><strong>{user.people_helped || 0}</strong></div>
        </div>
      </main>

      {/* ==========================================================================
          MODALS & DRAWERS (Desktop Web Windows)
          ========================================================================== */}

      {/* ASK FOR HELP MODAL */}
      {showRequestModal && (
        <div className="web-modal-overlay">
          <div className="web-modal-window">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ background: "var(--primary-100)", color: "var(--primary-800)", padding: "0.4rem", borderRadius: "8px" }}>
                  <HelpCircle size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--primary-900)" }}>
                    Request Campus Assistance
                  </h3>
                  <p style={{ fontSize: "0.825rem", color: "var(--text-muted)" }}>
                    Targeted H3 spatial dispatch to nearby available students
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="btn btn-outline-subtle"
                style={{ width: "32px", height: "32px", padding: 0, borderRadius: "50%" }}
              >
                ✕
              </button>
            </div>

            {reqError && (
              <div className="alert alert-error">
                <AlertTriangle size={18} />
                <span>{reqError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRequest} className="web-form">
              <div className="form-field">
                <label className="form-label">Course / Topic</label>
                <input
                  type="text"
                  className="form-input-box"
                  placeholder="e.g. Calculus 1 - Chain Rule derivatives"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label">What concept do you need help with?</label>
                <textarea
                  className="form-input-box"
                  style={{ height: "110px", padding: "0.75rem", resize: "none" }}
                  placeholder="Be specific! Mention where you are on campus (e.g. 2nd floor library study room) and what problem you're stuck on..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div style={{ background: "#F8FAFC", padding: "0.85rem", borderRadius: "10px", border: "1px solid var(--border-subtle)", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                🛡️ <strong>OpenAI Moderated:</strong> Requests are checked in real time for safety, respectful campus behavior, and academic relevance before dispatch.
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRequestModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingReq}
                >
                  {submittingReq ? "Evaluating..." : "Dispatch to Nearby Cells"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIVE MESSAGING CHAT WINDOW */}
      {activeChat && (
        <div className="web-modal-overlay">
          <div className="web-modal-window" style={{ maxWidth: "680px", height: "82vh", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--success-light)", color: "#065F46", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800" }}>
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h4 style={{ fontWeight: "800", color: "var(--primary-900)", fontSize: "1.1rem" }}>
                    Connected with {activeChat.partnerName}
                  </h4>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.775rem", color: "var(--success)", fontWeight: "600" }}>
                    <span className="pulse-dot" />
                    <span>Live Peer Session</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCompleteSession}
                className="btn btn-primary"
                style={{ background: "var(--success)", borderColor: "var(--success)", fontSize: "0.85rem", padding: "0.5rem 1rem" }}
              >
                <CheckCircle2 size={16} />
                Finish Help Session
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 0", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {chatMessages.length === 0 ? (
                <div style={{ margin: "auto", textAlign: "center", color: "var(--text-light)" }}>
                  <MessageSquare size={36} style={{ margin: "0 auto 0.5rem", opacity: 0.5 }} />
                  <p style={{ fontWeight: "600" }}>You are connected live!</p>
                  <p style={{ fontSize: "0.825rem" }}>Coordinate where to meet or share solution notes.</p>
                </div>
              ) : (
                chatMessages.map((m, idx) => {
                  const isMe = String(m.senderId) === String(user.id);
                  return (
                    <div
                      key={idx}
                      style={{
                        alignSelf: isMe ? "flex-end" : "flex-start",
                        background: isMe ? "var(--primary-800)" : "#F1F5F9",
                        color: isMe ? "#FFFFFF" : "var(--text-main)",
                        padding: "0.75rem 1.15rem",
                        borderRadius: "16px",
                        maxWidth: "75%",
                        fontSize: "0.925rem",
                        boxShadow: "var(--shadow-sm)"
                      }}
                    >
                      {m.text}
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "0.75rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
              <input
                type="text"
                className="form-input-box"
                placeholder="Type a message to your peer helper..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{ width: "52px", height: "48px", flexShrink: 0, padding: 0 }}>
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
