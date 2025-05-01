import "../styles/navbar.css";
import "../styles/search.css";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub, faLinkedin } from "@fortawesome/free-brands-svg-icons";
import { faSearch, faUser } from "@fortawesome/free-solid-svg-icons";

function NavBar() {
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const debounceTimeoutRef = useRef(null);
  const searchContainerRef = useRef(null);
  const DEBOUNCE_DELAY = 500; // 500ms debouncing delay

  // Check if current page is the player page
  const isPlayerPage = location.pathname.startsWith("/player");

  // Completely rebuilt scroll animation logic
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        if (!scrolled) setScrolled(true);
      } else {
        if (scrolled) setScrolled(false);
      }
    };

    if (isPlayerPage) {
      setScrolled(false);
      // No event listener needed for player page
      return () => {};
    } else {
      window.addEventListener("scroll", handleScroll);
      handleScroll();
      return () => {
        window.removeEventListener("scroll", handleScroll);
      };
    }
  }, [isPlayerPage, scrolled]);

  // Add click outside listener to close search
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target) &&
        searchActive
      ) {
        setSearchActive(false);
        setSearchQuery("");
      }
    };

    // Add event listener
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchActive]);

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
      localStorage.removeItem("closeSearch");
    }

    // Reset search input if the flag is set
    const resetSearchInput = localStorage.getItem("resetSearchInput");
    if (resetSearchInput === "true") {
      setSearchQuery("");
      localStorage.removeItem("resetSearchInput");
    }
  }, [location]);

  // Listen for location changes to automatically close search on detail pages
  useEffect(() => {
    if (
      location.pathname.startsWith("/movie/") ||
      location.pathname.startsWith("/tv/")
    ) {
      setSearchActive(false);
      setSearchQuery("");
    }
  }, [location.pathname]);

  const toggleSearch = () => {
    localStorage.removeItem("closeSearch");

    setSearchActive(!searchActive);
    if (searchActive && searchQuery) {
      setSearchQuery("");
      if (location.pathname === "/search") {
        navigate("/");
      }
    }
  };

  // Debounced navigation function
  const debouncedNavigate = useCallback(
    (query) => {
      if (query.trim()) {
        navigate(`/search?query=${encodeURIComponent(query)}`);
      } else if (location.pathname === "/search") {
        navigate("/");
      }
    },
    [navigate, location.pathname]
  );

  const handleSearchChange = (e) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);

    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set a new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      debouncedNavigate(newQuery);
    }, DEBOUNCE_DELAY);
  };

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

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
      className={`nav ${
        isPlayerPage ? "player-nav" : scrolled ? "scrolled" : ""
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
        <div className="search_container" ref={searchContainerRef}>
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
                onClick={() => setSearchActive(true)}
                ref={(input) => searchActive && input && input.focus()}
              />
            </div>
          </form>
        </div>
        <button className="user_icon_btn" aria-label="User profile">
          <FontAwesomeIcon icon={faUser} className="user_icon" />
        </button>
      </div>
    </div>
  );
}

export default NavBar;
