const http = require("node:http");

const port = Number(process.env.PORT || 8080);

const server = http.createServer((req, res) => {
  // Placeholder endpoint for compose bootstrap. Later P0 issues replace this.
  res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  res.end(
    JSON.stringify({
      ok: true,
      service: "codexbox",
      message: "Placeholder server for compose bootstrap.",
      path: req.url,
    }),
  );
});

server.listen(port, "0.0.0.0", () => {
  console.log(`codexbox placeholder listening on ${port}`);
});
