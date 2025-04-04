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
} from "@fortawesome/free-solid-svg-icons";

function Favorites() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
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

  useEffect(() => {
    try {
      const savedFavorites =
        JSON.parse(localStorage.getItem("favorites")) || [];
      setFavorites(savedFavorites);
    } catch (error) {
      console.error("Error loading favorites from localStorage:", error);
      setFavorites([]);
    }
  }, []);

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

  const removeFromFavorites = (e, itemId, itemTitle) => {
    e.stopPropagation(); // Prevent click from bubbling to parent
    const updatedFavorites = favorites.filter((item) => item.id !== itemId);
    setFavorites(updatedFavorites);
    localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
    showNotification(
      `"${itemTitle}" removed from favorites`,
      "favorite-remove"
    );
  };

  return (
    <div className="saved_container">
      <h1>My Favorites</h1>

      {favorites.length === 0 ? (
        <div className="empty_message">
          <p>Oh ohhh! Your favorites list is looking a bit empty.</p>
          <p className="mt-2">
            Mark movies and TV shows you love as favorites to see them here!
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
                  onClick={(e) => removeFromFavorites(e, item.id, item.title)}
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
