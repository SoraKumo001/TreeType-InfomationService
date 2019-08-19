
module.exports =
  {
    apps: [
      {
        name: "ttis",
        script: "./dist/app/index.js",
        watch: ["./dist/app"],
        instances: 2,
        exec_mode: "cluster_mode",
        log_date_format: "YYYY-MM-DD HH:mm Z",
        merge_logs: true,
        error_file: "./dist/log/error.log",
        out_file: "./dist/log/access.log",
        node_args: ["--no-warnings"],
        env: {
          NODE_OPTIONS: ["--no-warnings","--preserve-symlinks"]
        }
      }
    ]
  };

const cluster = require('cluster');
cluster.on("message", ((worker, value) => {
  if (value.type === 'process:msg') {
    for (const worker2 of Object.values(cluster.workers)) {
      if (worker.process.pid !== worker2.process.pid) {
        worker2.send(value.data);
      }
    }
  }
}))
