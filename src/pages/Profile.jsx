import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useUserData } from "../contexts/UserDataContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faSignOutAlt,
  faHeart,
  faList,
  faHistory,
  faFilm,
  faEye,
  faChevronDown,
  faChevronUp,
  faPlay,
  faClock,
  faCalendarAlt,
  faStopwatch,
  faTicketAlt,
  faSignInAlt,
  faTv,
  faSpinner,
  faStar,
  faTrashAlt,
  faSync,
} from "@fortawesome/free-solid-svg-icons";
import "../styles/auth.css";
import "../styles/profile.css";
import Footer from "../components/Footer";
import { removeFromRecentlyWatched } from "../firebase/firestore";
import { fetchRecommendations } from "../firebase/recommendationService";
import { searchMediaByTitle } from "../services/tmdbService";
import RecommendationSkeletonCard from "../components/RecommendationSkeletonCard";

const RECOMMENDATIONS_CACHE_KEY_PREFIX = "recommendationsCache_";
const RECOMMENDATIONS_CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

function Profile() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const {
    favorites,
    watchlist,
    recentlyWatched,
    recentlyWatchedLoading,
    recentlyWatchedError,
    totalTimeSpentSeconds,
    isLoading: isUserDataLoading,
    isInitialized,
  } = useUserData();

  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedSections, setExpandedSections] = useState({
    recentlyWatched: true,
    watchlist: false,
    favorites: false,
  });

  // State for recommendations
  const [recommendations, setRecommendations] = useState([]);
  const [allRecommendedTitles, setAllRecommendedTitles] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState(null);
  const [recommendationStatusMessage, setRecommendationStatusMessage] =
    useState(null);
  const [recommendationVariant, setRecommendationVariant] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600); // Initial mobile check

  // Calculate stats based on real data
  const userStats = {
    favorites: favorites ? favorites.length : 0,
    watchlist: watchlist ? watchlist.length : 0,
    recentlyWatchedCount: recentlyWatched ? recentlyWatched.length : 0,
    totalTimeSpent: totalTimeSpentSeconds || 0,
    totalMoviesWatched: 0,
    daysLoggedIn: currentUser
      ? Math.floor(
          (new Date() - new Date(currentUser.metadata.creationTime)) /
            (1000 * 60 * 60 * 24)
        )
      : 0,
  };

  async function handleLogout() {
    try {
      setError("");
      await logout();
      navigate("/login");
    } catch (error) {
      setError("Failed to log out");
    }
  }

  function formatDate(date) {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const toggleSection = (section) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    });
  };

  function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";

    return "Just now";
  }

  // Helper to format time in hours and minutes
  function formatWatchTime(totalSeconds) {
    if (typeof totalSeconds !== "number" || totalSeconds < 0) return "0h 0m";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  const handleItemClick = (item) => {
    if (item && item.id && item.media_type) {
      navigate(`/watch/${item.media_type}/${item.id}`);
    } else {
      console.warn("Attempted to navigate with invalid item data:", item);
      // Optionally, show a user-facing error or navigate to a fallback
    }
  };

  const handleRemoveFromHistory = async (e, itemToRemove) => {
    e.stopPropagation();
    if (!currentUser || !itemToRemove) return;
    try {
      await removeFromRecentlyWatched(currentUser.uid, itemToRemove);
      console.log("Successfully removed from history:", itemToRemove.title);
    } catch (err) {
      console.error("Error removing from history:", err);
    }
  };

  // Helper function to shuffle an array
  function shuffleArray(array) {
    let currentIndex = array.length,
      randomIndex;
    // While there remain elements to shuffle.
    while (currentIndex !== 0) {
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex],
        array[currentIndex],
      ];
    }
    return array;
  }

  // Encapsulated function to fetch recommendations
  const triggerFetchRecommendations = (isRefresh = false) => {
    if (
      (recentlyWatched && recentlyWatched.length > 0) ||
      (favorites && favorites.length > 0)
    ) {
      setRecommendationsLoading(true);
      setRecommendationsError(null);
      setRecommendationStatusMessage(null);

      // If it's not a refresh and we already have all titles, shuffle and display
      if (!isRefresh && allRecommendedTitles.length > 0) {
        const shuffled = shuffleArray([...allRecommendedTitles]);
        setRecommendations(shuffled.slice(0, isMobile ? 6 : 5));
        setRecommendationsLoading(false); // Already have data, no loading needed
        return;
      }

      // If it's a refresh, increment variant. The actual new fetch will happen below.
      if (isRefresh) {
        setRecommendationVariant((prev) => prev + 1);
      }

      // Step 1: Fetch titles from Gemini
      fetchRecommendations(
        recentlyWatched,
        favorites,
        isRefresh ? recommendationVariant + 1 : 0
      )
        .then(async (geminiResult) => {
          if (geminiResult.error) {
            setRecommendationsError(geminiResult.error);
            setRecommendations([]);
            setAllRecommendedTitles([]);
            setRecommendationsLoading(false);
            return; // Stop processing if Gemini failed
          }

          if (
            geminiResult.recommendations &&
            geminiResult.recommendations.length > 0
          ) {
            setRecommendationStatusMessage(
              "Fetching details for recommendations..."
            );

            const tmdbPromises = geminiResult.recommendations.map((title) =>
              searchMediaByTitle(title)
            );
            const tmdbResults = await Promise.all(tmdbPromises);

            const validTmdbResults = tmdbResults.filter(
              (item) => item !== null && item.id
            );
            setAllRecommendedTitles(validTmdbResults); // Store full TMDB objects

            if (validTmdbResults.length > 0) {
              const shuffledTmdbResults = shuffleArray([...validTmdbResults]);
              setRecommendations(
                shuffledTmdbResults.slice(0, isMobile ? 6 : 5)
              );
              setRecommendationStatusMessage(null);
              setRecommendationsError(null);

              // Save to cache
              if (currentUser && currentUser.uid) {
                const cacheKey = `${RECOMMENDATIONS_CACHE_KEY_PREFIX}${currentUser.uid}`;
                const cacheData = {
                  timestamp: Date.now(),
                  data: validTmdbResults,
                };
                try {
                  sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
                } catch (e) {
                  console.warn(
                    "Failed to save recommendations to session storage",
                    e
                  );
                }
              }
            } else {
              setRecommendations([]);
              setRecommendationsError(
                "Could not find details for the recommended titles."
              );
              setRecommendationStatusMessage(null);
            }
          } else {
            setRecommendations([]);
            setAllRecommendedTitles([]);
            setRecommendationStatusMessage(null);
            // No error message here if Gemini simply returns no recommendations,
            // the existing UI handles empty recommendations state.
          }
        })
        .catch((err) => {
          console.error("Error in recommendation pipeline:", err);
          setRecommendationsError(
            "Could not load recommendations due to an unexpected error."
          );
          setRecommendations([]);
          setAllRecommendedTitles([]);
          setRecommendationStatusMessage(null);
        })
        .finally(() => {
          // Ensure loading is false only after all async ops (Gemini + TMDB) might have finished
          // The individual TMDB fetch might resolve before this, so we clear specific TMDB loading error earlier.
          setRecommendationsLoading(false);
        });
    } else {
      setRecommendations([]);
      setAllRecommendedTitles([]);
      setRecommendationsLoading(false);
    }
  };

  // Effect for responsive mobile check
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 600);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch recommendations on initial load or when primary data changes
  useEffect(() => {
    if (isInitialized && currentUser) {
      const cacheKey = `${RECOMMENDATIONS_CACHE_KEY_PREFIX}${currentUser.uid}`;
      try {
        const cachedItem = sessionStorage.getItem(cacheKey);
        if (cachedItem) {
          const parsedCache = JSON.parse(cachedItem);
          if (
            parsedCache &&
            parsedCache.data &&
            parsedCache.timestamp &&
            Date.now() - parsedCache.timestamp <
              RECOMMENDATIONS_CACHE_DURATION_MS
          ) {
            console.log("[Profile] Using cached recommendations.");
            setAllRecommendedTitles(parsedCache.data);
            const shuffled = shuffleArray([...parsedCache.data]);
            setRecommendations(shuffled.slice(0, isMobile ? 6 : 5));
            // No loading indicators needed as we are using cache
            setRecommendationsLoading(false);
            setRecommendationStatusMessage(null);
            setRecommendationsError(null);
            return; // Exit early, cache is valid and used
          } else {
            // Cache expired or invalid, remove it
            sessionStorage.removeItem(cacheKey);
          }
        }
      } catch (e) {
        console.warn("Failed to read recommendations from session storage", e);
        sessionStorage.removeItem(cacheKey); // Clear potentially corrupted cache item
      }

      // If cache wasn't used or was invalid, and no titles are loaded yet, fetch them.
      if (allRecommendedTitles.length === 0) {
        triggerFetchRecommendations(false); // `false` because this is not a manual refresh
      }
    }
  }, [
    isInitialized,
    currentUser,
    recentlyWatched,
    favorites,
    // allRecommendedTitles.length, // Removed to allow cache check to always run first
    isMobile, // Added isMobile because slicing depends on it
  ]);

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header-card">
          <div className="profile-banner">
            <div className="profile-banner-overlay"></div>
          </div>

          <div className="profile-info-section">
            <div className="profile-avatar-wrapper">
              {currentUser && currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || "User"}
                  className="profile-avatar"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="profile-avatar-fallback">
                  <FontAwesomeIcon icon={faUser} />
                </div>
              )}
            </div>

            <div className="profile-details">
              <h1 className="profile-name">
                {currentUser.displayName || "User"}
              </h1>
              <p className="profile-email">{currentUser.email}</p>
              <div className="profile-meta">
                <span className="join-date">
                  <FontAwesomeIcon icon={faCalendarAlt} />
                  Joined{" "}
                  {formatDate(new Date(currentUser.metadata.creationTime))}
                </span>
                <button onClick={handleLogout} className="logout-button">
                  <FontAwesomeIcon icon={faSignOutAlt} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          <nav className="profile-nav">
            <button
              className={`profile-nav-item ${
                activeTab === "overview" ? "active" : ""
              }`}
              onClick={() => setActiveTab("overview")}
            >
              <FontAwesomeIcon icon={faUser} />
              <span>Overview</span>
            </button>
            <button
              className={`profile-nav-item ${
                activeTab === "favorites" ? "active" : ""
              }`}
              onClick={() => setActiveTab("favorites")}
            >
              <FontAwesomeIcon icon={faHeart} />
              <span>Favourites</span>
            </button>
            <button
              className={`profile-nav-item ${
                activeTab === "watchlist" ? "active" : ""
              }`}
              onClick={() => setActiveTab("watchlist")}
            >
              <FontAwesomeIcon icon={faList} />
              <span>Watchlist</span>
            </button>
            <button
              className={`profile-nav-item ${
                activeTab === "history" ? "active" : ""
              }`}
              onClick={() => setActiveTab("history")}
            >
              <FontAwesomeIcon icon={faHistory} />
              <span>History</span>
            </button>
          </nav>
        </div>

        <div className="profile-content">
          {error && <div className="auth-error">{error}</div>}

          {isUserDataLoading && !isInitialized ? (
            <div className="profile-loading">
              <div className="loading-spinner"></div>
              <p>Loading your profile data...</p>
            </div>
          ) : (
            <>
              {activeTab === "overview" && (
                <div className="profile-overview">
                  <div className="stats-grid">
                    <div className="stats-card">
                      <div className="stats-icon-wrapper favorites-bg">
                        <FontAwesomeIcon
                          icon={faHeart}
                          className="stats-icon"
                        />
                      </div>
                      <div className="stats-details">
                        <h3>{userStats.favorites}</h3>
                        <p>Favourites</p>
                      </div>
                    </div>

                    <div className="stats-card">
                      <div className="stats-icon-wrapper watchlist-bg">
                        <FontAwesomeIcon icon={faList} className="stats-icon" />
                      </div>
                      <div className="stats-details">
                        <h3>{userStats.watchlist}</h3>
                        <p>Watchlist</p>
                      </div>
                    </div>

                    <div className="stats-card">
                      <div className="stats-icon-wrapper history-bg">
                        <FontAwesomeIcon
                          icon={faHistory}
                          className="stats-icon"
                        />
                      </div>
                      <div className="stats-details">
                        <h3>{userStats.recentlyWatchedCount}</h3>
                        <p>Watched</p>
                      </div>
                    </div>

                    <div className="stats-card">
                      <div className="stats-icon-wrapper time-spent-bg">
                        <FontAwesomeIcon
                          icon={faStopwatch}
                          className="stats-icon"
                        />
                      </div>
                      <div className="stats-details">
                        <h3>{formatWatchTime(userStats.totalTimeSpent)}</h3>
                        <p>Time Spent</p>
                      </div>
                    </div>

                    <div className="stats-card">
                      <div className="stats-icon-wrapper movies-watched-bg">
                        <FontAwesomeIcon icon={faFilm} className="stats-icon" />
                      </div>
                      <div className="stats-details">
                        <h3>0</h3>
                        <p>Movies Finished</p>
                      </div>
                    </div>

                    <div className="stats-card">
                      <div className="stats-icon-wrapper days-logged-bg">
                        <FontAwesomeIcon
                          icon={faSignInAlt}
                          className="stats-icon"
                        />
                      </div>
                      <div className="stats-details">
                        <h3>{userStats.daysLoggedIn}</h3>
                        <p>Days Logged In</p>
                      </div>
                    </div>
                  </div>

                  <div className="content-section recently-watched-section">
                    <div
                      className="section-header clickable"
                      onClick={() => toggleSection("recentlyWatched")}
                    >
                      <h2>Recently Watched</h2>
                      <FontAwesomeIcon
                        icon={
                          expandedSections.recentlyWatched
                            ? faChevronUp
                            : faChevronDown
                        }
                        className="view-toggle-icon"
                      />
                    </div>
                    {expandedSections.recentlyWatched && (
                      <>
                        {recentlyWatchedLoading && (
                          <div className="profile-loading-small">
                            <FontAwesomeIcon icon={faSpinner} spin /> Loading
                            history...
                          </div>
                        )}
                        {recentlyWatchedError && (
                          <div className="profile-error-small">
                            Error loading history:{" "}
                            {recentlyWatchedError.message}
                          </div>
                        )}
                        {!recentlyWatchedLoading &&
                          !recentlyWatchedError &&
                          recentlyWatched &&
                          recentlyWatched.length > 0 && (
                            <div className="media-grid history-grid">
                              {recentlyWatched.map((item) => (
                                <div
                                  key={`${item.id}-${item.watchedAt}`}
                                  className="history-item-card"
                                  onClick={() => handleItemClick(item)}
                                >
                                  <img
                                    src={
                                      item.poster_path ||
                                      item.posterPath ||
                                      "https://placehold.co/320x180?text=No+Image"
                                    }
                                    alt={item.title}
                                    className="history-item-thumbnail"
                                  />
                                  <div className="history-item-info">
                                    <h4 className="history-item-title">
                                      {item.title}
                                    </h4>
                                    {item.media_type === "tv" &&
                                      item.season_number &&
                                      item.episode_number && (
                                        <p className="history-item-episode-info">
                                          {`S${item.season_number} E${item.episode_number}`}
                                        </p>
                                      )}
                                    {item.watchedAt && (
                                      <p className="history-item-watched-at">
                                        <FontAwesomeIcon icon={faClock} />{" "}
                                        {item.watchedAt.toDate
                                          ? getTimeAgo(item.watchedAt.toDate())
                                          : getTimeAgo(
                                              new Date(item.watchedAt)
                                            )}
                                      </p>
                                    )}
                                    {item.durationSeconds > 0 && (
                                      <p className="history-item-duration">
                                        <FontAwesomeIcon icon={faStopwatch} />{" "}
                                        {formatWatchTime(item.durationSeconds)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        {!recentlyWatchedLoading &&
                          !recentlyWatchedError &&
                          (!recentlyWatched ||
                            recentlyWatched.length === 0) && (
                            <div className="empty-state">
                              <FontAwesomeIcon
                                icon={faHistory}
                                className="empty-icon"
                              />
                              <h3>No Watch History Yet</h3>
                              <p>Items you watch will appear here.</p>
                            </div>
                          )}
                      </>
                    )}
                  </div>

                  <div className="content-section">
                    <div className="section-header">
                      <h2>Suggested For You</h2>
                      {/* Desktop Refresh Button - hidden on mobile via CSS */}
                      {!recommendationsLoading &&
                        ((recentlyWatched && recentlyWatched.length > 0) ||
                          (favorites && favorites.length > 0)) && (
                          <button
                            onClick={() => triggerFetchRecommendations(true)}
                            className="view-toggle-button refresh-recommendations-btn desktop-refresh-btn"
                            title="Refresh Recommendations"
                            disabled={recommendationsLoading}
                          >
                            <FontAwesomeIcon icon={faSync} />
                            <span>Refresh</span>
                          </button>
                        )}
                    </div>

                    {/* Skeleton Loader for Recommendations */}
                    {recommendationsLoading && (
                      <div className="media-grid recommendations-grid">
                        {Array.from({ length: isMobile ? 6 : 5 }).map(
                          (_, index) => (
                            <RecommendationSkeletonCard
                              key={`skeleton-${index}`}
                            />
                          )
                        )}
                      </div>
                    )}

                    {/* Error Message for Recommendations */}
                    {!recommendationsLoading && recommendationsError && (
                      <div className="profile-error-small">
                        {recommendationsError === "API Key missing"
                          ? "Gemini API Key is missing. Please set VITE_GEMINI_API_KEY in .env file."
                          : recommendationsError === "No media data"
                          ? "Not enough watch history or favorites to generate recommendations yet."
                          : `Error: ${recommendationsError}`}
                      </div>
                    )}

                    {/* Status Message for Recommendations (e.g., fetching details) */}
                    {!recommendationsLoading &&
                      !recommendationsError &&
                      recommendationStatusMessage && (
                        <div className="profile-status-message-small">
                          {recommendationStatusMessage}
                        </div>
                      )}

                    {/* Actual Recommendations Grid */}
                    {!recommendationsLoading &&
                      !recommendationsError &&
                      !recommendationStatusMessage &&
                      recommendations.length > 0 && (
                        <div className="media-grid recommendations-grid">
                          {recommendations.map((item) => (
                            <div
                              key={item.id}
                              className="media-card recommendation-item-card"
                              onClick={() => {
                                if (item.id && item.media_type) {
                                  navigate(`/${item.media_type}/${item.id}`);
                                } else {
                                  console.warn(
                                    "Cannot navigate, missing TMDB id or media_type",
                                    item
                                  );
                                }
                              }}
                            >
                              <div className="media-poster">
                                <img
                                  src={
                                    item.poster_path ||
                                    `https://placehold.co/220x330/2B2F3C/E0E0E0?text=${encodeURIComponent(
                                      (item.title || "Untitled").substring(
                                        0,
                                        15
                                      )
                                    )}`
                                  }
                                  alt={item.title || "Recommendation"}
                                />
                                <div className="media-poster-overlay">
                                  <button className="play-button">
                                    <FontAwesomeIcon icon={faPlay} />
                                  </button>
                                </div>
                                <div className="media-badge">
                                  {item.media_type === "tv"
                                    ? "TV Show"
                                    : item.media_type === "movie"
                                    ? "Movie"
                                    : "Media"}
                                </div>
                              </div>
                              <div className="media-info">
                                <h3 className="media-title">
                                  {item.title || "Untitled"}
                                </h3>
                                <div className="media-meta">
                                  <span className="rating">
                                    <FontAwesomeIcon icon={faStar} />
                                    {item.vote_average
                                      ? item.vote_average.toFixed(1)
                                      : "N/A"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                    {/* Placeholder when no recommendations, no error, no status, and not enough data to generate */}
                    {!recommendationsLoading &&
                      !recommendationsError &&
                      !recommendationStatusMessage &&
                      recommendations.length === 0 &&
                      !(
                        (recentlyWatched && recentlyWatched.length > 0) ||
                        (favorites && favorites.length > 0)
                      ) && (
                        <div className="recommendations-placeholder">
                          <FontAwesomeIcon
                            icon={faFilm}
                            className="recommendation-icon"
                          />
                          <p>
                            Watch some content or add to favorites to get
                            personalized recommendations!
                          </p>
                        </div>
                      )}

                    {/* Placeholder when no recommendations, no error, no status, but had data (Gemini might have returned empty or TMDB failed) */}
                    {!recommendationsLoading &&
                      !recommendationsError &&
                      !recommendationStatusMessage &&
                      recommendations.length === 0 &&
                      ((recentlyWatched && recentlyWatched.length > 0) ||
                        (favorites && favorites.length > 0)) &&
                      recommendationsError !== "No media data" && (
                        <div className="recommendations-placeholder">
                          <FontAwesomeIcon
                            icon={faFilm}
                            className="recommendation-icon"
                          />
                          <p>
                            Could not fetch recommendations at this time, or no
                            new recommendations based on your current history.
                          </p>
                        </div>
                      )}

                    {/* Mobile Refresh Button */}
                    {!recommendationsLoading &&
                      !recommendationsError &&
                      !recommendationStatusMessage &&
                      ((recentlyWatched && recentlyWatched.length > 0) ||
                        (favorites && favorites.length > 0)) &&
                      recommendations.length > 0 && ( // Only show if there are recommendations displayed
                        <div
                          className="mobile-refresh-btn-container"
                          style={{ display: isMobile ? "flex" : "none" }}
                        >
                          <button
                            onClick={() => triggerFetchRecommendations(true)}
                            className="view-toggle-button refresh-recommendations-btn"
                            title="Refresh Recommendations"
                            disabled={recommendationsLoading}
                          >
                            <FontAwesomeIcon icon={faSync} />
                            <span>Refresh</span>
                          </button>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {activeTab === "favorites" && (
                <div className="content-section">
                  <div className="section-header">
                    <h2>Your Favorites</h2>
                    {favorites.length > 0 && (
                      <button
                        className="view-toggle-button"
                        onClick={() => toggleSection("favorites")}
                      >
                        {expandedSections.favorites ? (
                          <>
                            <span>Show Less</span>
                            <FontAwesomeIcon icon={faChevronUp} />
                          </>
                        ) : (
                          <>
                            <span>View All</span>
                            <FontAwesomeIcon icon={faChevronDown} />
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {favorites.length > 0 ? (
                    <div
                      className={`media-grid ${
                        expandedSections.favorites ? "expanded" : ""
                      }`}
                    >
                      {favorites
                        .slice(
                          0,
                          expandedSections.favorites ? favorites.length : 3
                        )
                        .map((item) => (
                          <div
                            key={item.id}
                            className="media-card"
                            onClick={() =>
                              navigate(
                                `/${item.media_type || "movie"}/${item.id}`
                              )
                            }
                          >
                            <div className="media-poster">
                              <img
                                src={
                                  item.poster_path ||
                                  item.posterPath ||
                                  "https://placehold.co/320x180?text=No+Image"
                                }
                                alt={item.title}
                              />
                              <div className="media-poster-overlay">
                                <button className="play-button">
                                  <FontAwesomeIcon icon={faPlay} />
                                </button>
                              </div>
                              <div className="media-badge">
                                {item.media_type === "tv" ? "TV Show" : "Movie"}
                              </div>
                            </div>
                            <div className="media-info">
                              <h3 className="media-title">{item.title}</h3>
                              <div className="media-meta">
                                <span className="rating">
                                  <FontAwesomeIcon icon={faStar} />
                                  {item.vote_average || "N/A"}
                                </span>
                              </div>
                              {expandedSections.favorites && item.overview && (
                                <p className="media-description">
                                  {(item.overview || "").substring(0, 120)}...
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <FontAwesomeIcon icon={faHeart} className="empty-icon" />
                      <h3>No favorites yet</h3>
                      <p>
                        Movies and shows you add to favorites will appear here
                      </p>
                      <button
                        onClick={() => navigate("/")}
                        className="action-button"
                      >
                        Browse Movies
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "watchlist" && (
                <div className="content-section">
                  <div className="section-header">
                    <h2>Your Watchlist</h2>
                    {watchlist.length > 0 && (
                      <button
                        className="view-toggle-button"
                        onClick={() => toggleSection("watchlist")}
                      >
                        {expandedSections.watchlist ? (
                          <>
                            <span>Show Less</span>
                            <FontAwesomeIcon icon={faChevronUp} />
                          </>
                        ) : (
                          <>
                            <span>View All</span>
                            <FontAwesomeIcon icon={faChevronDown} />
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {watchlist.length > 0 ? (
                    <div
                      className={`media-grid ${
                        expandedSections.watchlist ? "expanded" : ""
                      }`}
                    >
                      {watchlist
                        .slice(
                          0,
                          expandedSections.watchlist ? watchlist.length : 3
                        )
                        .map((item) => (
                          <div
                            key={item.id}
                            className="media-card"
                            onClick={() =>
                              navigate(
                                `/${item.media_type || "movie"}/${item.id}`
                              )
                            }
                          >
                            <div className="media-poster">
                              <img
                                src={
                                  item.poster_path ||
                                  "https://placehold.co/320x180?text=No+Image"
                                }
                                alt={item.title}
                              />
                              <div className="media-poster-overlay">
                                <button className="play-button">
                                  <FontAwesomeIcon icon={faPlay} />
                                </button>
                              </div>
                              <div className="media-badge">
                                {item.media_type === "tv" ? "TV Show" : "Movie"}
                              </div>
                            </div>
                            <div className="media-info">
                              <h3 className="media-title">{item.title}</h3>
                              <div className="media-meta">
                                <span className="rating">
                                  <FontAwesomeIcon icon={faStar} />
                                  {item.vote_average || "N/A"}
                                </span>
                              </div>
                              {expandedSections.watchlist && item.overview && (
                                <p className="media-description">
                                  {(item.overview || "").substring(0, 120)}...
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <FontAwesomeIcon icon={faList} className="empty-icon" />
                      <h3>Your watchlist is empty</h3>
                      <p>
                        Add movies and shows to your watchlist to watch later
                      </p>
                      <button
                        onClick={() => navigate("/")}
                        className="action-button"
                      >
                        Discover Content
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "history" && (
                <div className="content-section">
                  <div className="section-header">
                    <h2>Watch History</h2>
                  </div>
                  {recentlyWatchedLoading && (
                    <div className="profile-loading-small">
                      <FontAwesomeIcon icon={faSpinner} spin /> Loading
                      history...
                    </div>
                  )}
                  {recentlyWatchedError && (
                    <div className="profile-error-small">
                      Error loading history: {recentlyWatchedError.message}
                    </div>
                  )}
                  {!recentlyWatchedLoading &&
                    !recentlyWatchedError &&
                    recentlyWatched &&
                    recentlyWatched.length > 0 && (
                      <div className="history-list-detailed">
                        {recentlyWatched.map((item) => (
                          <div
                            key={`${item.id}-${item.watchedAt}-detailed`}
                            className="history-item-card-detailed"
                          >
                            <img
                              src={
                                item.posterPath ||
                                item.poster_path ||
                                "https://placehold.co/320x180?text=No+Image"
                              }
                              alt={item.title}
                              className="history-item-thumbnail-detailed"
                              onClick={() => handleItemClick(item)}
                            />
                            <div
                              className="history-item-info-detailed"
                              onClick={() => handleItemClick(item)}
                            >
                              <h3 className="history-item-title-detailed">
                                {item.title}
                              </h3>
                              {item.media_type === "tv" &&
                                item.season_number &&
                                item.episode_number && (
                                  <p className="history-item-episode-info-detailed subtitle-style">
                                    {`S${item.season_number} E${item.episode_number}`}
                                  </p>
                                )}
                              <p className="history-item-type-detailed">
                                {item.media_type === "tv" ? "TV Show" : "Movie"}
                              </p>
                              {item.watchedAt && (
                                <p className="history-item-watched-at-detailed">
                                  <FontAwesomeIcon icon={faClock} />{" "}
                                  {item.watchedAt.toDate
                                    ? getTimeAgo(item.watchedAt.toDate())
                                    : getTimeAgo(new Date(item.watchedAt))}
                                </p>
                              )}
                              {item.durationSeconds > 0 && (
                                <p className="history-item-duration-detailed">
                                  <FontAwesomeIcon icon={faStopwatch} />{" "}
                                  {formatWatchTime(item.durationSeconds)}
                                </p>
                              )}
                            </div>
                            <button
                              className="history-item-delete-button"
                              onClick={(e) => handleRemoveFromHistory(e, item)}
                              title="Remove from history"
                            >
                              <FontAwesomeIcon icon={faTrashAlt} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  {!recentlyWatchedLoading &&
                    !recentlyWatchedError &&
                    (!recentlyWatched || recentlyWatched.length === 0) && (
                      <div className="empty-state">
                        <FontAwesomeIcon
                          icon={faHistory}
                          className="empty-icon"
                        />
                        <h3>No Watch History Yet</h3>
                        <p>
                          Your watch history will appear here once you start
                          watching content.
                        </p>
                      </div>
                    )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Profile;
