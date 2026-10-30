
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, CheckCircle, AlertCircle } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { saveMyCourses } from "../api";
import { useAuth } from "../context/AuthContext";

const COURSES = [
  { code: "ENGR 4111U", name: "Capstone Systems Design I" },
  { code: "SOFE 4790U", name: "Distributed Systems" },
  { code: "SOFE 4590U", name: "Embedded Systems" },
  { code: "SOFE 4640U", name: "Mobile Application Development" },
  { code: "SOFE 4850U", name: "User Experience Design" },
  { code: "ARTE 4110U", name: "Deep Learning Architecture and Algorithms" }
];

export default function CourseSelectionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleCourse = (code) => {
    setSelected((previous) =>
      previous.includes(code)
        ? previous.filter((item) => item !== code)
        : [...previous, code]
    );
  };

  const completeSelection = async (courses) => {
    setError("");
    setLoading(true);

    try {
     if (!user?.id) {
  throw new Error("Your session was not found. Please log in again.");
}

await saveMyCourses(user.id, courses);
navigate("/home", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to save courses.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Select Your Courses"
      subtitle="Connect with classmates and get help with your courses."
    >
      <div className="web-form">
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <p style={{ color: "var(--text-muted)" }}>
          Select the courses you're taking this semester.
          You can choose multiple courses or skip this step.
        </p>

        {COURSES.map((course) => {
          const checked = selected.includes(course.code);

          return (
            <label
              key={course.code}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "1rem",
                marginBottom: "0.75rem",
                border: `1px solid ${
                  checked ? "var(--primary)" : "var(--border-subtle)"
                }`,
                borderRadius: "12px",
                cursor: "pointer"
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleCourse(course.code)}
                disabled={loading}
              />

              <div style={{ flex: 1 }}>
                <strong>{course.code}</strong>
                <div style={{
                  color: "var(--text-muted)",
                  fontSize: "0.85rem"
                }}>
                  {course.name}
                </div>
              </div>

              {checked ? (
                <CheckCircle size={20} />
              ) : (
                <BookOpen size={20} />
              )}
            </label>
          );
        })}

        <button
          className="btn btn-primary"
          disabled={loading}
          onClick={() => completeSelection(selected)}
          style={{ width: "100%", marginTop: "1rem" }}
        >
          {loading
            ? "Saving..."
            : `Save & Continue (${selected.length})`}
        </button>

        <button
          className="btn"
          disabled={loading}
          onClick={() => completeSelection([])}
          style={{ width: "100%", marginTop: "0.75rem" }}
        >
          Skip for Now
        </button>

        <p style={{
  textAlign: "center",
  fontSize: "0.8rem",
  color: "var(--text-muted)",
  marginTop: "1rem"
}}>
  Not enrolled in these courses? No problem!
  You can still use Unstuck for general campus help.
</p>
      </div>
    </AuthLayout>
  );
}
