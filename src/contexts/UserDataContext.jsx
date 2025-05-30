import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import useFavorites from "../hooks/useFavorites";
import useWatchlist from "../hooks/useWatchlist";
import { clearAllCache } from "../firebase/cacheService";
import {
  setupUserDataListener,
  getUserData,
  markWelcomeModalAsSeen as markWelcomeModalAsSeenFS,
} from "../firebase/firestore";

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

  // State for recentlyWatched and user-specific flags
  const [recentlyWatched, setRecentlyWatched] = useState([]);
  const [recentlyWatchedLoading, setRecentlyWatchedLoading] = useState(true);
  const [recentlyWatchedError, setRecentlyWatchedError] = useState(null);
  const [totalTimeSpentSeconds, setTotalTimeSpentSeconds] = useState(0);
  const [hasSeenWelcomeModal, setHasSeenWelcomeModal] = useState(undefined);
  const [hasVisitedSiteInitially, setHasVisitedSiteInitially] =
    useState(undefined);

  // Combined loading state - now includes recentlyWatchedLoading
  const isLoading =
    favoritesLoading || watchlistLoading || recentlyWatchedLoading;

  // Effect to fetch/listen to user data for recentlyWatched and other user flags
  useEffect(() => {
    // Check local storage for first site visit
    const siteVisited = localStorage.getItem("hasVisitedSite");
    if (siteVisited === null) {
      setHasVisitedSiteInitially(false);
      // Don't set localStorage here yet, only when modal is closed.
    } else {
      setHasVisitedSiteInitially(true);
    }

    if (currentUser && currentUser.uid) {
      setRecentlyWatchedLoading(true);
      setRecentlyWatchedError(null);
      setHasSeenWelcomeModal(undefined);

      // Initial fetch
      getUserData(currentUser.uid)
        .then((userData) => {
          if (userData) {
            setRecentlyWatched(userData.recentlyWatched || []);
            setHasSeenWelcomeModal(
              userData.hasSeenWelcomeModal === undefined
                ? false
                : userData.hasSeenWelcomeModal
            );
          }
          setRecentlyWatchedLoading(false);
        })
        .catch((err) => {
          console.error(
            "[UserDataContext] Error fetching initial user data:",
            err
          );
          setRecentlyWatchedError(err);
          setRecentlyWatchedLoading(false);
          setHasSeenWelcomeModal(false);
        });

      // Setup listener for real-time updates
      const unsubscribe = setupUserDataListener(
        currentUser.uid,
        (userData) => {
          if (userData) {
            setRecentlyWatched(userData.recentlyWatched || []);
            setHasSeenWelcomeModal(
              userData.hasSeenWelcomeModal === undefined
                ? false
                : userData.hasSeenWelcomeModal
            );
          } else {
            setRecentlyWatched([]);
            setHasSeenWelcomeModal(false);
          }
          setRecentlyWatchedLoading(false);
        },
        (err) => {
          console.error(
            "[UserDataContext] Error with user data listener:",
            err
          );
          setRecentlyWatchedError(err);
          setRecentlyWatchedLoading(false);
          setHasSeenWelcomeModal(false);
        }
      );
      return () => unsubscribe();
    } else {
      setRecentlyWatched([]);
      setRecentlyWatchedLoading(false);
      setHasSeenWelcomeModal(false);
    }
  }, [currentUser]);

  // Effect to calculate total time spent when recentlyWatched changes
  useEffect(() => {
    if (recentlyWatched && recentlyWatched.length > 0) {
      const totalSeconds = recentlyWatched.reduce((acc, item) => {
        return acc + (Number(item.durationSeconds) || 0);
      }, 0);
      setTotalTimeSpentSeconds(totalSeconds);
    } else {
      setTotalTimeSpentSeconds(0);
    }
  }, [recentlyWatched]);

  // Set initialization state once data is loaded
  useEffect(() => {
    if (!isLoading && !isInitialized) {
      setIsInitialized(true);
    }
  }, [isLoading, isInitialized]);

  // Clear cache and reset states when user logs out
  useEffect(() => {
    if (!currentUser) {
      clearAllCache();
      setRecentlyWatched([]);
      setTotalTimeSpentSeconds(0);
      setHasSeenWelcomeModal(false);
      // Don't reset hasVisitedSiteInitially here, as it's browser-specific
    }
  }, [currentUser]);

  const markWelcomeModalAsSeen = useCallback(async () => {
    // Always mark in local storage
    localStorage.setItem("hasVisitedSite", "true");
    setHasVisitedSiteInitially(true); // Update state to reflect this immediately

    if (currentUser && currentUser.uid) {
      try {
        await markWelcomeModalAsSeenFS(currentUser.uid);
        setHasSeenWelcomeModal(true); // This will be set by the listener too, but good for immediate feedback
        console.log(
          "[UserDataContext] Welcome modal marked as seen in DB and local storage."
        );
      } catch (error) {
        console.error(
          "[UserDataContext] Error marking welcome modal as seen in DB:",
          error
        );
      }
    } else {
      console.log(
        "[UserDataContext] Welcome modal marked as seen in local storage (user not logged in)."
      );
    }
  }, [currentUser]);

  // Create value object to provide
  const value = {
    favorites,
    favoritesLoading,
    favoritesError,
    addToFavorites,
    removeFromFavorites,
    isInFavorites,

    watchlist,
    watchlistLoading,
    watchlistError,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,

    recentlyWatched,
    recentlyWatchedLoading,
    recentlyWatchedError,
    totalTimeSpentSeconds,

    hasSeenWelcomeModal,
    markWelcomeModalAsSeen,
    hasVisitedSiteInitially,

    isLoading,
    isInitialized,
  };

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
}
