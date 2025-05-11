// Clear the loader flag on every reload (works for most browsers)
if (
  (typeof performance !== "undefined" &&
    performance.navigation &&
    performance.navigation.type === 1) ||
  (typeof performance !== "undefined" &&
    performance.getEntriesByType &&
    performance.getEntriesByType("navigation")[0]?.type === "reload")
) {
  sessionStorage.removeItem("hasSeenHomeLoader");
}

import React, { useState, useEffect, useRef } from "react";
import Banner from "../components/banner.jsx";
import Movies from "../components/movies.jsx";
import TVShows from "../components/tvShows.jsx";
import Anime from "../components/anime.jsx";
import Pagination from "../components/pagination.jsx";
import Footer from "../components/Footer.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilm, faTv, faDragon } from "@fortawesome/free-solid-svg-icons";
import "../styles/home.css";
import { motion, AnimatePresence } from "framer-motion";
import { useHomeData } from "../contexts/HomeDataContext.jsx";

// Enhanced Cinema Projector Animation Variants
const projectorContainerVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.5,
      when: "beforeChildren",
      staggerChildren: 0.2,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.5,
      when: "afterChildren",
      staggerChildren: 0.1,
      staggerDirection: -1,
    },
  },
};

const projectorBodyVariants = {
  initial: { opacity: 0, y: 20, rotateX: 10 },
  animate: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: {
      duration: 0.6,
      ease: [0.23, 1, 0.32, 1], // Custom easing for smooth motion
    },
  },
  exit: {
    opacity: 0,
    y: 20,
    rotateX: 10,
    transition: { duration: 0.4 },
  },
};

const reelVariants = {
  initial: { opacity: 0, rotate: 0, scale: 0.8 },
  animate: {
    opacity: 1,
    scale: 1,
    rotate: 360,
    transition: {
      opacity: { duration: 0.4 },
      scale: { duration: 0.5, ease: "easeOut" },
      rotate: {
        duration: 4,
        ease: "linear",
        repeat: Infinity,
        repeatType: "loop",
      },
    },
  },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.3 } },
};

const lightBeamVariants = {
  initial: {
    opacity: 0,
    scaleX: 0,
    transformOrigin: "left center",
  },
  animate: {
    opacity: [0, 0.6, 0.5, 0.7, 0.55, 0.65],
    scaleX: 1,
    transition: {
      opacity: {
        duration: 3.5,
        repeat: Infinity,
        repeatType: "reverse",
      },
      scaleX: {
        duration: 0.8,
        ease: "easeOut",
      },
    },
  },
  exit: {
    opacity: 0,
    scaleX: 0,
    transition: { duration: 0.4 },
  },
};

const dustParticlesVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 0.7,
    transition: {
      duration: 0.5,
      delay: 0.8,
    },
  },
  exit: { opacity: 0, transition: { duration: 0.3 } },
};

const filmStripVariants = {
  initial: { opacity: 0, pathLength: 0 },
  animate: {
    opacity: 1,
    pathLength: 1,
    transition: {
      pathLength: { duration: 1, ease: "easeInOut" },
      opacity: { duration: 0.5 },
    },
  },
  exit: { opacity: 0, transition: { duration: 0.3 } },
};

const filmFrameVariants = {
  initial: {
    opacity: 0,
    x: -50,
    scale: 0.8,
  },
  animate: (i) => ({
    opacity: [0, 1, 1, 0],
    x: [-20, 80, 150, 240],
    scale: 1,
    rotateY: [0, 10, -5, 0],
    transition: {
      duration: 3,
      delay: i * 0.8,
      repeat: Infinity,
      repeatDelay: i * 0.5 + 1.5,
      ease: [0.22, 1, 0.36, 1], // Custom bezier curve
    },
  }),
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: 0.3 },
  },
};

const loadingTextVariants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
      delay: 0.7,
    },
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: { duration: 0.3 },
  },
};

function Home() {
  const hasPlayedLoader = useRef(false);
  const [loading, setLoading] = useState(
    () => !sessionStorage.getItem("hasSeenHomeLoader")
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(10);
  const [activeSection, setActiveSection] = useState("movies");
  const { prefetchHomeData } = useHomeData();

  // Enhanced film frames with more variety
  const filmFrames = [
    "🎬", // Clapperboard
    "🍿", // Popcorn
    "🎞️", // Film frames
    "🌟", // Star
    "🎭", // Theater masks
    "📽️", // Projector
  ];

  // Create array for dust particles
  const dustParticles = Array.from({ length: 20 }, (_, i) => i);

  useEffect(() => {
    if (!loading) return;
    prefetchHomeData().then(() => {
      const timer = setTimeout(() => {
        setLoading(false);
        sessionStorage.setItem("hasSeenHomeLoader", "true");
      }, 3500);
      return () => clearTimeout(timer);
    });
  }, [prefetchHomeData, loading]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);

    // Scroll to the active section
    const sectionId =
      activeSection === "movies"
        ? "trending-section"
        : activeSection === "tvshows"
        ? "tvshows-section"
        : "anime-section";
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleTotalPagesUpdate = (pages, section) => {
    if (section === activeSection) {
      setTotalPages(pages);
    }
  };

  const handleTabChange = (section) => {
    if (section !== activeSection) {
      setActiveSection(section);
      setCurrentPage(1);
    }
  };

  return (
    <>
      <AnimatePresence>
        {loading && (
          <motion.div
            className="cinema-loading-container"
            variants={projectorContainerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <motion.div className="cinema-projector-assembly">
              {/* Projector Body */}
              <motion.div
                className="cinema-projector-body"
                variants={projectorBodyVariants}
              >
                {/* Left Reel */}
                <motion.div
                  className="cinema-projector-reel left-reel supply-reel"
                  variants={reelVariants}
                >
                  <div className="reel-center"></div>
                  <div className="reel-hole"></div>
                  <div className="reel-spoke horizontal"></div>
                  <div className="reel-spoke vertical"></div>
                  <div className="reel-film"></div>
                </motion.div>

                {/* Right Reel */}
                <motion.div
                  className="cinema-projector-reel right-reel take-up-reel"
                  variants={reelVariants}
                >
                  <div className="reel-center"></div>
                  <div className="reel-hole"></div>
                  <div className="reel-spoke horizontal"></div>
                  <div className="reel-spoke vertical"></div>
                  <div className="reel-film"></div>
                </motion.div>

                {/* Film Path SVG */}
                <svg
                  className="film-path-svg"
                  width="100%"
                  height="100%"
                  viewBox="0 0 180 100"
                  fill="none"
                >
                  <motion.path
                    d="M55 0 V15 Q55 25, 75 30 H105 Q125 35, 125 45 V55 Q125 65, 105 70 H75 Q55 75, 55 85 V100"
                    stroke="#444"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                    fill="none"
                    variants={filmStripVariants}
                  />
                </svg>

                {/* Film Gate & Projector Mechanisms */}
                <div className="film-gate">
                  <div className="film-gate-window"></div>
                </div>
                <div className="projector-mechanism top"></div>
                <div className="projector-mechanism bottom"></div>

                {/* Projector Lens */}
                <div className="cinema-projector-lens">
                  <div className="lens-inner">
                    <div className="lens-reflection"></div>
                  </div>

                  {/* Light Beam */}
                  <motion.div
                    className="cinema-light-beam"
                    variants={lightBeamVariants}
                  >
                    {/* Dust Particles */}
                    <motion.div
                      className="dust-particles"
                      variants={dustParticlesVariants}
                    >
                      {dustParticles.map((_, index) => (
                        <div
                          key={index}
                          className="dust-particle"
                          style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            animationDuration: `${2 + Math.random() * 4}s`,
                            animationDelay: `${Math.random() * 5}s`,
                          }}
                        ></div>
                      ))}
                    </motion.div>

                    {/* Projected Film Frames */}
                    <div className="cinema-film-frame-container">
                      {filmFrames.map((frame, index) => (
                        <motion.div
                          key={index}
                          className="cinema-film-frame"
                          custom={index}
                          variants={filmFrameVariants}
                        >
                          {frame}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>

                {/* Projector Details */}
                <div className="projector-detail top-vent"></div>
                <div className="projector-detail side-panel left"></div>
                <div className="projector-detail side-panel right"></div>
                <div className="projector-detail control-knob"></div>
                <div className="projector-detail power-light"></div>
              </motion.div>

              {/* Loading Text */}
              <motion.div
                className="cinema-loading-text"
                variants={loadingTextVariants}
              >
                Projecting Your Cinematic Experience...
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && (
        <>
          <Banner />

          <div className="content-tabs">
            <div className="tabs-container">
              <button
                className={`tab ${activeSection === "movies" ? "active" : ""}`}
                onClick={() => handleTabChange("movies")}
              >
                <FontAwesomeIcon icon={faFilm} /> Movies
              </button>
              <button
                className={`tab ${activeSection === "tvshows" ? "active" : ""}`}
                onClick={() => handleTabChange("tvshows")}
              >
                <FontAwesomeIcon icon={faTv} /> Series
              </button>
              <button
                className={`tab ${activeSection === "anime" ? "active" : ""}`}
                onClick={() => handleTabChange("anime")}
              >
                <FontAwesomeIcon icon={faDragon} /> Anime
              </button>
            </div>
          </div>

          {activeSection === "movies" && (
            <Movies
              currentPage={currentPage}
              onTotalPagesUpdate={(pages) =>
                handleTotalPagesUpdate(pages, "movies")
              }
              setActiveSection={() => {}}
            />
          )}

          {activeSection === "tvshows" && (
            <TVShows
              currentPage={currentPage}
              onTotalPagesUpdate={(pages) =>
                handleTotalPagesUpdate(pages, "tvshows")
              }
              setActiveSection={() => {}}
            />
          )}

          {activeSection === "anime" && (
            <Anime
              currentPage={currentPage}
              onTotalPagesUpdate={(pages) =>
                handleTotalPagesUpdate(pages, "anime")
              }
              setActiveSection={() => {}}
            />
          )}

          <div className="pagination-wrapper">
            <Pagination
              currentPage={currentPage}
              onPageChange={handlePageChange}
              totalPages={totalPages}
            />
          </div>
          <Footer />
        </>
      )}
    </>
  );
}

export default Home;
