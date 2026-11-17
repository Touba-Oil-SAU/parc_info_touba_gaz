// ==============================================================================
// Script de nettoyage des équipements — Touba Gaz IT
// Vide entièrement la table des équipements et détache les références existantes
// ==============================================================================

const mysql = require("mysql2/promise");
require("dotenv").config();

async function getConnection() {
  if (process.env.DATABASE_URL) {
    return await mysql.createConnection({
      uri: process.env.DATABASE_URL,
      charset: "utf8mb4",
    });
  }
  return await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "parc_info_touba_gaz",
    charset: "utf8mb4",
  });
}

async function clearEquipements() {
  console.log("==> Vidage complet de la base côté équipements...");
  let conn;

  try {
    conn = await getConnection();
    console.log("[OK] Connecté à la base de données.");

    // Désactiver temporairement les contraintes de clés étrangères
    await conn.query("SET FOREIGN_KEY_CHECKS = 0;");

    // 1. Détacher les équipements des tickets
    const [ticketsRes] = await conn.query("UPDATE `tickets` SET `equipement_id` = NULL WHERE `equipement_id` IS NOT NULL;");
    console.log(`[OK] Tickets détachés : ${ticketsRes.affectedRows || 0}`);

    // 2. Supprimer les affectations liées aux équipements
    const [affRes] = await conn.query("DELETE FROM `affectations`;");
    console.log(`[OK] Affectations supprimées : ${affRes.affectedRows || 0}`);

    // 3. Vider la table des équipements et réinitialiser l'auto-incrément
    const [eqRes] = await conn.query("DELETE FROM `equipements`;");
    console.log(`[OK] Équipements supprimés : ${eqRes.affectedRows || 0}`);

    try {
      await conn.query("ALTER TABLE `equipements` AUTO_INCREMENT = 1;");
      console.log("[OK] Compteur auto-incrément réinitialisé à 1.");
    } catch {
      // Ignorer si déjà à 1
    }

    // Réactiver les contraintes de clés étrangères
    await conn.query("SET FOREIGN_KEY_CHECKS = 1;");

    console.log("\n✅ [SUCCÈS] La table des équipements est désormais complètement vide !");
  } catch (error) {
    console.error("\n❌ [ERREUR] :", error.message);
    process.exit(1);
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}

clearEquipements();
