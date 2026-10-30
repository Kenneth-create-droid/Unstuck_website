import React from "react";
import { Compass, ExternalLink, ShieldCheck, Cpu, Database } from "lucide-react";

export default function Footer() {
  return (
    <footer className="web-footer">
      <div className="web-container">
        <div className="footer-content-grid">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <div className="logo-badge" style={{ width: "32px", height: "32px" }}>
                <Compass size={18} />
              </div>
              <span style={{ fontWeight: "800", fontSize: "1.1rem", color: "#182A58" }}>Unstuck</span>
            </div>
            <p style={{ color: "#64748B", fontSize: "0.85rem", maxWidth: "420px" }}>
              Real-time geospatial matching and sequential dispatch platform designed for Ontario Tech University students.
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "center", fontSize: "0.825rem", color: "#64748B" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <Cpu size={14} color="#182A58" />
              Keneca Matching Engine
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <Database size={14} color="#182A58" />
              Redis + PostgreSQL
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <ShieldCheck size={14} color="#10B981" />
              OpenAI Safety Moderated
            </span>
          </div>
        </div>

        <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <p style={{ fontSize: "0.775rem", color: "#94A3B8" }}>
            © {new Date().getFullYear()} Ontario Tech University • Software Engineering Capstone Project
          </p>
          <div style={{ display: "flex", gap: "1rem", fontSize: "0.775rem", color: "#64748B" }}>
            <span>Oshawa, Ontario, Canada</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
