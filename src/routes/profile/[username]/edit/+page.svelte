<script lang="ts">
    import { enhance } from "$app/forms";
    import { goto } from "$app/navigation";
    import { toastManager } from "$lib/state/toasts.svelte";
    import type { PageData, ActionData, SubmitFunction } from "./$types";

    let { data, form }: { data: PageData; form: ActionData } = $props();

    let bio = $derived(data.user.bio);
    let loading = $state(false);

    // Update form values if there was an error
    // $effect(() => {
    //     if (form?.bio !== undefined) {
    //         bio = form.bio;
    //     }
    // });

    function handleCancel() {
        goto(`/profile/${data.user.username}`);
    }
</script>

<svelte:head>
    <title>edit profile - loggd</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
    <div class="max-w-2xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
            <h1 class="text-3xl font-bold text-base-content mb-2">
                edit profile
            </h1>
            <p class="text-base-content/70">update your profile information</p>
        </div>

        <!-- Edit Form -->
        <div class="bg-base-200 rounded-lg shadow-lg p-6">
            <form
                method="POST"
                class="space-y-6"
                use:enhance={(() => {
                    loading = true;
                    return async ({ result }) => {
                        loading = false;
                        if (result.type === "success") {
                            toastManager.add(
                                result.data?.message ??
                                    "successfully updated info",
                                "success",
                            );
                        } else if (result.type === "failure") {
                            toastManager.add(
                                result.data?.message ?? "failed to update info",
                                "error",
                            );
                        } else {
                            console.error(result);
                            toastManager.add("unknown error occurred", "error");
                        }
                    };
                }) satisfies SubmitFunction}
            >
                <!-- Bio -->
                <fieldset class="fieldset w-full">
                    <legend class="fieldset-legend"
                        >bio {bio?.length ?? 0}/200</legend
                    >
                    <textarea
                        name="bio"
                        bind:value={bio}
                        class="textarea w-full"
                        maxlength="200"
                        placeholder="tell people about yourself..."
                        disabled={loading}></textarea>
                </fieldset>

                <!-- Read-only fields for reference -->
                <div class="divider">account information</div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <fieldset class="fieldset">
                        <legend class="fieldset-legend">username</legend>
                        <input
                            type="text"
                            value={data.user.username}
                            class="input"
                            disabled
                        />
                        <p class="label">cannot be changed</p>
                    </fieldset>

                    <fieldset class="fieldset">
                        <legend class="fieldset-legend">email</legend>
                        <input
                            type="email"
                            value={data.user.email}
                            class="input"
                            disabled
                        />
                        <p class="label">cannot be changed</p>
                    </fieldset>
                </div>

                <!-- Form Actions -->
                <div class="flex flex-col sm:flex-row gap-4 pt-4">
                    <button
                        type="submit"
                        class="btn btn-primary flex-1"
                        class:loading
                        disabled={loading}
                    >
                        {#if loading}
                            <span class="loading loading-dots loading-xl"
                            ></span>
                        {:else}
                            save changes
                        {/if}
                    </button>

                    <button
                        type="button"
                        class="btn flex-1"
                        onclick={handleCancel}
                        disabled={loading}
                    >
                        cancel
                    </button>
                </div>
            </form>
        </div>

        <!-- Danger Zone -->
        <div class="bg-base-200 rounded-lg shadow-lg p-6 mt-8">
            <h3 class="text-lg font-semibold text-error mb-4">danger zone</h3>
            <div class="flex flex-wrap gap-2">
                <button class="btn btn-outline btn-error btn-sm" disabled>
                    delete acccount
                </button>
            </div>
            <p class="text-xs text-base-content/50 mt-2">
                these features are coming soon
            </p>
        </div>
    </div>
</div>
