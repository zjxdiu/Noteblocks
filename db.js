const DB_NAME = 'NoteBlocksDB';
const STORE_NAME = 'notes';
const DB_VERSION = 1;

let db;

function initDB() {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("Database error:", event.target.error);
            reject("Database error: " + event.target.error.message);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("Database opened successfully");
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const dbInstance = event.target.result;
            if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
                console.log("Object store created");
            }
        };
    });
}

function getStore(mode) {
    if (!db) {
        throw new Error("Database not initialized. Call initDB first.");
    }
    const transaction = db.transaction(STORE_NAME, mode);
    return transaction.objectStore(STORE_NAME);
}

async function addNote(note) {
    await initDB();
    const store = getStore('readwrite');
    const request = store.add(note);
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(note.id);
        request.onerror = (event) => reject("Error adding note: " + event.target.error);
    });
}

async function getNotes() {
    await initDB();
    const store = getStore('readonly');
    const request = store.getAll();
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject("Error fetching notes: " + event.target.error);
    });
}

async function updateNote(note) {
    await initDB();
    const store = getStore('readwrite');
    const request = store.put(note);
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject("Error updating note: " + event.target.error);
    });
}

async function deleteNote(id) {
    await initDB();
    const store = getStore('readwrite');
    const request = store.delete(id);
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject("Error deleting note: " + event.target.error);
    });
}

export { initDB, addNote, getNotes, updateNote, deleteNote };

