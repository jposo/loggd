import { fail, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { get } from "$lib/server/gd/client";
import SearchParams from "$lib/server/schemas/SearchParams";
import db from "$lib/server/db/instance";
import type { UserSearchResponse } from "$lib/server/gd/users";

export const GET: RequestHandler = async ({ url }) => {
    const paramsResult = SearchParams.safeParse({
        page: url.searchParams.get("page") ?? undefined,
        query: url.searchParams.get("q") ?? undefined,
        difficulty: url.searchParams.get("difficulty") ?? undefined,
        rating: url.searchParams.get("rating") ?? undefined,
        length: url.searchParams.get("length") ?? undefined,
    });
    if (!paramsResult.success) {
        return json({});
    }
    const params = paramsResult.data;

    let query = get("levels")
        // .type("most liked")
        .page(Math.max(0, params.page - 1));
    if (params.difficulty) {
        query = query.difficulty(params.difficulty);
    }
    if (params.rating) {
        query = query.rating(params.rating);
    }
    if (params.length) {
        query = query.length(params.length);
    }
    if (params.query) {
        query = query.search(params.query);
    }
    const result = await query;
    if (!result) {
        return json({});
    }
    const stats = await db.accrueProgressByLevelIds(
        result.result.map((level) => level.id),
    );
    const statsMap = new Map(stats.map((stat) => [stat.levelId, stat]));
    const levels = result.result.map((level) => ({
        id: level.id,
        name: level.name,
        publisher: level.creator?.username,
        difficulty: level.difficulty,
        releaseDate: null,
        length: level.length,
        averageScore: statsMap.get(level.id)?.averageScore || 0,
    }));

    let user: UserSearchResponse | undefined;
    let userQuery = get("users");
    if (params.query) {
        userQuery = userQuery.search(params.query);
        const result = await userQuery;
        user = result;
    }

    return json({
        levels,
        user,
        page: params.page,
    });

    // if (params.service === "levelguessr") {
    //     const result = await get("levels").search(params.query).rating("star");
    //     return json(
    //         result?.result.map((level) => ({
    //             id: level.id,
    //             name: level.name,
    //             publisher: level.creator?.username ?? "unknown",
    //         })) ?? [],
    //     );
    // }
    // const result = await get("levels").search(params.query);
    // return json(
    //     result.result.map((level) => ({
    //         id: level.id,
    //         name: level.name,
    //         publisher: level.creator?.username ?? "unknown",
    //     })) ?? [],
    // );
};
