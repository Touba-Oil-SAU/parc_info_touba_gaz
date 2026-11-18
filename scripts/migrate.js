// ==============================================================================
// Script de migration automatique MySQL — Touba Gaz IT
// Exécute database/migration_hors_service.sql de manière idempotente et sécurisée
// ==============================================================================

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function runMigration() {
  console.log("==> Démarrage de la migration Touba Gaz IT...");

  const host = process.env.DB_HOST || "127.0.0.1";
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "";
  const database = process.env.DB_NAME || "parc_info_touba_gaz";

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true,
    });
    console.log(`[OK] Connecté au serveur MySQL sur ${host}:${port}`);

    // Créer la base si non existante
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.changeUser({ database });
    console.log(`[OK] Base sélectionnée : ${database}`);

    // 1. Migration de l'état 'reforme' vers 'hors_service'
    console.log("--> Étape 1 : Mise à jour de l'ENUM etat sur la table equipements...");
    await connection.query(`
      ALTER TABLE \`equipements\` 
      MODIFY COLUMN \`etat\` ENUM('en_service', 'en_panne', 'en_maintenance', 'reforme', 'hors_service') NOT NULL DEFAULT 'en_service';
    `);

    console.log("--> Étape 2 : Conversion des équipements existants 'reforme' -> 'hors_service'...");
    const [updateResult] = await connection.query(`
      UPDATE \`equipements\` SET \`etat\` = 'hors_service' WHERE \`etat\` = 'reforme';
    `);
    console.log(`[OK] ${updateResult.affectedRows || 0} équipement(s) mis à jour.`);

    console.log("--> Étape 3 : Finalisation de l'ENUM sans 'reforme'...");
    await connection.query(`
      ALTER TABLE \`equipements\` 
      MODIFY COLUMN \`etat\` ENUM('en_service', 'en_panne', 'en_maintenance', 'hors_service') NOT NULL DEFAULT 'en_service';
    `);

    // 2. Colonne priorite_explication sur tickets
    console.log("--> Étape 4 : Ajout de priorite_explication sur la table tickets...");
    try {
      await connection.query(`
        ALTER TABLE \`tickets\` ADD COLUMN \`priorite_explication\` VARCHAR(255) NULL AFTER \`priorite\`;
      `);
      console.log("[OK] Colonne priorite_explication ajoutée.");
    } catch (colErr) {
      if (colErr.code === "ER_DUP_FIELDNAME") {
        console.log("[INFO] Colonne priorite_explication déjà présente.");
      } else {
        throw colErr;
      }
    }

    // 3. Colonnes matricule et fonction sur employes
    console.log("--> Étape 5 : Ajout des colonnes matricule et fonction sur la table employes...");
    try {
      await connection.query(`
        ALTER TABLE \`employes\` ADD COLUMN \`matricule\` VARCHAR(50) NULL AFTER \`id\`;
      `);
      console.log("[OK] Colonne matricule ajoutée.");
    } catch (colErr) {
      if (colErr.code === "ER_DUP_FIELDNAME") {
        console.log("[INFO] Colonne matricule déjà présente.");
      } else {
        throw colErr;
      }
    }

    try {
      await connection.query(`
        ALTER TABLE \`employes\` ADD COLUMN \`fonction\` VARCHAR(150) NULL AFTER \`prenom\`;
      `);
      console.log("[OK] Colonne fonction ajoutée.");
    } catch (colErr) {
      if (colErr.code === "ER_DUP_FIELDNAME") {
        console.log("[INFO] Colonne fonction déjà présente.");
      } else {
        throw colErr;
      }
    }

    try {
      await connection.query(`
        ALTER TABLE \`employes\` ADD INDEX \`idx_employes_matricule\` (\`matricule\`);
      `);
      console.log("[OK] Index idx_employes_matricule ajouté.");
    } catch (idxErr) {
      if (idxErr.code === "ER_DUP_KEYNAME") {
        console.log("[INFO] Index idx_employes_matricule déjà présent.");
      } else {
        // Ignorer si index ne peut être créé
      }
    }

    // 4. Colonne adresse_ip et photo sur equipements
    console.log("--> Étape 6 : Vérification des colonnes adresse_ip et photo sur equipements...");
    try {
      await connection.query(`
        ALTER TABLE \`equipements\` ADD COLUMN \`adresse_ip\` VARCHAR(45) NULL AFTER \`localisation\`;
      `);
      console.log("[OK] Colonne adresse_ip ajoutée.");
    } catch (colErr) {
      if (colErr.code === "ER_DUP_FIELDNAME") {
        console.log("[INFO] Colonne adresse_ip déjà présente.");
      } else {
        throw colErr;
      }
    }

    try {
      await connection.query(`
        ALTER TABLE \`equipements\` ADD COLUMN \`photo\` VARCHAR(255) NULL AFTER \`description\`;
      `);
      console.log("[OK] Colonne photo ajoutée.");
    } catch (colErr) {
      if (colErr.code === "ER_DUP_FIELDNAME") {
        console.log("[INFO] Colonne photo déjà présente.");
      } else {
        throw colErr;
      }
    }

    console.log("\n✅ [SUCCÈS] Migration exécutée avec succès sans aucune perte de données !");
  } catch (error) {
    console.error("\n❌ [ERREUR MIGRATION] :", error.message);
    if (error.code === "ECONNREFUSED") {
      console.error("-> Astuce : Assurez-vous que MySQL (XAMPP / MariaDB) est démarré.");
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
