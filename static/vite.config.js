import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import cdn from 'vite-plugin-cdn-import'
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    cdn({
      modules: [
        {
          name: 'react',
          var: 'React',
          path: 'https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js',
        },
        {
          name: 'react-dom',
          var: 'ReactDOM',
          path: 'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js',
        },
        {
          name: 'dayjs',
          var: 'dayjs',
          path: 'https://cdnjs.cloudflare.com/ajax/libs/dayjs/1.11.13/dayjs.min.js',
        },
        {
          name: 'antd',
          var: 'antd',
          path: 'https://cdnjs.cloudflare.com/ajax/libs/antd/5.22.7/antd.min.js',
          css: 'https://cdnjs.cloudflare.com/ajax/libs/antd/5.22.7/reset.min.css',
        },
      ],
    }),
  ],
  build: {
    rollupOptions: {
      external: ['react', 'react-dom', 'dayjs', 'antd'], // 将 React 和 Antd 外部化
      input: {
        main: path.resolve(__dirname, './index.html'),
        admin: path.resolve(__dirname, './admin.html'),
      },
      output: {
        globals: {
          react: 'React', // 全局变量名
          'react-dom': 'ReactDOM', // 全局变量名
          dayjs: 'dayjs', // 全局变量名
          antd: 'antd', // 全局变量名
        },
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
})