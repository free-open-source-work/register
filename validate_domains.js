require("dotenv").config();
const Joi = require("joi");
const fs = require("fs");
const domainSchema = Joi.object({
  path: Joi.string().required(),
  domain: Joi.object({
    type: Joi.string().required(),
    data: Joi.string().required()
  }).required(),
  contact: Joi.object({
    email: Joi.string().email().required()
  }).required()
});
function validateDomain(domainData) {
  const { error } = domainSchema.validate(domainData);
  if (error) {
    console.log("X", error.message);
    return false;
  }
  return true;
}
function getType(rawType) {
  let type = null;
  switch (rawType.toLowerCase()) {
    case "ip":
    case "a":
      type = "A";
      break;

    case "cname":
      type = "CNAME";
      break;
  }
  return type;
}
function fetchDomains() {
  const files = fs.readdirSync("./domains");
  return files
    .map((name) => {
      let json;

      try {
        json = JSON.parse(fs.readFileSync("./domains/" + name, "utf8"));
      } catch (e) {
        console.log(
          "X skipped " +
            name +
            " because it is not a valid json file - invalid json"
        );
        return false;
      }
      json.path = name.replace(".json", "");
      if (!validateDomain(json)) {
        console.log(
          "X skipped " +
            name +
            " because it is not a valid domain file - invalid schema"
        );
        return false;
      }
      console.log("+ loaded " + name);
      return json;
    })
    .filter(Boolean);
}
fetchDomains();
function formatName(str) {
  if (str.startsWith("@")) {
    return "open-source.work";
  } else {
    return str + ".open-source.work";
  }
}
