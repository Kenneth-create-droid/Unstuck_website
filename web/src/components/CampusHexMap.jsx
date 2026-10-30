import React from "react";
import { Radio, MapPin, Layers, Users } from "lucide-react";

export default function CampusHexMap({ isAvailable, isSearching, currentRing = 0 }) {
  // Grid of hexagonal cells representing Ontario Tech campus
  const hexagons = [
    // Ring 0: Center (User's location - e.g. Library)
    { id: "R0", x: 180, y: 140, ring: 0, label: "Library", active: true },
    // Ring 1: Immediate neighbors
    { id: "R1-1", x: 180, y: 70, ring: 1, label: "Science Building", active: isAvailable || isSearching },
    { id: "R1-2", x: 240, y: 105, ring: 1, label: "ERC Engineering", active: isAvailable || isSearching },
    { id: "R1-3", x: 240, y: 175, ring: 1, label: "Student Centre", active: isAvailable || isSearching },
    { id: "R1-4", x: 180, y: 210, ring: 1, label: "Business Hall", active: isAvailable || isSearching },
    { id: "R1-5", x: 120, y: 175, ring: 1, label: "Residence South", active: isAvailable || isSearching },
    { id: "R1-6", x: 120, y: 105, ring: 1, label: "Campus Ice Centre", active: isAvailable || isSearching },
    // Ring 2: Outer perimeter
    { id: "R2-1", x: 180, y: 0, ring: 2, label: "North Field", active: isSearching && currentRing >= 2 },
    { id: "R2-2", x: 240, y: 35, ring: 2, label: "Polonsky Commons", active: isSearching && currentRing >= 2 },
    { id: "R2-3", x: 300, y: 70, ring: 2, label: "Simcoe North", active: isSearching && currentRing >= 2 },
    { id: "R2-4", x: 300, y: 140, ring: 2, label: "Tech Quad", active: isSearching && currentRing >= 2 },
    { id: "R2-5", x: 300, y: 210, ring: 2, label: "Energy Systems", active: isSearching && currentRing >= 2 },
    { id: "R2-6", x: 240, y: 245, ring: 2, label: "Conlin Road", active: isSearching && currentRing >= 2 },
    { id: "R2-7", x: 180, y: 280, ring: 2, label: "South Campus", active: isSearching && currentRing >= 2 },
    { id: "R2-8", x: 120, y: 245, ring: 2, label: "Aviation Lab", active: isSearching && currentRing >= 2 },
    { id: "R2-9", x: 60, y: 210, ring: 2, label: "Simcoe West", active: isSearching && currentRing >= 2 },
    { id: "R2-10", x: 60, y: 140, ring: 2, label: "West Residence", active: isSearching && currentRing >= 2 },
    { id: "R2-11", x: 60, y: 70, ring: 2, label: "Athletic Centre", active: isSearching && currentRing >= 2 },
    { id: "R2-12", x: 120, y: 35, ring: 2, label: "North Lot", active: isSearching && currentRing >= 2 },
  ];

  // Helper to draw hexagon points
  const getHexPoints = (cx, cy, r = 32) => {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }
    return points.join(" ");
  };

  return (
    <div className="hex-map-canvas-card">
      <div className="hex-map-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Layers size={18} color="#60A5FA" />
            <h4 style={{ fontWeight: "700", fontSize: "1rem" }}>Ontario Tech Campus H3 Grid</h4>
          </div>
          <p style={{ fontSize: "0.75rem", color: "#94A3B8", marginTop: "0.2rem" }}>
            Resolution 9 Indexing (~105m hexagon edge length)
          </p>
        </div>

        <div className="hex-map-legend">
          <div className="legend-item">
            <div className="legend-color-box" style={{ background: "#2563EB" }} />
            <span>You (Ring 0)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color-box" style={{ background: "#059669" }} />
            <span>Active Peers</span>
          </div>
          <div className="legend-item">
            <div className="legend-color-box" style={{ background: "#F59E0B" }} />
            <span>Search Ring</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div style={{ width: "100%", height: "260px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg viewBox="20 -10 320 300" style={{ width: "100%", height: "100%", maxHeight: "260px" }}>
          {/* Hexagon Cells */}
          {hexagons.map((hex) => {
            const isCenter = hex.ring === 0;
            const isCurrentSearchRing = isSearching && hex.ring === Number(currentRing);
            
            let fillColor = "rgba(30, 41, 59, 0.4)";
            let strokeColor = "rgba(71, 85, 105, 0.5)";
            let strokeWidth = "1.5";

            if (isCenter) {
              fillColor = "rgba(37, 99, 235, 0.35)";
              strokeColor = "#3B82F6";
              strokeWidth = "2.5";
            } else if (isCurrentSearchRing) {
              fillColor = "rgba(245, 158, 11, 0.25)";
              strokeColor = "#F59E0B";
              strokeWidth = "2";
            } else if (hex.ring === 1 && isAvailable) {
              fillColor = "rgba(16, 185, 129, 0.2)";
              strokeColor = "#10B981";
            }

            return (
              <g key={hex.id}>
                <polygon
                  points={getHexPoints(hex.x, hex.y, 32)}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  style={{ transition: "all 0.3s ease" }}
                />

                {/* Node marker */}
                {isCenter ? (
                  <circle cx={hex.x} cy={hex.y} r="6" fill="#60A5FA" />
                ) : hex.active ? (
                  <circle cx={hex.x} cy={hex.y} r="3" fill="#10B981" opacity="0.8" />
                ) : null}

                {/* Label on significant hexes */}
                {(isCenter || hex.ring === 1) && (
                  <text
                    x={hex.x}
                    y={hex.y + 16}
                    textAnchor="middle"
                    fill="rgba(255, 255, 255, 0.65)"
                    fontSize="7"
                    fontWeight="500"
                  >
                    {hex.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Radar ripple if searching */}
          {isSearching && (
            <circle
              cx="180"
              cy="140"
              r="40"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2"
              opacity="0.8"
            >
              <animate
                attributeName="r"
                from="10"
                to="120"
                dur="2.5s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                from="0.9"
                to="0"
                dur="2.5s"
                repeatCount="indefinite"
              />
            </circle>
          )}
        </svg>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: "0.75rem", color: "#94A3B8" }}>
        <span>Campus Lat/Lng: <strong>43.9458° N, 78.8960° W</strong></span>
        <span style={{ color: isAvailable ? "#10B981" : "#94A3B8", fontWeight: "600" }}>
          ● {isAvailable ? "Mesh Active & Propagating" : "Spatial Mesh Standby"}
        </span>
      </div>
    </div>
  );
}
