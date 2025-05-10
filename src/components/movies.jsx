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

// Create a cache object outside of the component to persist between renders
const moviesCache = {};

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

  const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
  const BASE_URL = "https://api.themoviedb.org/3";
  const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
  const POSTER_SIZE = "/w500";
  const CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes in milliseconds

  // Function to get image URL
  const getImageUrl = (path) => {
    if (!path) return null;
    return `${IMAGE_BASE_URL}${POSTER_SIZE}${path}`;
  };

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

  // Load saved favorites and watchlist from Firestore
  useEffect(() => {
    async function loadUserData() {
      if (!currentUser) {
        // If not logged in, reset favorites and watchlist
        console.log("No user logged in, resetting favorites and watchlist");
        setFavorites([]);
        setWatchlist([]);
        return;
      }

      console.log("Loading data for user:", currentUser.uid);
      console.log(
        "Current Firebase config:",
        import.meta.env.VITE_FIREBASE_PROJECT_ID || "Not found"
      );

      try {
        // Load favorites from Firestore
        console.log("Fetching favorites from collection 'favourites'");
        console.log("User authenticated:", !!currentUser);
        console.log("User ID being used:", currentUser.uid);
        const favoriteItems = await getUserFavorites(currentUser.uid);
        console.log("Favorites received:", favoriteItems);

        const favoriteIds = favoriteItems.map((item) => {
          // Extract the media ID from the document ID (format: userId_mediaId)
          let mediaId;
          if (item.id && typeof item.id === "string" && item.id.includes("_")) {
            mediaId = item.id.split("_")[1];
          } else {
            mediaId = item.mediaId || item.id;
          }
          return mediaId;
        });
        setFavorites(favoriteIds);

        // Load watchlist from Firestore
        console.log("Fetching watchlist from collection 'watchlist'");
        const watchlistItems = await getUserWatchlist(currentUser.uid);
        console.log("Watchlist received:", watchlistItems);

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
    }

    loadUserData();
  }, [currentUser]);

  // Fetch movies when page changes
  useEffect(() => {
    const fetchMovies = async () => {
      const cacheKey = `trending-movies-page-${currentPage}`;

      // Check if we have cached data that's not expired
      if (
        moviesCache[cacheKey] &&
        moviesCache[cacheKey].timestamp > Date.now() - CACHE_EXPIRY
      ) {
        console.log("Using cached movies data for page", currentPage);
        setMovies(moviesCache[cacheKey].data);

        // Update total pages from cache as well
        if (onTotalPagesUpdate && moviesCache[cacheKey].totalPages) {
          onTotalPagesUpdate(moviesCache[cacheKey].totalPages);
        }
        return;
      }

      try {
        const response = await fetch(
          `${BASE_URL}/trending/movie/week?api_key=${API_KEY}&page=${currentPage}`
        );
        const data = await response.json();
        setMovies(data.results);

        // Update total pages in the parent component
        const maxPages = Math.min(data.total_pages, 500);
        if (onTotalPagesUpdate) {
          onTotalPagesUpdate(maxPages);
        }

        // Cache the fetched data with timestamp
        moviesCache[cacheKey] = {
          data: data.results,
          totalPages: maxPages,
          timestamp: Date.now(),
        };
      } catch (error) {
        console.error("Error fetching trending movies:", error);
      }
    };

    fetchMovies();

    // Set this as the active section when it's being viewed
    if (setActiveSection) {
      setActiveSection();
    }
  }, [currentPage, API_KEY, onTotalPagesUpdate, setActiveSection]);

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
      console.log("Error details:", JSON.stringify(error));
      showNotification("Failed to update favorites", "error");
    }
  };

  const toggleWatchlist = async (e, movie) => {
    e.stopPropagation(); // Prevent click from bubbling to parent

    if (!currentUser) {
      showNotification("Please login to add to watchlist", "error");
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
      showNotification("Failed to update watchlist", "error");
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
            <div className="action_buttons">
              <button
                className={`favorite_btn ${
                  favorites.includes(movie.id.toString()) ? "active" : ""
                }`}
                onClick={(e) => toggleFavorite(e, movie)}
                title={
                  favorites.includes(movie.id.toString())
                    ? "Remove from Favorites"
                    : "Add to Favorites"
                }
                aria-label={
                  favorites.includes(movie.id.toString())
                    ? "Remove from Favorites"
                    : "Add to Favorites"
                }
              >
                <FontAwesomeIcon icon={faHeart} />
              </button>
              <button
                className={`watchlist_btn ${
                  watchlist.includes(movie.id.toString()) ? "active" : ""
                }`}
                onClick={(e) => toggleWatchlist(e, movie)}
                title={
                  watchlist.includes(movie.id.toString())
                    ? "Remove from Watchlist"
                    : "Add to Watchlist"
                }
                aria-label={
                  watchlist.includes(movie.id.toString())
                    ? "Remove from Watchlist"
                    : "Add to Watchlist"
                }
              >
                <FontAwesomeIcon icon={faBookmark} />
              </button>
            </div>
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
