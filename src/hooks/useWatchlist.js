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
          mediaId = parseInt(parts[parts.length - 1], 10) || item.id; // last part should be numeric id
        }
      }
      return {
        ...item,
        id: typeof mediaId === "string" ? parseInt(mediaId, 10) : mediaId, // Ensure id is a number
        media_type: mediaType,
      };
    });
  };

  // Extreme Debugging useEffect - ONLY uses the listener
  useEffect(() => {
    let unsubscribe = null;
    if (!currentUser || !currentUser.uid) {
      setWatchlist([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Log result of shouldFetchFromFirebase for watchlist
    const shouldFetch = shouldFetchFromFirebase("watchlist", currentUser.uid);
    console.log(
      `[useWatchlist DEBUG] shouldFetchFromFirebase for watchlist/${currentUser.uid}: ${shouldFetch}`
    );

    setLoading(true);
    setError(null);
    setWatchlist([]); // Start clean

    console.log(
      "[useWatchlist DEBUG] ONLY setting up listener for user:",
      currentUser.uid
    );
    unsubscribe = setupWatchlistListener(
      currentUser.uid,
      (itemsFromListener) => {
        console.log(
          "[useWatchlist DEBUG] Watchlist Listener triggered. Items:",
          itemsFromListener.length,
          itemsFromListener
        );
        setWatchlist(processItems(itemsFromListener));
        setError(null);
        setLoading(false);
      },
      (listenerError) => {
        console.error(
          "[useWatchlist DEBUG] Watchlist Listener error:",
          listenerError
        );
        setError("Error in watchlist listener.");
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) {
        console.log(
          "[useWatchlist DEBUG] Cleaning up watchlist listener for",
          currentUser.uid
        );
        unsubscribe();
      }
    };
  }, [currentUser]);

  const addItem = async (item) => {
    if (!currentUser || !currentUser.uid || !item || !item.id) {
      console.error(
        "[useWatchlist] AddItem: User not logged in or item invalid",
        item
      );
      setError("User not logged in or item invalid.");
      return;
    }

    // Ensure media_type is correctly determined before sending to firestore
    const mediaType = item.media_type || (item.first_air_date ? "tv" : "movie");
    const itemToAdd = { ...item, media_type: mediaType };

    console.log(
      "[useWatchlist] addItem called with:",
      itemToAdd,
      "User UID:",
      currentUser.uid
    );

    try {
      await addToWatchlist(currentUser.uid, itemToAdd);

      console.log(
        "[useWatchlist] Item added to Firestore, waiting for listener update",
        itemToAdd.id
      );
    } catch (err) {
      console.error("[useWatchlist] Error in addItem:", err);
      setError("Failed to add to watchlist.");
    }
  };

  const removeItem = async (itemId, mediaType) => {
    if (!currentUser || !currentUser.uid) {
      console.error("[useWatchlist] RemoveItem: User not logged in");
      setError("User not logged in.");
      return;
    }
    console.log(
      "[useWatchlist] removeItem called with ID:",
      itemId,
      "Type:",
      mediaType,
      "User UID:",
      currentUser.uid
    );

    // Optimistic update (optional)
    try {
      await removeFromWatchlist(currentUser.uid, itemId, mediaType);

      console.log(
        "[useWatchlist] Item removed from Firestore, waiting for listener update",
        itemId
      );
    } catch (err) {
      console.error("[useWatchlist] Error in removeItem:", err);
      setError("Failed to remove from watchlist.");
    }
  };

  const isInWatchlist = (itemId, mediaType) => {
    const itemExists = watchlist.some(
      (item) => item.id === itemId && item.media_type === mediaType
    );

    return itemExists;
  };

  return { watchlist, loading, error, addItem, removeItem, isInWatchlist };
}
