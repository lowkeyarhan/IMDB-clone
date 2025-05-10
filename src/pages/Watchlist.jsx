import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/savedMovies.css";
import Notification from "../components/Notification";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDays,
  faStar,
  faCheck,
  faPlayCircle,
  faFilm,
  faTv,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../contexts/AuthContext";
import { useUserData } from "../contexts/UserDataContext";

function Watchlist() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const {
    watchlist,
    watchlistLoading: loading,
    watchlistError: error,
    removeFromWatchlist: removeItem,
  } = useUserData();
  const [notification, setNotification] = useState({
    visible: false,
    message: "",
    type: "",
  });

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get appropriate release date based on media type
  const getAppropriateDate = (item) => {
    if (item.media_type === "tv") {
      return item.first_air_date || item.release_date;
    }
    return item.release_date;
  };

  // Format vote average safely
  const formatVoteAverage = (vote) => {
    if (!vote) return "N/A";
    try {
      if (typeof vote === "string" && vote.includes(".")) {
        return vote;
      }
      return Number(vote).toFixed(1);
    } catch (error) {
      return vote;
    }
  };

  // Show notification
  const showNotification = (message, type) => {
    setNotification({
      visible: true,
      message,
      type,
    });
  };

  // Hide notification
  const hideNotification = () => {
    setNotification({
      ...notification,
      visible: false,
    });
  };

  const handleItemClick = (item) => {
    const mediaType = item.media_type || "movie";
    navigate(`/${mediaType}/${item.id}`);
  };

  // Mark as watched in Firestore
  const markAsWatched = async (e, itemId, mediaType, itemTitle) => {
    e.stopPropagation();

    try {
      if (!currentUser) return;

      const success = await removeItem(itemId, mediaType);

      if (success) {
        showNotification(
          `"${itemTitle}" marked as watched and removed from watchlist`,
          "watchlist-remove"
        );
      }
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      showNotification("Failed to mark as watched", "error");
    }
  };

  if (loading) {
    return (
      <div className="saved_container">
        <h1>My Watchlist</h1>
        <div className="loading-container">
          <FontAwesomeIcon icon={faSpinner} spin className="loading-icon" />
          <p>Loading your watchlist...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="saved_container">
        <h1>My Watchlist</h1>
        <div className="error-container">
          <p>Error loading watchlist: {error}</p>
          <p>Please try signing out and back in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="saved_container">
      <h1>My Watchlist</h1>

      {watchlist.length === 0 ? (
        <div className="empty_message">
          <p>Mmm... your watchlist's looking a little lonely.</p>
          <p className="mt-2">
            Add something spicy—I'd love to know what you're craving next. 😏
          </p>
        </div>
      ) : (
        <div className="saved_movies_container">
          {watchlist.map((item) => (
            <div
              className="saved_movie_card"
              key={item.id}
              onClick={() => handleItemClick(item)}
            >
              <div className="media_type_badge">
                <FontAwesomeIcon
                  icon={item.media_type === "tv" ? faTv : faFilm}
                  title={item.media_type === "tv" ? "TV Show" : "Movie"}
                />
              </div>
              {item.poster_path ? (
                <img src={item.poster_path} alt={item.title} />
              ) : (
                <div className="no-poster">No image available</div>
              )}
              <div className="saved_movie_info">
                <h3>{item.title || "Unknown Title"}</h3>
                <div className="saved_movie_details">
                  <span className="release_date">
                    <FontAwesomeIcon
                      icon={faCalendarDays}
                      className="release_icon"
                    />{" "}
                    {formatDate(getAppropriateDate(item)) || "N/A"}
                  </span>
                  <span className="rating">
                    <FontAwesomeIcon icon={faStar} className="rating_icon" />{" "}
                    {formatVoteAverage(item.vote_average)}
                  </span>
                </div>
                {item.media_type === "tv" && item.number_of_seasons && (
                  <div className="tv-info">
                    <small>
                      {item.number_of_seasons} Season
                      {item.number_of_seasons !== 1 ? "s" : ""} •{" "}
                      {item.status || "Unknown status"}
                    </small>
                  </div>
                )}
                <button
                  className="watched_btn"
                  onClick={(e) =>
                    markAsWatched(e, item.id, item.media_type, item.title)
                  }
                >
                  <FontAwesomeIcon icon={faCheck} /> Mark as Watched
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Notification
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onClose={hideNotification}
      />
    </div>
  );
}

export default Watchlist;
