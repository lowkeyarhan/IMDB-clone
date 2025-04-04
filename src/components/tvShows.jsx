import "../styles/movies.css";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart, faBookmark } from "@fortawesome/free-solid-svg-icons";
import Notification from "./Notification";

function TVShows({ currentPage = 1, onTotalPagesUpdate, setActiveSection }) {
  const navigate = useNavigate();
  const [shows, setShows] = useState([]);
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

  // Fetch TV shows when page changes
  useEffect(() => {
    const fetchTVShows = async () => {
      try {
        const response = await fetch(
          `${BASE_URL}/tv/popular?api_key=${API_KEY}&page=${currentPage}`
        );
        const data = await response.json();
        setShows(data.results);

        // Update total pages in the parent component
        if (onTotalPagesUpdate) {
          const maxPages = Math.min(data.total_pages, 500);
          onTotalPagesUpdate(maxPages);
        }
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

  const toggleFavorite = (e, show) => {
    e.stopPropagation(); // Prevent click from bubbling to parent
    const currentFavorites =
      JSON.parse(localStorage.getItem("favorites")) || [];
    const showExists = currentFavorites.some((item) => item.id === show.id);

    let updatedFavorites;
    if (showExists) {
      updatedFavorites = currentFavorites.filter((item) => item.id !== show.id);
      setFavorites(favorites.filter((id) => id !== show.id));
      showNotification(
        `Removed "${show.name}" from favorites`,
        "favorite-remove"
      );
    } else {
      const showToAdd = {
        id: show.id,
        title: show.name,
        poster_path: getImageUrl(show.poster_path),
        release_date: formatDate(show.first_air_date),
        vote_average: show.vote_average.toFixed(1),
        media_type: "tv",
      };
      updatedFavorites = [...currentFavorites, showToAdd];
      setFavorites([...favorites, show.id]);
      showNotification(`Added "${show.name}" to favorites`, "favorite-add");
    }

    localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
  };

  const toggleWatchlist = (e, show) => {
    e.stopPropagation(); // Prevent click from bubbling to parent
    const currentWatchlist =
      JSON.parse(localStorage.getItem("watchlist")) || [];
    const showExists = currentWatchlist.some((item) => item.id === show.id);

    let updatedWatchlist;
    if (showExists) {
      updatedWatchlist = currentWatchlist.filter((item) => item.id !== show.id);
      setWatchlist(watchlist.filter((id) => id !== show.id));
      showNotification(
        `Removed "${show.name}" from watchlist`,
        "watchlist-remove"
      );
    } else {
      const showToAdd = {
        id: show.id,
        title: show.name,
        poster_path: getImageUrl(show.poster_path),
        release_date: formatDate(show.first_air_date),
        vote_average: show.vote_average.toFixed(1),
        media_type: "tv",
      };
      updatedWatchlist = [...currentWatchlist, showToAdd];
      setWatchlist([...watchlist, show.id]);
      showNotification(`Added "${show.name}" to watchlist`, "watchlist-add");
    }

    localStorage.setItem("watchlist", JSON.stringify(updatedWatchlist));
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
            <img src={getImageUrl(show.poster_path)} alt={show.name} />
            <div className="movie_info">
              <h3>{show.name}</h3>
              <div className="movie_details">
                <span className="release_date">
                  <i className="release_icon">📅</i>{" "}
                  {formatDate(show.first_air_date)}
                </span>
                <span className="rating">
                  <i className="rating_icon">⭐</i>{" "}
                  {show.vote_average.toFixed(1)}/10
                </span>
              </div>
            </div>
            <div className="action_buttons">
              <button
                className={`favorite_btn ${
                  favorites.includes(show.id) ? "active" : ""
                }`}
                onClick={(e) => toggleFavorite(e, show)}
                title={
                  favorites.includes(show.id)
                    ? "Remove from Favorites"
                    : "Add to Favorites"
                }
                aria-label={
                  favorites.includes(show.id)
                    ? "Remove from Favorites"
                    : "Add to Favorites"
                }
              >
                <FontAwesomeIcon icon={faHeart} />
              </button>
              <button
                className={`watchlist_btn ${
                  watchlist.includes(show.id) ? "active" : ""
                }`}
                onClick={(e) => toggleWatchlist(e, show)}
                title={
                  watchlist.includes(show.id)
                    ? "Remove from Watchlist"
                    : "Add to Watchlist"
                }
                aria-label={
                  watchlist.includes(show.id)
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
