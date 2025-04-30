import "../styles/movies.css";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart, faBookmark } from "@fortawesome/free-solid-svg-icons";
import Notification from "./Notification";

// Create a cache object outside of the component to persist between renders
const animeCache = {};

function Anime({ currentPage = 1, onTotalPagesUpdate, setActiveSection }) {
  const navigate = useNavigate();
  const [animeList, setAnimeList] = useState([]);
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

  // Anime genre IDs in TMDB - Animation(16) and often from Japan
  const ANIME_KEYWORDS = "16"; // Animation genre ID
  const ORIGIN_COUNTRY = "JP"; // Japan as origin country

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

  // Load saved favorites and watchlist
  useEffect(() => {
    const savedFavorites = JSON.parse(localStorage.getItem("favorites")) || [];
    const savedWatchlist = JSON.parse(localStorage.getItem("watchlist")) || [];
    setFavorites(savedFavorites.map((item) => item.id));
    setWatchlist(savedWatchlist.map((item) => item.id));
  }, []);

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

        // Update total pages from cache as well
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

        // Filter to most likely be anime (Japanese animation)
        const animeResults = data.results.filter((show) => {
          // If origin_country includes Japan, it's more likely to be anime
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

  const toggleFavorite = (e, anime) => {
    e.stopPropagation(); // Prevent click from bubbling to parent
    const currentFavorites =
      JSON.parse(localStorage.getItem("favorites")) || [];
    const animeExists = currentFavorites.some((item) => item.id === anime.id);

    let updatedFavorites;
    if (animeExists) {
      updatedFavorites = currentFavorites.filter(
        (item) => item.id !== anime.id
      );
      setFavorites(favorites.filter((id) => id !== anime.id));
      showNotification(
        `Removed "${anime.name}" from favorites`,
        "favorite-remove"
      );
    } else {
      const animeToAdd = {
        id: anime.id,
        title: anime.name,
        poster_path: getImageUrl(anime.poster_path),
        release_date: formatDate(anime.first_air_date),
        vote_average: anime.vote_average.toFixed(1),
        media_type: "tv",
      };
      updatedFavorites = [...currentFavorites, animeToAdd];
      setFavorites([...favorites, anime.id]);
      showNotification(`Added "${anime.name}" to favorites`, "favorite-add");
    }

    localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
  };

  const toggleWatchlist = (e, anime) => {
    e.stopPropagation(); // Prevent click from bubbling to parent
    const currentWatchlist =
      JSON.parse(localStorage.getItem("watchlist")) || [];
    const animeExists = currentWatchlist.some((item) => item.id === anime.id);

    let updatedWatchlist;
    if (animeExists) {
      updatedWatchlist = currentWatchlist.filter(
        (item) => item.id !== anime.id
      );
      setWatchlist(watchlist.filter((id) => id !== anime.id));
      showNotification(
        `Removed "${anime.name}" from watchlist`,
        "watchlist-remove"
      );
    } else {
      const animeToAdd = {
        id: anime.id,
        title: anime.name,
        poster_path: getImageUrl(anime.poster_path),
        release_date: formatDate(anime.first_air_date),
        vote_average: anime.vote_average.toFixed(1),
        media_type: "tv",
      };
      updatedWatchlist = [...currentWatchlist, animeToAdd];
      setWatchlist([...watchlist, anime.id]);
      showNotification(`Added "${anime.name}" to watchlist`, "watchlist-add");
    }

    localStorage.setItem("watchlist", JSON.stringify(updatedWatchlist));
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
                  favorites.includes(anime.id) ? "active" : ""
                }`}
                onClick={(e) => toggleFavorite(e, anime)}
                title={
                  favorites.includes(anime.id)
                    ? "Remove from Favorites"
                    : "Add to Favorites"
                }
                aria-label={
                  favorites.includes(anime.id)
                    ? "Remove from Favorites"
                    : "Add to Favorites"
                }
              >
                <FontAwesomeIcon icon={faHeart} />
              </button>
              <button
                className={`watchlist_btn ${
                  watchlist.includes(anime.id) ? "active" : ""
                }`}
                onClick={(e) => toggleWatchlist(e, anime)}
                title={
                  watchlist.includes(anime.id)
                    ? "Remove from Watchlist"
                    : "Add to Watchlist"
                }
                aria-label={
                  watchlist.includes(anime.id)
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
