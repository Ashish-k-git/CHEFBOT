"use server"; 
import type { MealDbArea, MealDbCategory, MealDbFullMeal, MealDbMealSummary } from "@/lib/types";

const MEALDB_BASE = "https://www.themealdb.com/api/json/v1/1"

export async function getRecipeofTheDay(): Promise<{ success: true; recipe: MealDbFullMeal } | { success: false; message: string }> {
    try {
        const response = await fetch(`${MEALDB_BASE}/random.php`,{
            next :{revalidate:86400} //cache for 24 hours
        })
        if(!response.ok){
            throw new Error("Failed to fetch recipe of the day form MEALDB")
        }
        const data: { meals: MealDbFullMeal[] } = await response.json() as { meals: MealDbFullMeal[] };
        if (!data.meals?.[0]) throw new Error("No recipe returned by MealDB");
        return {
            success:true,
            recipe: data.meals[0]
        }
    } catch (error) {
        const err = error as Error;
        console.error("Error fetching recipe of the day:",err); 
        throw new Error(err.message||"Failed to load recipe")
    }
}

export async function getCategories(): Promise<{ success: true; categories: MealDbCategory[] }> {
    try {
        const response = await fetch(`${MEALDB_BASE}/list.php?c=list`,{
            next :{revalidate:604800} //cache for 1Week
        })
        if(!response.ok){
            throw new Error("Failed to fetch list of categories form MEALDB")
        }
        const data: { meals: MealDbCategory[] } = await response.json() as { meals: MealDbCategory[] };
        return {
            success:true,
            categories: data.meals||[]
        }
    } catch (error) {
        const err = error as Error;
        console.error("Error fetching list of categories:",err); 
        throw new Error(err.message||"Failed to load list of categories")
    }
}

export async function getAreas(): Promise<{ success: true; areas: MealDbArea[] }> {
    try {
        const response = await fetch(`${MEALDB_BASE}/list.php?a=list`,{
            next :{revalidate:604800} //cache for 1Week
        })
        if(!response.ok){
            throw new Error("Failed to fetch list of areas form MEALDB")
        }
        const data: { meals: MealDbArea[] } = await response.json() as { meals: MealDbArea[] };
        return {
            success:true,
            areas: data.meals||[]
        }
    } catch (error) {
        const err = error as Error;
        console.error("Error fetching list of areas:",err); 
        throw new Error(err.message||"Failed to load list of areas")
    }
}

export async function getMealsByCategory(category:string): Promise<{ success: true; meals: MealDbMealSummary[]; category: string }> {
    try {
        const response = await fetch(`${MEALDB_BASE}/filter.php?c=${category}`,{
            next :{revalidate:86400} //cache for 24 hours
        })
        if(!response.ok){
            throw new Error("Failed to fetch requested category form MEALDB")
        }
        const data: { meals: MealDbMealSummary[] | null } = await response.json() as { meals: MealDbMealSummary[] | null };
        return {
            success:true,
            meals: data.meals||[],
            category
        }
    } catch (error) {
        const err = error as Error;
        console.error("Error fetching requested category:",err); 
        throw new Error(err.message||"Failed to load the requested category")
    }
}

export async function getMealsByAreas(area:string): Promise<{ success: true; meals: MealDbMealSummary[]; area: string }> {
   try {
        const response = await fetch(`${MEALDB_BASE}/filter.php?a=${area}`,{
            next :{revalidate:86400} //cache for 24 hours
        })
        if(!response.ok){
            throw new Error("Failed to fetch requested area form MEALDB")
        }
        const data: { meals: MealDbMealSummary[] | null } = await response.json() as { meals: MealDbMealSummary[] | null };
        return {
            success:true,
            meals: data.meals||[],
            area
        }
    } catch (error) {
        const err = error as Error;
        console.error("Error fetching requested area:",err); 
        throw new Error(err.message||"Failed to load the requested area")
    }
}

