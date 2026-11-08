const path = require("path");

module.exports = {
  apps: [
    {
      name: "asaas-n8n",
      script: "./node_modules/n8n/bin/n8n",
      args: "start",
      cwd: __dirname,
      env: {
        N8N_PORT: process.env.N8N_PORT || "5678",
        NODE_ENV: "production",
        GENERIC_TIMEZONE: "Asia/Riyadh",
        TZ: "Asia/Riyadh",
        EXECUTIONS_DATA_PRUNE: "true",
        EXECUTIONS_DATA_MAX_AGE: "168",
        EXECUTIONS_DATA_PRUNE_MAX_COUNT: "50000",
        NODE_FUNCTION_ALLOW_BUILTIN: "*",
        NODE_FUNCTION_ALLOW_EXTERNAL: "*",
        N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS: "true"
      },
      restart_delay: 5000,
      max_restarts: 10
    },
    {
      name: "asaas-frontend",
      script: "npm",
      args: "run preview -- --host 0.0.0.0 --port 5180",
      cwd: path.join(__dirname, "frontend"),
      env: {
        NODE_ENV: "production"
      },
      restart_delay: 3000,
      max_restarts: 10
    }
  ]
};
