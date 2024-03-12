import yargs from "yargs";
import fs from "fs";

const options = yargs()
  .options({
    base: {
      description: "Json file with base coverage results.",
      type: "string",
      demandOption: true,
    },
    compare: {
      description: "Json file with coverage results to compare with base.",
      type: "string",
      demandOption: true,
    },
  })
  .parseSync(process.argv.slice(2));

const base = JSON.parse(fs.readFileSync(options.base, { encoding: "utf-8" }));
const compare = JSON.parse(
  fs.readFileSync(options.compare, { encoding: "utf-8" }),
);

const removedCoverage: string[] = [];
for (const [feature, featureCover] of Object.entries(base)) {
  const removedLangs: string[] = [];
  for (const [lang, result] of Object.entries(featureCover as any)) {
    if (result === true && compare[feature]?.[lang] === false) {
      removedLangs.push(lang);
    }
  }
  if (removedLangs.length > 0) {
    removedCoverage.push(`${feature}: ${removedLangs.join(", ")}`);
  }
}

if (removedCoverage.length > 0) {
  throw new Error(
    "Compared coverage is missing the following features from base:\n" +
      removedCoverage.join("\n"),
  );
}
