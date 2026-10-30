
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  UserCircle,
  Mail,
  Heart,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiRequest, deactivateLocation } from "../api";
import "./ProfilePage.css";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

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

  const handleBack = () => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate("/home");
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
      // Use the existing authentication context logout function.
      // If your AuthContext does not provide logout,
      // see the instructions below.
      if (typeof logout === "function") {
        logout();
      } else {
        localStorage.removeItem("user");
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
                <span>{profile?.email || "No email provided"}</span>
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
