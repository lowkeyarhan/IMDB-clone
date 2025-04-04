import React, { useState, useEffect } from "react";
import Banner from "../components/banner.jsx";
import Movies from "../components/movies.jsx";
import Footer from "../components/Footer.jsx";
import "../styles/home.css";

function Home() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

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
          <Movies />
          <Footer />
        </>
      )}
    </>
  );
}

export default Home;
