import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
} from "react";

// Create context
const HomeDataContext = createContext();

// Cache timeout (30 minutes)
const CACHE_TIMEOUT = 30 * 60 * 1000;

export function HomeDataProvider({ children }) {
  // Store the cached data for different sections
  const [bannerMovies, setBannerMovies] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState({});
  const [tvShows, setTvShows] = useState({});
  const [animeShows, setAnimeShows] = useState({});
  const [genres, setGenres] = useState({});

  // Track when data was last fetched
  const cacheTimestamps = useRef({
    banner: 0,
    trending: {},
    tvShows: {},
    anime: {},
    genres: 0,
  });

  // Track if we've preloaded banner images
  const [bannerImagesPreloaded, setBannerImagesPreloaded] = useState(false);
  const preloadedImages = useRef({});

  // Get base API constants
  const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
  const BASE_URL = "https://api.themoviedb.org/3";
  const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
  const BACKDROP_SIZE = "/original";
  const POSTER_SIZE = "/w500";

  // Function to get image URL
  const getImageUrl = (path, size = POSTER_SIZE) => {
    if (!path) return null;
    return `${IMAGE_BASE_URL}${size}${path}`;
  };

  // Check if data is fresh or needs to be fetched
  const isCacheFresh = (cacheType, page = 1) => {
    const now = Date.now();

    if (cacheType === "banner") {
      return (
        now - cacheTimestamps.current.banner < CACHE_TIMEOUT &&
        bannerMovies.length > 0
      );
    }

    if (cacheType === "trending") {
      return (
        now - (cacheTimestamps.current.trending[page] || 0) < CACHE_TIMEOUT &&
        trendingMovies[page] &&
        trendingMovies[page].length > 0
      );
    }

    if (cacheType === "tvShows") {
      return (
        now - (cacheTimestamps.current.tvShows[page] || 0) < CACHE_TIMEOUT &&
        tvShows[page] &&
        tvShows[page].length > 0
      );
    }

    if (cacheType === "anime") {
      return (
        now - (cacheTimestamps.current.anime[page] || 0) < CACHE_TIMEOUT &&
        animeShows[page] &&
        animeShows[page].length > 0
      );
    }

    if (cacheType === "genres") {
      return (
        now - cacheTimestamps.current.genres < CACHE_TIMEOUT &&
        Object.keys(genres).length > 0
      );
    }

    return false;
  };

  // Preload banner images
  const preloadBannerImages = useCallback(
    (movies) => {
      if (bannerImagesPreloaded) return Promise.resolve();

      const promises = movies.map((movie) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          const imgUrl = getImageUrl(movie.backdrop_path, BACKDROP_SIZE);
          img.src = imgUrl;
          preloadedImages.current[movie.id] = imgUrl;

          img.onload = () => resolve();
          img.onerror = () => reject();
        });
      });

      return Promise.all(promises)
        .then(() => {
          setBannerImagesPreloaded(true);
          return movies;
        })
        .catch((err) => {
          console.error("Failed to preload banner images", err);
          return movies;
        });
    },
    [bannerImagesPreloaded]
  );

  // Fetch banner movies
  const fetchBannerMovies = useCallback(
    async (forceRefresh = false) => {
      // Return cached data if fresh
      if (isCacheFresh("banner") && !forceRefresh) {
        console.log("Using cached banner data");
        return bannerMovies;
      }

      try {
        console.log("Fetching fresh banner data");
        const response = await fetch(
          `${BASE_URL}/trending/movie/week?api_key=${API_KEY}&page=1`
        );
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          // Filter movies with backdrop images and limit to 6
          const moviesWithBackdrops = data.results
            .filter((movie) => movie.backdrop_path)
            .slice(0, 6);

          // Update cache data
          setBannerMovies(moviesWithBackdrops);
          cacheTimestamps.current.banner = Date.now();

          // Preload the images
          return preloadBannerImages(moviesWithBackdrops);
        }
        return [];
      } catch (error) {
        console.error("Error fetching banner movies:", error);
        return bannerMovies; // Return existing data on error
      }
    },
    [API_KEY, bannerMovies, preloadBannerImages]
  );

  // Fetch genres
  const fetchGenres = useCallback(
    async (forceRefresh = false) => {
      // Return cached genres if fresh
      if (isCacheFresh("genres") && !forceRefresh) {
        console.log("Using cached genres data");
        return genres;
      }

      try {
        console.log("Fetching fresh genres data");
        const response = await fetch(
          `${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=en-US`
        );
        const data = await response.json();

        if (data.genres) {
          // Convert to object with id as key for faster lookups
          const genresMap = {};
          data.genres.forEach((genre) => {
            genresMap[genre.id] = genre.name;
          });

          // Update cache
          setGenres(genresMap);
          cacheTimestamps.current.genres = Date.now();

          return genresMap;
        }
        return genres;
      } catch (error) {
        console.error("Error fetching genres:", error);
        return genres; // Return existing data on error
      }
    },
    [API_KEY, genres]
  );

  // Fetch trending movies for a specific page
  const fetchTrendingMovies = useCallback(
    async (page = 1, forceRefresh = false) => {
      // Return cached data if fresh
      if (isCacheFresh("trending", page) && !forceRefresh) {
        console.log(`Using cached trending movies for page ${page}`);
        return {
          movies: trendingMovies[page],
          totalPages: trendingMovies.totalPages || 10,
        };
      }

      try {
        console.log(`Fetching fresh trending movies for page ${page}`);
        const response = await fetch(
          `${BASE_URL}/trending/movie/week?api_key=${API_KEY}&page=${page}`
        );
        const data = await response.json();

        // Update cache
        const newTrendingMovies = { ...trendingMovies };
        newTrendingMovies[page] = data.results;
        newTrendingMovies.totalPages = Math.min(data.total_pages, 500);

        setTrendingMovies(newTrendingMovies);

        // Update timestamp
        const timestamps = { ...cacheTimestamps.current.trending };
        timestamps[page] = Date.now();
        cacheTimestamps.current.trending = timestamps;

        return {
          movies: data.results,
          totalPages: Math.min(data.total_pages, 500),
        };
      } catch (error) {
        console.error(
          `Error fetching trending movies for page ${page}:`,
          error
        );
        return {
          movies: trendingMovies[page] || [],
          totalPages: trendingMovies.totalPages || 10,
        };
      }
    },
    [API_KEY, trendingMovies]
  );

  // Fetch TV shows for a specific page
  const fetchTvShows = useCallback(
    async (page = 1, forceRefresh = false) => {
      // Return cached data if fresh
      if (isCacheFresh("tvShows", page) && !forceRefresh) {
        console.log(`Using cached TV shows for page ${page}`);
        return {
          shows: tvShows[page],
          totalPages: tvShows.totalPages || 10,
        };
      }

      try {
        console.log(`Fetching fresh TV shows for page ${page}`);
        const response = await fetch(
          `${BASE_URL}/tv/popular?api_key=${API_KEY}&page=${page}`
        );
        const data = await response.json();

        // Update cache
        const newTvShows = { ...tvShows };
        newTvShows[page] = data.results;
        newTvShows.totalPages = Math.min(data.total_pages, 500);

        setTvShows(newTvShows);

        // Update timestamp
        const timestamps = { ...cacheTimestamps.current.tvShows };
        timestamps[page] = Date.now();
        cacheTimestamps.current.tvShows = timestamps;

        return {
          shows: data.results,
          totalPages: Math.min(data.total_pages, 500),
        };
      } catch (error) {
        console.error(`Error fetching TV shows for page ${page}:`, error);
        return {
          shows: tvShows[page] || [],
          totalPages: tvShows.totalPages || 10,
        };
      }
    },
    [API_KEY, tvShows]
  );

  // Fetch anime for a specific page
  const fetchAnimeShows = useCallback(
    async (page = 1, forceRefresh = false) => {
      // Return cached data if fresh
      if (isCacheFresh("anime", page) && !forceRefresh) {
        console.log(`Using cached anime for page ${page}`);
        return {
          anime: animeShows[page],
          totalPages: animeShows.totalPages || 10,
        };
      }

      try {
        console.log(`Fetching fresh anime for page ${page}`);
        const response = await fetch(
          // Anime is fetched by filtering TV shows with the animation genre (16)
          `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&sort_by=popularity.desc&page=${page}`
        );
        const data = await response.json();

        // Update cache
        const newAnimeShows = { ...animeShows };
        newAnimeShows[page] = data.results;
        newAnimeShows.totalPages = Math.min(data.total_pages, 500);

        setAnimeShows(newAnimeShows);

        // Update timestamp
        const timestamps = { ...cacheTimestamps.current.anime };
        timestamps[page] = Date.now();
        cacheTimestamps.current.anime = timestamps;

        return {
          anime: data.results,
          totalPages: Math.min(data.total_pages, 500),
        };
      } catch (error) {
        console.error(`Error fetching anime for page ${page}:`, error);
        return {
          anime: animeShows[page] || [],
          totalPages: animeShows.totalPages || 10,
        };
      }
    },
    [API_KEY, animeShows]
  );

  // Prefetch initial data for the homepage
  const prefetchHomeData = useCallback(async () => {
    // Prefetch all the data needed for the initial homepage view
    await Promise.all([
      fetchBannerMovies(),
      fetchGenres(),
      fetchTrendingMovies(1),
      fetchTvShows(1),
      fetchAnimeShows(1),
    ]);
    console.log("Prefetched all homepage data");
  }, [
    fetchBannerMovies,
    fetchGenres,
    fetchTrendingMovies,
    fetchTvShows,
    fetchAnimeShows,
  ]);

  const contextValue = {
    // Data getters
    bannerMovies,
    genres,
    trendingMovies,
    tvShows,
    animeShows,
    preloadedImages: preloadedImages.current,
    bannerImagesPreloaded,

    // Fetch methods
    fetchBannerMovies,
    fetchGenres,
    fetchTrendingMovies,
    fetchTvShows,
    fetchAnimeShows,
    prefetchHomeData,

    // Utility functions
    getImageUrl,
    isCacheFresh,
  };

  return (
    <HomeDataContext.Provider value={contextValue}>
      {children}
    </HomeDataContext.Provider>
  );
}

// Custom hook to use the context
export function useHomeData() {
  return useContext(HomeDataContext);
}
