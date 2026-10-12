// =========================================
// BLOG.JS - UPDATED FOR INDIVIDUAL ACCESS
// =========================================

document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("blogGrid");
    const featuredHero = document.getElementById("featuredHero");
    const blogSearch = document.getElementById("blogSearch");
    const clearSearch = document.getElementById("clearSearch");
    const loadMoreBtn = document.getElementById("loadMoreBtn");

    function setFeaturedEmpty() {
        if (!featuredHero) return;
        const body = document.createElement('div');
        body.className = 'hero-body';
        const heading = document.createElement('h3');
        heading.textContent = 'Featured stories';
        const message = document.createElement('p');
        message.textContent = 'No featured stories yet. New content will appear here soon.';
        body.append(heading, message);
        featuredHero.replaceChildren(body);
    }

    function setGridMessage(message, className = '') {
        if (!grid) return;
        const element = document.createElement('p');
        element.className = className;
        element.textContent = message;
        grid.replaceChildren(element);
    }

    function safeImageUrl(value) {
        if (typeof value !== 'string' || !value.trim()) return '';
        try {
            const url = new URL(value, window.location.href);
            return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
        } catch {
            return '';
        }
    }

    function showEmptyStoriesState() {
        setFeaturedEmpty();
        setGridMessage('No community stories yet. Be the first to create one!');
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        if (blogSearch) blogSearch.disabled = true;
        if (clearSearch) clearSearch.disabled = true;
    }

    const ALL_STORIES_DISABLED = false;
    if (ALL_STORIES_DISABLED) {
        showEmptyStoriesState();
        return;
    }

    // Guard: ensure Firebase SDK is available
    if (typeof firebase === 'undefined') {
        if (grid) grid.innerHTML = `<p style="color:#ef4444;text-align:center;">Firebase SDK not loaded — stories cannot be displayed.</p>`;
        return;
    }
    const auth = firebase.auth();
    const db = firebase.firestore();

    let posts = [];
    const perPage = 8;
    let currentPage = 1;

    // Utility: debounce to reduce render frequency while typing
    function debounce(fn, wait) {
        let t = null;
        return function(...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), wait);
        };
    }

    // Load posts when auth state is known (so locking logic can work)
    auth.onAuthStateChanged((user) => {
        loadCommunityPosts(user).catch(err => console.error(err));
    });

    async function loadCommunityPosts(user) {
        if (!grid) return;
        grid.innerHTML = `<p class="loading-msg">Loading stories...</p>`;

        try {
            const snap = await db.collectionGroup("posts")
                .where("status", "in", ["published", "pending"])
                .get();
            posts = snap.docs
                .map(d => ({ id: d.id, data: d.data() }))
                .filter(item => {
                    const data = item.data || {};
                    return data.public !== false;
                })
                .sort((first, second) => {
                    const firstTime = first.data.createdAt?.toMillis?.() || 0;
                    const secondTime = second.data.createdAt?.toMillis?.() || 0;
                    return secondTime - firstTime;
                });

            if (!posts.length) {
                setFeaturedEmpty();
                setGridMessage('No community stories yet. Be the first to create one!');
                loadMoreBtn && (loadMoreBtn.style.display = 'none');
                return;
            }

            renderFeatured(posts);
            currentPage = 1;
            renderPosts(user);
            setupSearch(user);
        } catch (err) {
            console.error("Error loading posts:", err);
            setGridMessage(`Failed to load stories: ${err.message || 'Unknown Firestore error'}`, 'story-load-error');
        }
    }

    function renderFeatured(list) {
        if (!featuredHero) return;
        const featured = list.find(p => p.data.featured) || list[0];
        if (!featured) return;
        const title = document.createElement('h3');
        title.textContent = featured.data.title || 'Featured';
        const preview = document.createElement('p');
        const content = featured.data.content || '';
        preview.textContent = content ? `${content.substring(0, 160)}...` : '';
        const body = document.createElement('div');
        body.className = 'hero-body';
        const readLink = document.createElement('a');
        readLink.className = 'btn primary';
        const query = new URLSearchParams({ id: featured.id });
        if (featured.data.uid) query.set('uid', featured.data.uid);
        readLink.href = `Story.html?${query.toString()}`;
        readLink.textContent = 'Read Featured';
        const linkWrapper = document.createElement('div');
        linkWrapper.style.marginTop = '12px';
        linkWrapper.appendChild(readLink);
        body.append(title, preview, linkWrapper);
        const children = [body];
        const imageUrl = safeImageUrl(featured.data.thumbnail);
        if (imageUrl) {
            const thumb = document.createElement('div');
            thumb.className = 'story-thumb';
            thumb.style.cssText = 'width:180px;height:120px;border-radius:8px;background-size:cover;background-position:center;margin-left:18px';
            thumb.style.backgroundImage = `url("${imageUrl.replace(/["\\]/g, '')}")`;
            children.push(thumb);
        }
        featuredHero.replaceChildren(...children);
    }

    function renderPosts(user) {
        grid.innerHTML = '';
        const term = (blogSearch && blogSearch.value.trim().toLowerCase()) || '';
        const filtered = posts.filter(p => {
            const d = p.data || {};
            const hay = `${d.title || ''} ${d.content || ''} ${d.author || ''} ${(d.tags || '').join ? (d.tags || '').join(' ') : (d.tags || '')}`.toLowerCase();
            return !term || hay.includes(term);
        });

        const start = 0;
        const end = perPage * currentPage;
        const slice = filtered.slice(start, end);

        if (!slice.length) {
            setGridMessage('No stories match your search.', 'loading-msg');
            loadMoreBtn && (loadMoreBtn.style.display = 'none');
            return;
        }

        slice.forEach(item => {
            const card = createCard(item, user);
            grid.appendChild(card);
        });

        if (filtered.length > end) {
            loadMoreBtn && (loadMoreBtn.style.display = 'inline-block');
        } else {
            loadMoreBtn && (loadMoreBtn.style.display = 'none');
        }

        // initialize lazy loader for thumbnails
        setupLazyLoad();
    }

    function createCard(item, user) {
        const post = item.data || {};
        const card = document.createElement('div');
        card.className = 'story-card';

        const isLockedForVisitor = post.access === 'locked' && !user;
        if (isLockedForVisitor) card.classList.add('locked');

        // date
        let postDate = '';
        try {
            if (post.createdAt && post.createdAt.toDate) postDate = post.createdAt.toDate().toLocaleDateString();
            else if (post.createdAt) postDate = new Date(post.createdAt).toLocaleDateString();
        } catch (e) { postDate = ''; }

        const words = post.content ? post.content.split(/\s+/).length : 0;
        const readTime = Math.max(1, Math.ceil((words || 120) / 200));

        const titleText = post.title || 'Untitled';
        const thumbnailUrl = safeImageUrl(post.thumbnail);
        const thumb = document.createElement('div');
        if (thumbnailUrl) {
            thumb.className = 'story-thumb';
            thumb.dataset.src = thumbnailUrl;
        } else {
            thumb.className = 'story-thumb empty';
            thumb.textContent = titleText.charAt(0).toUpperCase();
        }

        const meta = document.createElement('div');
        meta.className = 'meta-row';
        const author = document.createElement('span');
        author.className = 'story-author';
        author.textContent = `By ${post.author || 'Anonymous'}`;
        const date = document.createElement('span');
        date.className = 'post-date';
        date.textContent = postDate;
        const time = document.createElement('span');
        time.className = 'read-time';
        time.textContent = `${readTime} min read`;
        for (const value of [author, date, time]) {
            if (meta.childNodes.length) {
                const dot = document.createElement('span');
                dot.className = 'meta-dot';
                dot.textContent = '•';
                meta.appendChild(dot);
            }
            meta.appendChild(value);
        }

        const textContent = document.createElement('div');
        textContent.className = 'card-text-content';
        textContent.appendChild(meta);
        const heading = document.createElement('h3');
        heading.textContent = `${titleText}${post.access === 'locked' ? ' 🔒' : ''}`;
        const preview = document.createElement('p');
        preview.className = 'preview-text';
        preview.textContent = post.content ? `${post.content.substring(0, 140)}...` : 'No content available.';
        textContent.append(heading, preview);

        const link = document.createElement('a');
        link.className = 'read-more-btn';
        if (isLockedForVisitor) {
            link.href = 'signup.html';
            link.textContent = 'Sign Up to Unlock';
        } else {
            const query = new URLSearchParams({ id: item.id });
            if (post.uid) query.set('uid', post.uid);
            link.href = `Story.html?${query.toString()}`;
            link.textContent = 'Read Story';
        }
        card.append(thumb, textContent, link);

        return card;
    }

    // Lazy load background images for .story-thumb[data-src]
    let lazyObserver = null;
    function setupLazyLoad() {
        const thumbs = document.querySelectorAll('.story-thumb[data-src]');
        if (!thumbs.length) return;
        if ('IntersectionObserver' in window) {
            if (lazyObserver) lazyObserver.disconnect();
            lazyObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const el = entry.target;
                        const src = el.getAttribute('data-src');
                        if (src) {
                            el.style.backgroundImage = `url('${src}')`;
                            el.removeAttribute('data-src');
                        }
                        lazyObserver.unobserve(el);
                    }
                });
            }, { rootMargin: '100px' });

            thumbs.forEach(t => lazyObserver.observe(t));
        } else {
            // fallback: load immediately
            thumbs.forEach(el => {
                const src = el.getAttribute('data-src');
                if (src) el.style.backgroundImage = `url('${src}')`;
                el.removeAttribute('data-src');
            });
        }
    }

    function setupSearch(user) {
        if (blogSearch) {
            const handler = debounce(() => { currentPage = 1; renderPosts(user); }, 220);
            blogSearch.addEventListener('input', handler);
            // also run on Enter immediately
            blogSearch.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); currentPage = 1; renderPosts(user); } });
        }
        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                if (blogSearch) blogSearch.value = '';
                currentPage = 1; renderPosts(user);
            });
        }
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => { currentPage++; renderPosts(user); });
        }
    }

    // 3. Footer Message Logic (kept for backward compatibility)
    const footerSendBtn = document.getElementById("footerSendBtn");
    const footerMessageInput = document.getElementById("footerMessage");

    if (footerSendBtn) {
        footerSendBtn.addEventListener("click", async () => {
            const message = footerMessageInput ? footerMessageInput.value.trim() : '';
            if (!message) return alert("Please type a message.");

            const currentUser = auth.currentUser;

            try {
                await db.collection("messages").add({
                    message: message,
                    senderEmail: currentUser ? currentUser.email : "Guest",
                    senderUid: currentUser ? currentUser.uid : "None",
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                if (footerMessageInput) footerMessageInput.value = '';
                alert("Message sent to the Fresh Pages team!");
            } catch (err) {
                console.error("Footer error:", err);
                alert("Couldn't send message.");
            }
        });
    }
});

// (end)