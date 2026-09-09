import type { PageServerLoad, Actions } from "./$types";
import { requireAuth } from "$lib/server/auth/middleware";
import db from "$lib/server/db/instance";
import { fail } from "@sveltejs/kit";
import { z } from "zod";
import { logger } from "$lib/server/logger";

const UpdateUser = z.object({
    bio: z.string().max(200).nullable(),
});

export const load: PageServerLoad = async (event) => {
    const user = await requireAuth(event);

    return { user };
};

export const actions: Actions = {
    default: async (event) => {
        const user = await requireAuth(event);
        try {
            const form = await event.request.formData();
            const result = UpdateUser.safeParse(Object.fromEntries(form));

            if (!result.success) {
                return fail(400, {
                    message: "invalid input",
                    error: z.treeifyError(result.error),
                });
            }

            const data = result.data;

            const updatedUser = await db.updateUser(user.id, {
                bio: data.bio,
            });

            if (!updatedUser) {
                return fail(500, { message: "failed to update profile" });
            }

            logger.info("profile info updated", { user: updatedUser });
            return {
                success: true,
                message: "profile updated successfully",
            };
        } catch (error) {
            logger.error("profile update error", { error });
            return fail(500, { message: "internal server error" });
        }
    },
};
