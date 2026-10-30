
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  UserCircle,
  Mail,
  Heart,
  BookOpen,
  LogOut,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  apiRequest,
  deactivateLocation,
  getMyCourses,
} from "../api";
import "./ProfilePage.css";

const COURSE_NAMES = {
  "ENGR 4111U": "Capstone Systems Design I",
  "SOFE 4790U": "Distributed Systems",
  "SOFE 4590U": "Embedded Systems",
  "SOFE 4640U": "Mobile Application Development",
  "SOFE 4850U": "User Experience Design",
  "ARTE 4110U": "Deep Learning Architecture and Algorithms",
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [myCourses, setMyCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState("");

  // Course editing
  const [editingCourses, setEditingCourses] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [savingCourses, setSavingCourses] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiRequest(
          `/api/user/profile?userId=${encodeURIComponent(user.id)}`
        );

        if (active) {
          setProfile({ ...user, ...data });
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let active = true;

    async function loadMyCourses() {
      if (!user?.id) {
        setCoursesLoading(false);
        return;
      }

      setCoursesLoading(true);
      setCoursesError("");

      try {
        const data = await getMyCourses(user.id);

        if (active) {
          setMyCourses(data.courses || []);
        }
      } catch (error) {
        console.error("Failed to load courses:", error);

        if (active) {
          setCoursesError("Unable to load your courses.");
        }
      } finally {
        if (active) setCoursesLoading(false);
      }
    }

    loadMyCourses();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const handleBack = () => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate("/home");
    }
  };

  const handleEditCourses = () => {
    setSelectedCourses([...myCourses]);
    setCoursesError("");
    setSaveMessage("");
    setEditingCourses(true);
  };

  const handleToggleCourse = (code) => {
    setSelectedCourses((previous) =>
      previous.includes(code)
        ? previous.filter((course) => course !== code)
        : [...previous, code]
    );
  };

  const handleCancelEdit = () => {
    setSelectedCourses([...myCourses]);
    setEditingCourses(false);
    setCoursesError("");
  };

  const handleSaveCourses = async () => {
    if (!user?.id || savingCourses) return;

    setSavingCourses(true);
    setCoursesError("");
    setSaveMessage("");

    try {
      const response = await apiRequest(
  `/api/users/${encodeURIComponent(user.id)}/courses`,
  "PUT",
  { courses: selectedCourses }
);

      if (response?.success === false) {
        throw new Error(response.message || "Unable to save courses.");
      }

      // Refresh from PostgreSQL after saving.
      const updated = await getMyCourses(user.id);

      setMyCourses(updated.courses || []);
      setEditingCourses(false);
      setSaveMessage("Your courses have been updated successfully.");
    } catch (error) {
      console.error("Failed to update courses:", error);
      setCoursesError(
        error.message || "Unable to save your courses. Please try again."
      );
    } finally {
      setSavingCourses(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      if (user?.id) {
        await deactivateLocation({ userId: user.id });
      }
    } catch (err) {
      console.error("Failed to deactivate location:", err);
    } finally {
      if (typeof logout === "function") {
        logout();
      } else {
        localStorage.removeItem("unstuck_user");
      }

      navigate("/", { replace: true });
    }
  };

  return (
    <main className="unstuck-profile-page">
      <nav className="unstuck-profile-nav">
        <button
          type="button"
          className="unstuck-profile-back"
          onClick={handleBack}
        >
          <ArrowLeft size={22} />
          Back
        </button>
      </nav>

      <div className="unstuck-profile-center">
        <section className="unstuck-profile-card">
          <UserCircle
            size={100}
            strokeWidth={1.3}
            className="unstuck-profile-avatar"
          />

          {loading ? (
            <p className="unstuck-profile-loading">
              Loading profile...
            </p>
          ) : (
            <div className="unstuck-profile-info">
              <h1>
                {profile?.firstname && profile?.lastname
                  ? `${profile.firstname} ${profile.lastname}`
                  : "User Profile"}
              </h1>

              <div className="unstuck-profile-email">
                <Mail size={18} />
                <span>
                  {profile?.email || "No email provided"}
                </span>
              </div>

              <div className="unstuck-profile-helped">
                <Heart size={26} />

                <div>
                  <strong>{profile?.people_helped ?? 0}</strong>
                  <span>People Helped</span>
                </div>
              </div>
            </div>
          )}

          {/* MY COURSES */}
          <div className="unstuck-profile-courses">
            <div className="unstuck-profile-courses-heading">
              <BookOpen size={22} />
              <h2>My Courses</h2>

              {!editingCourses && !coursesLoading && !coursesError && (
                <button
                  type="button"
                  className="unstuck-profile-edit-courses"
                  onClick={handleEditCourses}
                >
                  <Pencil size={15} />
                  Edit
                </button>
              )}
            </div>

            {coursesLoading ? (
              <p>Loading courses...</p>
            ) : editingCourses ? (
              <>
                <p className="unstuck-profile-course-hint">
                  Select the courses you're currently taking.
                </p>

                <div className="unstuck-profile-course-list">
                  {Object.entries(COURSE_NAMES).map(([code, name]) => (
                    <label
                      key={code}
                      className="unstuck-profile-course-item unstuck-profile-course-option"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCourses.includes(code)}
                        onChange={() => handleToggleCourse(code)}
                        disabled={savingCourses}
                      />

                      <div className="unstuck-profile-course-details">
                        <strong>{code}</strong>
                        <span>{name}</span>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="unstuck-profile-course-actions">
                  <button
                    type="button"
                    className="unstuck-profile-course-cancel"
                    onClick={handleCancelEdit}
                    disabled={savingCourses}
                  >
                    <X size={16} />
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="unstuck-profile-course-save"
                    onClick={handleSaveCourses}
                    disabled={savingCourses}
                  >
                    <Check size={16} />
                    {savingCourses ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </>
            ) : coursesError ? (
              <p role="alert">{coursesError}</p>
            ) : myCourses.length === 0 ? (
              <p>No courses selected yet. Use Edit to add courses.</p>
            ) : (
              <div className="unstuck-profile-course-list">
                {myCourses.map((code) => (
                  <div
                    key={code}
                    className="unstuck-profile-course-item"
                  >
                    <strong>{code}</strong>
                    <span>{COURSE_NAMES[code] || code}</span>
                  </div>
                ))}
              </div>
            )}

            {coursesError && editingCourses && (
              <p role="alert" className="unstuck-profile-course-error">
                {coursesError}
              </p>
            )}

            {saveMessage && !editingCourses && (
              <p role="status" className="unstuck-profile-course-success">
                {saveMessage}
              </p>
            )}
          </div>

          <button
            type="button"
            className="unstuck-profile-logout"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut size={20} />
            {loggingOut ? "Logging out..." : "Log Out"}
          </button>
        </section>
      </div>
    </main>
  );
}
