const mysql = require("mysql2/promise");
require("dotenv").config();

async function clean() {
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    multipleStatements: true,
  });

  console.log("Connected to MySQL. Cleaning database...");

  // Désactiver temporairement les contraintes de clés étrangères pour nettoyer proprement
  await conn.query("SET FOREIGN_KEY_CHECKS = 0;");

  // 1. Vider les pièces jointes, interventions, notifications, tickets, affectations, équipements, journal
  console.log("Suppression des tickets, interventions, équipements, affectations, etc.");
  await conn.query("TRUNCATE TABLE `ticket_attachments`;");
  await conn.query("TRUNCATE TABLE `interventions`;");
  await conn.query("TRUNCATE TABLE `notifications`;");
  await conn.query("TRUNCATE TABLE `tickets`;");
  await conn.query("TRUNCATE TABLE `affectations`;");
  await conn.query("TRUNCATE TABLE `equipements`;");
  await conn.query("TRUNCATE TABLE `journal_audit`;");

  // 2. Nettoyer les utilisateurs et ne garder QUE le compte admin
  console.log("Suppression des utilisateurs non-admin...");
  await conn.query("DELETE FROM `utilisateurs` WHERE `role` != 'admin' AND `id` != 'usr-admin-01';");

  // Vérifier et s'assurer que le compte admin existe et est actif
  await conn.query(`
    INSERT INTO \`utilisateurs\` (\`id\`, \`email\`, \`password_hash\`, \`nom\`, \`prenom\`, \`role\`, \`actif\`)
    VALUES
      ('usr-admin-01', 'admin@toubagaz.sn', '$2b$10$eCMBB2iLzEXzvRvcdI7r2.ltIpfEP9DbtIcv6ohUFC4njZFth2wXS', 'Admin', 'Touba Gaz IT', 'admin', 1)
    ON DUPLICATE KEY UPDATE \`actif\` = 1, \`role\` = 'admin';
  `);

  // 3. Nettoyer les employés et ne garder QUE l'employé lié à l'admin
  console.log("Suppression des employés sauf l'administrateur...");
  await conn.query("DELETE FROM `employes` WHERE `user_id` != 'usr-admin-01' OR `user_id` IS NULL;");

  // S'assurer que l'employé admin existe
  await conn.query(`
    INSERT INTO \`employes\` (\`id\`, \`nom\`, \`prenom\`, \`email\`, \`telephone\`, \`service_id\`, \`actif\`, \`user_id\`)
    VALUES
      ('emp-admin-01', 'Admin', 'Système', 'admin@toubagaz.sn', '+221 33 000 00 00', 'srv-002', 1, 'usr-admin-01')
    ON DUPLICATE KEY UPDATE \`actif\` = 1, \`user_id\` = 'usr-admin-01';
  `);

  // Réactiver les contraintes de clés étrangères
  await conn.query("SET FOREIGN_KEY_CHECKS = 1;");

  console.log("\n--- BILAN DE LA BASE DE DONNÉES ---");
  const tables = [
    "utilisateurs",
    "employes",
    "services",
    "equipements",
    "affectations",
    "tickets",
    "interventions",
    "ticket_attachments",
    "notifications",
    "journal_audit"
  ];

  for (const t of tables) {
    const [rows] = await conn.query(`SELECT COUNT(*) as c FROM \`${t}\``);
    console.log(`${t}: ${rows[0].c} enregistrement(s)`);
  }

  const [users] = await conn.query("SELECT id, email, nom, prenom, role FROM `utilisateurs`");
  console.log("\nUtilisateurs restants :", users);

  const [employes] = await conn.query("SELECT id, email, nom, prenom, user_id FROM `employes`");
  console.log("Employés restants :", employes);

  await conn.end();
  console.log("\nNettoyage terminé avec succès !");
}

clean().catch(err => {
  console.error("Erreur lors du nettoyage :", err);
  process.exit(1);
});
