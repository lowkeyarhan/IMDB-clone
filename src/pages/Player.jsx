import React, { useState, useEffect } from "react";
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
} from "@fortawesome/free-solid-svg-icons";
import {
  faFacebookF,
  faTwitter,
  faWhatsapp,
  faTelegram,
  faRedditAlien,
} from "@fortawesome/free-brands-svg-icons";
import "../styles/Player.css";

function Player() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeServerIndex, setActiveServerIndex] = useState(0);
  const [showServerList, setShowServerList] = useState(false);
  const [seasonNumber, setSeasonNumber] = useState(1);
  const [episodeNumber, setEpisodeNumber] = useState(1);
  const [seasons, setSeasons] = useState([]);
  const [showSeasonEpisode, setShowSeasonEpisode] = useState(false);
  const [streamLinks, setStreamLinks] = useState([]);
  const [mediaDetails, setMediaDetails] = useState({
    overview: "",
    releaseDate: "",
    rating: "",
    genres: [],
    backdrop: "",
  });

  const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
  const BASE_URL = "https://api.themoviedb.org/3";

  // Mock function to generate streaming links based on TMDB ID
  // In a real implementation, this would call an API to get actual embed codes
  const generateStreamLinks = (
    tmdbId,
    mediaType,
    season = null,
    episode = null
  ) => {
    const videoId = `${tmdbId}${
      mediaType === "tv" ? `-${season}-${episode}` : ""
    }`;

    return [
      {
        server: "VidSrc",
        link: `https://vidsrc.to/embed/${mediaType}/${tmdbId}${
          mediaType === "tv" ? `/season/${season}/episode/${episode}` : ""
        }`,
      },
      {
        server: "UpCloud",
        link:
          mediaType === "tv"
            ? `https://dokicloud.one/embed/${
                mediaType === "tv" ? "tv" : ""
              }/${tmdbId}/${season}/${episode}`
            : `https://dokicloud.one/embed/movie/${tmdbId}`,
      },
      {
        server: "MegaCloud",
        link:
          mediaType === "tv"
            ? `https://megacloud.tv/embed-${
                mediaType === "tv" ? "tv" : ""
              }/${tmdbId}/${season}/${episode}`
            : `https://megacloud.tv/embed-1/movie/${tmdbId}`,
      },
      {
        server: "VidCloud",
        link:
          mediaType === "tv"
            ? `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`
            : `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`,
      },
      {
        server: "DoodStream",
        link: `https://dood.wf/e/${mediaType[0]}${videoId}x/`,
      },
      {
        server: "StreamSB",
        link: `https://watchsb.com/e/${mediaType[0]}${videoId}.html`,
      },
    ];
  };

  useEffect(() => {
    // Add player-page-active class to body when component mounts
    document.body.classList.add("player-page-active");

    // Remove the class when component unmounts
    return () => {
      document.body.classList.remove("player-page-active");
    };
  }, []);

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

  const handleServerChange = (index) => {
    setActiveServerIndex(index);
    setShowServerList(false);
  };

  const handleSeasonChange = (e) => {
    const newSeason = parseInt(e.target.value);
    setSeasonNumber(newSeason);
    setEpisodeNumber(1); // Reset episode to 1 when changing season
  };

  const handleEpisodeChange = (e) => {
    setEpisodeNumber(parseInt(e.target.value));
  };

  const handleNextServer = () => {
    setActiveServerIndex((prevIndex) =>
      prevIndex === streamLinks.length - 1 ? 0 : prevIndex + 1
    );
  };

  const handlePrevServer = () => {
    setActiveServerIndex((prevIndex) =>
      prevIndex === 0 ? streamLinks.length - 1 : prevIndex - 1
    );
  };

  const activeServer = streamLinks[activeServerIndex] || {
    server: "Loading...",
    link: "",
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

  return (
    <div className="player-page">
      {/* Top bar - simplified */}
      <div className="player-top-bar">
        <div className="media-title">
          <Link to="/" className="home-link">
            <FontAwesomeIcon icon={faHome} />
          </Link>
          <span className="title-text">{title}</span>
        </div>
        {type === "tv" && (
          <div className="season-episode-selector">
            <button
              className="season-episode-button"
              onClick={() => setShowSeasonEpisode(!showSeasonEpisode)}
            >
              <FontAwesomeIcon icon={faCircleInfo} />
              <span>
                S{seasonNumber} E{episodeNumber}
              </span>
            </button>

            {showSeasonEpisode && (
              <div className="season-episode-dropdown">
                <div className="season-select">
                  <label>Season:</label>
                  <select value={seasonNumber} onChange={handleSeasonChange}>
                    {seasons.map((season) => (
                      <option key={season.id} value={season.season_number}>
                        Season {season.season_number}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="episode-select">
                  <label>Episode:</label>
                  <select value={episodeNumber} onChange={handleEpisodeChange}>
                    {Array.from(
                      {
                        length:
                          seasons.find((s) => s.season_number === seasonNumber)
                            ?.episode_count || 1,
                      },
                      (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          Episode {i + 1}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Refresh notice */}
      <div className="refresh-notice">
        <p>
          If you get any error message when trying to stream, please{" "}
          <span className="highlight" onClick={handleRefresh}>
            Refresh
          </span>{" "}
          the page or switch to another streaming server.
        </p>
      </div>

      {/* Player container */}
      <div className="player-container">
        {loading ? (
          <div className="player-loading">
            <div className="loading-spinner">
              <FontAwesomeIcon icon={faSpinner} spin size="3x" />
            </div>
            <div className="loading-text">Loading stream...</div>
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
            <iframe
              src={activeServer.link}
              frameBorder="0"
              allowFullScreen
              className="video-player"
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="no-referrer"
            ></iframe>
          </div>
        )}
      </div>

      {/* Simplified player actions */}
      <div className="player-actions">
        <div className="action-buttons">
          <button className="action-btn">
            <FontAwesomeIcon icon={faHeart} /> Add to favorite
          </button>
        </div>
      </div>

      {/* Improved server selection */}
      <div className="server-selection">
        <h3>Available Servers</h3>
        <p>If current server doesn't work, try one of these alternatives:</p>
        <div className="server-grid">
          {streamLinks.map((server, index) => (
            <button
              key={index}
              className={`server-block ${
                index === activeServerIndex ? "active" : ""
              }`}
              onClick={() => handleServerChange(index)}
            >
              <div className="server-icon">
                <FontAwesomeIcon
                  icon={index === activeServerIndex ? faStar : faAngleRight}
                />
              </div>
              <div className="server-info">
                <span className="server-name">{server.server}</span>
                {index === activeServerIndex && (
                  <span className="server-status">Playing</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

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
