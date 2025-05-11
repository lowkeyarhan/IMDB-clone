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

// --- NEW USER DATA FUNCTIONS ---

/**
 * Creates or updates a user's document in Firestore upon login.
 * Initializes stats and profile information.
 * Updates login-related stats.
 * @param {object} user - The Firebase Auth user object.
 */
export const manageUserDocumentOnLogin = async (user) => {
  if (!user || !user.uid) {
    console.error("Invalid user object provided to manageUserDocumentOnLogin");
    return;
  }
  const userRef = doc(db, "users", user.uid);
  console.log(`[Firestore] Managing document for user: ${user.uid}`);
  try {
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const userData = docSnap.data();
      const today = new Date().setHours(0, 0, 0, 0);
      const lastLoginTimestamp = userData.stats?.lastLoginDate;
      const lastLogin = lastLoginTimestamp
        ? lastLoginTimestamp.toDate().setHours(0, 0, 0, 0)
        : null;
      let consecutiveDays = userData.stats?.consecutiveLoginDays || 0;
      if (lastLogin === null) {
        consecutiveDays = 1;
      } else if (today === lastLogin + 24 * 60 * 60 * 1000) {
        consecutiveDays++;
      } else if (today !== lastLogin) {
        consecutiveDays = 1;
      }
      await updateDoc(userRef, {
        "profile.displayName":
          user.displayName || userData.profile?.displayName || "",
        "profile.email": user.email || userData.profile?.email || "",
        "profile.photoURL": user.photoURL || userData.profile?.photoURL || "",
        "stats.lastLoginDate": serverTimestamp(),
        "stats.consecutiveLoginDays": consecutiveDays,
        "stats.totalLogins": increment(1),
      });
      console.log(`[Firestore] User document updated for ${user.uid}`);
    } else {
      await setDoc(userRef, {
        createdAt: serverTimestamp(),
        profile: {
          displayName: user.displayName || "",
          email: user.email || "",
          photoURL: user.photoURL || "",
        },
        stats: {
          lastLoginDate: serverTimestamp(),
          consecutiveLoginDays: 1,
          totalLogins: 1,
          moviesWatchedCount: 0,
          seriesWatchedCount: 0,
          animeWatchedCount: 0,
        },
        recentlyWatched: [],
      });
      console.log(`[Firestore] New user document created for ${user.uid}`);
    }
  } catch (error) {
    console.error(
      `[Firestore] Error managing user document for ${user.uid}:`,
      error
    );
    throw error;
  }
};

/**
 * Adds an item to the user's recently watched list.
 * Keeps the list ordered by most recent and capped at RECENTLY_WATCHED_LIMIT.
 * @param {string} userId - The user's ID.
 * @param {object} item - The media item to add (should include id, type, title, posterPath).
 * @param {number} durationSeconds - The duration in seconds the item was watched.
 */
export const addRecentlyWatched = async (
  userId,
  item,
  durationSeconds = 0,
  watchTimeInMinutes
) => {
  if (!userId || !item || !item.id) {
    console.error("User ID or item details are missing for recently watched.");
    return;
  }

  if (watchTimeInMinutes <= 5) {
    console.log(
      `Item ${item.id} (${
        item.title || item.name
      }) not added to recently watched, watchTimeInMinutes: ${watchTimeInMinutes}`
    );
    return;
  }

  const userDocRef = doc(db, "users", userId);
  const mediaType = item.media_type || (item.first_air_date ? "tv" : "movie");
  const cleanItemId = String(item.id).split("_").pop();

  const newItem = {
    id: cleanItemId,
    title: item.title || item.name,
    poster_path: item.poster_path,
    media_type: mediaType,
    watchedAt: new Date(),
    durationSeconds: durationSeconds || 0,
    ...(mediaType === "tv" && {
      name: item.name,
      first_air_date: item.first_air_date,
    }),
    ...(mediaType === "movie" && {
      release_date: item.release_date,
    }),
  };

  console.log(
    `[Firestore addRecentlyWatched] Attempting to add for user ${userId}:`,
    newItem
  );

  try {
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      let currentRecentlyWatched = userDocSnap.data().recentlyWatched || [];

      currentRecentlyWatched = currentRecentlyWatched.filter(
        (rwItem) =>
          !(
            rwItem.id === newItem.id && rwItem.media_type === newItem.media_type
          )
      );

      const updatedRecentlyWatched = [newItem, ...currentRecentlyWatched];

      if (updatedRecentlyWatched.length > RECENTLY_WATCHED_LIMIT) {
        updatedRecentlyWatched.length = RECENTLY_WATCHED_LIMIT;
      }

      await updateDoc(userDocRef, {
        recentlyWatched: updatedRecentlyWatched,
      });
      console.log(
        `Updated recently watched for user ${userId} with item ${newItem.id}`
      );
    } else {
      await setDoc(userDocRef, {
        recentlyWatched: [newItem],
        favorites_count: 0,
        watchlist_count: 0,
        watched_movies_count: 0,
        watched_tv_shows_count: 0,
      });
      console.log(
        `Created recently watched for user ${userId} with item ${newItem.id}`
      );
    }
    invalidateCache("userData", userId);
  } catch (error) {
    console.error(
      `[Firestore addRecentlyWatched] Error adding to recently watched for user ${userId}:`,
      error,
      { item }
    );
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
  if (!userId) return null;
  console.log(`[Firestore] Getting user data for: ${userId}`);
  const cachedData = getFromCache("userData", userId);
  if (cachedData) {
    console.log(`[Firestore] Returning cached user data for ${userId}`);
    return cachedData;
  }
  try {
    const userRef = doc(db, "users", userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const userData = { id: docSnap.id, ...docSnap.data() };
      storeInCache("userData", userId, userData);
      return userData;
    } else {
      console.log(`[Firestore] No user document found for ${userId}`);
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
    if (onError) onError(new Error("User ID is required for listener."));
    return () => {};
  }
  const listenerKey = `userData_${userId}`;
  if (activeListeners.has(listenerKey)) {
    activeListeners.get(listenerKey)();
    activeListeners.delete(listenerKey);
  }
  console.log(`[Firestore] Setting up user data listener for: ${userId}`);
  const userRef = doc(db, "users", userId);
  const unsubscribe = onSnapshot(
    userRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const userData = { id: docSnap.id, ...docSnap.data() };
        storeInCache("userData", userId, userData);
        if (onUpdate) onUpdate(userData);
        console.log(`[Firestore] User data listener updated for ${userId}`);
      } else {
        if (onUpdate) onUpdate(null);
        console.log(
          `[Firestore] User document not found for ${userId} in listener.`
        );
      }
    },
    (error) => {
      console.error(
        `[Firestore] User data listener error for ${userId}:`,
        error
      );
      if (onError) onError(error);
    }
  );
  activeListeners.set(listenerKey, unsubscribe);
  return unsubscribe;
};

// Helper function to clean up listeners when component unmounts
export const cleanupListeners = () => {
  activeListeners.forEach((unsubscribe) => unsubscribe());
  activeListeners.clear();
  console.log("Cleaned up all Firestore listeners");
};
