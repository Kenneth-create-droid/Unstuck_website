import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { verifyResetCode } from "../api";
import AuthLayout from "../components/AuthLayout";

export default function VerifyResetCodePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");

    if (!code.trim() || code.trim().length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);
      const data = await verifyResetCode({ email, code });

      if (data.success || data.verified) {
        navigate(`/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`);
      }
    } catch (err) {
      setError(err.message || "Invalid or expired reset code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Enter reset code"
      subtitle={`We sent a 6-digit confirmation code to ${email}.`}
    >
      <form className="web-form" onSubmit={handleVerify}>
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
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
          {loading ? "Verifying..." : "Continue to Set Password"}
        </button>

        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <Link to="/login" className="text-link">
            Return to Sign In
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
