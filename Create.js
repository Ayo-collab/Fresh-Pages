// Firebase Configuration (Version 8 Style)
const firebaseConfig = {
  apiKey: "AIzaSyBzOCqa-Ab7A6z-eaRpBKljCA-gb0Quzxg",
  authDomain: "fresh-pages-f8d84.firebaseapp.com",
  databaseURL: "https://fresh-pages-f8d84-default-rtdb.firebaseio.com",
  projectId: "fresh-pages-f8d84",
  storageBucket: "fresh-pages-f8d84.firebasestorage.app",
  messagingSenderId: "649436378724",
  appId: "1:649436378724:web:b526af90fa94a7f605d171",
  measurementId: "G-10VLQLNH2M"
};

// Initialize Firebase only if it hasn't been initialized yet
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Now the rest of your code (db, auth, etc.) will work!
const db = firebase.firestore();
const auth = firebase.auth();

document.addEventListener("DOMContentLoaded", () => {
    const db = firebase.firestore();
    const auth = firebase.auth();

    // Check if we are resuming a draft from Settings
const resumeTitle = localStorage.getItem('draft_title');
const resumeContent = localStorage.getItem('draft_content');

if (resumeTitle || resumeContent) {
    document.getElementById('postTitle').value = resumeTitle || "";
    document.getElementById('postContent').value = resumeContent || "";
    
    // Optional: Clear them from local storage so they don't stay there forever
    // localStorage.removeItem('draft_title');
    // localStorage.removeItem('draft_content');
}

    // Elements
    const publishBtn = document.getElementById('publishBtn');
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    const publishModal = document.getElementById('publishModal');
    const nameModal = document.getElementById('nameModal');
    const confirmPublish = document.getElementById('confirmPublish');
    const cancelPublish = document.getElementById('cancelPublish');
    const setNameBtn = document.getElementById('setNameBtn');

    // Debounce utility for autosave
    function debounce(fn, wait = 500) {
        let t = null;
        return function(...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
    }

    // Autosave title/content to localStorage as the user types
    const autoSave = debounce(() => {
        const title = document.getElementById('postTitle')?.value || '';
        const content = document.getElementById('postContent')?.value || '';
        localStorage.setItem('draft_title', title);
        localStorage.setItem('draft_content', content);
        if (saveDraftBtn) {
            saveDraftBtn.innerText = 'Saved locally';
            setTimeout(() => saveDraftBtn.innerText = 'Save Draft', 1200);
        }
    }, 700);

    const titleInput = document.getElementById('postTitle');
    const contentInput = document.getElementById('postContent');
    if (titleInput) titleInput.addEventListener('input', autoSave);
    if (contentInput) contentInput.addEventListener('input', autoSave);

    // Preview / char count
    const previewToggle = document.getElementById('previewToggle');
    const livePreview = document.getElementById('livePreview');
    const editorArea = document.querySelector('.editor-area');
    const charCount = document.getElementById('charCount');

    function renderPreview(text) {
        if (!livePreview) return;
        // Very small markdown-like transforms: **bold**, *italic*, lines -> paragraphs
        const esc = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        let t = esc(text || '');
        t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
        // headings (# )
        t = t.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        t = t.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        t = t.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        // paragraphs
        t = t.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g,'<br>')}</p>`).join('');
        livePreview.innerHTML = t || '<p class="muted">Nothing to preview yet.</p>';
    }

    function updateCharCount() {
        if (!charCount || !contentInput) return;
        const len = contentInput.value.length + (titleInput?.value.length || 0);
        charCount.textContent = `${len} chars`;
    }

    if (contentInput) {
        contentInput.addEventListener('input', () => { updateCharCount(); renderPreview(contentInput.value); });
        // initial
        updateCharCount();
        renderPreview(contentInput.value);
    }

    if (previewToggle) {
        previewToggle.addEventListener('click', () => {
            if (!editorArea || !livePreview) return;
            editorArea.classList.toggle('show-preview');
            livePreview.classList.toggle('hidden');
            // Update preview when toggling on
            if (!livePreview.classList.contains('hidden')) renderPreview(contentInput.value);
        });
    }

    // --- DRAFT SAVING LOGIC ---
if (saveDraftBtn) {
    saveDraftBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return alert("Log in to save drafts.");

        const title = document.getElementById('postTitle').value.trim();
        const content = document.getElementById('postContent').value.trim();

        if (!title && !content) return alert("Nothing to save!");

        try {
            saveDraftBtn.innerText = "Saving...";
            saveDraftBtn.disabled = true;

            // Save to users/{uid}/drafts
            await db.collection("Users").doc(user.uid).collection("drafts").add({
                title: title,
                content: content,
                uid: user.uid,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            saveDraftBtn.innerText = "Draft Saved! ✅";
            setTimeout(() => {
                saveDraftBtn.innerText = "Save Draft";
                saveDraftBtn.disabled = false;
            }, 2000);

        } catch (err) {
            console.error("Draft error:", err);
            alert("Failed to save draft.");
            saveDraftBtn.disabled = false;
        }
    });
}


// Function to delete a draft from the user's sub-collection
async function deleteDraft(draftId) {
    const user = firebase.auth().currentUser;
    if (!confirm("Are you sure you want to delete this draft?")) return;

    try {
        await db.collection("Users").doc(user.uid).collection("drafts").doc(draftId).delete();
        alert("Draft deleted.");
        loadUserDrafts(); // Refresh the list
    } catch (err) {
        console.error("Delete failed:", err);
    }
}

// Function to send the user back to create.html with the draft data
function editDraft(draftId, title, content) {
    // We store the draft temporarily in localStorage so the Create page can grab it
    localStorage.setItem('edit_draft_id', draftId);
    localStorage.setItem('draft_title', title);
    localStorage.setItem('draft_content', content);
    
    // Redirect to the create page
    window.location.href = "Create.html";
}

    /* =========================================
       1. MODAL OPENING LOGIC
       ========================================= */
    if (publishBtn) {
        publishBtn.addEventListener('click', async () => {
            const user = auth.currentUser;
            if (!user) {
                alert("Please log in to publish your story.");
                window.location.href = "login.html";
                return;
            }

            // The publishing dialog should not depend on a profile read.
            // The post can use the signed-in account as its author fallback.
            publishModal.classList.add('active');
        });
    }

    /* =========================================
       2. CREATOR NAME SETUP
       ========================================= */
    if (setNameBtn) {
        setNameBtn.addEventListener('click', async () => {
            const nameInput = document.getElementById('newCreatorName');
            const name = nameInput ? nameInput.value.trim() : "";
            const currentUser = auth.currentUser;
            
            if (!currentUser) {
                alert("Please log in to continue.");
                window.location.href = "login.html";
                return;
            }

            if (!name) return alert("A creator name is required.");

            try {
                await db.collection("Users").doc(currentUser.uid).set({
                    creatorName: name
                }, { merge: true });

                nameModal.classList.remove('active');
                publishModal.classList.add('active'); // Proceed to publish options
            } catch (err) {
                alert("Could not save name. Try again.");
            }
        });
    }

    /* =========================================
       3. FINAL PUBLISH LOGIC
       ========================================= */
    if (confirmPublish) {
        confirmPublish.addEventListener('click', async () => {
            const user = auth.currentUser;
            if (!user) {
                alert("Please log in to publish your story.");
                window.location.href = "login.html";
                return;
            }
            
            // Get Form Values
            const title = document.getElementById('postTitle').value.trim();
            const content = document.getElementById('postContent').value.trim();
            const isPublic = document.getElementById('isPublic').checked;
            const access = document.getElementById('postAccess').value;

            if (!title || !content) {
                return alert("Your story needs both a title and content!");
            }

            // Show publishing notification
            const verifyingDiv = document.createElement("div");
            verifyingDiv.textContent = "Publishing story...";
            verifyingDiv.style.position = "fixed";
            verifyingDiv.style.top = "20px";
            verifyingDiv.style.right = "20px";
            verifyingDiv.style.background = "#333";
            verifyingDiv.style.color = "#fff";
            verifyingDiv.style.padding = "10px 20px";
            verifyingDiv.style.borderRadius = "5px";
            verifyingDiv.style.zIndex = "9999";
            document.body.appendChild(verifyingDiv);

            // Visual Feedback
            confirmPublish.innerText = "Publishing...";
            confirmPublish.disabled = true;

            try {
                // Get Author Name
                let authorName = user.displayName || user.email?.split('@')[0] || "Anonymous";
                try {
                    const userDoc = await db.collection("Users").doc(user.uid).get();
                    authorName = userDoc.data()?.creatorName || authorName;
                } catch (profileError) {
                    console.warn("Profile name unavailable; using account name.", profileError);
                }

                // Save post under the user profile: Users/{uid}/posts
                await db.collection("Users").doc(user.uid).collection("posts").add({
                    title: title,
                    content: content,
                    author: authorName,
                    uid: user.uid,
                    public: isPublic,
                    status: "published",
                    access: access,
                    likes: 0,
                    dislikes: 0,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                verifyingDiv.remove();
                alert("Your story is live on the community blog!");
                window.location.href = "Blog.html";

            } catch (err) {
                verifyingDiv.remove();
                console.error("Publishing failed:", err);
                const detail = err && err.message ? err.message : "Unknown error";
                alert("Upload failed. Please check your account/session and Firestore rules.\n\n" + detail);
                confirmPublish.innerText = "Publish Now";
                confirmPublish.disabled = false;
            }
        });
    }

    /* =========================================
       4. CLOSE/CANCEL LOGIC
       ========================================= */
    if (cancelPublish) {
        cancelPublish.addEventListener('click', () => {
            publishModal.classList.remove('active');
        });
    }

    // Close modal if user clicks the dark background overlay
    window.addEventListener('click', (e) => {
        if (e.target === publishModal) publishModal.classList.remove('active');
        if (e.target === nameModal) nameModal.classList.remove('active');
    });
});