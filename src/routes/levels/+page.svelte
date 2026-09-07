<script lang="ts">
    import { goto } from "$app/navigation";
    import type { PageData } from "./$types";
    import { page } from "$app/state";
    import Card from "$lib/components/LevelCard.svelte";
    import { difficulties, ratings, lengths } from "$lib/shared/gd";
    import type { SearchResult } from "$lib/shared/types";

    let searchResult = $state<SearchResult | null>(null);
    let isLoading = $state(true);

    let currentPage = $state(
        parseInt(page.url.searchParams.get("page") as string) || 1,
    );
    let selectedDifficulties = $state(
        page.url.searchParams.getAll("difficulty") || [],
    );
    let selectedRatings = $state(page.url.searchParams.getAll("rating") || []);
    let selectedLengths = $state(page.url.searchParams.getAll("length") || []);
    let searchQuery = $state(page.url.searchParams.get("q") || "");
    let input = $state("");

    let activeFilterCount = $derived(
        selectedDifficulties.length +
            selectedRatings.length +
            selectedLengths.length,
    );

    let queryString = $derived.by(() => {
        const params = new URLSearchParams();
        params.set("page", currentPage.toString());
        if (searchQuery) params.set("q", searchQuery);
        selectedDifficulties.forEach((d) => params.append("difficulty", d));
        selectedRatings.forEach((r) => params.append("rating", r));
        selectedLengths.forEach((l) => params.append("length", l));
        return `?${params.toString()}`;
    });

    // const SEARCH_DEBOUNCE_MS = 600;

    $effect(() => {
        // const currentQuery = queryString;
        // const timeoutId = setTimeout(() => {
        fetchLevels(queryString);
        window.history.replaceState(null, "", `/levels${queryString}`);
        // }, SEARCH_DEBOUNCE_MS);
        // return () => clearTimeout(timeoutId);
    });

    async function fetchLevels(queryString: string) {
        isLoading = true;
        try {
            const res = await fetch(`/search${queryString}`);
            if (res.ok) {
                const data = await res.json();
                searchResult = data;
            } else {
                searchResult = null;
            }
        } catch (err) {
            console.error("failed to fetch levels:", err);
            searchResult = null;
        } finally {
            isLoading = false;
        }
    }

    function advancePage(direction?: "back" | "next") {
        const delta = direction === "next" ? 1 : direction === "back" ? -1 : 0;
        currentPage = Math.max(1, currentPage + delta);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function triggerSearch() {
        searchQuery = input;
        currentPage = 1;
    }

    function addDifficulty(value: string | undefined) {
        if (!value) {
            selectedDifficulties = []; // Clear all
        } else if (selectedDifficulties.includes(value)) {
            selectedDifficulties = selectedDifficulties.filter(
                (d) => d !== value,
            ); // Remove if already checked
        } else {
            selectedDifficulties = [...selectedDifficulties, value]; // Add if not checked
        }
    }

    function addRating(value: string | undefined) {
        if (!value) {
            selectedRatings = [];
        } else if (selectedRatings.includes(value)) {
            selectedRatings = selectedRatings.filter((r) => r !== value);
        } else {
            selectedRatings = [...selectedRatings, value];
        }
    }

    function addLength(value: string | undefined) {
        if (!value) {
            selectedLengths = [];
        } else if (selectedLengths.includes(value)) {
            selectedLengths = selectedLengths.filter((l) => l !== value);
        } else {
            selectedLengths = [...selectedLengths, value];
        }
    }

    function clearAll() {
        selectedDifficulties = [];
        selectedRatings = [];
        selectedLengths = [];
        searchQuery = "";
        currentPage = 1;
        advancePage();
    }
</script>

<svelte:head>
    <title>levels - loggd</title>
</svelte:head>

{#snippet filterDropdown(
    label: string,
    options: readonly string[],
    selected: string[],
    onToggle: (v: string | undefined) => void,
)}
    <div class="dropdown">
        <div tabindex="0" role="button" class="btn gap-1.5">
            {label}
            {#if selected.length > 0}
                <span class="badge badge-sm badge-primary"
                    >{selected.length}</span
                >
            {/if}
        </div>
        <ul
            tabindex="-1"
            class="dropdown-content menu bg-base-100 rounded-box z-20 w-48 p-2 shadow-lg border border-base-300"
        >
            {#each options as option}
                <li>
                    <label
                        class="label cursor-pointer justify-start gap-2 px-2"
                    >
                        <input
                            type="checkbox"
                            class="checkbox checkbox-sm"
                            checked={selected.includes(option)}
                            onclick={() => onToggle(option)}
                        />
                        <span class="label-text">{option}</span>
                    </label>
                </li>
            {/each}
            {#if selected.length > 0}
                <li class="mt-1 pt-1 border-t border-base-300">
                    <button
                        class="text-error text-sm"
                        onclick={() => onToggle(undefined)}
                    >
                        clear {label.toLowerCase()}
                    </button>
                </li>
            {/if}
        </ul>
    </div>
{/snippet}

{#snippet cardSkeleton()}
    <div class="card w-full bg-base-200 overflow-hidden">
        <div class="skeleton h-44 w-full rounded-none relative">
            <!-- <div class="absolute bottom-4 left-4 right-4 flex flex-col gap-2">
                <div class="skeleton h-5 w-2/3 bg-base-300"></div>
                <div class="skeleton h-3 w-1/3 bg-base-300"></div>
                <div class="flex gap-2 mt-1">
                    <div class="skeleton h-4 w-14 bg-base-300"></div>
                    <div class="skeleton h-4 w-14 bg-base-300"></div>
                </div> -->
            <!-- </div> -->
        </div>
    </div>
{/snippet}

<div class="container mx-auto p-4">
    <!-- search -->
    <div class="mb-4 w-full">
        <div class="join w-full">
            <label class="input input-lg join-item grow">
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
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.3-4.3"></path>
                    </g>
                </svg>
                <input
                    type="text"
                    placeholder="search levels..."
                    maxlength="20"
                    bind:value={input}
                    onkeydown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            triggerSearch();
                        }
                    }}
                />
            </label>
            <button
                class="btn btn-neutral btn-lg join-item"
                onclick={() => advancePage()}>search</button
            >
        </div>
        <!-- <form>
            <input
                type="text"
                placeholder="search..."
                class="input input-lg w-full"
                name="query"
                maxlength="20"
                bind:value={searchQuery}
                onkeydown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        advancePage();
                    }
                }}
            />
        </form> -->
    </div>
    <!-- filter row -->
    <div class="flex flex-wrap items-center gap-2 mb-3">
        {@render filterDropdown(
            "difficulty",
            difficulties,
            selectedDifficulties,
            addDifficulty,
        )}
        {@render filterDropdown("rating", ratings, selectedRatings, addRating)}
        {@render filterDropdown("length", lengths, selectedLengths, addLength)}

        {#if activeFilterCount > 0}
            <button class="btn btn-ghost btn-sm text-error" onclick={clearAll}>
                clear all ×
            </button>
        {/if}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#if isLoading}
            {#each Array(10) as _}
                {@render cardSkeleton()}
            {/each}
        {:else if !searchResult || searchResult.levels?.length === 0}
            <div class="text-center col-span-full">
                <h3 class="text-lg font-semibold text-base-content/70 mb-2">
                    no levels found
                </h3>
            </div>
        {:else}
            {#each searchResult.levels as level}
                <Card
                    id={level.id}
                    name={level.name}
                    score={level.averageScore}
                    publisher={level.publisher ?? "unknown"}
                    difficulty={level.difficulty}
                    length={level.length}
                    releaseDate={null}
                />
            {/each}
        {/if}
    </div>
    <!-- prev/next page buttons -->
    <div class="flex justify-center py-4">
        <div class="join">
            {#if currentPage > 1}
                <button
                    class="join-item btn"
                    onclick={() => advancePage("back")}>«</button
                >
            {/if}
            <button class="join-item btn">page {currentPage}</button>
            <!-- {#if !data.page.isLastPage} -->
            <button class="join-item btn" onclick={() => advancePage("next")}
                >»</button
            >
            <!-- {/if} -->
        </div>
    </div>
</div>
