import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle } from "lucide-react";
import { signupUser } from "../api";
import AuthLayout from "../components/AuthLayout";

const ALLOWED_DOMAINS = ["ontariotechu.net", "ontariotechu.ca", "gmail.com"];

export default function SignupPage() {
  const navigate = useNavigate();

  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!firstname.trim() || !lastname.trim() || !email.trim() || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailParts = normalizedEmail.split("@");

    if (emailParts.length !== 2 || !ALLOWED_DOMAINS.includes(emailParts[1])) {
      setError("Please use an Ontario Tech affiliated email address (@ontariotechu.net, @ontariotechu.ca, or @gmail.com).");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    try {
      setLoading(true);
      const data = await signupUser({
        firstname,
        lastname,
        email: normalizedEmail,
        password
      });

      if (data.requiresVerification) {
        navigate(`/verify-email?email=${encodeURIComponent(normalizedEmail)}`);
        return;
      }

      if (data.success) {
        setSuccessMsg(data.message || "Account created successfully! Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      }
    } catch (err) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create student account"
      subtitle="Join Ontario Tech's real-time campus peer support and spatial matching network."
    >
      <form className="web-form" onSubmit={handleSignup}>
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="form-field">
            <label className="form-label">First Name</label>
            <input
              type="text"
              className="form-input-box"
              placeholder="e.g. Kenneth"
              value={firstname}
              onChange={(e) => setFirstname(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">Last Name</label>
            <input
              type="text"
              className="form-input-box"
              placeholder="e.g. Nnah"
              value={lastname}
              onChange={(e) => setLastname(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Ontario Tech Email</label>
          <input
            type="email"
            className="form-input-box"
            placeholder="firstname.lastname@ontariotechu.net"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoCapitalize="none"
            autoComplete="email"
            required
          />
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
            Accepted: @ontariotechu.net, @ontariotechu.ca, or @gmail.com
          </span>
        </div>

        <div className="form-field">
          <label className="form-label">Password</label>
          <div className="input-password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              className="form-input-box"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
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

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ width: "100%", height: "48px", marginTop: "0.5rem" }}
        >
          {loading ? (
            <span>Creating account...</span>
          ) : (
            <>
              <UserPlus size={18} />
              Create Ontario Tech Account
            </>
          )}
        </button>

        <div style={{ textAlign: "center", marginTop: "1.5rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "1.5rem" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Already registered?{" "}
          </span>
          <Link to="/login" className="text-link" style={{ fontSize: "0.9rem" }}>
            Sign In
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
