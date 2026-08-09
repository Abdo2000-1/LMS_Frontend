import { Account, Client, ID, Storage } from "appwrite";

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const bucketId = import.meta.env.VITE_APPWRITE_BUCKET_ID;

function requireEnv(name, value) {
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

export const appwriteConfig = {
  endpoint: requireEnv("VITE_APPWRITE_ENDPOINT", endpoint),
  projectId: requireEnv("VITE_APPWRITE_PROJECT_ID", projectId),
  bucketId: requireEnv("VITE_APPWRITE_BUCKET_ID", bucketId),
};

export const appwriteClient = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId);

export const account = new Account(appwriteClient);
export const storage = new Storage(appwriteClient);
export { ID };
