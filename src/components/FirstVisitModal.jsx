import React from "react";
import PropTypes from "prop-types";
import "../styles/FirstVisitModal.css"; // We'll create this file next
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChrome,
  faSafari,
  faOpera,
  faAndroid,
  faApple,
  faBrave,
} from "@fortawesome/free-brands-svg-icons";
import {
  faShieldAlt,
  faVideo,
  faMobileAlt,
  faDesktop,
} from "@fortawesome/free-solid-svg-icons";
import { motion, AnimatePresence } from "framer-motion"; // Import framer-motion components

const overlayVariants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeInOut",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: "easeInOut",
    },
  },
};

const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
      delay: 0.1, // Slight delay for content to pop after overlay
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10, // Slightly different exit y
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

const FirstVisitModal = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="modal-overlay-fm"
          key="modal-overlay"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            className="modal-content-fm"
            key="modal-content"
            variants={modalVariants}
            initial="hidden" // Already part of overlay animation, but good for direct use
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal content
          >
            <h2>Welcome to Riyura!</h2>
            <p>A few tips to enhance your viewing experience:</p>

            <div className="modal-section-fm modal-section-ads-fm">
              <h3>
                <FontAwesomeIcon icon={faShieldAlt} /> Block Ads & Popups
              </h3>
              <ul>
                <li>
                  <FontAwesomeIcon
                    icon={faDesktop}
                    className="platform-icon-fm"
                  />
                  <strong>
                    Desktop Browsers (Chrome, Safari, Opera, Edge):
                  </strong>
                  <br />
                  Install the{" "}
                  <a
                    href="https://chrome.google.com/webstore/detail/ghostery-%E2%80%93-privacy-ad-blo/mlomiejdfkolichcflejclcbmpeaniij?hl=en"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ghostery
                  </a>{" "}
                  extension.
                </li>
                <li>
                  <FontAwesomeIcon
                    icon={faAndroid}
                    className="platform-icon-fm"
                  />
                  <strong>Android Users:</strong>
                  <br />
                  Use Private DNS: <code>dns.adguard.com</code> (Set in
                  Wi-Fi/Network settings).
                </li>
                <li>
                  <FontAwesomeIcon
                    icon={faBrave}
                    className="platform-icon-fm"
                  />
                  <strong>Brave Browser Users:</strong>
                  <br />
                  You're all set! Grab some popcorn. 🍿
                </li>
                <li>
                  <FontAwesomeIcon
                    icon={faApple}
                    className="platform-icon-fm"
                  />
                  <strong>iOS Users:</strong>
                  <br />
                  Try enabling content blockers in Safari settings or use an
                  ad-blocking app from the App Store.
                </li>
              </ul>
            </div>

            <div className="modal-section-fm modal-section-4k-fm">
              <h3>
                <FontAwesomeIcon icon={faVideo} /> How to Stream in 4K
              </h3>
              <ul>
                <li>
                  <strong>Primary Server:</strong> Look for and select the "
                  <strong>Dormammu</strong>" server first when choosing a
                  source.
                </li>
                <li>
                  <strong>Player Server Option:</strong> Once the player loads,
                  if multiple internal servers are listed, select "
                  <strong>Yoru</strong>".
                </li>
                <li>
                  If 4K quality is available for the selected stream, it will
                  usually be indicated or selectable in the player's quality
                  settings.
                </li>
                <li>
                  Ensure your internet connection is stable (25+ Mbps) and your
                  device/display supports 4K.
                </li>
              </ul>
            </div>

            <button className="modal-got-it-btn-fm" onClick={onClose}>
              Got it, done with the steps, take me to Riyura!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

FirstVisitModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default FirstVisitModal;
