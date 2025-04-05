import "./App.css";
import React from "react";
import { Routes, Route } from "react-router-dom";
import NavBar from "./components/navBar.jsx";
import Home from "./pages/Home.jsx";
import Favorites from "./pages/Favorites.jsx";
import Watchlist from "./pages/Watchlist.jsx";
import Search from "./pages/Search.jsx";
import MovieDetails from "./pages/MovieDetails.jsx";
import TVShowDetails from "./pages/TvShowDetails.jsx";
import Player from "./pages/Player.jsx";

function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/search" element={<Search />} />
        <Route path="/movie/:id" element={<MovieDetails />} />
        <Route path="/tv/:id" element={<TVShowDetails />} />
        <Route path="/watch/:type/:id" element={<Player />} />
      </Routes>
    </>
  );
}

export default App;
