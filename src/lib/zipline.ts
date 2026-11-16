/**
 * Module serveur pour l'upload de fichiers vers Zipline.
 *
 * Utilise les variables d'environnement :
 *   - ZIPLINE_URL  : URL du serveur Zipline (ex: https://zipline.touba-app.com)
 *   - ZIPLINE_TOKEN : Token d'authentification Zipline
 *
 * ⚠️  Ce module ne doit JAMAIS être importé côté client.
 *     Il manipule des secrets (ZIPLINE_TOKEN) qui doivent rester serveur.
 */

// ── Types ────────────────────────────────────────────────────────────

export interface ZiplineUploadResult {
  /** ID unique du fichier sur Zipline */
  id: string;
  /** Nom du fichier sur Zipline */
  name: string;
  /** MIME type */
  type: string;
  /** URL publique complète (https) */
  url: string;
}

export class ZiplineError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = "ZiplineError";
    this.statusCode = statusCode;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function getConfig() {
  const url = process.env.ZIPLINE_URL;
  const token = process.env.ZIPLINE_TOKEN;

  if (!url) {
    throw new ZiplineError(
      "ZIPLINE_URL n'est pas défini dans les variables d'environnement.",
      500,
    );
  }
  if (!token) {
    throw new ZiplineError(
      "ZIPLINE_TOKEN n'est pas défini dans les variables d'environnement.",
      500,
    );
  }

  // Retirer les éventuels guillemets autour des valeurs
  return {
    url: url.replace(/^"|"$/g, ""),
    token: token.replace(/^"|"$/g, ""),
  };
}

/**
 * Force l'URL retournée par Zipline en https si le serveur est configuré en https.
 * Zipline peut retourner http:// même quand on accède via un reverse-proxy HTTPS.
 */
function ensureHttps(rawUrl: string, baseUrl: string): string {
  if (baseUrl.startsWith("https://") && rawUrl.startsWith("http://")) {
    return rawUrl.replace("http://", "https://");
  }
  return rawUrl;
}

// ── API publique ─────────────────────────────────────────────────────

/**
 * Envoie un fichier (Buffer) vers le serveur Zipline.
 *
 * @param buffer   - Le contenu du fichier
 * @param filename - Le nom original du fichier (ex: "photo.jpg")
 * @param mimeType - Le MIME type (ex: "image/jpeg")
 * @returns L'objet ZiplineUploadResult avec l'URL publique
 */
export async function uploadToZipline(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<ZiplineUploadResult> {
  const { url, token } = getConfig();

  // Zipline attend un multipart/form-data avec un champ "file"
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
  const formData = new FormData();
  formData.append("file", blob, filename);

  let response: Response;
  try {
    response = await fetch(`${url}/api/upload`, {
      method: "POST",
      headers: {
        Authorization: token,
      },
      body: formData,
    });
  } catch (err) {
    throw new ZiplineError(
      `Impossible de contacter le serveur Zipline : ${(err as Error).message}`,
      502,
    );
  }

  if (!response.ok) {
    let errorMsg: string;
    try {
      const errorBody = await response.json();
      errorMsg = errorBody.error || JSON.stringify(errorBody);
    } catch {
      errorMsg = await response.text();
    }
    throw new ZiplineError(
      `Zipline a retourné une erreur (${response.status}): ${errorMsg}`,
      response.status,
    );
  }

  const data = await response.json();

  if (!data.files || !Array.isArray(data.files) || data.files.length === 0) {
    throw new ZiplineError("Réponse Zipline inattendue : aucun fichier retourné.", 502);
  }

  const file = data.files[0];

  return {
    id: file.id,
    name: file.name,
    type: file.type,
    url: ensureHttps(file.url, url),
  };
}

/**
 * Supprime un fichier sur Zipline par son ID.
 *
 * @param fileId - L'ID du fichier Zipline à supprimer
 */
export async function deleteFromZipline(fileId: string): Promise<void> {
  const { url, token } = getConfig();

  try {
    const response = await fetch(`${url}/api/user/files`, {
      method: "DELETE",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: fileId }),
    });

    if (!response.ok && response.status !== 404) {
      console.error(`Erreur suppression Zipline (${response.status})`);
    }
  } catch (err) {
    // On log l'erreur mais on ne bloque pas l'opération principale
    console.error("Erreur suppression Zipline:", (err as Error).message);
  }
}
