import {
  collection,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "./config";

// Favorites Operations
export const getUserFavorites = async (userId) => {
  try {
    const favoritesRef = collection(db, "favourites");
    const q = query(favoritesRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    const favorites = [];
    querySnapshot.forEach((doc) => {
      favorites.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return favorites;
  } catch (error) {
    console.error("Error getting favorites:", error);
    throw error;
  }
};

export const addToFavorites = async (userId, item) => {
  try {
    // Create a unique document ID based on userId and movie/show ID
    const docId = `${userId}_${item.id}`;
    const favoriteRef = doc(db, "favourites", docId);

    // Add userId to the item data
    const favoriteData = {
      ...item,
      userId,
      createdAt: new Date(),
    };

    await setDoc(favoriteRef, favoriteData);
    return docId;
  } catch (error) {
    console.error("Error adding to favorites:", error);
    throw error;
  }
};

export const removeFromFavorites = async (userId, itemId) => {
  try {
    const docId = `${userId}_${itemId}`;
    const favoriteRef = doc(db, "favourites", docId);
    await deleteDoc(favoriteRef);
  } catch (error) {
    console.error("Error removing from favorites:", error);
    throw error;
  }
};

// Watchlist Operations
export const getUserWatchlist = async (userId) => {
  try {
    const watchlistRef = collection(db, "watchlist");
    const q = query(watchlistRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    const watchlist = [];
    querySnapshot.forEach((doc) => {
      watchlist.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return watchlist;
  } catch (error) {
    console.error("Error getting watchlist:", error);
    throw error;
  }
};

export const addToWatchlist = async (userId, item) => {
  try {
    // Create a unique document ID based on userId and movie/show ID
    const docId = `${userId}_${item.id}`;
    const watchlistRef = doc(db, "watchlist", docId);

    // Add userId to the item data
    const watchlistData = {
      ...item,
      userId,
      createdAt: new Date(),
    };

    await setDoc(watchlistRef, watchlistData);
    return docId;
  } catch (error) {
    console.error("Error adding to watchlist:", error);
    throw error;
  }
};

export const removeFromWatchlist = async (userId, itemId) => {
  try {
    const docId = `${userId}_${itemId}`;
    const watchlistRef = doc(db, "watchlist", docId);
    await deleteDoc(watchlistRef);
  } catch (error) {
    console.error("Error removing from watchlist:", error);
    throw error;
  }
};
