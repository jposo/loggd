<script lang="ts">
    import type { PageData } from "./$types";
    import {
        Icon,
        Check,
        ListBullet,
        Clock,
        Pencil,
        Backward,
        Forward,
    } from "svelte-hero-icons";
    import Activity2 from "$lib/components/Activity2.svelte";
    import List from "$lib/components/ListDragAndDrop.svelte";
    import { formatDate } from "$lib/tools/utils";
    import { toastManager } from "$lib/state/toasts.svelte";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { page } from "$app/state";
    import { enhance } from "$app/forms";
    import {
        PROGRESS_SCORE_OPTIONS,
        PROGRESS_STATUS_OPTIONS,
    } from "$lib/constants";
    import ProgressDialog from "$lib/components/ProgressDialog.svelte";

    let { data }: { data: PageData } = $props();

    let editMode = $state(false);
    let activeItems = $state<any[]>([]);
    let inactiveItems = $state<any[]>([]);
    let initialActiveState = $state<number[]>([]);
    let initialInactiveState = $state<number[]>([]);
    let initialActiveItems = $state<any[]>([]);
    let initialInactiveItems = $state<any[]>([]);
    let requestingUpdate = $state(false);
    let snapshotModal = $state<HTMLDialogElement | null>(null);
    let progressDialog = $state<ProgressDialog | null>(null);

    let status = $state<string | undefined>();
    let score = $state<number | undefined>();
    let completionPercentage = $state<number | undefined>();
    let attempts = $state<number | undefined>();
    let startDate = $state<string | undefined>();
    let completionDate = $state<string | undefined>();
    let review = $state<string | undefined>();
    let progressVideoUrl = $state<string | undefined>();

    let selectedLevel = $state<{ id: number; name: string; length: string }>({
        id: 0,
        name: "",
        length: "",
    });

    function openProgressEditor(item: any) {
        selectedLevel = {
            id: item.levelId,
            name: item.level.name,
            length: item.level.length,
        };
        status = item.status ?? undefined;
        score = item.score ?? undefined;
        completionPercentage = item.completionPercentage ?? undefined;
        attempts = item.attempts ?? undefined;
        startDate = item.startedAt ?? undefined;
        completionDate = item.completedAt ?? undefined;
        review = item.review ?? undefined;
        progressVideoUrl = item.videoUrl ?? undefined;

        progressDialog?.open();
    }

    const tabs = {
        recent: "recent",
        list: "list",
        progress: "progress",
    };

    let tab = $state(tabs.recent);

    const zoneType = "columns";
    const activeLimit = 25;

    const isActiveListFull = $derived(activeItems.length >= activeLimit);

    const hasChanges = $derived.by(() => {
        const activeIds = activeItems.map((item) => item.id);
        const inactiveIds = inactiveItems.map((item) => item.id);

        if (activeIds.length !== initialActiveState.length) {
            return true;
        }

        if (inactiveIds.length !== initialInactiveState.length) {
            return true;
        }

        for (let i = 0; i < activeIds.length; i++) {
            if (activeIds[i] !== initialActiveState[i]) {
                return true;
            }
        }

        for (let i = 0; i < inactiveIds.length; i++) {
            if (inactiveIds[i] !== initialInactiveState[i]) {
                return true;
            }
        }

        return false;
    });

    const progressStatuses = [
        "completed",
        "in progress",
        "to try",
        "dropped",
    ] as const;

    const statusOptions = PROGRESS_STATUS_OPTIONS;
    const scoreOptions = PROGRESS_SCORE_OPTIONS;

    const groupedProgress = $derived.by(() => {
        const groups = {
            completed: [] as typeof data.allProgress,
            "in progress": [] as typeof data.allProgress,
            "to try": [] as typeof data.allProgress,
            dropped: [] as typeof data.allProgress,
        };

        for (const item of data.allProgress ?? []) {
            if (item.status === "completed") {
                groups.completed.push(item);
            } else if (item.status === "in progress") {
                groups["in progress"].push(item);
            } else if (item.status === "to try") {
                groups["to try"].push(item);
            } else if (item.status === "dropped") {
                groups.dropped.push(item);
            }
        }

        return groups;
    });

    onMount(() => {
        activeItems = data.list.active ?? [];
        inactiveItems = data.list.inactive ?? [];
        initialActiveItems = [...activeItems];
        initialInactiveItems = [...inactiveItems];
        initialActiveState = activeItems.map((item) => item.id);
        initialInactiveState = inactiveItems.map((item) => item.id);

        // if (data.list.snapshotAt) {
        //     tab = tabs.list;
        //     return;
        // }

        if (page.url.hash === "#" + tabs.recent) {
            tab = tabs.recent;
        } else if (page.url.hash === "#" + tabs.list) {
            tab = tabs.list;
        } else if (page.url.hash === "#" + tabs.progress) {
            tab = tabs.progress;
        }
    });

    function handleDrop(
        listKey: string,
        newItems: any[],
        _movedItemId: number | null,
    ) {
        if (listKey === "active") {
            activeItems = newItems;
        } else if (listKey === "inactive") {
            inactiveItems = newItems;
        }

        if (activeItems.length > 25) {
            toastManager.add(
                "active list is capped at 25 items. move one back to inactive.",
                "error",
            );
        }
    }

    function resetPendingChanges() {
        activeItems = [...initialActiveItems];
        inactiveItems = [...initialInactiveItems];
    }

    function cancelEditMode() {
        resetPendingChanges();
        editMode = false;
    }

    function clearSnapshotFilter() {
        goto(page.url.pathname + "#" + tabs.list);
    }
</script>

<svelte:head>
    <title>profile: {data.user?.username} - loggd</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
    <div class="max-w-4xl mx-auto flex flex-col gap-4">
        <!-- Profile Header -->
        <div class="bg-base-200 shadow p-6 rounded-lg">
            <div
                class="flex flex-col md:flex-row items-center md:items-start gap-6"
            >
                <!-- Profile Picture -->
                <div class="avatar avatar-placeholder">
                    <div
                        class="w-32 h-32 rounded-full text-neutral-content bg-neutral"
                    >
                        <span class="text-3xl">{data.username?.charAt(0)}</span>
                        <!-- {/if} -->
                    </div>
                </div>

                <!-- Profile Info -->
                <div class="flex-1 text-center md:text-left">
                    <h1 class="text-3xl font-bold text-base-content mb-2">
                        {data.username}
                    </h1>

                    <p class="text-base-content/70 mb-4">
                        member since <b
                            >{formatDate(
                                data.registeredAt ?? new Date(),
                            ).toLowerCase()}</b
                        >
                    </p>

                    <p class="text-base-content/80 mb-4 italic">
                        {data.bio ? data.bio : ""}
                    </p>

                    {#if data.isOwner}
                        <div
                            class="flex flex-wrap gap-2 justify-center md:justify-start"
                        >
                            <a
                                href="/profile/{data.username}/edit"
                                class="btn btn-primary btn-sm"
                            >
                                edit profile
                            </a>
                        </div>
                    {/if}
                </div>
            </div>
        </div>

        <!-- Stats Cards -->
        <!-- <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-"> -->
        <div class="stats shadow bg-base-200 w-full rounded-lg">
            <div class="stat">
                <div class="stat-title">average score</div>
                <div class="stat-value text-secondary">
                    {data.stats.averageScore
                        ? data.stats.averageScore.toFixed(1)
                        : "n/a"}
                </div>
                <!-- <div class="stat-desc">No demons yet</div> -->
            </div>

            <div class="stat">
                <div class="stat-title">levels completed</div>
                <div class="stat-value text-primary">
                    {data.stats.levelsCompleted}
                </div>
                <!-- <div class="stat-desc">Pump those numbers up!</div> -->
            </div>

            <div class="stat">
                <div class="stat-title">reviews written</div>
                <div class="stat-value text-accent">
                    {data.stats.reviewsWritten}
                </div>
                <!-- <div class="stat-desc">No reviews yet</div> -->
            </div>
        </div>

        <div class="bg-base-200 shadow p-6 rounded-lg">
            <div class="tabs tabs-lift">
                <label class="tab">
                    <input
                        type="radio"
                        name="user_activity"
                        checked={tab === tabs.recent}
                        onclick={() => goto("#" + tabs.recent)}
                    />
                    <Icon src={Clock} class="size-4 me-2" />
                    recent activity
                </label>
                <div class="tab-content bg-base-100 border-base-300 p-6">
                    <div>
                        {#if !data.recentActivity || data.recentActivity.length === 0}
                            <div class="text-center">
                                <h3
                                    class="text-lg font-semibold text-base-content/70 mb-2"
                                >
                                    no activity yet
                                </h3>
                                {#if data.isOwner}
                                    <p class="text-base-content/50 mb-4">
                                        start tracking your <span
                                            class="font-bold"
                                            >geometry dash</span
                                        > progress to see activity here!
                                    </p>
                                    <a href="/levels" class="btn btn-primary">
                                        browse levels
                                    </a>
                                {/if}
                            </div>
                        {:else}
                            <div class="flex flex-col gap-2">
                                {#each data.recentActivity as item}
                                    <Activity2
                                        id={item.levelId}
                                        name={item.level.name}
                                        publisher={item.level.publisher}
                                        score={item.score}
                                        status={item.status}
                                        completionPercentage={item.completionPercentage}
                                        updatedAt={item.updatedAt}
                                        showEdit={data.isOwner}
                                        onClick={() => openProgressEditor(item)}
                                    />
                                {/each}
                            </div>
                        {/if}
                    </div>
                </div>

                <label class="tab">
                    <input
                        type="radio"
                        name="user_list"
                        checked={tab === tabs.list}
                        onclick={() => goto("#" + tabs.list)}
                    />
                    <Icon src={ListBullet} class="size-4 me-2" />
                    list
                </label>
                <div class="tab-content bg-base-100 border-base-300 p-6">
                    {#if data.isOwner}
                        <div class="flex items-center justify-end gap-2 mb-1">
                            {#if data.list.snapshotAt}
                                <p class="text-sm opacity-60">
                                    {new Date(data.list.snapshotAt)
                                        .toLocaleString()
                                        .toLowerCase()}
                                </p>
                            {/if}

                            <button
                                type="button"
                                class="btn btn-sm btn-square btn-secondary"
                                onclick={() => {
                                    if (data.list.snapshotAt) {
                                        clearSnapshotFilter();
                                    } else {
                                        snapshotModal?.showModal();
                                    }
                                }}
                            >
                                {#if data.list.snapshotAt}
                                    <Icon src={Forward} class="size-[1.5em]" />
                                {:else}
                                    <Icon src={Backward} class="size-[1.5em]" />
                                {/if}
                            </button>

                            <!-- snapshots are read-only -->
                            {#if !data.list.snapshotAt}
                                <form
                                    action="?/updateList"
                                    method="POST"
                                    use:enhance={() => {
                                        requestingUpdate = true;
                                        return async ({ result }) => {
                                            requestingUpdate = false;
                                            if (result.type === "success") {
                                                editMode = false;
                                                initialActiveItems = [
                                                    ...activeItems,
                                                ];
                                                initialInactiveItems = [
                                                    ...inactiveItems,
                                                ];
                                                initialActiveState =
                                                    activeItems.map(
                                                        (item) => item.id,
                                                    );
                                                initialInactiveState =
                                                    inactiveItems.map(
                                                        (item) => item.id,
                                                    );
                                                toastManager.add(
                                                    "successfully updated list",
                                                    "success",
                                                );
                                            } else if (
                                                result.type === "failure"
                                            ) {
                                                toastManager.add(
                                                    (result.data
                                                        ?.message as string) ??
                                                        "error updating list",
                                                    "error",
                                                );
                                            } else {
                                                toastManager.add(
                                                    "unknown error",
                                                    "error",
                                                );
                                            }
                                        };
                                    }}
                                >
                                    <input
                                        type="hidden"
                                        name="activeList"
                                        value={JSON.stringify(
                                            activeItems.map((item) => item.id),
                                        )}
                                    />
                                    <input
                                        type="hidden"
                                        name="inactiveList"
                                        value={JSON.stringify(
                                            inactiveItems.map(
                                                (item) => item.id,
                                            ),
                                        )}
                                    />
                                    <button
                                        class="btn btn-sm btn-square btn-secondary {hasChanges
                                            ? 'btn-outline'
                                            : ''}"
                                        type={editMode && hasChanges
                                            ? "submit"
                                            : "button"}
                                        onclick={() => {
                                            if (!editMode) {
                                                editMode = true;
                                            } else if (!hasChanges) {
                                                editMode = false;
                                            }
                                        }}
                                        disabled={requestingUpdate ||
                                            activeItems.length > activeLimit}
                                    >
                                        {#if editMode}
                                            <Icon
                                                src={Check}
                                                class="size-[1.5em]"
                                            />
                                        {:else if requestingUpdate}
                                            <span
                                                class="loading loading-dots size-[1.5em]"
                                            ></span>
                                            <!-- <Icon
                                            src={Pencil}
                                            class="size-[1.2em]"
                                        /> -->
                                        {:else}
                                            <Icon
                                                src={Pencil}
                                                class="size-[1.5em]"
                                            />
                                        {/if}
                                    </button>
                                </form>
                            {/if}
                        </div>
                    {/if}

                    {#if editMode}
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="bg-base-200 p-4 rounded-lg">
                                <div
                                    class="flex items-center justify-between mb-2"
                                >
                                    <h3 class="text-lg font-semibold">
                                        active list
                                    </h3>
                                    <span
                                        class="badge {isActiveListFull
                                            ? 'badge-warning'
                                            : 'badge-primary'}"
                                    >
                                        {activeItems.length}/{activeLimit}
                                    </span>
                                </div>
                                {#if isActiveListFull}
                                    <p
                                        class="text-xs text-base-content/70 mb-2"
                                    >
                                        active list is full. drag an item to
                                        inactive before promoting another.
                                    </p>
                                {/if}
                                <List
                                    listKey="active"
                                    {zoneType}
                                    items={activeItems}
                                    {editMode}
                                    dropFromOthersDisabled={isActiveListFull}
                                    onDrop={handleDrop}
                                />
                            </div>

                            <div class="bg-base-200 p-4 rounded-lg">
                                <div
                                    class="flex items-center justify-between mb-2"
                                >
                                    <h3 class="text-lg font-semibold">
                                        inactive completed
                                    </h3>
                                    <span class="badge badge-outline">
                                        {inactiveItems.length}
                                    </span>
                                </div>
                                <List
                                    listKey="inactive"
                                    {zoneType}
                                    items={inactiveItems}
                                    {editMode}
                                    onDrop={handleDrop}
                                />
                            </div>
                        </div>
                    {:else if activeItems.length > 0}
                        <List
                            listKey="active"
                            {zoneType}
                            items={activeItems}
                            {editMode}
                            onDrop={handleDrop}
                        />
                    {:else}
                        <div class="text-center">
                            <h3
                                class="text-lg font-semibold text-base-content/70 mb-2"
                            >
                                no active list items yet
                            </h3>
                        </div>
                    {/if}
                </div>

                <label class="tab">
                    <input
                        type="radio"
                        name="user_progress"
                        checked={tab === tabs.progress}
                        onclick={() => goto("#" + tabs.progress)}
                    />
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        class="size-4 me-2"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181"
                        />
                    </svg>
                    all progress
                </label>
                <div class="tab-content bg-base-100 border-base-300 p-6">
                    {#if !data.allProgress.length}
                        <div class="text-center">
                            <h3
                                class="text-lg font-semibold text-base-content/70 mb-2"
                            >
                                no progress yet
                            </h3>
                        </div>
                    {:else}
                        <div class="flex flex-col gap-6">
                            {#each progressStatuses as statusName}
                                <div class="bg-base-200 p-4 rounded-lg">
                                    <div
                                        class="flex items-center justify-between mb-3"
                                    >
                                        <h3 class="text-lg font-semibold">
                                            {statusName}
                                        </h3>
                                        <span class="badge badge-outline">
                                            {groupedProgress[statusName].length}
                                        </span>
                                    </div>

                                    {#if groupedProgress[statusName].length === 0}
                                        <p class="text-sm text-base-content/60">
                                            nothing here yet.
                                        </p>
                                    {:else}
                                        <div class="flex flex-col gap-2">
                                            {#each groupedProgress[statusName] as item}
                                                <Activity2
                                                    id={item.levelId}
                                                    name={item.level.name}
                                                    publisher={item.level
                                                        .publisher}
                                                    score={item.score}
                                                    status={item.status}
                                                    completionPercentage={item.completionPercentage}
                                                    updatedAt={item.updatedAt}
                                                    showEdit={data.isOwner}
                                                    onClick={() =>
                                                        openProgressEditor(
                                                            item,
                                                        )}
                                                />
                                            {/each}
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</div>

<dialog class="modal" bind:this={snapshotModal}>
    <div class="modal-box">
        <h3 class="font-semibold text-lg mb-3">time machine</h3>
        <p class="text-sm text-base-content/70 mb-4">
            pick a timestamp to load a historical snapshot of active and
            inactive completed lists.
        </p>

        <form method="GET" action="" class="flex flex-col gap-3">
            <label class="form-control w-full">
                <span class="label-text text-sm mb-1">
                    view list at a point in time
                </span>
                <input
                    type="datetime-local"
                    name="at"
                    class="input input-bordered input-sm w-full"
                    value={data.list.snapshotAt
                        ? data.list.snapshotAt.slice(0, 16)
                        : ""}
                />
            </label>

            <div class="modal-action mt-2">
                <button class="btn btn-sm btn-primary" type="submit">
                    load snapshot
                </button>
                <button
                    class="btn btn-sm btn-ghost"
                    type="button"
                    onclick={() => snapshotModal?.close()}
                >
                    close
                </button>
            </div>
        </form>
    </div>
</dialog>

<ProgressDialog
    bind:this={progressDialog}
    level={selectedLevel}
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
