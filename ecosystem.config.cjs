module.exports = {
  apps: [
    {
      name: "mec-api",
      cwd: __dirname,
      script: "dist/index.js",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      exp_backoff_restart_delay: 1000,
      kill_timeout: 10000,
      listen_timeout: 10000,
      time: true,
      error_file: "./logs/pm2/mec-api-error.log",
      out_file: "./logs/pm2/mec-api-out.log",
      merge_logs: true,
      env: {
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: "5000",
        PUBLIC_APP_URL: "https://mtendereeducationconsult.com",
        FRONTEND_URL: "https://mtendereeducationconsult.com",
        ADMIN_APP_URL: "https://admin.mtendereeducationconsult.com",
        VITE_API_URL: "https://api.mtendereeducationconsult.com",
        VITE_SITE_URL: "https://mtendereeducationconsult.com",
        CORS_ORIGIN:
          "https://mtendereeducationconsult.com,https://admin.mtendereeducationconsult.com",
        ALLOWED_ORIGINS:
          "https://mtendereeducationconsult.com,https://admin.mtendereeducationconsult.com",
        RATE_LIMIT_WINDOW_MS: "60000",
        RATE_LIMIT_MAX: "120",
      },
    },
  ],
};
