
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  MapPin,
  Users,
  XCircle
} from "lucide-react";
import Navbar from "../components/Navbar";
import "./SearchPage.css";

const API_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:2000";

const TERMINAL = new Set([
  "MATCHED",
  "REJECTED",
  "FAILED",
  "CANCELLED"
]);

export default function SearchPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const postId = params.get("postId");
  const isRedispatch = params.get("redispatch") === "true";

  const [job, setJob] = useState({
    status: isRedispatch ? "SEARCHING" : "ANALYZING",
    currentRing: 0,
    candidatesEvaluated: 0,
    cancelDeadline: null
  });

  const [countdown, setCountdown] = useState(0);
  const [serverLoaded, setServerLoaded] = useState(false);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const terminated = useRef(false);

  const status = job.status;
  const finished = TERMINAL.has(status);
  const matched = status === "MATCHED";
  // Automatically open chat when a helper accepts the request.
useEffect(() => {
  if (matched && postId) {
    navigate(`/chat?postId=${encodeURIComponent(postId)}`, {
      replace: true
    });
  }
}, [matched, postId, navigate]);
  const rejected = status === "REJECTED";
  const failed = status === "FAILED" || status === "CANCELLED";
  const analyzing = status === "ANALYZING";
  const approved = status === "APPROVED";

  // Read the deadline supplied by the backend.
  const deadline = Number(job.cancelDeadline || 0);

  // Keep the countdown synchronized with Redis.
  useEffect(() => {
    if (
      !serverLoaded ||
      !deadline ||
      finished ||
      isRedispatch
    ) {
      setCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.ceil((deadline - Date.now()) / 1000)
      );

      setCountdown(remaining);
    };

    updateCountdown();

    const interval = setInterval(updateCountdown, 200);

    return () => clearInterval(interval);
  }, [deadline, finished, isRedispatch, serverLoaded]);

  const canCancel =
    serverLoaded &&
    !isRedispatch &&
    !finished &&
    !cancelling &&
    status === "SEARCHING" &&
    deadline > Date.now() &&
    countdown > 0;

  // Poll backend progress.
  useEffect(() => {
    terminated.current = false;

    if (!postId) {
      setError(
        "Missing request ID. Please submit a request from Home."
      );
      return;
    }

    let active = true;
    let inFlight = false;

    const poll = async () => {
      if (!active || terminated.current || inFlight) return;

      inFlight = true;

      try {
        const res = await fetch(
          `${API_URL}/api/request/progress?postId=${encodeURIComponent(postId)}`
        );

        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? "Request not found or expired."
              : `Progress request failed (${res.status}).`
          );
        }

        const data = await res.json();

        if (!active || terminated.current) return;

        setError("");
        setServerLoaded(true);
        setJob(data);

        if (TERMINAL.has(data.status)) {
          terminated.current = true;
        }

      } catch (err) {
        if (active && !terminated.current) {
          setError(
            err.message || "Unable to contact the matching server."
          );
        }
      } finally {
        inFlight = false;
      }
    };

    poll();

    const interval = setInterval(poll, 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [postId]);

  // Cancellation is only permitted before the Redis deadline.
  const cancel = async () => {
    if (
      !canCancel ||
      !postId ||
      !deadline ||
      Date.now() >= deadline
    ) {
      return;
    }

    setCancelling(true);

    try {
      const res = await fetch(`${API_URL}/api/request/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ postId })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.message || `Could not cancel request (${res.status}).`
        );
      }

      terminated.current = true;

      navigate("/home", { replace: true });

    } catch (err) {
      setError(err.message);
      setCancelling(false);
    }
  };

  // Browser navigation guard while search is active.
  // This is a best-effort guard, not a security boundary.
  useEffect(() => {
    if (!serverLoaded || finished || canCancel) return;

    const handlePopState = () => {
      if (!terminated.current) {
        window.history.pushState(
          { searchLocked: true },
          "",
          window.location.href
        );
      }
    };

    window.history.pushState(
      { searchLocked: true },
      "",
      window.location.href
    );

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [serverLoaded, finished, canCancel]);

  const title = matched
    ? "Helper Found!"
    : rejected
    ? "Request Not Submitted"
    : failed
    ? "Search Ended"
    : isRedispatch
    ? "Finding Another Helper..."
    : analyzing
    ? "Analyzing Your Request..."
    : approved
    ? "Request Approved!"
    : "Finding Nearby Helper...";

  const subtitle = matched
    ? "A nearby student accepted your request. Your chat is the next step."
    : rejected
    ? job.message ||
      "This request did not meet Unstuck's community guidelines."
    : failed
    ? "No available helper was found, or the search was cancelled."
    : analyzing
    ? "Checking your request against Unstuck's community guidelines..."
    : approved
    ? "Your request was approved. Preparing the matching engine..."
    : canCancel
    ? `Searching nearby students. Cancel window: ${countdown}s`
    : isRedispatch
    ? `Continuing your search from Ring ${job.currentRing || 0}...`
    : `Searching campus Ring ${job.currentRing || 0}... Please wait until the search finishes.`;

  return (
    <div className="web-viewport">
    <Navbar disableNavigation={!finished} />

      <main className="unstuck-search-page">
        <section className="unstuck-search-wrap">

          {canCancel && (
            <button
              type="button"
              className="unstuck-search-back"
              onClick={cancel}
              disabled={cancelling}
            >
              <ArrowLeft size={19} />
              Cancel and return home
            </button>
          )}

          <div
            className="unstuck-search-card"
            role="status"
            aria-live="polite"
          >
            <div
              className={`unstuck-search-icon ${
                finished
                  ? matched
                    ? "success"
                    : "failure"
                  : ""
              }`}
            >
              {matched ? (
                <CheckCircle2 size={58} />
              ) : rejected || failed ? (
                <XCircle size={58} />
              ) : approved ? (
                <CheckCircle2 size={58} />
              ) : (
                <LoaderCircle
                  size={52}
                  className="unstuck-search-spin"
                />
              )}
            </div>

            <h1>{title}</h1>

            <p className="unstuck-search-description">
              {subtitle}
            </p>

            {!analyzing &&
              !approved &&
              !rejected &&
              !failed && (
                <div className="unstuck-search-metrics">
                  <div>
                    <MapPin size={20} />
                    <strong>
                      {Number(job.currentRing || 0)}
                    </strong>
                    <span>Search Ring</span>
                  </div>

                  <div className="unstuck-search-divider" />

                  <div>
                    <Users size={20} />
                    <strong>
                      {Number(job.candidatesEvaluated || 0)}
                    </strong>
                    <span>Helpers Evaluated</span>
                  </div>
                </div>
              )}

            {error && (
              <p
                className="unstuck-search-error"
                role="alert"
              >
                {error}
              </p>
            )}

           
          </div>

          {!finished ? (
            <button
              type="button"
              className="unstuck-search-cancel"
              onClick={cancel}
              disabled={!canCancel || !postId}
            >
              {cancelling
                ? "Cancelling..."
                : canCancel
                ? `Cancel Request (${countdown}s)`
                : "Searching in Progress — Cannot Cancel"}
            </button>
          ) : (
            <button
              type="button"
              className="unstuck-search-home"
              onClick={() =>
                navigate("/home", { replace: true })
              }
            >
              Return Home
            </button>
          )}

        </section>
      </main>
    </div>
  );
}
