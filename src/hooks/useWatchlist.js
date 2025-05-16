import { useState, useEffect } from "react";
import {
  getUserWatchlist,
  removeFromWatchlist,
  addToWatchlist,
  setupWatchlistListener,
} from "../firebase/firestore";
import {
  getFromCache,
  storeInCache,
  shouldFetchFromFirebase,
} from "../firebase/cacheService";

export default function useWatchlist(currentUser) {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Process items to ensure consistent format (especially for media_type and id)
  const processItems = (items) => {
    return items.map((item) => {
      let mediaId = item.id;

      // Ensure media_type is present, try to infer if missing
      const mediaType =
        item.media_type || (item.first_air_date ? "tv" : "movie");
      if (typeof item.id === "string" && item.id.includes("_")) {
        const parts = item.id.split("_");

        if (parts.length >= 2) {
          mediaId = parseInt(parts[parts.length - 1], 10) || item.id;
        }
      }
      return {
        ...item,
        id: typeof mediaId === "string" ? parseInt(mediaId, 10) : mediaId,
        media_type: mediaType,
      };
    });
  };

  useEffect(() => {
    let unsubscribe = null;

    async function loadAndListenWatchlist() {
      if (!currentUser || !currentUser.uid) {
        setWatchlist([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      // Attempt to load from cache first for faster initial UI
      const cachedData = getFromCache("watchlist", currentUser.uid);
      if (cachedData) {
        console.log(
          "[useWatchlist] Using cached watchlist for initial display:",
          cachedData.length
        );
        setWatchlist(processItems(cachedData));
      } else {
        setWatchlist([]);
      }

      console.log(
        "[useWatchlist] Setting up real-time listener for user:",
        currentUser.uid
      );
      try {
        unsubscribe = setupWatchlistListener(
          currentUser.uid,
          (itemsFromListener) => {
            console.log(
              "[useWatchlist] Firestore listener triggered. Items:",
              itemsFromListener.length,
              itemsFromListener
            );
            setWatchlist(processItems(itemsFromListener)); // Listener updates state & cache (via firestore.js)
            setError(null);
            setLoading(false); // Loading is false once listener provides data
          },
          (listenerError) => {
            console.error(
              "[useWatchlist] Error in Firestore listener:",
              listenerError
            );
            setError(listenerError.message || "Failed to sync watchlist.");
            setLoading(false);
          }
        );
      } catch (setupError) {
        console.error("[useWatchlist] Error setting up listener:", setupError);
        setError(setupError.message || "Failed to initialize watchlist sync.");
        setWatchlist([]); // Ensure watchlist is empty on error
        setLoading(false);
      }
    }

    loadAndListenWatchlist();

    return () => {
      if (unsubscribe) {
        console.log(
          "[useWatchlist] Cleaning up listener for user:",
          currentUser?.uid
        );
        unsubscribe();
      }
    };
  }, [currentUser]); // processItems can be memoized if it becomes complex

  const addItem = async (item) => {
    if (!currentUser || !currentUser.uid || !item || !item.id) {
      console.error(
        "[useWatchlist] AddItem: User not logged in or item invalid",
        item
      );
      setError("User not logged in or item invalid.");
      return false; // Indicate failure
    }
    try {
      const mediaType =
        item.media_type || (item.first_air_date ? "tv" : "movie");
      const itemToAdd = { ...item, media_type: mediaType };
      await addToWatchlist(currentUser.uid, itemToAdd);
      console.log(
        "[useWatchlist] Item add request sent to Firestore for:",
        itemToAdd.id
      );
      return true; // Indicate success
    } catch (err) {
      console.error("[useWatchlist] Error in addItem:", err);
      setError(err.message || "Failed to add to watchlist.");
      // setLoading(false);
      return false; // Indicate failure
    }
  };

  const removeItem = async (itemId, mediaType) => {
    if (!currentUser || !currentUser.uid) {
      console.error("[useWatchlist] RemoveItem: User not logged in");
      setError("User not logged in.");
      return false; // Indicate failure
    }

    try {
      await removeFromWatchlist(currentUser.uid, itemId, mediaType);
      // UI should update via listener. Cache invalidation in firestore.js is a backup.
      console.log(
        "[useWatchlist] Item remove request sent to Firestore for ID:",
        itemId,
        "Type:",
        mediaType
      );
      return true; // Indicate success
    } catch (err) {
      console.error("[useWatchlist] Error in removeItem:", err);
      setError(err.message || "Failed to remove from watchlist.");
      return false; // Indicate failure
    }
  };

  const isInWatchlist = (itemId, mediaType) => {
    const numericItemId = Number(itemId);
    return watchlist.some(
      (item) =>
        Number(item.id) === numericItemId && item.media_type === mediaType
    );
  };

  return { watchlist, loading, error, addItem, removeItem, isInWatchlist };
}
