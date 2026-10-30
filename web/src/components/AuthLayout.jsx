import React from "react";
import { Link } from "react-router-dom";
import { Compass, ShieldCheck, MapPin, Radio, Zap, ArrowLeft } from "lucide-react";

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="auth-split-wrapper">
      {/* Left Visual Panel */}
      <div className="auth-hero-panel">
        <div className="auth-hero-mesh" />

        <div style={{ position: "relative", zIndex: 2 }}>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.75rem", marginBottom: "2.5rem" }}>
            <div className="logo-badge" style={{ width: "38px", height: "38px" }}>
              <Compass size={22} />
            </div>
            <div>
              <div style={{ fontWeight: "800", fontSize: "1.25rem", color: "#FFFFFF", letterSpacing: "-0.5px" }}>Unstuck</div>
              <div style={{ fontSize: "0.7rem", color: "var(--accent-orange)", fontWeight: "600", textTransform: "uppercase" }}>Ontario Tech Support</div>
            </div>
          </Link>

          <div className="auth-hero-badge" style={{ marginBottom: "1.25rem" }}>
            <ShieldCheck size={16} color="#10B981" />
            <span>Ontario Tech University • Verified Campus Network</span>
          </div>

          <h1 style={{ fontSize: "2.5rem", fontWeight: "850", lineHeight: "1.15", letterSpacing: "-0.5px", marginBottom: "1rem" }}>
            Instant peer help, exactly where you are on campus.
          </h1>

          <p style={{ fontSize: "1.05rem", opacity: 0.85, lineHeight: "1.6", maxWidth: "480px" }}>
            Powered by Uber H3 spatial indexing and score-based sequential dispatching to connect Ontario Tech students without feed spam.
          </p>

          <div style={{ marginTop: "2.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
              <div style={{ background: "rgba(255,255,255,0.12)", padding: "0.5rem", borderRadius: "10px", marginTop: "2px" }}>
                <MapPin size={18} color="#60A5FA" />
              </div>
              <div>
                <h4 style={{ fontWeight: "700", fontSize: "0.95rem" }}>Hexagonal Cell Indexing</h4>
                <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>Campus mapped into sub-100m H3 hexagons for rapid proximity discovery.</p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
              <div style={{ background: "rgba(255,255,255,0.12)", padding: "0.5rem", borderRadius: "10px", marginTop: "2px" }}>
                <Radio size={18} color="#F59E0B" />
              </div>
              <div>
                <h4 style={{ fontWeight: "700", fontSize: "0.95rem" }}>Targeted Sequential Dispatch</h4>
                <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>Requests are delivered one-by-one with a 20-second acceptance countdown.</p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
              <div style={{ background: "rgba(255,255,255,0.12)", padding: "0.5rem", borderRadius: "10px", marginTop: "2px" }}>
                <Zap size={18} color="#34D399" />
              </div>
              <div>
                <h4 style={{ fontWeight: "700", fontSize: "0.95rem" }}>AI Moderation & Safety</h4>
                <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>Integrated OpenAI omni-moderation ensures safe, academic-focused requests.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-hero-quote" style={{ position: "relative", zIndex: 2 }}>
          <p className="auth-hero-quote-text">
            "When you're stuck on operating systems or calculus in the library, broadcast notifications get ignored. Unstuck finds the closest person who can actually help right now."
          </p>
          <div className="auth-hero-quote-author">
            Software Engineering Capstone • Keneca Matching Architecture
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="auth-form-panel">
        <div className="auth-form-container">
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.85rem",
              color: "#64748B",
              fontWeight: "600",
              marginBottom: "1.75rem"
            }}
          >
            <ArrowLeft size={16} />
            Back to Home
          </Link>

          <div className="auth-form-header">
            <h2 className="auth-form-title">{title}</h2>
            {subtitle && <p className="auth-form-desc">{subtitle}</p>}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
