import "../styles/navbar.css";
import "../styles/search.css";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub, faLinkedin } from "@fortawesome/free-brands-svg-icons";
import {
  faSearch,
  faUser,
  faSignOutAlt,
  faSignInAlt,
  faUserPlus,
  faHeart,
  faList,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../contexts/AuthContext";

function NavBar() {
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const debounceTimeoutRef = useRef(null);
  const searchContainerRef = useRef(null);
  const userMenuRef = useRef(null);
  const DEBOUNCE_DELAY = 500; // 500ms debouncing delay
  const { currentUser, logout } = useAuth();

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

      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target) &&
        showUserMenu
      ) {
        setShowUserMenu(false);
      }
    };

    // Add event listener
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchActive, showUserMenu]);

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
    // Close user menu when navigating
    setShowUserMenu(false);
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

  // Toggle user menu
  const toggleUserMenu = () => {
    if (!currentUser) {
      // If no user is logged in, redirect to login page
      navigate("/login");
    } else {
      // If user is logged in, show/hide the menu
      setShowUserMenu(!showUserMenu);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      setShowUserMenu(false);
      navigate("/");
    } catch (error) {
      console.error("Failed to log out", error);
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
        <div className="user_menu_container" ref={userMenuRef}>
          <button
            className="user_icon_btn"
            onClick={toggleUserMenu}
            aria-label="User profile"
          >
            {currentUser && currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName || "User"}
                className="navbar-user-avatar"
                referrerPolicy="no-referrer"
              />
            ) : (
              <FontAwesomeIcon icon={faUser} className="user_icon" />
            )}
          </button>
          {showUserMenu && (
            <div className="user_dropdown_menu" aria-label="User menu">
              {currentUser ? (
                <>
                  <div className="user_info">
                    <div className="user_avatar">
                      {currentUser.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt={currentUser.displayName || "User"}
                          className="user-avatar-img"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <FontAwesomeIcon icon={faUser} />
                      )}
                    </div>
                    <div className="user_details">
                      <div className="user_name">
                        {currentUser.displayName || "User"}
                      </div>
                      <div className="user_email">{currentUser.email}</div>
                    </div>
                  </div>
                  <div className="menu_divider"></div>
                  <Link
                    to="/profile"
                    className="dropdown_item"
                    aria-label="Go to profile"
                  >
                    <FontAwesomeIcon icon={faUser} />
                    <span>Profile</span>
                  </Link>
                  <div className="menu_divider"></div>
                  <button
                    className="dropdown_item logout_item"
                    onClick={handleLogout}
                    aria-label="Sign out"
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="dropdown_item"
                    aria-label="Sign in"
                  >
                    <FontAwesomeIcon icon={faSignInAlt} />
                    <span>Login with Google</span>
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NavBar;
