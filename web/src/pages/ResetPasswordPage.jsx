import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { resetPassword } from "../api";
import AuthLayout from "../components/AuthLayout";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get("email") || "";
  const code = searchParams.get("code") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const data = await resetPassword({ email, code, newPassword });

      if (data.success) {
        setSuccessMsg("Password reset successfully! Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      }
    } catch (err) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create new password"
      subtitle="Choose a secure password for your Ontario Tech student account."
    >
      <form className="web-form" onSubmit={handleReset}>
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
          <label className="form-label">New Password</label>
          <div className="input-password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              className="form-input-box"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="btn-toggle-eye"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Confirm New Password</label>
          <input
            type={showPassword ? "text" : "password"}
            className="form-input-box"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: "48px" }}>
          {loading ? "Updating Password..." : "Set New Password"}
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
