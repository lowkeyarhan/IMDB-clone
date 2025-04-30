import "../styles/movies.css";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart, faBookmark } from "@fortawesome/free-solid-svg-icons";
import Notification from "./Notification";

// Create a cache object outside of the component to persist between renders
const moviesCache = {};

function Movies({ currentPage = 1, onTotalPagesUpdate, setActiveSection }) {
  const navigate = useNavigate();
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

  // Load saved favorites and watchlist
  useEffect(() => {
    const savedFavorites = JSON.parse(localStorage.getItem("favorites")) || [];
    const savedWatchlist = JSON.parse(localStorage.getItem("watchlist")) || [];
    setFavorites(savedFavorites.map((item) => item.id));
    setWatchlist(savedWatchlist.map((item) => item.id));
  }, []);

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
          timestamp: Date.now()
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
        vote_average: movie.vote_average.toFixed(1),
        media_type: "movie",
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
        vote_average: movie.vote_average.toFixed(1),
        media_type: "movie",
      };
      updatedWatchlist = [...currentWatchlist, movieToAdd];
      setWatchlist([...watchlist, movie.id]);
      showNotification(`Added "${movie.title}" to watchlist`, "watchlist-add");
    }

    localStorage.setItem("watchlist", JSON.stringify(updatedWatchlist));
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
                  favorites.includes(movie.id) ? "active" : ""
                }`}
                onClick={(e) => toggleFavorite(e, movie)}
                title={
                  favorites.includes(movie.id)
                    ? "Remove from Favorites"
                    : "Add to Favorites"
                }
                aria-label={
                  favorites.includes(movie.id)
                    ? "Remove from Favorites"
                    : "Add to Favorites"
                }
              >
                <FontAwesomeIcon icon={faHeart} />
              </button>
              <button
                className={`watchlist_btn ${
                  watchlist.includes(movie.id) ? "active" : ""
                }`}
                onClick={(e) => toggleWatchlist(e, movie)}
                title={
                  watchlist.includes(movie.id)
                    ? "Remove from Watchlist"
                    : "Add to Watchlist"
                }
                aria-label={
                  watchlist.includes(movie.id)
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
