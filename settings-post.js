// ======================================================
// FRESH PAGES — SETTINGS & DRAFTS SCRIPT
// ======================================================

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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

window.toggleStats = (id) => {
    const panel = document.getElementById(`stats-${id}`);
    if (!panel) return;
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
};

document.addEventListener("DOMContentLoaded", () => {
    const postsList = document.getElementById("userPostsList");
    const draftsList = document.getElementById("draftsList");
    const nameInput = document.getElementById("displayNameInput");
    const saveProfileBtn = document.getElementById("saveProfileBtn");
    const logoutBtn = document.getElementById("logoutButton");

    async function loadUserStories(userId) {
        if (!postsList) return;

        try {
            const snapshot = await db.collection("Users").doc(userId).collection("posts").orderBy("createdAt", "desc").get();
            postsList.innerHTML = "";

            if (snapshot.empty) {
                postsList.innerHTML = "<p class='modal-hint'>No published stories yet.</p>";
                return;
            }

            snapshot.forEach(doc => {
                const story = doc.data();
                const postId = doc.id;
                const card = document.createElement("div");
                card.className = "manage-card";
                card.setAttribute("data-id", postId);
                card.innerHTML = `
                    <div class="manage-story-header" style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                        <div class="story-info">
                            <strong style="font-size: 1.1rem;">${story.title || "Untitled"}</strong>
                            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
                                <span>${story.access === 'locked' ? '🔒 Members' : '🌍 Public'}</span>
                                • <span>${story.createdAt?.toDate ? story.createdAt.toDate().toLocaleDateString() : 'Recently'}</span>
                            </div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button onclick="toggleStats('${postId}')" class="stat-pill" style="cursor:pointer; background: var(--border); border:none; color:white; padding: 6px 12px; border-radius:4px;">View Stats</button>
                            <button onclick="handleDelete('${postId}')" class="delete-btn">Delete</button>
                        </div>
                    </div>

                    <div id="stats-${postId}" class="stats-drawer" style="display:none; margin-top:15px; padding-top:15px; border-top: 1px solid var(--border); width: 100%;">
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center;">
                            <div class="stat-item">
                                <small style="color:var(--text-muted); display:block;">Likes</small>
                                <b style="color:#10b981;">👍 ${story.likes || 0}</b>
                            </div>
                            <div class="stat-item">
                                <small style="color:var(--text-muted); display:block;">Dislikes</small>
                                <b style="color:#ef4444;">👎 ${story.dislikes || 0}</b>
                            </div>
                            <div class="stat-item">
                                <small style="color:var(--text-muted); display:block;">Comments</small>
                                <b style="color:var(--accent);">💬 ${story.comments ? story.comments.length : 0}</b>
                            </div>
                        </div>
                    </div>
                `;
                postsList.appendChild(card);
            });
        } catch (err) {
            console.error("Stories load error:", err);
            if (postsList) postsList.innerHTML = "<p class='modal-hint'>Could not load your stories.</p>";
        }
    }

    async function loadUserDrafts(userId) {
        if (!draftsList) return;

        try {
            const snapshot = await db.collection("Users").doc(userId).collection("drafts").orderBy("updatedAt", "desc").get();
            draftsList.innerHTML = "";

            if (snapshot.empty) {
                draftsList.innerHTML = "<p class='modal-hint'>No saved drafts.</p>";
                return;
            }

            snapshot.forEach(doc => {
                const draft = doc.data();
                const card = document.createElement('div');
                card.className = 'manage-card';
                card.innerHTML = `
                    <div class="story-info">
                        <strong>${draft.title || "Untitled Draft"}</strong>
                        <span>Saved: ${draft.updatedAt?.toDate ? draft.updatedAt.toDate().toLocaleDateString() : "Recently"}</span>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button onclick="editDraft('${doc.id}', \`${(draft.title || '').replace(/`/g, '\\`')}\`, \`${(draft.content || '').replace(/`/g, '\\`')}\` )" class="read-more-btn" style="padding: 5px 10px;">Edit</button>
                        <button onclick="handleDeleteDraft('${doc.id}')" class="delete-btn">Delete</button>
                    </div>
                `;
                draftsList.appendChild(card);
            });
        } catch (err) {
            console.error("Drafts load error:", err);
            draftsList.innerHTML = "<p>Error loading drafts.</p>";
        }
    }

    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "login.html";
            return;
        }

        try {
            const userDoc = await db.collection("Users").doc(user.uid).get();
            if (userDoc.exists && nameInput) {
                nameInput.value = userDoc.data().creatorName || "";
            }
        } catch (e) {
            console.error("Profile load failed", e);
        }

        loadUserStories(user.uid);
        loadUserDrafts(user.uid);
    });

    if (saveProfileBtn && nameInput) {
        saveProfileBtn.addEventListener("click", async () => {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                alert("Please log in to update your profile.");
                return;
            }

            const val = nameInput.value.trim();
            if (!val) {
                alert("Please enter a creator name.");
                return;
            }

            try {
                await db.collection("Users").doc(currentUser.uid).set({ creatorName: val }, { merge: true });
                alert("Profile Saved!");
            } catch (e) {
                console.error(e);
                alert("Error saving profile.");
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            try {
                await auth.signOut();
                window.location.href = "login.html";
            } catch (error) {
                console.error("Logout Error:", error);
                alert("Could not log out. Try again.");
            }
        });
    }

    window.handleDelete = async (id) => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        if (confirm("Permanently delete this published story?")) {
            await db.collection("Users").doc(currentUser.uid).collection("posts").doc(id).delete();
            loadUserStories(currentUser.uid);
        }
    };

    window.handleDeleteDraft = async (draftId) => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        if (confirm("Delete this draft?")) {
            await db.collection("Users").doc(currentUser.uid).collection("drafts").doc(draftId).delete();
            loadUserDrafts(currentUser.uid);
        }
    };

    window.editDraft = (draftId, title, content) => {
        localStorage.setItem("edit_draft_id", draftId);
        localStorage.setItem("draft_title", title || "");
        localStorage.setItem("draft_content", content || "");
        window.location.href = "Create.html";
    };
});