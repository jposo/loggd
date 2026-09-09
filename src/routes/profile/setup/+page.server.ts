import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import db from "$lib/server/db/instance";
import { z } from "zod";
import { logger } from "$lib/server/logger";

const Setup = z.object({
    username: z
        .string()
        .regex(/^[a-zA-Z0-9_-]+$/)
        .min(3)
        .max(20),
});

export const load: PageServerLoad = async (event) => {
    const {
        data: { user },
    } = await event.locals.supabase.auth.getUser();

    // not logged in at all
    if (!user) redirect(303, "/");

    // already has a username, no need to be here
    const profile = await db.findUserById(user.id);
    if (profile?.username) redirect(303, "/");

    return {};
};

export const actions: Actions = {
    default: async (event) => {
        try {
            const {
                data: { user },
            } = await event.locals.supabase.auth.getUser();
            if (!user) redirect(303, "/");

            const form = await event.request.formData();
            const result = Setup.safeParse(Object.fromEntries(form));

            if (!result.success) {
                return fail(400, { message: "invalid input" });
            }

            const data = result.data;

            const existingUsernameUser = await db.findUserByUsername(
                data.username,
            );
            if (existingUsernameUser) {
                return fail(400, { message: "username already in use" });
            }

            const profile = await db.updateUser(user.id, {
                username: data.username,
            });

            if (!user) {
                logger.error("failed to set username", {
                    username: profile.username,
                });
                return fail(500, { message: "failed to create account" });
            }

            logger.info("username set successfully", {
                userId: profile.id,
                username: profile.username,
            });
            return { success: true, message: "account created successfully" };
        } catch (err) {
            logger.error("failed to create account", { error: err });
            return fail(500, { message: "internal server error" });
        }
    },
};
