import type { PageServerLoad, Actions } from "./$types";
import { fail, error } from "@sveltejs/kit";
import db from "$lib/server/db/instance";
import { get } from "$lib/server/gd/client";
import { requireAuth } from "$lib/server/auth/middleware";
import { z } from "zod";
import { logger } from "$lib/server/logger";

const UpdateList = z.object({
    activeList: z
        .string()
        .transform((str, ctx) => {
            try {
                return JSON.parse(str);
            } catch {
                ctx.addIssue({
                    code: "custom",
                    message: "invalid active list payload",
                });
                return z.NEVER;
            }
        })
        .pipe(z.array(z.coerce.number().min(1)).max(25)),
    inactiveList: z
        .string()
        .transform((str, ctx) => {
            try {
                return JSON.parse(str);
            } catch {
                ctx.addIssue({
                    code: "custom",
                    message: "invalid inactive list payload",
                });
                return z.NEVER;
            }
        })
        .pipe(z.array(z.coerce.number().min(1))),
});

export const load: PageServerLoad = async (event) => {
    const username = event.params.username as string;
    const profile = await db.findUserInfoByUsername(username);
    const snapshotAtParam = event.url.searchParams.get("at");
    const parsedSnapshotAt = snapshotAtParam ? new Date(snapshotAtParam) : null;
    const snapshotAt =
        parsedSnapshotAt && !Number.isNaN(parsedSnapshotAt.getTime())
            ? parsedSnapshotAt
            : null;

    if (!profile) {
        error(404, "user not found");
    }

    const snapshot = snapshotAt
        ? await db.findCompletedListSnapshotByUserId(profile.id, snapshotAt)
        : null;

    // retrieve all level IDs
    const listLevelIds = snapshot
        ? snapshot.activeList.map((item) => item.id)
        : profile.list.map((item) => item.id);
    const inactiveLevelIds = snapshot
        ? snapshot.inactiveList.map((item) => item.id)
        : profile.inactiveList.map((item) => item.id);
    // const snapshotActiveIds = snapshot
    //     ? snapshot.activeList.map((item) => item.id)
    //     : [];
    // const snapshotInactiveIds = snapshot
    //     ? snapshot.inactiveList.map((item) => item.id)
    //     : [];
    const recentActivityLevelIds = profile.recentActivity.map(
        (item) => item.levelId,
    );
    const allProgressLevelIds = profile.allProgress.map((item) => item.levelId);
    // store them all in a set to avoid duplicates
    const allIds = new Set([
        ...listLevelIds,
        ...inactiveLevelIds,
        ...recentActivityLevelIds,
        ...allProgressLevelIds,
    ]);

    const allLevels = await get("levels").ids(allIds);

    if (!allLevels) {
        error(500, "failed to fetch levels");
    }

    type Level = {
        name: string;
        publisher: string;
        length: string;
    };

    const levelMap = new Map<number, Level>(
        allLevels.result.map((level) => [
            level.id,
            {
                name: level.name,
                publisher: level.creator?.username ?? "unknown",
                length: level.length,
            },
        ]),
    );
    const fallbackLevel: Level = {
        name: "unknown level",
        publisher: "unknown",
        length: "tiny",
    };
    const enrichedList = profile.list.map((item) => ({
        ...item,
        level: levelMap.get(item.id) || fallbackLevel,
    }));
    const enrichedInactiveList = profile.inactiveList.map((item) => ({
        ...item,
        level: levelMap.get(item.id) || fallbackLevel,
    }));
    const enrichedActivity = profile.recentActivity.map((item) => ({
        ...item,
        level: levelMap.get(item.levelId) || fallbackLevel,
    }));
    const enrichedAllProgress = profile.allProgress.map((item) => ({
        ...item,
        level: levelMap.get(item.levelId) || fallbackLevel,
    }));
    const enrichedSnapshot = snapshot
        ? {
              at: snapshot.at.toISOString(),
              active: snapshot.activeList.map((item) => ({
                  ...item,
                  level: levelMap.get(item.id) || fallbackLevel,
              })),
              inactive: snapshot.inactiveList.map((item) => ({
                  ...item,
                  level: levelMap.get(item.id) || fallbackLevel,
              })),
          }
        : null;

    const {
        data: { user },
    } = await event.locals.supabase.auth.getUser();
    const isOwner = user?.id === profile.id;

    return {
        username: profile.username,
        bio: profile.bio,
        registeredAt: profile.createdAt!,
        isOwner,
        stats: {
            averageScore: profile.averageScore,
            levelsCompleted: profile.levelsCompleted,
            reviewsWritten: profile.reviewsWritten,
        },
        list: {
            snapshotAt: enrichedSnapshot?.at,
            active: enrichedSnapshot ? enrichedSnapshot.active : enrichedList,
            inactive: enrichedSnapshot
                ? enrichedSnapshot.inactive
                : enrichedInactiveList,
        },
        recentActivity: enrichedActivity,
        allProgress: enrichedAllProgress,
    };
};

export const actions: Actions = {
    updateList: async (event) => {
        const user = await requireAuth(event);

        try {
            const form = await event.request.formData();
            const result = UpdateList.safeParse(Object.fromEntries(form));
            if (!result.success) {
                return fail(400, { message: "invalid list data" });
            }
            const data = result.data;

            const ids = [...data.activeList, ...data.inactiveList];
            const uniqueIds = new Set(ids);
            if (ids.length !== uniqueIds.size) {
                return fail(400, {
                    message: "list payload contains duplicate levels",
                });
            }

            const updated = await db.syncCompletedListMembership(
                user.id,
                data.activeList,
                data.inactiveList,
            );

            if (!updated) {
                return fail(422, {
                    message: "failed to update list membership",
                });
            }

            return { success: true };
        } catch (err) {
            logger.error("error updating list placement:", err);
            return fail(500, { message: "failed to update list placement" });
        }
    },
};
