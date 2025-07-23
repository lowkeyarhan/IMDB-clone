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
    const initializeBanner = async () => {
      if (bannerMovies.length === 0) {
        await fetchBannerMovies();
      }

      if (Object.keys(genres).length === 0) {
        await fetchGenres();
      }
    };

    initializeBanner();
  }, [fetchBannerMovies, fetchGenres]);

  // Set up slideshow timer - only start when images are loaded
  useEffect(() => {
    if (bannerMovies.length === 0 || !bannerImagesPreloaded) return;

    const timer = setInterval(() => {
      setDirection(1); // Set direction to right for auto-rotation
      setCurrentSlide((prevSlide) => (prevSlide + 1) % bannerMovies.length);
    }, 10000); // 10 seconds

    return () => clearInterval(timer);
  }, [bannerMovies, bannerImagesPreloaded, currentSlide]); // Add currentSlide to dependencies to reset timer

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

  // Enhanced animation variants for slide transitions - Netflix style
  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
      scale: 1.02,
      filter: "blur(1px)",
      zIndex: 1,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      zIndex: 2,
      transition: {
        x: {
          type: "spring",
          stiffness: 300, // Reduced for smoother motion
          damping: 30, // Increased for smoother motion
          mass: 0.8, // Increased for smoother motion
        },
        opacity: {
          duration: 0.6, // Slower for smoother transition
          ease: [0.25, 0.46, 0.45, 0.94],
        },
        scale: {
          duration: 0.8, // Slower for smoother transition
          ease: [0.25, 0.46, 0.45, 0.94],
        },
        filter: {
          duration: 0.4, // Slower for smoother transition
          ease: "easeOut",
        },
      },
    },
    exit: (direction) => ({
      x: direction > 0 ? "-20%" : "20%",
      opacity: 0,
      scale: 0.98,
      filter: "blur(0.5px)",
      zIndex: 0,
      transition: {
        x: {
          type: "spring",
          stiffness: 300, // Reduced for smoother motion
          damping: 30, // Increased for smoother motion
          mass: 0.8, // Increased for smoother motion
        },
        opacity: {
          duration: 0.4, // Slower for smoother transition
          ease: [0.25, 0.46, 0.45, 0.94],
        },
        scale: {
          duration: 0.6, // Slower for smoother transition
          ease: [0.25, 0.46, 0.45, 0.94],
        },
        filter: {
          duration: 0.3, // Slower for smoother transition
          ease: "easeIn",
        },
      },
    }),
  };

  // Enhanced content animation variants - Netflix style
  const contentVariants = {
    hidden: {
      y: 60,
      opacity: 0,
      scale: 0.9,
    },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        delay: 0,
        duration: 0.6, // Slower for smoother transition
        ease: [0.25, 0.46, 0.45, 0.94],
        staggerChildren: 0.08, // Slightly slower stagger
        delayChildren: 0,
      },
    },
    exit: {
      y: -30,
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.4, // Slower exit
        ease: [0.25, 0.46, 0.45, 0.94],
        staggerChildren: 0.03, // Slower stagger
        staggerDirection: -1,
      },
    },
  };

  const childVariants = {
    hidden: {
      y: 40,
      opacity: 0,
      scale: 0.95,
    },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5, // Slower transition
        ease: [0.25, 0.46, 0.45, 0.94],
        type: "spring",
        stiffness: 300, // Reduced stiffness
        damping: 30, // Increased damping for smoother motion
      },
    },
    exit: {
      y: -20,
      opacity: 0,
      scale: 0.9,
      transition: {
        duration: 0.3, // Slower exit
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  // Background parallax effect with smoother transitions
  const backgroundVariants = {
    enter: (direction) => ({
      scale: 1.05,
      x: direction > 0 ? "3%" : "-3%",
    }),
    center: {
      scale: 1,
      x: 0,
      transition: {
        scale: {
          duration: 6, // Slower background animation
          ease: "easeOut",
        },
        x: {
          duration: 1.0, // Slower x transition
          ease: [0.25, 0.46, 0.45, 0.94],
        },
      },
    },
    exit: (direction) => ({
      scale: 1.02,
      x: direction > 0 ? "-2%" : "2%",
      transition: {
        duration: 0.6, // Slower exit
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    }),
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

  if (bannerMovies.length === 0 || !bannerImagesPreloaded) return null;

  const currentMovie = bannerMovies[currentSlide];
  const movieGenres = getGenreNames(currentMovie.genre_ids);

  return (
    <div className="banner_container">
      {/* Animated Banner */}
      <div className="banner_perspective">
        <AnimatePresence custom={direction} initial={false} mode="wait">
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
            dragElastic={0.2}
            dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
            whileDrag={{ scale: 1.02 }}
            onDragEnd={handleDragEnd}
          >
            {/* Background with parallax effect */}
            <motion.div
              className="banner_background"
              custom={direction}
              variants={backgroundVariants}
              initial="enter"
              animate="center"
              exit="exit"
              style={{
                backgroundImage: `url(${
                  preloadedImages[currentMovie.id] ||
                  getImageUrl(currentMovie.backdrop_path, "/original")
                })`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1,
              }}
            />

            {/* Gradient overlay */}
            <motion.div
              className="banner_bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }} // Slower for smoother transition
            />

            {/* Content with enhanced animations */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`content-${currentSlide}`}
                className="banner_contents"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <motion.h1 className="banner_title" variants={childVariants}>
                  {currentMovie.title ||
                    currentMovie.name ||
                    currentMovie.original_name}
                </motion.h1>

                {/* Movie genres */}
                <motion.div className="banner_genres" variants={childVariants}>
                  {movieGenres.slice(0, 3).map((genre, index) => (
                    <motion.span
                      key={index}
                      className="banner_genre"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0,
                        duration: 0.4, // Slower for smoother transition
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                    >
                      {genre}
                    </motion.span>
                  ))}
                </motion.div>

                <motion.div className="banner_buttons" variants={childVariants}>
                  <motion.button
                    className="banner_button play"
                    onClick={handlePlayClick}
                    whileHover={{
                      scale: 1.05,
                      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    transition={{
                      type: "spring",
                      stiffness: 300, // Reduced for smoother interaction
                      damping: 30, // Increased for smoother interaction
                    }}
                  >
                    <FontAwesomeIcon icon={faPlay} /> Play
                  </motion.button>
                  <motion.button
                    className="banner_button watchlist"
                    onClick={() => toggleWatchlist(currentMovie)}
                    whileHover={{
                      scale: 1.05,
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    transition={{
                      type: "spring",
                      stiffness: 300, // Reduced for smoother interaction
                      damping: 30, // Increased for smoother interaction
                    }}
                  >
                    <FontAwesomeIcon icon={faPlus} />
                    {isInWatchlist(currentMovie.id.toString())
                      ? "Remove from Watchlist"
                      : "Add to Watchlist"}
                  </motion.button>
                </motion.div>

                <motion.h2
                  className="banner_description"
                  variants={childVariants}
                >
                  {truncate(currentMovie.overview, 170)}
                </motion.h2>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>

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
