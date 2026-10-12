// ======================================================
// FRESH PAGES — MASTER SCRIPT.JS
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Fresh Pages Script Loaded");

    // --- 1. FIREBASE SETUP ---
    if (typeof firebase !== "undefined" && firebase.apps.length === 0) {
        firebase.initializeApp({
            apiKey: "AIzaSyBzOCqa-Ab7A6z-eaRpBKljCA-gb0Quzxg",
            authDomain: "fresh-pages-f8d84.firebaseapp.com",
            projectId: "fresh-pages-f8d84",
            storageBucket: "fresh-pages-f8d84.firebasestorage.app",
            messagingSenderId: "649436378724",
            appId: "1:649436378724:web:b526af90fa94a7f605d171",
            databaseURL: "https://fresh-pages-f8d84-default-rtdb.firebaseio.com"
        });
        console.log("🔥 Firebase Initialized");
    }

    const hasFirebase = typeof firebase !== "undefined" && firebase.apps;
    if (!hasFirebase) {
        console.warn("Firebase SDK is not loaded on this page.");
        return;
    }

    const auth = firebase.auth();
    const db = firebase.firestore();
    // --- 2. SIGNUP WITH AGE VERIFICATION ---
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.onsubmit = (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const fullName = document.getElementById('fullName')?.value.trim() || "New User";
            const dobValue = document.getElementById('dob').value;
            const btn = signupForm.querySelector('.auth-btn');
            const errorMsg = document.getElementById('signupError');

            // Age Check
            const birthDate = new Date(`${dobValue}T00:00:00`);
            const today = new Date();
            if (!dobValue || Number.isNaN(birthDate.getTime()) || birthDate > today) {
                if (errorMsg) {
                    errorMsg.textContent = "Please enter a valid date of birth.";
                    errorMsg.hidden = false;
                } else {
                    alert("Please enter a valid date of birth.");
                }
                return;
            }
            let age = today.getFullYear() - birthDate.getFullYear();
            if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
                age--;
            }


                if (age < 12) {
                    if (errorMsg) {
                        errorMsg.textContent = "You must be at least 12 years old to create an account.";
                        errorMsg.hidden = false;
                    } else {
                        alert("You must be at least 12 years old to create an account.");
                    }
                    return;
                }
                let parentalGuidance = false;
                if (age === 12) {
                    parentalGuidance = true;
                }

            if (errorMsg) errorMsg.hidden = true;

            btn.innerText = "Creating Account...";
            btn.disabled = true;

            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                        return db.collection("Users").doc(userCredential.user.uid).set({
                            uid: userCredential.user.uid,
                            email: email,
                            name: fullName,
                            age: age,
                            dob: dobValue,
                            parentalGuidance: parentalGuidance,
                            createdAt: new Date().toISOString(),
                            bio: "New writer on Fresh Pages"
                        });
                })
                .then(() => { window.location.href = "Blog.html"; })
                .catch((error) => {
                    if (errorMsg) {
                        errorMsg.textContent = error.message;
                        errorMsg.hidden = false;
                    } else {
                        alert(error.message);
                    }
                    btn.innerText = "Sign Up";
                    btn.disabled = false;
                });
        };
    }

// --- 3. LOGIN LOGIC (Direct Click Version) ---
// --- 3. LOGIN LOGIC ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    const passwordToggle = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('loginPassword');
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', () => {
            const isHidden = passwordInput.type === 'password';
            passwordInput.type = isHidden ? 'text' : 'password';
            passwordToggle.textContent = isHidden ? 'Hide' : 'Show';
            passwordToggle.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
        });
    }

    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const forgotModal = document.getElementById('forgotModal');
    const forgotEmailInput = document.getElementById('forgotEmailInput');
    const forgotEmailBtn = document.getElementById('forgotEmailBtn');
    const forgotEmailMsg = document.getElementById('forgotEmailMsg');

    if (forgotPasswordLink && forgotModal) {
        forgotPasswordLink.addEventListener('click', () => {
            forgotEmailInput.value = document.getElementById('loginEmail').value.trim();
            forgotEmailMsg.textContent = '';
            forgotEmailMsg.style.display = 'none';
            forgotModal.style.display = 'flex';
            forgotEmailInput.focus();
        });
    }

    document.getElementById('closeForgotModal')?.addEventListener('click', () => {
        forgotModal.style.display = 'none';
    });

    forgotModal?.addEventListener('click', (event) => {
        if (event.target === forgotModal) forgotModal.style.display = 'none';
    });

    if (forgotEmailBtn && forgotEmailInput && forgotEmailMsg) {
        forgotEmailInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                forgotEmailBtn.click();
            }
        });
        forgotEmailBtn.addEventListener('click', async () => {
            const email = forgotEmailInput.value.trim();
            if (!email) {
                forgotEmailMsg.textContent = 'Enter the email address for your account.';
                forgotEmailMsg.style.display = 'block';
                return;
            }

            forgotEmailBtn.disabled = true;
            forgotEmailBtn.textContent = 'Sending…';
            forgotEmailMsg.style.display = 'none';
            try {
                await auth.sendPasswordResetEmail(email);
                forgotEmailMsg.textContent = 'If an account exists for that address, Firebase has sent a password reset link.';
                forgotEmailMsg.style.display = 'block';
            } catch (error) {
                console.error('Password reset request failed:', error);
                forgotEmailMsg.textContent = 'Could not send a reset link. Check the email and try again.';
                forgotEmailMsg.style.display = 'block';
            } finally {
                forgotEmailBtn.disabled = false;
                forgotEmailBtn.textContent = 'Send reset link';
            }
        });
    }

    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        console.log("🚀 Login process started");

        // Check Firebase initialization
        if (typeof firebase === "undefined" || !firebase.apps.length) {
            console.error("❌ Firebase not initialized");
            document.getElementById('loginError').textContent = "Login system error. Please try again later.";
            document.getElementById('loginError').style.display = "block";
            return;
        }

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const btn = loginForm.querySelector('.auth-btn');
        const errorMsg = document.getElementById('loginError');
        if (errorMsg) errorMsg.style.display = "none";

        try {
            btn.innerText = "Logging in...";
            btn.disabled = true;

            // Perform Login
            await auth.signInWithEmailAndPassword(email, password);
            console.log("✅ Firebase Auth Success");

            // INSTEAD OF checkAuthStatus(), we just redirect. 
            // The onAuthStateChanged listener will handle the rest!
            window.location.href = "Blog.html";

        } catch (error) {
            console.error("❌ Login Error:", error.message);
            if (errorMsg) {
                errorMsg.textContent = error.message;
                errorMsg.style.display = "block";
            } else {
                alert(error.message);
            }
            btn.innerText = "Log In";
            btn.disabled = false;
        }
    };
}

// --- 4. SAVE DRAFT ---
    const saveDraftBtn = document.getElementById('save-draft-btn');
    if (saveDraftBtn) {
        saveDraftBtn.onclick = async (e) => {
            e.preventDefault();
            const user = auth.currentUser;

            if (!user) {
                // Trigger your signup modal
                const modal = document.getElementById('signup-modal');
                if (modal) {
                    modal.style.display = "block";
                } else {
                    alert("Create an account to save drafts and keep your writing safe!");
                }
                return;
            }

            // Normal save logic for logged-in users...
            const title = document.getElementById('post-title').value.trim();
            const content = document.getElementById('post-content').value.trim();

            try {
                await db.collection("Users").doc(user.uid).collection("drafts").add({
                    title: title,
                    content: content,
                    uid: user.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                alert("Draft saved!");
            } catch (err) { alert(err.message); }
        };
    }

// --- 5. PUBLISH WITH VERIFICATION ---
    const publishBtn = document.getElementById('publish-btn');
    if (publishBtn) {
        publishBtn.onclick = async (e) => {
            e.preventDefault();
            
            const user = auth.currentUser;
            if (!user) {
                alert("Log in to publish your story.");
                return;
            }
            
            const title = document.getElementById('post-title').value.trim();
            const content = document.getElementById('post-content').value.trim();

            if (!title || !content) {
                alert("Fill in all fields!");
                return;
            }

            try {
                console.log("📡 Attempting to publish...");
                
                await db.collection("Users").doc(user.uid).collection("posts").add({
                    authorId: user.uid,
                    authorEmail: user.email,
                    authorType: "Member",
                    uid: user.uid,
                    title: title,
                    content: content,
                    public: true,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    status: "published",
                    access: "free"
                });
                
                alert("Published!");
                window.location.href = "Blog.html";
            } catch (err) { 
                console.error("❌ Firestore Error:", err);
                alert("Permission Denied: You might need to update your Firestore Rules."); 
            }
        };
    }

    // --- 6. HELP CENTER (Messages Collection) ---
    const helpForm = document.getElementById('help-form');
    if (helpForm) {
        helpForm.onsubmit = async (e) => {
            e.preventDefault();
            const messageEl = document.getElementById('help-message') || document.getElementById('footerMessage');
            if (!messageEl) return; // nothing to do
            const message = messageEl.value.trim();
            const user = auth.currentUser;
            let userEmail = user ? user.email : prompt("Enter email:");

            try {
                await db.collection("messages").add({
                    email: userEmail,
                    message: message,
                    createdAt: new Date().toISOString(),
                    status: "unread"
                });
                alert("Message Sent!");
                // Clear the specific message element if present
                if (messageEl.tagName.toLowerCase() === 'textarea' || messageEl.tagName.toLowerCase() === 'input') {
                    messageEl.value = '';
                }
                // if the form has a reset method, call it
                if (typeof helpForm.reset === 'function') helpForm.reset();
            } catch (err) { console.error(err); }
        };
    }

   // --- 7. AUTH STATE & UI PROTECTION ---
    auth.onAuthStateChanged(user => {
        // Select the items we want to hide or show
        const loggedOutItems = document.querySelectorAll(".nav-auth-logged-out");
        const loggedInItems = document.querySelectorAll(".nav-auth-logged-in");
        const profileGreeting = document.getElementById("profileGreeting");
        const avatarCircle = document.querySelector(".avatar-circle");

        if (user) {
            console.log("👤 User Logged In:", user.email);
            
            // Show Settings/Logout, Hide Login/Signup
            loggedOutItems.forEach(el => el.style.display = "none");
            loggedInItems.forEach(el => el.style.display = "block");
            // Update sidebar greeting and avatar
            if (profileGreeting) {
                const name = user.displayName || user.email.split("@")[0];
                profileGreeting.textContent = `Welcome, ${name}`;
            }
            if (avatarCircle) {
                avatarCircle.textContent = (user.displayName || user.email)[0].toUpperCase();
            }
        } else {
            console.log("🌐 Guest Mode Active");
            
            // Show Login/Signup, Hide Settings/Logout
            loggedOutItems.forEach(el => el.style.display = "block");
            loggedInItems.forEach(el => el.style.display = "none");
            // Reset sidebar greeting and avatar
            if (profileGreeting) profileGreeting.textContent = "Welcome";
            if (avatarCircle) avatarCircle.textContent = "U";
            // Kick guests out of private pages
            const privatePages = ["/settings.html", "/admin.html"];
            const currentPath = window.location.pathname.toLowerCase();
            if (privatePages.some(page => currentPath.endsWith(page))) {
                window.location.href = "login.html";
            }
        }
    });

    // --- 8. UI HELPERS (Theme/Sidebar/Logout) ---
    // Theme switching is handled centrally by theme-engine.js.

    // This makes the logout function accessible to your HTML buttons
    window.logoutAction = () => {
        console.log("👋 Logging out...");
        auth.signOut().then(() => {
            window.location.href = "index.html";
        }).catch(err => alert(err.message));
    };

    // Highlight active nav link based on current URL
    try {
        const navLinks = document.querySelectorAll('.nav a');
        navLinks.forEach(a => {
            const href = a.getAttribute('href');
            if (href && window.location.pathname.endsWith(href)) {
                a.classList.add('active');
            }
        });
    } catch (e) { /* ignore */ }

    // Shrink header on scroll for a sleeker effect
    const header = document.querySelector('.site-header');
    if (header) {
        const onScroll = () => {
            if (window.scrollY > 36) header.classList.add('shrink');
            else header.classList.remove('shrink');
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

}); // <--- THIS correctly closes the document.addEventListener("DOMContentLoaded", () {