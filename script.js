// ======================================================
// FRESH PAGES — MASTER SCRIPT.JS
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Fresh Pages Script Loaded");

    // --- 1. FIREBASE SETUP ---
    try {
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
    } catch (error) {
        console.error("Firebase initialization failed:", error);
    }

    const hasFirebase = typeof firebase !== "undefined"
        && firebase.apps.length > 0
        && typeof firebase.auth === "function"
        && typeof firebase.firestore === "function";
    if (!hasFirebase) {
        console.warn("Firebase SDK is not loaded on this page.");
        const unavailableMessage = "Sign-in is temporarily unavailable. Check your connection, then reload the page.";
        [
            { form: document.getElementById("signup-form"), message: document.getElementById("signupError") },
            { form: document.getElementById("loginForm"), message: document.getElementById("loginError") }
        ].forEach(({ form, message }) => {
            if (!form) return;
            form.addEventListener("submit", (event) => {
                event.preventDefault();
                if (message) {
                    message.textContent = unavailableMessage;
                    message.hidden = false;
                    message.style.display = "block";
                }
            });
        });
        return;
    }

    const auth = firebase.auth();
    const db = firebase.firestore();
    const getAuthErrorMessage = (error, action) => {
        const code = error && error.code;
        const messages = {
            "auth/invalid-email": "Enter a valid email address.",
            "auth/email-already-in-use": "An account already uses this email. Try logging in instead.",
            "auth/weak-password": "Choose a stronger password with at least 6 characters.",
            "auth/user-not-found": "The email or password is incorrect. Check your details or create an account.",
            "auth/wrong-password": "The email or password is incorrect. Check your details or reset your password.",
            "auth/invalid-credential": "The email or password is incorrect. Check your details and try again.",
            "auth/invalid-login-credentials": "The email or password is incorrect. Check your details and try again.",
            "auth/user-disabled": "This account is currently disabled. Contact support for help.",
            "auth/too-many-requests": "Too many attempts. Wait a little while, then try again.",
            "auth/network-request-failed": "Couldn't connect. Check your internet connection and try again.",
            "auth/operation-not-allowed": "Email and password accounts aren't enabled right now. Contact support."
        };
        return messages[code] || `We couldn't ${action}. Please try again.`;
    };
    const authLoadingScreen = document.createElement("div");
    authLoadingScreen.className = "auth-loading-screen";
    authLoadingScreen.setAttribute("role", "status");
    authLoadingScreen.setAttribute("aria-live", "polite");
    authLoadingScreen.setAttribute("aria-hidden", "true");
    authLoadingScreen.innerHTML = `
        <div class="auth-loading-card">
            <div class="auth-loading-art" aria-hidden="true">
                <span class="loading-sparkle loading-sparkle-one">✦</span>
                <span class="loading-sparkle loading-sparkle-two">✳</span>
                <span class="loading-book"><span></span><span></span></span>
            </div>
            <p class="auth-loading-kicker">FRESH PAGES</p>
            <h2 class="auth-loading-title">Your next chapter is loading</h2>
            <p class="auth-loading-message">Making a little room for your stories...</p>
            <div class="auth-loading-dots" aria-hidden="true"><span></span><span></span><span></span></div>
        </div>`;
    document.body.appendChild(authLoadingScreen);

    const showAuthLoading = (title, message) => {
        authLoadingScreen.querySelector(".auth-loading-title").textContent = title;
        authLoadingScreen.querySelector(".auth-loading-message").textContent = message;
        authLoadingScreen.classList.add("is-visible");
        authLoadingScreen.style.visibility = "visible";
        authLoadingScreen.style.opacity = "1";
        authLoadingScreen.style.pointerEvents = "auto";
        authLoadingScreen.setAttribute("aria-hidden", "false");
    };
    const hideAuthLoading = () => {
        authLoadingScreen.classList.remove("is-visible");
        authLoadingScreen.style.visibility = "";
        authLoadingScreen.style.opacity = "";
        authLoadingScreen.style.pointerEvents = "";
        authLoadingScreen.setAttribute("aria-hidden", "true");
    };
    const authTransitionDelay = () => new Promise(resolve => window.setTimeout(resolve, 650));

    // --- 2. SIGNUP WITH AGE VERIFICATION ---
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const fullName = document.getElementById('fullName').value.trim();
            const dobValue = document.getElementById('dob').value;
            const btn = signupForm.querySelector('.auth-btn');
            const errorMsg = document.getElementById('signupError');
            const showError = (message) => {
                errorMsg.textContent = message;
                errorMsg.hidden = false;
            };

            const birthDate = dobValue ? new Date(`${dobValue}T00:00:00`) : null;
            const today = new Date();
            if (!fullName) {
                showError("Enter your name to create an account.");
                return;
            }
            if (!birthDate || Number.isNaN(birthDate.getTime()) || birthDate > today) {
                showError("Please enter a valid date of birth.");
                return;
            }

            let age = today.getFullYear() - birthDate.getFullYear();
            if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
                age--;
            }

            if (age < 12) {
                showError("You must be at least 12 years old to create an account.");
                return;
            }
            const parentalGuidance = age === 12;

            errorMsg.hidden = true;
            btn.textContent = "Creating account...";
            btn.disabled = true;
            showAuthLoading("Making your space...", "Getting your Fresh Pages account ready...");

            let accountCreated = false;
            try {
                let user = auth.currentUser;
                if (!user || (user.email || "").toLowerCase() !== email.toLowerCase()) {
                    const credential = await auth.createUserWithEmailAndPassword(email, password);
                    user = credential.user;
                    accountCreated = true;
                }

                await user.updateProfile({ displayName: fullName });
                await db.collection("Users").doc(user.uid).set({
                    uid: user.uid,
                    email: user.email,
                    name: fullName,
                    age: age,
                    dob: dobValue,
                    parentalGuidance: parentalGuidance,
                    createdAt: user.metadata.creationTime || new Date().toISOString(),
                    bio: "New writer on Fresh Pages"
                });
                showAuthLoading("You're in!", "Your new story space is ready. Taking you to the stories...");
                await authTransitionDelay();
                window.location.href = "Blog.html";
            } catch (error) {
                hideAuthLoading();
                console.error("Account creation or profile setup failed:", error);
                if (accountCreated || (auth.currentUser && (auth.currentUser.email || "").toLowerCase() === email.toLowerCase())) {
                    showError("Your account is created, but we couldn't finish setting up your profile. Check your connection and submit again to retry.");
                } else {
                    showError(getAuthErrorMessage(error, "create your account"));
                }
            } finally {
                btn.textContent = "Create account";
                btn.disabled = false;
            }
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

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const btn = loginForm.querySelector('.auth-btn');
        const errorMsg = document.getElementById('loginError');
        errorMsg.style.display = "none";

        try {
            btn.textContent = "Logging in...";
            btn.disabled = true;
            showAuthLoading("Welcome back!", "Finding your place in the story...");

            await auth.signInWithEmailAndPassword(email, password);
            showAuthLoading("You're back!", "Your stories are waiting. Taking you there...");
            await authTransitionDelay();
            window.location.href = "Blog.html";
        } catch (error) {
            hideAuthLoading();
            console.error("Login failed:", error);
            if (errorMsg) {
                errorMsg.textContent = getAuthErrorMessage(error, "log in");
                errorMsg.style.display = "block";
            } else {
                alert(getAuthErrorMessage(error, "log in"));
            }
        } finally {
            btn.textContent = "Log in";
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
    auth.onAuthStateChanged(async user => {
        // Select the items we want to hide or show
        const loggedOutItems = document.querySelectorAll(".nav-auth-logged-out");
        const loggedInItems = document.querySelectorAll(".nav-auth-logged-in");
        const headerUserNames = document.querySelectorAll(".header-user-name");
        const profileGreeting = document.getElementById("profileGreeting");
        const avatarCircle = document.querySelector(".avatar-circle");

        if (user) {
            console.log("👤 User Logged In:", user.email);
            const fallbackName = user.displayName || (user.email ? user.email.split("@")[0] : "Reader");
            headerUserNames.forEach(el => {
                el.textContent = `Hey, ${fallbackName} ✨`;
                el.hidden = false;
            });
            
            // Show Settings/Logout, Hide Login/Signup
            loggedOutItems.forEach(el => el.style.display = "none");
            loggedInItems.forEach(el => el.style.display = "block");
            // Update sidebar greeting and avatar
            if (profileGreeting) {
                profileGreeting.textContent = `Welcome, ${fallbackName}`;
            }
            if (avatarCircle) {
                avatarCircle.textContent = fallbackName[0].toUpperCase();
            }

            try {
                const userDoc = await db.collection("Users").doc(user.uid).get();
                if (auth.currentUser && auth.currentUser.uid === user.uid && userDoc.exists) {
                    const profile = userDoc.data();
                    const name = profile.creatorName || profile.name || fallbackName;
                    headerUserNames.forEach(el => {
                        el.textContent = `Hey, ${name} ✨`;
                    });
                    if (profileGreeting) profileGreeting.textContent = `Welcome, ${name}`;
                    if (avatarCircle) avatarCircle.textContent = name[0].toUpperCase();
                }
            } catch (error) {
                console.warn("Could not load the profile name for the header:", error);
            }
        } else {
            console.log("🌐 Guest Mode Active");
            headerUserNames.forEach(el => {
                el.hidden = true;
                el.textContent = "";
            });
            
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