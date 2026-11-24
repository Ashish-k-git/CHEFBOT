"use client";

import { getMealsByAreas} from "@/actions/mealdb.actions";
import { useParams } from "next/navigation";
import RecipeGrid from "@/components/RecipeGrid";

export default function CuisineRecipesPage(){
    const params = useParams(); 
    const cuisine = typeof params.cuisine === "string" ? params.cuisine : "";

    return(
        <RecipeGrid
            type="cuisine"
            value = {cuisine}
            fetchAction = {getMealsByAreas}
            backLink="/dashboard"
        />
    )
}