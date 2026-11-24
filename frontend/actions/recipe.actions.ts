"use server"
import { freeMealRecommendations, proTierLimit } from "@/lib/arcjet";
import { checkUser } from "@/lib/checkUser";
import { request } from "@arcjet/next";
import { GoogleGenAI } from "@google/genai";
import type {
  PantryRecipeSuggestion,
  Recipe,
  SavedRecipeRelation,
  StrapiCollectionResponse,
  StrapiEntityResponse,
} from "@/lib/types";

const STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ||""
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY; 

const genAI = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
});


export async function getRecipesByPantryIngredients(): Promise<
  | { success: false; message: string }
  | { success: true; recipes: PantryRecipeSuggestion[]; ingredientsUsed: string; recommendationsLimit: "unlimited" | number; message: string }
> {
    try {
        const user = await checkUser(); 
        if(!user) {
            throw new Error("User not found")
        }

        //check if pro user
        const isPro = user.subscriptionTier==="pro"; 

        //Apply Arject rate limit based on tier 
        const arjectClient = isPro ? proTierLimit:freeMealRecommendations

        //create a requerst object for arject
        const  req = await request();

        const decision = await arjectClient.protect(req,{
            userId: user.clerkId, //use clerk id from check user
            requested:1, //request 1 token from bucket
        })

        if(decision.isDenied()){
            if(decision.reason.isRateLimit()){
                throw new Error(
                    `Monthly scan limit reached. ${
                        isPro
                        ?"Please Contact Support for more scans"
                        :"Upgrade to Pro for Unlimited Scans! "
                    }`
                )
            }
            throw new Error("Request denied by security system")
        }
        
        // console.log("Starpi token",STRAPI_API_TOKEN);
        //Get user's pantry items 
        const pantryResponse = await fetch(
            `${STRAPI_URL}/api/pantry-items?filters[owner][id][$eq]=${user.id}`,
            {
                headers:{
                    Authorization:`Bearer ${STRAPI_API_TOKEN}`,
                },
                cache:"no-store"
            }
        );

        if(!pantryResponse.ok){
            throw new Error("Failed to fetch pantry items")
        }

        const pantryData: StrapiCollectionResponse<{ name: string }> = await pantryResponse.json() as StrapiCollectionResponse<{ name: string }>;

        if(!pantryData.data || pantryData.data.length===0){
            return {
                success:false,
                message:"Your Pantry is empty.Add ingredients first"
            }
        }

        const ingredients = pantryData.data.map((item) => item.name).join(", ");
        console.log(ingredients);

        console.log("🥘 Finding recipes for ingredients:", ingredients);

        const prompt = `
        You are a professional chef. Given these available ingredients: ${ingredients}

        Suggest 5 recipes that can be made primarily with these ingredients. It's okay if the recipes need 1-2 common pantry staples (salt, pepper, oil, etc.) that aren't listed.

        Return ONLY a valid JSON array (no markdown, no explanations):
        [
        {
            "title": "Recipe name",
            "description": "Brief 1-2 sentence description",
            "matchPercentage": 85,
            "missingIngredients": ["ingredient1", "ingredient2"],
            "category": "breakfast|lunch|dinner|snack|dessert",
            "cuisine": "italian|chinese|mexican|etc",
            "prepTime": 20,
            "cookTime": 30,
            "servings": 4
        }
        ]

        Rules:
        - matchPercentage should be 70-100% (how many listed ingredients are used)
        - missingIngredients should be common items or optional additions
        - Sort by matchPercentage descending
        - Make recipes realistic and delicious
        `;

        const result = await genAI.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: prompt,
        });


        const text = result.text ?? "";
        // console.log(text);

        let recipeSuggestions: unknown;
        try {
        const cleanText = text
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
        recipeSuggestions = JSON.parse(cleanText) as unknown;
        } catch {
        console.error("Failed to parse Gemini response:", text);
        throw new Error(
            "Failed to generate recipe suggestions. Please try again."
        );
        }

        if (!Array.isArray(recipeSuggestions)) throw new Error("Invalid recipe suggestions response");
        const recipes = recipeSuggestions.filter((item): item is PantryRecipeSuggestion =>
            typeof item === "object" && item !== null &&
            "title" in item && typeof item.title === "string"
        );
        return {
            success:true,
            recipes,
            ingredientsUsed:ingredients,
            recommendationsLimit:isPro?"unlimited":5,
            message:`Found ${recipeSuggestions.length} recipes you can make!`
        }

    } catch (error) {
        console.error("X Error in generating recipe suggestions:",error); 
        throw new Error(error instanceof Error ? error.message : "failed to get recipe suggestions")
    }
}


//Helper function to normalize recipe title 
function normalizeTitle(title: string): string{
    return title
        .trim()
        .split(" ")
        .map((word:string)=> word.charAt(0).toUpperCase()+word.slice(1).toLowerCase())
        .join(" ");
}


//Helper funciton to fetch image from unsplash
async function fetchRecipeImage(recipeName: string): Promise<string>{
    try {
        if(!UNSPLASH_ACCESS_KEY){
            console.warn("Unsplash Access key not set , skipping image fetch"); 
            return ""; 
        }

        const searchQuery = `${recipeName}`;

        const response = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=landscape`,
            {
                headers:{
                    Authorization:`Client-ID ${UNSPLASH_ACCESS_KEY}`
                },
            }
        );

        if(!response.ok){
            console.error("Unsplash API Error :", response.statusText); 
            return ""; 
        }

        const data: { results?: Array<{ urls: { regular: string } }> } = await response.json() as { results?: Array<{ urls: { regular: string } }> };

        if(data.results && data.results.length>0){
            const photo = data.results[0]; 
            console.log("Found unsplash image: ",photo.urls.regular); 
            return photo.urls.regular
        }
        return ""; 

    } catch (error) {
        console.error("Error in fetching unsplash image",error); 
        return ""; 
    }
}

//Get or generate recipe details 
export async function getOrGenerateRecipe(formData: FormData): Promise<{
  success: true;
  recipe: Recipe;
  recipeId: number;
  isSaved: boolean;
  fromDatabase: boolean;
  isPro: boolean;
  recommendationsLimit?: "unlimited" | number;
  message: string;
}> {
    try {
        const user = await checkUser() ; 
        if(!user){
            throw new Error("User not authenticated ");
        }
        const isPro = (user.subscriptionTier === "pro");
        console.log(isPro); 

        const recipeName = formData.get("recipeName"); 
        if (typeof recipeName !== "string") throw new Error("Recipe Name is required");
        if(!recipeName){
            throw new Error("Recipe Name is required ")
        }

        //Normalize the title 
        const normalizedTitle = normalizeTitle(recipeName); 

        //Step1 : Check if recipe already exists in DB(case-insesitive search)
        const searchResponse = await fetch(
            `${STRAPI_URL}/api/recipes?filters[title][$eqi]=${encodeURIComponent(normalizedTitle)}&populate=*`,
            {
                headers:{
                    Authorization:`Bearer ${STRAPI_API_TOKEN}`,
                },
                cache:"no-store"
            }
        );

        if(searchResponse.ok){
            const searchData: StrapiCollectionResponse<Recipe> = await searchResponse.json() as StrapiCollectionResponse<Recipe>; 

            if(searchData.data && searchData.data.length>0){
                //check if user has saved this recipe
                const savedRecipeResponse = await fetch(
                    `${STRAPI_URL}/api/saved-recipes?.filters[user][id][$eq]=${user.id}&filters[recipe][id][$eq]=${searchData.data[0].id}`,
                    {
                        headers:{
                            Authorization: `Bearer ${STRAPI_API_TOKEN}`,
                        },
                        cache:"no-store"
                    }
                )

                let isSaved = false; 
                if(savedRecipeResponse.ok){
                    const savedData: StrapiCollectionResponse<SavedRecipeRelation> = await savedRecipeResponse.json() as StrapiCollectionResponse<SavedRecipeRelation>; 
                    isSaved = savedData.data && savedData.data.length>0;
                }

                return {
                    success: true,
                    recipe: searchData.data[0],
                    recipeId: searchData.data[0].id ?? 0,
                    isSaved: isSaved,
                    fromDatabase: true,
                    isPro,
                    message: "Recipe found in database",
                }
            }
        }


        //Step2: Recipe Doesn't Exist , generate it with Gemini
        console.log("🤖 Recipe not found, generating with Gemini...");

        const prompt = `
        You are a professional chef and recipe expert. Generate a detailed recipe for: "${normalizedTitle}"

        CRITICAL: The "title" field MUST be EXACTLY: "${normalizedTitle}" (no changes, no additions like "Classic" or "Easy")

        Return ONLY a valid JSON object with this exact structure (no markdown, no explanations):
        {
        "title": "${normalizedTitle}",
        "description": "Brief 2-3 sentence description of the dish",
        "category": "Must be ONE of these EXACT values: breakfast, lunch, dinner, snack, dessert",
        "cuisine": "Must be ONE of these EXACT values: italian, chinese, mexican, indian, american, thai, japanese, mediterranean, french, korean, vietnamese, spanish, greek, turkish, moroccan, brazilian, caribbean, middle-eastern, british, german, portuguese, other",
        "prepTime": "Time in minutes (number only)",
        "cookTime": "Time in minutes (number only)",
        "servings": "Number of servings (number only)",
        "ingredients": [
            {
            "item": "ingredient name",
            "amount": "quantity with unit",
            "category": "Protein|Vegetable|Spice|Dairy|Grain|Other"
            }
        ],
        "instructions": [
            {
            "step": 1,
            "title": "Brief step title",
            "instruction": "Detailed step instruction",
            "tip": "Optional cooking tip for this step"
            }
        ],
        "nutrition": {
            "calories": "calories per serving",
            "protein": "grams",
            "carbs": "grams",
            "fat": "grams"
        },
        "tips": [
            "General cooking tip 1",
            "General cooking tip 2",
            "General cooking tip 3"
        ],
        "substitutions": [
            {
            "original": "ingredient name",
            "alternatives": ["substitute 1", "substitute 2"]
            }
        ]
        }

        IMPORTANT RULES FOR CATEGORY:
        - Breakfast items (pancakes, eggs, cereal, etc.) → "breakfast"
        - Main meals for midday (sandwiches, salads, pasta, etc.) → "lunch"
        - Main meals for evening (heavier dishes, roasts, etc.) → "dinner"
        - Light items between meals (chips, crackers, fruit, etc.) → "snack"
        - Sweet treats (cakes, cookies, ice cream, etc.) → "dessert"

        IMPORTANT RULES FOR CUISINE:
        - Use lowercase only
        - Pick the closest match from the allowed values
        - If uncertain, use "other"

        Guidelines:
        - Make ingredients realistic and commonly available
        - Instructions should be clear and beginner-friendly
        - Include 6-10 detailed steps
        - Provide practical cooking tips
        - Estimate realistic cooking times
        - Keep total instructions under 12 steps
        `;

        const result = await genAI.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: prompt,
        });

        const text = result.text ?? "";

        // Parse JSON response
        let recipeData: {
          title?: string;
          description: string;
          category?: string;
          cuisine?: string;
          prepTime: number | string;
          cookTime: number | string;
          servings: number | string;
          ingredients: Recipe["ingredients"];
          instructions: Recipe["instructions"];
          nutrition?: Recipe["nutrition"];
          tips?: string[];
          substitutions?: Recipe["substitutions"];
        };
        try {
            const cleanText = text
                .replace(/```json\n?/g, "")
                .replace(/```\n?/g, "")
                .trim();
            const parsedRecipe: unknown = JSON.parse(cleanText) as unknown;
            if (typeof parsedRecipe !== "object" || parsedRecipe === null) {
                throw new Error("Invalid generated recipe response");
            }
            recipeData = parsedRecipe as typeof recipeData;
        } catch {
            console.error("Failed to parse Gemini response:", text);
            throw new Error("Failed to generate recipe. Please try again.");
        }

        // FORCE the title to be our normalized version
        recipeData.title = normalizedTitle;
        recipeData.description = typeof recipeData.description === "string" ? recipeData.description : "";
        recipeData.ingredients = Array.isArray(recipeData.ingredients) ? recipeData.ingredients : [];
        recipeData.instructions = Array.isArray(recipeData.instructions) ? recipeData.instructions : [];
        recipeData.tips = Array.isArray(recipeData.tips) ? recipeData.tips : [];
        recipeData.substitutions = Array.isArray(recipeData.substitutions) ? recipeData.substitutions : [];

        // Validate and sanitize category
        const validCategories = [
            "breakfast",
            "lunch",
            "dinner",
            "snack",
            "dessert",
        ];
        const category = validCategories.includes(
            recipeData.category?.toLowerCase() ?? ""
            )
            ? (recipeData.category?.toLowerCase() ?? "dinner")
            : "dinner";

        // Validate and sanitize cuisine
        const validCuisines = [
            "italian",
            "chinese",
            "mexican",
            "indian",
            "american",
            "thai",
            "japanese",
            "mediterranean",
            "french",
            "korean",
            "vietnamese",
            "spanish",
            "greek",
            "turkish",
            "moroccan",
            "brazilian",
            "caribbean",
            "middle-eastern",
            "british",
            "german",
            "portuguese",
            "other",
        ];
        const cuisine = validCuisines.includes(
            recipeData.cuisine?.toLowerCase() ?? "")
            ? (recipeData.cuisine?.toLowerCase() ?? "other")
            : "other";


        // Step 3: Fetch image from Unsplash
        console.log("🖼️ Fetching image from Unsplash...");
        const imageUrl = await fetchRecipeImage(normalizedTitle);


        //Step4: Save Generated recipe to database
        const strapiRecipeData = {
        data: {
            title: normalizedTitle,
            description: recipeData.description,
            cuisine,
            category,
            ingredients: recipeData.ingredients,
            instructions: recipeData.instructions,
            prepTime: Number(recipeData.prepTime),
            cookTime: Number(recipeData.cookTime),
            servings: Number(recipeData.servings),
            nutrition: recipeData.nutrition,
            tips: recipeData.tips,
            substitutions: recipeData.substitutions,
            imageUrl: imageUrl || "",
            isPublic: true,
            },
        };

        console.log(
        "📤 Saving new recipe to database with title:",
        normalizedTitle
        );

        const createRecipeResponse = await fetch(`${STRAPI_URL}/api/recipes`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${STRAPI_API_TOKEN}`,
            },
            body: JSON.stringify(strapiRecipeData),
        });

        if (!createRecipeResponse.ok) {
            const errorText = await createRecipeResponse.text();
            console.error("❌ STRAPI CREATE RECIPE FAILED");
            console.error("Status:", createRecipeResponse.status);
            console.error("Response:", errorText);
            console.error("Data sent to Strapi:", JSON.stringify(strapiRecipeData, null, 2));

            console.error("❌ Failed to save recipe:", errorText);
            throw new Error("Failed to save recipe to database");
        }

        const createdRecipe: StrapiEntityResponse<{ id: number }> = await createRecipeResponse.json() as StrapiEntityResponse<{ id: number }>;
        console.log("✅ Recipe saved to database:", createdRecipe.data.id);

        return {
            success: true,
            recipe: {
                ...recipeData,
                title: normalizedTitle,
                category,
                cuisine,
                imageUrl: imageUrl || "",
                prepTime: Number(recipeData.prepTime),
                cookTime: Number(recipeData.cookTime),
                servings: Number(recipeData.servings),
            },
            recipeId: createdRecipe.data.id,
            isSaved: false,
            fromDatabase: false,
            recommendationsLimit: isPro ? "unlimited" : 5,
            isPro,
            message: "Recipe generated and saved successfully!",
        };

    } catch (err) {
        const error = err as Error;
        console.error("Error in getorGenerateRecipe: ",error); 
        throw new Error(error.message|| "failed to load recipe");
    }
}

//Save Recipe to user's collection(bookMark)
export async function saveRecipeToCollection(formData: FormData): Promise<
  | { success: true; alreadySaved: true; message: string }
  | { success: true; alreadySaved: false; savedRecipe: SavedRecipeRelation; message: string }
> {
    try {
        const user = await checkUser() ; 
        if(!user){
            throw new Error("User not Authenticated");
        }

        const recipeId = formData.get("recipeId");
        if (typeof recipeId !== "string") throw new Error("Recipe ID is requried");
        if(!recipeId){
            throw new Error("Recipe ID is requried"); 
        }

        //check if already saved 
        const existingResponse = await fetch(
            `${STRAPI_URL}/api/saved-recipes?filters[user][id][$eq]=${user.id}&filters[recipe][id][$eq]=${recipeId}`,
            {
                headers:{
                    Authorization:`Bearer ${STRAPI_API_TOKEN}`,
                },
                cache:"no-store",
            }
        );

        if(existingResponse.ok){
            const existingData: StrapiCollectionResponse<SavedRecipeRelation> = await existingResponse.json() as StrapiCollectionResponse<SavedRecipeRelation>; 
            if(existingData.data && existingData.data.length>0){
                return{
                    success:true,
                    alreadySaved :true,
                    message:"Recipe is already in you collection"
                }
            }
        }

        //Create Saved Recipe Relation 
        const savedResponse = await fetch(
            `${STRAPI_URL}/api/saved-recipes`,{
                method:"POST",
                headers:{
                    "Content-Type": "application/json",
                    Authorization:`Bearer ${STRAPI_API_TOKEN}`,
                },
                body:JSON.stringify({
                    data:{
                        user:user.id,
                        recipe:recipeId,
                        savedAt: new Date().toISOString(),
                    },
                }),
            }
        );

        if(!savedResponse.ok){
            const errorText = await savedResponse.text() ; 
            console.error("Failed to save recipe: ", errorText); 
            throw new Error("Failed to save recipe to collection")
        }

        const savedRecipe: StrapiEntityResponse<SavedRecipeRelation> = await savedResponse.json() as StrapiEntityResponse<SavedRecipeRelation>; 
        return{
            success:true, 
            alreadySaved: false,
            savedRecipe:savedRecipe.data,
            message:"Recipe saved to your collection! "
        };



    } catch (err){
        const error = err as Error; 
        console.error("Error in saving recipe to collection: ",error); 
        throw new Error(error.message || "Failed to save recipe")
    }
}

//Remove recipe from user's collection(Remove BookMark)
export async function removeRecipeFromCollection(formData: FormData): Promise<{ success: true; message: string }> {
    try {
        const user = await checkUser() ; 
        if(!user){
            throw new Error("User not Authenticated");
        }

        const recipeId = formData.get("recipeId");
        if (typeof recipeId !== "string") throw new Error("Recipe ID is requried");
        if(!recipeId){
            throw new Error("Recipe ID is requried"); 
        }
        //check if saved 
        const searchResponse = await fetch(
            `${STRAPI_URL}/api/saved-recipes?filters[user][id][$eq]=${user.id}&filters[recipe][id][$eq]=${recipeId}`,
            {
                headers:{
                    Authorization:`Bearer ${STRAPI_API_TOKEN}`,
                },
                cache:"no-store",
            }
        );

        if(!searchResponse.ok){
            throw new Error("Failed to find saved Recipe")
        }

        const searchData: StrapiCollectionResponse<SavedRecipeRelation> = await searchResponse.json() as StrapiCollectionResponse<SavedRecipeRelation>; 

        if(!searchData.data || searchData.data.length==0){
            return {
                success:true,
                message:"Recipe was not in your collection"
            }
        }

        //delete saved recipe relation 
        const savedRecipeId = searchData.data[0].id; 
        const deleteResponse = await fetch(
            `${STRAPI_URL}/api/saved-recipes/${savedRecipeId}`,
            {
                method:"DELETE",
                headers:{
                    Authorization: `Bearer ${STRAPI_API_TOKEN}`,
                },
            }
        )

        if(!deleteResponse.ok){
            throw new Error("Failed to remove recipe from collection"); 
        }

        return {
            success:true, 
            message: "Recipe remvoed from your collection"
        }
        

        
    } catch (err) {
        const error = err as Error; 
        console.error("Error in deleting recipe from collection: ",error); 
        throw new Error(error.message || "Failed to delete recipe")
    }
}

//Get user's saved recipes
export async function getSavedRecipes(): Promise<{ success: true; recipes: Recipe[]; count: number }> {
    try{
        const user = await checkUser() ; 
        if(!user){
            throw new Error("User not authenticated"); 
        }

        //fetch saved recipes with populated recipe data
        const response = await fetch(
            `${STRAPI_URL}/api/saved-recipes?filters[user][id][$eq]=${user.id}&populate[recipe][populate]=*&sort=savedAt:desc`,
            {
                headers:{
                    Authorization:`Bearer ${STRAPI_API_TOKEN}`,
                },
                cache:"no-store"
            },
        );

        if(!response.ok){
            throw new Error("Failed to fetch saved recipes");
        }

        const data: StrapiCollectionResponse<SavedRecipeRelation> = await response.json() as StrapiCollectionResponse<SavedRecipeRelation>; 

        //Extract recipes from saved-recipes relations
        const recipes = data.data
            .map((savedRecipe)=>savedRecipe.recipe)
            .filter(Boolean); //Remove any null recipes

        return {
            success:true,
            recipes,
            count:recipes.length,
        }

    }catch (err){
        const error = err as Error; 
        console.error("Error fetching saved recipes:",error); 
        throw new Error(error.message || "Failed to load saved recipes"); 
    }
}
