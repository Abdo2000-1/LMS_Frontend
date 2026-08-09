const DATA_API_URL = (import.meta.env.VITE_MONGO_DATA_API_URL || "").replace(/\/+$/, "");
const DATA_API_KEY = import.meta.env.VITE_MONGO_DATA_API_KEY || "";
const DATABASE = import.meta.env.VITE_MONGO_DATABASE || "";
const DATA_SOURCE = import.meta.env.VITE_MONGO_DATA_SOURCE || "";

function assertConfigured() {
  const missing = [];
  if (!DATA_API_URL) missing.push("VITE_MONGO_DATA_API_URL");
  if (!DATA_API_KEY) missing.push("VITE_MONGO_DATA_API_KEY");
  if (!DATABASE) missing.push("VITE_MONGO_DATABASE");
  if (!DATA_SOURCE) missing.push("VITE_MONGO_DATA_SOURCE");
  if (missing.length) throw new Error(`Missing MongoDB Data API config: ${missing.join(", ")}`);
}

function normalizeId(value) {
  if (!value) return value;
  if (typeof value === "string") return value;
  if (value.$oid) return value.$oid;
  return String(value);
}

export function mapMongoDocument(document) {
  if (!document) return null;
  const mapped = { ...document };
  mapped.id = normalizeId(document.id || document._id);
  delete mapped._id;
  return mapped;
}

async function mongoRequest(action, body) {
  assertConfigured();
  const response = await fetch(`${DATA_API_URL}/action/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Request-Headers": "*",
      "api-key": DATA_API_KEY,
    },
    body: JSON.stringify({
      dataSource: DATA_SOURCE,
      database: DATABASE,
      ...body,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.detail || payload.message || "MongoDB Data API request failed.");
  }
  return payload;
}

export async function find(collection, { filter = {}, projection, sort, limit } = {}) {
  const payload = await mongoRequest("find", {
    collection,
    filter,
    ...(projection ? { projection } : {}),
    ...(sort ? { sort } : {}),
    ...(limit ? { limit } : {}),
  });
  return (payload.documents || []).map(mapMongoDocument);
}

export async function findOne(collection, { filter = {}, projection } = {}) {
  const payload = await mongoRequest("findOne", {
    collection,
    filter,
    ...(projection ? { projection } : {}),
  });
  return mapMongoDocument(payload.document);
}

export async function insertOne(collection, document) {
  const payload = await mongoRequest("insertOne", { collection, document });
  return { ...document, id: normalizeId(payload.insertedId) };
}

export async function updateOne(collection, { filter, update, upsert = false }) {
  return mongoRequest("updateOne", {
    collection,
    filter,
    update,
    upsert,
  });
}

export async function deleteOne(collection, filter) {
  return mongoRequest("deleteOne", { collection, filter });
}

export function objectIdFilter(id) {
  return { _id: { $oid: String(id) } };
}
