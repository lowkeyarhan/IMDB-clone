import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
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
} from "@fortawesome/free-solid-svg-icons";
import "../styles/auth.css";
import "../styles/profile.css";
import Footer from "../components/Footer";
import useWatchlist from "../hooks/useWatchlist";
import useFavorites from "../hooks/useFavorites";

function Profile() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedSections, setExpandedSections] = useState({
    recentlyWatched: false,
    watchlist: false,
    favorites: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // Get real data using our hooks
  const { watchlist, loading: watchlistLoading } = useWatchlist(currentUser);
  const { favorites, loading: favoritesLoading } = useFavorites(currentUser);

  // Calculate stats based on real data
  const userStats = {
    favorites: favorites.length,
    watchlist: watchlist.length,
    // Recent watches would need a similar hook - using empty array for now
    recentlyWatched: [],
    totalTimeSpent: 0,
    totalMoviesWatched: 0,
    // Calculate days logged in based on user creation date
    daysLoggedIn: currentUser ? 
      Math.floor((new Date() - new Date(currentUser.metadata.creationTime)) / (1000 * 60 * 60 * 24)) : 0
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
  function formatWatchTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

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

          {isLoading ? (
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
                      <div className="stats-icon-wrapper movies-watched-bg">
                        <FontAwesomeIcon icon={faTv} className="stats-icon" />
                      </div>
                      <div className="stats-details">
                        <h3>0</h3>
                        <p>Series Finished</p>
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
                        <h3>0h 0m</h3>
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

                  <div className="content-section">
                    <div className="section-header">
                      <h2>Recently Watched</h2>
                    </div>
                      <div className="empty-state">
                        <FontAwesomeIcon
                          icon={faHistory}
                          className="empty-icon"
                        />
                      <h3>Coming Soon</h3>
                      <p>Watch history features will be available soon</p>
                      </div>
                  </div>

                  <div className="content-section">
                    <div className="section-header">
                      <h2>Recommended For You</h2>
                    </div>
                    <div className="recommendations-placeholder">
                      <FontAwesomeIcon
                        icon={faFilm}
                        className="recommendation-icon"
                      />
                      <p>
                        Personalized recommendations coming soon... Stay tuned!
                      </p>
                    </div>
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
                  
                  {favoritesLoading ? (
                    <div className="loading-container">
                      <FontAwesomeIcon icon={faSpinner} spin className="loading-icon" />
                      <p>Loading your favorites...</p>
                    </div>
                  ) : favorites.length > 0 ? (
                    <div className={`media-grid ${expandedSections.favorites ? "expanded" : ""}`}>
                      {favorites
                        .slice(0, expandedSections.favorites ? favorites.length : 3)
                        .map((item) => (
                          <div 
                            key={item.id} 
                            className="media-card"
                            onClick={() => navigate(`/${item.media_type || 'movie'}/${item.id}`)}
                          >
                            <div className="media-poster">
                              <img
                                src={item.poster_path || "https://via.placeholder.com/300x450?text=No+Image"}
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
                  
                  {watchlistLoading ? (
                    <div className="loading-container">
                      <FontAwesomeIcon icon={faSpinner} spin className="loading-icon" />
                    <p>Loading your watchlist...</p>
                    </div>
                  ) : watchlist.length > 0 ? (
                    <div className={`media-grid ${expandedSections.watchlist ? "expanded" : ""}`}>
                      {watchlist
                        .slice(0, expandedSections.watchlist ? watchlist.length : 3)
                        .map((item) => (
                          <div 
                            key={item.id} 
                            className="media-card"
                            onClick={() => navigate(`/${item.media_type || 'movie'}/${item.id}`)}
                          >
                            <div className="media-poster">
                              <img
                                src={item.poster_path || "https://via.placeholder.com/300x450?text=No+Image"}
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
                    <div className="empty-state">
                      <FontAwesomeIcon
                        icon={faHistory}
                        className="empty-icon"
                      />
                    <h3>Coming Soon</h3>
                    <p>Watch history feature will be available soon.</p>
                    </div>
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
