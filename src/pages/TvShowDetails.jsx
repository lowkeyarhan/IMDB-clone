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

function TVShowDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [show, setShow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerKey, setTrailerKey] = useState(null);
  const [notification, setNotification] = useState({
    visible: false,
    message: "",
    type: "",
  });

  const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
  const BASE_URL = "https://api.themoviedb.org/3";
  const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
  const BACKDROP_SIZE = "/original";
  const POSTER_SIZE = "/w500";

  useEffect(() => {
    const savedFavorites = JSON.parse(localStorage.getItem("favorites")) || [];
    const savedWatchlist = JSON.parse(localStorage.getItem("watchlist")) || [];
    setFavorites(savedFavorites.map((item) => item.id));
    setWatchlist(savedWatchlist.map((item) => item.id));

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

  const toggleFavorite = () => {
    if (!show) return;

    const currentFavorites =
      JSON.parse(localStorage.getItem("favorites")) || [];
    const showExists = currentFavorites.some((item) => item.id === show.id);

    let updatedFavorites;
    if (showExists) {
      updatedFavorites = currentFavorites.filter((item) => item.id !== show.id);
      setFavorites(favorites.filter((id) => id !== show.id));
    } else {
      const showToAdd = {
        id: show.id,
        title: show.name,
        poster_path: getImageUrl(show.poster_path),
        release_date: formatDate(show.first_air_date),
        vote_average: show.vote_average?.toFixed(1) || "N/A",
        media_type: "tv",
      };
      updatedFavorites = [...currentFavorites, showToAdd];
      setFavorites([...favorites, show.id]);
    }

    localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
  };

  const toggleWatchlist = () => {
    if (!show) return;

    const currentWatchlist =
      JSON.parse(localStorage.getItem("watchlist")) || [];
    const showExists = currentWatchlist.some((item) => item.id === show.id);

    let updatedWatchlist;
    if (showExists) {
      updatedWatchlist = currentWatchlist.filter((item) => item.id !== show.id);
      setWatchlist(watchlist.filter((id) => id !== show.id));
    } else {
      const showToAdd = {
        id: show.id,
        title: show.name,
        poster_path: getImageUrl(show.poster_path),
        release_date: formatDate(show.first_air_date),
        vote_average: show.vote_average?.toFixed(1) || "N/A",
        media_type: "tv",
      };
      updatedWatchlist = [...currentWatchlist, showToAdd];
      setWatchlist([...watchlist, show.id]);
    }

    localStorage.setItem("watchlist", JSON.stringify(updatedWatchlist));
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

  return (
    <div className="movie-details">
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
                  favorites.includes(show.id) ? "active" : ""
                }`}
                onClick={toggleFavorite}
                title={
                  favorites.includes(show.id)
                    ? "Remove from Favorites"
                    : "Add to Favorites"
                }
              >
                <FontAwesomeIcon icon={faHeart} />
              </button>
              <button
                className={`icon-button watchlist-button ${
                  watchlist.includes(show.id) ? "active" : ""
                }`}
                onClick={toggleWatchlist}
                title={
                  watchlist.includes(show.id)
                    ? "Remove from Watchlist"
                    : "Add to Watchlist"
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
      <Notification
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onClose={() => setNotification({ ...notification, visible: false })}
      />
    </div>
  );
}

export default TVShowDetails;
