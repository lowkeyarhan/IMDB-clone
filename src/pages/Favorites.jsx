import React, { useState, useEffect } from "react";
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
import { getUserFavorites, removeFromFavorites } from "../firebase/firestore";

function Favorites() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // Load favorites from Firestore instead of localStorage
  useEffect(() => {
    async function loadFavorites() {
      if (!currentUser) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const favoriteItems = await getUserFavorites(currentUser.uid);
        // Map the data to match the expected format
        const formattedFavorites = favoriteItems.map((favorite) => {
          const item = favorite;
          // Extract the media ID from the document ID (format: userId_mediaId)
          const mediaId = favorite.id.split("_")[1];
          return {
            ...item,
            id: item.id || mediaId, // Use the media ID
            title: item.title,
            poster_path: item.poster_path,
            release_date: item.release_date,
            vote_average: item.vote_average,
            media_type: item.media_type || "movie",
          };
        });
        setFavorites(formattedFavorites);
      } catch (error) {
        console.error("Error loading favorites from Firestore:", error);
        showNotification("Failed to load favorites", "error");
      } finally {
        setLoading(false);
      }
    }

    loadFavorites();
  }, [currentUser]);

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
  const removeFromFavoritesHandler = async (e, itemId, itemTitle) => {
    e.stopPropagation(); // Prevent click from bubbling to parent

    try {
      if (!currentUser) return;

      await removeFromFavorites(currentUser.uid, itemId);

      const updatedFavorites = favorites.filter((item) => item.id !== itemId);
      setFavorites(updatedFavorites);

      showNotification(
        `"${itemTitle}" removed from favorites`,
        "favorite-remove"
      );
    } catch (error) {
      console.error("Error removing from favorites:", error);
      showNotification("Failed to remove from favorites", "error");
    }
  };

  return (
    <div className="saved_container">
      <h1>My Favorites</h1>

      {loading ? (
        <div className="loading-state">
          <FontAwesomeIcon icon={faSpinner} spin size="2x" />
          <p>Loading favorites...</p>
        </div>
      ) : favorites.length === 0 ? (
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
              {item.poster_path && (
                <img src={item.poster_path} alt={item.title} />
              )}
              <div className="saved_movie_info">
                <h3>{item.title}</h3>
                <div className="saved_movie_details">
                  <span className="release_date">
                    <FontAwesomeIcon
                      icon={faCalendarDays}
                      className="release_icon"
                    />{" "}
                    {formatDate(item.release_date) || "N/A"}
                  </span>
                  <span className="rating">
                    <FontAwesomeIcon icon={faStar} className="rating_icon" />{" "}
                    {formatVoteAverage(item.vote_average)}
                  </span>
                </div>
                <button
                  className="remove_btn"
                  onClick={(e) =>
                    removeFromFavoritesHandler(e, item.id, item.title)
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
