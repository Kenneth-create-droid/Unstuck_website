import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../api";
import AVAILABLE_SKILLS from "../data/skills";
import AuthLayout from "../components/AuthLayout";
import "./SkillSelectionPage.css";

export default function SkillSelectionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selectedSkills, setSelectedSkills] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleSkill = (skill) => {
    const normalized = skill.toLowerCase();

    setSelectedSkills((previous) => {
      if (previous.includes(normalized)) {
        return previous.filter((item) => item !== normalized);
      }

      if (previous.length >= 20) return previous;

      return [...previous, normalized];
    });
  };

  const completeSelection = async (skills) => {
    if (saving) return;

    if (!user?.id) {
      setError("Your session has expired. Please log in again.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await apiRequest(
        `/api/users/${encodeURIComponent(user.id)}/skills`,
        "PUT",
        { skills }
      );

      navigate("/home", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to save skills.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthLayout title="Select Your Skills">
      <div style={{ width: "100%" }}>
        <p>
          Select the skills you can use to help other students.
          You can select up to 20.
        </p>

        <p>
          <strong>{selectedSkills.length}/20 skills selected</strong>
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "10px",
            marginTop: "20px",
            marginBottom: "20px",
          }}
        >
          {AVAILABLE_SKILLS.map((skill) => {
            const normalized = skill.toLowerCase();
            const checked = selectedSkills.includes(normalized);

            return (
              <label
                key={skill}
                style={{
                  padding: "12px",
                  border: checked
                    ? "2px solid #2563eb"
                    : "1px solid #d1d5db",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSkill(skill)}
                  disabled={
                    saving ||
                    (!checked && selectedSkills.length >= 20)
                  }
                />
                {skill}
              </label>
            );
          })}
        </div>

        {error && <p role="alert" style={{ color: "red" }}>{error}</p>}

        <div className="skill-selection-actions">
  <button
    type="button"
    className="skill-selection-continue"
    onClick={() => completeSelection(selectedSkills)}
    disabled={saving}
  >
    {saving ? "Saving..." : "Continue"}
    {!saving && <span aria-hidden="true">→</span>}
  </button>

  <button
    type="button"
    className="skill-selection-skip"
    onClick={() => completeSelection([])}
    disabled={saving}
  >
    Skip for Now
  </button>
</div>
      </div>
    </AuthLayout>
  );
}
