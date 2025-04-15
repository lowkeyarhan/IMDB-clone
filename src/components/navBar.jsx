import "../styles/navbar.css";
import "../styles/search.css";
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub, faLinkedin } from "@fortawesome/free-brands-svg-icons";
import { faSearch } from "@fortawesome/free-solid-svg-icons";

function NavBar() {
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if current page is the player page
  const isPlayerPage = location.pathname.startsWith("/player");

  //Animate on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (location.pathname === "/search") {
      const params = new URLSearchParams(location.search);
      const queryParam = params.get("query");
      if (queryParam) {
        setSearchQuery(queryParam);
        setSearchActive(true);
      }
    }

    // Check if a movie card was clicked and we need to close the search
    const closeSearch = localStorage.getItem("closeSearch");
    if (closeSearch === "true") {
      setSearchActive(false);
      localStorage.removeItem("closeSearch"); // Clear the flag
    }
  }, [location]);

  const toggleSearch = () => {
    // Clear the closeSearch flag if it exists
    localStorage.removeItem("closeSearch");

    setSearchActive(!searchActive);
    if (searchActive && searchQuery) {
      setSearchQuery("");
      if (location.pathname === "/search") {
        navigate("/");
      }
    }
  };

  const handleSearchChange = (e) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    if (newQuery.trim()) {
      navigate(`/search?query=${encodeURIComponent(newQuery)}`);
    } else if (location.pathname === "/search") {
      navigate("/");
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?query=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Escape") {
      setSearchActive(false);
      setSearchQuery("");
      if (location.pathname === "/search") {
        navigate("/");
      }
    }
  };

  return (
    <div
      className={`nav ${scrolled ? "scrolled" : ""} ${
        isPlayerPage ? "player-nav" : ""
      }`}
    >
      <div className="left_items">
        <Link to="/" className="nav_link">
          Home
        </Link>
        <Link to="/watchlist" className="nav_link">
          Watchlist
        </Link>
        <Link to="/favorites" className="nav_link">
          Favourites
        </Link>
      </div>
      <div className="right_items">
        <div className="search_container">
          <form onSubmit={handleSearchSubmit}>
            <div className="search_input_container">
              <button
                type="button"
                className="search_btn"
                onClick={toggleSearch}
                aria-label="Toggle search"
              >
                <FontAwesomeIcon icon={faSearch} className="search_icon" />
              </button>
              <input
                type="text"
                className={`search_input ${searchActive ? "active" : ""}`}
                placeholder="Search movies..."
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleKeyPress}
                ref={(input) => searchActive && input && input.focus()}
              />
            </div>
          </form>
        </div>
        <a
          href="https://github.com/lowkeyarhan"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FontAwesomeIcon icon={faGithub} className="icon" />
        </a>
        <a
          href="https://linkedin.com/in/imnotarhannnnn"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FontAwesomeIcon icon={faLinkedin} className="icon" />
        </a>
      </div>
    </div>
  );
}

export default NavBar;
