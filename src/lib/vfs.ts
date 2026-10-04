import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface VFSNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null;
  data?: Blob;
  mimeType?: string;
  size?: number;
  createdAt: number;
  modifiedAt: number;
  handle?: any; // FileSystemHandle
  isDeviceRoot?: boolean;
}

interface VFSSchema extends DBSchema {
  nodes: {
    key: string;
    value: VFSNode;
    indexes: {
      'by-parent': string | null;
      'by-type': string;
    };
  };
  handles: {
    key: string;
    value: any; // FileSystemDirectoryHandle
  };
}

let dbPromise: Promise<IDBPDatabase<VFSSchema>> | null = null;

export const initVFS = () => {
  if (!dbPromise) {
    dbPromise = openDB<VFSSchema>('iOS_VFS', 2, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('nodes')) {
          const store = db.createObjectStore('nodes', { keyPath: 'id' });
          store.createIndex('by-parent', 'parentId');
          store.createIndex('by-type', 'type');
        }
        if (!db.objectStoreNames.contains('handles')) {
          db.createObjectStore('handles');
        }
      },
    });
  }
  return dbPromise;
};

export const storeDeviceHandle = async (handle: any): Promise<void> => {
  const db = await initVFS();
  await db.put('handles', handle, 'root');
};

export const getDeviceHandle = async (): Promise<any | undefined> => {
  const db = await initVFS();
  return db.get('handles', 'root');
};

export const verifyPermission = async (fileHandle: any, readWrite: boolean = false) => {
  const options = { mode: readWrite ? 'readwrite' : 'read' };
  if ((await fileHandle.queryPermission(options)) === 'granted') {
    return true;
  }
  if ((await fileHandle.requestPermission(options)) === 'granted') {
    return true;
  }
  return false;
};

export const getNodesByParent = async (parentId: string | null): Promise<VFSNode[]> => {
  const db = await initVFS();
  return db.getAllFromIndex('nodes', 'by-parent', parentId);
};

export const getAllFiles = async (): Promise<VFSNode[]> => {
  const db = await initVFS();
  return db.getAllFromIndex('nodes', 'by-type', 'file');
};

export const getNode = async (id: string): Promise<VFSNode | undefined> => {
  const db = await initVFS();
  return db.get('nodes', id);
};

export const addNode = async (node: VFSNode): Promise<void> => {
  const db = await initVFS();
  await db.put('nodes', node);
};

export const deleteNode = async (id: string): Promise<void> => {
  const db = await initVFS();
  // Recursively delete children if it's a folder
  const node = await db.get('nodes', id);
  if (node?.type === 'folder') {
    const children = await getNodesByParent(id);
    for (const child of children) {
      await deleteNode(child.id);
    }
  }
  await db.delete('nodes', id);
};

export const renameNode = async (id: string, newName: string): Promise<void> => {
  const db = await initVFS();
  const node = await db.get('nodes', id);
  if (node) {
    node.name = newName;
    node.modifiedAt = Date.now();
    await db.put('nodes', node);
  }
};

export const generateId = () => Math.random().toString(36).substring(2, 15);
