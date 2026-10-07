/* Charge le moteur v4 et le catalogue dans Node (sans navigateur). Utilisé par les tests et l'audit. */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "..");
["reglages", "questions", "mesure", "match", "propositions"].forEach(f => require(path.join(ROOT, "moteur", f + ".js")));
const QC = globalThis.QC;

function chargerCatalogue(fichier) {
  const p = fichier || path.join(ROOT, "data", "commanders.json");
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  QC.preparer(data.cards);
  return data;
}
module.exports = { QC, chargerCatalogue, ROOT };
