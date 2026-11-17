-- ==============================================================================
-- Données de démonstration — Touba Gaz IT
-- ==============================================================================

USE `parc_info_touba_gaz`;

-- Mettre à jour l'employé admin
UPDATE `employes` 
SET `nom` = 'Diop', `prenom` = 'Mamy', `telephone` = '+221 77 123 45 67'
WHERE `id` = 'emp-admin-01';

-- Services additionnels
INSERT INTO `services` (`id`, `nom`, `description`, `archive`)
VALUES
  ('srv-comm-01', 'Direction Commerciale Marketing', 'Commercial, Marketing et Relations Clients', 0),
  ('srv-rh-01', 'Direction Ressources Humaines', 'Gestion des ressources humaines, paie et carrières', 0)
ON DUPLICATE KEY UPDATE `nom` = VALUES(`nom`);

-- Employés Touba Gaz
INSERT INTO `employes` (`id`, `matricule`, `nom`, `prenom`, `fonction`, `email`, `telephone`, `service_id`, `actif`, `user_id`)
VALUES
  ('emp-26298', '26298', 'Samb', 'Al Assane', 'Inspecteur Commercial', 'alassane.samb@touba-oil.com', '123456789', 'srv-comm-01', 1, NULL),
  ('emp-26337', '26337', 'Sissokho', 'Amath', 'Inspecteur Commercial', 'amath.sissokho@touba-oil.com', '775571826', 'srv-comm-01', 1, NULL),
  ('emp-26284', '26284', 'Niang', 'Arame', 'Agent Commercial', 'arame.niang@touba-oil.com', '776407616', 'srv-comm-01', 1, NULL),
  ('emp-26273', '26273', 'Ndione', 'Babacar', 'Responsable Commercial', 'babacar.ndione@touba-oil.com', '766451576', 'srv-comm-01', 1, NULL),
  ('emp-25122', '25122', 'Coulibaly', 'Caty', 'Directrice Commerciale & Marketing', 'mme.coulibaly@touba-oil.com', '338798716', 'srv-comm-01', 1, NULL),
  ('emp-26347', '26347', 'Ndiaye', 'Cheikh Tidiane', 'Agent Commercial', 'cheikhtidiane.ndiaye@touba-oil.com', '000000000', 'srv-comm-01', 1, NULL),
  ('emp-26350', '26350', 'Bodiang', 'Cheikhou', 'Assistant Administratif des Ventes', 'cheikhou.bodiang@touba-oil.com', '+221766390974', 'srv-comm-01', 1, NULL),
  ('emp-26300', '26300', 'Diouf', 'Mamadou', 'Responsable Administrative des Ventes', 'mamadou.diouf@touba-oil.com', '774376957', 'srv-comm-01', 1, NULL),
  ('emp-26343', '26343', 'Sambe', 'Thiaba', 'Agent Commercial', 'thiaba.sambe@touba-oil.com', '000000000', 'srv-comm-01', 1, NULL),
  ('emp-26309', '26309', 'Dieng', 'Bineta', 'Chargée des Ressources Humaines', 'bineta.dieng@touba-oil.com', '221000000', 'srv-rh-01', 1, NULL),
  ('emp-26372', '26372', 'Bodian', 'Mariama', 'Assistante Ressources Humaines', 'mariama.bodian@touba-oil.com', '221000000', 'srv-rh-01', 1, NULL),
  ('emp-26340', '26340', 'Dieng', 'Mbaye', 'Archiviste', 'archive.tg@touba-oil.com', '221000000', 'srv-rh-01', 1, NULL)
ON DUPLICATE KEY UPDATE `matricule` = VALUES(`matricule`), `fonction` = VALUES(`fonction`), `telephone` = VALUES(`telephone`);

-- Tickets
INSERT INTO `tickets` (`id`, `demandeur_id`, `service_id`, `description`, `categorie`, `priorite`, `canal`, `equipement_id`, `statut`, `date_resolution`, `cree_par`)
VALUES
  ('tck-001', 'emp-002', 'srv-003', 'L''imprimante LaserJet affiche un message d''erreur bourrage papier récurrent.', 'Imprimante & Scanner', 'haute', 'application', NULL, 'resolu', '2026-10-25 14:30:00', 'emp-admin-01'),
  ('tck-002', 'emp-003', 'srv-004', 'L''ordinateur portable Dell ne démarre plus, voyant orange clignotant après l''orage.', 'Matériel informatique', 'critique', 'telephone', NULL, 'en_cours', NULL, 'emp-admin-01'),
  ('tck-003', 'emp-004', 'srv-005', 'Impossible de recevoir les e-mails de candidatures depuis ce matin sur Outlook.', 'Messagerie & E-mail', 'normale', 'email', NULL, 'nouveau', NULL, 'emp-admin-01'),
  ('tck-004', 'emp-005', 'srv-001', 'Demande de raccordement d''un nouveau câble réseau pour le bureau des stagiaires.', 'Câblage Ethernet & Prise RJ45', 'basse', 'presentiel', NULL, 'en_attente', NULL, 'emp-admin-01')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`), `statut` = VALUES(`statut`);

-- Interventions
INSERT INTO `interventions` (`id`, `ticket_id`, `debut`, `fin`, `actions`, `resultat`, `auteur_id`)
VALUES
  ('int-001', 'tck-001', '2026-10-25 11:00:00', '2026-10-25 14:20:00', 'Démontage du carter arrière, nettoyage du rouleau d''entraînement et retrait du résidu papier coincé. Tests d''impression 10 pages OK.', 'Résolu avec succès', 'emp-admin-01')
ON DUPLICATE KEY UPDATE `actions` = VALUES(`actions`);
