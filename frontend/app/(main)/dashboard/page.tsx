import { getAreas, getCategories, getRecipeofTheDay } from '@/actions/mealdb.actions'
import { Flame ,Globe ,ArrowRight} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { getCategoryEmoji,getCountryFlag } from '@/lib/data';
import React from 'react'


async function DashboardPage() {
    const recipeData = await getRecipeofTheDay(); 

    const categoriesData = await getCategories(); 
    const areaData = await getAreas() ; 
    

    const recipeOfTheDay = recipeData?.success ? recipeData.recipe : undefined; 
    const categories= categoriesData?.categories || [];
    const areas = areaData?.areas ||[]; 
    console.log(areas)

    return (
        <div className="min-h-screen bg-stone-50 py-16 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="mb-5">
                    <h1 className="text-5xl md:text-7xl font-bold text-stone-900 mb-4 tracking-tight leading-tight">
                        Fresh Recipies,Served Daily 🔥
                    </h1>
                    <p className="text-xl text-stone-600 font-light max-w-2xl">
                        Discover thousands of recipies from around the world. Cook, Create and Savor
                    </p>
                </div>
                {/*Recipe of the day*/}
                {recipeOfTheDay && (
                    <section className="mb-24 relative">
                        <div className="flex items-center gap-2 mb-6">
                          <Flame className="w-6 h-6 text-orange-600"/> 
                          <h2 className="text-3xl font-serif font-bold text-stone-900">
                            Recipe of the Day
                          </h2> 
                        </div>
                        
                        <Link
                            href={`/recipe?cook=${encodeURIComponent(
                                recipeOfTheDay.strMeal
                            )}`}
                        >
                            <div className="relative bg-white border-2 border-stone-900 overflow-hidden hover:border-orange-600 hover:shadow-lg transition-all duration-300 group cursor-pointer">
                                <div className="grid md:grid-cols-2 gap-0">
                                    <div className="relative aspect-4/3 md:aspect-auto border-b-2 md:border-b-0 md:border-r-2 border-stone-200">
                                        <Image
                                            src={recipeOfTheDay.strMealThumb}
                                            alt={recipeOfTheDay.strMeal}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>

                                <div className="p-8 md:p-12 flex flex-col justify-center">
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        <Badge
                                            variant="outline"
                                            className="border-2 border-orange-600 text-orange-700 bg-orange-50 font-bold"
                                        >
                                            {recipeOfTheDay.strCategory}
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className="border-2 border-stone-900 text-stone-700 bg-stone-50 font-bold"
                                        >
                                            <Globe className="w-3 h-3 mr-1" />
                                            {recipeOfTheDay.strArea || recipeOfTheDay.strCountry }
                                        </Badge>
                                        <h3 className="text-4xl md:text-5xl font-bold text-stone-900 mb-4 group-hover:text-orange-600 transition-colors leading-tight">
                                        {recipeOfTheDay.strMeal}
                                        </h3>

                                        <p className="text-stone-600 mb-6 line-clamp-3 font-light text-lg">
                                        {recipeOfTheDay.strInstructions?.substring(0, 200)}...
                                        </p>

                                        {recipeOfTheDay.strTags && (
                                        <div className="flex flex-wrap gap-2 mb-6">
                                            {recipeOfTheDay.strTags
                                            .split(",")
                                            .slice(0, 3)
                                            .map((tag:string, i:number) => (
                                                <Badge
                                                key={i}
                                                variant="secondary"
                                                className="bg-stone-100 text-stone-600 border border-stone-200 font-mono text-xs uppercase"
                                                >
                                                {tag.trim()}
                                                </Badge>
                                            ))}
                                        </div>
                                        )}

                                        <Button className="w-fit bg-orange-600 hover:bg-orange-700 text-white font-bold border-2 border-orange-700 px-6 py-5">
                                        Start Cooking <ArrowRight className="w-5 h-5 ml-2" />
                                        </Button>
                                    </div>
                                </div>

                                </div>
                            </div>
                        </Link>
                    </section>
                )}

                {/* Browse Categories */}
                <section className="mb-24">
                    <div className="mb-8">
                        <h2 className="text-4xl md:text-5xl font-bold text-stone-900 mb-2">
                        Browse by Category
                        </h2>
                        <p className="text-stone-600 text-lg font-light">
                        Find recipes that match your mood
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        {categories.map((category:{strCategory:string}) => (
                        <Link
                            key={category.strCategory}
                            href={`/recipes/category/${category.strCategory.toLowerCase()}`}
                        >
                            <div className="bg-white p-6 border-2 border-stone-200 hover:border-orange-600 hover:shadow-lg transition-all text-center group cursor-pointer">
                            <div className="text-4xl mb-3">
                                {getCategoryEmoji(category.strCategory)}
                            </div>
                            <h3 className="font-bold text-stone-900 group-hover:text-orange-600 transition-colors text-sm">
                                {category.strCategory}
                            </h3>
                            </div>
                        </Link>
                        ))}
                    </div>
                </section>

                {/* Browse Crusines */}
                <section className="pb-12">
                <div className="mb-8">
                    <h2 className="text-4xl md:text-5xl font-bold text-stone-900 mb-2">
                    Explore World Cuisines
                    </h2>
                    <p className="text-stone-600 text-lg font-light">
                    Travel the globe through food
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {areas.map((area) => (
                    <Link
                        key={area.strCountry}
                        href={`/recipes/cuisine/${area.strArea
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                    >  
                        <div className="bg-stone-50 p-5 border-2 border-stone-200 hover:border-orange-600 hover:shadow-lg transition-all group cursor-pointer">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">
                            {getCountryFlag(area.strArea)}
                            </span>
                            <span className="font-bold text-stone-900 group-hover:text-orange-600 transition-colors text-sm">
                            {area.strArea}
                            </span>
                        </div>
                        </div>
                    </Link>

                    ))}
                    
                </div>
                </section>


            </div>
        </div>
    )
}

export default DashboardPage
