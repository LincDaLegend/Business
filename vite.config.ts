
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // This maps process.env.API_KEY in your code to the actual environment variable
      // Supports both API_KEY and GEMINI_API_KEY for compatibility
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY)
    }
  }
})
