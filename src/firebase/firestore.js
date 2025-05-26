import {
  collection,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  onSnapshot,
  writeBatch,
  getDoc,
  updateDoc,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "./config";
import {
  getFromCache,
  storeInCache,
  invalidateCache,
  setupListener,
  removeListener,
} from "./cacheService";

// Active listeners
const activeListeners = new Map();

// Batch operations
let pendingBatchOperations = [];
let batchTimer = null;
const BATCH_TIMEOUT = 500;

const RECENTLY_WATCHED_LIMIT = 20;

const processDocuments = (querySnapshot) => {
  const items = [];
  querySnapshot.forEach((doc) => {
    items.push({
      id: doc.id,
      ...doc.data(),
    });
  });
  return items;
};

// Favourites Operations
export const getUserFavorites = async (userId) => {
  try {
    console.log(`Getting favourites for user: ${userId}`);
    const cachedData = getFromCache("favorites", userId);
    if (cachedData) {
      return cachedData;
    }
    const favouritesRef = collection(db, "favourites");
    const q = query(favouritesRef, where("userId", "==", userId));
    console.log("Firestore query constructed for favorites");
    const querySnapshot = await getDocs(q);
    console.log(`Favorites query returned ${querySnapshot.size} documents`);
    const favourites = processDocuments(querySnapshot);
    storeInCache("favorites", userId, favourites);
    return favourites;
  } catch (error) {
    console.error("Error getting favourites:", error);
    if (error.code === "permission-denied") {
      console.error("Favorites: Firebase rules issue.");
    }
    throw error;
  }
};

export const setupFavoritesListener = (userId, onUpdate, onError) => {
  if (!userId) return () => {};
  const listenerKey = `favourites_${userId}`;
  if (activeListeners.has(listenerKey)) {
    activeListeners.get(listenerKey)();
    activeListeners.delete(listenerKey);
  }
  console.log(`Setting up favourites listener for user: ${userId}`);
  const favouritesRef = collection(db, "favourites");
  const q = query(favouritesRef, where("userId", "==", userId));
  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const favourites = processDocuments(querySnapshot);
      storeInCache("favorites", userId, favourites);
      onUpdate(favourites);
      console.log(
        `Favourites listener updated for user: ${userId}, items: ${favourites.length}`
      );
    },
    (error) => {
      console.error("Favourites listener error:", error);
      if (onError) onError(error);
    }
  );
  activeListeners.set(listenerKey, unsubscribe);
  return unsubscribe;
};

export const addToFavorites = async (userId, item) => {
  try {
    const mediaType = item.media_type || (item.first_air_date ? "tv" : "movie");
    // Ensure item.id is a clean numerical ID, not potentially a pre-formatted string from somewhere else.
    const cleanItemId = String(item.id).split("_").pop();
    const docId = `${userId}_${mediaType}_${cleanItemId}`;

    console.log("[Firestore addToFavorites] Attempting to add:", {
      userId,
      mediaType,
      itemId: cleanItemId,
      docId,
      item,
    }); // DETAILED LOG

    const favouriteRef = doc(db, "favourites", docId);
    const favouriteData = {
      ...item,
      id: cleanItemId, // Ensure the stored ID is the clean one
      userId,
      media_type: mediaType,
      createdAt: new Date(),
    };
    await setDoc(favouriteRef, favouriteData);
    invalidateCache("favorites", userId);
    console.log(`Added ${docId} to favorites.`);
    return docId;
  } catch (error) {
    console.error(
      "[Firestore addToFavorites] Error adding to favourites:",
      error,
      { userId, item }
    ); // Log error with item
    throw error;
  }
};

export const removeFromFavorites = async (userId, itemId, mediaType) => {
  try {
    const docId = `${userId}_${mediaType}_${itemId}`;
    const favouriteRef = doc(db, "favourites", docId);
    await deleteDoc(favouriteRef);
    invalidateCache("favorites", userId);
    console.log(`Removed ${docId} from favorites.`);
    return true;
  } catch (error) {
    if (error.code === "not-found") {
      console.warn(
        `Attempted to remove non-existent favorite: ${docId}. Trying fallback query.`
      );
      try {
        const favouritesRef = collection(db, "favourites");
        const q = query(
          favouritesRef,
          where("userId", "==", userId),
          where("id", "==", itemId),
          where("media_type", "==", mediaType)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const batch = writeBatch(db);
          querySnapshot.forEach((document) =>
            batch.delete(doc(db, "favourites", document.id))
          );
          await batch.commit();
          invalidateCache("favorites", userId);
          console.log(
            `Removed ${querySnapshot.size} items from favorites via fallback query.`
          );
          return true;
        }
        console.warn(
          `Fallback query found no matching favorite to delete for item ID: ${itemId}, type: ${mediaType}`
        );
        return false; // Or throw new Error if preferred
      } catch (queryError) {
        console.error("Error during fallback favorite removal:", queryError);
        throw queryError;
      }
    }
    console.error("Error removing from favourites:", error);
    throw error;
  }
};

// Watchlist Operations
export const getUserWatchlist = async (userId) => {
  try {
    console.log(`Getting watchlist for user: ${userId}`);
    const cachedData = getFromCache("watchlist", userId);
    if (cachedData) {
      return cachedData;
    }
    const watchlistRef = collection(db, "watchlist");
    const q = query(watchlistRef, where("userId", "==", userId));
    console.log("Firestore query constructed for watchlist");
    const querySnapshot = await getDocs(q);
    console.log(`Watchlist query returned ${querySnapshot.size} documents`);
    const watchlist = processDocuments(querySnapshot);
    storeInCache("watchlist", userId, watchlist);
    return watchlist;
  } catch (error) {
    console.error("Error getting watchlist:", error);
    if (error.code === "permission-denied") {
      console.error("Watchlist: Firebase rules issue.");
    }
    throw error;
  }
};

export const setupWatchlistListener = (userId, onUpdate, onError) => {
  if (!userId) return () => {};
  const listenerKey = `watchlist_${userId}`;
  if (activeListeners.has(listenerKey)) {
    activeListeners.get(listenerKey)();
    activeListeners.delete(listenerKey);
  }
  console.log(`Setting up watchlist listener for user: ${userId}`);
  const watchlistRef = collection(db, "watchlist");
  const q = query(watchlistRef, where("userId", "==", userId));
  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const watchlist = processDocuments(querySnapshot);
      storeInCache("watchlist", userId, watchlist);
      onUpdate(watchlist);
      console.log(
        `Watchlist listener updated for user: ${userId}, items: ${watchlist.length}`
      );
    },
    (error) => {
      console.error("Watchlist listener error:", error);
      if (onError) onError(error);
    }
  );
  activeListeners.set(listenerKey, unsubscribe);
  return unsubscribe;
};

export const addToWatchlist = async (userId, item) => {
  try {
    const mediaType = item.media_type || (item.first_air_date ? "tv" : "movie");
    // Ensure item.id is a clean numerical ID
    const cleanItemId = String(item.id).split("_").pop();
    const docId = `${userId}_${mediaType}_${cleanItemId}`;

    console.log("[Firestore addToWatchlist] Attempting to add:", {
      userId,
      mediaType,
      itemId: cleanItemId,
      docId,
      item,
    }); // DETAILED LOG

    const watchlistRef = doc(db, "watchlist", docId);
    const watchlistData = {
      ...item,
      id: cleanItemId, // Ensure the stored ID is the clean one
      userId,
      media_type: mediaType,
      createdAt: new Date(),
    };
    await setDoc(watchlistRef, watchlistData);
    invalidateCache("watchlist", userId);
    console.log(`Added ${docId} to watchlist.`);
    return docId;
  } catch (error) {
    console.error(
      "[Firestore addToWatchlist] Error adding to watchlist:",
      error,
      { userId, item }
    ); // Log error with item
    throw error;
  }
};

export const removeFromWatchlist = async (userId, itemId, mediaType) => {
  try {
    const docId = `${userId}_${mediaType}_${itemId}`;
    const watchlistRef = doc(db, "watchlist", docId);
    await deleteDoc(watchlistRef);
    invalidateCache("watchlist", userId);
    console.log(`Removed ${docId} from watchlist.`);
    return true;
  } catch (error) {
    if (error.code === "not-found") {
      console.warn(
        `Attempted to remove non-existent watchlist item: ${docId}. Trying fallback query.`
      );
      try {
        const watchlistRef = collection(db, "watchlist");
        const q = query(
          watchlistRef,
          where("userId", "==", userId),
          where("id", "==", itemId),
          where("media_type", "==", mediaType)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const batch = writeBatch(db);
          querySnapshot.forEach((document) =>
            batch.delete(doc(db, "watchlist", document.id))
          );
          await batch.commit();
          invalidateCache("watchlist", userId);
          console.log(
            `Removed ${querySnapshot.size} items from watchlist via fallback query.`
          );
          return true;
        }
        console.warn(
          `Fallback query found no matching watchlist item to delete for item ID: ${itemId}, type: ${mediaType}`
        );
        return false;
      } catch (queryError) {
        console.error("Error during fallback watchlist removal:", queryError);
        throw queryError;
      }
    }
    console.error("Error removing from watchlist:", error);
    throw error;
  }
};

// User Data Operations (centralized)
export const manageUserDocumentOnLogin = async (user) => {
  if (!user || !user.uid) {
    console.error("manageUserDocumentOnLogin: Invalid user object", user);
    return null;
  }

  const userRef = doc(db, "users", user.uid);
  console.log(
    `[Firestore DEBUG] Checking or creating user document for UID: ${user.uid}`
  );

  try {
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      // User document exists, update last login and potentially profile info
      const existingData = userSnap.data();
      console.log(
        `[Firestore DEBUG] User document found for UID: ${user.uid}`,
        existingData
      );

      const updateData = {
        lastLoginAt: serverTimestamp(),
        profile: {
          email: user.email || existingData.profile?.email || "",
          displayName:
            user.displayName || existingData.profile?.displayName || "User",
          photoURL: user.photoURL || existingData.profile?.photoURL || "",
        },
      };

      // Initialize fields if they are missing (for older documents)
      if (existingData.hasSeenWelcomeModal === undefined) {
        updateData.hasSeenWelcomeModal = false;
      }
      if (!existingData.favorites) {
        updateData.favorites = []; // Ensure it's an array
      }
      if (!existingData.watchlist) {
        updateData.watchlist = []; // Ensure it's an array
      }
      if (!existingData.recentlyWatched) {
        updateData.recentlyWatched = []; // Ensure it's an array
      }
      // DO NOT update createdAt for existing users. It should reflect the original creation time.

      console.log(
        "[Firestore DEBUG] Updating EXISTING user document for UID:",
        user.uid,
        "with data:",
        updateData
      );
      await updateDoc(userRef, updateData);
      const updatedUserSnap = await getDoc(userRef); // Re-fetch to get server timestamp
      return updatedUserSnap.data();
    } else {
      // User document does not exist, create it
      console.log(
        `[Firestore DEBUG] No user document for UID: ${user.uid}. Creating new one.`
      );
      const newUserDoc = {
        uid: user.uid,
        profile: {
          // Correctly nest profile information
          email: user.email || "",
          displayName: user.displayName || "User",
          photoURL: user.photoURL || "", // Get photoURL from Google Auth user object
        },
        createdAt: serverTimestamp(), // Set createdAt on new document creation
        lastLoginAt: serverTimestamp(),
        hasSeenWelcomeModal: false, // New users haven't seen it
        favorites: [], // Initialize as empty array
        watchlist: [], // Initialize as empty array
        recentlyWatched: [], // Initialize as empty array
        // Add any other default fields for new users here
      };
      console.log(
        "[Firestore DEBUG] Creating NEW user document for UID:",
        user.uid,
        "with data:",
        newUserDoc
      );
      await setDoc(userRef, newUserDoc);
      const createdUserSnap = await getDoc(userRef); // Re-fetch to get server timestamp
      return createdUserSnap.data();
    }
  } catch (error) {
    console.error(
      `[Firestore DEBUG] Error managing user document for ${user.uid}:`,
      error
    );
    throw error;
  }
};

export const markWelcomeModalAsSeen = async (userId) => {
  if (!userId) {
    console.error("[Firestore] markWelcomeModalAsSeen: No userId provided.");
    return;
  }
  const userRef = doc(db, "users", userId);
  try {
    await setDoc(userRef, { hasSeenWelcomeModal: true }, { merge: true });
    console.log(
      `[Firestore] User ${userId} marked (or document created/merged) as having seen the welcome modal.`
    );
  } catch (error) {
    console.error(
      `[Firestore] Error in markWelcomeModalAsSeen for user ${userId}:`,
      error
    );
    throw error;
  }
};

export const addRecentlyWatched = async (userId, item, durationSeconds = 0) => {
  if (!userId || !item || typeof item.id === "undefined") {
    console.error("[Firestore] Invalid arguments for addRecentlyWatched:", {
      userId,
      item,
      durationSeconds,
    });
    return;
  }

  console.log(
    `[Firestore] Adding/Updating recently watched for user ${userId}, item ID: ${item.id}, duration: ${durationSeconds}s`
  );

  const userDocRef = doc(db, "users", userId);

  try {
    const userDoc = await getDoc(userDocRef);
    let recentlyWatched = [];

    if (userDoc.exists()) {
      const userData = userDoc.data();
      recentlyWatched = userData.recentlyWatched || [];
    }

    // Prepare the new item or item to update
    const newItemData = {
      ...item,
      watchedAt: new Date(),
      durationSeconds: parseFloat(durationSeconds) || 0, // This is the current session's duration
    };

    // Check if the item already exists
    const existingItemIndex = recentlyWatched.findIndex((watchedItem) => {
      return (
        watchedItem.id === newItemData.id &&
        watchedItem.media_type === newItemData.media_type
      );
    });

    if (existingItemIndex > -1) {
      // Item for this ID and media_type exists.
      const existingItem = recentlyWatched[existingItemIndex];

      if (newItemData.media_type === "tv") {
        // For TV shows, update to reflect the latest watched episode and its session duration.
        existingItem.season_number = newItemData.season_number;
        existingItem.episode_number = newItemData.episode_number;
        existingItem.durationSeconds = newItemData.durationSeconds; // Set to current session's duration
        existingItem.watchedAt = newItemData.watchedAt; // Update watchedAt timestamp
        // Ensure other fields like title, poster_path are also updated if they can change (though less likely for an existing series entry)
        existingItem.title = newItemData.title;
        existingItem.poster_path = newItemData.poster_path;
        // any other relevant fields from newItemData that should reflect the latest state.

        console.log(
          `[Firestore] Updating TV show ${newItemData.title} to S${newItemData.season_number}E${newItemData.episode_number}, session duration: ${newItemData.durationSeconds}s`
        );
      } else {
        // For movies, accumulate duration.
        const previousDuration = parseFloat(existingItem.durationSeconds) || 0;
        existingItem.durationSeconds =
          previousDuration + newItemData.durationSeconds;
        existingItem.watchedAt = newItemData.watchedAt; // Update watchedAt timestamp
        // Update other fields if necessary
        existingItem.title = newItemData.title;
        existingItem.poster_path = newItemData.poster_path;

        console.log(
          `[Firestore] Updating movie ${newItemData.title}. Previous duration: ${previousDuration}s, New total: ${existingItem.durationSeconds}s`
        );
      }

      // Remove the existing item from its current position to re-insert at the top
      recentlyWatched.splice(existingItemIndex, 1);
      // Add the updated item to the beginning of the array
      recentlyWatched.unshift(existingItem);
    } else {
      recentlyWatched.unshift(newItemData);
      console.log(
        `[Firestore] Adding new item: ${newItemData.title} (${
          newItemData.media_type === "tv"
            ? `S${newItemData.season_number}E${newItemData.episode_number}, session duration: ${newItemData.durationSeconds}s`
            : `ID ${newItemData.id}, duration: ${newItemData.durationSeconds}s`
        })`
      );
    }

    // Ensure the array does not exceed the limit
    if (recentlyWatched.length > RECENTLY_WATCHED_LIMIT) {
      recentlyWatched = recentlyWatched.slice(0, RECENTLY_WATCHED_LIMIT);
    }

    await setDoc(
      userDocRef,
      {
        recentlyWatched: recentlyWatched,
      },
      { merge: true }
    );

    console.log(
      `[Firestore] Successfully updated recently watched for user ${userId}, item ID: ${item.id}. Total items: ${recentlyWatched.length}`
    );
    invalidateCache("userData", userId); // Invalidate user data cache which includes recentlyWatched
  } catch (error) {
    console.error(
      `[Firestore] Error updating recently watched for user ${userId}:`,
      error
    );
    console.error(
      "[Firestore] Item details:",
      item,
      "Duration:",
      durationSeconds
    );
    if (error.code === "permission-denied") {
      console.error(
        "[Firestore] Permission denied. Check Firestore security rules for users collection."
      );
    }
  }
};

export const removeFromRecentlyWatched = async (userId, itemToRemove) => {
  if (
    !userId ||
    !itemToRemove ||
    typeof itemToRemove.id === "undefined" ||
    typeof itemToRemove.media_type === "undefined"
  ) {
    console.error(
      "[Firestore] Invalid arguments for removeFromRecentlyWatched:",
      {
        userId,
        itemToRemove,
      }
    );
    return;
  }

  console.log(
    `[Firestore] Attempting to remove from recently watched for user ${userId}, item ID: ${itemToRemove.id}, type: ${itemToRemove.media_type}`
  );

  const userDocRef = doc(db, "users", userId);

  try {
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      console.error(
        `[Firestore] User document not found for user ${userId} when trying to remove history item.`
      );
      return;
    }

    const userData = userDoc.data();
    let recentlyWatched = userData.recentlyWatched || [];

    // Find the item and remove it
    const updatedRecentlyWatched = recentlyWatched.filter(
      (watchedItem) =>
        !(
          watchedItem.id === itemToRemove.id &&
          watchedItem.media_type === itemToRemove.media_type
        )
    );

    if (recentlyWatched.length === updatedRecentlyWatched.length) {
      console.warn(
        `[Firestore] Item to remove not found in recently watched list for user ${userId}. Item:`,
        itemToRemove
      );
      // Optionally, still proceed to setDoc to ensure consistency if the client thinks it was there.
    }

    await setDoc(
      userDocRef,
      {
        recentlyWatched: updatedRecentlyWatched,
      },
      { merge: true }
    );

    console.log(
      `[Firestore] Successfully updated recently watched for user ${userId} after removing item. New count: ${updatedRecentlyWatched.length}`
    );
    invalidateCache("userData", userId); // Invalidate user data cache which includes recentlyWatched
  } catch (error) {
    console.error(
      `[Firestore] Error removing item from recently watched for user ${userId}:`,
      error
    );
    console.error("[Firestore] Item details:", itemToRemove);
    if (error.code === "permission-denied") {
      console.error(
        "[Firestore] Permission denied. Check Firestore security rules for users collection."
      );
    }
    throw error; // Re-throw the error so the caller can handle it if needed
  }
};

/**
 * Increments the watch count for a specific media type.
 * @param {string} userId - The user's ID.
 * @param {string} mediaType - Type of media ('movie', 'tv', 'anime').
 */
export const incrementMediaWatchCount = async (userId, mediaType) => {
  if (!userId || !mediaType) {
    console.error(
      "[Firestore] Invalid userId or mediaType for incrementMediaWatchCount"
    );
    return;
  }
  const userRef = doc(db, "users", userId);
  let fieldToIncrement;
  switch (mediaType.toLowerCase()) {
    case "movie":
      fieldToIncrement = "stats.moviesWatchedCount";
      break;
    case "tv":
      fieldToIncrement = "stats.seriesWatchedCount";
      break;
    case "anime":
      fieldToIncrement = "stats.animeWatchedCount";
      break;
    default:
      console.error(`[Firestore] Unknown mediaType: ${mediaType}`);
      return;
  }
  console.log(
    `[Firestore] Incrementing ${fieldToIncrement} for user ${userId}`
  );
  try {
    await updateDoc(userRef, { [fieldToIncrement]: increment(1) });
    console.log(`[Firestore] Incremented ${fieldToIncrement} for ${userId}`);
  } catch (error) {
    console.error(
      `[Firestore] Error incrementing watch count for ${userId}:`,
      error
    );
    if (error.code === "not-found") {
      console.warn(
        `[Firestore] User document ${userId} not found or stats field missing. Ensure manageUserDocumentOnLogin has run.`
      );
    }
    throw error;
  }
};

/**
 * Fetches a user's document data once.
 * Uses cache if available.
 * @param {string} userId - The user's ID.
 * @returns {Promise<object|null>} The user data or null if not found.
 */
export const getUserData = async (userId) => {
  if (!userId) {
    console.warn("[Firestore] getUserData: No userId provided.");
    return null;
  }
  const userRef = doc(db, "users", userId);
  try {
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log(`[Firestore] User data fetched for ${userId}:`, data);
      return {
        id: docSnap.id,
        ...data,
        hasSeenWelcomeModal:
          data.hasSeenWelcomeModal === undefined
            ? false
            : data.hasSeenWelcomeModal,
        // Ensure stats exist and have default values if not present
        stats: {
          moviesWatched: data.stats?.moviesWatched || 0,
          tvShowsWatched: data.stats?.tvShowsWatched || 0,
          totalTimeSpentSeconds: data.stats?.totalTimeSpentSeconds || 0,
        },
        recentlyWatched: data.recentlyWatched || [],
      };
    } else {
      console.log(`[Firestore] No user document found for ${userId}.`);
      return null;
    }
  } catch (error) {
    console.error(`[Firestore] Error getting user data for ${userId}:`, error);
    throw error;
  }
};

/**
 * Sets up a real-time listener for a user's document.
 * @param {string} userId - The user's ID.
 * @param {function} onUpdate - Callback function with updated user data.
 * @param {function} onError - Callback function for errors.
 * @returns {function} Unsubscribe function.
 */
export const setupUserDataListener = (userId, onUpdate, onError) => {
  if (!userId) {
    console.warn("[Firestore] setupUserDataListener: No userId provided.");
    return () => {}; // Return a no-op unsubscribe function
  }

  const listenerKey = `userData_${userId}`;

  // If a listener for this user already exists, unsubscribe from it first
  if (activeListeners.has(listenerKey)) {
    const existingUnsubscribe = activeListeners.get(listenerKey);
    existingUnsubscribe();
    console.log(
      `[Firestore] Removed existing user data listener for ${userId} before setting up new one.`
    );
  }

  const userRef = doc(db, "users", userId);
  console.log(`[Firestore] Setting up user data listener for ${userId}`);

  const unsubscribe = onSnapshot(
    userRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log(
          `[Firestore] User data listener update for ${userId}:`,
          data
        );
        const processedData = {
          id: docSnap.id,
          ...data,
          hasSeenWelcomeModal:
            data.hasSeenWelcomeModal === undefined
              ? false
              : data.hasSeenWelcomeModal,
          stats: {
            moviesWatched: data.stats?.moviesWatched || 0,
            tvShowsWatched: data.stats?.tvShowsWatched || 0,
            totalTimeSpentSeconds: data.stats?.totalTimeSpentSeconds || 0,
          },
          recentlyWatched: data.recentlyWatched || [],
        };
        onUpdate(processedData);
      } else {
        console.log(
          `[Firestore] User document does not exist for ${userId} in listener.`
        );
        onUpdate(null); // Notify that data is null (user doc deleted or non-existent)
      }
    },
    (error) => {
      console.error(
        `[Firestore] User data listener error for ${userId}:`,
        error
      );
      if (onError) {
        onError(error);
      }
    }
  );

  activeListeners.set(listenerKey, unsubscribe);

  return () => {
    unsubscribe();
    activeListeners.delete(listenerKey);
    console.log(`[Firestore] User data listener removed for ${userId}`);
  };
};

// Helper function to clean up listeners when component unmounts
export const cleanupListeners = () => {
  activeListeners.forEach((unsubscribe) => unsubscribe());
  activeListeners.clear();
  console.log("Cleaned up all Firestore listeners");
};
