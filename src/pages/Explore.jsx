import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faFilm,
  faTv,
  faTheaterMasks,
  faTimesCircle,
} from "@fortawesome/free-solid-svg-icons";
import "../styles/explore.css";

const PAGE_SIZE = 20; // TMDB default

// Action genre ID for default selection (28 is Action in TMDB)
const ACTION_GENRE_ID = 28;

function Explore() {
  const [genres, setGenres] = useState([]);
  // Set default genre to Action
  const [selectedGenres, setSelectedGenres] = useState([ACTION_GENRE_ID]);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  // Always include all media types - no selector in UI
  const selectedMediaTypes = ["movie", "tv", "anime"];
  const [error, setError] = useState(null);
  const [page, setPage] = useState({ movie: 1, tv: 1, anime: 1 });
  const [hasMore, setHasMore] = useState({
    movie: true,
    tv: true,
    anime: true,
  });
  // Add a flag to prevent showing "no content" during loading
  const [noResultsFlag, setNoResultsFlag] = useState(false);
  // Add a bottom loading state for infinite scroll
  const [bottomLoading, setBottomLoading] = useState(false);
  const isMediaTypeSwitching = useRef(false);
  const loadingTimerRef = useRef(null);
  const contentTimerRef = useRef(null);
  const observer = useRef();
  const bottomRef = useRef();

  const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
  const BASE_URL = "https://api.themoviedb.org/3";
  const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

  // Clear timers on component unmount
  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      if (contentTimerRef.current) clearTimeout(contentTimerRef.current);
    };
  }, []);

  // Fetch genres for all media types and combine them
  const fetchAllGenres = useCallback(async () => {
    try {
      setError(null);
      const movieGenres = await axios.get(
        `${BASE_URL}/genre/movie/list?api_key=${API_KEY}`
      );
      const tvGenres = await axios.get(
        `${BASE_URL}/genre/tv/list?api_key=${API_KEY}`
      );
      let uniqueGenres = [...movieGenres.data.genres];
      tvGenres.data.genres.forEach((tvGenre) => {
        if (!uniqueGenres.some((genre) => genre.id === tvGenre.id)) {
          uniqueGenres.push(tvGenre);
        }
      });
      uniqueGenres.sort((a, b) => a.name.localeCompare(b.name));
      setGenres(uniqueGenres);
      return uniqueGenres;
    } catch (err) {
      console.error("GENRE API ERROR:", err);
      setError("Failed to load genres. Please check your API key or network.");
      setGenres([]);
      return [];
    }
  }, [API_KEY, BASE_URL]);

  // Fetch media for all selected types and pages
  const fetchMedia = useCallback(
    async (opts = { append: false, nextPage: false }) => {
      // For initial or filter changes, use main loader
      if (!opts.append) {
        setLoading(true);
        setShowLoading(false);
        setNoResultsFlag(false); // Reset the no results flag
        setError(null);
        if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
        if (contentTimerRef.current) clearTimeout(contentTimerRef.current);
        loadingTimerRef.current = setTimeout(() => setShowLoading(true), 400);
      } else {
        // For infinite scroll, use bottom loader
        setBottomLoading(true);
      }

      // If no genres, clear
      if (selectedGenres.length === 0 && !initialLoading) {
        setMovies([]);
        setLoading(false);
        setShowLoading(false);
        setBottomLoading(false);
        return;
      }
      try {
        let allResults = [];
        let newHasMore = { ...hasMore };
        let newPages = { ...page };
        const promises = selectedMediaTypes.map(async (type) => {
          let endpoint = "";
          let pageNum = opts.nextPage ? page[type] + 1 : page[type];

          // Fix anime type endpoint formatting
          if (type === "anime") {
            endpoint = `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=${selectedGenres.join(
              ","
            )}&with_original_language=ja&sort_by=popularity.desc&page=${pageNum}`;
          } else {
            endpoint = `${BASE_URL}/discover/${type}?api_key=${API_KEY}&with_genres=${selectedGenres.join(
              ","
            )}&sort_by=popularity.desc&page=${pageNum}`;
          }

          const response = await axios.get(endpoint);

          // Mark if there are more pages
          newHasMore[type] = response.data.results.length === PAGE_SIZE;
          newPages[type] = pageNum;

          return response.data.results.map((item) => ({
            ...item,
            media_type: type,
          }));
        });

        const results = await Promise.all(promises);
        allResults = results.flat();

        // Merge with previous if appending
        let merged = opts.append ? [...movies, ...allResults] : allResults;

        // Deduplicate by id+media_type
        const seen = new Set();
        merged = merged.filter((item) => {
          const key = `${item.media_type}-${item.id}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        merged.sort((a, b) => b.vote_count - a.vote_count);

        // Set no results flag if no content found
        if (merged.length === 0) {
          setNoResultsFlag(true);
        }

        contentTimerRef.current = setTimeout(() => {
          setMovies(merged);
          setLoading(false);
          setShowLoading(false);
          setBottomLoading(false);
          setHasMore(newHasMore);
          setPage(newPages);
          isMediaTypeSwitching.current = false;
        }, 200);
      } catch (err) {
        if (err.response) {
          console.error(
            "MEDIA API ERROR:",
            err.response.status,
            err.response.data
          );
        } else {
          console.error("MEDIA API ERROR:", err.message);
        }
        setError(
          "Failed to load content. Please check your API key or network."
        );
        setMovies([]);
        setLoading(false);
        setShowLoading(false);
        setBottomLoading(false);
        isMediaTypeSwitching.current = false;
      }
    },
    [
      selectedGenres,
      selectedMediaTypes,
      API_KEY,
      BASE_URL,
      initialLoading,
      movies,
      page,
      hasMore,
    ]
  );

  // Initial load: fetch genres and then media
  useEffect(() => {
    setInitialLoading(true);
    setShowLoading(true);
    setMovies([]);
    setPage({ movie: 1, tv: 1, anime: 1 });
    setHasMore({ movie: true, tv: true, anime: true });
    fetchAllGenres().then(() => {
      setInitialLoading(false);
      setShowLoading(false);
      fetchMedia();
    });
    // eslint-disable-next-line
  }, []);

  // Fetch media whenever selected genres change
  useEffect(() => {
    if (!initialLoading) {
      setPage({ movie: 1, tv: 1, anime: 1 });
      setHasMore({ movie: true, tv: true, anime: true });
      fetchMedia({ append: false, nextPage: false });
    }
    // eslint-disable-next-line
  }, [selectedGenres]);

  // Infinite scroll observer
  useEffect(() => {
    if ((loading && !bottomLoading) || showLoading) return;
    if (!hasMore.movie && !hasMore.tv && !hasMore.anime) return;
    if (!bottomRef.current) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new window.IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !bottomLoading) {
          fetchMedia({ append: true, nextPage: true });
        }
      },
      { threshold: 0.5 }
    );
    observer.current.observe(bottomRef.current);
    // eslint-disable-next-line
  }, [loading, showLoading, hasMore, movies, bottomLoading]);

  // Toggle genre selection (multi-select)
  const handleGenreClick = (genreId) => {
    if (loading) return;
    setSelectedGenres((prev) =>
      prev.includes(genreId)
        ? prev.filter((id) => id !== genreId)
        : [...prev, genreId]
    );
  };

  const clearGenreSelection = () => {
    if (loading) return;
    setSelectedGenres([]);
  };

  // UI shows genres and content
  return (
    <div className="explore-container">
      <div className="explore-header">
        <h1>Explore</h1>
      </div>
      <div className="genre-section">
        <div className="genre-header">
          <h2>Genres</h2>
          {selectedGenres.length > 0 && (
            <button
              className="clear-genres"
              onClick={clearGenreSelection}
              disabled={loading}
            >
              <FontAwesomeIcon icon={faTimesCircle} /> Clear
            </button>
          )}
        </div>
        <div className="genre-scroll-container">
          <div className="genre-list">
            {genres.map((genre) => (
              <button
                key={genre.id}
                className={`genre-btn ${
                  selectedGenres.includes(genre.id) ? "active" : ""
                }`}
                onClick={() => handleGenreClick(genre.id)}
                disabled={loading}
              >
                {genre.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      {showLoading ? (
        <div className="slick-loader">
          <div className="slick-loader-ring"></div>
          <div className="slick-loader-text">Loading content...</div>
        </div>
      ) : error ? (
        <div className="error-container">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="retry-btn"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="explore-results">
          {!loading && !error && movies.length === 0 && noResultsFlag && (
            <p className="no-results">
              {selectedGenres.length > 0
                ? "No content found for these genres. Try selecting different genres."
                : "No genre selected. Select genres to explore content."}
            </p>
          )}
          <div className="media-grid">
            {movies.map((item) => (
              <Link
                to={`/${item.media_type === "anime" ? "tv" : item.media_type}/${
                  item.id
                }`}
                key={`${item.media_type}-${item.id}`}
                className="media-card"
              >
                <div className="media-poster">
                  {item.poster_path ? (
                    <img
                      src={`${IMAGE_BASE_URL}/w500${item.poster_path}`}
                      alt={item.title || item.name}
                      loading="lazy"
                    />
                  ) : (
                    <div className="no-poster">
                      <span>No Poster Available</span>
                    </div>
                  )}
                  <div className="media-card-overlay">
                    {/* <div className="media-type-badge">
                      {item.media_type === "movie" && (
                        <FontAwesomeIcon icon={faFilm} />
                      )}
                      {item.media_type === "tv" && (
                        <FontAwesomeIcon icon={faTv} />
                      )}
                      {item.media_type === "anime" && (
                        <FontAwesomeIcon icon={faTheaterMasks} />
                      )}
                    </div> */}
                    <div className="media-card-rating">
                      ★ {item.vote_average.toFixed(1)}
                    </div>
                  </div>
                </div>
                <div className="card_details_media">
                  <h3 className="media-title">{item.title || item.name}</h3>
                  <p className="media-release-date">
                    {(item.release_date || item.first_air_date)?.substring(
                      0,
                      4
                    ) || "N/A"}
                  </p>
                </div>
              </Link>
            ))}

            {/* Bottom loader for infinite scroll */}
            <div ref={bottomRef} className="infinite-scroll-sentinel">
              {bottomLoading && (
                <div className="bottom-loader">
                  <div className="bottom-loader-indicator">
                    <div className="bottom-loader-dot"></div>
                    <div className="bottom-loader-dot"></div>
                    <div className="bottom-loader-dot"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Explore;
 