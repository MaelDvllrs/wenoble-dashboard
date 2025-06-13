import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA} from "vite-plugin-pwa";
import svgr from "vite-plugin-svgr";


const manifestForPlugin = {
	registerType: "prompt",
	includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
	manifest: {
		name: "Weather Ups",
		short_name: "Weathe Ups",
		description: "An app that can show weather forecast for your city.",
		icons: [
			{
				src: "/android-chrome-192x192.png",
				sizes: "192x192",
				type: "image/png",
			},
			{
				src: "/android-chrome-512x512.png",
				sizes: "512x512",
				type: "image/png",
			},
			{
				src: "/apple-touch-icon.png",
				sizes: "180x180",
				type: "image/png",
				purpose: "apple touch icon",
			},
			{
				src: "/maskable_icon.png",
				sizes: "225x225",
				type: "image/png",
				purpose: "any maskable",
			},
		],
		theme_color: "#171717",
		background_color: "#e8ebf2",
		display: "standalone",
		scope: "/",
		start_url: "/",
		orientation: "portrait",
	},
};

// https://vitejs.dev/config/
export default defineConfig({
  	base: "/",
  	plugins: [
		react(),
		svgr(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
			manifest: {
			  name: 'Wenoble Dashboard',
			  short_name: 'Wenoble Dashboard',
			  description: 'A powerful dashboard for managing your Wenoble projects.',
			  theme_color: '#171717',
			  icons: [
			  	{
			  		src: "/android-chrome-192x192.png",
			  		sizes: "192x192",
			  		type: "image/png",
			  	},
			  	{
			  		src: "/android-chrome-512x512.png",
			  		sizes: "512x512",
			  		type: "image/png",
			  	},
			  	{
			  		src: "/apple-touch-icon.png",
			  		sizes: "180x180",
			  		type: "image/png",
			  		purpose: "apple touch icon",
			  	},
			  	{
			  		src: "/maskable_icon.png",
			  		sizes: "225x225",
			  		type: "image/png",
			  		purpose: "any maskable",
			  	},
			  ],
			},
		}),
	
	],
	optimizeDeps: {
		exclude: ['@ffmpeg/ffmpeg'],
	},
	build: {
		rollupOptions: {
			output: {
				entryFileNames: 'assets/[name]-[hash].js',
				chunkFileNames: 'assets/[name]-[hash].js',
				assetFileNames: 'assets/[name]-[hash].[ext]',
			},
		},
	},
  	server: {
		host: true,
		//port: 5173, When not running with docker compose, this is the port which will be used in docker
	},	
})
