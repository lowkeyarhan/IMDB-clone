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

function Search() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
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
    const savedFavorites = JSON.parse(localStorage.getItem("favorites")) || [];
    const savedWatchlist = JSON.parse(localStorage.getItem("watchlist")) || [];
    setFavorites(savedFavorites.map((item) => item.id));
    setWatchlist(savedWatchlist.map((item) => item.id));
  }, []);

  useEffect(() => {
    const searchContent = async () => {
      if (!query) {
        setSearchResults([]);
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

    // Search immediately without delay
    searchContent();
  }, [query, API_KEY]);

  const handleItemClick = (item) => {
    if (item.media_type === "movie") {
      navigate(`/movie/${item.id}`);
    } else if (item.media_type === "tv") {
      navigate(`/tv/${item.id}`);
    }
  };

  const toggleFavorite = (e, item) => {
    e.stopPropagation(); // Prevent click from bubbling to parent
    const currentFavorites =
      JSON.parse(localStorage.getItem("favorites")) || [];
    const itemExists = currentFavorites.some((fav) => fav.id === item.id);

    let updatedFavorites;
    const title = item.media_type === "movie" ? item.title : item.name;
    const releaseDate =
      item.media_type === "movie" ? item.release_date : item.first_air_date;

    if (itemExists) {
      updatedFavorites = currentFavorites.filter((fav) => fav.id !== item.id);
      setFavorites(favorites.filter((id) => id !== item.id));
      showNotification(`Removed "${title}" from favorites`, "favorite-remove");
    } else {
      const itemToAdd = {
        id: item.id,
        title: title,
        poster_path: getImageUrl(item.poster_path),
        release_date: formatDate(releaseDate),
        vote_average: item.vote_average
          ? formatVoteAverage(item.vote_average)
          : "N/A",
        media_type: item.media_type,
      };
      updatedFavorites = [...currentFavorites, itemToAdd];
      setFavorites([...favorites, item.id]);
      showNotification(`Added "${title}" to favorites`, "favorite-add");
    }

    localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
  };

  const toggleWatchlist = (e, item) => {
    e.stopPropagation(); // Prevent click from bubbling to parent
    const currentWatchlist =
      JSON.parse(localStorage.getItem("watchlist")) || [];
    const itemExists = currentWatchlist.some((watch) => watch.id === item.id);

    let updatedWatchlist;
    const title = item.media_type === "movie" ? item.title : item.name;
    const releaseDate =
      item.media_type === "movie" ? item.release_date : item.first_air_date;

    if (itemExists) {
      updatedWatchlist = currentWatchlist.filter(
        (watch) => watch.id !== item.id
      );
      setWatchlist(watchlist.filter((id) => id !== item.id));
      showNotification(`Removed "${title}" from watchlist`, "watchlist-remove");
    } else {
      const itemToAdd = {
        id: item.id,
        title: title,
        poster_path: getImageUrl(item.poster_path),
        release_date: formatDate(releaseDate),
        vote_average: item.vote_average
          ? formatVoteAverage(item.vote_average)
          : "N/A",
        media_type: item.media_type,
      };
      updatedWatchlist = [...currentWatchlist, itemToAdd];
      setWatchlist([...watchlist, item.id]);
      showNotification(`Added "${title}" to watchlist`, "watchlist-add");
    }

    localStorage.setItem("watchlist", JSON.stringify(updatedWatchlist));
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
              {favorites.includes(item.id) && (
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
                      favorites.includes(item.id) ? "active" : ""
                    }`}
                    onClick={(e) => toggleFavorite(e, item)}
                    title={
                      favorites.includes(item.id)
                        ? "Remove from Favorites"
                        : "Add to Favorites"
                    }
                  >
                    <FontAwesomeIcon icon={faHeart} />
                    {favorites.includes(item.id)
                      ? "Remove Favorite"
                      : "Add to Favorites"}
                  </button>
                  <button
                    className={`action_btn watchlist_action ${
                      watchlist.includes(item.id) ? "active" : ""
                    }`}
                    onClick={(e) => toggleWatchlist(e, item)}
                    title={
                      watchlist.includes(item.id)
                        ? "Remove from Watchlist"
                        : "Add to Watchlist"
                    }
                  >
                    <FontAwesomeIcon icon={faBookmark} />
                    {watchlist.includes(item.id)
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
