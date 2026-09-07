<script lang="ts">
    import "../app.css";
    import favicon from "$lib/assets/favicon.ico";
    import { themeManager } from "$lib/state/theme.svelte";
    import { onMount } from "svelte";
    import type { PageData } from "./$types";
    import { goto, invalidateAll } from "$app/navigation";
    import { guessesState } from "$lib/state/guesses.svelte";
    import Toast from "$lib/components/Toast.svelte";
    import { toastManager } from "$lib/state/toasts.svelte";
    import { navigating } from "$app/state";
    import type { SearchResult } from "$lib/shared/types";
    import Avatar from "$lib/components/Avatar.svelte";
    import { env as penv } from "$env/dynamic/public";
    import { createBrowserClient } from "@supabase/ssr";

    const supabase = createBrowserClient(
        penv.PUBLIC_SUPABASE_PROJECT_URL,
        penv.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );

    let { children, data }: { children: any; data: PageData } = $props();

    let vaultModal: HTMLDialogElement;
    let searchModal: HTMLDialogElement;
    let guesses = $derived(guessesState.value);

    let searchResults: SearchResult[] = $state([]);
    let isSearchOpen = $state(false);
    let searchInput: string | undefined = $state();
    let search: HTMLInputElement;

    const greetings = ["hi", "hello", "hey", "howdy", "greetings", "yo"];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];

    // Initialize theme on mount
    onMount(() => {
        const savedTheme = localStorage.getItem("theme") || "light";
        if (!themeManager.themes.includes(savedTheme)) {
            themeManager.setTheme(savedTheme);
        }
    });

    async function handleSignIn() {
        await supabase.auth.signInWithOAuth({
            provider: "discord",
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=${window.location.pathname}`,
            },
        });
    }

    // Logout function
    async function handleLogout() {
        await supabase.auth.signOut();
        await invalidateAll();
    }

    function openSearch() {
        isSearchOpen = true;
        searchModal?.showModal();
    }

    $effect(() => {
        if (isSearchOpen && search) {
            setTimeout(() => search?.focus(), 50);
        }
    });

    $effect(() => {
        if (!searchInput || searchInput.trim().length < 3) {
            searchResults = [];
            return;
        }

        // timer debounce between api requests
        const timeoutId = setTimeout(async () => {
            try {
                const response = await fetch(`/search?q=${searchInput}`);
                if (response.ok) {
                    const results = await response.json();
                    searchResults = results;
                }
            } catch (error) {
                console.error("Search failed", error);
            }
        }, 300);

        // cleanup function: If the user types again before 300ms,
        // Svelte runs this to cancel the previous timer.
        return () => clearTimeout(timeoutId);
    });
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
    <title>score.gd</title>
</svelte:head>

{#each toastManager.queue as toast (toast.id)}
    <Toast type={toast.type} message={toast.message} />
{/each}

<div class="flex flex-col min-h-screen">
    <nav
        class="navbar bg-base-300/80 shadow-sm px-4 sticky top-0 z-10 backdrop-blur"
    >
        <div class="navbar-start gap-2">
            <a href="/" class="btn btn-ghost text-2xl">score.gd</a>

            <button class="btn btn-ghost" onclick={() => openSearch()}>
                search...
            </button>
        </div>

        <div class="navbar-end gap-1">
            <div class="dropdown dropdown-hover">
                <div tabindex="0" role="button" class="btn btn-ghost">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        class="h-5 w-5"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                        />
                    </svg>
                    levelguessr
                </div>
                <ul
                    tabindex="-1"
                    class="dropdown-content menu bg-base-300 rounded-box z-1 w-52 p-2 shadow-sm"
                >
                    <li>
                        <a href="/levelguessr">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="currentColor"
                                class="h-5 w-5"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                                />
                            </svg>
                            daily
                        </a>
                    </li>
                    <li>
                        <button onclick={() => vaultModal?.showModal()}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="currentColor"
                                class="h-5 w-5"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"
                                />
                            </svg>
                            vault
                        </button>
                    </li>
                </ul>
            </div>
            <a href="/levels" class="btn btn-ghost">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="h-5 w-5"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z"
                    />
                </svg>
                levels
            </a>
            {#if data.user}
                <!-- Authenticated user menu -->
                <div class="dropdown dropdown-end z-15">
                    <Avatar username={data.user.username} />
                    <ul
                        tabindex="-1"
                        class="menu menu-sm dropdown-content bg-base-300 rounded-box z-1 mt-2 w-52 p-2 shadow"
                    >
                        <li class="menu-title">
                            <span>{greeting}, {data.user.username}!</span>
                        </li>
                        <li>
                            <a href="/profile/{data.user.username}">profile</a>
                        </li>
                        {#if data.user.roles?.includes("admin")}
                            <li><a href="/admin">admin</a></li>
                        {/if}
                        <!-- <li><a href="/settings">settings</a></li> -->
                        <li>
                            <button onclick={handleLogout} class="text-error"
                                >logout</button
                            >
                        </li>
                    </ul>
                </div>
            {:else}
                <!-- Unauthenticated user options -->
                <button class="btn bg-white text-black" onclick={handleSignIn}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 512 512"
                    >
                        <path d="M0 0h512v512H0z" fill="none" />
                        <path
                            fill="#5865f2"
                            d="M433.7 91a416.5 416.5 0 0 0-105.6-33.2c-4.6 8.2-9.9 19.3-13.5 28.1c-39.4-5.9-78.4-5.9-117.1 0c-3.7-8.8-9.1-19.9-13.7-28.1c-37.1 6.4-72.6 17.7-105.7 33.3c-66.8 101-85 199.5-75.9 296.6c44.3 33.1 87.3 53.2 129.6 66.4c10.4-14.4 19.7-29.6 27.7-45.7c-15.3-5.8-29.9-13-43.7-21.3c3.7-2.7 7.2-5.6 10.7-8.5c84.2 39.4 175.8 39.4 259 0c3.5 2.9 7.1 5.8 10.7 8.5c-13.9 8.3-28.5 15.5-43.8 21.3c8 16 17.3 31.3 27.7 45.7c42.3-13.2 85.3-33.3 129.6-66.4c10.8-112.5-18-210.1-76-296.7M170.9 328c-25.3 0-46-23.6-46-52.4s20.3-52.4 46-52.4s46.5 23.6 46 52.4c.1 28.8-20.2 52.4-46 52.4m170.2 0c-25.3 0-46-23.6-46-52.4s20.3-52.4 46-52.4s46.5 23.6 46 52.4c0 28.8-20.3 52.4-46 52.4"
                        />
                    </svg>
                    login with discord
                </button>
                <!-- <a href="/signup" class="btn btn-ghost w-24">sign up</a>
                <a href="/login" class="btn btn-primary w-24">login</a> -->
            {/if}
        </div>
    </nav>

    <dialog bind:this={vaultModal} class="modal backdrop-blur-sm">
        <div class="modal-box w-11/12 max-w-5xl">
            <h3 class="text-lg font-bold">vault</h3>
            <p class="py-4">select one of the previous levels</p>
            <div class="flex flex-wrap justify-center gap-2">
                {#each data.vault as day}
                    <a
                        role="button"
                        href={`/levelguessr?day=${day}`}
                        class="btn btn-xl btn-square {day in guesses &&
                        guesses[day].some((guess) => guess.correct)
                            ? 'border-success'
                            : guesses[day]?.length >= 6
                              ? 'border-error'
                              : ''}"
                        onclick={() => vaultModal?.close()}>{day}</a
                    >
                {/each}
            </div>
            <div class="modal-action">
                <form method="dialog">
                    <button class="btn">close</button>
                </form>
            </div>
        </div>
        <form method="dialog" class="modal-backdrop">
            <button>close</button>
        </form>
    </dialog>

    <dialog
        bind:this={searchModal}
        class="modal backdrop-blur-sm"
        onclose={() => {
            isSearchOpen = false;
            searchInput = "";
        }}
    >
        <div class="modal-box w-5/6 max-w-5xl flex flex-col gap-4">
            <label class="input w-full border-b border-base-100 text-lg">
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
                    type="search"
                    placeholder="search..."
                    maxlength="20"
                    bind:value={searchInput}
                    bind:this={search}
                    onkeydown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            goto(`/levels?q=${searchInput}`);
                            searchModal.close();
                        }
                    }}
                />
            </label>
        </div>
        <form method="dialog" class="modal-backdrop">
            <button>close</button>
        </form>
    </dialog>

    <main class="flex-grow">
        {#if navigating.complete}
            <div
                class="absolute inset-0 flex justify-center items-center h-full"
            >
                <span class="loading loading-dots loading-xl"></span>
            </div>
        {:else}
            {@render children?.()}
        {/if}
    </main>

    <footer
        class="footer sm:footer-horizontal bg-neutral text-neutral-content items-center p-4"
    >
        <aside class="grid-flow-col items-center">
            <p>
                This site is a fan-made website and is not affiliated with
                RobTop Games AB.
            </p>
        </aside>
        <nav
            class="grid-flow-col gap-0 md:place-self-center md:justify-self-end"
        >
            <div class="dropdown dropdown-end dropdown-top">
                <div tabindex="0" role="button" class="btn btn-ghost btn-sm">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                    >
                        <path d="M0 0h24v24H0z" fill="none" />
                        <path
                            fill="currentColor"
                            d="M6 21q-1.125 0-2.225-.55T2 19q.65 0 1.325-.513T4 17q0-1.25.875-2.125T7 14t2.125.875T10 17q0 1.65-1.175 2.825T6 21m5.75-6L9 12.25l8.95-8.95q.275-.275.688-.288t.712.288l1.35 1.35q.3.3.3.7t-.3.7z"
                        />
                    </svg>
                </div>
                <ul
                    tabindex="-1"
                    class="dropdown-content z-10 p-2 mb-2 shadow bg-base-300 rounded-box w-52 max-h-96 overflow-y-auto text-base-content"
                >
                    {#each themeManager.themes as themeOption}
                        {@const isCurrentTheme =
                            themeManager.currentTheme === themeOption}
                        <li>
                            <input
                                type="radio"
                                name="theme-dropdown"
                                class="theme-controller btn btn-sm btn-block {!isCurrentTheme
                                    ? 'btn-ghost'
                                    : ''} justify-start"
                                aria-label={themeOption}
                                value={themeOption}
                                checked={isCurrentTheme}
                                onchange={() =>
                                    themeManager.setTheme(themeOption)}
                            />
                        </li>
                    {/each}
                </ul>
            </div>
            <a
                aria-label="youtube channel url"
                href="https://www.youtube.com/channel/UCke91-1wo4q0Yw1w-2MvJJw"
                target="_blank"
                class="btn btn-sm btn-block btn-ghost"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    class="fill-current"
                >
                    <path
                        d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"
                    ></path>
                </svg>
            </a>
            <a
                aria-label="github repo url"
                href="https://github.com/jposo/loggd"
                target="_blank"
                class="btn btn-sm btn-block btn-ghost"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                >
                    <path d="M0 0h24v24H0z" fill="none" />
                    <path
                        fill="currentColor"
                        d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2"
                    />
                </svg>
            </a>
        </nav>
    </footer>
</div>
