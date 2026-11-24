import arcjet,{tokenBucket ,shield,detectBot} from "@arcjet/next"



export const aj = arcjet({
    key: process.env.NEXT_PUBLIC_ARCJET_KEY!,
    rules: [
        // Shield protects against common web attacks e.g. SQL injection
        shield({ mode: "LIVE" }),
        // Block all automated clients — bots inflate AI costs
        detectBot({
        mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
        allow: [
            "CATEGORY:SEARCH_ENGINE",
            "CATEGORY:PREVIEW",
            
        ], // Block all bots. See https://arcjet.com/bot-list
        }),
    ]

})


//free tier pantry scan limits(10 scans/month)
export const freePantryScans = aj.withRule(
    tokenBucket({
        mode:"LIVE", //DRY RUN for development
        characteristics:["userId"],
        refillRate: 10,
        interval:"30d",
        capacity:10,
    })
)


//free tier meal recommendations (5 recommendations/month)
export const freeMealRecommendations = aj.withRule(
    tokenBucket({
        mode:"LIVE", //DRY RUN for development
        characteristics:["userId"],
        refillRate: 5,
        interval:"30d",
        capacity:5,
    })
)



//pro tier - effectively unlimited (very high limits) around 1000 requests per day

export const proTierLimit = aj.withRule(
    tokenBucket({
        mode:"LIVE", //DRY RUN for development
        characteristics:["userId"],
        refillRate:1000,
        interval:"1d",
        capacity:1000,
    })
)

