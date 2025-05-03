import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/savedMovies.css";
import Notification from "../components/Notification";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDays,
  faStar,
  faCheck,
  faPlayCircle,
  faFilm,
  faTv,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../contexts/AuthContext";
import { getUserWatchlist, removeFromWatchlist } from "../firebase/firestore";

function Watchlist() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({
    visible: false,
    message: "",
    type: "",
  });

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format vote average safely
  const formatVoteAverage = (vote) => {
    if (!vote) return "N/A";
    try {
      if (typeof vote === "string" && vote.includes(".")) {
        return vote;
      }
      return Number(vote).toFixed(1);
    } catch (error) {
      return vote;
    }
  };

  // Load watchlist from Firestore instead of localStorage
  useEffect(() => {
    async function loadWatchlist() {
      if (!currentUser) {
        setWatchlist([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const watchlistItems = await getUserWatchlist(currentUser.uid);
        // Map the data to match the expected format
        const formattedWatchlist = watchlistItems.map((item) => {
          // Extract the media ID from the document ID (format: userId_mediaId)
          const mediaId = item.id.split("_")[1];
          return {
            ...item,
            id: item.id || mediaId, // Use the media ID
            title: item.title,
            poster_path: item.poster_path,
            release_date: item.release_date,
            vote_average: item.vote_average,
            media_type: item.media_type || "movie",
          };
        });
        setWatchlist(formattedWatchlist);
      } catch (error) {
        console.error("Error loading watchlist from Firestore:", error);
        showNotification("Failed to load watchlist", "error");
      } finally {
        setLoading(false);
      }
    }

    loadWatchlist();
  }, [currentUser]);

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

  const handleItemClick = (item) => {
    const mediaType = item.media_type || "movie"; // Default to movie for backward compatibility
    navigate(`/${mediaType}/${item.id}`);
  };

  // Mark as watched in Firestore
  const markAsWatched = async (e, itemId, itemTitle) => {
    e.stopPropagation(); // Prevent click from bubbling to parent

    try {
      if (!currentUser) return;

      await removeFromWatchlist(currentUser.uid, itemId);

      const updatedWatchlist = watchlist.filter((item) => item.id !== itemId);
      setWatchlist(updatedWatchlist);

      showNotification(
        `"${itemTitle}" marked as watched and removed from watchlist`,
        "watchlist-remove"
      );
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      showNotification("Failed to mark as watched", "error");
    }
  };

  return (
    <div className="saved_container">
      <h1>My Watchlist</h1>

      {watchlist.length === 0 ? (
        <div className="empty_message">
          <p>Mmm... your watchlist’s looking a little lonely.</p>
          <p className="mt-2">
            Add something spicy—I’d love to know what you’re craving next. 😏
          </p>
        </div>
      ) : (
        <div className="saved_movies_container">
          {watchlist.map((item) => (
            <div
              className="saved_movie_card"
              key={item.id}
              onClick={() => handleItemClick(item)}
            >
              <div className="media_type_badge">
                <FontAwesomeIcon
                  icon={item.media_type === "tv" ? faTv : faFilm}
                  title={item.media_type === "tv" ? "TV Show" : "Movie"}
                />
              </div>
              {item.poster_path && (
                <img src={item.poster_path} alt={item.title} />
              )}
              <div className="saved_movie_info">
                <h3>{item.title}</h3>
                <div className="saved_movie_details">
                  <span className="release_date">
                    <FontAwesomeIcon
                      icon={faCalendarDays}
                      className="release_icon"
                    />{" "}
                    {formatDate(item.release_date) || "N/A"}
                  </span>
                  <span className="rating">
                    <FontAwesomeIcon icon={faStar} className="rating_icon" />{" "}
                    {formatVoteAverage(item.vote_average)}
                  </span>
                </div>
                <button
                  className="watched_btn"
                  onClick={(e) => markAsWatched(e, item.id, item.title)}
                >
                  <FontAwesomeIcon icon={faCheck} /> Mark as Watched
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Notification
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onClose={hideNotification}
      />
    </div>
  );
}

export default Watchlist;
