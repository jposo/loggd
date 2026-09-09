import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import db from "$lib/server/db/instance";
import { get } from "$lib/server/gd/client";
import { logger } from "$lib/server/logger";

export const load: PageServerLoad = async (event) => {
    try {
        const levelIds = await db.findTopRatedLevels();
        const ids = levelIds.map((level) => level.id);

        const [result, dailyHistory, weeklyHistory, eventHistory] =
            await Promise.all([
                get("levels").ids(ids),
                get("levels").type("daily history").page(0),
                get("levels").type("weekly history").page(0),
                get("levels").type("event history").page(0),
            ]);

        const levelMap = new Map(
            result?.result.map((level) => [level.id, level]),
        );

        const toSpotlight = (entry: { result?: Array<any> } | null) => {
            const level = entry?.result?.[0];
            if (!level) {
                return null;
            }

            return {
                id: level.id,
                name: level.name,
                publisher: level.creator?.username ?? "unknown",
                difficulty: level.difficulty,
                rating: level.rating,
                length: level.length,
                score: null, // get from db
            };
        };

        let recentActivity: Array<{
            levelId: number;
            status: string;
            completionPercentage: number | null;
            score: number | null;
            updatedAt: string | Date;
            level: {
                id: number;
                name: string;
                publisher: string;
                difficulty: string;
                length: string;
            };
        }> = [];

        const { user } = await event.parent();
        if (user?.username) {
            const userInfo = await db.findUserInfoByUsername(user.username);
            const activity = userInfo?.recentActivity ?? [];

            const recentIds = [
                ...new Set(activity.map((item) => item.levelId)),
            ].filter((id): id is number => typeof id === "number");

            if (recentIds.length > 0) {
                const recentLevels = await get("levels").ids(recentIds);
                const recentLevelMap = new Map(
                    recentLevels?.result.map((level) => [level.id, level]) ??
                        [],
                );

                recentActivity = activity
                    .slice(0, 3)
                    .map((item) => {
                        if (!item.levelId) {
                            return null;
                        }

                        const level = recentLevelMap.get(item.levelId);
                        return {
                            levelId: item.levelId,
                            status: item.status,
                            completionPercentage:
                                item.completionPercentage ?? null,
                            score: item.score ?? null,
                            updatedAt: item.updatedAt,
                            level: {
                                id: item.levelId,
                                name: level?.name ?? "unknown level",
                                publisher:
                                    level?.creator?.username ?? "unknown",
                                difficulty: level?.difficulty ?? "n/a",
                                length: level?.length ?? "tiny",
                            },
                        };
                    })
                    .filter((item) => item !== null);
            }
        }

        if (!result) {
            return {
                levels: [],
                recentActivity,
                spotlight: {
                    daily: toSpotlight(dailyHistory),
                    weekly: toSpotlight(weeklyHistory),
                    event: toSpotlight(eventHistory),
                },
            };
        }

        return {
            levels: levelIds.map((level) => ({
                id: level.id,
                name: levelMap.get(level.id)?.name ?? "unknown",
                publisher:
                    levelMap.get(level.id)?.creator?.username ?? "unknown",
                difficulty: levelMap.get(level.id)?.difficulty!,
                length: levelMap.get(level.id)?.length!,
                score: level.averageScore,
            })),
            recentActivity,
            spotlight: {
                daily: toSpotlight(dailyHistory),
                weekly: toSpotlight(weeklyHistory),
                event: toSpotlight(eventHistory),
            },
        };
    } catch (err) {
        logger.error("failed to load landing page", { error: err });
        error(500, "internal server error");
    }
};
