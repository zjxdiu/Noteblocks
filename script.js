import * as db from 'db';

// --- DOM Elements ---
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const addNoteBtn = document.getElementById('add-note-btn');
const searchBox = document.getElementById('search-box');
const notesList = document.getElementById('notes-list');
const mainContent = document.getElementById('main-content');
const noteEditor = document.getElementById('note-editor');
const placeholderView = document.getElementById('placeholder-view');
const noteTitleInput = noteEditor.querySelector('.note-title');
const noteContentDiv = noteEditor.querySelector('.note-content');
const deleteNoteBtn = noteEditor.querySelector('.delete-note-btn');
const noteListItemTemplate = document.getElementById('note-list-item-template');
const importBtn = document.getElementById('import-btn');
const exportBtn = document.getElementById('export-btn');
const importFileInput = document.getElementById('import-file-input');
const sidebar = document.querySelector('.sidebar'); // Get sidebar element
const resizer = document.getElementById('resizer'); // Get resizer element

// --- Modal DOM Elements ---
const importConflictModal = document.getElementById('import-conflict-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const conflictListContainer = document.getElementById('conflict-list');
const selectAllConflictsCheckbox = document.getElementById('select-all-conflicts');
const importConfirmBtn = document.getElementById('import-confirm-btn');
const importSkipBtn = document.getElementById('import-skip-btn');

// --- State ---
let allNotes = [];
let activeNoteId = null;
let currentUpdateDebouncer = () => {};
let isResizing = false;
let initialX;
let initialWidth;
const MIN_SIDEBAR_WIDTH = 200; // Minimum width for the sidebar
const MAX_SIDEBAR_WIDTH = 500; // Maximum width for the sidebar
const DEFAULT_SIDEBAR_WIDTH = 300; // Default width for the sidebar
let importData = {
    newNotes: [],
    conflictingNotes: []
};

// --- Debounce function ---
function debounce(func, delay = 500) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

// --- Theme Management ---
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggleBtn.textContent = '☀️';
        themeToggleBtn.title = 'Switch to Light Theme';
    } else {
        document.body.classList.remove('dark-theme');
        themeToggleBtn.textContent = '🌙';
        themeToggleBtn.title = 'Switch to Dark Theme';
    }
}

function handleThemeToggle() {
    const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
}

function loadInitialTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
}

// --- Sidebar Resizing ---
function handleMouseDown(e) {
    isResizing = true;
    initialX = e.clientX;
    initialWidth = sidebar.offsetWidth;
    document.body.style.userSelect = 'none'; // Prevent text selection during resize
    document.body.style.cursor = 'ew-resize'; // Change cursor globally
}

function handleMouseMove(e) {
    if (!isResizing) return;
    const dx = e.clientX - initialX;
    let newWidth = initialWidth + dx;

    // Clamp width between min and max
    newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(newWidth, MAX_SIDEBAR_WIDTH));
    sidebar.style.width = `${newWidth}px`;
}

function handleMouseUp() {
    if (isResizing) {
        isResizing = false;
        document.body.style.userSelect = ''; // Re-enable text selection
        document.body.style.cursor = ''; // Reset cursor
        localStorage.setItem('sidebarWidth', sidebar.style.width); // Save width
    }
}

function loadSidebarWidth() {
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
        sidebar.style.width = savedWidth;
    } else {
        sidebar.style.width = `${DEFAULT_SIDEBAR_WIDTH}px`;
    }
}

// --- Note Rendering ---
function renderNoteList(notesToDisplay) {
    notesList.innerHTML = '';
    if (notesToDisplay.length === 0 && searchBox.value) {
        notesList.innerHTML = '<p class="no-results">No matching notes.</p>';
        return;
    }

    notesToDisplay.forEach(note => {
        const noteItemElement = noteListItemTemplate.content.cloneNode(true).firstElementChild;
        noteItemElement.dataset.id = note.id;
        noteItemElement.querySelector('.note-list-title').textContent = note.title || 'Untitled Note';

        if (note.id === activeNoteId) {
            noteItemElement.classList.add('selected');
        }

        noteItemElement.addEventListener('click', () => handleNoteSelect(note.id));
        notesList.append(noteItemElement);
    });
}

function renderActiveNote() {
    if (activeNoteId === null) {
        noteEditor.classList.add('hidden');
        placeholderView.classList.remove('hidden');
        return;
    }

    const activeNote = allNotes.find(note => note.id === activeNoteId);
    if (!activeNote) {
        // Active note was deleted or not found
        activeNoteId = null;
        noteEditor.classList.add('hidden');
        placeholderView.classList.remove('hidden');
        return;
    }

    placeholderView.classList.add('hidden');
    noteEditor.classList.remove('hidden');
    
    // Disconnect previous debouncer to avoid saving to the wrong note
    noteTitleInput.removeEventListener('input', currentUpdateDebouncer);
    noteContentDiv.removeEventListener('input', currentUpdateDebouncer);

    noteTitleInput.value = activeNote.title;
    noteContentDiv.innerText = activeNote.content || '';

    currentUpdateDebouncer = debounce(async () => {
        const updatedTitle = noteTitleInput.value.trim();
        const updatedContent = noteContentDiv.innerText;
        
        // Find note again in case it was updated
        const noteToUpdate = allNotes.find(n => n.id === activeNoteId);
        if (noteToUpdate) {
            noteToUpdate.title = updatedTitle;
            noteToUpdate.content = updatedContent;
            
            try {
                await db.updateNote(noteToUpdate);
                console.log(`Note ${activeNoteId} updated.`);
                // Re-render list to show new title
                handleSearch(); 
            } catch (error) {
                console.error("Failed to update note:", error);
            }
        }
    });

    noteTitleInput.addEventListener('input', currentUpdateDebouncer);
    noteContentDiv.addEventListener('input', currentUpdateDebouncer);
}

async function loadAndRender() {
    try {
        allNotes = await db.getNotes();
        allNotes.sort((a, b) => b.id - a.id); // Newest first

        const shouldSelectFirstNote = activeNoteId === null && allNotes.length > 0;
        if (shouldSelectFirstNote) {
            activeNoteId = allNotes[0].id;
        }

        if (!allNotes.some(note => note.id === activeNoteId)) {
             activeNoteId = allNotes.length > 0 ? allNotes[0].id : null;
        }
        
        handleSearch(); // Renders the list
        renderActiveNote(); // Renders the main editor content
    } catch (error) {
        console.error("Failed to load notes:", error);
        alert("Could not load your notes. Please try refreshing the page.");
    }
}

// --- Event Handlers ---
function handleNoteSelect(noteId) {
    if (activeNoteId === noteId) return;
    activeNoteId = noteId;
    renderActiveNote();
    // Update selection highlight in the list
    const listItems = notesList.querySelectorAll('.note-list-item');
    listItems.forEach(item => {
        item.classList.toggle('selected', item.dataset.id == activeNoteId);
    });
}

async function handleAddNote() {
    const newNote = {
        id: Date.now(),
        title: 'New Note',
        content: ''
    };

    try {
        await db.addNote(newNote);
        activeNoteId = newNote.id;
        await loadAndRender();

        noteTitleInput.focus();
        noteTitleInput.select();
    } catch (error) {
        console.error("Failed to add new note:", error);
        alert("Could not create a new note. Please try again.");
    }
}

async function handleDeleteNote() {
    if (activeNoteId === null) return;
    
    const confirmation = confirm("Are you sure you want to delete this note?");
    if (confirmation) {
        try {
            await db.deleteNote(activeNoteId);
            activeNoteId = null; // Deselect
            await loadAndRender(); // Reload and select the new top note
        } catch (error) {
            console.error("Failed to delete note:", error);
            alert("Could not delete the note. Please try again.");
        }
    }
}

function handleSearch() {
    const searchTerm = searchBox.value.toLowerCase();
    const filteredNotes = allNotes.filter(note => 
        note.title.toLowerCase().includes(searchTerm)
    );
    renderNoteList(filteredNotes);
}

async function handleExport() {
    if (allNotes.length === 0) {
        alert("There are no notes to export.");
        return;
    }

    try {
        const jsonString = JSON.stringify(allNotes, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `noteblocks_backup_${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to export notes:", error);
        alert("An error occurred while exporting your notes.");
    }
}

function handlePasteAsPlainText(event) {
    event.preventDefault();

    // Get text representation of clipboard
    const text = (event.clipboardData || window.clipboardData).getData('text/plain');

    // Insert text manually.
    // Using execCommand for simplicity and broad browser support with contenteditable.
    document.execCommand('insertText', false, text);
}

async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            let importedNotes;
            try {
                importedNotes = JSON.parse(e.target.result);
            } catch (err) {
                 throw new Error("Invalid JSON file. Could not parse the content.");
            }

            if (!Array.isArray(importedNotes)) {
                throw new Error("Invalid format: The file should contain an array of notes.");
            }
            
            const isValid = importedNotes.every(note => 
                typeof note === 'object' && note !== null && 'title' in note && 'content' in note && 'id' in note
            );

            if (!isValid) {
                throw new Error("Invalid format: Each note object must have 'id', 'title', and 'content' properties.");
            }

            const currentNotes = await db.getNotes();
            
            importData = { newNotes: [], conflictingNotes: [] };
            let potentialIdConflicts = new Set(currentNotes.map(n => n.id));

            importedNotes.forEach((importedNote, index) => {
                if (!importedNote.title || !importedNote.title.trim()) {
                    return; // Skip notes with no title
                }

                const existingNote = currentNotes.find(n => n.title.trim().toLowerCase() === importedNote.title.trim().toLowerCase());

                if (existingNote) {
                    importData.conflictingNotes.push({ imported: importedNote, existing: existingNote });
                } else {
                    // Ensure ID is unique before adding
                    if (potentialIdConflicts.has(importedNote.id)) {
                        importedNote.id = Date.now() + index; // Create a new unique ID
                    }
                    potentialIdConflicts.add(importedNote.id);
                    importData.newNotes.push(importedNote);
                }
            });
            
            event.target.value = null; // Reset file input

            if (importData.conflictingNotes.length > 0) {
                renderConflictModal();
                importConflictModal.classList.remove('hidden');
            } else {
                let newCount = 0;
                for (const note of importData.newNotes) {
                    await db.addNote(note);
                    newCount++;
                }
                if (newCount > 0) {
                    alert(`Import complete! ${newCount} new notes were added.`);
                    await loadAndRender();
                } else {
                    alert('Import finished. No new notes were found to import.');
                }
            }

        } catch (error) {
            console.error("Failed to import notes:", error);
            alert(`Error importing notes: ${error.message}`);
            event.target.value = null;
        }
    };
    reader.onerror = () => {
        alert("Failed to read the file.");
        event.target.value = null;
    };
    reader.readAsText(file);
}

function renderConflictModal() {
    conflictListContainer.innerHTML = '';
    selectAllConflictsCheckbox.checked = true;

    importData.conflictingNotes.forEach((conflict, index) => {
        const item = document.createElement('div');
        item.className = 'conflict-item';

        const label = document.createElement('label');
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkbox.dataset.index = index;

        const span = document.createElement('span');
        span.textContent = conflict.imported.title;

        label.appendChild(checkbox);
        label.appendChild(span);
        item.appendChild(label);
        conflictListContainer.appendChild(item);
    });
}

function hideConflictModal() {
    importConflictModal.classList.add('hidden');
    // Clear data to prevent accidental reuse
    importData = { newNotes: [], conflictingNotes: [] };
}

async function processImport() {
    const checkboxes = conflictListContainer.querySelectorAll('input[type="checkbox"]');
    const notesToOverwrite = [];
    checkboxes.forEach(cb => {
        if (cb.checked) {
            const index = parseInt(cb.dataset.index, 10);
            notesToOverwrite.push(importData.conflictingNotes[index]);
        }
    });

    let newCount = 0;
    let overwrittenCount = 0;

    // Process overwrites
    for (const conflict of notesToOverwrite) {
        const noteToUpdate = conflict.existing;
        noteToUpdate.content = conflict.imported.content;
        await db.updateNote(noteToUpdate);
        overwrittenCount++;
    }

    // Process new notes
    for (const note of importData.newNotes) {
        await db.addNote(note);
        newCount++;
    }

    hideConflictModal();

    if (newCount > 0 || overwrittenCount > 0) {
        const skippedCount = importData.conflictingNotes.length - overwrittenCount;
        alert(`Import complete!\n\nNew notes: ${newCount}\nOverwritten: ${overwrittenCount}\nSkipped conflicts: ${skippedCount}`);
        await loadAndRender();
    } else {
        alert(`Import finished. No changes were made.`);
    }
}

async function processSkipAll() {
    let newCount = 0;
    for (const note of importData.newNotes) {
        await db.addNote(note);
        newCount++;
    }

    const skippedCount = importData.conflictingNotes.length;
    hideConflictModal();

    if (newCount > 0) {
        alert(`Import complete!\n\nNew notes: ${newCount}\nSkipped conflicts: ${skippedCount}`);
        await loadAndRender();
    } else {
        alert(`Import finished. All ${skippedCount} conflicting notes were skipped and there were no new notes.`);
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await db.initDB();
        
        addNoteBtn.addEventListener('click', handleAddNote);
        deleteNoteBtn.addEventListener('click', handleDeleteNote);
        searchBox.addEventListener('input', handleSearch);
        themeToggleBtn.addEventListener('click', handleThemeToggle);

        exportBtn.addEventListener('click', handleExport);
        importBtn.addEventListener('click', () => importFileInput.click());
        importFileInput.addEventListener('change', handleFileImport);
        
        // Modal event listeners
        modalCloseBtn.addEventListener('click', hideConflictModal);
        importConfirmBtn.addEventListener('click', processImport);
        importSkipBtn.addEventListener('click', processSkipAll);
        selectAllConflictsCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            conflictListContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.checked = isChecked;
            });
        });

        noteContentDiv.addEventListener('paste', handlePasteAsPlainText);

        // Resizer event listeners
        resizer.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        loadInitialTheme();
        loadSidebarWidth(); // Load saved sidebar width
        await loadAndRender();
    } catch (error) {
        console.error("Application failed to initialize:", error);
        document.body.innerHTML = '<h1>Error</h1><p>Could not initialize the application. Please ensure you are not in private browsing mode and that your browser supports IndexedDB.</p>';
    }
});