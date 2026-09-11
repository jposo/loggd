import { fail, error, type ServerLoadEvent, isRedirect } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import db from "$lib/server/db/instance";
import { requireAuth, requireAuthWithRoles } from "$lib/server/auth/middleware";
import { z } from "zod";
import { get } from "$lib/server/gd/client";
import type { InsertLevel, InsertProgress } from "$lib/server/db/schema";
import ProgressUpdate from "$lib/server/schemas/ProgressUpdate";
import { process } from "$lib/server/schemas/shared";
import { logger } from "$lib/server/logger";

const UpdateLevelForm = z.object({
    releaseDate: z.preprocess(
        process,
        z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .nullable()
            .optional(),
    ),
    videoUrl: z.preprocess(process, z.url().nullable().optional()),
});

const HideReviewForm = z.object({
    reviewId: z.coerce.number(),
});

export const load: PageServerLoad = async ({
    params,
    parent,
}: ServerLoadEvent) => {
    const { user } = await parent();
    try {
        const id = parseInt(params.id!);
        if (Number.isNaN(id)) {
            error(400, "invalid level id");
        }
        const search = await get("levels").search(id);
        if (!search) {
            logger.warn("level not found", { id });
            error(404, "level not found");
        }
        const result = search.result[0];
        const progress = (await db.accrueProgressByLevelId(result.id))[0];
        const levelDetails = await db.findLevelByIdSimple(id);

        const level = {
            id: result.id,
            name: result.name,
            publisher: result.creator?.username,
            description: result.description,
            difficulty: result.difficulty,
            releaseDate: levelDetails?.releaseDate,
            coins: result.coins.count,
            twoPlayer: result.twoPlayer,
            rating: result.rating,
            length: result.length,
            videoUrl: levelDetails?.videoUrl,
            songId: result.song?.id,
            songTitle: result.song?.name,
            songArtist: result.song?.artist.name,
            progressCount: progress?.progressCount ?? 0,
            averageScore: progress?.averageScore ?? 0,
            completionCount: progress?.completionCount ?? 0,
            reviewCount: progress?.reviewCount ?? 0,
            reviews: progress?.reviews ?? [],
        };
        if (!user) {
            return { level };
        }
        const userProgress = await db.findUserProgressByLevelId(user.id, id);
        return { level, progress: userProgress };
    } catch (err) {
        logger.error("internal server error", { err });
        error(500, "internal server error");
    }
};

export const actions: Actions = {
    updateProgress: async (event) => {
        const user = await requireAuth(event);

        const levelId = parseInt(event.params.id!);

        if (Number.isNaN(levelId)) {
            return fail(400, { message: "invalid level id" });
        }
        // TODO: check here if level id exists (maybe)

        const form = await event.request.formData();
        const entries = {
            userId: user.id,
            levelId,
            ...Object.fromEntries(form),
        };

        const result = ProgressUpdate.safeParse(entries);

        if (!result.success) {
            return fail(400, {
                message: "invalid input",
                error: result.error.message,
            });
        }

        const existingProgress = await db.findUserProgressByLevelId(
            user.id,
            levelId,
        );
        const data: InsertProgress = { ...result.data };

        if (data.status && data.status !== "completed") {
            data.listPlacement = null;
        }

        if (data.status === "completed" && !existingProgress?.listPlacement) {
            const activeCount = await db.countActiveCompleted(user.id);

            if (activeCount >= 25) {
                // Keep completion valid but leave it inactive until the user promotes it.
                data.listPlacement = null;
            } else {
                const placement = await db.findNextActiveListPlacement(user.id);
                data.listPlacement = placement.toString();
            }
        }

        try {
            const result = await db.upsertUserProgress(data);

            if (result) {
                logger.info("sucessfully updated progress", { result });
                return {
                    success: true,
                    message: "sucessfully updated progress",
                };
            } else {
                logger.error("failed to update progress", { data, result });
                return fail(422, { message: "failed to update progress" });
            }
        } catch (err) {
            if (isRedirect(err)) throw err;
            console.error("RAW error", err); // temp to check if deno deploy catches this
            logger.error("error updating user progress", { err });
            return fail(500, { message: "internal server error" });
        }
    },
    updateLevel: async (event) => {
        const user = await requireAuthWithRoles(event, ["admin"]);

        const levelId = parseInt(event.params.id!);

        if (Number.isNaN(levelId)) {
            return fail(400, { message: "invalid level id" });
        }

        const form = await event.request.formData();
        const result = UpdateLevelForm.safeParse(Object.fromEntries(form));

        if (!result.success) {
            return fail(400, {
                message: "invalid input",
                error: result.error.message,
            });
        }

        const data = {
            ...result.data,
            id: levelId,
            updatedBy: user.id,
        } satisfies InsertLevel;

        try {
            const result = await db.updateLevel(data);

            if (result) {
                logger.info(
                    `user ${user.username} (id:${user.id}) updated level ${levelId}`,
                );
                return { success: true, message: "sucessfully updated level" };
            } else {
                logger.error("failed to update level", { data });
                return fail(422, { message: "failed to update level" });
            }
        } catch (err) {
            logger.error("internal server error in 'updateLevel' action", {
                err,
            });
            return fail(500, { message: "internal server error" });
        }
    },
    hideReview: async (event) => {
        const user = await requireAuthWithRoles(event, ["admin"]);

        const form = await event.request.formData();
        const result = HideReviewForm.safeParse(Object.fromEntries(form));

        if (!result.success) {
            return fail(400, {
                message: "invalid input",
                error: result.error.message,
            });
        }

        const data = result.data;

        try {
            const result = await db.hideReview(data.reviewId);
            if (result) {
                logger.info(
                    `user ${user.username} (id:${user.id}) hid review ${data.reviewId}`,
                );
                return { success: true, message: "sucessfully hidden review" };
            } else {
                return fail(422, { message: "failed to hide review" });
            }
        } catch (err) {
            logger.error("internal server error in 'hideReview' action", {
                err,
            });
            return fail(500, { message: "internal server error" });
        }
    },
};
