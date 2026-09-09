import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { logger } from "$lib/server/logger";

export const GET: RequestHandler = async (event) => {
    logger.info(`received user creation: ${event.url}`);
    const code = event.url.searchParams.get("code");
    const next = event.url.searchParams.get("next") ?? "/";

    if (code) {
        const { data, error } =
            await event.locals.supabase.auth.exchangeCodeForSession(code);
        logger.info("exchange result:", { user: data.user?.id, error });
    }

    // TODO: redirect to error page
    redirect(303, next);
};
