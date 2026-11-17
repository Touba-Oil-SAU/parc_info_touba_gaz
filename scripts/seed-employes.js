// ==============================================================================
// Script d'insertion des employés Touba Gaz IT
// Insère les employés et génère leurs comptes d'accès avec mot de passe haché
// ==============================================================================

const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
require("dotenv").config();

const EMPLOYES_DATA = [
  // Direction Commerciale & Marketing
  {
    prenom: "Al Assane",
    nom: "Samb",
    email: "alassane.samb@touba-oil.com",
    matricule: "26298",
    statut: 1,
    telephone: "123456789",
    departement: "Direction Commerciale Marketing",
    fonction: "Inspecteur Commercial",
    pwd: "Samb@2026",
  },
  {
    prenom: "Amath",
    nom: "Sissokho",
    email: "amath.sissokho@touba-oil.com",
    matricule: "26337",
    statut: 1,
    telephone: "775571826",
    departement: "Direction Commerciale Marketing",
    fonction: "Inspecteur Commercial",
    pwd: "Sissokho@2026",
  },
  {
    prenom: "Arame",
    nom: "Niang",
    email: "arame.niang@touba-oil.com",
    matricule: "26284",
    statut: 1,
    telephone: "776407616",
    departement: "Direction Commerciale Marketing",
    fonction: "Agent Commercial",
    pwd: "Niang@2026",
  },
  {
    prenom: "Babacar",
    nom: "Ndione",
    email: "babacar.ndione@touba-oil.com",
    matricule: "26273",
    statut: 1,
    telephone: "766451576",
    departement: "Direction Commerciale Marketing",
    fonction: "Responsable Commercial",
    pwd: "Ndione@2026",
  },
  {
    prenom: "Caty",
    nom: "Coulibaly",
    email: "mme.coulibaly@touba-oil.com",
    matricule: "25122",
    statut: 1,
    telephone: "338798716",
    departement: "Direction Commerciale Marketing",
    fonction: "Directrice Commerciale & Marketing",
    pwd: "Coulibaly@2026",
  },
  {
    prenom: "Cheikh Tidiane",
    nom: "Ndiaye",
    email: "cheikhtidiane.ndiaye@touba-oil.com",
    matricule: "26347",
    statut: 1,
    telephone: "000000000",
    departement: "Direction Commerciale Marketing",
    fonction: "Agent Commercial",
    pwd: "Ndiaye@2026",
  },
  {
    prenom: "Cheikhou",
    nom: "Bodiang",
    email: "cheikhou.bodiang@touba-oil.com",
    matricule: "26350",
    statut: 1,
    telephone: "+221766390974",
    departement: "Direction Commerciale Marketing",
    fonction: "Assistant Administratif des Ventes",
    pwd: "Bodiang@2026",
  },
  {
    prenom: "Mamadou",
    nom: "Diouf",
    email: "mamadou.diouf@touba-oil.com",
    matricule: "26300",
    statut: 1,
    telephone: "774376957",
    departement: "Direction Commerciale Marketing",
    fonction: "Responsable Administrative des Ventes",
    pwd: "Diouf@2026",
  },
  {
    prenom: "Thiaba",
    nom: "Sambe",
    email: "thiaba.sambe@touba-oil.com",
    matricule: "26343",
    statut: 1,
    telephone: "000000000",
    departement: "Direction Commerciale Marketing",
    fonction: "Agent Commercial",
    pwd: "Sambe@2026",
  },

  // Direction Ressources Humaines
  {
    prenom: "Bineta",
    nom: "Dieng",
    email: "bineta.dieng@touba-oil.com",
    matricule: "26309",
    statut: 1,
    telephone: "221000000",
    departement: "Direction Ressources Humaines",
    fonction: "Chargée des Ressources Humaines",
    pwd: "Dieng@2026",
  },
  {
    prenom: "Mariama",
    nom: "Bodian",
    email: "mariama.bodian@touba-oil.com",
    matricule: "26372",
    statut: 1,
    telephone: "221000000",
    departement: "Direction Ressources Humaines",
    fonction: "Assistante Ressources Humaines",
    pwd: "Bodian@2026",
  },
  {
    prenom: "Mbaye",
    nom: "Dieng",
    email: "archive.tg@touba-oil.com",
    matricule: "26340",
    statut: 1,
    telephone: "221000000",
    departement: "Direction Ressources Humaines",
    fonction: "Archiviste",
    pwd: "Dieng2@2026",
  },
];

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

async function main() {
  console.log("==> Démarrage de l'ajout des employés Touba Gaz...");
  let conn;

  try {
    conn = await getConnection();
    console.log("[OK] Connecté à la base de données.");

    // 1. S'assurer que les colonnes matricule et fonction existent
    try {
      await conn.query("ALTER TABLE `employes` ADD COLUMN `matricule` VARCHAR(50) NULL AFTER `id`;");
      console.log("[OK] Colonne matricule créée.");
    } catch (e) {
      if (e.code !== "ER_DUP_FIELDNAME") console.warn("Notice:", e.message);
    }

    try {
      await conn.query("ALTER TABLE `employes` ADD COLUMN `fonction` VARCHAR(150) NULL AFTER `prenom`;");
      console.log("[OK] Colonne fonction créée.");
    } catch (e) {
      if (e.code !== "ER_DUP_FIELDNAME") console.warn("Notice:", e.message);
    }

    // 2. Gestion des départements / services
    const servicesMap = new Map();
    const [existingServices] = await conn.query("SELECT id, nom FROM services;");
    for (const s of existingServices) {
      servicesMap.set(s.nom.toLowerCase().trim(), s.id);
    }

    const DEPARTEMENTS = [
      { id: "srv-comm-01", nom: "Direction Commerciale Marketing", desc: "Commercial, Marketing et Relations Clients" },
      { id: "srv-rh-01", nom: "Direction Ressources Humaines", desc: "Gestion des ressources humaines, paie et carrières" },
    ];

    for (const dep of DEPARTEMENTS) {
      const key = dep.nom.toLowerCase().trim();
      if (!servicesMap.has(key)) {
        await conn.query(
          "INSERT INTO services (id, nom, description, archive) VALUES (?, ?, ?, 0) ON DUPLICATE KEY UPDATE nom = VALUES(nom);",
          [dep.id, dep.nom, dep.desc]
        );
        servicesMap.set(key, dep.id);
        console.log(`[OK] Service '${dep.nom}' créé/vérifié.`);
      }
    }

    // 3. Insertion des employés et comptes utilisateurs
    let insertedCount = 0;
    let updatedCount = 0;

    for (const emp of EMPLOYES_DATA) {
      const cleanEmail = emp.email.toLowerCase().trim();
      const serviceId = servicesMap.get(emp.departement.toLowerCase().trim()) || null;

      // Compte d'accès utilisateur
      let userId = null;
      const [existingUser] = await conn.query("SELECT id FROM utilisateurs WHERE LOWER(email) = ?;", [cleanEmail]);

      if (existingUser.length > 0) {
        userId = existingUser[0].id;
        // Mettre à jour si nécessaire
        const pwdHash = await bcrypt.hash(emp.pwd, 10);
        await conn.query(
          "UPDATE utilisateurs SET nom = ?, prenom = ?, password_hash = ?, actif = 1 WHERE id = ?;",
          [emp.nom, emp.prenom, pwdHash, userId]
        );
      } else {
        userId = `usr-${crypto.randomUUID().slice(0, 8)}`;
        const pwdHash = await bcrypt.hash(emp.pwd, 10);
        await conn.query(
          "INSERT INTO utilisateurs (id, email, password_hash, nom, prenom, role, actif) VALUES (?, ?, ?, ?, ?, 'employe', 1);",
          [userId, cleanEmail, pwdHash, emp.nom, emp.prenom]
        );
        console.log(`[OK] Compte utilisateur créé pour ${emp.prenom} ${emp.nom} (${cleanEmail})`);
      }

      // Vérifier si l'employé existe déjà par matricule ou email
      const [existingEmp] = await conn.query(
        "SELECT id FROM employes WHERE matricule = ? OR LOWER(email) = ?;",
        [emp.matricule, cleanEmail]
      );

      if (existingEmp.length > 0) {
        const empId = existingEmp[0].id;
        await conn.query(
          `UPDATE employes 
           SET matricule = ?, nom = ?, prenom = ?, fonction = ?, email = ?, telephone = ?, service_id = ?, actif = ?, user_id = ?
           WHERE id = ?;`,
          [
            emp.matricule,
            emp.nom,
            emp.prenom,
            emp.fonction,
            cleanEmail,
            emp.telephone,
            serviceId,
            emp.statut,
            userId,
            empId,
          ]
        );
        updatedCount++;
      } else {
        const empId = `emp-${crypto.randomUUID().slice(0, 8)}`;
        await conn.query(
          `INSERT INTO employes (id, matricule, nom, prenom, fonction, email, telephone, service_id, actif, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            empId,
            emp.matricule,
            emp.nom,
            emp.prenom,
            emp.fonction,
            cleanEmail,
            emp.telephone,
            serviceId,
            emp.statut,
            userId,
          ]
        );
        insertedCount++;
        console.log(`[+] Employé ajouté : ${emp.prenom} ${emp.nom} - Mat: ${emp.matricule} - ${emp.fonction}`);
      }
    }

    console.log("\n==============================================================");
    console.log(`✅ [SUCCÈS] Opération terminée : ${insertedCount} ajouté(s), ${updatedCount} mis à jour.`);
    console.log("==============================================================");
  } catch (err) {
    console.error("\n❌ [ERREUR] :", err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

main();
