import "../styles/banner.css";
import React, { useState, useEffect, useRef } from "react";
import Notification from "./Notification";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlay,
  faPlus,
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../contexts/AuthContext";
import useWatchlist from "../hooks/useWatchlist";
import { motion, AnimatePresence } from "framer-motion";
import { useHomeData } from "../contexts/HomeDataContext.jsx";

function Banner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1); // 1 for right, -1 for left
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

  // Use the HomeData context for cached data
  const {
    bannerMovies,
    genres,
    preloadedImages,
    bannerImagesPreloaded,
    fetchBannerMovies,
    fetchGenres,
  } = useHomeData();

  // Function to get image URL from the Home Data context
  const getImageUrl = (path, size = "/original") => {
    if (!path) return null;
    return `https://image.tmdb.org/t/p${size}${path}`;
  };

  // Load banner movies and genres if not already cached
  useEffect(() => {
    if (bannerMovies.length === 0) {
      fetchBannerMovies();
    }

    if (Object.keys(genres).length === 0) {
      fetchGenres();
    }
  }, [bannerMovies.length, genres, fetchBannerMovies, fetchGenres]);

  // Set up slideshow timer - now 20 seconds between slides
  useEffect(() => {
    if (bannerMovies.length === 0 || !bannerImagesPreloaded) return;

    const timer = setInterval(() => {
      setDirection(1); // Set direction to right for auto-rotation
      setCurrentSlide((prevSlide) => (prevSlide + 1) % bannerMovies.length);
    }, 20000); // Changed to 20 seconds

    return () => clearInterval(timer);
  }, [bannerMovies, bannerImagesPreloaded]);

  // Handle manual slide change
  const changeSlide = (newDirection) => {
    setDirection(newDirection);

    if (newDirection === 1) {
      // Move forward
      setCurrentSlide((prev) => (prev + 1) % bannerMovies.length);
    } else {
      // Move backward
      setCurrentSlide(
        (prev) => (prev - 1 + bannerMovies.length) % bannerMovies.length
      );
    }
  };

  // Handle manual slide change when clicking on dots
  const goToSlide = (index) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };

  // Truncate overview text
  const truncate = (string, n) => {
    return string?.length > n ? string.substr(0, n - 1) + "..." : string;
  };

  // Get genre names for a movie
  const getGenreNames = (genreIds) => {
    if (
      !genreIds ||
      genreIds.length === 0 ||
      Object.keys(genres).length === 0
    ) {
      return [];
    }
    return genreIds.map((id) => genres[id]).filter(Boolean);
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
    if (bannerMovies.length > 0) {
      navigate(`/movie/${bannerMovies[currentSlide].id}`);
    }
  };

  // Enhanced animation variants for slide transitions
  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
      scale: 1.1,
      rotateY: direction > 0 ? 5 : -5,
      zIndex: 1,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      rotateY: 0,
      zIndex: 2,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.8 },
        scale: { duration: 0.8 },
        rotateY: { duration: 0.8 },
      },
    },
    exit: (direction) => ({
      x: direction > 0 ? "-50%" : "50%",
      opacity: 0,
      scale: 0.9,
      rotateY: direction > 0 ? -5 : 5,
      zIndex: 0,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.6 },
        scale: { duration: 0.6 },
        rotateY: { duration: 0.6 },
      },
    }),
  };

  // Animation variants for content (title, description, buttons)
  const contentVariants = {
    hidden: {
      y: 20,
      opacity: 0,
    },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        delay: 0.4,
        duration: 0.6,
        ease: "easeOut",
        staggerChildren: 0.15,
      },
    },
  };

  const childVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  // Swipe handlers
  const handleDragEnd = (e, info) => {
    const threshold = 50;
    if (info.offset.x > threshold) {
      // Swiped right - go to previous slide
      changeSlide(-1);
    } else if (info.offset.x < -threshold) {
      // Swiped left - go to next slide
      changeSlide(1);
    }
  };

  if (bannerMovies.length === 0) return null;

  const currentMovie = bannerMovies[currentSlide];
  const movieGenres = getGenreNames(currentMovie.genre_ids);

  return (
    <div className="banner_container">
      {/* Navigation arrows */}
      <div className="banner_navigation">
        <button
          className="banner_nav_button prev"
          onClick={() => changeSlide(-1)}
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <button
          className="banner_nav_button next"
          onClick={() => changeSlide(1)}
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>

      {/* Animated Banner */}
      <div className="banner_perspective">
        <AnimatePresence custom={direction} initial={false} mode="popLayout">
          <motion.div
            key={currentSlide}
            className="banner_image"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            style={{
              backgroundImage: `url(${
                preloadedImages[currentMovie.id] ||
                getImageUrl(currentMovie.backdrop_path)
              })`,
            }}
          >
            <div className="banner_bg"></div>
            <motion.div
              className="banner_contents"
              variants={contentVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.h1 className="banner_title" variants={childVariants}>
                {currentMovie.title ||
                  currentMovie.name ||
                  currentMovie.original_name}
              </motion.h1>

              {/* Movie genres */}
              <motion.div className="banner_genres" variants={childVariants}>
                {movieGenres.slice(0, 3).map((genre, index) => (
                  <span key={index} className="banner_genre">
                    {genre}
                  </span>
                ))}
              </motion.div>

              <motion.div className="banner_buttons" variants={childVariants}>
                <button
                  className="banner_button play"
                  onClick={handlePlayClick}
                >
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
              </motion.div>
              <motion.h2
                className="banner_description"
                variants={childVariants}
              >
                {truncate(currentMovie.overview, 170)}
              </motion.h2>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots indicator */}
      <div className="slider_dots">
        {bannerMovies.map((_, index) => (
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
