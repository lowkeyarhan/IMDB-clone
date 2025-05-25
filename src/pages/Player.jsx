import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faList,
  faCircleInfo,
  faSpinner,
  faExclamationTriangle,
  faAngleLeft,
  faAngleRight,
  faStar,
  faCalendarAlt,
  faHome,
  faHeart,
  faMoon,
  faComment,
  faShareAlt,
  faPlay,
  faSearch,
  faTh,
  faThList,
  faSortAmountDown,
  faCheck,
  faPlayCircle,
  faChevronLeft,
  faChevronRight,
  faServer,
  faThLarge,
} from "@fortawesome/free-solid-svg-icons";
import {
  faFacebookF,
  faTwitter,
  faWhatsapp,
  faTelegram,
  faRedditAlien,
} from "@fortawesome/free-brands-svg-icons";
import "../styles/Player.css";
import { useAuth } from "../contexts/AuthContext";
import { addRecentlyWatched } from "../firebase/firestore";

function Player() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeServerIndex, setActiveServerIndex] = useState(0);
  const [showServerList, setShowServerList] = useState(false);
  const [seasonNumber, setSeasonNumber] = useState(1);
  const [episodeNumber, setEpisodeNumber] = useState(1);
  const [seasons, setSeasons] = useState([]);
  const [streamLinks, setStreamLinks] = useState([]);
  const [mediaDetails, setMediaDetails] = useState({
    overview: "",
    releaseDate: "",
    rating: "",
    genres: [],
    backdrop: "",
    posterPath: null,
    title: "",
  });
  const [episodeDetails, setEpisodeDetails] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
  const [activeServer, setActiveServer] = useState({
    server: "Loading...",
    link: "",
  });
  const [videoKey, setVideoKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const searchTimeoutRef = useRef(null);
  const SEARCH_DEBOUNCE_DELAY = 500;
  const playbackStartTimeRef = useRef(null);
  const accumulatedWatchTimeRef = useRef(0);

  const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
  const BASE_URL = "https://api.themoviedb.org/3";

  // --- START: Watch Time Tracking Logic ---
  const recordWatchSession = useCallback(async () => {
    console.log("[Player] recordWatchSession: Function entered.");
    if (currentUser && mediaDetails && mediaDetails.title) {
      console.log(`[Player] Recording watch session for ${mediaDetails.title}`);
      const watchedDurationSeconds = accumulatedWatchTimeRef.current;
      // const watchedDurationMinutes = watchedDurationSeconds / 60; // No longer passing minutes explicitly

      const item = {
        id: id,
        media_type: type, // Use 'type' from params as media_type
        title: mediaDetails.title,
        poster_path: mediaDetails.posterPath || mediaDetails.backdrop, // Ensure poster_path is used
        ...(type === "tv" && {
          name: mediaDetails.title, // or specific name field if different
          first_air_date: mediaDetails.releaseDate, // Assuming releaseDate holds first_air_date for TV
          season_number: seasonNumber, // Added season number
          episode_number: episodeNumber, // Added episode number
        }),
        ...(type === "movie" && {
          release_date: mediaDetails.releaseDate,
        }),
      };

      // Pass only watchedDurationSeconds, firestore will handle the rest
      await addRecentlyWatched(currentUser.uid, item, watchedDurationSeconds);
      accumulatedWatchTimeRef.current = 0;
    }
  }, [
    currentUser,
    id,
    type,
    mediaDetails,
    addRecentlyWatched,
    seasonNumber,
    episodeNumber,
  ]);

  // Effect to handle watch time accumulation
  useEffect(() => {
    let intervalId = null;

    if (videoKey && currentUser) {
      // Start tracking if video is loaded and user is logged in
      playbackStartTimeRef.current = Date.now();
      console.log("[Player] Playback started, tracking time.");

      // Update accumulated time every few seconds
      intervalId = setInterval(() => {
        if (playbackStartTimeRef.current) {
          const sessionWatchTime =
            (Date.now() - playbackStartTimeRef.current) / 1000;
        }
      }, 15000);
    }

    return () => {
      clearInterval(intervalId);
      if (playbackStartTimeRef.current && currentUser) {
        const sessionWatchTime =
          (Date.now() - playbackStartTimeRef.current) / 1000; // in seconds
        accumulatedWatchTimeRef.current += sessionWatchTime;
        console.log(
          `[Player] Watch session ended. Accumulated: ${accumulatedWatchTimeRef.current.toFixed(
            2
          )}s`
        );
        playbackStartTimeRef.current = null;
      }
    };
  }, [videoKey, currentUser]);

  // Effect for cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("[Player] Unmount effect: Cleanup running.");
      if (playbackStartTimeRef.current) {
        const sessionWatchTime =
          (Date.now() - playbackStartTimeRef.current) / 1000;
        accumulatedWatchTimeRef.current += sessionWatchTime;
        console.log(
          `[Player] Unmount effect: Final accumulated time before record: ${accumulatedWatchTimeRef.current.toFixed(
            2
          )}s`
        );
      }
      console.log(
        `[Player] Unmount effect: accumulatedWatchTimeRef.current = ${accumulatedWatchTimeRef.current}`
      );

      if (accumulatedWatchTimeRef.current > 0) {
        console.log(
          "[Player] Unmount effect: accumulatedWatchTime > 0, attempting to call recordWatchSession."
        );
        try {
          console.log(
            "[Player] Unmount effect: BEFORE recordWatchSession() call."
          );
          recordWatchSession();
          console.log(
            "[Player] Unmount effect: AFTER recordWatchSession() call."
          );
        } catch (e) {
          console.error(
            "[Player] Unmount effect: Error calling recordWatchSession:",
            e
          );
        }
      } else {
        console.log(
          "[Player] Unmount effect: No accumulated watch time to record."
        );
      }
    };
  }, [recordWatchSession]);
  // --- END: Watch Time Tracking Logic ---

  const generateStreamLinks = (
    tmdbId,
    mediaType,
    season = null,
    episode = null
  ) => {
    return [
      {
        server: "Syntherion",
        link:
          mediaType === "tv"
            ? `https://vidsrc.su/embed/tv/${tmdbId}/${season}/${episode}?next-ep=${
                episode + 1
              }`
            : `https://vidsrc.su/embed/movie/${tmdbId}`,
        quality: "1080p",
      },
      {
        server: "IronLink",
        link:
          mediaType === "tv"
            ? `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`
            : `https://vidlink.pro/movie/${tmdbId}`,
        quality: "1080p",
      },
      {
        server: "Dormannu (ads)",
        link:
          mediaType === "tv"
            ? `https://player.videasy.net/${mediaType}/${tmdbId}/${season}/${episode}`
            : `https://player.videasy.net/${mediaType}/${tmdbId}`,
        quality: "4K",
      },
      {
        server: "Nanovue",
        link:
          mediaType === "tv"
            ? `https://ythd.org/embed/tv/${tmdbId}/${season}/${episode}`
            : `https://ythd.org/embed/movie/${tmdbId}`,
        quality: "1080p",
      },
    ];
  };

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(false);

        const endpoint =
          type === "tv"
            ? `${BASE_URL}/tv/${id}?api_key=${API_KEY}&append_to_response=seasons`
            : `${BASE_URL}/movie/${id}?api_key=${API_KEY}`;

        const response = await fetch(endpoint);
        const data = await response.json();

        setTitle(data.name || data.title);

        // Set media details
        setMediaDetails({
          overview: data.overview || "No overview available",
          releaseDate: data.first_air_date || data.release_date || "Unknown",
          rating: data.vote_average ? data.vote_average.toFixed(1) : "N/A",
          genres: data.genres || [],
          backdrop: data.backdrop_path
            ? `https://image.tmdb.org/t/p/original${data.backdrop_path}`
            : null,
          posterPath: data.poster_path
            ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
            : null,
          title: data.name || data.title,
        });

        // For TV shows, get season and episode info
        if (type === "tv" && data.seasons) {
          const validSeasons = data.seasons.filter(
            (season) => season.season_number > 0 && season.episode_count > 0
          );
          setSeasons(validSeasons);

          if (validSeasons.length > 0) {
            setSeasonNumber(validSeasons[0].season_number);
          }
        }

        // Generate streaming links based on media type and ID
        const links = generateStreamLinks(
          id,
          type,
          type === "tv" ? seasonNumber : null,
          type === "tv" ? episodeNumber : null
        );
        setStreamLinks(links);

        setTimeout(() => {
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error(`Error fetching ${type} details:`, error);
        setLoading(false);
        setError(true);
      }
    };

    fetchDetails();
  }, [id, type, API_KEY]);

  // Update streaming links when season or episode changes
  useEffect(() => {
    if (type === "tv") {
      const links = generateStreamLinks(id, type, seasonNumber, episodeNumber);
      setStreamLinks(links);
      setActiveServerIndex(0); // Reset to first server when changing episode/season
    }
  }, [seasonNumber, episodeNumber, id, type]);

  // First, fetch episode images
  useEffect(() => {
    if (type === "tv" && seasonNumber) {
      const fetchEpisodeDetails = async () => {
        try {
          const endpoint = `${BASE_URL}/tv/${id}/season/${seasonNumber}?api_key=${API_KEY}`;
          const response = await fetch(endpoint);
          const data = await response.json();

          if (data.episodes) {
            setEpisodeDetails(data.episodes);
          }
        } catch (error) {
          console.error("Error fetching episode details:", error);
        }
      };

      fetchEpisodeDetails();
    }
  }, [id, seasonNumber, API_KEY, type]);

  // Set initial activeServer value when streamLinks change
  useEffect(() => {
    if (streamLinks.length > 0) {
      setActiveServer(
        streamLinks[activeServerIndex] || { server: "Loading...", link: "" }
      );
      setVideoKey(streamLinks[activeServerIndex]?.link || "");
      setIsLoading(false);
    }
  }, [streamLinks, activeServerIndex]);

  // handleServerChange function
  const handleServerChange = (index) => {
    setActiveServerIndex(index);
    setActiveServer(streamLinks[index] || { server: "Loading...", link: "" });
    setVideoKey(streamLinks[index]?.link || "");
    setIsLoading(true);
  };

  const handleNextServer = () => {
    setActiveServerIndex((prevIndex) =>
      prevIndex === streamLinks.length - 1 ? 0 : prevIndex + 1
    );
    setIsLoading(true);
  };

  const handlePrevServer = () => {
    setActiveServerIndex((prevIndex) =>
      prevIndex === 0 ? streamLinks.length - 1 : prevIndex - 1
    );
    setIsLoading(true);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString || dateString === "Unknown") return "Unknown";
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Add this function to handle refresh
  const handleRefresh = () => {
    setLoading(true);

    // Generate fresh streaming links
    const links = generateStreamLinks(
      id,
      type,
      type === "tv" ? seasonNumber : null,
      type === "tv" ? episodeNumber : null
    );
    setStreamLinks(links);

    // Simulate loading delay and then set back to not loading
    setTimeout(() => {
      setLoading(false);
      setError(false);
    }, 1000);
  };

  // Add this useEffect to fetch episode details when season changes
  useEffect(() => {
    const fetchEpisodeDetails = async () => {
      if (type === "tv" && seasonNumber) {
        try {
          const response = await fetch(
            `${BASE_URL}/tv/${id}/season/${seasonNumber}?api_key=${API_KEY}`
          );
          const data = await response.json();
          setEpisodeDetails(data.episodes || []);
        } catch (error) {
          console.error("Error fetching episode details:", error);
          setEpisodeDetails([]);
        }
      }
    };

    fetchEpisodeDetails();
  }, [id, seasonNumber, API_KEY, type]);

  const handleEpisodeChange = (episodeNum) => {
    setEpisodeNumber(episodeNum);
    fetchStreamLinks(id, type, seasonNumber, episodeNum);
    setIsLoading(true);
  };

  const handleSeasonChange = (seasonNum) => {
    setSeasonNumber(seasonNum);
    setEpisodeNumber(1);
    fetchStreamLinks(id, type, seasonNum, 1);
    setIsLoading(true);
  };

  // Add a debounced search function for episodes
  const debouncedSearch = useCallback((query) => {
    console.log("Debounced search for:", query);
  }, []);

  // Handle search input with debouncing
  const handleSearchChange = (e) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);

    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set a new timeout for the search
    searchTimeoutRef.current = setTimeout(() => {
      debouncedSearch(newQuery);
    }, SEARCH_DEBOUNCE_DELAY);
  };

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="player-page">
      {/* Top bar - simplified */}
      <div className="player-top-bar">
        <div className="media-title">
          <span className="title-text">{title}</span>
        </div>
        {type === "tv" && (
          <div className="season-indicator">
            <span>
              S{seasonNumber} · E{episodeNumber}
            </span>
          </div>
        )}
      </div>

      {/* Player container */}
      <div className="player-container">
        {loading ? (
          <div className="player-loading">
            <div className="modern-loader">
              <div className="loader-ring"></div>
              <div className="loader-ring"></div>
              <div className="loader-ring"></div>
              <div className="loader-content">
                <div className="loader-logo">SK</div>
              </div>
            </div>
            <div className="loading-text">Preparing your stream...</div>
          </div>
        ) : error ? (
          <div className="player-error">
            <FontAwesomeIcon icon={faExclamationTriangle} size="3x" />
            <div className="error-text">
              Error loading stream. Please try another server.
            </div>
            <div className="error-actions">
              <button onClick={handlePrevServer}>Previous Server</button>
              <button onClick={handleNextServer}>Next Server</button>
            </div>
          </div>
        ) : (
          <div className="video-responsive">
            {isLoading && (
              <div className="player-loading">
                <div className="modern-loader">
                  <div className="loader-ring"></div>
                  <div className="loader-ring"></div>
                  <div className="loader-ring"></div>
                  <div className="loader-content">
                    <div className="loader-logo">SK</div>
                  </div>
                </div>
                <div className="loading-text">Buffering stream...</div>
              </div>
            )}
            <iframe
              src={activeServer.link}
              frameBorder="0"
              allowFullScreen
              className="video-player"
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="no-referrer"
              onLoad={() => setIsLoading(false)}
            ></iframe>
          </div>
        )}
      </div>

      {/* Server selection */}
      <div className="server-selection-panel">
        <h3>Servers</h3>
        <div className="server-list">
          {streamLinks.map((link, index) => (
            <div
              key={index}
              className={`server-block ${
                activeServer.server === link.server ? "active" : ""
              }`}
              onClick={() => handleServerChange(index)}
            >
              <div>
                <div className="server-name">{link.server}</div>
                <div className="server-quality">{link.quality}</div>
              </div>
              {activeServer.server === link.server && (
                <div className="server-active-indicator">
                  <FontAwesomeIcon icon={faCheck} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* New Content Area for Seasons and Episodes (like in screenshot) */}
      {type === "tv" && (
        <div className="content-layout">
          <div className="content-header">
            <h2 className="section-title">Seasons & Episodes</h2>

            <div className="season-search">
              <input
                type="text"
                placeholder="Search episodes..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <button className="search-button">
                <FontAwesomeIcon icon={faSearch} />
              </button>
            </div>

            <div className="view-controls">
              <button
                className={`view-control-btn ${
                  viewMode === "grid" ? "active" : ""
                }`}
                onClick={() => setViewMode("grid")}
              >
                <FontAwesomeIcon icon={faThLarge} />
              </button>
              <button
                className={`view-control-btn ${
                  viewMode === "list" ? "active" : ""
                }`}
                onClick={() => setViewMode("list")}
              >
                <FontAwesomeIcon icon={faList} />
              </button>
            </div>
          </div>

          <div className="seasons-wrapper">
            <div className="seasons-sidebar">
              {seasons.map((season, index) => (
                <div
                  key={index}
                  className={`season-item ${
                    seasonNumber === season.season_number ? "active" : ""
                  }`}
                  onClick={() => handleSeasonChange(season.season_number)}
                >
                  <div className="season-poster">
                    <img
                      src={
                        season.poster_path
                          ? `https://image.tmdb.org/t/p/w154${season.poster_path}`
                          : "https://via.placeholder.com/154x231/1a1a1a/5a5a5a?text=No+Image"
                      }
                      alt={`Season ${season.season_number}`}
                    />
                    {seasonNumber === season.season_number && (
                      <div className="check-icon">
                        <FontAwesomeIcon icon={faCheck} />
                      </div>
                    )}
                  </div>
                  <div className="season-info">
                    <div className="season-number">
                      Season {season.season_number}
                    </div>
                    <div className="episode-count">
                      {season.episode_count} Episodes
                    </div>
                    {season.air_date && (
                      <div className="year">
                        {new Date(season.air_date).getFullYear()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="episodes-grid">
              {episodeDetails
                .filter(
                  (episode) =>
                    episode.name
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                    episode.episode_number.toString().includes(searchQuery)
                )
                .map((episode) => (
                  <div
                    key={episode.id}
                    className={`episode-card ${
                      episodeNumber === episode.episode_number ? "active" : ""
                    }`}
                    onClick={() => handleEpisodeChange(episode.episode_number)}
                  >
                    <div className="episode-thumbnail">
                      <img
                        src={
                          episode.still_path
                            ? `https://image.tmdb.org/t/p/w300${episode.still_path}`
                            : "https://via.placeholder.com/300x169/1a1a1a/5a5a5a?text=No+Image"
                        }
                        alt={`Episode ${episode.episode_number}`}
                      />
                      <div className="episode-number">
                        E{episode.episode_number}
                      </div>
                      {episodeNumber === episode.episode_number && (
                        <div className="playing-indicator">
                          <FontAwesomeIcon icon={faPlayCircle} />
                        </div>
                      )}
                    </div>
                    <div className="episode-title">{episode.name}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Media details section */}
      {!loading && !error && (
        <div className="media-details-section">
          <div className="media-details-container">
            <h2>{title}</h2>

            <div className="media-meta">
              <div className="media-meta-item">
                <FontAwesomeIcon icon={faCalendarAlt} />
                <span>{formatDate(mediaDetails.releaseDate)}</span>
              </div>
              <div className="media-meta-item">
                <FontAwesomeIcon icon={faStar} />
                <span>{mediaDetails.rating}/10</span>
              </div>
              {mediaDetails.genres.length > 0 && (
                <div className="media-genres">
                  {mediaDetails.genres.map((genre) => (
                    <span key={genre.id} className="genre-tag">
                      {genre.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="media-overview">
              <h3>Overview</h3>
              <p>{mediaDetails.overview}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Player;
