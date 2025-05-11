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
import { motion, AnimatePresence } from "framer-motion";

// Animation variants for the auth method switching
const authSwitchVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 1, 0.5, 1] },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
    transition: { duration: 0.3, ease: [0.5, 0, 0.75, 0] },
  },
};

function Login() {
  const navigate = useNavigate();
  const { signInWithGoogle, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState("email");

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
    <div className="login-page-container redesigned">
      <div className="login-card">
        <div className="login-form-content">
          <div className="form-header">
            <h2>Sign In</h2>
            <p className="subtitle">
              Welcome back! Please sign in to continue.
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="auth-error compact-error"
            >
              <FontAwesomeIcon icon={faExclamationCircle} />
              <span>{error}</span>
            </motion.div>
          )}

          <div className="auth-method-selection">
            <button
              className={`method-button ${
                authMethod === "email" ? "active" : ""
              }`}
              onClick={() => setAuthMethod("email")}
            >
              <FontAwesomeIcon icon={faEnvelope} />
              <span>Email</span>
            </button>
            <button
              className={`method-button ${
                authMethod === "google" ? "active" : ""
              }`}
              onClick={() => setAuthMethod("google")}
            >
              <FontAwesomeIcon icon={faGoogle} />
              <span>Google</span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={authMethod} // Key change triggers animation
              className="auth-form-wrapper-animated glassmorphic"
              variants={authSwitchVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {authMethod === "email" ? (
                <form
                  onSubmit={handleEmailLogin}
                  className="auth-form minimal-form"
                >
                  <div className="form-group">
                    <label htmlFor="email"></label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="password"></label>
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
                    className="auth-button primary-submit-button"
                  >
                    {loading ? "Signing In..." : "Sign In"}
                    {!loading && <FontAwesomeIcon icon={faSignInAlt} />}
                  </button>
                  <div className="form-links">
                    <Link to="/forgot-password">Forgot Password?</Link>
                  </div>
                </form>
              ) : (
                <div className="google-signin-container">
                  <p className="google-signin-info">
                    Use your Google account for a quick and secure sign-in.
                  </p>
                  <button
                    disabled={loading}
                    onClick={handleGoogleSignIn}
                    className="auth-button google-primary-button"
                  >
                    <FontAwesomeIcon icon={faGoogle} />
                    {loading ? "Redirecting..." : "Sign in with Google"}
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="bottom-links">
            <p>
              Don't have an account? <Link to="/signup">Sign Up</Link>
            </p>
            <p className="terms-link">
              By signing in, you agree to our{" "}
              <Link to="/terms">Terms & Conditions</Link>.
            </p>
          </div>
        </div>

        <div className="login-visual-content">
          {/* Placeholder for image - can be set via CSS background-image */}
          <div className="visual-overlay">
            {/* Optional: Add some text or subtle graphics on the image */}
            <h3>Your Gateway to Cinematic Adventures</h3>
            <p>
              Track, discover, and immerse yourself in the world of movies and
              TV shows.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
