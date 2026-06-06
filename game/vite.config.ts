import { defineConfig } from "vite";

export default defineConfig({
    base: "/game/",
    build: {
        outDir: "dist",
        modulePreload: false,
        sourcemap: false,
        minify: "esbuild",
        cssMinify: true,
    },
    server: {
        host: "0.0.0.0",
        port: 3000,
        strictPort: true,
        open: false,
        fs: {
            allow: [".."],
        },
        allowedHosts: ["localhost", "127.0.0.1", "datacenter", ".ts.net"],
    },
});
