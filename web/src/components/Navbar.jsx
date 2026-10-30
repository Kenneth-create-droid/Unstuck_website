
import React from "react";
import { Link } from "react-router-dom";
import { User, ArrowRight, Compass } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

export default function Navbar({ disableNavigation = false }) {
  const { user } = useAuth();

  const brandContent = (
    <>
      <div className="logo-badge unstuck-navbar-icon">
        <Compass size={32} />
      </div>

      <div className="brand-text-col">
        <span className="brand-name unstuck-navbar-title">
          Unstuck
        </span>
        <span className="brand-subtag unstuck-navbar-subtitle">
          Ontario Tech Campus Support
        </span>
      </div>
    </>
  );

  return (
    <nav className="web-navbar unstuck-navbar">
      <div className="web-container">
        <div className="navbar-inner unstuck-navbar-inner">

          {/* Unstuck Branding */}
          {disableNavigation ? (
            <div
              className="brand-logo-group unstuck-navbar-brand"
              style={{ cursor: "not-allowed" }}
              title="Please wait until the search finishes"
              aria-disabled="true"
            >
              {brandContent}
            </div>
          ) : (
            <Link
              to={user ? "/home" : "/"}
              className="brand-logo-group unstuck-navbar-brand"
            >
              {brandContent}
            </Link>
          )}

          {/* Public Navigation */}
          {!user && !disableNavigation && (
            <div className="nav-links-desktop">
              <a href="/#how-it-works" className="nav-link">
                How It Works
              </a>
              <a href="/#spatial-engine" className="nav-link">
                H3 Spatial Indexing
              </a>
            </div>
          )}

          {/* Right Side */}
          <div className="nav-auth-actions">
            {user ? (
              disableNavigation ? (
                <div
                  className="unstuck-navbar-profile"
                  style={{
                    cursor: "not-allowed",
                    opacity: 0.5
                  }}
                  title="Profile unavailable during matching"
                  aria-disabled="true"
                >
                  <User size={19} />
                  <span>Profile</span>
                </div>
              ) : (
                <Link
                  to="/profile"
                  className="unstuck-navbar-profile"
                >
                  <User size={19} />
                  <span>Profile</span>
                </Link>
              )
            ) : (
              !disableNavigation && (
                <>
                  <Link
                    to="/login"
                    className="btn btn-secondary"
                  >
                    Log In
                  </Link>

                  <Link
                    to="/signup"
                    className="btn btn-primary"
                  >
                    Get Started
                    <ArrowRight size={16} />
                  </Link>
                </>
              )
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}
