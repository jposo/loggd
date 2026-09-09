import type { PageServerLoad, Actions } from "./$types";
import db from "$lib/server/db/instance";
import { env as penv } from "$env/dynamic/public";
import { error, fail, type Cookies } from "@sveltejs/kit";
import { z } from "zod";
import { getCurrentDay, getNextDayDateTime } from "$lib/server/utils";
import { get } from "$lib/server/gd/client";
import type { Guess, Guesses, Hints } from "$lib/shared/types";
import { logger } from "$lib/server/logger";

const HINT_CONFIG = [
    { threshold: 0, when: 1, key: "rating", name: "rating" },
    { threshold: 1, when: 2, key: "difficulty", name: "difficulty" },
    { threshold: 2, when: 3, key: "releaseYear", name: "release year" },
    { threshold: 3, when: 4, key: "song", name: "song" },
    { threshold: 4, when: 5, key: "publisher", name: "publisher" },
];

function getHintKeys(guessCount: number) {
    const hints: Record<number, { key: string; name: string }> = {};

    for (const config of HINT_CONFIG) {
        if (guessCount >= config.threshold) {
            hints[config.when] = {
                key: config.key,
                name: config.name,
            };
        }
    }

    return hints;
}

function getHints(
    answer: NonNullable<Awaited<ReturnType<typeof getAnswer>>>,
    guessCount: number,
    correct: boolean,
) {
    const hintsKeys = getHintKeys(correct ? 6 : guessCount);
    const hints: Hints = {};

    for (const [answerKey, answerValue] of Object.entries(answer ?? {})) {
        for (const [hintIndex, hint] of Object.entries(hintsKeys)) {
            if (hint.key === answerKey && !Array.isArray(answerValue)) {
                hints[parseInt(hintIndex)] = {
                    hint: hint.name,
                    value: answerValue ?? null,
                };
            }
        }
    }
    return hints;
}

function getImageUrls(imagePaths: string[], cutoff: number) {
    return imagePaths
        .slice(0, cutoff)
        .map(
            (image) =>
                `${penv.PUBLIC_SUPABASE_PROJECT_URL}/storage/v1/object/public/images/${image}`,
        );
}

async function getAnswer(day: number) {
    const answerDetails = await db.findDaily(day);

    const answerResult = (await get("levels").search(answerDetails.id))
        ?.result[0];

    if (!answerResult) {
        return null;
    }

    return {
        id: answerResult.id,
        imagePaths: answerDetails.imagePaths,
        name: answerResult.name,
        publisher: answerResult.creator?.username ?? "unknown publisher",
        difficulty: answerResult.difficulty,
        rating: answerResult.rating,
        song: answerResult.song?.name ?? "unknown song",
        releaseYear: 2000,
    };
}

function getGuessHistory(cookies: Cookies) {
    const historyKey = "guesses";
    const historyCookie = cookies.get(historyKey);
    const history: Guesses = JSON.parse(historyCookie ?? "{}");

    return history;
}

function saveGuessHistory(cookies: Cookies, guesses: Guesses) {
    const historyKey = "guesses";
    cookies.set(historyKey, JSON.stringify(guesses), {
        path: "/",
        httpOnly: true,
        maxAge: Number.MAX_SAFE_INTEGER, // we will die before this ends
        sameSite: "strict",
    });
}

const Guess = z.object({
    day: z.coerce.number().min(1).max(9999),
    guessId: z.coerce.number().min(1),
});

export const load: PageServerLoad = async ({ url, cookies }) => {
    const currentDay = getCurrentDay();
    const requestedDay = parseInt(url.searchParams.get("day") ?? "");
    const day = !Number.isNaN(requestedDay) ? requestedDay : currentDay;

    const game = await db.findDaily(day);
    if (!game) {
        logger.error("game not found", { day });
        error(404, "game not found");
    }

    const allGuessHistory = getGuessHistory(cookies);
    const guessHistory = allGuessHistory[day] ?? [];
    const guessCount = guessHistory.length;
    const hasWon = guessHistory.some((guess) => guess.correct === true);
    const hasLost = !hasWon && guessCount >= 6;
    const finished = hasWon || hasLost;

    const visibleImageCount = finished
        ? game.imagePaths.length
        : Math.min(guessCount + 1, game.imagePaths.length);

    const answer = await getAnswer(day);
    if (!answer) {
        logger.error("could not find answer", { day });
        error(404, "could not find answer");
    }

    const hints = getHints(answer, guessCount, hasWon);
    const updatesOn = getNextDayDateTime(currentDay).toISOString();

    return {
        updatesOn,
        guessHistory,
        game: {
            day: game.day,
            hints,
            images: getImageUrls(game.imagePaths, visibleImageCount),
            answer: finished ? answer : null,
        },
    };
};

export const actions = {
    default: async ({ request, cookies }) => {
        const form = await request.formData();
        const entries = Object.fromEntries(form);
        const result = Guess.safeParse(entries);

        if (!result.success) {
            return fail(400, {
                message: "invalid request",
                error: z.treeifyError(result.error),
            });
        }

        const data = result.data;

        const allGuessHistory = getGuessHistory(cookies);
        const guessHistory = allGuessHistory[data.day] ?? [];
        const guessCount = guessHistory.length;

        const hasWon = guessHistory.some((guess) => guess.correct === true);

        if (hasWon) {
            return fail(400, { message: "already won" });
        }

        if (guessCount >= 6) {
            return fail(400, { message: "maximum guesses reached" });
        }

        const level = await get("levels").search(data.guessId);
        if (!level) {
            logger.warn("could not find level", { guessId: data.guessId });
            return fail(404, { message: "guess does not exist" });
        }

        const answer = await getAnswer(data.day);
        if (!answer) {
            logger.warn("could not find answer", { day: data.day });
            return fail(404, { message: "could not find answer" });
        }

        const newGuessCount = guessCount + 1;
        const correct = answer.id == data.guessId ? true : false;
        const lost = !correct && newGuessCount === 6;
        const finished = correct || lost;

        guessHistory.push({
            id: data.guessId,
            name: level.result[0]?.name ?? "unknown",
            publisher:
                level.result[0]?.creator?.username ?? "unknown publisher",
            correct,
        });

        allGuessHistory[data.day] = guessHistory;
        saveGuessHistory(cookies, allGuessHistory);

        const hints = getHints(answer, newGuessCount, correct);
        const images = getImageUrls(
            answer.imagePaths,
            finished ? 6 : newGuessCount + 1,
        );

        return {
            success: true,
            correct,
            images,
            hints,
            answer: finished ? answer : null,
            guesses: guessHistory,
        };
    },
} satisfies Actions;
