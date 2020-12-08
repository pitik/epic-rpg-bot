const express = require("express");
const bodyParser = require("body-parser");

const isRpg = process.env.IS_RPG || false;

if (isRpg) {
  require("./interval");
} else {
  require("./interval-bot");
}

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.json({ status: "OK", date: new Date() });
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
