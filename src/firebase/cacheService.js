// Cache configuration
const CACHE_EXPIRY = 5 * 60 * 1000;
const CACHE_VERSION = "1.0";

// In-memory cache store
const cache = {
  favorites: new Map(), // userId -> {data, timestamp}
  watchlist: new Map(), // userId -> {data, timestamp}
  listeners: new Map(), // path -> unsubscribe function
};

// Initialize in-memory cache from localStorage on load
const initializeFromLocalStorage = () => {
  try {
    // Load favorites cache
    const storedFavorites = localStorage.getItem("screenKiss_favorites_cache");
    if (storedFavorites) {
      const parsedFavorites = JSON.parse(storedFavorites);
      if (parsedFavorites.version === CACHE_VERSION) {
        Object.entries(parsedFavorites.data).forEach(([userId, data]) => {
          cache.favorites.set(userId, data);
        });
        console.log("Loaded favorites cache from localStorage");
      }
    }

    // Load watchlist cache
    const storedWatchlist = localStorage.getItem("screenKiss_watchlist_cache");
    if (storedWatchlist) {
      const parsedWatchlist = JSON.parse(storedWatchlist);
      if (parsedWatchlist.version === CACHE_VERSION) {
        Object.entries(parsedWatchlist.data).forEach(([userId, data]) => {
          cache.watchlist.set(userId, data);
        });
        console.log("Loaded watchlist cache from localStorage");
      }
    }
  } catch (error) {
    console.error("Error loading cache from localStorage:", error);
    localStorage.removeItem("screenKiss_favorites_cache");
    localStorage.removeItem("screenKiss_watchlist_cache");
  }
};

// Initialize cache from localStorage
initializeFromLocalStorage();

// Helper to persist cache to localStorage
const persistToLocalStorage = (collectionName) => {
  try {
    const cacheData = {};
    cache[collectionName].forEach((value, key) => {
      cacheData[key] = value;
    });

    const cacheObject = {
      version: CACHE_VERSION,
      data: cacheData,
      timestamp: Date.now(),
    };

    localStorage.setItem(
      `screenKiss_${collectionName}_cache`,
      JSON.stringify(cacheObject)
    );
    console.log(`Persisted ${collectionName} cache to localStorage`);
  } catch (error) {
    console.error(
      `Error persisting ${collectionName} cache to localStorage:`,
      error
    );
  }
};

/**
 * Get data from cache if available and not expired
 *
 * @param {string} collectionName - The collection name ('favorites' or 'watchlist')
 * @param {string} userId - The user ID
 * @returns {Array|null} - Cached data or null if not available/expired
 */
export const getFromCache = (collectionName, userId) => {
  if (!userId || !cache[collectionName]) return null;

  const cachedItem = cache[collectionName].get(userId);

  if (!cachedItem) return null;

  // Check if cache is expired
  if (Date.now() - cachedItem.timestamp > CACHE_EXPIRY) {
    console.log(`Cache for ${collectionName}/${userId} expired`);
    cache[collectionName].delete(userId);
    persistToLocalStorage(collectionName);
    return null;
  }

  console.log(`Cache hit for ${collectionName}/${userId}`);
  return cachedItem.data;
};

/**
 * Store data in cache
 *
 * @param {string} collectionName - The collection name ('favorites' or 'watchlist')
 * @param {string} userId - The user ID
 * @param {Array} data - The data to cache
 */
export const storeInCache = (collectionName, userId, data) => {
  if (!userId || !cache[collectionName] || !data) return;

  cache[collectionName].set(userId, {
    data,
    timestamp: Date.now(),
  });

  // Persist to localStorage
  persistToLocalStorage(collectionName);

  console.log(`Cached ${data.length} items in ${collectionName}/${userId}`);
};

/**
 * Invalidate (clear) cache for a collection/user
 *
 * @param {string} collectionName - The collection name ('favorites' or 'watchlist')
 * @param {string} userId - The user ID
 */
export const invalidateCache = (collectionName, userId) => {
  if (!userId || !cache[collectionName]) return;

  if (cache[collectionName].has(userId)) {
    cache[collectionName].delete(userId);
    // Update localStorage
    persistToLocalStorage(collectionName);
    console.log(`Cache invalidated for ${collectionName}/${userId}`);
  }
};

/**
 * Setup a real-time listener for a collection
 *
 * @param {string} collectionName - The collection name
 * @param {string} userId - The user ID
 * @param {function} onSnapshot - Firebase onSnapshot callback
 * @param {function} onError - Error callback
 * @returns {function} - Unsubscribe function
 */
export const setupListener = (collectionName, userId, onSnapshot, onError) => {
  const listenerPath = `${collectionName}/${userId}`;

  // Remove existing listener if any
  if (cache.listeners.has(listenerPath)) {
    cache.listeners.get(listenerPath)();
    cache.listeners.delete(listenerPath);
    console.log(`Removed existing listener for ${listenerPath}`);
  }

  // Store the unsubscribe function
  cache.listeners.set(listenerPath, onSnapshot);

  console.log(`Setup listener for ${listenerPath}`);
  return onSnapshot;
};

/**
 * Remove a listener
 *
 * @param {string} collectionName - The collection name
 * @param {string} userId - The user ID
 */
export const removeListener = (collectionName, userId) => {
  const listenerPath = `${collectionName}/${userId}`;

  if (cache.listeners.has(listenerPath)) {
    cache.listeners.get(listenerPath)();
    cache.listeners.delete(listenerPath);
    console.log(`Removed listener for ${listenerPath}`);
  }
};

/**
 * Clear all listeners
 */
export const clearAllListeners = () => {
  for (const unsubscribe of cache.listeners.values()) {
    unsubscribe();
  }
  cache.listeners.clear();
  console.log("Cleared all listeners");
};

/**
 * Clear all cache
 */
export const clearAllCache = () => {
  cache.favorites.clear();
  cache.watchlist.clear();
  // Clear localStorage cache too
  localStorage.removeItem("screenKiss_favorites_cache");
  localStorage.removeItem("screenKiss_watchlist_cache");
  console.log("Cleared all cache including localStorage");
};

/**
 * Check if we should fetch from firebase or if we have valid cached data
 *
 * @param {string} collectionName - The collection name
 * @param {string} userId - The user ID
 * @returns {boolean} - True if we should fetch from Firebase
 */
export const shouldFetchFromFirebase = (collectionName, userId) => {
  const cachedItem = cache[collectionName].get(userId);

  if (!cachedItem) return true;

  // Check if cache is expired
  if (Date.now() - cachedItem.timestamp > CACHE_EXPIRY) {
    return true;
  }

  return false;
};
