import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import crypto from "crypto";
import { hashPassword, requireAuth } from "@/lib/auth";


let columnsEnsured = false;
async function ensureEmployeColumns() {
  if (columnsEnsured) return;
  try {
    await pool.query("ALTER TABLE `employes` ADD COLUMN `matricule` VARCHAR(50) NULL AFTER `id`;");
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code !== "ER_DUP_FIELDNAME") {
      // ignore
    }
  }
  try {
    await pool.query("ALTER TABLE `employes` ADD COLUMN `fonction` VARCHAR(150) NULL AFTER `prenom`;");
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code !== "ER_DUP_FIELDNAME") {
      // ignore
    }
  }
  columnsEnsured = true;
}

export async function GET(req: Request) {
  try {
    await ensureEmployeColumns();
    const authResult = await requireAuth(req, ["admin"]);
    if ("errorResponse" in authResult) {
      return authResult.errorResponse;
    }

    const { searchParams } = new URL(req.url);
    const serviceId = searchParams.get("service_id");
    const search = searchParams.get("search")?.trim() ?? "";
    const showInactive = searchParams.get("show_inactive") === "true";

    let query = `
      SELECT 
        e.*,
        s.nom as service_nom,
        u.role as user_role,
        u.email as user_email,
        u.actif as user_actif
      FROM employes e
      LEFT JOIN services s ON s.id = e.service_id
      LEFT JOIN utilisateurs u ON u.id = e.user_id
      WHERE 1=1
    `;
    const params: string[] = [];

    if (!showInactive) {
      query += ` AND e.actif = 1`;
    }

    if (serviceId && serviceId !== "tous") {
      query += ` AND e.service_id = ?`;
      params.push(serviceId);
    }

    if (search) {
      query += ` AND (e.nom LIKE ? OR e.prenom LIKE ? OR e.email LIKE ? OR e.telephone LIKE ? OR e.matricule LIKE ? OR e.fonction LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s);
    }

    query += ` ORDER BY e.nom ASC, e.prenom ASC`;

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Erreur GET employes:", error);
    return NextResponse.json({ success: false, message: "Impossible de charger les employés." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureEmployeColumns();
    const authResult = await requireAuth(req, ["admin"]);
    if ("errorResponse" in authResult) {
      return authResult.errorResponse;
    }

    const body = await req.json();

    // Support pour import en masse (tableau d'employés)
    if (Array.isArray(body?.employes)) {
      const results = {
        created: 0,
        errors: [] as string[],
      };

      for (const item of body.employes) {
        try {
          let prenom = item.prenom?.trim() || "";
          let nom = item.nom?.trim() || "";

          // Si nom contient le prénom et nom en un seul champ
          if (!prenom && nom.includes(" ")) {
            const parts = nom.split(" ");
            prenom = parts[0];
            nom = parts.slice(1).join(" ");
          } else if (!nom && prenom) {
            nom = prenom;
            prenom = "";
          }

          if (!nom) {
            results.errors.push(`Ligne ignorée : nom manquant (${item.email || "sans email"})`);
            continue;
          }

          const cleanEmail = item.email?.trim().toLowerCase() || null;
          const matricule = item.matricule ? String(item.matricule).trim() : null;
          const fonction = item.fonction?.trim() || null;
          const telephone = item.telephone ? String(item.telephone).trim() : null;
          const statut = item.statut !== undefined 
            ? (String(item.statut).toUpperCase() === "ACTIVE" || String(item.statut) === "1" || item.statut === true ? 1 : 0)
            : (item.actif !== undefined ? (item.actif ? 1 : 0) : 1);

          let serviceId = item.service_id || null;
          // Si département textuel fourni (ex: 'Direction Ressources Humaines')
          if (!serviceId && item.departement) {
            const depName = item.departement.trim();
            const [srvRows] = await pool.query<RowDataPacket[]>(
              `SELECT id FROM services WHERE LOWER(nom) = LOWER(?) OR LOWER(nom) LIKE LOWER(?) LIMIT 1`,
              [depName, `%${depName}%`]
            );
            if (srvRows.length > 0) {
              serviceId = srvRows[0].id;
            } else {
              // Créer le service automatiquement
              const newSrvId = `srv-${crypto.randomUUID().slice(0, 8)}`;
              await pool.query(
                `INSERT INTO services (id, nom, description, archive) VALUES (?, ?, ?, 0)`,
                [newSrvId, depName, `Créé automatiquement lors de l'import`]
              );
              serviceId = newSrvId;
            }
          }

          let userId: string | null = null;
          const pwd = item.pwd || item.password;
          if (cleanEmail && pwd && pwd.length >= 4) {
            const [existingU] = await pool.query<RowDataPacket[]>(
              `SELECT id FROM utilisateurs WHERE LOWER(email) = ?`,
              [cleanEmail]
            );
            if (existingU.length === 0) {
              userId = `usr-${crypto.randomUUID().slice(0, 8)}`;
              const pwdHash = await hashPassword(pwd);
              await pool.query(
                `INSERT INTO utilisateurs (id, email, password_hash, nom, prenom, role, actif) VALUES (?, ?, ?, ?, ?, 'employe', ?)`,
                [userId, cleanEmail, pwdHash, nom, prenom, statut]
              );
            } else {
              userId = existingU[0].id;
            }
          }

          const employeId = `emp-${crypto.randomUUID().slice(0, 8)}`;
          await pool.query(
            `INSERT INTO employes (id, matricule, nom, prenom, fonction, email, telephone, service_id, actif, user_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [employeId, matricule, nom, prenom, fonction, cleanEmail, telephone, serviceId, statut, userId]
          );

          results.created++;
        } catch (itemErr: unknown) {
          const err = itemErr as { message?: string };
          results.errors.push(`Erreur sur ${item.nom || item.email} : ${err.message || "Erreur"}`);
        }
      }

      return NextResponse.json({
        success: true,
        message: `${results.created} employé(s) importé(s) avec succès.`,
        data: results,
      });
    }

    // Création individuelle standard
    const {
      matricule,
      nom,
      prenom,
      fonction,
      email,
      telephone,
      service_id,
      actif,
      statut,
      creer_compte,
      role,
      password,
    } = body;

    let cleanPrenom = prenom?.trim() || "";
    let cleanNom = nom?.trim() || "";

    if (!cleanNom && cleanPrenom.includes(" ")) {
      const parts = cleanPrenom.split(" ");
      cleanPrenom = parts[0];
      cleanNom = parts.slice(1).join(" ");
    } else if (!cleanPrenom && cleanNom.includes(" ")) {
      const parts = cleanNom.split(" ");
      cleanPrenom = parts[0];
      cleanNom = parts.slice(1).join(" ");
    }

    if (!cleanNom) {
      return NextResponse.json({ success: false, message: "Le nom est obligatoire." }, { status: 400 });
    }

    const cleanEmail = email?.trim().toLowerCase() || null;
    const cleanMatricule = matricule ? String(matricule).trim() : null;
    const cleanFonction = fonction?.trim() || null;
    const cleanTelephone = telephone ? String(telephone).trim() : null;

    let isActif = 1;
    if (statut !== undefined) {
      isActif = String(statut).toUpperCase() === "ACTIVE" || String(statut) === "1" || statut === true ? 1 : 0;
    } else if (actif !== undefined) {
      isActif = actif ? 1 : 0;
    }

    let userId: string | null = null;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Si on demande la création d'un compte utilisateur pour cet employé
      if (creer_compte) {
        if (!cleanEmail) {
          connection.release();
          return NextResponse.json(
            { success: false, message: "Une adresse e-mail professionnelle est obligatoire pour créer un compte d'accès." },
            { status: 400 }
          );
        }
        if (!password || password.length < 4) {
          connection.release();
          return NextResponse.json(
            { success: false, message: "Le mot de passe doit comporter au moins 4 caractères." },
            { status: 400 }
          );
        }

        // Vérifier si l'e-mail existe déjà dans utilisateurs
        const [existingUser] = await connection.query<RowDataPacket[]>(
          `SELECT id FROM utilisateurs WHERE LOWER(email) = ?`,
          [cleanEmail]
        );
        if (existingUser.length > 0) {
          connection.release();
          return NextResponse.json(
            { success: false, message: "Cet e-mail est déjà utilisé par un autre compte utilisateur." },
            { status: 409 }
          );
        }

        const assignedRole = role === "admin" ? "admin" : "employe";
        userId = `usr-${crypto.randomUUID().slice(0, 8)}`;
        const pwdHash = await hashPassword(password);

        await connection.query<ResultSetHeader>(
          `INSERT INTO utilisateurs (id, email, password_hash, nom, prenom, role, actif)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [userId, cleanEmail, pwdHash, cleanNom, cleanPrenom, assignedRole, isActif]
        );
      }

      const employeId = `emp-${crypto.randomUUID().slice(0, 8)}`;
      await connection.query<ResultSetHeader>(
        `INSERT INTO employes (id, matricule, nom, prenom, fonction, email, telephone, service_id, actif, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          employeId,
          cleanMatricule,
          cleanNom,
          cleanPrenom,
          cleanFonction,
          cleanEmail,
          cleanTelephone,
          service_id || null,
          isActif,
          userId,
        ]
      );

      await connection.commit();
      connection.release();

      return NextResponse.json({
        success: true,
        message: creer_compte
          ? `Employé et compte ${role === "admin" ? "Administrateur" : "Employé"} créés avec succès !`
          : "Employé ajouté avec succès.",
        id: employeId,
        user_id: userId,
      });
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (error: unknown) {
    console.error("Erreur POST employes:", error);
    const err = error as { code?: string };
    if (err.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ success: false, message: "Cet e-mail ou ce matricule est déjà attribué." }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: "Erreur serveur lors de la création." }, { status: 500 });
  }
}
