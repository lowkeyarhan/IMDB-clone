import "./App.css";
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/navBar.jsx";
import Home from "./pages/Home.jsx";
import Favorites from "./pages/Favorites.jsx";
import Watchlist from "./pages/Watchlist.jsx";
import Search from "./pages/Search.jsx";
import Explore from "./pages/Explore.jsx";
import MovieDetails from "./pages/MovieDetails.jsx";
import TVShowDetails from "./pages/TvShowDetails.jsx";
import Player from "./pages/Player.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Profile from "./pages/Profile.jsx";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import { UserDataProvider } from "./contexts/UserDataContext.jsx";

// Protected route component
function PrivateRoute({ children }) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  return children;
}

function AppRoutes() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route
          path="/favorites"
          element={
            <PrivateRoute>
              <Favorites />
            </PrivateRoute>
          }
        />
        <Route
          path="/watchlist"
          element={
            <PrivateRoute>
              <Watchlist />
            </PrivateRoute>
          }
        />
        <Route path="/search" element={<Search />} />
        <Route path="/movie/:id" element={<MovieDetails />} />
        <Route path="/tv/:id" element={<TVShowDetails />} />
        <Route path="/watch/:type/:id" element={<Player />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <UserDataProvider>
        <AppRoutes />
      </UserDataProvider>
    </AuthProvider>
  );
}

export default App;
