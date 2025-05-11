import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faLock,
  faUser,
  faUserPlus,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";
import "../styles/auth.css";
import { motion, AnimatePresence } from "framer-motion";

// Animation variants (can be shared or customized if needed)
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

function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (password !== passwordConfirm) {
      return setError("Passwords do not match");
    }

    if (password.length < 6) {
      return setError("Password should be at least 6 characters");
    }

    try {
      setError("");
      setLoading(true);
      await signup(email, password, username);
      navigate("/");
    } catch (error) {
      let errorMessage = "Failed to create an account";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Email is already in use";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please choose a stronger one.";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page-container redesigned">
      <div className="login-card">
        <div className="login-form-content">
          <div className="form-header">
            <h2>Create Account</h2>
            <p className="subtitle">
              Join us! Fill out the form to get started.
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

          <motion.div
            className="auth-form-wrapper-animated glassmorphic"
            variants={authSwitchVariants}
            initial="initial"
            animate="animate"
          >
            <form onSubmit={handleSubmit} className="auth-form minimal-form">
              <div className="form-group">
                <label htmlFor="username"></label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  required
                />
              </div>
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
                  placeholder="Create a password (min. 6 characters)"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password-confirm"></label>
                <input
                  type="password"
                  id="password-confirm"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
              </div>
              <button
                disabled={loading}
                type="submit"
                className="auth-button primary-submit-button"
              >
                {loading ? "Creating Account..." : "Sign Up"}
                {!loading && <FontAwesomeIcon icon={faUserPlus} />}
              </button>
            </form>
          </motion.div>

          <div className="bottom-links">
            <p>
              Already have an account?{" "}
              <Link to="/login" className="signup-link">
                Sign In
              </Link>
            </p>
            <p className="terms-link">
              By signing up, you agree to our{" "}
              <Link to="/terms" className="terms-link">
                Terms & Conditions
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="login-visual-content">
          <div className="visual-overlay">
            <h3>Join the Ultimate Movie Community</h3>
            <p>
              Discover, rate, and discuss your favorite films and series with
              fellow enthusiasts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;
