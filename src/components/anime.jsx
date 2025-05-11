import "../styles/movies.css";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart, faBookmark } from "@fortawesome/free-solid-svg-icons";
import Notification from "./Notification";
import { useAuth } from "../contexts/AuthContext";
import { useUserData } from "../contexts/UserDataContext";

// Create a cache object outside of the component to persist between renders
const animeCache = {};

function Anime({ currentPage = 1, onTotalPagesUpdate, setActiveSection }) {
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

  const [animeList, setAnimeList] = useState([]);
  const [notification, setNotification] = useState({
    visible: false,
    message: "",
    type: "",
  });

  const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
  const BASE_URL = "https://api.themoviedb.org/3";
  const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
  const POSTER_SIZE = "/w500";
  const CACHE_EXPIRY = 10 * 60 * 1000;

  // Anime genre IDs in TMDB - Animation(16) and often from Japan
  const ANIME_KEYWORDS = "16";
  const ORIGIN_COUNTRY = "JP";

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

  // Fetch anime when page changes
  useEffect(() => {
    const fetchAnime = async () => {
      const cacheKey = `anime-page-${currentPage}`;

      // Check if we have cached data that's not expired
      if (
        animeCache[cacheKey] &&
        animeCache[cacheKey].timestamp > Date.now() - CACHE_EXPIRY
      ) {
        console.log("Using cached anime data for page", currentPage);
        setAnimeList(animeCache[cacheKey].data);

        if (onTotalPagesUpdate && animeCache[cacheKey].totalPages) {
          onTotalPagesUpdate(animeCache[cacheKey].totalPages);
        }
        return;
      }

      try {
        // First, get animation genre shows from Japan
        const response = await fetch(
          `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=${ANIME_KEYWORDS}&with_original_language=ja&page=${currentPage}&sort_by=popularity.desc`
        );
        const data = await response.json();

        const animeResults = data.results.filter((show) => {
          return show.origin_country && show.origin_country.includes("JP");
        });

        setAnimeList(animeResults);

        // Update total pages in the parent component
        const maxPages = Math.min(data.total_pages, 500);
        if (onTotalPagesUpdate) {
          onTotalPagesUpdate(maxPages);
        }

        // Cache the fetched data with timestamp
        animeCache[cacheKey] = {
          data: animeResults,
          totalPages: maxPages,
          timestamp: Date.now(),
        };
      } catch (error) {
        console.error("Error fetching anime:", error);
      }
    };

    fetchAnime();

    // Set this as the active section when it's being viewed
    if (setActiveSection) {
      setActiveSection();
    }
  }, [currentPage, API_KEY, onTotalPagesUpdate, setActiveSection]);

  const handleAnimeClick = (animeId) => {
    navigate(`/tv/${animeId}`);
  };

  const toggleFavorite = async (e, anime) => {
    e.stopPropagation();
    if (!currentUser) {
      showNotification("Please login to add favorites", "error");
      return;
    }

    try {
      const animeData = {
        id: anime.id,
        title: anime.name,
        name: anime.name,
        poster_path: getImageUrl(anime.poster_path),
        first_air_date: anime.first_air_date,
        release_date: anime.first_air_date,
        vote_average: anime.vote_average,
        media_type: "tv",
      };

      if (isInFavorites(anime.id, "tv")) {
        await removeFromFavorites(anime.id, "tv");
        showNotification(
          `Removed "${animeData.title}" from favorites`,
          "favorite-remove"
        );
      } else {
        await addToFavorites(animeData);
        showNotification(
          `Added "${animeData.title}" to favorites`,
          "favorite-add"
        );
      }
    } catch (error) {
      console.error("Error in toggleFavorite (anime.jsx):", error);
      showNotification("Failed to update favorites", "error");
    }
  };

  const toggleWatchlist = async (e, anime) => {
    e.stopPropagation();
    if (!currentUser) {
      showNotification("Please login to add to watchlist", "error");
      return;
    }

    try {
      const animeData = {
        id: anime.id,
        title: anime.name,
        name: anime.name,
        poster_path: getImageUrl(anime.poster_path),
        first_air_date: anime.first_air_date,
        release_date: anime.first_air_date,
        vote_average: anime.vote_average,
        media_type: "tv",
      };

      if (isInWatchlist(anime.id, "tv")) {
        await removeFromWatchlist(anime.id, "tv");
        showNotification(
          `Removed "${animeData.title}" from watchlist`,
          "watchlist-remove"
        );
      } else {
        await addToWatchlist(animeData);
        showNotification(
          `Added "${animeData.title}" to watchlist`,
          "watchlist-add"
        );
      }
    } catch (error) {
      console.error("Error in toggleWatchlist (anime.jsx):", error);
      showNotification("Failed to update watchlist", "error");
    }
  };

  return (
    <div className="parent_container">
      <h1 id="anime-section">Sōzōkai</h1>
      <div className="movies_container">
        {animeList.map((anime) => (
          <div
            className="movie_card"
            key={anime.id}
            onClick={() => handleAnimeClick(anime.id)}
          >
            <img
              src={
                getImageUrl(anime.poster_path) ||
                "https://via.placeholder.com/300x450?text=No+Poster"
              }
              alt={anime.name}
            />
            <div className="movie_info">
              <h3>{anime.name}</h3>
              <div className="movie_details">
                <span className="release_date">
                  <i className="release_icon">📅</i>{" "}
                  {formatDate(anime.first_air_date)}
                </span>
                <span className="rating">
                  <i className="rating_icon">⭐</i>{" "}
                  {anime.vote_average.toFixed(1)}
                  /10
                </span>
              </div>
            </div>
            <div className="action_buttons">
              <button
                className={`favorite_btn ${
                  currentUser && isInFavorites(anime.id, "tv") ? "active" : ""
                }`}
                onClick={(e) => toggleFavorite(e, anime)}
                title={
                  currentUser && isInFavorites(anime.id, "tv")
                    ? "Remove from Favorites"
                    : "Add to Favorites"
                }
                aria-label={
                  currentUser && isInFavorites(anime.id, "tv")
                    ? "Remove from Favorites"
                    : "Add to Favorites"
                }
              >
                <FontAwesomeIcon icon={faHeart} />
              </button>
              <button
                className={`watchlist_btn ${
                  currentUser && isInWatchlist(anime.id, "tv") ? "active" : ""
                }`}
                onClick={(e) => toggleWatchlist(e, anime)}
                title={
                  currentUser && isInWatchlist(anime.id, "tv")
                    ? "Remove from Watchlist"
                    : "Add to Watchlist"
                }
                aria-label={
                  currentUser && isInWatchlist(anime.id, "tv")
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

export default Anime;
