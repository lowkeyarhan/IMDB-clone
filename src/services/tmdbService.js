const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL_W500 = "https://image.tmdb.org/t/p/w500";

/**
 * Searches TMDB for a movie or TV show by title.
 * It prioritizes exact matches and TV shows if both types are found with similar names.
 * @param {string} title - The title of the movie or TV show.
 * @param {string | null} mediaTypeHint - An optional hint ('movie' or 'tv') if known.
 * @returns {Promise<Object|null>} A promise that resolves to the TMDB item object or null if not found.
 */
export async function searchMediaByTitle(title, mediaTypeHint = null) {
  if (!TMDB_API_KEY) {
    console.error(
      "TMDB API Key is missing. Please set VITE_TMDB_API_KEY in your .env file."
    );
    return null;
  }

  // Try searching for movie first
  let query = encodeURIComponent(title);
  let movieUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${query}`;
  let tvUrl = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${query}`;

  try {
    const [movieResponse, tvResponse] = await Promise.all([
      fetch(movieUrl),
      fetch(tvUrl),
    ]);

    if (!movieResponse.ok && !tvResponse.ok) {
      console.error(`TMDB API request failed for title: ${title}`);
      return null;
    }

    const movieData = movieResponse.ok
      ? await movieResponse.json()
      : { results: [] };
    const tvData = tvResponse.ok ? await tvResponse.json() : { results: [] };

    let results = [];
    if (movieData.results?.length > 0) {
      results = results.concat(
        movieData.results.map((item) => ({ ...item, media_type: "movie" }))
      );
    }
    if (tvData.results?.length > 0) {
      results = results.concat(
        tvData.results.map((item) => ({ ...item, media_type: "tv" }))
      );
    }

    if (results.length === 0) {
      console.warn(`No TMDB results found for title: ${title}`);
      return null;
    }

    // Prioritize based on hint if provided
    if (mediaTypeHint) {
      const hintedResults = results.filter(
        (r) => r.media_type === mediaTypeHint
      );
      if (hintedResults.length > 0) {
        // Further prioritize exact title match within hinted results
        const exactMatchHinted = hintedResults.find(
          (r) =>
            (r.title?.toLowerCase() || r.name?.toLowerCase()) ===
            title.toLowerCase()
        );
        if (exactMatchHinted) return normalizeTmdbItem(exactMatchHinted);
        return normalizeTmdbItem(hintedResults[0]); // Return first hinted result
      }
    }

    // If no hint or no hinted results, try to find an exact title match among all results
    const exactMatch = results.find(
      (r) =>
        (r.title?.toLowerCase() || r.name?.toLowerCase()) ===
        title.toLowerCase()
    );
    if (exactMatch) return normalizeTmdbItem(exactMatch);

    // Fallback: return the most popular item (TMDB results are often sorted by popularity)
    // or the first one if popularity is not available.
    results.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    return normalizeTmdbItem(results[0]);
  } catch (error) {
    console.error(`Error fetching from TMDB for title ${title}:`, error);
    return null;
  }
}

/**
 * Normalizes a TMDB item to a consistent structure.
 * TMDB uses 'title' for movies and 'name' for TV shows.
 * @param {Object} tmdbItem - The item object from TMDB.
 * @returns {Object} A normalized item object.
 */
function normalizeTmdbItem(tmdbItem) {
  if (!tmdbItem) return null;
  return {
    id: tmdbItem.id,
    title: tmdbItem.title || tmdbItem.name, // Use 'name' for TV shows if 'title' is absent
    original_title: tmdbItem.original_title || tmdbItem.original_name,
    overview: tmdbItem.overview,
    poster_path: tmdbItem.poster_path
      ? `${TMDB_IMAGE_BASE_URL_W500}${tmdbItem.poster_path}`
      : null,
    backdrop_path: tmdbItem.backdrop_path
      ? `${TMDB_IMAGE_BASE_URL_W500}${tmdbItem.backdrop_path}`
      : null,
    media_type: tmdbItem.media_type, // 'movie' or 'tv' (should be added by searchMediaByTitle)
    release_date: tmdbItem.release_date || tmdbItem.first_air_date,
    vote_average: tmdbItem.vote_average,
    popularity: tmdbItem.popularity,
  };
}

/**
 * Fetches detailed information for a specific media item (movie or TV show).
 * @param {string} mediaType - 'movie' or 'tv'.
 * @param {number} id - The TMDB ID of the media.
 * @returns {Promise<Object|null>} A promise that resolves to the detailed TMDB item or null.
 */
export async function fetchMediaDetails(mediaType, id) {
  if (!TMDB_API_KEY) {
    console.error("TMDB API Key is missing.");
    return null;
  }
  if (!mediaType || !id) {
    console.error("Media type and ID are required to fetch details.");
    return null;
  }

  const url = `${TMDB_BASE_URL}/${mediaType}/${id}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits,watch/providers`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(
        `TMDB API request failed for ${mediaType}/${id}: ${response.status}`
      );
      return null;
    }
    const data = await response.json();
    return normalizeTmdbItem({ ...data, media_type: mediaType }); // Ensure media_type is set
  } catch (error) {
    console.error(`Error fetching TMDB details for ${mediaType}/${id}:`, error);
    return null;
  }
}
