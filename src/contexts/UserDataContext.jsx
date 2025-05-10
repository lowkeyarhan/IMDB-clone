import React, { createContext, useState, useContext, useEffect } from "react";
import { useAuth } from "./AuthContext";
import useFavorites from "../hooks/useFavorites";
import useWatchlist from "../hooks/useWatchlist";
import { clearAllCache } from "../firebase/cacheService";

// Create the context
const UserDataContext = createContext();

// Hook to use the user data context
export function useUserData() {
  return useContext(UserDataContext);
}

// Provider component
export function UserDataProvider({ children }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const { currentUser } = useAuth();

  // Initialize user data hooks
  const {
    favorites,
    loading: favoritesLoading,
    error: favoritesError,
    addItem: addToFavorites,
    removeItem: removeFromFavorites,
    isInFavorites,
  } = useFavorites(currentUser);

  const {
    watchlist,
    loading: watchlistLoading,
    error: watchlistError,
    addItem: addToWatchlist,
    removeItem: removeFromWatchlist,
    isInWatchlist,
  } = useWatchlist(currentUser);

  // Combined loading state
  const isLoading = favoritesLoading || watchlistLoading;

  // Set initialization state once data is loaded
  useEffect(() => {
    if (!isLoading && !isInitialized) {
      setIsInitialized(true);
    }
  }, [isLoading]);

  // Clear cache when user logs out
  useEffect(() => {
    if (!currentUser) {
      clearAllCache();
    }
  }, [currentUser]);

  // Create value object to provide
  const value = {
    // Favorites data and methods
    favorites,
    favoritesLoading,
    favoritesError,
    addToFavorites,
    removeFromFavorites,
    isInFavorites,

    // Watchlist data and methods
    watchlist,
    watchlistLoading,
    watchlistError,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,

    // Combined states
    isLoading,
    isInitialized,
  };

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
}
