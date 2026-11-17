-- ==============================================================================
-- Données de démonstration — Touba Gaz IT
-- ==============================================================================

USE `parc_info_touba_gaz`;

-- Mettre à jour l'employé admin
UPDATE `employes` 
SET `nom` = 'Diop', `prenom` = 'Mamy', `telephone` = '+221 77 123 45 67'
WHERE `id` = 'emp-admin-01';

-- Autres Employés
INSERT INTO `employes` (`id`, `nom`, `prenom`, `email`, `telephone`, `service_id`, `actif`, `user_id`)
VALUES
  ('emp-002', 'Ndiaye', 'Fatou', 'fatou.ndiaye@toubagaz.sn', '+221 77 234 56 78', 'srv-003', 1, NULL),
  ('emp-003', 'Ba', 'Amadou', 'amadou.ba@toubagaz.sn', '+221 78 345 67 89', 'srv-004', 1, NULL),
  ('emp-004', 'Fall', 'Awa', 'awa.fall@toubagaz.sn', '+221 76 456 78 90', 'srv-005', 1, NULL),
  ('emp-005', 'Sène', 'Cheikh', 'cheikh.sene@toubagaz.sn', '+221 77 567 89 01', 'srv-001', 1, NULL),
  ('emp-006', 'Sow', 'Ibrahima', 'ibrahima.sow@toubagaz.sn', '+221 78 678 90 12', 'srv-004', 1, NULL)
ON DUPLICATE KEY UPDATE `nom` = VALUES(`nom`), `service_id` = VALUES(`service_id`);

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
