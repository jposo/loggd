import type { Handle } from "@sveltejs/kit";
import { createServerClient } from "@supabase/ssr";
import { env as penv } from "$env/dynamic/public";

export const handle: Handle = async ({ event, resolve }) => {
    event.locals.supabase = createServerClient(
        penv.PUBLIC_SUPABASE_PROJECT_URL,
        penv.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        {
            cookies: {
                getAll: () => event.cookies.getAll(),
                setAll: (cookiesToSet) => {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        event.cookies.set(name, value, {
                            ...options,
                            path: "/",
                        }),
                    );
                },
            },
        },
    );

    const response = await resolve(event);

    // security headers
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // set permissions policy, empty = disabled
    response.headers.set(
        "Permissions-Policy",
        'geolocation=(), microphone=(), camera=(), fullscreen=(self "https://www.youtube.com" "https://www.youtube-nocookie.com"), payment=(), usb=()',
    );

    response.headers.set(
        "Content-Security-Policy",
        "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline'; " +
            "style-src 'self' 'unsafe-inline'; " +
            `img-src 'self' ${penv.PUBLIC_SUPABASE_PROJECT_URL} data: https://levelthumbs.prevter.me https://img.youtube.com; media-src 'self' blob:;` +
            "font-src 'self'; " +
            "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; " +
            `connect-src 'self' ${penv.PUBLIC_SUPABASE_PROJECT_URL}; `,
    );

    if (event.url.protocol === "https:") {
        response.headers.set(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains; preload",
        );
    }

    return response;
};
