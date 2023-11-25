import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import { build } from "esbuild";
build({
	outdir: "dist",
	entryPoints: ["./src/index.js"],
	bundle: true,
	format: "esm",
	external: ["__STATIC_CONTENT_MANIFEST"],
	plugins: [NodeModulesPolyfillPlugin()],
});
