import { databases, Query, ID } from "../lib/appwrite.js";

const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

const collectionMap = {
  users: import.meta.env.VITE_APPWRITE_USERS_COLLECTION_ID,
  courses: import.meta.env.VITE_APPWRITE_COURSES_COLLECTION_ID,
  quizAttempts: import.meta.env.VITE_APPWRITE_QUIZ_ATTEMPTS_COLLECTION_ID,
  payments: import.meta.env.VITE_APPWRITE_PAYMENTS_COLLECTION_ID,
  branding: import.meta.env.VITE_APPWRITE_BRANDING_COLLECTION_ID,
};

function requireEnv(name, value) {
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

// Ensure database ID is configured
requireEnv("VITE_APPWRITE_DATABASE_ID", databaseId);

// Helper to serialize nested structures when writing to Appwrite database
function serializeData(data) {
  const serialized = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && typeof value === "object") {
      serialized[key] = JSON.stringify(value);
    } else {
      serialized[key] = value;
    }
  }
  return serialized;
}

// Helper to deserialize nested structures when reading from Appwrite database
function deserializeData(data) {
  const deserialized = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
        try {
          deserialized[key] = JSON.parse(value);
          continue;
        } catch {
          // ignore parse error, treat as normal string
        }
      }
    }
    deserialized[key] = value;
  }
  return deserialized;
}

export function mapAppwriteDocument(doc) {
  if (!doc) return null;
  const mapped = { ...doc };
  mapped.id = doc.$id;
  delete mapped.$id;
  delete mapped.$collectionId;
  delete mapped.$databaseId;
  delete mapped.$createdAt;
  delete mapped.$updatedAt;
  delete mapped.$permissions;
  return deserializeData(mapped);
}

function getCollectionId(collectionName) {
  const id = collectionMap[collectionName];
  if (!id) throw new Error(`Unknown collection name or unconfigured ID for: ${collectionName}`);
  return id;
}

function buildQueries(filter = {}, sort, limit) {
  const queries = [];
  for (const [key, val] of Object.entries(filter)) {
    if (key === "_id") {
      const idVal = val?.$oid || val;
      queries.push(Query.equal("$id", String(idVal)));
    } else if (key === "id") {
      queries.push(Query.equal("$id", String(val)));
    } else if (typeof val === "object" && val !== null) {
      if (val.$oid) {
        queries.push(Query.equal("$id", String(val.$oid)));
      }
    } else {
      queries.push(Query.equal(key, val));
    }
  }

  if (sort) {
    for (const [key, direction] of Object.entries(sort)) {
      if (direction === -1 || direction === "desc") {
        queries.push(Query.orderDesc(key));
      } else {
        queries.push(Query.orderAsc(key));
      }
    }
  }

  if (limit !== undefined) {
    queries.push(Query.limit(limit));
  }

  return queries;
}

export async function find(collectionName, { filter = {}, sort, limit } = {}) {
  const collectionId = getCollectionId(collectionName);
  const queries = buildQueries(filter, sort, limit);
  const res = await databases.listDocuments(databaseId, collectionId, queries);
  return (res.documents || []).map(mapAppwriteDocument);
}

export async function findOne(collectionName, { filter = {} } = {}) {
  const hasIdFilter = filter._id || filter.id;
  const idValue = filter._id?.$oid || filter._id || filter.id;
  
  if (hasIdFilter && Object.keys(filter).length === 1 && idValue) {
    try {
      const collectionId = getCollectionId(collectionName);
      const res = await databases.getDocument(databaseId, collectionId, String(idValue));
      return mapAppwriteDocument(res);
    } catch {
      return null;
    }
  }
  
  const documents = await find(collectionName, { filter, limit: 1 });
  return documents[0] || null;
}

export async function insertOne(collectionName, document) {
  const collectionId = getCollectionId(collectionName);
  const docId = document.id || document.uid || document.appwriteUserId || ID.unique();
  const cleanDoc = serializeData(document);
  delete cleanDoc.id;
  delete cleanDoc._id;
  
  const res = await databases.createDocument(databaseId, collectionId, docId, cleanDoc);
  return mapAppwriteDocument(res);
}

export async function updateOne(collectionName, { filter, update }) {
  const collectionId = getCollectionId(collectionName);
  
  let docId = filter.id || filter._id?.$oid || filter._id;
  if (!docId) {
    const doc = await findOne(collectionName, { filter });
    if (doc) {
      docId = doc.id;
    }
  }
  
  if (!docId) {
    throw new Error(`Document not found to update in ${collectionName}`);
  }
  
  const dataToUpdate = update.$set || update;
  const cleanUpdate = serializeData(dataToUpdate);
  
  delete cleanUpdate.id;
  delete cleanUpdate._id;
  delete cleanUpdate.$id;
  
  const res = await databases.updateDocument(databaseId, collectionId, String(docId), cleanUpdate);
  return mapAppwriteDocument(res);
}

export async function deleteOne(collectionName, filter) {
  const collectionId = getCollectionId(collectionName);
  let docId = filter.id || filter._id?.$oid || filter._id;
  if (!docId) {
    const doc = await findOne(collectionName, { filter });
    if (doc) {
      docId = doc.id;
    }
  }
  
  if (!docId) {
    throw new Error(`Document not found to delete in ${collectionName}`);
  }
  
  await databases.deleteDocument(databaseId, collectionId, String(docId));
  return { deleted: true };
}

export function objectIdFilter(id) {
  return { id: String(id) };
}
