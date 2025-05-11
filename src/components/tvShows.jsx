import "../styles/movies.css";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart, faBookmark } from "@fortawesome/free-solid-svg-icons";
import Notification from "./Notification";
import { useAuth } from "../contexts/AuthContext";
import { useUserData } from "../contexts/UserDataContext";

// Create a cache object outside of the component to persist between renders
const tvShowsCache = {};

function TVShows({ currentPage = 1, onTotalPagesUpdate, setActiveSection }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const {
    isInFavorites,
    isInWatchlist,
    addToFavorites,
    removeFromFavorites,
    addToWatchlist,
    removeFromWatchlist,
  } = useUserData();

  const [shows, setShows] = useState([]);
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

  // Fetch TV shows when page changes
  useEffect(() => {
    const fetchTVShows = async () => {
      const cacheKey = `popular-tvshows-page-${currentPage}`;

      // Check if we have cached data that's not expired
      if (
        tvShowsCache[cacheKey] &&
        tvShowsCache[cacheKey].timestamp > Date.now() - CACHE_EXPIRY
      ) {
        console.log("Using cached TV shows data for page", currentPage);
        setShows(tvShowsCache[cacheKey].data);

        // Update total pages from cache as well
        if (onTotalPagesUpdate && tvShowsCache[cacheKey].totalPages) {
          onTotalPagesUpdate(tvShowsCache[cacheKey].totalPages);
        }
        return;
      }

      try {
        const response = await fetch(
          `${BASE_URL}/tv/popular?api_key=${API_KEY}&page=${currentPage}`
        );
        const data = await response.json();
        setShows(data.results);

        // Update total pages in the parent component
        const maxPages = Math.min(data.total_pages, 500);
        if (onTotalPagesUpdate) {
          onTotalPagesUpdate(maxPages);
        }

        // Cache the fetched data with timestamp
        tvShowsCache[cacheKey] = {
          data: data.results,
          totalPages: maxPages,
          timestamp: Date.now(),
        };
      } catch (error) {
        console.error("Error fetching popular TV shows:", error);
      }
    };

    fetchTVShows();

    // Set this as the active section when it's being viewed
    if (setActiveSection) {
      setActiveSection();
    }
  }, [currentPage, API_KEY, onTotalPagesUpdate, setActiveSection]);

  const handleShowClick = (showId) => {
    navigate(`/tv/${showId}`);
  };

  const toggleFavorite = async (e, show) => {
    e.stopPropagation();
    if (!currentUser) {
      showNotification("Please login to add favorites", "error");
      return;
    }

    try {
      const showData = {
        id: show.id,
        name: show.name,
        title: show.name,
        poster_path: getImageUrl(show.poster_path),
        first_air_date: show.first_air_date,
        release_date: show.first_air_date,
        vote_average: show.vote_average,
        media_type: "tv",
      };

      if (isInFavorites(show.id, "tv")) {
        await removeFromFavorites(show.id, "tv");
        showNotification(
          `Removed "${showData.name}" from favorites`,
          "favorite-remove"
        );
      } else {
        await addToFavorites(showData);
        showNotification(
          `Added "${showData.name}" to favorites`,
          "favorite-add"
        );
      }
    } catch (error) {
      console.error("Error in toggleFavorite (tvShows.jsx):", error);
      showNotification("Failed to update favorites", "error");
    }
  };

  const toggleWatchlist = async (e, show) => {
    e.stopPropagation();
    if (!currentUser) {
      showNotification("Please login to add to watchlist", "error");
      return;
    }

    try {
      const showData = {
        id: show.id,
        name: show.name,
        title: show.name,
        poster_path: getImageUrl(show.poster_path),
        first_air_date: show.first_air_date,
        release_date: show.first_air_date,
        vote_average: show.vote_average,
        media_type: "tv",
      };

      if (isInWatchlist(show.id, "tv")) {
        await removeFromWatchlist(show.id, "tv");
        showNotification(
          `Removed "${showData.name}" from watchlist`,
          "watchlist-remove"
        );
      } else {
        await addToWatchlist(showData);
        showNotification(
          `Added "${showData.name}" to watchlist`,
          "watchlist-add"
        );
      }
    } catch (error) {
      console.error("Error in toggleWatchlist (tvShows.jsx):", error);
      showNotification("Failed to update watchlist", "error");
    }
  };

  return (
    <div className="parent_container">
      <h1 id="tvshows-section">Popular TV Shows</h1>
      <div className="movies_container">
        {shows.map((show) => (
          <div
            className="movie_card"
            key={show.id}
            onClick={() => handleShowClick(show.id)}
          >
            <img
              src={
                getImageUrl(show.poster_path) ||
                "https://via.placeholder.com/300x450?text=No+Poster"
              }
              alt={show.name}
            />
            <div className="movie_info">
              <h3>{show.name}</h3>
              <div className="movie_details">
                <span className="release_date">
                  <i className="release_icon">📅</i>{" "}
                  {formatDate(show.first_air_date)}
                </span>
                <span className="rating">
                  <i className="rating_icon">⭐</i>{" "}
                  {show.vote_average.toFixed(1)}
                  /10
                </span>
              </div>
            </div>
            <div className="action_buttons">
              <button
                className={`favorite_btn ${
                  currentUser && isInFavorites(show.id, "tv") ? "active" : ""
                }`}
                onClick={(e) => toggleFavorite(e, show)}
                title={
                  currentUser && isInFavorites(show.id, "tv")
                    ? "Remove from Favorites"
                    : "Add to Favorites"
                }
                aria-label={
                  currentUser && isInFavorites(show.id, "tv")
                    ? "Remove from Favorites"
                    : "Add to Favorites"
                }
              >
                <FontAwesomeIcon icon={faHeart} />
              </button>
              <button
                className={`watchlist_btn ${
                  currentUser && isInWatchlist(show.id, "tv") ? "active" : ""
                }`}
                onClick={(e) => toggleWatchlist(e, show)}
                title={
                  currentUser && isInWatchlist(show.id, "tv")
                    ? "Remove from Watchlist"
                    : "Add to Watchlist"
                }
                aria-label={
                  currentUser && isInWatchlist(show.id, "tv")
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

export default TVShows;
