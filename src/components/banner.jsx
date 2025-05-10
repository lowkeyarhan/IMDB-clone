import "../styles/banner.css";
import React, { useState, useEffect } from "react";
import Notification from "./Notification";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faPlus } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../contexts/AuthContext";
import useWatchlist from "../hooks/useWatchlist";

function Banner() {
  const [movies, setMovies] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [notification, setNotification] = useState({
    message: "",
    type: "",
    visible: false,
  });
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Use our Firebase watchlist hook
  const { watchlist, isInWatchlist, addItem, removeItem } =
    useWatchlist(currentUser);

  const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
  const BASE_URL = "https://api.themoviedb.org/3";
  const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
  const BACKDROP_SIZE = "/original";
  const TOTAL_SLIDES = 6;

  // Function to get image URL
  const getImageUrl = (path, size = BACKDROP_SIZE) => {
    if (!path) return null;
    return `${IMAGE_BASE_URL}${size}${path}`;
  };

  useEffect(() => {
    const fetchBannerMovies = async () => {
      try {
        const response = await fetch(
          `${BASE_URL}/trending/movie/week?api_key=${API_KEY}&page=1`
        );
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          // Filter out movies without backdrop images
          const moviesWithBackdrops = data.results.filter(
            (movie) => movie.backdrop_path
          );
          setMovies(moviesWithBackdrops.slice(0, TOTAL_SLIDES));
        }
      } catch (error) {
        console.error("Error fetching banner movies:", error);
      }
    };

    fetchBannerMovies();
  }, []);

  // Set up slideshow timer
  useEffect(() => {
    if (movies.length === 0) return;

    const timer = setInterval(() => {
      setCurrentSlide((prevSlide) => (prevSlide + 1) % movies.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [movies]);

  // Handle manual slide change when clicking on dots
  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  // Truncate overview text
  const truncate = (string, n) => {
    return string?.length > n ? string.substr(0, n - 1) + "..." : string;
  };

  // Toggle watchlist using Firebase
  const toggleWatchlist = async (movie) => {
    if (!currentUser) {
      setNotification({
        message: "Please log in to add items to your watchlist",
        type: "error",
        visible: true,
      });
      return;
    }

    try {
      const isInList = isInWatchlist(movie.id.toString());

      if (isInList) {
        // Remove from watchlist
        const success = await removeItem(movie.id);
        if (success) {
          setNotification({
            message: `Removed "${movie.title}" from watchlist`,
            type: "watchlist-remove",
            visible: true,
          });
        }
      } else {
        // Add to watchlist
        const movieToAdd = {
          id: movie.id,
          title: movie.title,
          poster_path: getImageUrl(movie.poster_path, "/w500"),
          release_date: movie.release_date,
          vote_average: movie.vote_average?.toFixed(1) || "N/A",
          media_type: "movie",
        };

        const success = await addItem(movieToAdd);
        if (success) {
          setNotification({
            message: `Added "${movie.title}" to watchlist`,
            type: "watchlist-add",
            visible: true,
          });
        }
      }
    } catch (error) {
      console.error("Error updating watchlist:", error);
      setNotification({
        message: "Error updating watchlist",
        type: "error",
        visible: true,
      });
    }
  };

  // Hide notification
  const hideNotification = () => {
    setNotification({ ...notification, visible: false });
  };

  // Navigate to movie details
  const handlePlayClick = () => {
    if (movies.length > 0) {
      navigate(`/movie/${movies[currentSlide].id}`);
    }
  };

  if (movies.length === 0) return null;

  const currentMovie = movies[currentSlide];

  return (
    <div className="banner_container">
      {/* Display the current slide */}
      <div className="banner_image">
        <div
          className="banner_bg"
          style={{
            backgroundImage: `url(${getImageUrl(currentMovie.backdrop_path)})`,
          }}
        ></div>
        <div className="banner_contents">
          <h1 className="banner_title">
            {currentMovie.title ||
              currentMovie.name ||
              currentMovie.original_name}
          </h1>
          <div className="banner_buttons">
            <button className="banner_button play" onClick={handlePlayClick}>
              <FontAwesomeIcon icon={faPlay} /> Play
            </button>
            <button
              className="banner_button watchlist"
              onClick={() => toggleWatchlist(currentMovie)}
            >
              <FontAwesomeIcon icon={faPlus} />
              {isInWatchlist(currentMovie.id.toString())
                ? "Remove from Watchlist"
                : "Add to Watchlist"}
            </button>
          </div>
          <h2 className="banner_description">
            {truncate(currentMovie.overview, 170)}
          </h2>
        </div>
      </div>

      {/* Dots indicator */}
      <div className="slider_dots">
        {movies.map((_, index) => (
          <span
            key={index}
            className={`dot ${currentSlide === index ? "active" : ""}`}
            onClick={() => goToSlide(index)}
          ></span>
        ))}
      </div>

      {/* Notification */}
      <Notification
        message={notification.message}
        type={notification.type}
        onClose={hideNotification}
        visible={notification.visible}
      />
    </div>
  );
}

export default Banner;
