const express = require("express");
const helmet = require("helmet");
const app = express();
const registry = require("./routes/registry.json");
const routes = require("./routes");
const PORT = 3000;

app.use(express.json());
app.use(helmet());

const auth = (req, res, next) => {
  const url = req.protocol + "://" + req.hostname + PORT + req.path;
  const authString = Buffer.from(req.headers.authorization, "base64").toString(
    "utf8"
  );
  const authParts = authString.split(":");

  const username = authParts[0];
  const password = authParts[1];

  console.log(username, password);

  const user = registry.auth.users[username];

  if (user) {
    if (user.username === username && user.password === password) {
      next();
    } else {
      res.send({
        authenticated: false,
        path: url,
        message: "Authenticated unsuccessful: Incorrect Password",
      });
    }
  } else {
    res.send({
      authenticated: false,
      path: url,
      message:
        "Authenticated unsuccessful: User" + username + " does not exists",
    });
  }
};

app.use(auth);

app.use("/", routes);

app.listen(PORT, () => {
  console.log(`Gateway has started on port: ${PORT}`);
});
