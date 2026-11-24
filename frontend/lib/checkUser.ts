import { auth, currentUser } from "@clerk/nextjs/server";
import type { StrapiUser } from "@/lib/types";

const STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

interface StrapiRole {
  id: number;
  type: string;
  name: string;
}

interface StrapiRolesResponse {
  roles: StrapiRole[];
}

export const checkUser = async (): Promise<StrapiUser | null> => {
  const user = await currentUser();

  // console.log("Strapi URL:", STRAPI_URL);
  // console.log("Token exists:", !!STRAPI_API_TOKEN);

  if (!user) {
    console.log("No User found");
    return null;
  }
  console.log(user)
  console.log(user.id);

  if (!STRAPI_API_TOKEN) {
    console.error("❌ STRAPI_API_TOKEN is missing in .env.local");
    return null;
  }

  // Check if user has Pro plan
  const { has } = await auth();
  const subscriptionTier = has({ plan: "pro" }) ? "pro" : "free";

  try {
    // Check if user exists in Strapi
    const existingUserResponse = await fetch(
      `${STRAPI_URL}/api/users?filters[clerkId][$eq]=${user.id}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (!existingUserResponse.ok) {
      const errorText = await existingUserResponse.text();

      console.error("Strapi error response:", errorText);

      return null;
    }

    const existingUserData: StrapiUser[] = await existingUserResponse.json() as StrapiUser[];

    console.log("Strapi user response:", existingUserData);

    if (existingUserData.length > 0) {
      const existingUser = existingUserData[0];

      // Update subscription tier if changed
      if (existingUser.subscriptionTier !== subscriptionTier) {
        await fetch(`${STRAPI_URL}/api/users/${existingUser.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${STRAPI_API_TOKEN}`,
          },
          body: JSON.stringify({ subscriptionTier }),
        });
      }

      return {
        ...existingUser,
        subscriptionTier,
      };
    }

    // Get authenticated role
    const rolesResponse = await fetch(
      `${STRAPI_URL}/api/users-permissions/roles`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
      }
    );

    const rolesData: StrapiRolesResponse = await rolesResponse.json() as StrapiRolesResponse;

    const authenticatedRole = rolesData.roles.find(
      (role) => role.type === "authenticated"
    );

    if (!authenticatedRole) {
      console.error("❌ Authenticated role not found");
      return null;
    }

    // Create new user
    const userData = {
      username:
        user.username || user.emailAddresses[0].emailAddress.split("@")[0],
      email: user.emailAddresses[0].emailAddress,
      password: `clerk_managed_${user.id}_${Date.now()}`,
      confirmed: true,
      blocked: false,
      role: authenticatedRole.id,
      clerkId: user.id,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      imageUrl: user.imageUrl || "",
      subscriptionTier,
    };

    const newUserResponse = await fetch(`${STRAPI_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify(userData),
    });

    if (!newUserResponse.ok) {
      const errorText = await newUserResponse.text();

      console.error("❌ Error creating user:", errorText);

      return null;
    }

    const newUser: StrapiUser = await newUserResponse.json() as StrapiUser;

    return newUser;
  } catch (error) {
    console.error("❌ Error in checkUser:", error);

    return null;
  }
};