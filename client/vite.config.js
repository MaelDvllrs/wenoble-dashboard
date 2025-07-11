import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA} from "vite-plugin-pwa";
import svgr from "vite-plugin-svgr";


export default defineConfig({
  	base: "/",
  	plugins: [
		react(),
		svgr(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
			manifest: {
			  name: 'Wenoble Desktop',
			  short_name: 'Wenoble',
			  description: 'Wenoble Desktop Application',
			  theme_color: 'rgba(14, 15, 17, 1)',
			  icons: [
			    {
			      src: "/icon/icon-192-maskable.png",
			      sizes: "192x192",
			      type: "image/png",
			      purpose: "maskable"
			    },
			    {
			      src: "/icon/icon-512-maskable.png",
			      sizes: "512x512",
			      type: "image/png",
			      purpose: "maskable"
			    },
			    {
			      src: "/icon/icon-512.png",
			      sizes: "512x512",
			      type: "image/png"
			    },
			    {
			      src: "/icon/favicon.png",
			      sizes: "32x32",
			      type: "image/png"
			    }
			  ]
			},
		}),
	
	],
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