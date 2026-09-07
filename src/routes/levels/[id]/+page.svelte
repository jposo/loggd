<script lang="ts">
    import type { PageData, SubmitFunction } from "./$types";
    import {
        abbreviateNumber,
        dateToLocaleString,
        getYouTubeEmbedUrl,
    } from "$lib/tools/utils";
    import Review from "$lib/components/Review.svelte";
    import { toastManager } from "$lib/state/toasts.svelte";
    import { enhance } from "$app/forms";
    import {
        PROGRESS_SCORE_OPTIONS,
        PROGRESS_STATUS_OPTIONS,
    } from "$lib/constants";
    import ProgressDialog from "$lib/components/ProgressDialog.svelte";

    let { data }: { data: PageData } = $props();

    let quickUpdateForm: HTMLFormElement | undefined = $state();
    let levelDetails: HTMLDialogElement | undefined = $state();
    let progressDetails: ProgressDialog | undefined = $state();

    // level Data
    let average = $derived(data.level.averageScore);
    let releaseDate = $derived(data.level.releaseDate);
    let videoUrl = $derived(data.level.videoUrl);
    let thumbnailUrl = $derived(
        `https://levelthumbs.prevter.me/thumbnail/${data.level.id}`,
    );
    let thumbnailUnavailable = $state(false);

    $effect(() => {
        thumbnailUnavailable = false;
    });

    // progress data (undefined means no user is logged in)
    let score = $derived(data.progress?.score ?? undefined);
    let status = $derived(data.progress?.status ?? undefined);
    let completionPercentage = $derived(
        data.progress?.completionPercentage ?? undefined,
    );
    let attempts = $derived(data.progress?.attempts ?? undefined);
    let startDate = $derived(data.progress?.startedAt ?? undefined);
    let completionDate = $derived(data.progress?.completedAt ?? undefined);
    let review = $derived(data.progress?.review ?? undefined);
    let progressVideoUrl = $derived(data.progress?.videoUrl ?? undefined);

    const scoreOptions = PROGRESS_SCORE_OPTIONS;
    const statusOptions = PROGRESS_STATUS_OPTIONS;

    async function quickUpdate(event: Event) {
        event.preventDefault();
        if (quickUpdateForm) {
            quickUpdateForm.requestSubmit();
        }
    }
</script>

<svelte:head>
    <title>{data.level.name} - loggd</title>
</svelte:head>

<div class="container mx-auto py-4 px-8">
    {#if !thumbnailUnavailable}
        <div class="relative mb-6 h-56 md:h-72 overflow-hidden -mx-8 -mt-8">
            <img
                src={thumbnailUrl}
                alt={`${data.level.name} thumbnail`}
                class="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                onerror={() => {
                    thumbnailUnavailable = true;
                }}
            />
            <div
                class="absolute inset-0 bg-gradient-to-b from-base-100/10 via-base-100/30 to-base-100"
            ></div>
        </div>
    {/if}

    <div class="flex flex-col lg:flex-row gap-6 lg:gap-8">
        <div class="flex flex-col gap-4 w-full lg:w-1/5 lg:max-w-[180px]">
            {#if data.user}
                {#if data.user.roles?.includes("admin")}
                    <div class="card bg-base-200 w-full">
                        <div class="card-body">
                            <button
                                class="btn btn-accent btn-block"
                                onclick={() => levelDetails?.showModal()}
                                >edit level details</button
                            >
                        </div>
                    </div>
                {/if}

                <div class="card bg-base-200 w-full">
                    <div class="card-body">
                        <!-- <form
                            class="space-y-2"
                            method="POST"
                            bind:this={quickUpdateForm}
                            action="?/updateProgress"
                            use:enhance={(() => {
                                if (status === "completed") {
                                    completionPercentage = 100;
                                }
                                return async ({ result }) => {
                                    if (result.type === "success") {
                                        toastManager.add(
                                            result.data?.message ??
                                                "successfully updated progress",
                                            "success",
                                        );
                                    } else if (result.type === "failure") {
                                        toastManager.add(
                                            result.data?.message ??
                                                "failed to update progress",
                                            "error",
                                        );
                                    } else {
                                        console.error(result);
                                        toastManager.add(
                                            "unknown error occurred",
                                            "error",
                                        );
                                    }
                                };
                            }) satisfies SubmitFunction}
                        >
                            <select
                                class="select"
                                name="status"
                                onchange={quickUpdate}
                                bind:value={status}
                            >
                                <option disabled selected value={undefined}
                                    >status</option
                                >
                                {#each statusOptions as option}
                                    <option value={option.value}
                                        >{option.label}</option
                                    >
                                {/each}
                            </select>
                            <select
                                class="select"
                                name="score"
                                onchange={quickUpdate}
                                bind:value={score}
                            >
                                <option disabled selected value={undefined}
                                    >score</option
                                >
                                {#each scoreOptions as option}
                                    <option value={option.value}
                                        >{option.value} - {option.label}</option
                                    >
                                {/each}
                            </select>
                            <input
                                value={completionPercentage}
                                name="completionPercentage"
                                min="0"
                                max="100"
                                type="hidden"
                            />
                        </form> -->
                        <button
                            class="btn btn-secondary btn-block"
                            onclick={() => progressDetails?.open()}
                            >update progress</button
                        >
                    </div>
                </div>
            {/if}
            <!-- Stats -->
            <div
                class="stats stats-horizontal lg:stats-vertical shadow bg-base-200 w-full overflow-x-auto"
            >
                <div class="stat">
                    <div class="stat-title">score</div>
                    <div class="stat-value">
                        {average ? average.toFixed(1) : "n/a"}
                    </div>
                </div>

                <div class="stat">
                    <div class="stat-title">completions</div>
                    <div class="stat-value">
                        {abbreviateNumber(data.level.completionCount)}
                    </div>
                </div>

                <div class="stat">
                    <div class="stat-title">reviews</div>
                    <div class="stat-value">
                        {abbreviateNumber(data.level.reviewCount)}
                    </div>
                </div>
            </div>
        </div>
        <!-- Level info -->
        <div class="flex flex-col gap-8 w-full lg:w-4/5">
            <div
                class="w-full flex flex-col md:flex-row-reverse gap-6 items-start"
            >
                {#if data.level.videoUrl}
                    <div
                        class="w-full max-w-[320px] sm:max-w-full md:w-[320px] md:max-w-[320px] lg:w-[360px] lg:max-w-[360px] md:flex-shrink-0 aspect-video rounded-box overflow-hidden border border-base-300 shadow-sm"
                    >
                        <iframe
                            class="h-full w-full"
                            src={getYouTubeEmbedUrl(data.level.videoUrl)}
                            title="YouTube video player"
                            frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerpolicy="strict-origin-when-cross-origin"
                            allowfullscreen
                        ></iframe>
                    </div>
                {/if}

                <div class="space-y-4 w-full">
                    <h1 class="text-4xl">
                        <span class="font-bold">{data.level.name}</span>
                        <span class="text-sm opacity-60"
                            >id: {data.level.id}</span
                        >
                    </h1>
                    <h2 class="text-2xl">
                        {#if data.level.releaseDate}
                            released on <span class="font-semibold"
                                >{dateToLocaleString(
                                    new Date(data.level.releaseDate),
                                ).toLowerCase()}</span
                            >
                        {/if}
                        by
                        <span class="font-semibold">{data.level.publisher}</span
                        >
                    </h2>
                    <p class="italic">{data.level.description}</p>
                    <div class="flex flex-wrap gap-2">
                        <div class="badge badge-neutral">
                            <span class="font-semibold"
                                >{data.level.songTitle}</span
                            >
                            by
                            <span class="font-semibold"
                                >{data.level.songArtist}</span
                            >
                        </div>
                        <div class="badge badge-neutral">
                            {data.level.length.toLowerCase()}
                        </div>
                        {#if data.level.twoPlayer}
                            <div class="badge badge-neutral">two-player</div>
                        {/if}
                        {#if data.level.coins && data.level.coins >= 1}
                            <div class="badge badge-neutral">
                                {data.level.coins} coins
                            </div>
                        {/if}
                        <div class="badge badge-warning">
                            {data.level.rating.toLowerCase()}
                        </div>
                        <div class="badge badge-error">
                            {data.level.difficulty.toLowerCase()}
                        </div>
                    </div>
                </div>
            </div>
            <!-- Reviews -->
            <div class="flex flex-col gap-4">
                <h3 class="text-xl font-bold">reviews</h3>
                {#if !data.level.reviews || data.level.reviews.length == 0}
                    <div class="opacity-50">no reviews yet.</div>
                {:else}
                    {#each data.level.reviews as r}
                        <Review
                            id={r.id}
                            username={r.username}
                            profilePictureUrl={r.profilePicturePath}
                            rating={r.score}
                            attempts={r.attempts}
                            status={r.status}
                            date={new Date(r.updatedAt)}
                            review={r.review!}
                            showModeratorOptions={data.user?.roles?.includes(
                                "admin",
                            ) ?? false}
                        />
                        <div class="divider"></div>
                    {/each}
                {/if}
            </div>
        </div>
    </div>
</div>
<!-- </div> -->

<dialog bind:this={levelDetails} class="modal backdrop-blur-sm">
    <div class="modal-box">
        <h3 class="text-lg font-bold">
            {data.level.name} details
        </h3>
        <form
            method="POST"
            action="?/updateLevel"
            use:enhance={(() => {
                return async ({ result }) => {
                    if (result.type === "success") {
                        toastManager.add(
                            result.data?.message ??
                                "successfully updated level",
                            "success",
                        );
                    } else if (result.type === "failure") {
                        toastManager.add(
                            result.data?.message ?? "failed to update level",
                            "error",
                        );
                    } else {
                        toastManager.add("unknown error occurred", "error");
                    }
                };
            }) satisfies SubmitFunction}
        >
            <fieldset class="fieldset">
                <legend class="fieldset-legend">release date</legend>
                <label class="input w-full">
                    <input
                        name="releaseDate"
                        type="date"
                        bind:value={releaseDate}
                    />
                </label>
            </fieldset>

            <fieldset class="fieldset w-full">
                <legend class="fieldset-legend">video url</legend>
                <label class="input validator w-full">
                    <svg
                        class="h-[1em] opacity-50"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                    >
                        <g
                            stroke-linejoin="round"
                            stroke-linecap="round"
                            stroke-width="2.5"
                            fill="none"
                            stroke="currentColor"
                        >
                            <path
                                d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                            ></path>
                            <path
                                d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                            ></path>
                        </g>
                    </svg>
                    <input
                        name="videoUrl"
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=xvFZjo5PgG0"
                        pattern="^(https?://)?([a-zA-Z0-9]([a-zA-Z0-9\-].*[a-zA-Z0-9])?\.)+[a-zA-Z].*$"
                        title="Must be valid URL"
                        bind:value={videoUrl}
                    />
                </label>
                <p class="validator-hint hidden">must be valid url</p>
            </fieldset>

            <div class="modal-action flex justify-end gap-2">
                <button
                    type="button"
                    class="btn"
                    onclick={() => levelDetails!.close()}
                >
                    close
                </button>
                <button
                    type="submit"
                    class="btn btn-primary"
                    onclick={() => levelDetails!.close()}>save details</button
                >
            </div>
        </form>
    </div>
</dialog>

<ProgressDialog
    bind:this={progressDetails}
    level={data.level}
    {statusOptions}
    {scoreOptions}
    bind:status
    bind:score
    bind:completionPercentage
    bind:attempts
    bind:startDate
    bind:completionDate
    bind:review
    bind:progressVideoUrl
/>
