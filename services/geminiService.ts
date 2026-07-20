import { GoogleGenAI, Type } from "@google/genai";
import { UserPreferences, TripPlan, Activity, DayPlan, Accommodation } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are 윤우영의 여행일정 AI, an elite AI travel planner. Your goal is to create hyper-personalized, realistic, and optimized travel itineraries in Korean.
You must return PURE JSON. Do not use Markdown formatting.
`;

export const generateTripPlan = async (prefs: UserPreferences): Promise<TripPlan> => {
  const prompt = `
    Create a ${prefs.duration}-day trip itinerary starting from departure: "${prefs.departure}"${prefs.stopover ? `, passing through stopover: "${prefs.stopover}"` : ""}, and ending at destination: "${prefs.destination}".
    The output language must be KOREAN (Hangul).
    
    Context:
    - Departure: ${prefs.departure}
    - Stopover (optional): ${prefs.stopover || "None"}
    - Destination: ${prefs.destination}
    - Companions: ${prefs.companions}
    - Budget per person (1인당 예산): ${prefs.budgetAmount}
    - Themes: ${prefs.themes.join(", ")}
    - Preferred Meals (선호 식사 유형): ${prefs.preferredMeals.join(", ")}
    - Preferred Accommodation Types (선호 숙박 유형): ${prefs.accommodationTypes.join(", ")}
    - Accommodation Budget Range (숙박 예산 범위): ${prefs.accommodationBudget}

    Requirements:
    1. The itinerary must be logically ordered by time and location efficient (minimal travel time between spots starting from the departure).
    2. Provide a specific "reason" for each recommendation based on the user's themes and preferences in Korean.
    3. Include estimated costs in Korean Won (KRW) or appropriate local currency formatted in Korean (e.g., "약 50,000원").
    4. Categorize activities strictly as one of these English keys: 'meal', 'sightseeing', 'cafe', 'activity', or 'rest'.
    5. 'tripName', 'summary', 'placeName', 'description', 'reason', 'locationHint' must be in Korean.
    6. Dining ('meal') Recommendations: 
       Identify and recommend real, highly-rated local restaurants corresponding to the selected dining categories: "${prefs.preferredMeals.join(", ")}". 
       In the 'reason' or 'description', explicitly cite their realistic Google, Naver, etc. search ratings and review volumes (e.g., "구글 평점 4.7점, 네이버 방문자 리뷰 2,300개 이상으로 높은 인기를 얻고 있는 현지인 추천 맛집...").
    7. Daily Accommodation Recommendation:
       For EACH day, recommend a highly-rated accommodation that fits the selected preferred accommodation styles: "${prefs.accommodationTypes.join(", ")}" and is within the nightly accommodation budget: "${prefs.accommodationBudget}".
       This MUST be returned under the "accommodation" field in each Day object.
       The recommendation must represent real, highly-rated accommodations typically searchable on Google, Naver, etc.
       Provide realistic ratings (e.g., "구글 4.6 (후기 950개) / 네이버 4.8") and highlights of highly positive reviews (e.g., "침구류가 깨끗하고 오션뷰가 훌륭하며, 친절한 직원 응대로 평점이 매우 높은 숙소입니다").

    Response Format (JSON Schema):
    {
      "tripName": "Creative Trip Title in Korean",
      "summary": "A short engaging summary of the trip concept in Korean.",
      "totalEstimatedBudget": "Total estimated cost string in Korean",
      "days": [
        {
          "day": 1,
          "theme": "Theme title for the day in Korean",
          "activities": [
            {
              "id": "unique_id",
              "time": "HH:MM",
              "placeName": "Name of place in Korean",
              "description": "Short description in Korean",
              "category": "strictly 'meal' | 'sightseeing' | 'cafe' | 'activity' | 'rest'",
              "estimatedCost": "Cost string in Korean",
              "reason": "Why this fits the user (in Korean)",
              "locationHint": "District or area name in Korean"
            }
          ],
          "accommodation": {
            "name": "Recommended Hotel or Lodging Name in Korean",
            "type": "Lodging type (e.g. 호텔, 리조트 등)",
            "rating": "Real ratings/review metrics (e.g. 구글 4.7 (리뷰 1.2천), 네이버 4.8)",
            "reviews": "Review highlight details in Korean",
            "estimatedCost": "Estimated cost string per night (e.g. 1박당 약 150,000원)",
            "location": "District/Area/Address in Korean"
          }
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tripName: { type: Type.STRING },
            summary: { type: Type.STRING },
            totalEstimatedBudget: { type: Type.STRING },
            days: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.INTEGER },
                  theme: { type: Type.STRING },
                  activities: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        time: { type: Type.STRING },
                        placeName: { type: Type.STRING },
                        description: { type: Type.STRING },
                        category: { type: Type.STRING },
                        estimatedCost: { type: Type.STRING },
                        reason: { type: Type.STRING },
                        locationHint: { type: Type.STRING }
                      },
                      required: ["id", "time", "placeName", "category", "reason"]
                    }
                  },
                  accommodation: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      type: { type: Type.STRING },
                      rating: { type: Type.STRING },
                      reviews: { type: Type.STRING },
                      estimatedCost: { type: Type.STRING },
                      location: { type: Type.STRING }
                    },
                    required: ["name", "type", "rating", "reviews", "estimatedCost", "location"]
                  }
                },
                required: ["day", "activities"]
              }
            }
          },
          required: ["tripName", "days"]
        }
      }
    });

    if (!response.text) throw new Error("No response from AI");
    return JSON.parse(response.text) as TripPlan;

  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

export const modifyTripPlan = async (
  currentPlan: TripPlan,
  prefs: UserPreferences,
  feedback: string
): Promise<TripPlan> => {
  const prompt = `
    You are revising an existing travel itinerary based on the user's feedback.
    
    Current Plan:
    ${JSON.stringify(currentPlan, null, 2)}

    User's Travel Context:
    - Departure: ${prefs.departure}
    - Stopover: ${prefs.stopover || "None"}
    - Destination: ${prefs.destination}
    - Companions: ${prefs.companions}
    - Budget per person: ${prefs.budgetAmount}
    - Themes: ${prefs.themes.join(", ")}
    - Preferred Meals: ${prefs.preferredMeals.join(", ")}
    - Preferred Accommodations: ${prefs.accommodationTypes.join(", ")}
    - Accommodation Budget: ${prefs.accommodationBudget}

    User's Feedback / Revision Request:
    "${feedback}"

    Requirements:
    1. Revise the itinerary to address the user's feedback as precisely as possible.
    2. Maintain the overall structure, day count (${prefs.duration} days), and format.
    3. Generate new activities/accommodations or adjust existing items based on feedback.
    4. Provide specific "reason" for new recommendations.
    5. Ensure every day continues to have a highly-rated "accommodation" object conforming to the schema and criteria.
    6. The response must use the exact same JSON schema. Return PURE JSON in Korean.

    Response Format (JSON Schema):
    {
      "tripName": "Creative Trip Title in Korean",
      "summary": "A short engaging summary of the trip concept in Korean.",
      "totalEstimatedBudget": "Total estimated cost string in Korean",
      "days": [
        {
          "day": 1,
          "theme": "Theme title for the day in Korean",
          "activities": [
            {
              "id": "unique_id",
              "time": "HH:MM",
              "placeName": "Name of place in Korean",
              "description": "Short description in Korean",
              "category": "strictly 'meal' | 'sightseeing' | 'cafe' | 'activity' | 'rest'",
              "estimatedCost": "Cost string in Korean",
              "reason": "Why this fits the user (in Korean)",
              "locationHint": "District or area name in Korean"
            }
          ],
          "accommodation": {
            "name": "Recommended Hotel or Lodging Name in Korean",
            "type": "Lodging type",
            "rating": "Real ratings/review metrics (e.g. 구글 4.7 (리뷰 1.2천), 네이버 4.8)",
            "reviews": "Review highlight details in Korean",
            "estimatedCost": "Estimated cost string per night (e.g. 1박당 약 150,000원)",
            "location": "District/Area/Address in Korean"
          }
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tripName: { type: Type.STRING },
            summary: { type: Type.STRING },
            totalEstimatedBudget: { type: Type.STRING },
            days: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.INTEGER },
                  theme: { type: Type.STRING },
                  activities: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        time: { type: Type.STRING },
                        placeName: { type: Type.STRING },
                        description: { type: Type.STRING },
                        category: { type: Type.STRING },
                        estimatedCost: { type: Type.STRING },
                        reason: { type: Type.STRING },
                        locationHint: { type: Type.STRING }
                      },
                      required: ["id", "time", "placeName", "category", "reason"]
                    }
                  },
                  accommodation: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      type: { type: Type.STRING },
                      rating: { type: Type.STRING },
                      reviews: { type: Type.STRING },
                      estimatedCost: { type: Type.STRING },
                      location: { type: Type.STRING }
                    },
                    required: ["name", "type", "rating", "reviews", "estimatedCost", "location"]
                  }
                },
                required: ["day", "activities"]
              }
            }
          },
          required: ["tripName", "days"]
        }
      }
    });

    if (!response.text) throw new Error("No response from AI");
    return JSON.parse(response.text) as TripPlan;
  } catch (error) {
    console.error("Gemini Modify Plan Error:", error);
    throw error;
  }
};

export const getAlternativeActivity = async (
  currentActivity: Activity,
  prefs: UserPreferences,
  context: string = "User wants a different option."
): Promise<Activity> => {
  const prompt = `
    The user is at "${currentActivity.placeName}" (Category: ${currentActivity.category}) in ${prefs.destination}.
    They want an alternative recommendation for this specific time slot.
    Reason/Context: ${context}
    
    User Preferences:
    - Themes: ${prefs.themes.join(", ")}
    - Companions: ${prefs.companions}
    - Preferred Meals: ${prefs.preferredMeals.join(", ")}

    Provide ONE alternative activity that is nearby or logistically similar but better fits the context.
    Output must be in KOREAN.
    Category must be strictly one of: 'meal', 'sightseeing', 'cafe', 'activity', 'rest'.
  `;

  try {
     const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
            id: { type: Type.STRING },
            time: { type: Type.STRING },
            placeName: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            estimatedCost: { type: Type.STRING },
            reason: { type: Type.STRING },
            locationHint: { type: Type.STRING }
            },
            required: ["id", "placeName", "reason"]
        }
      }
    });

    if (!response.text) throw new Error("No response from AI");
    return JSON.parse(response.text) as Activity;
  } catch (error) {
    console.error("Gemini Alternative Error:", error);
    throw error;
  }
};
