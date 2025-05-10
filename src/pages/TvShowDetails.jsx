import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeart,
  faBookmark,
  faPlay,
  faArrowLeft,
  faXmark,
  faTv,
} from "@fortawesome/free-solid-svg-icons";
import "../styles/MovieDetails.css";
import Footer from "../components/Footer.jsx";
import Notification from "../components/Notification.jsx";
import { useAuth } from "../contexts/AuthContext";
import { useUserData } from "../contexts/UserDataContext";

function TVShowDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [show, setShow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerKey, setTrailerKey] = useState(null);
  const [notification, setNotification] = useState({
    visible: false,
    message: "",
    type: "",
  });

  const { currentUser } = useAuth();
  const {
    isInFavorites,
    isInWatchlist,
    addToFavorites,
    removeFromFavorites,
    addToWatchlist,
    removeFromWatchlist,
  } = useUserData();

  const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
  const BASE_URL = "https://api.themoviedb.org/3";
  const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
  const BACKDROP_SIZE = "/original";
  const POSTER_SIZE = "/w500";

  // Show notification
  const showNotification = (message, type) => {
    setNotification({
      message,
      type,
      visible: true,
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
    const fetchTVShowDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${BASE_URL}/tv/${id}?api_key=${API_KEY}&append_to_response=credits,videos,similar,seasons`
        );
        const data = await response.json();
        setShow(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching TV show details:", error);
        setLoading(false);
      }
    };

    fetchTVShowDetails();
  }, [id, API_KEY]);

  const getImageUrl = (path, size = POSTER_SIZE) => {
    if (!path) return null;
    return `${IMAGE_BASE_URL}${size}${path}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatRuntime = (minutes) => {
    if (!minutes || !minutes[0]) return "Unknown";
    const runtime = minutes[0]; // Use the first runtime value
    const hours = Math.floor(runtime / 60);
    const mins = runtime % 60;
    return `${hours}h ${mins}m`;
  };

  const toggleFavorite = async () => {
    if (!show || !currentUser) {
      showNotification("Please login to add favorites", "error");
      return;
    }

    try {
      const showData = {
        id: show.id,
        name: show.name,
        title: show.name, // Ensure we have a title field for consistency
        poster_path: getImageUrl(show.poster_path),
        first_air_date: show.first_air_date,
        release_date: show.first_air_date, // Add release_date for consistency with movies
        vote_average: show.vote_average,
        media_type: "tv",
        // Add additional fields helpful for TV shows
        number_of_seasons: show.number_of_seasons,
        status: show.status,
      };

      if (isInFavorites(show.id, "tv")) {
        await removeFromFavorites(show.id, "tv");
        showNotification(
          `Removed "${show.name}" from favorites`,
          "favorite-remove"
        );
      } else {
        await addToFavorites(showData);
        showNotification(`Added "${show.name}" to favorites`, "favorite-add");
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      showNotification("Failed to update favorites", "error");
    }
  };

  const toggleWatchlist = async () => {
    if (!show || !currentUser) {
      showNotification("Please login to add to watchlist", "error");
      return;
    }

    try {
      const showData = {
        id: show.id,
        name: show.name,
        title: show.name, // Ensure we have a title field for consistency
        poster_path: getImageUrl(show.poster_path),
        first_air_date: show.first_air_date,
        release_date: show.first_air_date, // Add release_date for consistency with movies
        vote_average: show.vote_average,
        media_type: "tv",
        // Add additional fields helpful for TV shows
        number_of_seasons: show.number_of_seasons,
        status: show.status,
      };

      if (isInWatchlist(show.id, "tv")) {
        await removeFromWatchlist(show.id, "tv");
        showNotification(
          `Removed "${show.name}" from watchlist`,
          "watchlist-remove"
        );
      } else {
        await addToWatchlist(showData);
        showNotification(`Added "${show.name}" to watchlist`, "watchlist-add");
      }
    } catch (error) {
      console.error("Error toggling watchlist:", error);
      showNotification("Failed to update watchlist", "error");
    }
  };

  const handlePlayTrailer = () => {
    if (show && show.videos && show.videos.results) {
      // Find a YouTube trailer
      const trailer = show.videos.results.find(
        (video) =>
          (video.type === "Trailer" || video.type === "Teaser") &&
          video.site === "YouTube"
      );

      if (trailer) {
        setTrailerKey(trailer.key);
        setShowTrailer(true);
        document.body.style.overflow = "hidden"; // Prevent scrolling when modal is open
      } else {
        showNotification("No trailer available for this TV show", "info");
      }
    }
  };

  const handlePlayEpisode = () => {
    if (show) {
      navigate(`/watch/tv/${show.id}`);
    }
  };

  const closeTrailer = () => {
    setShowTrailer(false);
    setTrailerKey(null);
    document.body.style.overflow = "auto"; // Re-enable scrolling
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!show) {
    return <div className="error">TV Show not found</div>;
  }

  // Check if TV show is in favorites/watchlist
  const isFavorited = currentUser && isInFavorites(show.id, "tv");
  const isWatchlisted = currentUser && isInWatchlist(show.id, "tv");

  return (
    <div className="movie-details">
      {/* Notification component */}
      <Notification
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onClose={hideNotification}
        duration={4000}
      />

      {/* Trailer Modal */}
      {showTrailer && trailerKey && (
        <div className="trailer-modal">
          <div className="trailer-modal-content">
            <button className="close-trailer-btn" onClick={closeTrailer}>
              <FontAwesomeIcon icon={faXmark} />
            </button>
            <iframe
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
              title="TV Show Trailer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

      {/* Hero Banner Section */}
      <div className="hero-banner">
        <div
          className="hero-background"
          style={{
            backgroundImage: `url(${getImageUrl(
              show.backdrop_path,
              BACKDROP_SIZE
            )})`,
          }}
        ></div>
        <div className="hero-overlay">
          <div className="hero-content">
            <h1>{show.name}</h1>
            <div className="hero-metadata">
              <span className="release-year">
                {show.first_air_date
                  ? new Date(show.first_air_date).getFullYear()
                  : "Unknown"}
              </span>
              <span className="rating">
                {show.vote_average?.toFixed(1) || "N/A"}/10
              </span>
              <span className="runtime">
                {formatRuntime(show.episode_run_time)}
              </span>
            </div>
            <p className="tagline">{show.tagline}</p>
            <div className="hero-actions">
              <button className="play-button" onClick={handlePlayTrailer}>
                <FontAwesomeIcon icon={faPlay} />
                Trailer
              </button>
              <button
                className="play-button play-episode-button"
                onClick={handlePlayEpisode}
              >
                <FontAwesomeIcon icon={faPlay} />
                Episode 1
              </button>
              <button
                className={`icon-button favorite-button ${
                  isFavorited ? "active" : ""
                }`}
                onClick={toggleFavorite}
                title={
                  isFavorited ? "Remove from Favorites" : "Add to Favorites"
                }
              >
                <FontAwesomeIcon icon={faHeart} />
              </button>
              <button
                className={`icon-button watchlist-button ${
                  isWatchlisted ? "active" : ""
                }`}
                onClick={toggleWatchlist}
                title={
                  isWatchlisted ? "Remove from Watchlist" : "Add to Watchlist"
                }
              >
                <FontAwesomeIcon icon={faBookmark} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TV Show Details Section */}
      <div className="details-container">
        <div className="details-grid">
          <div className="details-main">
            <div className="overview">
              <h2>Overview</h2>
              <p>{show.overview}</p>
            </div>

            {/* Enhanced Cast Section */}
            <div className="cast-section">
              <h2>Cast</h2>
              <div className="cast-list">
                {show.credits?.cast?.slice(0, 6).map((person) => (
                  <div className="cast-item" key={person.id}>
                    <div className="cast-image">
                      {person.profile_path ? (
                        <img
                          src={getImageUrl(person.profile_path)}
                          alt={person.name}
                        />
                      ) : (
                        <div className="no-image">No Image</div>
                      )}
                    </div>
                    <div className="cast-info">
                      <p className="cast-name">{person.name}</p>
                      <p className="cast-character">{person.character}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Seasons Section */}
            <div className="seasons-section">
              <h2>Seasons</h2>
              <div className="seasons-list">
                {show.seasons?.map((season) => (
                  <div className="season-item" key={season.id}>
                    <div className="season-image">
                      {season.poster_path ? (
                        <img
                          src={getImageUrl(season.poster_path)}
                          alt={season.name}
                        />
                      ) : (
                        <div className="no-image">No Image</div>
                      )}
                    </div>
                    <div className="season-info">
                      <h3 className="season-name">{season.name}</h3>
                      <p className="season-details">
                        <span className="season-year">
                          {season.air_date
                            ? new Date(season.air_date).getFullYear()
                            : "TBA"}
                        </span>
                        <span className="season-episodes">
                          {season.episode_count} Episodes
                        </span>
                      </p>
                      {season.overview && (
                        <p className="season-overview">
                          {season.overview.length > 100
                            ? `${season.overview.substring(0, 100)}...`
                            : season.overview}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="details-sidebar">
            <div className="info-block">
              <h3>Genres</h3>
              <div className="genres">
                {show.genres?.map((genre) => (
                  <span key={genre.id} className="genre-tag">
                    {genre.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="info-block">
              <h3>First Air Date</h3>
              <p>{formatDate(show.first_air_date)}</p>
            </div>

            <div className="info-block">
              <h3>Last Air Date</h3>
              <p>{formatDate(show.last_air_date)}</p>
            </div>

            <div className="info-block">
              <h3>Status</h3>
              <p>{show.status}</p>
            </div>

            <div className="info-block">
              <h3>Seasons</h3>
              <p>{show.number_of_seasons}</p>
            </div>

            <div className="info-block">
              <h3>Episodes</h3>
              <p>{show.number_of_episodes}</p>
            </div>

            {show.production_companies?.length > 0 && (
              <div className="info-block">
                <h3>Production</h3>
                <p>
                  {show.production_companies
                    .map((company) => company.name)
                    .join(", ")}
                </p>
              </div>
            )}

            {show.networks?.length > 0 && (
              <div className="info-block">
                <h3>Networks</h3>
                <p>{show.networks.map((network) => network.name).join(", ")}</p>
              </div>
            )}
          </div>
        </div>

        {/* Similar Shows Section */}
        {show.similar?.results?.length > 0 && (
          <div className="similar-section">
            <h2>More Like This</h2>
            <div className="similar-grid">
              {show.similar.results.slice(0, 4).map((similar) => (
                <div
                  className="similar-card"
                  key={similar.id}
                  onClick={() => navigate(`/tv/${similar.id}`)}
                >
                  <img
                    src={getImageUrl(similar.poster_path)}
                    alt={similar.name}
                  />
                  <div className="similar-info">
                    <h3>{similar.name}</h3>
                    <p>{similar.vote_average?.toFixed(1) || "N/A"}/10</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default TVShowDetails;
