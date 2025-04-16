import React from "react";
import "../styles/Footer.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGithub,
  faInstagram,
  faLinkedin,
  faTwitter,
} from "@fortawesome/free-brands-svg-icons";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="creator-info">
            <p className="creator-name">Arhan Das</p>
            <p className="creator-bio">
              Passionate full-stack developer with a love for cinema.
            </p>
          </div>
          <div className="creator-social">
            <a
              href="https://pbs.twimg.com/media/GML6pLqXoAAbZI_.jpg"
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon"
            >
              <FontAwesomeIcon icon={faGithub} />
            </a>
            <a
              href="https://www.linkedin.com/in/imnotarhannnnn"
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon"
            >
              <FontAwesomeIcon icon={faLinkedin} />
            </a>
            <a
              href="https://www.instagram.com/lowkeyarhan/"
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon"
            >
              <FontAwesomeIcon icon={faInstagram} />
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {currentYear} ScreenKiss. All rights reserved.</p>
          <p className="credits">
            Powered by{" "}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              TMDB
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
