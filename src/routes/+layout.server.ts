import type { LayoutServerLoad } from "./$types";
import { error, isRedirect, redirect } from "@sveltejs/kit";
import db from "$lib/server/db/instance";
import { logger } from "$lib/server/logger";

export const load: LayoutServerLoad = async (event) => {
    try {
        // const vault = (await db.findVault(getCurrentDay())).map((d) => d.day);

        const {
            data: { user },
        } = await event.locals.supabase.auth.getUser();

        if (!user) return { user: null };

        // Get full user data from database
        const profile = await db.findUserById(user.id);
        if (!profile?.username && event.url.pathname !== "/profile/setup") {
            redirect(303, "/profile/setup");
        }
        return { user: profile };
    } catch (err) {
        if (isRedirect(err)) throw err;
        logger.error("failed to load layout", { error: err });
        error(500, "internal server error");
    }
};
