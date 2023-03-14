require("dotenv").config();
const Joi = require("joi");
const fs = require("fs");
const Cloudflare = require("cloudflare");
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
const domains = fetchDomains();
function formatName(str) {
  if (str.startsWith("@")) {
    return "open-source.work";
  } else {
    return str + ".open-source.work";
  }
}
var cf = Cloudflare({
  token: process.env.CF_TOKEN
});

async function main() {
  const domainscf = await cf.dnsRecords
    .browse(process.env.ZONE_ID)
    .then((e) => {
      return new Map(
        e.result.filter((f) => getType(f.type)).map((obj) => [obj.name, obj])
      );
    });
  domains.forEach((domainData) => {
    if (domainscf.get(formatName(domainData.path))) {
      console.log("/ not modifying domain", formatName(domainData.path));
      domainscf.delete(formatName(domainData.path));
      return;
    }
    const body = {
      content: domainData.domain.data,
      name: formatName(domainData.path),
      proxied: false,
      type: getType(domainData.domain.type),
      comment: `domain from github requested by ${domainData.contact.email}`,
      ttl: 1
    };
    domainscf.delete(formatName(domainData.path));
    cf.dnsRecords.add(process.env.ZONE_ID, body).then((e) => {
      console.log("+ Added domain", formatName(domainData.path));
    });
  });
  domainscf.forEach((domainData) => {
    cf.dnsRecords
      .del(process.env.ZONE_ID, domainData.id)
      .then((e) => {
        console.log("- Removed domain", domainData.name);
      });
  });
}

main();
