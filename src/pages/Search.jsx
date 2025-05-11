import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "../styles/savedMovies.css";
import "../styles/search.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeart,
  faBookmark,
  faSearch,
  faCalendarDays,
  faStar,
  faFilm,
  faTv,
} from "@fortawesome/free-solid-svg-icons";
import Notification from "../components/Notification";
import { useAuth } from "../contexts/AuthContext";
import { useUserData } from "../contexts/UserDataContext";

// Cache for search results
const searchCache = {};
const CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes cache

function Search() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const {
    isInFavorites,
    isInWatchlist,
    addToFavorites,
    removeFromFavorites,
    addToWatchlist,
    removeFromWatchlist,
  } = useUserData();

  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({
    visible: false,
    message: "",
    type: "",
  });

  const query = searchParams.get("query") || "";

  // API constants
  const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
  const BASE_URL = "https://api.themoviedb.org/3";
  const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
  const POSTER_SIZE = "/w500";

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

  // Format vote average safely
  const formatVoteAverage = (vote) => {
    if (!vote) return "N/A";
    try {
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

  useEffect(() => {
    const searchContent = async () => {
      if (!query) {
        setSearchResults([]);
        setLoading(false);
        setError(null);
        return;
      }

      // Check if we have this query in cache and it's not expired
      if (
        searchCache[query] &&
        searchCache[query].timestamp > Date.now() - CACHE_EXPIRY
      ) {
        console.log("Using cached search results for:", query);
        setSearchResults(searchCache[query].results);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Use multi-search to get both movies and TV shows
        const url = `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(
          query
        )}&include_adult=false`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.results && Array.isArray(data.results)) {
          // Filter to only keep movies and TV shows
          const filteredResults = data.results.filter(
            (item) => item.media_type === "movie" || item.media_type === "tv"
          );

          // Save to cache
          searchCache[query] = {
            results: filteredResults,
            timestamp: Date.now(),
          };

          setSearchResults(filteredResults);
        } else {
          setSearchResults([]);
          setError("Invalid response format from API");
        }
      } catch (error) {
        console.error("Error searching content:", error);
        setError(`Failed to search: ${error.message}`);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    };

    searchContent();
  }, [query, API_KEY]);

  const handleItemClick = (item) => {
    if (item.media_type === "movie") {
      navigate(`/movie/${item.id}`);
    } else if (item.media_type === "tv") {
      navigate(`/tv/${item.id}`);
    }
  };

  const toggleFavorite = async (e, item) => {
    e.stopPropagation();
    if (!currentUser) {
      showNotification("Please login to add favorites", "error");
      return;
    }

    const title = item.media_type === "movie" ? item.title : item.name;
    const releaseDate =
      item.media_type === "movie" ? item.release_date : item.first_air_date;

    try {
      const itemData = {
        id: item.id,
        title: title,
        poster_path: getImageUrl(item.poster_path),
        release_date: releaseDate,
        vote_average: item.vote_average,
        media_type: item.media_type,
        ...(item.media_type === "tv" && {
          name: item.name,
          first_air_date: item.first_air_date,
        }),
      };

      if (isInFavorites(item.id, item.media_type)) {
        await removeFromFavorites(item.id, item.media_type);
        showNotification(
          `Removed "${title}" from favorites`,
          "favorite-remove"
        );
      } else {
        await addToFavorites(itemData);
        showNotification(`Added "${title}" to favorites`, "favorite-add");
      }
    } catch (error) {
      console.error("Error in toggleFavorite (Search.jsx):", error);
      showNotification("Failed to update favorites", "error");
    }
  };

  const toggleWatchlist = async (e, item) => {
    e.stopPropagation();
    if (!currentUser) {
      showNotification("Please login to add to watchlist", "error");
      return;
    }

    const title = item.media_type === "movie" ? item.title : item.name;
    const releaseDate =
      item.media_type === "movie" ? item.release_date : item.first_air_date;

    try {
      const itemData = {
        id: item.id,
        title: title,
        poster_path: getImageUrl(item.poster_path),
        release_date: releaseDate,
        vote_average: item.vote_average,
        media_type: item.media_type,
        ...(item.media_type === "tv" && {
          name: item.name,
          first_air_date: item.first_air_date,
        }),
      };

      if (isInWatchlist(item.id, item.media_type)) {
        await removeFromWatchlist(item.id, item.media_type);
        showNotification(
          `Removed "${title}" from watchlist`,
          "watchlist-remove"
        );
      } else {
        await addToWatchlist(itemData);
        showNotification(`Added "${title}" to watchlist`, "watchlist-add");
      }
    } catch (error) {
      console.error("Error in toggleWatchlist (Search.jsx):", error);
      showNotification("Failed to update watchlist", "error");
    }
  };

  return (
    <div className="saved_container">
      <h1>Search Results {query && <span>for "{query}"</span>}</h1>

      {loading ? (
        <div className="loading">
          <div className="loader"></div>
          <p>Searching...</p>
        </div>
      ) : error ? (
        <div className="error_message">
          <p>{error}</p>
          <p>Check your API key in the .env file.</p>
        </div>
      ) : searchResults.length === 0 ? (
        <div className="empty_message">
          {query ? (
            <p>No results found for "{query}". Try a different search term.</p>
          ) : (
            <p>Enter a title in the search bar to find movies and TV shows.</p>
          )}
        </div>
      ) : (
        <div className="saved_movies_container search_results_grid">
          {searchResults.map((item) => (
            <div
              className="saved_movie_card"
              key={item.id}
              onClick={() => handleItemClick(item)}
            >
              <div className="media_type_badge">
                <FontAwesomeIcon
                  icon={item.media_type === "movie" ? faFilm : faTv}
                />
              </div>
              {currentUser && isInFavorites(item.id, item.media_type) && (
                <div className="favorite_badge">
                  <FontAwesomeIcon icon={faHeart} />
                </div>
              )}
              <img
                src={
                  item.poster_path
                    ? getImageUrl(item.poster_path)
                    : "https://via.placeholder.com/300x450?text=No+Image"
                }
                alt={item.media_type === "movie" ? item.title : item.name}
              />
              <div className="saved_movie_info">
                <h3>{item.media_type === "movie" ? item.title : item.name}</h3>
                <div className="saved_movie_details">
                  <span className="release_date">
                    <FontAwesomeIcon
                      icon={faCalendarDays}
                      className="release_icon"
                    />{" "}
                    {item.media_type === "movie"
                      ? item.release_date
                        ? formatDate(item.release_date)
                        : "N/A"
                      : item.first_air_date
                      ? formatDate(item.first_air_date)
                      : "N/A"}
                  </span>
                  <span className="rating">
                    <FontAwesomeIcon icon={faStar} className="rating_icon" />{" "}
                    {formatVoteAverage(item.vote_average)}
                  </span>
                </div>
                {item.overview && (
                  <p className="movie_overview">
                    {item.overview.length > 150
                      ? `${item.overview.substring(0, 150)}...`
                      : item.overview}
                  </p>
                )}
                <div className="search_actions">
                  <button
                    className={`action_btn favorite_action ${
                      currentUser && isInFavorites(item.id, item.media_type)
                        ? "active"
                        : ""
                    }`}
                    onClick={(e) => toggleFavorite(e, item)}
                    title={
                      currentUser && isInFavorites(item.id, item.media_type)
                        ? "Remove from Favorites"
                        : "Add to Favorites"
                    }
                  >
                    <FontAwesomeIcon icon={faHeart} />
                    {currentUser && isInFavorites(item.id, item.media_type)
                      ? "Remove Favorite"
                      : "Add to Favorites"}
                  </button>
                  <button
                    className={`action_btn watchlist_action ${
                      currentUser && isInWatchlist(item.id, item.media_type)
                        ? "active"
                        : ""
                    }`}
                    onClick={(e) => toggleWatchlist(e, item)}
                    title={
                      currentUser && isInWatchlist(item.id, item.media_type)
                        ? "Remove from Watchlist"
                        : "Add to Watchlist"
                    }
                  >
                    <FontAwesomeIcon icon={faBookmark} />
                    {currentUser && isInWatchlist(item.id, item.media_type)
                      ? "Remove from Watchlist"
                      : "Add to Watchlist"}
                  </button>
                </div>
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

export default Search;
