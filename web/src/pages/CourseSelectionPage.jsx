import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  CheckCircle,
  AlertCircle,
  Search,
  X
} from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { saveMyCourses } from "../api";
import { useAuth } from "../context/AuthContext";
import COURSES from "../data/courses.json";

export default function CourseSelectionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedSet = useMemo(
    () => new Set(selected),
    [selected]
  );

  const selectedCourses = useMemo(
    () => COURSES.filter((course) => selectedSet.has(course.code)),
    [selectedSet]
  );

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return [];

    return COURSES.filter(
      (course) =>
        course.code.toLowerCase().includes(query) ||
        course.name.toLowerCase().includes(query)
    ).slice(0, 40);
  }, [search]);

  const toggleCourse = (code) => {
    setSelected((previous) =>
      previous.includes(code)
        ? previous.filter((item) => item !== code)
        : [...previous, code]
    );
  };

  const completeSelection = async (courses) => {
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      if (!user?.id) {
        throw new Error(
          "Your session was not found. Please log in again."
        );
      }

      await saveMyCourses(user.id, courses);

      navigate("/select-skills", { replace: true });

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
          Search for the courses you're taking this semester.
          Select multiple courses or skip this step.
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            border: "1px solid var(--border-subtle)",
            borderRadius: "12px",
            padding: "0.85rem 1rem",
            marginTop: "1rem"
          }}
        >
          <Search size={20} />

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search SOFE 4790U, Biology, Calculus..."
            disabled={loading}
            aria-label="Search Ontario Tech courses"
            style={{
              flex: 1,
              minWidth: 0,
              border: "none",
              outline: "none",
              background: "transparent",
              color: "var(--text-primary)",
              fontSize: "0.95rem"
            }}
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              disabled={loading}
              aria-label="Clear search"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)"
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            marginTop: "0.5rem"
          }}
        >
          {COURSES.length} courses available
        </p>

        {selectedCourses.length > 0 && (
          <div style={{ marginTop: "1.5rem" }}>
            <h3 style={{ marginBottom: "0.75rem" }}>
              Selected Courses ({selected.length})
            </h3>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem"
              }}
            >
              {selectedCourses.map((course) => (
                <button
                  key={course.code}
                  type="button"
                  onClick={() => toggleCourse(course.code)}
                  disabled={loading}
                  title={`Remove ${course.name}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "10px",
                    border: "1px solid var(--primary)",
                    background: "transparent",
                    color: "var(--text-primary)",
                    cursor: "pointer"
                  }}
                >
                  <span>{course.code}</span>
                  <X size={15} />
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: "1.25rem",
            maxHeight: "360px",
            overflowY: "auto"
          }}
        >
          {!search.trim() && (
            <p
              style={{
                textAlign: "center",
                color: "var(--text-muted)",
                padding: "1.5rem"
              }}
            >
              <BookOpen
                size={28}
                style={{ display: "block", margin: "0 auto 0.75rem" }}
              />
              Start typing to find your courses.
            </p>
          )}

          {search.trim() && filteredCourses.length === 0 && (
            <p
              style={{
                textAlign: "center",
                color: "var(--text-muted)",
                padding: "1.5rem"
              }}
            >
              No matching courses found.
            </p>
          )}

          {filteredCourses.map((course) => {
            const checked = selectedSet.has(course.code);

            return (
              <label
                key={course.code}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "1rem",
                  marginBottom: "0.65rem",
                  border: `1px solid ${
                    checked
                      ? "var(--primary)"
                      : "var(--border-subtle)"
                  }`,
                  borderRadius: "12px",
                  cursor: loading ? "default" : "pointer"
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCourse(course.code)}
                  disabled={loading}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{course.code}</strong>

                  <div
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.85rem",
                      marginTop: "0.2rem"
                    }}
                  >
                    {course.name}
                  </div>
                </div>

                {checked ? (
                  <CheckCircle size={20} color="var(--primary)" />
                ) : (
                  <BookOpen size={20} />
                )}
              </label>
            );
          })}
        </div>

        {search.trim() && filteredCourses.length === 40 && (
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)"
            }}
          >
            Showing the first 40 matches. Refine your search
            to find a specific course.
          </p>
        )}

        <button
          type="button"
          className="btn btn-primary"
          disabled={loading}
          onClick={() => completeSelection(selected)}
          style={{ width: "100%", marginTop: "1.5rem" }}
        >
          {loading
            ? "Saving..."
            : `Save & Continue (${selected.length})`}
        </button>

        <button
          type="button"
          className="btn"
          disabled={loading}
          onClick={() => completeSelection([])}
          style={{ width: "100%", marginTop: "0.75rem" }}
        >
          Skip for Now
        </button>

        <p
          style={{
            textAlign: "center",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            marginTop: "1rem"
          }}
        >
          Not taking any courses right now? You can still use
          Unstuck for general campus help.
        </p>
      </div>
    </AuthLayout>
  );
}
