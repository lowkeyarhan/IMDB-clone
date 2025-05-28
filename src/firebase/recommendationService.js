const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Generates a concise list of titles from watch history and favorites.
 * @param {Array<Object>} recentlyWatched - User's recently watched items.
 * @param {Array<Object>} favorites - User's favorite items.
 * @returns {string} A comma-separated string of unique titles.
 */
function generateSimplifiedMediaList(recentlyWatched, favorites) {
  const processedWatched = recentlyWatched
    .slice(0, 10) // Take up to 10 watched titles
    .map((item) => {
      if (item.title) {
        if (
          typeof item.percentageWatched === "number" &&
          item.percentageWatched >= 0 &&
          item.percentageWatched <= 100
        ) {
          return `${item.title} (watched ${item.percentageWatched}%)`;
        }
        return `${item.title} (watched unknown %)`;
      }
      return null;
    })
    .filter(Boolean);

  const watchedTitlesForExclusion = new Set(
    recentlyWatched.map((item) => item.title).filter(Boolean)
  );

  const processedFavorites = favorites
    .filter((item) => item.title && !watchedTitlesForExclusion.has(item.title)) // Ensure favorites are unique and not in recent
    .slice(0, 5) // Add up to 5 unique favorites
    .map((item) => item.title)
    .filter(Boolean);

  return {
    watchedString: processedWatched.join(", "),
    favoritesString: processedFavorites.join(", "),
  };
}

/**
 * Fetches movie and TV show recommendations from the Gemini API.
 * @param {Array<Object>} recentlyWatched - User's recently watched items.
 * @param {Array<Object>} favorites - User's favorite items.
 * @param {number} variant - A number to help request varied recommendations.
 * @param {Array<{role: string, parts: Array<{text: string}>}>} conversationHistory - Array of previously recommended titles.
 * @returns {Promise<Array<string>>} A promise that resolves to an array of recommended titles.
 */
export async function fetchRecommendations(
  recentlyWatched,
  favorites,
  variant = 0,
  conversationHistory = []
) {
  if (!GEMINI_API_KEY) {
    console.error(
      "Gemini API Key is missing. Please set VITE_GEMINI_API_KEY in your .env file."
    );
    return { error: "API Key missing", recommendations: [] };
  }

  const mediaData = generateSimplifiedMediaList(recentlyWatched, favorites);

  if (!mediaData.watchedString && !mediaData.favoritesString) {
    console.log(
      "No media history or favorites to generate recommendations from."
    );
    return { error: "No media data", recommendations: [] };
  }

  // New, more detailed prompt structure
  let prompt = `You are an expert movie and TV show recommendation engine.
Closely and very deeply analyze this user's viewing history, favourites and watchlist. Pay close attention to the genre,plot points, themes, emotions, and complex characters in the content they engage with. Pay morenattention to the favourites, followed by the watch history and watchlist.

User's Watched History (titles are followed by the percentage of the movie/show watched, indicating their engagement level; earlier items are more recent or heavily weighted):
${mediaData.watchedString || "No recently watched movies or shows provided."}

User's Favorite Movies and TV Shows (these are explicitly marked by the user as their favorites):
${mediaData.favoritesString || "No favorite movies or shows provided."}

Using this deep profile of the user's preferences, generate ultra-personalized content recommendations they are highly likely to enjoy.
For each recommendation, include a brief justification explaining how it connects to their past preferences, considering both their watched history (and how much they watched) and their declared favorites.
You must reason like a human film expert but use machine precision to analyze patterns and user tendencies. 
Your goal is not to suggest merely popular titles, but deeply relevant and emotionally resonant ones that the user might otherwise miss. 
Prioritize titles the user likely hasn't seen.

Based on these preferences, recommend 10 high-quality and top-rated movies or TV shows. Aim for a thoughtful mix that might include critically acclaimed titles, popular hits they might have missed, and perhaps some lesser-known hidden gems relevant to their taste. Ensure that no movie/TV shows are repeated in your recommendations; use your reasoning and justification process to guarantee uniqueness.
`;

  if (variant > 0) {
    prompt += `\nThis is request number ${
      variant + 1
    } for recommendations. Always offer a different selection than any previous suggestions, perhaps by exploring related sub-genres, different actors/directors inspired by their history, or varying the balance between well-known and niche titles.
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
          ...conversationHistory,
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 1.25,
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
      return {
        recommendations: recommendedTitles,
        prompt: prompt,
        rawModelResponse: textResponse,
      };
    } else {
      console.warn(
        "[recommendationService] No valid content in Gemini response:",
        data
      );
      return {
        error: "No content from Gemini",
        recommendations: [],
        prompt: prompt,
      };
    }
  } catch (error) {
    console.error(
      "[recommendationService] Error fetching recommendations:",
      error
    );
    return {
      error: error.message || "Failed to fetch recommendations",
      recommendations: [],
      prompt: prompt,
    };
  }
}
