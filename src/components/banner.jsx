import "../styles/banner.css";
import React, { useState, useEffect } from "react";
import Notification from "./Notification";
import { useNavigate } from "react-router-dom";

function Banner() {
  const [movies, setMovies] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [watchlist, setWatchlist] = useState([]);
  const [notification, setNotification] = useState({
    message: "",
    type: "",
    visible: false,
  });
  const navigate = useNavigate();

  const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
  const BASE_URL = "https://api.themoviedb.org/3";
  const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
  const BACKDROP_SIZE = "/original";
  const TOTAL_SLIDES = 6;

  // Function to get image URL
  const getImageUrl = (path) => {
    if (!path) return null;
    return `${IMAGE_BASE_URL}${BACKDROP_SIZE}${path}`;
  };

  useEffect(() => {
    const fetchBannerMovies = async () => {
      try {
        const response = await fetch(
          `${BASE_URL}/trending/movie/week?api_key=${API_KEY}&page=1`
        );
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          setMovies(data.results.slice(0, TOTAL_SLIDES));
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

  // Toggle watchlist
  const toggleWatchlist = (movie) => {
    const currentWatchlist =
      JSON.parse(localStorage.getItem("watchlist")) || [];
    const movieExists = currentWatchlist.some((item) => item.id === movie.id);

    let updatedWatchlist;
    if (movieExists) {
      updatedWatchlist = currentWatchlist.filter(
        (item) => item.id !== movie.id
      );
      setWatchlist(watchlist.filter((id) => id !== movie.id));
      setNotification({
        message: `Removed "${movie.title}" from watchlist`,
        type: "watchlist-remove",
        visible: true,
      });
    } else {
      const movieToAdd = {
        id: movie.id,
        title: movie.title,
        poster_path: getImageUrl(movie.poster_path),
        release_date: movie.release_date,
        vote_average: movie.vote_average,
      };
      updatedWatchlist = [...currentWatchlist, movieToAdd];
      setWatchlist([...watchlist, movie.id]);
      setNotification({
        message: `Added "${movie.title}" to watchlist`,
        type: "watchlist-add",
        visible: true,
      });
    }

    localStorage.setItem("watchlist", JSON.stringify(updatedWatchlist));
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

  return (
    <div className="banner_container">
      {/* Display the current slide */}
      <div
        className="banner_image"
        style={{
          backgroundImage: `url(${getImageUrl(
            movies[currentSlide].backdrop_path
          )})`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
      >
        <div className="banner_contents">
          <h1 className="banner_title">
            {movies[currentSlide].title ||
              movies[currentSlide].name ||
              movies[currentSlide].original_name}
          </h1>
          <div className="banner_buttons">
            <button className="banner_button play" onClick={handlePlayClick}>
              <i className="fas fa-play"></i> Play
            </button>
            <button
              className="banner_button watchlist"
              onClick={() => toggleWatchlist(movies[currentSlide])}
            >
              <i className="fas fa-plus-circle"></i> Add to Watchlist
            </button>
          </div>
          <h2 className="banner_description">
            {truncate(movies[currentSlide].overview, 150)}
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
