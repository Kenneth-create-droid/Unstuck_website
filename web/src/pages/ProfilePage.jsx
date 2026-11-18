
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
    ShieldCheck,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  apiRequest,
  deactivateLocation,
  getMyCourses,
} from "../api";
import COURSES from "../data/courses.json";
import AVAILABLE_SKILLS from "../data/skills";
import "./ProfilePage.css";

const COURSE_NAMES = Object.fromEntries(
  COURSES.map((course) => [course.code, course.name])
);


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
  const [courseSearch, setCourseSearch] = useState("");
  const [savingCourses, setSavingCourses] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Skill selection
const [mySkills, setMySkills] = useState([]);
const [selectedSkills, setSelectedSkills] = useState([]);
const [skillsLoading, setSkillsLoading] = useState(true);
const [editingSkills, setEditingSkills] = useState(false);
const [savingSkills, setSavingSkills] = useState(false);
const [skillsError, setSkillsError] = useState("");
const [skillsMessage, setSkillsMessage] = useState("");
const [skillSearch, setSkillSearch] = useState("");

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

  useEffect(() => {
  let active = true;

  async function loadMySkills() {
    if (!user?.id) {
      setSkillsLoading(false);
      return;
    }

    try {
      const data = await apiRequest(
        `/api/users/${encodeURIComponent(user.id)}/skills`
      );

      if (active) {
        setMySkills(data.skills || []);
      }
    } catch (error) {
      console.error("Failed to load skills:", error);

      if (active) {
        setSkillsError("Unable to load your skills.");
      }
    } finally {
      if (active) setSkillsLoading(false);
    }
  }

  loadMySkills();

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
  setCourseSearch("");
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

  const handleEditSkills = () => {
  setSelectedSkills([...mySkills]);
  setSkillSearch("");
  setSkillsError("");
  setSkillsMessage("");
  setEditingSkills(true);
};

const handleToggleSkill = (skill) => {
  const normalized = skill.toLowerCase();

  setSelectedSkills((previous) => {
    if (previous.includes(normalized)) {
      return previous.filter((item) => item !== normalized);
    }

    if (previous.length >= 20) {
      return previous;
    }

    return [...previous, normalized];
  });
};

const handleSaveSkills = async () => {
  if (!user?.id || savingSkills) return;

  setSavingSkills(true);
  setSkillsError("");

  try {
    const result = await apiRequest(
      `/api/users/${encodeURIComponent(user.id)}/skills`,
      "PUT",
      { skills: selectedSkills }
    );

    setMySkills(result.skills || []);
    setEditingSkills(false);
    setSkillsMessage("Your skills have been updated successfully.");
  } catch (error) {
    setSkillsError(error.message || "Unable to save skills.");
  } finally {
    setSavingSkills(false);
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
        <button
            type="button"
            className="unstuck-profile-logout"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut size={20} />
            {loggingOut ? "Logging out..." : "Log Out"}
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

              <div className="unstuck-profile-reliability">
  <div className="unstuck-profile-reliability-heading">
    <ShieldCheck size={24} />
    <h2>My Reliability</h2>
  </div>

  {profile?.reliabilityEstablished ? (
    <>
      <div className="unstuck-profile-reliability-score">
        <strong>{profile.reliabilityScore}</strong>
        <span>/100</span>
      </div>

      <div className="unstuck-profile-reliability-track">
        <div
          className="unstuck-profile-reliability-fill"
          style={{
            width: `${Math.max(0, Math.min(100, profile.reliabilityScore))}%`,
          }}
        />
      </div>

      <div className="unstuck-profile-reliability-details">
        <div>
          <span>Response Score</span>
          <strong>{profile.responseScore}/100</strong>
        </div>

        <div>
          <span>Completion Score</span>
          <strong>{profile.completionScore}/100</strong>
        </div>
      </div>
    </>
  ) : (
    <div className="unstuck-profile-reliability-new">
      <strong>Not yet established</strong>
      <p>
        Your reliability score will appear after you have
        responded to at least 10 help offers.
      </p>
    </div>
  )}
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



               <div className="unstuck-profile-skill-picker">
  <input
    type="search"
    className="form-input-box"
    placeholder="Search courses by code or name..."
    value={courseSearch}
    onChange={(e) => setCourseSearch(e.target.value)}
    disabled={savingCourses}
  />

  <p className="unstuck-profile-course-hint">
    {selectedCourses.length} courses selected
  </p>

  <div className="unstuck-profile-skill-options">
    {COURSES.filter((course) => {
      const query = courseSearch.trim().toLowerCase();

      return (
        !query ||
        course.code.toLowerCase().includes(query) ||
        course.name.toLowerCase().includes(query)
      );
    })
      .slice(0, 60)
      .map(({ code, name }) => (
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



{/* MY SKILLS */}
<div className="unstuck-profile-courses">
  <div className="unstuck-profile-courses-heading">
    <h2>My Skills</h2>

    {!editingSkills && !skillsLoading && (
      <button
        type="button"
        className="unstuck-profile-edit-courses"
        onClick={handleEditSkills}
      >
        <Pencil size={15} />
        Edit
      </button>
    )}
  </div>

  {skillsLoading ? (
    <p>Loading skills...</p>
  ) : editingSkills ? (
    <>
      <p className="unstuck-profile-course-hint">
        Select the skills you can use to help other students.
        You can select up to 20.
      </p>

      <div className="unstuck-profile-skill-picker">
  <input
    type="search"
    className="form-input-box"
    placeholder="Search skills..."
    value={skillSearch}
    onChange={(e) => setSkillSearch(e.target.value)}
    disabled={savingSkills}
  />

  <p className="unstuck-profile-course-hint">
    {selectedSkills.length} of 20 skills selected
  </p>

  <div className="unstuck-profile-skill-options">
    {AVAILABLE_SKILLS.filter((skill) =>
      skill.toLowerCase().includes(skillSearch.trim().toLowerCase())
    ).map((skill) => {
      const normalized = skill.toLowerCase();

      return (
        <label
          key={skill}
          className="unstuck-profile-course-item unstuck-profile-course-option"
        >
          <input
            type="checkbox"
            checked={selectedSkills.includes(normalized)}
            onChange={() => handleToggleSkill(skill)}
            disabled={
              savingSkills ||
              (selectedSkills.length >= 20 &&
                !selectedSkills.includes(normalized))
            }
          />

          <span>{skill}</span>
        </label>
      );
    })}
  </div>
</div>

      <div className="unstuck-profile-course-actions">
        <button
          type="button"
          className="unstuck-profile-course-cancel"
          onClick={() => {
            setEditingSkills(false);
            setSkillsError("");
          }}
          disabled={savingSkills}
        >
          <X size={16} />
          Cancel
        </button>

        <button
          type="button"
          className="unstuck-profile-course-save"
          onClick={handleSaveSkills}
          disabled={savingSkills}
        >
          <Check size={16} />
          {savingSkills ? "Saving..." : "Save Skills"}
        </button>
      </div>
    </>
  ) : mySkills.length === 0 ? (
    <p>No skills selected yet. Use Edit to add your skills.</p>
  ) : (
    <div className="unstuck-profile-course-list">
      {mySkills.map((skill) => (
        <div
          key={skill}
          className="unstuck-profile-course-item"
        >
          <strong>
            {AVAILABLE_SKILLS.find(
              (item) => item.toLowerCase() === skill
            ) || skill}
          </strong>
        </div>
      ))}
    </div>
  )}

  {skillsError && (
    <p role="alert" className="unstuck-profile-course-error">
      {skillsError}
    </p>
  )}

  {skillsMessage && !editingSkills && (
    <p role="status" className="unstuck-profile-course-success">
      {skillsMessage}
    </p>
  )}
</div>



        </section>
      </div>
    </main>
  );
}
