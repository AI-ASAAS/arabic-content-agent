const path = require("path");

module.exports = {
  apps: [
    {
      name: "asaas-agent-backend",
      script: process.platform === "win32"
        ? path.join(__dirname, "backend", ".venv", "Scripts", "uvicorn.exe")
        : path.join(__dirname, "backend", ".venv", "bin", "uvicorn"),
      args: "main:app --host 0.0.0.0 --port 8085",
      cwd: path.join(__dirname, "backend"),
      env: {
        BACKEND_PORT: process.env.BACKEND_PORT || "8085",
      },
      restart_delay: 3000,
      max_restarts: 10,
    },
    {
      name: "asaas-agent-frontend",
      script: "npm",
      args: "run preview -- --host 0.0.0.0 --port 5180",
      cwd: path.join(__dirname, "frontend"),
      env: {
        NODE_ENV: "production",
      },
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
