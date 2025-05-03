import React, { useEffect } from "react";
import "../styles/notification.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeart,
  faBookmark,
  faCheck,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

const Notification = ({ message, type, onClose, visible }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

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
      default:
        return null;
    }
  };

  const getNotificationClass = () => {
    if (type.includes("favorite")) {
      return "favorite-notification";
    } else if (type.includes("watchlist") || type === "watched") {
      return "watchlist-notification";
    } else {
      return "";
    }
  };

  return (
    <div
      className={`notification ${getNotificationClass()} ${
        visible ? "show" : ""
      }`}
    >
      <div className="notification-icon">{getIcon()}</div>
      <div className="notification-message">{message}</div>
      <button className="notification-close" onClick={onClose}>
        <FontAwesomeIcon icon={faXmark} />
      </button>
    </div>
  );
};

export default Notification;
