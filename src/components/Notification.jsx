import React, { useEffect } from "react";
import "../styles/notification.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeart,
  faBookmark,
  faCheck,
  faXmark,
  faCircleExclamation,
  faCircleInfo,
  faTheaterMasks,
} from "@fortawesome/free-solid-svg-icons";

const Notification = ({ message, type, onClose, visible, duration = 3000 }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      // Add event listener to close notification on Escape key
      const handleEscKey = (event) => {
        if (event.key === "Escape") {
          onClose();
        }
      };
      window.addEventListener("keydown", handleEscKey);

      return () => {
        clearTimeout(timer);
        window.removeEventListener("keydown", handleEscKey);
      };
    }
  }, [visible, onClose, duration]);

  const getIcon = () => {
    switch (type) {
      case "favorite-add":
        return <FontAwesomeIcon icon={faHeart} />;
      case "favorite-remove":
        return <FontAwesomeIcon icon={faXmark} />;
      case "watchlist-add":
        return <FontAwesomeIcon icon={faBookmark} />;
      case "watchlist-remove":
        return <FontAwesomeIcon icon={faXmark} />;
      case "watched":
        return <FontAwesomeIcon icon={faCheck} />;
      case "error":
        return <FontAwesomeIcon icon={faCircleExclamation} />;
      case "success":
        return <FontAwesomeIcon icon={faCheck} />;
      case "info":
        return <FontAwesomeIcon icon={faCircleInfo} />;
      case "anime-add":
      case "anime-remove":
        return <FontAwesomeIcon icon={faTheaterMasks} />;
      default:
        return null;
    }
  };

  const getNotificationClass = () => {
    if (type.includes("favorite")) {
      return "favorite-notification";
    } else if (type.includes("watchlist") || type === "watched") {
      return "watchlist-notification";
    } else if (type.includes("anime")) {
      return "anime-notification";
    } else if (type === "error") {
      return "error-notification";
    } else if (type === "success") {
      return "success-notification";
    } else {
      return "";
    }
  };

  return (
    <div
      className={`notification ${getNotificationClass()} ${
        visible ? "show" : ""
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="notification-icon">{getIcon()}</div>
      <div className="notification-message">{message}</div>
      <button
        className="notification-close"
        onClick={onClose}
        aria-label="Close notification"
      >
        <FontAwesomeIcon icon={faXmark} />
      </button>
    </div>
  );
};

export default Notification;
