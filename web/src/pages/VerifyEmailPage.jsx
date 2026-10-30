import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle, AlertCircle } from "lucide-react";
import { verifyEmail, resendVerificationCode } from "../api";
import AuthLayout from "../components/AuthLayout";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!code.trim() || code.trim().length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);
      const data = await verifyEmail({ email, code });

      if (data.success) {
        setSuccessMsg("Email verified successfully! Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      }
    } catch (err) {
      setError(err.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setError("");
    setSuccessMsg("");

    try {
      setResending(true);
      const data = await resendVerificationCode({ email });
      setSuccessMsg("A new verification code was sent to your email.");
      setCooldown(data.cooldown || 60);
    } catch (err) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={`Enter the 6-digit confirmation code sent to ${email || "your Ontario Tech inbox"}.`}
    >
      <form className="web-form" onSubmit={handleVerify}>
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success">
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="form-field">
          <label className="form-label">6-Digit Code</label>
          <input
            type="text"
            className="form-input-box"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            style={{ textAlign: "center", fontSize: "1.75rem", letterSpacing: "8px", fontWeight: "800", height: "56px" }}
            maxLength={6}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: "48px" }}>
          {loading ? "Verifying..." : "Verify & Activate Account"}
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
          <button
            type="button"
            className="text-link"
            style={{ background: "none", border: "none", padding: 0 }}
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
          >
            {resending
              ? "Sending..."
              : cooldown > 0
              ? `Resend in ${cooldown}s`
              : "Resend Code"}
          </button>

          <Link to="/login" className="text-link">
            Back to Sign In
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
