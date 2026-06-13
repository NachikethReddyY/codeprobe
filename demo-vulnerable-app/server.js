const express = require("express");
const ejs = require("ejs");
const app = express();

app.use(express.urlencoded({ extended: false }));

// Vulnerable endpoint: directly renders user input as template
app.get("/render", (req, res) => {
  const template = req.query.template || "Hello <%= name %>";

  try {
    // VULNERABLE: ejs.render() executes arbitrary code in templates
    // An attacker can inject: <%= require('child_process').execSync('id') %>
    const result = ejs.render(template, { name: "World" });
    res.send(`<pre>${result}</pre>`);
  } catch (error) {
    res.status(500).send(`<pre>Error: ${error.message}</pre>`);
  }
});

app.get("/", (req, res) => {
  res.send(`
    <h1>CodeProbe Demo - EJS Template Injection</h1>
    <p>This app uses EJS ${require("ejs/package.json").version}</p>
    <p>Visit: <a href="/render?template=&lt;%= 'VULNERABLE' %>">/render</a> to test</p>
    <p>Or send a template parameter to exploit</p>
  `);
});

const port = 3000;
app.listen(port, () => {
  console.log(`Demo app listening on http://localhost:${port}`);
  console.log(`Vulnerable ejs version: ${require("ejs/package.json").version}`);
});
