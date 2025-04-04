import React, { useState, useEffect } from "react";
import Banner from "../components/banner.jsx";
import Movies from "../components/movies.jsx";
import TVShows from "../components/tvShows.jsx";
import Pagination from "../components/pagination.jsx";
import Footer from "../components/Footer.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilm, faTv } from "@fortawesome/free-solid-svg-icons";
import "../styles/home.css";

function Home() {
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(10); // Default value
  const [activeSection, setActiveSection] = useState("movies"); // Default to movies

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);

    // Scroll to the active section
    const sectionId =
      activeSection === "movies" ? "trending-section" : "tvshows-section";
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
      setCurrentPage(1); // Reset to page 1 when changing sections
    }
  };

  return (
    <>
      {loading ? (
        <div className="home-loading-container">
          <div className="projector-container">
            <div className="projector-body">
              <div className="projector-lens">
                <div className="lens-inner"></div>
              </div>
              <div className="projector-light-beam"></div>
            </div>
            <div className="film-strip">
              <div className="film-cell"></div>
              <div className="film-cell"></div>
              <div className="film-cell"></div>
              <div className="film-cell"></div>
            </div>
            <div className="loading-text">Hold on tight...</div>
          </div>
        </div>
      ) : (
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
                <FontAwesomeIcon icon={faTv} /> TV Shows
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
