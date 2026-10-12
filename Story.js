console.log("story.js is loading..."); // To verify link

document.addEventListener("DOMContentLoaded", () => {
    const db = firebase.firestore();
    const auth = firebase.auth();
    const params = new URLSearchParams(window.location.search);
    const storyId = params.get("id");
    const storyOwnerUid = params.get("uid");

    const storyMessage = document.getElementById("storyMessage");
    const storyContent = document.getElementById("storyContent");
    const lockOverlay = document.getElementById("lockOverlay");
    if (!storyId) {
        if (storyMessage) storyMessage.textContent = "This story link is missing its ID. Return to the Blog and choose a story.";
        return;
    }

    auth.onAuthStateChanged(async (user) => {
        try {
            let doc;
            if (storyOwnerUid) {
                doc = await db.collection("Users").doc(storyOwnerUid).collection("posts").doc(storyId).get();
            } else {
                doc = await db.collection("posts").doc(storyId).get();
            }
            if (!doc.exists) {
                if (storyMessage) storyMessage.textContent = "Story not found. It may have been removed; return to the Blog to choose another story.";
                return;
            }

            const post = doc.data();
            const isFree = post.access !== "locked";
            const isLoggedIn = user !== null;

            if (isFree || isLoggedIn) {
                if (storyMessage) storyMessage.hidden = true;
                if (storyContent) storyContent.style.display = "block";
                document.getElementById("storyTitle").textContent = post.title || "Untitled story";
                document.getElementById("storyBody").textContent = post.content || "This story has no content.";
                document.getElementById("likeCount").textContent = post.likes || 0;
                document.getElementById("dislikeCount").textContent = post.dislikes || 0;
                const storyMeta = document.getElementById("storyMeta");
                const date = post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : "";
                storyMeta.textContent = `By ${post.author || "Anonymous"}${date ? ` · ${date}` : ""}`;
                await loadComments(db, storyId);
            } else {
                if (storyMessage) storyMessage.hidden = true;
                if (lockOverlay) lockOverlay.style.display = "block";
            }
        } catch (err) {
            console.error("Firebase story load error:", err);
            if (storyMessage) storyMessage.textContent = `Could not load this story: ${err.message || "Please try again."}`;
        }
    });

    // Button Logic
    document.getElementById("likeBtn")?.addEventListener("click", () => updateStat(db, auth, storyId, 'likes'));
    document.getElementById("dislikeBtn")?.addEventListener("click", () => updateStat(db, auth, storyId, 'dislikes'));
    document.getElementById("commentForm")?.addEventListener("submit", (event) => {
        event.preventDefault();
        postComment(db, auth, storyId);
    });
});

async function updateStat(db, auth, id, field) {
    if (!auth.currentUser) return alert("Please log in");
    const params = new URLSearchParams(window.location.search);
    const storyOwnerUid = params.get("uid");
    const storyRef = storyOwnerUid
        ? db.collection("Users").doc(storyOwnerUid).collection("posts").doc(id)
        : db.collection("posts").doc(id);
    try {
        await storyRef.update({
            [field]: firebase.firestore.FieldValue.increment(1)
        });
        location.reload();
    } catch (err) {
        alert(`Could not update this reaction: ${err.message}`);
    }
}

async function postComment(db, auth, id) {
    const user = auth.currentUser;
    const input = document.getElementById("commentInput");
    const text = input ? input.value.trim() : "";
    if (!user) return alert("Please log in to comment.");
    if (!text) return;
    const params = new URLSearchParams(window.location.search);
    const storyOwnerUid = params.get("uid");
    const commentsRef = storyOwnerUid
        ? db.collection("Users").doc(storyOwnerUid).collection("posts").doc(id).collection("comments")
        : db.collection("posts").doc(id).collection("comments");

    try {
        await commentsRef.add({
            text: text,
            author: user.displayName || user.email?.split("@")[0] || "Member",
            uid: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        location.reload();
    } catch (err) {
        alert(`Could not post comment: ${err.message}`);
    }
}

function loadComments(db, id) {
    const params = new URLSearchParams(window.location.search);
    const storyOwnerUid = params.get("uid");
    const commentsRef = storyOwnerUid
        ? db.collection("Users").doc(storyOwnerUid).collection("posts").doc(id).collection("comments")
        : db.collection("posts").doc(id).collection("comments");
    return commentsRef.orderBy("createdAt", "desc").get().then(snap => {
        const display = document.getElementById("commentsDisplay");
        if (!display) return;
        snap.forEach(doc => {
            const c = doc.data();
            const item = document.createElement("div");
            item.className = "comment-item";
            const author = document.createElement("b");
            author.textContent = `${c.author || "Member"}: `;
            item.append(author, document.createTextNode(c.text || ""));
            display.appendChild(item);
        });
    }).catch(err => console.warn("Comments could not be loaded:", err));
}