import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA} from "vite-plugin-pwa";
import svgr from "vite-plugin-svgr";


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
			  name: 'My PWA App',
			  short_name: 'PWA App',
			  description: 'My awesome Progressive Web App!',
			  theme_color: '#ffffff',
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
	define: {
    	global: 'window',
  	},
})