const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Generates a concise list of titles from watch history and favorites.
 * @param {Array<Object>} recentlyWatched - User's recently watched items.
 * @param {Array<Object>} favorites - User's favorite items.
 * @returns {string} A comma-separated string of unique titles.
 */
function generateSimplifiedMediaList(recentlyWatched, favorites) {
  const watchedTitles = new Set();
  recentlyWatched.forEach(
    (item) => item.title && watchedTitles.add(item.title)
  );

  const favoriteTitles = new Set();
  favorites.forEach((item) => item.title && favoriteTitles.add(item.title));

  // Prioritize watched titles, then add unique favorite titles
  let combinedTitles = Array.from(watchedTitles).slice(0, 10); // Take up to 10 watched titles

  const remainingSlots = 15 - combinedTitles.length;
  if (remainingSlots > 0) {
    const uniqueFavoriteTitles = Array.from(favoriteTitles).filter(
      (title) => !watchedTitles.has(title)
    );
    combinedTitles = combinedTitles.concat(
      uniqueFavoriteTitles.slice(0, Math.min(remainingSlots, 5))
    ); // Add up to 5 unique favorites
  }

  return combinedTitles.join(", ");
}

/**
 * Fetches movie and TV show recommendations from the Gemini API.
 * @param {Array<Object>} recentlyWatched - User's recently watched items.
 * @param {Array<Object>} favorites - User's favorite items.
 * @param {number} variant - A number to help request varied recommendations.
 * @returns {Promise<Array<string>>} A promise that resolves to an array of recommended titles.
 */
export async function fetchRecommendations(
  recentlyWatched,
  favorites,
  variant = 0
) {
  if (!GEMINI_API_KEY) {
    console.error(
      "Gemini API Key is missing. Please set VITE_GEMINI_API_KEY in your .env file."
    );
    return { error: "API Key missing", recommendations: [] };
  }

  const mediaList = generateSimplifiedMediaList(recentlyWatched, favorites);

  if (!mediaList) {
    console.log(
      "No media history or favorites to generate recommendations from."
    );
    return { error: "No media data", recommendations: [] };
  }

  let prompt = `Based on the following list of movies and TV shows: ${mediaList}, 
Please give strong priority to the earlier items in this list (which represent watched history) when generating recommendations. 
Recommend 10 other movies or TV shows.`;

  if (variant > 0) {
    prompt += `\nAlways provide a different set of recommendations (variation ${variant}).`;
  }

  prompt += `\nProvide only a comma-separated list of the titles. For example: Movie Title 1, TV Show Title A, Movie Title 2. Do not add any extra text, numbering, or formatting.`;

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        // Optional: Add safetySettings if needed
        // safetySettings: [
        //   { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        //   // ... other categories
        // ],
        // Optional: Add generationConfig if needed
        // generationConfig: {
        //   temperature: 0.7,
        //   topK: 40,
        //   candidateCount: 1,
        // }
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error("Gemini API request failed:", response.status, errorBody);
      throw new Error(
        `Gemini API error: ${errorBody.error?.message || response.statusText}`
      );
    }

    const data = await response.json();

    if (
      data.candidates &&
      data.candidates.length > 0 &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts.length > 0
    ) {
      const textResponse = data.candidates[0].content.parts[0].text;
      // Simple parsing: split by comma and trim whitespace
      const recommendedTitles = textResponse
        .split(",")
        .map((title) => title.trim())
        .filter((title) => title.length > 0);
      console.log(
        "[recommendationService] Recommended Titles from Gemini:",
        recommendedTitles
      );
      return { recommendations: recommendedTitles };
    } else {
      console.warn(
        "[recommendationService] No valid content in Gemini response:",
        data
      );
      return { error: "No content from Gemini", recommendations: [] };
    }
  } catch (error) {
    console.error(
      "[recommendationService] Error fetching recommendations:",
      error
    );
    return {
      error: error.message || "Failed to fetch recommendations",
      recommendations: [],
    };
  }
}
