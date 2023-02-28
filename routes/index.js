const express = require("express");
const router = express.Router();
const axios = require("axios");
const registry = require("./registry.json");
const fs = require("fs");
const loadBalancer = require("../util/loadBalancer");

router.post("/enable/:apiName", (req, res) => {
  const apiName = req.params.apiName;

  const requestBody = req.body;

  const instances = registry.services[apiName].instances;

  const index = instances.findIndex((srv) => {
    return srv.url === requestBody.url;
  });

  if (index === -1) {
    res.send({
      status: "error",
      message:
        "Could not find '" +
        requestBody.url +
        "' for service '" +
        apiName +
        "'",
    });
  } else {
    instances[index].enabled = requestBody.enabled;

    fs.writeFile(
      "./routes/registry.json",
      JSON.stringify(registry),
      (error) => {
        if (error) {
          res.send(
            "Could not enable/disable '" +
              requestBody.url +
              "' for service '" +
              apiName +
              ":\n" +
              error
          );
        } else {
          res.send(
            "Successfully  enable/disable '" +
              requestBody.url +
              "' for service '" +
              apiName
          );
        }
      }
    );
  }
});

router.all("/:apiName/:path", (req, res) => {
  const service = registry.services[req.params.apiName];
  if (service) {
    if (!service.loadBalanceStrategy) {
      service.loadBalanceStrategy = "ROUND_ROBIN";

      fs.writeFile(
        "./routes/registry.json",
        JSON.stringify(registry),
        (error) => {
          if (error) {
            res.send("Could not write load balance strategy" + error);
          }
        }
      );
    }

    const newIndex = loadBalancer[service.loadBalanceStrategy](service);

    const url = service.instances[newIndex].url;

    console.log({ url });

    axios({
      method: req.method,
      url: url + req.params.path,
      headers: req.headers,
      data: req.body,
    })
      .then((response) => {
        res.send(response.data);
      })
      .catch((error) => {
        res.send("");
      });
  } else {
    res.send("API Name doesn't exist");
  }
});

router.post("/register", (req, res) => {
  const registrationInfo = req.body;

  registrationInfo.url =
    registrationInfo.protocol +
    "://" +
    registrationInfo.host +
    ":" +
    registrationInfo.port +
    "/";

  if (apiAlreadyExists(registrationInfo)) {
    res.send(
      "Configuration already exists for '" +
        registrationInfo.apiName +
        "' at '" +
        registrationInfo.url +
        "'"
    );
  } else {
    registry.services[registrationInfo.apiName].instances.push({
      ...registrationInfo,
    });

    fs.writeFile(
      "./routes/registry.json",
      JSON.stringify(registry),
      (error) => {
        if (error) {
          res.send(
            "Could not register " + registrationInfo.apiName + "\n" + error
          );
        } else {
          res.send("Successfully registered " + registrationInfo.apiName);
        }
      }
    );
  }
});

router.post("/unregister", (req, res) => {
  const registrationInfo = req.body;
  if (!apiAlreadyExists(registrationInfo)) {
    res.send(
      "Configuration does not exists for '" +
        registrationInfo.apiName +
        "' at '" +
        registrationInfo.url +
        "'"
    );
  } else {
    const index = registry.services[
      registrationInfo.apiName
    ].instances.findIndex((instance) => {
      return registrationInfo.url === instance.url;
    });

    registry.services[registrationInfo.apiName].instances.splice(index, 1);
    fs.writeFile(
      "./routes/registry.json",
      JSON.stringify(registry),
      (error) => {
        if (error) {
          res.send(
            "Could not register " + registrationInfo.apiName + "\n" + error
          );
        } else {
          res.send("Successfully unregistered " + registrationInfo.apiName);
        }
      }
    );
  }
});

const apiAlreadyExists = (registrationInfo) => {
  const apiNameArr = registry.services[registrationInfo.apiName].instances;

  for (let instance of apiNameArr) {
    if (instance.url === registrationInfo.url) return true;
  }

  return false;
};

module.exports = router;
