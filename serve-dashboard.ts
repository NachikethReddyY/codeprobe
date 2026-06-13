import { serve } from "bun";
import path from "path";

const distDir = "dist";

export default serve({
  port: 5173,
  fetch(req) {
    const url = new URL(req.url);
    let filePath = url.pathname;

    if (filePath === "/" || filePath === "") {
      filePath = "index.html";
    }

    const file = Bun.file(path.join(distDir, filePath));
    return file.exists().then(() => new Response(file));
  },
});

console.log("🎨 Dashboard serving on http://localhost:5173");
console.log("📡 API on http://localhost:3000");
console.log("📂 Serving: dist/");
