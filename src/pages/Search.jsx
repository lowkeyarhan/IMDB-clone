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
    setFavorites(savedFavorites.map((movie) => movie.id));
    setWatchlist(savedWatchlist.map((movie) => movie.id));
  }, []);

  useEffect(() => {
    const searchMovies = async () => {
      if (!query) {
        setSearchResults([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const url = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(
          query
        )}&include_adult=false`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.results && Array.isArray(data.results)) {
          setSearchResults(data.results);
        } else {
          setSearchResults([]);
          setError("Invalid response format from API");
        }
      } catch (error) {
        console.error("Error searching movies:", error);
        setError(`Failed to search movies: ${error.message}`);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    };

    // Search immediately without delay
    searchMovies();
  }, [query, API_KEY]);

  const handleMovieClick = (movieId) => {
    navigate(`/movie/${movieId}`);
  };

  const toggleFavorite = (e, movie) => {
    e.stopPropagation(); // Prevent click from bubbling to parent
    const currentFavorites =
      JSON.parse(localStorage.getItem("favorites")) || [];
    const movieExists = currentFavorites.some((item) => item.id === movie.id);

    let updatedFavorites;
    if (movieExists) {
      updatedFavorites = currentFavorites.filter(
        (item) => item.id !== movie.id
      );
      setFavorites(favorites.filter((id) => id !== movie.id));
      showNotification(
        `Removed "${movie.title}" from favorites`,
        "favorite-remove"
      );
    } else {
      const movieToAdd = {
        id: movie.id,
        title: movie.title,
        poster_path: getImageUrl(movie.poster_path),
        release_date: formatDate(movie.release_date),
        vote_average: movie.vote_average
          ? formatVoteAverage(movie.vote_average)
          : "N/A",
      };
      updatedFavorites = [...currentFavorites, movieToAdd];
      setFavorites([...favorites, movie.id]);
      showNotification(`Added "${movie.title}" to favorites`, "favorite-add");
    }

    localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
  };

  const toggleWatchlist = (e, movie) => {
    e.stopPropagation(); // Prevent click from bubbling to parent
    const currentWatchlist =
      JSON.parse(localStorage.getItem("watchlist")) || [];
    const movieExists = currentWatchlist.some((item) => item.id === movie.id);

    let updatedWatchlist;
    if (movieExists) {
      updatedWatchlist = currentWatchlist.filter(
        (item) => item.id !== movie.id
      );
      setWatchlist(watchlist.filter((id) => id !== movie.id));
      showNotification(
        `Removed "${movie.title}" from watchlist`,
        "watchlist-remove"
      );
    } else {
      const movieToAdd = {
        id: movie.id,
        title: movie.title,
        poster_path: getImageUrl(movie.poster_path),
        release_date: formatDate(movie.release_date),
        vote_average: movie.vote_average
          ? formatVoteAverage(movie.vote_average)
          : "N/A",
      };
      updatedWatchlist = [...currentWatchlist, movieToAdd];
      setWatchlist([...watchlist, movie.id]);
      showNotification(`Added "${movie.title}" to watchlist`, "watchlist-add");
    }

    localStorage.setItem("watchlist", JSON.stringify(updatedWatchlist));
  };

  return (
    <div className="saved_container">
      <h1>Search Results {query && <span>for "{query}"</span>}</h1>

      {loading ? (
        <div className="loading">
          <div className="loader"></div>
          <p>Searching movies...</p>
        </div>
      ) : error ? (
        <div className="error_message">
          <p>{error}</p>
          <p>Check your API key in the .env file.</p>
        </div>
      ) : searchResults.length === 0 ? (
        <div className="empty_message">
          {query ? (
            <p>No movies found for "{query}". Try a different search term.</p>
          ) : (
            <p>Enter a movie title in the search bar to find movies.</p>
          )}
        </div>
      ) : (
        <div className="saved_movies_container search_results_grid">
          {searchResults.map((movie) => (
            <div
              className="saved_movie_card"
              key={movie.id}
              onClick={() => handleMovieClick(movie.id)}
            >
              {favorites.includes(movie.id) && (
                <div className="favorite_badge">
                  <FontAwesomeIcon icon={faHeart} />
                </div>
              )}
              <img
                src={
                  movie.poster_path
                    ? getImageUrl(movie.poster_path)
                    : "https://via.placeholder.com/300x450?text=No+Image"
                }
                alt={movie.title}
              />
              <div className="saved_movie_info">
                <h3>{movie.title}</h3>
                <div className="saved_movie_details">
                  <span className="release_date">
                    <FontAwesomeIcon
                      icon={faCalendarDays}
                      className="release_icon"
                    />{" "}
                    {movie.release_date
                      ? formatDate(movie.release_date)
                      : "N/A"}
                  </span>
                  <span className="rating">
                    <FontAwesomeIcon icon={faStar} className="rating_icon" />{" "}
                    {formatVoteAverage(movie.vote_average)}
                  </span>
                </div>
                {movie.overview && (
                  <p className="movie_overview">
                    {movie.overview.length > 150
                      ? `${movie.overview.substring(0, 150)}...`
                      : movie.overview}
                  </p>
                )}
                <div className="search_actions">
                  <button
                    className={`action_btn favorite_action ${
                      favorites.includes(movie.id) ? "active" : ""
                    }`}
                    onClick={(e) => toggleFavorite(e, movie)}
                    title={
                      favorites.includes(movie.id)
                        ? "Remove from Favorites"
                        : "Add to Favorites"
                    }
                  >
                    <FontAwesomeIcon icon={faHeart} />
                    {favorites.includes(movie.id)
                      ? "Remove Favorite"
                      : "Add to Favorites"}
                  </button>
                  <button
                    className={`action_btn watchlist_action ${
                      watchlist.includes(movie.id) ? "active" : ""
                    }`}
                    onClick={(e) => toggleWatchlist(e, movie)}
                    title={
                      watchlist.includes(movie.id)
                        ? "Remove from Watchlist"
                        : "Add to Watchlist"
                    }
                  >
                    <FontAwesomeIcon icon={faBookmark} />
                    {watchlist.includes(movie.id)
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
