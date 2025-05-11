import "../styles/movies.css";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart, faBookmark } from "@fortawesome/free-solid-svg-icons";
import Notification from "./Notification";
import { useAuth } from "../contexts/AuthContext";
import {
  getUserFavorites,
  getUserWatchlist,
  addToFavorites,
  removeFromFavorites,
  addToWatchlist,
  removeFromWatchlist,
} from "../firebase/firestore";
import { useHomeData } from "../contexts/HomeDataContext";

function Movies({ currentPage = 1, onTotalPagesUpdate, setActiveSection }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [movies, setMovies] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [notification, setNotification] = useState({
    visible: false,
    message: "",
    type: "",
  });

  // Use the HomeData context for cached data
  const { fetchTrendingMovies, getImageUrl } = useHomeData();

  // Format the date to a more readable format
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
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

  // Load user favorites and watchlist from Firebase
  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser) {
        setFavorites([]);
        setWatchlist([]);
        return;
      }

      try {
        // Load favorites
        const favoritesItems = await getUserFavorites(currentUser.uid);
        const favoriteIds = favoritesItems.map((item) => {
          let mediaId;
          if (item.id && typeof item.id === "string" && item.id.includes("_")) {
            mediaId = item.id.split("_")[1];
          } else {
            mediaId = item.mediaId || item.id;
          }
          return mediaId;
        });
        setFavorites(favoriteIds);

        // Load watchlist
        const watchlistItems = await getUserWatchlist(currentUser.uid);
        const watchlistIds = watchlistItems.map((item) => {
          let mediaId;
          if (item.id && typeof item.id === "string" && item.id.includes("_")) {
            mediaId = item.id.split("_")[1];
          } else {
            mediaId = item.mediaId || item.id;
          }
          return mediaId;
        });
        setWatchlist(watchlistIds);
      } catch (error) {
        console.error("Error loading user data from Firestore:", error);
        console.error("Error details:", error.code, error.message);
        setFavorites([]);
        setWatchlist([]);
      }
    };

    loadUserData();
  }, [currentUser]);

  // Fetch movies when page changes using the HomeData context
  useEffect(() => {
    const getMovies = async () => {
      try {
        // Use the cached data from the context
        const { movies: trendingMovies, totalPages } =
          await fetchTrendingMovies(currentPage);
        setMovies(trendingMovies);

        // Update total pages in the parent component
        if (onTotalPagesUpdate) {
          onTotalPagesUpdate(totalPages);
        }
      } catch (error) {
        console.error("Error fetching trending movies:", error);
      }
    };

    getMovies();

    // Set this as the active section when it's being viewed
    if (setActiveSection) {
      setActiveSection();
    }
  }, [currentPage, onTotalPagesUpdate, setActiveSection, fetchTrendingMovies]);

  const handleMovieClick = (movieId) => {
    navigate(`/movie/${movieId}`);
  };

  const toggleFavorite = async (e, movie) => {
    e.stopPropagation(); // Prevent click from bubbling to parent

    if (!currentUser) {
      showNotification("Please login to add favorites", "error");
      return;
    }

    console.log("Toggle favorite for movie:", movie.id, movie.title);
    console.log("Current user:", currentUser.uid);

    const isInFavorites = favorites.includes(movie.id.toString());
    console.log("Is in favorites?", isInFavorites);

    try {
      if (isInFavorites) {
        // Remove from favorites
        console.log("Removing from favorites:", movie.id);
        await removeFromFavorites(currentUser.uid, movie.id);
        setFavorites(favorites.filter((id) => id !== movie.id.toString()));
        showNotification(
          `Removed "${movie.title}" from favorites`,
          "favorite-remove"
        );
      } else {
        // Add to favorites
        const movieToAdd = {
          id: movie.id,
          title: movie.title,
          poster_path: getImageUrl(movie.poster_path),
          release_date: formatDate(movie.release_date),
          vote_average: movie.vote_average.toFixed(1),
          media_type: "movie",
        };

        console.log("Adding to favorites:", movieToAdd);
        await addToFavorites(currentUser.uid, movieToAdd);
        setFavorites([...favorites, movie.id.toString()]);
        showNotification(`Added "${movie.title}" to favorites`, "favorite-add");
      }
    } catch (error) {
      console.error("Error updating favorites:", error);
      showNotification("Error updating favorites", "error");
    }
  };

  const toggleWatchlist = async (e, movie) => {
    e.stopPropagation(); // Prevent click from bubbling to parent

    if (!currentUser) {
      showNotification("Please login to add items to your watchlist", "error");
      return;
    }

    const isInWatchlist = watchlist.includes(movie.id.toString());

    try {
      if (isInWatchlist) {
        // Remove from watchlist
        await removeFromWatchlist(currentUser.uid, movie.id);
        setWatchlist(watchlist.filter((id) => id !== movie.id.toString()));
        showNotification(
          `Removed "${movie.title}" from watchlist`,
          "watchlist-remove"
        );
      } else {
        // Add to watchlist
        const movieToAdd = {
          id: movie.id,
          title: movie.title,
          poster_path: getImageUrl(movie.poster_path),
          release_date: formatDate(movie.release_date),
          vote_average: movie.vote_average.toFixed(1),
          media_type: "movie",
        };
        await addToWatchlist(currentUser.uid, movieToAdd);
        setWatchlist([...watchlist, movie.id.toString()]);
        showNotification(
          `Added "${movie.title}" to watchlist`,
          "watchlist-add"
        );
      }
    } catch (error) {
      console.error("Error updating watchlist:", error);
      showNotification("Error updating watchlist", "error");
    }
  };

  return (
    <div className="parent_container">
      <h1 id="trending-section">Trending now</h1>
      <div className="movies_container">
        {movies.map((movie) => (
          <div
            className="movie_card"
            key={movie.id}
            onClick={() => handleMovieClick(movie.id)}
          >
            <img src={getImageUrl(movie.poster_path)} alt={movie.title} />
            <div className="movie_info">
              <h3>{movie.title}</h3>
              <div className="movie_details">
                <span className="release_date">
                  <i className="release_icon">📅</i>{" "}
                  {formatDate(movie.release_date)}
                </span>
                <span className="rating">
                  <i className="rating_icon">⭐</i>{" "}
                  {movie.vote_average.toFixed(1)}/10
                </span>
              </div>
            </div>
            <button
              className={`favorite_btn ${
                favorites.includes(movie.id.toString()) ? "active" : ""
              }`}
              onClick={(e) => toggleFavorite(e, movie)}
              aria-label={
                favorites.includes(movie.id.toString())
                  ? "Remove from favorites"
                  : "Add to favorites"
              }
            >
              <FontAwesomeIcon icon={faHeart} />
            </button>
            <button
              className={`watchlist_btn ${
                watchlist.includes(movie.id.toString()) ? "active" : ""
              }`}
              onClick={(e) => toggleWatchlist(e, movie)}
              aria-label={
                watchlist.includes(movie.id.toString())
                  ? "Remove from watchlist"
                  : "Add to watchlist"
              }
            >
              <FontAwesomeIcon icon={faBookmark} />
            </button>
          </div>
        ))}
      </div>
      <Notification
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onClose={hideNotification}
      />
    </div>
  );
}

export default Movies;
