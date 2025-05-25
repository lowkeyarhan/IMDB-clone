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
      return false;
    }

    const mediaType = item.media_type || (item.first_air_date ? "tv" : "movie");
    // Ensure ID is a number for consistent checks, especially with isInWatchlist
    const numericId =
      typeof item.id === "string" ? parseInt(item.id, 10) : item.id;
    const itemToAdd = {
      ...item,
      id: numericId,
      media_type: mediaType,
    };

    // Optimistic update
    const previousWatchlist = watchlist;
    setWatchlist((prevWatchlist) => {
      // Avoid duplicates if somehow called rapidly before listener updates
      if (
        prevWatchlist.some(
          (i) => i.id === itemToAdd.id && i.media_type === itemToAdd.media_type
        )
      ) {
        return prevWatchlist;
      }
      return processItems([...prevWatchlist, itemToAdd]);
    });

    try {
      await addToWatchlist(currentUser.uid, itemToAdd); // itemToAdd already has processed id and media_type
      console.log(
        "[useWatchlist] Item add request successful for:",
        itemToAdd.id
      );
      // Cache will be updated by the listener eventually, or by firestore.js invalidation + next read
      return true;
    } catch (err) {
      console.error(
        "[useWatchlist] Error in addItem, reverting optimistic update:",
        err
      );
      setError(err.message || "Failed to add to watchlist.");
      setWatchlist(previousWatchlist); // Revert
      return false;
    }
  };

  const removeItem = async (itemId, mediaType) => {
    if (!currentUser || !currentUser.uid) {
      console.error("[useWatchlist] RemoveItem: User not logged in");
      setError("User not logged in.");
      return false;
    }

    const numericItemId = Number(itemId);
    const itemToRemove = watchlist.find(
      (i) => Number(i.id) === numericItemId && i.media_type === mediaType
    );

    // Optimistic update
    const previousWatchlist = watchlist;
    setWatchlist((prevWatchlist) =>
      prevWatchlist.filter(
        (item) =>
          !(Number(item.id) === numericItemId && item.media_type === mediaType)
      )
    );

    try {
      await removeFromWatchlist(currentUser.uid, numericItemId, mediaType);
      console.log(
        "[useWatchlist] Item remove request successful for ID:",
        numericItemId,
        "Type:",
        mediaType
      );
      // Cache will be updated by the listener or next read after invalidation
      return true;
    } catch (err) {
      console.error(
        "[useWatchlist] Error in removeItem, reverting optimistic update:",
        err
      );
      setError(err.message || "Failed to remove from watchlist.");
      setWatchlist(previousWatchlist); // Revert
      return false;
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
