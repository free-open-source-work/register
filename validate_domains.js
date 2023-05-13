require("dotenv").config();
const Joi = require("joi");
const fs = require("fs");
const regexes = require("./restricted_domains.js")
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
  for (const regex of regexes) {
    if(new RegExp(regex, "i").test(domainData.path)) return "Failed to regex /"+regex+"/i" ;
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
      default: 
    type = rawType.toUpperCase();
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