export type SubscriptionTier = "free" | "pro";

export interface StrapiUser {
  id: number;
  documentId?: string;
  username: string;
  email: string;
  clerkId: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  subscriptionTier: SubscriptionTier;
}

export interface PantryItem {
  id?: number;
  documentId?: string;
  name: string;
  quantity: string;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PantryIngredient {
  name: string;
  quantity: string;
  confidence?: number;
}

export interface RecipeIngredient {
  item: string;
  amount: string;
  category?: string;
}

export interface RecipeInstruction {
  step: number;
  title: string;
  instruction: string;
  tip?: string | null;
}

export interface RecipeNutrition {
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
  fiber?: string;
  sugar?: string;
}

export interface RecipeSubstitution {
  original: string;
  alternatives: string[];
}

export interface Recipe {
  id?: number;
  documentId?: string;
  title: string;
  description: string;
  cuisine: string;
  category: string;
  imageUrl?: string;
  ingredients: RecipeIngredient[];
  instructions: RecipeInstruction[];
  prepTime: number;
  cookTime: number;
  servings: number;
  nutrition?: RecipeNutrition;
  tips?: string[];
  substitutions?: RecipeSubstitution[];
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PantryRecipeSuggestion {
  title: string;
  description: string;
  matchPercentage: number;
  missingIngredients: string[];
  category: string;
  cuisine: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  imageUrl?: string;
}

export interface MealDbMealSummary {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
}

export interface MealDbCategory {
  strCategory: string;
}

export interface MealDbArea {
  strArea: string;
  strCountry?: string;
}

export interface MealDbFullMeal extends MealDbMealSummary {
  strCategory: string;
  strArea: string;
  strCountry?: string;
  strInstructions: string;
  strTags?: string | null;
  [key: `strIngredient${number}`]: string | null | undefined;
  [key: `strMeasure${number}`]: string | null | undefined;
}

export interface StrapiCollectionResponse<T> {
  data: T[];
  meta?: unknown;
}

export interface StrapiEntityResponse<T> {
  data: T;
  meta?: unknown;
}

export interface ActionErrorResult {
  success: false;
  message: string;
}

export interface ScanPantrySuccess {
  success: true;
  ingredients: PantryIngredient[];
  scanLimit: "unlimited" | number;
  message: string;
}

export interface PantryItemsResult {
  success: true;
  items: PantryItem[];
  scansLimit: "unlimited" | number;
}

export interface PantryRecipeResult {
  success: true;
  recipes: PantryRecipeSuggestion[];
  ingredientsUsed: string;
  recommendationsLimit: "unlimited" | number;
  message: string;
}

export interface GetRecipeResult {
  success: true;
  recipe: Recipe;
  recipeId: number;
  isSaved: boolean;
  fromDatabase: boolean;
  isPro: boolean;
  recommendationsLimit?: "unlimited" | number;
  message: string;
}

export interface SavedRecipeRelation {
  id: number;
  documentId?: string;
  recipe: Recipe;
  savedAt?: string;
}
