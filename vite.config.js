import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "192x192.png",
        "512x512.png",
        "512x512_maskable.png",
      ],

      manifest: {
        name: "Punjab University Gujranwala Campus",
        short_name: "PUGC",
        description:
          "BSCS(2024-2028) - University timetable, results and student information system",

        theme_color: "#2563eb",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",

        icons: [
          {
            src: "/192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/512x512_maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,

        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,json}"],

        runtimeCaching: [
          // ==========================
          // Cache First (Mostly Static)
          // ==========================

          {
            urlPattern: ({ url, request }) =>
              request.method === "GET" &&
              url.pathname.startsWith("/api/courses"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "courses-cache",
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: THIRTY_DAYS,
              },
            },
          },

          {
            urlPattern: ({ url, request }) =>
              request.method === "GET" &&
              url.pathname.startsWith("/api/teachers"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "teachers-cache",
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: THIRTY_DAYS,
              },
            },
          },

          {
            urlPattern: ({ url, request }) =>
              request.method === "GET" &&
              url.pathname.startsWith("/api/timetable"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "timetable-cache",
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: THIRTY_DAYS,
              },
            },
          },

          {
            urlPattern: ({ url, request }) =>
              request.method === "GET" &&
              url.pathname.startsWith("/api/grading-scale"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "grading-cache",
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: THIRTY_DAYS,
              },
            },
          },

          {
            urlPattern: ({ url, request }) =>
              request.method === "GET" &&
              url.pathname.startsWith("/api/semesters"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "semesters-cache",
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: THIRTY_DAYS,
              },
            },
          },

          // ==========================
          // Network First (Dynamic)
          // ==========================

          {
            urlPattern: ({ url, request }) =>
              request.method === "GET" &&
              url.pathname.startsWith("/api/students"),
            handler: "NetworkFirst",
            options: {
              cacheName: "students-cache",
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: THIRTY_DAYS,
              },
            },
          },

          {
            urlPattern: ({ url, request }) =>
              request.method === "GET" &&
              url.pathname.startsWith("/api/results"),
            handler: "NetworkFirst",
            options: {
              cacheName: "results-cache",
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: THIRTY_DAYS,
              },
            },
          },

          {
            urlPattern: ({ url, request }) =>
              request.method === "GET" &&
              url.pathname.startsWith("/api/course-results"),
            handler: "NetworkFirst",
            options: {
              cacheName: "course-results-cache",
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: THIRTY_DAYS,
              },
            },
          },

          {
            urlPattern: ({ url, request }) =>
              request.method === "GET" &&
              url.pathname.startsWith("/api/notifications"),
            handler: "NetworkFirst",
            options: {
              cacheName: "notifications-cache",
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: THIRTY_DAYS,
              },
            },
          },
          {
            urlPattern: ({ url, request }) =>
              request.method === "GET" &&
              url.pathname.startsWith("/api/exam-schedule"),
            handler: "NetworkFirst",
            options: {
              cacheName: "notifications-cache",
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: THIRTY_DAYS,
              },
            },
          },

          // ==========================
          // Never Cache Authentication
          // ==========================

          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/auth/me"),
            handler: "NetworkOnly",
          },
          {
            urlPattern: ({ url, request }) =>
              request.method === "GET" &&
              url.pathname.startsWith("/api/contact"),
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
});
