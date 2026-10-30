import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { forgotPassword } from "../api";
import AuthLayout from "../components/AuthLayout";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your Ontario Tech email address.");
      return;
    }

    try {
      setLoading(true);
      const data = await forgotPassword({ email });

      if (data.success) {
        navigate(`/verify-reset-code?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      }
    } catch (err) {
      setError(err.message || "Failed to process password reset request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your Ontario Tech student email to receive a 6-digit verification code."
    >
      <form className="web-form" onSubmit={handleSubmit}>
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="form-field">
          <label className="form-label">Student Email</label>
          <input
            type="email"
            className="form-input-box"
            placeholder="name@ontariotechu.net"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: "48px" }}>
          {loading ? "Sending Code..." : "Send Verification Code"}
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
