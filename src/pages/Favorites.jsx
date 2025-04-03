import React, { useState, useEffect } from "react";
import "../styles/savedMovies.css";
import Notification from "../components/Notification";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDays,
  faStar,
  faTrash,
  faHeart,
} from "@fortawesome/free-solid-svg-icons";

function Favorites() {
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

  const removeFromFavorites = (movieId, movieTitle) => {
    const updatedFavorites = favorites.filter((movie) => movie.id !== movieId);
    setFavorites(updatedFavorites);
    localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
    showNotification(
      `"${movieTitle}" removed from favorites`,
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
            Mark movies you love as favorites to see them here!
          </p>
        </div>
      ) : (
        <div className="saved_movies_container">
          {favorites.map((movie) => (
            <div className="saved_movie_card" key={movie.id}>
              <div className="favorite_badge">
                <FontAwesomeIcon icon={faHeart} />
              </div>
              {movie.poster_path && (
                <img src={movie.poster_path} alt={movie.title} />
              )}
              <div className="saved_movie_info">
                <h3>{movie.title}</h3>
                <div className="saved_movie_details">
                  <span className="release_date">
                    <FontAwesomeIcon
                      icon={faCalendarDays}
                      className="release_icon"
                    />{" "}
                    {formatDate(movie.release_date) || "N/A"}
                  </span>
                  <span className="rating">
                    <FontAwesomeIcon icon={faStar} className="rating_icon" />{" "}
                    {formatVoteAverage(movie.vote_average)}
                  </span>
                </div>
                <button
                  className="remove_btn"
                  onClick={() => removeFromFavorites(movie.id, movie.title)}
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
