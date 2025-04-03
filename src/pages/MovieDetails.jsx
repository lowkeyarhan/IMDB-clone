import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeart,
  faBookmark,
  faPlay,
  faArrowLeft,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import "../styles/MovieDetails.css";

function MovieDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerKey, setTrailerKey] = useState(null);

  const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
  const BASE_URL = "https://api.themoviedb.org/3";
  const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
  const BACKDROP_SIZE = "/original";
  const POSTER_SIZE = "/w500";

  useEffect(() => {
    const savedFavorites = JSON.parse(localStorage.getItem("favorites")) || [];
    const savedWatchlist = JSON.parse(localStorage.getItem("watchlist")) || [];
    setFavorites(savedFavorites.map((movie) => movie.id));
    setWatchlist(savedWatchlist.map((movie) => movie.id));

    const fetchMovieDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${BASE_URL}/movie/${id}?api_key=${API_KEY}&append_to_response=credits,videos,similar`
        );
        const data = await response.json();
        setMovie(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching movie details:", error);
        setLoading(false);
      }
    };

    fetchMovieDetails();
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
    if (!minutes) return "Unknown";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const toggleFavorite = () => {
    if (!movie) return;

    const currentFavorites =
      JSON.parse(localStorage.getItem("favorites")) || [];
    const movieExists = currentFavorites.some((item) => item.id === movie.id);

    let updatedFavorites;
    if (movieExists) {
      updatedFavorites = currentFavorites.filter(
        (item) => item.id !== movie.id
      );
      setFavorites(favorites.filter((id) => id !== movie.id));
    } else {
      const movieToAdd = {
        id: movie.id,
        title: movie.title,
        poster_path: getImageUrl(movie.poster_path),
        release_date: formatDate(movie.release_date),
        vote_average: movie.vote_average?.toFixed(1) || "N/A",
      };
      updatedFavorites = [...currentFavorites, movieToAdd];
      setFavorites([...favorites, movie.id]);
    }

    localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
  };

  const toggleWatchlist = () => {
    if (!movie) return;

    const currentWatchlist =
      JSON.parse(localStorage.getItem("watchlist")) || [];
    const movieExists = currentWatchlist.some((item) => item.id === movie.id);

    let updatedWatchlist;
    if (movieExists) {
      updatedWatchlist = currentWatchlist.filter(
        (item) => item.id !== movie.id
      );
      setWatchlist(watchlist.filter((id) => id !== movie.id));
    } else {
      const movieToAdd = {
        id: movie.id,
        title: movie.title,
        poster_path: getImageUrl(movie.poster_path),
        release_date: formatDate(movie.release_date),
        vote_average: movie.vote_average?.toFixed(1) || "N/A",
      };
      updatedWatchlist = [...currentWatchlist, movieToAdd];
      setWatchlist([...watchlist, movie.id]);
    }

    localStorage.setItem("watchlist", JSON.stringify(updatedWatchlist));
  };

  const handlePlayTrailer = () => {
    if (movie && movie.videos && movie.videos.results) {
      // Find a YouTube trailer
      const trailer = movie.videos.results.find(
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

  const closeTrailer = () => {
    setShowTrailer(false);
    setTrailerKey(null);
    document.body.style.overflow = "auto"; // Re-enable scrolling
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!movie) {
    return <div className="error">Movie not found</div>;
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
              title="Movie Trailer"
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
              movie.backdrop_path,
              BACKDROP_SIZE
            )})`,
          }}
        ></div>
        <div className="hero-overlay">
          <div className="hero-content">
            <h1>{movie.title}</h1>
            <div className="hero-metadata">
              <span className="release-year">
                {movie.release_date
                  ? new Date(movie.release_date).getFullYear()
                  : "Unknown"}
              </span>
              <span className="rating">
                {movie.vote_average?.toFixed(1) || "N/A"}/10
              </span>
              <span className="runtime">{formatRuntime(movie.runtime)}</span>
            </div>
            <p className="tagline">{movie.tagline}</p>
            <div className="hero-actions">
              <button className="play-button" onClick={handlePlayTrailer}>
                <FontAwesomeIcon icon={faPlay} /> Play Trailer
              </button>
              <button
                className={`icon-button favorite-button ${
                  favorites.includes(movie.id) ? "active" : ""
                }`}
                onClick={toggleFavorite}
                title={
                  favorites.includes(movie.id)
                    ? "Remove from Favorites"
                    : "Add to Favorites"
                }
              >
                <FontAwesomeIcon icon={faHeart} />
              </button>
              <button
                className={`icon-button watchlist-button ${
                  watchlist.includes(movie.id) ? "active" : ""
                }`}
                onClick={toggleWatchlist}
                title={
                  watchlist.includes(movie.id)
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

      {/* Movie Details Section */}
      <div className="details-container">
        <div className="details-grid">
          <div className="details-main">
            <div className="overview">
              <h2>Overview</h2>
              <p>{movie.overview}</p>
            </div>

            {/* Enhanced Cast Section */}
            <div className="cast-section">
              <h2>Cast</h2>
              <div className="cast-list">
                {movie.credits?.cast?.slice(0, 6).map((person) => (
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
          </div>

          <div className="details-sidebar">
            <div className="info-block">
              <h3>Genres</h3>
              <div className="genres">
                {movie.genres?.map((genre) => (
                  <span key={genre.id} className="genre-tag">
                    {genre.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="info-block">
              <h3>Release Date</h3>
              <p>{formatDate(movie.release_date)}</p>
            </div>

            {movie.production_companies?.length > 0 && (
              <div className="info-block">
                <h3>Production</h3>
                <p>
                  {movie.production_companies
                    .map((company) => company.name)
                    .join(", ")}
                </p>
              </div>
            )}

            {movie.budget > 0 && (
              <div className="info-block">
                <h3>Budget</h3>
                <p>${(movie.budget / 1000000).toFixed(1)}M</p>
              </div>
            )}

            {movie.revenue > 0 && (
              <div className="info-block">
                <h3>Revenue</h3>
                <p>${(movie.revenue / 1000000).toFixed(1)}M</p>
              </div>
            )}
          </div>
        </div>

        {/* Similar Movies Section */}
        {movie.similar?.results?.length > 0 && (
          <div className="similar-section">
            <h2>More Like This</h2>
            <div className="similar-grid">
              {movie.similar.results.slice(0, 4).map((similar) => (
                <div
                  className="similar-card"
                  key={similar.id}
                  onClick={() => navigate(`/movie/${similar.id}`)}
                >
                  <img
                    src={getImageUrl(similar.poster_path)}
                    alt={similar.title}
                  />
                  <div className="similar-info">
                    <h3>{similar.title}</h3>
                    <p>{similar.vote_average?.toFixed(1) || "N/A"}/10</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MovieDetails;
