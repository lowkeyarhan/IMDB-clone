import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/savedMovies.css";
import Notification from "../components/Notification";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDays,
  faStar,
  faTrash,
  faHeart,
  faFilm,
  faTv,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../contexts/AuthContext";
import { useUserData } from "../contexts/UserDataContext";

function Favorites() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const {
    favorites,
    favoritesLoading: loading,
    favoritesError: error,
    removeFromFavorites: removeItem,
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
    const mediaType = item.media_type || "movie"; // Default to movie for backward compatibility
    navigate(`/${mediaType}/${item.id}`);
  };

  // Remove from favorites in Firestore
  const removeFromFavoritesHandler = async (
    e,
    itemId,
    mediaType,
    itemTitle
  ) => {
    e.stopPropagation(); // Prevent click from bubbling to parent

    try {
      if (!currentUser) return;

      const success = await removeItem(itemId, mediaType);

      if (success) {
        showNotification(
          `"${itemTitle}" removed from favorites`,
          "favorite-remove"
        );
      }
    } catch (error) {
      console.error("Error removing from favorites:", error);
      showNotification("Failed to remove from favorites", "error");
    }
  };

  if (loading) {
    return (
      <div className="saved_container">
        <h1>My Favorites</h1>
        <div className="loading-state">
          <FontAwesomeIcon icon={faSpinner} spin size="2x" />
          <p>Loading favorites...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="saved_container">
        <h1>My Favorites</h1>
        <div className="error-container">
          <p>Error loading favorites: {error}</p>
          <p>Please try signing out and back in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="saved_container">
      <h1>My Favorites</h1>

      {favorites.length === 0 ? (
        <div className="empty_message">
          <p>Oh ohhh... someone's keeping their heart empty?</p>
          <p className="mt-2">
            Go on, mark your faves—let me see what turns you on. 💋
          </p>
        </div>
      ) : (
        <div className="saved_movies_container">
          {favorites.map((item) => (
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
              <div className="favorite_badge">
                <FontAwesomeIcon icon={faHeart} />
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
                  className="remove_btn"
                  onClick={(e) =>
                    removeFromFavoritesHandler(
                      e,
                      item.id,
                      item.media_type,
                      item.title
                    )
                  }
                >
                  <FontAwesomeIcon icon={faTrash} /> Remove
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

export default Favorites;
