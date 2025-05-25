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

  // New, more detailed prompt structure
  let prompt = `You are an expert movie and TV show recommendation engine.
Analyze this user's viewing history (earlier items in the list represent more heavily weighted preferences, often more recently watched): ${mediaList}.

Based on these preferences, recommend 10 high-quality movies or TV shows that the user likely hasn't seen but would genuinely enjoy. Aim for a thoughtful mix that might include critically acclaimed titles, popular hits they might have missed, and perhaps some lesser-known hidden gems relevant to their taste.
`;

  if (variant > 0) {
    prompt += `\nThis is request number ${
      variant + 1
    } for recommendations. Please try to offer a distinctively different selection than any previous suggestions, perhaps by exploring related sub-genres, different actors/directors inspired by their history, or varying the balance between well-known and niche titles.
`;
  }

  prompt += `\nProvide ONLY a comma-separated list of the movie or TV show titles. Do not add any extra text, numbering, or formatting. For example: Movie Title 1, TV Show Title A, Movie Title 2.`;

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
        generationConfig: {
          temperature: 1.25,
          // topK: 40, // Example: can be added if needed
          // candidateCount: 1, // Example: can be added if needed
        },
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
