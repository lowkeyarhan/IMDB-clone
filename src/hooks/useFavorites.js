import { useState, useEffect } from "react";
import {
  removeFromFavorites,
  addToFavorites,
  setupFavoritesListener,
} from "../firebase/firestore";
import { getFromCache } from "../firebase/cacheService";

export default function useFavorites(currentUser) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Process items to ensure consistent format
  const processItems = (items) => {
    return items.map((item) => {
      let mediaId = item.id;
      if (typeof item.id === "string" && item.id.includes("_")) {
        const parts = item.id.split("_");
        // Check if format is userId_mediaType_mediaId or userId_mediaId
        if (parts.length === 3) mediaId = parts[2]; // userId_mediaType_mediaId
        else if (parts.length === 2)
          mediaId = parts[1]; // userId_mediaId - for older data if any
        else mediaId = item.id; // fallback to original if format is unexpected
      }

      const mediaType =
        item.media_type || (item.first_air_date ? "tv" : "movie");
      const title =
        mediaType === "tv"
          ? item.name || item.title || "Unknown Title"
          : item.title || "Unknown Title";
      const releaseDate =
        mediaType === "tv"
          ? item.first_air_date || item.release_date || "Unknown Date"
          : item.release_date || "Unknown Date";

      let posterPath = item.poster_path;
      if (posterPath && !posterPath.startsWith("http")) {
        posterPath = `https://image.tmdb.org/t/p/w500${posterPath}`;
      }

      return {
        ...item,
        id: mediaId,
        original_doc_id: item.id,
        title: title,
        name: item.name,
        poster_path: posterPath,
        media_type: mediaType,
        release_date: releaseDate,
        first_air_date: item.first_air_date,
        vote_average: item.vote_average || "N/A",
        number_of_seasons: item.number_of_seasons,
        status: item.status,
        isTV: mediaType === "tv",
        isMovie: mediaType === "movie",
      };
    });
  };

  useEffect(() => {
    let unsubscribe = null;

    async function loadAndListenFavorites() {
      if (!currentUser || !currentUser.uid) {
        setFavorites([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      const cachedData = getFromCache("favorites", currentUser.uid);
      if (cachedData) {
        console.log(
          "[useFavorites] Using cached favorites for initial display:",
          cachedData.length
        );
        setFavorites(processItems(cachedData));
      } else {
        // If no cache, list will be empty until listener fires
        setFavorites([]);
      }

      console.log(
        "[useFavorites] Setting up real-time listener for user:",
        currentUser.uid
      );
      try {
        unsubscribe = setupFavoritesListener(
          currentUser.uid,
          (itemsFromListener) => {
            console.log(
              "[useFavorites] Firestore listener triggered. Items:",
              itemsFromListener.length
            );
            setFavorites(processItems(itemsFromListener));
            setError(null);
            setLoading(false);
          },
          (listenerError) => {
            console.error(
              "[useFavorites] Error in Firestore listener:",
              listenerError
            );
            setError(listenerError.message || "Failed to sync favorites.");
            setLoading(false);
          }
        );
      } catch (setupError) {
        console.error("[useFavorites] Error setting up listener:", setupError);
        setError(setupError.message || "Failed to initialize favorites sync.");
        setFavorites([]);
        setLoading(false);
      }
    }

    loadAndListenFavorites();

    return () => {
      if (unsubscribe) {
        console.log(
          "[useFavorites] Cleaning up listener for user:",
          currentUser?.uid
        );
        unsubscribe();
      }
    };
  }, [currentUser]);

  const addItem = async (item) => {
    if (!currentUser || !currentUser.uid) {
      setError("User not logged in.");
      return false;
    }
    setLoading(true);
    try {
      const itemToAdd = {
        ...item,
        media_type: item.media_type || (item.first_air_date ? "tv" : "movie"),
      };
      await addToFavorites(currentUser.uid, itemToAdd);
      return true;
    } catch (err) {
      console.error("[useFavorites] Error adding item:", err);
      setError(err.message || "Failed to add favorite.");
      setLoading(false);
      return false;
    }
  };

  const removeItem = async (itemId, mediaType) => {
    if (!currentUser || !currentUser.uid) {
      setError("User not logged in.");
      return false;
    }
    setLoading(true);
    try {
      await removeFromFavorites(currentUser.uid, itemId, mediaType);
      return true;
    } catch (err) {
      console.error("[useFavorites] Error removing item:", err);
      setError(err.message || "Failed to remove favorite.");
      setLoading(false);
      return false;
    }
  };

  const isInFavorites = (itemId, mediaType) => {
    return favorites.some(
      (fav) => String(fav.id) === String(itemId) && fav.media_type === mediaType
    );
  };

  return {
    favorites,
    loading,
    error,
    addItem,
    removeItem,
    isInFavorites,
  };
}
