import React from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  MapPin, 
  Radio, 
  ShieldCheck, 
  Zap, 
  Layers, 
  Clock, 
  Users, 
  Compass, 
  CheckCircle2,
  ChevronRight
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CampusHexMap from "../components/CampusHexMap";

export default function LandingPage() {
  const { user } = useAuth();
  const isLoggedIn = Boolean(user?.id);

  return (
    <div className="web-viewport">
      <Navbar />

      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="web-container">
          <div className="hero-grid">
            <div className="hero-content">
              <div className="campus-tag-pill">
                <span className="pulse-dot" />
                <span>Ontario Tech University • Peer Network</span>
              </div>

              <h1 className="hero-title">
                Real-Time Campus Support, <br />
                <span className="hero-title-gradient">Powered by Geospatial AI.</span>
              </h1>

              <p className="hero-lead">
                Never get stuck alone on campus again. When you request help, our 
                H3 spatial propagation engine discovers, ranks, and sequentially dispatches 
                the closest available peer to you in minutes—without broadcast notification spam.
              </p>

             <div className="hero-cta-group">
  <Link
    to={isLoggedIn ? "/home" : "/signup"}
    className="btn btn-primary"
    style={{ padding: "0.85rem 1.75rem", fontSize: "1rem" }}
  >
    {isLoggedIn ? "Go to My Home" : "Join Campus Network"}
    <ArrowRight size={18} />
  </Link>

  {!isLoggedIn && (
    <Link
      to="/login"
      className="btn btn-secondary"
      style={{ padding: "0.85rem 1.5rem", fontSize: "1rem" }}
    >
      Sign In with Student Email
    </Link>
  )}
</div>

              {/* Quick Metrics */}
              <div className="hero-stats-row">
                <div className="hero-stat-block">
                  <span className="hero-stat-number">&lt; 20s</span>
                  <span className="hero-stat-label">Dispatch Countdown</span>
                </div>
                <div className="hero-stat-block">
                  <span className="hero-stat-number">Res 9</span>
                  <span className="hero-stat-label">H3 Hexagon Accuracy</span>
                </div>
                <div className="hero-stat-block">
                  <span className="hero-stat-number">1-to-1</span>
                  <span className="hero-stat-label">Sequential Targeting</span>
                </div>
              </div>
            </div>

            {/* Interactive Campus Preview */}
            <div>
              <div className="hero-visual-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#182A58" }}>
                      Live Keneca Spatial Engine
                    </h3>
                    <p style={{ fontSize: "0.8rem", color: "#64748B" }}>
                      Active K-Ring propagation across North Oshawa campus
                    </p>
                  </div>
                  <span className="status-pill status-pill-online">
                    <span className="pulse-dot" /> Live Mesh
                  </span>
                </div>

                <CampusHexMap isAvailable={true} isSearching={false} currentRing={1} />

                <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.8rem" }}>
                  <div style={{ background: "#F8FAFC", padding: "0.75rem", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                    <div style={{ color: "#64748B", fontWeight: "600" }}>DISCOVERY METHOD</div>
                    <div style={{ color: "#182A58", fontWeight: "700", marginTop: "2px" }}>Uber H3 Spatial Hexagons</div>
                  </div>
                  <div style={{ background: "#F8FAFC", padding: "0.75rem", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                    <div style={{ color: "#64748B", fontWeight: "600" }}>SAFETY FILTER</div>
                    <div style={{ color: "#10B981", fontWeight: "700", marginTop: "2px" }}>OpenAI Omni-Moderated</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="features-section">
        <div className="web-container">
          <div className="section-head-center">
            <span className="section-tag">Targeted Matching Pipeline</span>
            <h2 className="section-title">How Unstuck Works on Campus</h2>
            <p className="section-desc">
              Traditional social feeds spam hundreds of people who aren't nearby. Keneca matches students through a controlled, high-precision geospatial pipeline.
            </p>
          </div>

          <div className="features-grid-4">
            <div className="feature-box">
              <div className="feature-icon-wrapper">
                <MapPin size={24} />
              </div>
              <h3 className="feature-box-title">1. Location Processing</h3>
              <p className="feature-box-desc">
                When you request help, your coordinates are instantly mapped to an H3 hexagonal cell covering your current campus building.
              </p>
            </div>

            <div className="feature-box">
              <div className="feature-icon-wrapper">
                <Layers size={24} />
              </div>
              <h3 className="feature-box-title">2. K-Ring Propagation</h3>
              <p className="feature-box-desc">
                The engine begins searching at Ring 0 (your current hexagon) and smoothly propagates outward through Ring 1, Ring 2, etc.
              </p>
            </div>

            <div className="feature-box">
              <div className="feature-icon-wrapper">
                <Radio size={24} />
              </div>
              <h3 className="feature-box-title">3. Sequential Dispatch</h3>
              <p className="feature-box-desc">
                Nearby helpers are ranked by distance and contacted one-by-one with a 20-second countdown before evaluating the next candidate.
              </p>
            </div>

            <div className="feature-box">
              <div className="feature-icon-wrapper">
                <Zap size={24} />
              </div>
              <h3 className="feature-box-title">4. Direct Connection</h3>
              <p className="feature-box-desc">
                As soon as a peer helper accepts, match state locks in Redis and a direct, private chat session begins immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TECHNOLOGY & ARCHITECTURE SECTION */}
      <section id="spatial-engine" style={{ backgroundColor: "#FFFFFF", padding: "5rem 0", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}>
        <div className="web-container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "3rem", alignItems: "center" }}>
            <div style={{ maxWidth: "720px", margin: "0 auto", textAlign: "center" }}>
              <span className="section-tag">Geographic Computing</span>
              <h2 className="section-title">Why Hexagons Instead of Radiuses?</h2>
              <p className="section-desc" style={{ fontSize: "1.05rem", lineHeight: "1.7" }}>
                Unlike square grids or traditional radial distance queries that require recalculating distance against every user in a SQL database, Uber's H3 hierarchical spatial indexing organizes geography into uniform hexagons.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
              <div style={{ padding: "1.5rem", borderRadius: "14px", border: "1px solid #E2E8F0", background: "#F8FAFC" }}>
                <h4 style={{ color: "#182A58", fontWeight: "700", marginBottom: "0.5rem", fontSize: "1.05rem" }}>
                  Equidistant Neighbors
                </h4>
                <p style={{ color: "#64748B", fontSize: "0.9rem", lineHeight: "1.5" }}>
                  Every hexagon has exactly 6 neighbors at identical distances, eliminating spatial distortion and diagonal bias present in square grids.
                </p>
              </div>

              <div style={{ padding: "1.5rem", borderRadius: "14px", border: "1px solid #E2E8F0", background: "#F8FAFC" }}>
                <h4 style={{ color: "#182A58", fontWeight: "700", marginBottom: "0.5rem", fontSize: "1.05rem" }}>
                  O(1) Spatial Lookups via Redis
                </h4>
                <p style={{ color: "#64748B", fontSize: "0.9rem", lineHeight: "1.5" }}>
                  Candidate discovery runs in sub-10ms memory queries in Redis key-value sets instead of expensive periodic SQL table scans.
                </p>
              </div>

              <div style={{ padding: "1.5rem", borderRadius: "14px", border: "1px solid #E2E8F0", background: "#F8FAFC" }}>
                <h4 style={{ color: "#182A58", fontWeight: "700", marginBottom: "0.5rem", fontSize: "1.05rem" }}>
                  OpenAI Safety Moderation
                </h4>
                <p style={{ color: "#64748B", fontSize: "0.9rem", lineHeight: "1.5" }}>
                  All posted help requests are verified in real time through OpenAI's omni-moderation and policy checks before entering the dispatch queue.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section style={{ padding: "5rem 0", background: "linear-gradient(135deg, var(--primary-900) 0%, var(--primary-800) 100%)", color: "#FFFFFF" }}>
        <div className="web-container" style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "2.5rem", fontWeight: "850", letterSpacing: "-0.5px" }}>
            Ready to experience campus peer support?
          </h2>
          <p style={{ fontSize: "1.1rem", opacity: 0.85, maxWidth: "600px", margin: "1rem auto 2rem" }}>
            Create an account with your Ontario Tech email address and join the live matching network today.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
            <Link to="/signup" className="btn btn-accent" style={{ padding: "0.85rem 2rem", fontSize: "1.05rem" }}>
              Get Started with Ontario Tech Email
              <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn" style={{ padding: "0.85rem 1.75rem", fontSize: "1.05rem", background: "rgba(255,255,255,0.15)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.3)" }}>
              Log In
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
