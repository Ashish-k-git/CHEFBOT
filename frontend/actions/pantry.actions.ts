"use server"
import { freePantryScans, proTierLimit } from "@/lib/arcjet";
import { checkUser } from "@/lib/checkUser";
import { request } from "@arcjet/next";
import { GoogleGenAI } from "@google/genai";
import type { PantryIngredient, PantryItem, StrapiCollectionResponse, StrapiEntityResponse } from "@/lib/types";

const STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ||""

const genAI = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
});

//Scan image with Gemini Vision
export async function scanPantryImage(formData :FormData): Promise<{ success: true; ingredients: PantryIngredient[]; scanLimit: "unlimited" | number; message: string }> {
    console.log("API KEY EXISTS:", !!process.env.GEMINI_API_KEY);
    try {
        const user = await checkUser(); 
        if(!user){
            throw new Error("User not authenticated")
        }
        
        //check if pro user
        const isPro = user.subscriptionTier==="pro"; 

        //Apply Arject rate limit based on tier 
        const arjectClient = isPro ? proTierLimit:freePantryScans

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

        const imageFile = formData.get("image");
        if(!(imageFile instanceof File)){
            throw new Error("No image porvided");
        }

        //covert image to base64 ; 
        const bytes = await imageFile.arrayBuffer(); 
        const buffer = Buffer.from(bytes);
        const base64Image = buffer.toString("base64")


        const prompt = `
        You are a professional chef and ingredient recognition expert. Analyze this image of a pantry/fridge and identify all visible food ingredients.

        Return ONLY a valid JSON array with this exact structure (no markdown, no explanations):
        [
        {
            "name": "ingredient name",
            "quantity": "estimated quantity with unit",
            "confidence": 0.95
        }
        ]

        Rules:
        - Only identify food ingredients (not containers, utensils, or packaging)
        - Be specific (e.g., "Cheddar Cheese" not just "Cheese")
        - Estimate realistic quantities (e.g., "3 eggs", "1 cup milk", "2 tomatoes")
        - Confidence should be 0.7-1.0 (omit items below 0.7)
        - Maximum 20 items
        - Common pantry staples are acceptable (salt, pepper, oil)
        `; 

        const result = await genAI.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: [
                {
                    parts: [
                        {
                            text: prompt,
                        },
                        {
                            inlineData: {
                                mimeType: imageFile.type,
                                data: base64Image,
                            },
                        },
                    ],
                },
            ],
        });
        const text = result.text ?? "";
        //Parse json respnse
        let ingredients: unknown; 
        try {
            const cleanText = text
                .replace(/```json\n?/g, "")
                .replace(/```\n?/g, "")
                .trim();
            ingredients = JSON.parse(cleanText) as unknown;
        } catch (parsedError) {
            console.error("Failed to parse Gemini response:", text);
            console.log("Parsed Error",parsedError)
            throw new Error("Failed to parse ingredients. Please try again.");
        }
        if (!Array.isArray(ingredients) || ingredients.length === 0) {
            throw new Error(
                "No ingredients detected in the image. Please try a clearer photo."
            );
        }
        const parsedIngredients = ingredients.filter((item): item is PantryIngredient =>
            typeof item === "object" && item !== null &&
            "name" in item && typeof item.name === "string" &&
            "quantity" in item && typeof item.quantity === "string"
        );
        if (parsedIngredients.length === 0) throw new Error("No valid ingredients detected");
        return{
            success:true,
            ingredients:parsedIngredients.slice(0,20),
            scanLimit: isPro? "unlimited":10,
            message:`Found ${ingredients.length} ingredients!`

        }

    } catch (error) {
       const err = error as Error; 
       console.log("Error scanning pantry",err); 
       throw new Error(err.message|| "Failed to scan image")
    }
}

export async function saveToPantry(formData:FormData): Promise<{ success: true; savedItems: PantryItem[]; message: string }> {
    try {
        const user = await checkUser() ; 
        if(!user){
            throw new Error("User not found");
        }

        const ingredientsJson = formData.get("ingredients");
        if (typeof ingredientsJson !== "string") throw new Error("Invalid ingredients data");
        const parsed: unknown = JSON.parse(ingredientsJson);
        if (!Array.isArray(parsed)) throw new Error("Invalid ingredients data");
        const ingredients = parsed.filter((item): item is PantryIngredient =>
            typeof item === "object" && item !== null &&
            "name" in item && typeof item.name === "string" &&
            "quantity" in item && typeof item.quantity === "string"
        );

        if(!ingredients || ingredients.length===0){
            throw new Error("No ingredients to save");
        }

        const savedItems: PantryItem[] = []; 
        for(const ingredient of ingredients){
            const response = await fetch(`${STRAPI_URL}/api/pantry-items`,{
                method:"POST",
                headers:{
                    "Content-Type":"application/json",
                    Authorization:`Bearer ${STRAPI_API_TOKEN}`,
                },
                body:JSON.stringify({
                    data:{
                        name:ingredient.name,
                        quantity:ingredient.quantity,
                        imageUrl: "",
                        owner:user.id
                    }
                })
            })

            if(response.ok){
                const data: StrapiEntityResponse<PantryItem> = await response.json() as StrapiEntityResponse<PantryItem>; 
                savedItems.push(data.data); 
            }
        }

        return {
            success:true,
            savedItems,
            message:`Saved ${savedItems.length} items to your pantry!`
        }

    } catch (error) {
        const err = error as Error
        console.error("Error in saving to pantry : ",err);
        throw new Error(err.message ||"Failed to save items")
    }
}

export async function addPantryItemManually(formData :FormData): Promise<{ success: true; item: PantryItem; message: string }> {
    try {
        const user = await checkUser() ; 
        if(!user){
            throw new Error("User not authenticated");
        }

        const name = formData.get("name"); 
        const quantity = formData.get("quantity")

        if(typeof name !== "string" || typeof quantity !== "string"){
            throw new Error("Name and Quantity are requried");
        }

        const response = await fetch(`${STRAPI_URL}/api/pantry-items`,{
                method:"POST",
                headers:{
                    "Content-Type":"application/json",
                    Authorization:`Bearer ${STRAPI_API_TOKEN}`,
                },
                body:JSON.stringify({
                    data:{
                        name:name.trim(),
                        quantity:quantity.trim(),
                        imageUrl: "",
                        owner:user.id
                    }
                })
            }
        )

        if(!response.ok){
            const errorText = await response.text(); 
            console.error("Failed to add item",errorText); 
            throw new Error("Failed to add item to pantry")
        }

        const data: StrapiEntityResponse<PantryItem> = await response.json() as StrapiEntityResponse<PantryItem>; 


        return{
            success:true,
            item :data.data,
            message:"Item added successfully"
        }

    } catch (error) {
        const err = error as Error ; 
        console.error("Error adding item manually in pantry",err)
        throw new Error(err.message || "Failed to add item"); 
    }
}

export async function getPantryItems(): Promise<{ success: true; items: PantryItem[]; scansLimit: "unlimited" | number }> {
    try {
        const user = await checkUser();
        if (!user) {
        throw new Error("User not authenticated");
        }

        const response = await fetch(
        `${STRAPI_URL}/api/pantry-items?filters[owner][id][$eq]=${user.id}&sort=createdAt:desc`,
        {
            headers: {
            Authorization: `Bearer ${STRAPI_API_TOKEN}`,
            },
            cache: "no-store",
        }
        );

        if (!response.ok) {
        throw new Error("Failed to fetch pantry items");
        }

        const data: StrapiCollectionResponse<PantryItem> = await response.json() as StrapiCollectionResponse<PantryItem>;

        const isPro = user.subscriptionTier === "pro";

        return {
        success: true,
        items: data.data || [],
        scansLimit: isPro ? "unlimited" : 10,
        };
    } catch (error) {
        const err = error as Error;
        console.error("Error fetching pantry:", err);
        throw new Error(err.message || "Failed to load pantry");
    }
}

export async function deletePantryItems(formData:FormData): Promise<{ success: true; message: string }> {
        try {
            const user = await checkUser();
            if (!user) {
            throw new Error("User not authenticated");
            }
            console.log("Print this")
            console.log("Hello",formData)
            const itemId = formData.get("itemId");
            if (typeof itemId !== "string") throw new Error("Item ID is required");

            const response = await fetch(`${STRAPI_URL}/api/pantry-items/${itemId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${STRAPI_API_TOKEN}`,
            },
            });

            if (!response.ok) {
            throw new Error("Failed to delete item");
            }

            return {
            success: true,
            message: "Item removed from pantry",
            };
        } catch (error) {
            const err = error as Error
            console.error("Error deleting item:", err);
            throw new Error(err.message || "Failed to delete item");
        }
}

export async function updatePantryItem(formData:FormData): Promise<{ success: true; item: PantryItem; message: string }> {
    try {
        const user = await checkUser();
        if (!user) {
        throw new Error("User not authenticated");
        }

        const itemId = formData.get("itemId");
        const name = formData.get("name");
        const quantity = formData.get("quantity");
        if (typeof itemId !== "string" || typeof name !== "string" || typeof quantity !== "string") {
            throw new Error("Item ID, name, and quantity are required");
        }

        const response = await fetch(`${STRAPI_URL}/api/pantry-items/${itemId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        body: JSON.stringify({
            data: {
            name,
            quantity,
            },
        }),
        });

        if (!response.ok) {
        throw new Error("Failed to update item");
        }

        const data: StrapiEntityResponse<PantryItem> = await response.json() as StrapiEntityResponse<PantryItem>;

        return {
        success: true,
        item: data.data,
        message: "Item updated successfully",
        };
    } catch (error) {
        const err = error as Error
        console.error("Error updating item:", error);
        throw new Error(err.message || "Failed to update item");
    }
}


