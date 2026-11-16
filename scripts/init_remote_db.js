const mysql = require("mysql2/promise");
require("dotenv").config();

async function init() {
  console.log("Connecting to remote database...");
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    multipleStatements: true,
  });

  console.log("Connected to MySQL! Creating tables...");

  // 1. Table des utilisateurs
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`utilisateurs\` (
      \`id\` VARCHAR(36) NOT NULL,
      \`email\` VARCHAR(191) NOT NULL,
      \`password_hash\` VARCHAR(255) NOT NULL,
      \`nom\` VARCHAR(100) NOT NULL,
      \`prenom\` VARCHAR(100) NOT NULL,
      \`role\` ENUM('admin', 'employe') NOT NULL DEFAULT 'employe',
      \`actif\` TINYINT(1) NOT NULL DEFAULT 1,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`idx_utilisateurs_email\` (\`email\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Table des services
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`services\` (
      \`id\` VARCHAR(36) NOT NULL,
      \`nom\` VARCHAR(120) NOT NULL,
      \`description\` TEXT NULL,
      \`archive\` TINYINT(1) NOT NULL DEFAULT 0,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`idx_services_nom\` (\`nom\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. Table des employés
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`employes\` (
      \`id\` VARCHAR(36) NOT NULL,
      \`nom\` VARCHAR(100) NOT NULL,
      \`prenom\` VARCHAR(100) NOT NULL,
      \`email\` VARCHAR(191) NULL,
      \`telephone\` VARCHAR(30) NULL,
      \`service_id\` VARCHAR(36) NULL,
      \`actif\` TINYINT(1) NOT NULL DEFAULT 1,
      \`user_id\` VARCHAR(36) NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`idx_employes_email\` (\`email\`),
      UNIQUE KEY \`idx_employes_user_id\` (\`user_id\`),
      KEY \`fk_employes_service\` (\`service_id\`),
      CONSTRAINT \`fk_employes_service\` FOREIGN KEY (\`service_id\`)
        REFERENCES \`services\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`fk_employes_utilisateur\` FOREIGN KEY (\`user_id\`)
        REFERENCES \`utilisateurs\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. Table des équipements
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`equipements\` (
      \`id\` VARCHAR(36) NOT NULL,
      \`code\` INT NOT NULL AUTO_INCREMENT,
      \`type\` VARCHAR(80) NOT NULL,
      \`marque\` VARCHAR(100) NULL,
      \`modele\` VARCHAR(100) NULL,
      \`numero_serie\` VARCHAR(100) NULL,
      \`date_achat\` DATE NULL,
      \`etat\` ENUM('en_service', 'en_panne', 'en_maintenance', 'hors_service') NOT NULL DEFAULT 'en_service',
      \`localisation\` VARCHAR(150) NULL,
      \`description\` TEXT NULL,
      \`photo\` VARCHAR(255) NULL,
      \`archive\` TINYINT(1) NOT NULL DEFAULT 0,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`idx_equipements_code\` (\`code\`),
      UNIQUE KEY \`idx_equipements_num_serie\` (\`numero_serie\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5. Table des affectations
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`affectations\` (
      \`id\` VARCHAR(36) NOT NULL,
      \`equipement_id\` VARCHAR(36) NOT NULL,
      \`employe_id\` VARCHAR(36) NULL,
      \`service_id\` VARCHAR(36) NULL,
      \`date_debut\` DATE NOT NULL,
      \`date_fin\` DATE NULL,
      \`commentaire\` TEXT NULL,
      \`auteur_id\` VARCHAR(36) NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`fk_affectations_equipement\` (\`equipement_id\`),
      KEY \`fk_affectations_employe\` (\`employe_id\`),
      KEY \`fk_affectations_service\` (\`service_id\`),
      CONSTRAINT \`fk_affectations_equipement\` FOREIGN KEY (\`equipement_id\`)
        REFERENCES \`equipements\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`fk_affectations_employe\` FOREIGN KEY (\`employe_id\`)
        REFERENCES \`employes\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`fk_affectations_service\` FOREIGN KEY (\`service_id\`)
        REFERENCES \`services\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 6. Table des tickets
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`tickets\` (
      \`id\` VARCHAR(36) NOT NULL,
      \`numero\` INT NOT NULL AUTO_INCREMENT,
      \`demandeur_id\` VARCHAR(36) NOT NULL,
      \`service_id\` VARCHAR(36) NULL,
      \`description\` TEXT NULL,
      \`categorie\` VARCHAR(100) NOT NULL,
      \`priorite\` ENUM('basse', 'normale', 'haute', 'critique') NOT NULL DEFAULT 'normale',
      \`priorite_explication\` VARCHAR(255) NULL,
      \`canal\` ENUM('application', 'telephone', 'email', 'presentiel') NOT NULL DEFAULT 'application',
      \`equipement_id\` VARCHAR(36) NULL,
      \`statut\` ENUM('nouveau', 'en_cours', 'en_attente', 'resolu', 'cloture') NOT NULL DEFAULT 'nouveau',
      \`date_resolution\` DATETIME NULL,
      \`date_cloture\` DATETIME NULL,
      \`cree_par\` VARCHAR(36) NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`idx_tickets_numero\` (\`numero\`),
      KEY \`fk_tickets_demandeur\` (\`demandeur_id\`),
      KEY \`fk_tickets_service\` (\`service_id\`),
      KEY \`fk_tickets_equipement\` (\`equipement_id\`),
      CONSTRAINT \`fk_tickets_demandeur\` FOREIGN KEY (\`demandeur_id\`)
        REFERENCES \`employes\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`fk_tickets_service\` FOREIGN KEY (\`service_id\`)
        REFERENCES \`services\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT \`fk_tickets_equipement\` FOREIGN KEY (\`equipement_id\`)
        REFERENCES \`equipements\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 7. Table des interventions
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`interventions\` (
      \`id\` VARCHAR(36) NOT NULL,
      \`ticket_id\` VARCHAR(36) NOT NULL,
      \`debut\` DATETIME NOT NULL,
      \`fin\` DATETIME NOT NULL,
      \`actions\` TEXT NOT NULL,
      \`resultat\` TEXT NULL,
      \`auteur_id\` VARCHAR(36) NOT NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`idx_interventions_ticket\` (\`ticket_id\`),
      CONSTRAINT \`fk_interventions_ticket\` FOREIGN KEY (\`ticket_id\`)
        REFERENCES \`tickets\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 8. Table d'audit
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`journal_audit\` (
      \`id\` BIGINT NOT NULL AUTO_INCREMENT,
      \`table_nom\` VARCHAR(100) NOT NULL,
      \`enregistrement_id\` VARCHAR(64) NULL,
      \`action\` VARCHAR(50) NOT NULL,
      \`details\` JSON NULL,
      \`auteur_id\` VARCHAR(36) NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_audit_table\` (\`table_nom\`),
      KEY \`idx_audit_created\` (\`created_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 9. Table des notifications
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`notifications\` (
      \`id\` VARCHAR(36) PRIMARY KEY,
      \`user_id\` VARCHAR(36) NOT NULL,
      \`ticket_id\` VARCHAR(36) NULL,
      \`titre\` VARCHAR(255) NOT NULL,
      \`message\` TEXT NOT NULL,
      \`type\` VARCHAR(50) NOT NULL DEFAULT 'ticket',
      \`lu\` TINYINT(1) NOT NULL DEFAULT 0,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX \`idx_user_lu\` (\`user_id\`, \`lu\`),
      INDEX \`idx_ticket\` (\`ticket_id\`),
      CONSTRAINT \`fk_notif_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`utilisateurs\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`fk_notif_ticket\` FOREIGN KEY (\`ticket_id\`) REFERENCES \`tickets\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 10. Table ticket_attachments
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`ticket_attachments\` (
      \`id\` VARCHAR(36) NOT NULL,
      \`ticket_id\` VARCHAR(36) NOT NULL,
      \`original_name\` VARCHAR(255) NOT NULL,
      \`storage_key\` VARCHAR(255) NOT NULL,
      \`mime_type\` VARCHAR(100) NOT NULL,
      \`size_bytes\` INT UNSIGNED NOT NULL DEFAULT 0,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_ticket_id\` (\`ticket_id\`),
      CONSTRAINT \`fk_attachment_ticket\` FOREIGN KEY (\`ticket_id\`) REFERENCES \`tickets\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log("All tables created successfully!");

  // Services initiaux
  await conn.query(`
    INSERT INTO \`services\` (\`id\`, \`nom\`, \`description\`, \`archive\`)
    VALUES
      ('srv-001', 'Direction Générale', 'Direction générale et stratégique de Touba Gaz', 0),
      ('srv-002', 'Service Informatique', 'Support technique, maintenance et infrastructure IT', 0),
      ('srv-003', 'Comptabilité & Finances', 'Gestion comptable, facturation et finances', 0),
      ('srv-004', 'Logistique & Exploitation Gaz', 'Centre emplisseur, distribution et logistique gaz', 0),
      ('srv-005', 'Ressources Humaines', 'Gestion du personnel et paie', 0)
    ON DUPLICATE KEY UPDATE \`nom\` = VALUES(\`nom\`);
  `);

  // Utilisateur Admin initial (admin@toubagaz.sn / ToubaGaz@2026 et admin123)
  await conn.query(`
    INSERT INTO \`utilisateurs\` (\`id\`, \`email\`, \`password_hash\`, \`nom\`, \`prenom\`, \`role\`, \`actif\`)
    VALUES
      ('usr-admin-01', 'admin@toubagaz.sn', '$2b$10$eCMBB2iLzEXzvRvcdI7r2.ltIpfEP9DbtIcv6ohUFC4njZFth2wXS', 'Admin', 'Touba Gaz IT', 'admin', 1)
    ON DUPLICATE KEY UPDATE \`email\` = VALUES(\`email\`);
  `);

  // Employé Admin initial
  await conn.query(`
    INSERT INTO \`employes\` (\`id\`, \`nom\`, \`prenom\`, \`email\`, \`telephone\`, \`service_id\`, \`actif\`, \`user_id\`)
    VALUES
      ('emp-admin-01', 'Diop', 'Mamy', 'admin@toubagaz.sn', '+221 77 123 45 67', 'srv-002', 1, 'usr-admin-01')
    ON DUPLICATE KEY UPDATE \`email\` = VALUES(\`email\`);
  `);

  // Employé de démonstration avec compte utilisateur pour l'espace employé (abisene@toubagaz.sn)
  await conn.query(`
    INSERT INTO \`utilisateurs\` (\`id\`, \`email\`, \`password_hash\`, \`nom\`, \`prenom\`, \`role\`, \`actif\`)
    VALUES
      ('usr-employe-01', 'abisene@toubagaz.sn', '$2b$10$eCMBB2iLzEXzvRvcdI7r2.ltIpfEP9DbtIcv6ohUFC4njZFth2wXS', 'Sène', 'Abi', 'employe', 1)
    ON DUPLICATE KEY UPDATE \`email\` = VALUES(\`email\`);
  `);

  await conn.query(`
    INSERT INTO \`employes\` (\`id\`, \`nom\`, \`prenom\`, \`email\`, \`telephone\`, \`service_id\`, \`actif\`, \`user_id\`)
    VALUES
      ('emp-employe-01', 'Sène', 'Abi', 'abisene@toubagaz.sn', '+221 77 987 65 43', 'srv-001', 1, 'usr-employe-01'),
      ('emp-002', 'Ndiaye', 'Fatou', 'fatou.ndiaye@toubagaz.sn', '+221 77 234 56 78', 'srv-003', 1, NULL),
      ('emp-003', 'Ba', 'Amadou', 'amadou.ba@toubagaz.sn', '+221 78 345 67 89', 'srv-004', 1, NULL),
      ('emp-004', 'Fall', 'Awa', 'awa.fall@toubagaz.sn', '+221 76 456 78 90', 'srv-005', 1, NULL),
      ('emp-005', 'Sène', 'Cheikh', 'cheikh.sene@toubagaz.sn', '+221 77 567 89 01', 'srv-001', 1, NULL),
      ('emp-006', 'Sow', 'Ibrahima', 'ibrahima.sow@toubagaz.sn', '+221 78 678 90 12', 'srv-004', 1, NULL)
    ON DUPLICATE KEY UPDATE \`nom\` = VALUES(\`nom\`), \`service_id\` = VALUES(\`service_id\`);
  `);

  // Équipements de référence
  await conn.query(`
    INSERT INTO \`equipements\` (\`id\`, \`type\`, \`marque\`, \`modele\`, \`numero_serie\`, \`date_achat\`, \`etat\`, \`localisation\`, \`description\`, \`archive\`)
    VALUES
      ('eq-001', 'Ordinateur portable', 'Dell', 'Latitude 5420', 'SN-DELL-88219', '2023-03-15', 'en_service', 'Bureau Informatique', 'Core i7, 16 Go RAM, SSD 512 Go', 0),
      ('eq-002', 'Ordinateur portable', 'HP', 'EliteBook 840 G8', 'SN-HP-99321', '2023-05-20', 'en_service', 'Service Comptabilité', 'Core i5, 16 Go RAM, SSD 256 Go', 0),
      ('eq-003', 'Ordinateur fixe', 'Lenovo', 'ThinkCentre M720', 'SN-LEN-44102', '2022-11-10', 'en_service', 'Direction Générale', 'Poste fixe avec double écran', 0),
      ('eq-004', 'Imprimante réseau', 'HP', 'LaserJet Pro M404dn', 'SN-HP-PRN-019', '2022-08-01', 'en_service', 'Couloir R+1 Informatique', 'Imprimante noir et blanc réseau partagée', 0),
      ('eq-005', 'Imprimante multifonction', 'Canon', 'imageRUNNER 2625i', 'SN-CAN-MFC-551', '2021-09-15', 'en_maintenance', 'Direction Générale', 'Copieur / Scanner multifonction réseau', 0),
      ('eq-006', 'Switch / Réseau', 'Cisco', 'Catalyst 2960-X', 'SN-CIS-SW-1002', '2021-04-12', 'en_service', 'Baie Serveur RDC', 'Switch 24 ports Gigabit PoE', 0),
      ('eq-007', 'Onduleur', 'APC', 'Smart-UPS 1500VA', 'SN-APC-UPS-774', '2022-01-20', 'en_service', 'Salle Serveur', 'Onduleur de protection serveur central', 0),
      ('eq-008', 'Ordinateur portable', 'Dell', 'Vostro 3510', 'SN-DEL-VOST-33', '2023-09-05', 'en_panne', 'Atelier Support IT', 'Écran noir suite surtension, diagnostic en cours', 0),
      ('eq-009', 'Écran / Moniteur', 'Dell', 'P2419H 24 pouces', 'SN-DEL-MON-662', '2023-03-15', 'en_service', 'Ressources Humaines', 'Écran externe HDMI/DP', 0),
      ('eq-010', 'Ordinateur portable', 'HP', 'ProBook 450 G3', 'SN-HP-OLD-001', '2018-06-10', 'hors_service', 'Dépôt archives IT', 'Carte mère HS, matériel amorti et hors service', 0)
    ON DUPLICATE KEY UPDATE \`type\` = VALUES(\`type\`), \`etat\` = VALUES(\`etat\`);
  `);

  // Affectations
  await conn.query(`
    INSERT INTO \`affectations\` (\`id\`, \`equipement_id\`,\`employe_id\`, \`service_id\`, \`date_debut\`, \`date_fin\`, \`commentaire\`, \`auteur_id\`)
    VALUES
      ('aff-001', 'eq-001', 'emp-admin-01', NULL, '2023-03-20', NULL, 'Matériel de travail administrateur système', 'emp-admin-01'),
      ('aff-002', 'eq-002', 'emp-002', NULL, '2023-05-25', NULL, 'Affectation chef comptable', 'emp-admin-01'),
      ('aff-003', 'eq-004', NULL, 'srv-002', '2022-08-05', NULL, 'Imprimante dédiée au service informatique', 'emp-admin-01'),
      ('aff-004', 'eq-005', NULL, 'srv-001', '2021-09-20', NULL, 'Copieur partagé Direction', 'emp-admin-01')
    ON DUPLICATE KEY UPDATE \`date_debut\` = VALUES(\`date_debut\`);
  `);

  // Tickets
  await conn.query(`
    INSERT INTO \`tickets\` (\`id\`, \`demandeur_id\`, \`service_id\`, \`description\`, \`categorie\`, \`priorite\`, \`canal\`, \`equipement_id\`, \`statut\`, \`date_resolution\`, \`cree_par\`)
    VALUES
      ('tck-001', 'emp-002', 'srv-003', 'L''imprimante LaserJet affiche un message d''erreur bourrage papier récurrent.', 'Imprimante & Scanner', 'haute', 'application', 'eq-004', 'resolu', '2026-10-25 14:30:00', 'emp-admin-01'),
      ('tck-002', 'emp-003', 'srv-004', 'L''ordinateur portable Dell ne démarre plus, voyant orange clignotant après l''orage.', 'Matériel informatique', 'critique', 'telephone', 'eq-008', 'en_cours', NULL, 'emp-admin-01'),
      ('tck-003', 'emp-004', 'srv-005', 'Besoin d''installer le logiciel Sage Paie sur le nouveau poste de travail.', 'Logiciel & Application', 'normale', 'email', 'eq-009', 'nouveau', NULL, 'emp-admin-01'),
      ('tck-004', 'emp-005', 'srv-001', 'Demande de raccordement d''un nouveau câble réseau pour le bureau des stagiaires.', 'Câblage Ethernet & Prise RJ45', 'basse', 'presentiel', NULL, 'en_attente', NULL, 'emp-admin-01')
    ON DUPLICATE KEY UPDATE \`description\` = VALUES(\`description\`);
  `);

  // Interventions
  await conn.query(`
    INSERT INTO \`interventions\` (\`id\`, \`ticket_id\`, \`debut\`, \`fin\`, \`actions\`, \`resultat\`, \`auteur_id\`)
    VALUES
      ('int-001', 'tck-001', '2026-10-25 14:00:00', '2026-10-25 14:30:00', 'Démontage du carter arrière, nettoyage du rouleau d''entraînement et retrait du résidu papier coincé. Tests d''impression 10 pages OK.', 'Résolu avec succès', 'emp-admin-01')
    ON DUPLICATE KEY UPDATE \`actions\` = VALUES(\`actions\`);
  `);

  console.log("Database initialized and seeded successfully!");
  const [tables] = await conn.query("SHOW TABLES;");
  console.log("Current tables in database:", tables);
  await conn.end();
}

init().catch(err => {
  console.error("Initialization error:", err);
  process.exit(1);
});
