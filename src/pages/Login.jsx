import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import {
  faEnvelope,
  faLock,
  faSignInAlt,
  faFilm,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";
import "../styles/auth.css";

function Login() {
  const navigate = useNavigate();
  const { signInWithGoogle, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState("email"); // "email" or "google"

  async function handleEmailLogin(e) {
    e.preventDefault();

    try {
      setError("");
      setLoading(true);
      await login(email, password);
      navigate("/");
    } catch (error) {
      let errorMessage = "Failed to sign in";
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        errorMessage = "Invalid email or password";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      setError("");
      setLoading(true);
      await signInWithGoogle();
      navigate("/");
    } catch (error) {
      console.error("Google sign in error:", error);
      setError("Failed to sign in with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-form-container">
        <div className="auth-logo">
          <FontAwesomeIcon icon={faFilm} className="auth-logo-icon" />
          <h1>ScreenKiss</h1>
        </div>

        <h2>Sign In</h2>

        {error && (
          <div className="auth-error">
            <FontAwesomeIcon icon={faExclamationCircle} />
            <span>{error}</span>
          </div>
        )}

        <div className="auth-tabs">
          <button
            className={`auth-tab ${authMethod === "email" ? "active" : ""}`}
            onClick={() => setAuthMethod("email")}
          >
            <FontAwesomeIcon icon={faEnvelope} />
            <span>Email</span>
          </button>
          <button
            className={`auth-tab ${authMethod === "google" ? "active" : ""}`}
            onClick={() => setAuthMethod("google")}
          >
            <FontAwesomeIcon icon={faGoogle} />
            <span>Google</span>
          </button>
        </div>

        {authMethod === "email" ? (
          <div className="auth-method-container">
            <form onSubmit={handleEmailLogin} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">
                  <FontAwesomeIcon icon={faEnvelope} />
                  <span>Email</span>
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">
                  <FontAwesomeIcon icon={faLock} />
                  <span>Password</span>
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              <button
                disabled={loading}
                type="submit"
                className="auth-button pulse-on-hover"
              >
                <FontAwesomeIcon icon={faSignInAlt} />
                Sign In
              </button>
            </form>
            <div className="auth-links">
              <Link to="/forgot-password" className="forgot-password-link">
                Forgot Password?
              </Link>
              <div className="auth-divider">
                <span>or</span>
              </div>
              <p className="signup-prompt">
                Don't have an account?{" "}
                <Link to="/signup" className="signup-link">
                  Sign Up
                </Link>
              </p>
            </div>
          </div>
        ) : (
          <div className="auth-method-container">
            <p className="auth-info">
              Use your Google account to sign in to ScreenKiss quickly and
              securely
            </p>
            <button
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="google-auth-button pulse-on-hover"
            >
              <FontAwesomeIcon icon={faGoogle} />
              Sign in with Google
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
