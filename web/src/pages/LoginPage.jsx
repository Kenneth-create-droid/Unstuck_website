import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import { loginUser } from "../api";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please fill in both your email and password.");
      return;
    }

    try {
      setLoading(true);
      const data = await loginUser({ email, password });

      if (data && data.user) {
        login(data.user);
        navigate("/home");
      } else {
        setError(data.message || "Invalid credentials.");
      }
    } catch (err) {
      setError(err.message || "Failed to log in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in with your Ontario Tech student account to access the peer support network."
    >
      <form className="web-form" onSubmit={handleLogin}>
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
            autoCapitalize="none"
            autoComplete="email"
            required
          />
        </div>

        <div className="form-field">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label className="form-label">Password</label>
            <Link to="/forgot-password" className="text-link" style={{ fontSize: "0.8rem" }}>
              Forgot password?
            </Link>
          </div>
          <div className="input-password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              className="form-input-box"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="btn-toggle-eye"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
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
            <span>Signing in...</span>
          ) : (
            <>
              <LogIn size={18} />
              Sign In to Unstuck
            </>
          )}
        </button>

        <div style={{ textAlign: "center", marginTop: "1.5rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "1.5rem" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Don't have an Ontario Tech account yet?{" "}
          </span>
          <Link to="/signup" className="text-link" style={{ fontSize: "0.9rem" }}>
            Create Account
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
