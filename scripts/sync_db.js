// ==============================================================================
// Script de synchronisation MySQL — Touba Gaz IT
// Permet de synchroniser les données entre la base distante et la base locale
// Usage :
//   node scripts/sync_db.js --pull   (Distant -> Local, par défaut)
//   node scripts/sync_db.js --push   (Local -> Distant)
// ==============================================================================

const mysql = require("mysql2/promise");
require("dotenv").config();

const TABLES = [
  "services",
  "utilisateurs",
  "employes",
  "equipements",
  "affectations",
  "tickets",
  "interventions",
  "ticket_attachments",
  "notifications",
  "journal_audit",
];

const LOCAL_CONFIG = {
  host: process.env.LOCAL_DB_HOST || "127.0.0.1",
  port: Number(process.env.LOCAL_DB_PORT || 3306),
  user: process.env.LOCAL_DB_USER || "root",
  password: process.env.LOCAL_DB_PASSWORD || "",
  database: process.env.LOCAL_DB_NAME || "parc_info_touba_gaz",
  charset: "utf8mb4",
};

async function getRemoteConnection() {
  if (process.env.DATABASE_URL) {
    return await mysql.createConnection({
      uri: process.env.DATABASE_URL,
      charset: "utf8mb4",
    });
  }
  return await mysql.createConnection({
    host: process.env.DB_HOST || "145.223.33.29",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "mysql",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "default",
    charset: "utf8mb4",
  });
}

async function getLocalConnection() {
  return await mysql.createConnection(LOCAL_CONFIG);
}

function sanitizeValue(val) {
  if (val === undefined) return null;
  if (val instanceof Date) return val;
  if (typeof val === "object" && val !== null) {
    return JSON.stringify(val);
  }
  return val;
}

async function syncTable(sourceConn, targetConn, table) {
  process.stdout.write(`  ⏳ Synchronisation de la table '${table}'... `);

  // 1. Récupérer les données de la source
  const [rows] = await sourceConn.query(`SELECT * FROM \`${table}\``);

  if (rows.length === 0) {
    // Vider la table cible si la source est vide
    await targetConn.query(`DELETE FROM \`${table}\``);
    console.log(`[0 ligne(s) - Table vidée]`);
    return;
  }

  // 2. Préparer les colonnes et valeurs
  const columns = Object.keys(rows[0]);
  const colSql = columns.map((c) => `\`${c}\``).join(", ");
  const placeholders = columns.map(() => "?").join(", ");

  // 3. Vider la table cible proprement
  await targetConn.query(`DELETE FROM \`${table}\``);

  // 4. Insérer par lots de 50 enregistrements
  const BATCH_SIZE = 50;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    for (const row of batch) {
      const values = columns.map((col) => sanitizeValue(row[col]));
      await targetConn.query(
        `INSERT INTO \`${table}\` (${colSql}) VALUES (${placeholders})`,
        values
      );
    }
  }

  console.log(`[OK : ${rows.length} enregistrement(s) transféré(s)]`);
}

async function main() {
  const isPush = process.argv.includes("--push");
  const direction = isPush
    ? "LOCAL (127.0.0.1)  ===>  DISTANT (Serveur)"
    : "DISTANT (Serveur)  ===>  LOCAL (127.0.0.1)";

  console.log("==============================================================");
  console.log("  SYNCHRONISATION BASE DE DONNÉES — TOUBA GAZ IT");
  console.log(`  Direction : ${direction}`);
  console.log("==============================================================\n");

  let remoteConn;
  let localConn;

  try {
    process.stdout.write("--> Connexion à la base distante... ");
    remoteConn = await getRemoteConnection();
    console.log("[CONNECTÉ]");

    process.stdout.write("--> Connexion à la base locale... ");
    localConn = await getLocalConnection();
    console.log("[CONNECTÉ]\n");

    const sourceConn = isPush ? localConn : remoteConn;
    const targetConn = isPush ? remoteConn : localConn;

    // Désactiver les contraintes de clés étrangères sur la cible pendant la synchro
    await targetConn.query("SET FOREIGN_KEY_CHECKS = 0;");

    for (const table of TABLES) {
      try {
        await syncTable(sourceConn, targetConn, table);
      } catch (tableErr) {
        console.error(`\n  ⚠️  Erreur sur la table '${table}' : ${tableErr.message}`);
      }
    }

    // Réactiver les contraintes
    await targetConn.query("SET FOREIGN_KEY_CHECKS = 1;");

    console.log("\n==============================================================");
    console.log("  [SUCCÈS] Synchronisation terminée avec succès !");
    console.log("==============================================================");
  } catch (err) {
    console.error("\n❌ Erreur de synchronisation :", err.message);
    process.exit(1);
  } finally {
    if (remoteConn) await remoteConn.end();
    if (localConn) await localConn.end();
  }
}

main();
