/* AGL Live Chat Widget — visitor side */
(function () {
    if (window.__aglChatLoaded) return;
    window.__aglChatLoaded = true;

    // ── STYLES ──────────────────────────────────────────────────────────────────
    const css = `
    #agl-chat-btn {
        position:fixed; bottom:90px; right:24px; z-index:9998;
        width:56px; height:56px; border-radius:50%;
        background:linear-gradient(135deg,#0b1f3a,#1a4a7a);
        color:#fff; border:none; cursor:pointer;
        display:flex; align-items:center; justify-content:center;
        font-size:1.4rem; box-shadow:0 4px 20px rgba(11,31,58,0.55);
        transition:transform .25s,box-shadow .25s;
    }
    #agl-chat-btn:hover { transform:scale(1.1); box-shadow:0 6px 28px rgba(11,31,58,0.7); }
    #agl-chat-btn .agl-chat-badge {
        position:absolute; top:-4px; right:-4px;
        background:#ff4757; color:#fff; font-size:.6rem; font-weight:700;
        width:18px; height:18px; border-radius:50%;
        display:none; align-items:center; justify-content:center;
        border:2px solid #fff;
    }
    #agl-chat-window {
        position:fixed; bottom:160px; right:24px; z-index:9999;
        width:360px; max-height:520px;
        background:#ffffff; border-radius:20px;
        box-shadow:0 20px 60px rgba(0,0,0,0.18), 0 4px 20px rgba(0,0,0,0.08);
        display:flex; flex-direction:column; overflow:hidden;
        transform:scale(.85) translateY(20px); opacity:0;
        transition:transform .3s cubic-bezier(.34,1.56,.64,1), opacity .25s ease;
        pointer-events:none;
    }
    #agl-chat-window.open {
        transform:scale(1) translateY(0); opacity:1; pointer-events:all;
    }
    .agl-cw-header {
        background:linear-gradient(135deg,#0b1f3a 0%,#1a4a7a 100%);
        padding:16px 18px; display:flex; align-items:center; gap:12px;
        position:relative;
    }
    .agl-cw-avatar {
        width:42px; height:42px; border-radius:50%;
        background:rgba(255,255,255,0.12);
        display:flex; align-items:center; justify-content:center;
        font-size:1.2rem; color:#d9a521; flex-shrink:0;
    }
    .agl-cw-hinfo { flex:1; }
    .agl-cw-hname { font-weight:700; color:#fff; font-size:.95rem; }
    .agl-cw-hstatus {
        font-size:.72rem; color:rgba(255,255,255,.65);
        display:flex; align-items:center; gap:5px; margin-top:2px;
    }
    .agl-dot {
        width:7px; height:7px; border-radius:50%;
        background:#2ed573; display:inline-block;
        animation:agl-pulse 2s infinite;
    }
    @keyframes agl-pulse {
        0%,100%{box-shadow:0 0 0 0 rgba(46,213,115,.4)}
        50%{box-shadow:0 0 0 5px rgba(46,213,115,0)}
    }
    .agl-cw-close {
        background:rgba(255,255,255,.12); border:none; color:#fff;
        width:30px; height:30px; border-radius:50%; cursor:pointer;
        display:flex; align-items:center; justify-content:center;
        font-size:.85rem; transition:background .2s;
    }
    .agl-cw-close:hover { background:rgba(255,255,255,.22); }
    .agl-cw-user-bar {
        background:#f0f4ff; padding:8px 16px;
        font-size:.72rem; color:#5a6a8a;
        display:flex; align-items:center; gap:6px; border-bottom:1px solid #e8eef8;
    }
    .agl-cw-user-bar span { font-weight:600; color:#0b1f3a; }
    .agl-cw-messages {
        flex:1; overflow-y:auto; padding:16px;
        display:flex; flex-direction:column; gap:10px;
        background:#f8faff; min-height:200px; max-height:300px;
    }
    .agl-cw-messages::-webkit-scrollbar { width:4px; }
    .agl-cw-messages::-webkit-scrollbar-thumb { background:#d0d8ea; border-radius:4px; }
    .agl-msg { display:flex; flex-direction:column; max-width:82%; }
    .agl-msg.visitor { align-self:flex-end; align-items:flex-end; }
    .agl-msg.admin  { align-self:flex-start; align-items:flex-start; }
    .agl-msg-bubble {
        padding:9px 13px; border-radius:16px; font-size:.85rem;
        line-height:1.45; word-break:break-word;
    }
    .agl-msg.visitor .agl-msg-bubble {
        background:linear-gradient(135deg,#0b1f3a,#1e56d3);
        color:#fff; border-bottom-right-radius:4px;
    }
    .agl-msg.admin .agl-msg-bubble {
        background:#ffffff; color:#1a2030;
        border:1px solid #e0e8f5; border-bottom-left-radius:4px;
        box-shadow:0 2px 8px rgba(0,0,0,0.06);
    }
    .agl-msg-time { font-size:.65rem; color:#9aaccc; margin-top:3px; }
    .agl-typing {
        display:none; align-self:flex-start; padding:8px 14px;
        background:#fff; border:1px solid #e0e8f5; border-radius:16px;
        border-bottom-left-radius:4px; gap:4px;
        box-shadow:0 2px 8px rgba(0,0,0,0.06);
    }
    .agl-typing.show { display:flex; align-items:center; }
    .agl-typing span {
        width:7px; height:7px; background:#9aaccc; border-radius:50%;
        animation:agl-bounce .9s infinite;
    }
    .agl-typing span:nth-child(2){animation-delay:.15s}
    .agl-typing span:nth-child(3){animation-delay:.3s}
    @keyframes agl-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
    .agl-cw-footer {
        padding:12px 14px; background:#fff;
        border-top:1px solid #e8eef8;
        display:flex; gap:8px; align-items:flex-end;
    }
    #agl-chat-input {
        flex:1; border:1.5px solid #e0e8f5; border-radius:12px;
        padding:10px 14px; font-size:.875rem; font-family:inherit;
        resize:none; outline:none; max-height:90px; overflow-y:auto;
        transition:border-color .2s; background:#f8faff; color:#1a2030;
        line-height:1.4;
    }
    #agl-chat-input:focus { border-color:#1a4a7a; background:#fff; }
    #agl-chat-send {
        width:40px; height:40px; border-radius:12px; flex-shrink:0;
        background:linear-gradient(135deg,#0b1f3a,#1a4a7a);
        color:#fff; border:none; cursor:pointer;
        display:flex; align-items:center; justify-content:center;
        font-size:.9rem; transition:all .2s;
    }
    #agl-chat-send:hover { transform:scale(1.08); }
    #agl-chat-send:disabled { opacity:.45; cursor:not-allowed; transform:none; }
    .agl-cw-welcome {
        text-align:center; padding:20px 16px; color:#5a6a8a;
    }
    .agl-cw-welcome i { font-size:2.2rem; color:#c8d5e8; margin-bottom:10px; display:block; }
    .agl-cw-welcome p { font-size:.82rem; line-height:1.5; }
    @media(max-width:420px){
        #agl-chat-window{width:calc(100vw - 24px); right:12px; bottom:140px;}
        #agl-chat-btn{right:16px; bottom:80px;}
    }
    `;
    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    // ── HTML ─────────────────────────────────────────────────────────────────────
    const html = `
    <button id="agl-chat-btn" title="Chat with us">
        <i class="fas fa-comment-dots"></i>
        <span class="agl-chat-badge" id="agl-chat-badge"></span>
    </button>
    <div id="agl-chat-window">
        <div class="agl-cw-header">
            <div class="agl-cw-avatar"><i class="fas fa-headset"></i></div>
            <div class="agl-cw-hinfo">
                <div class="agl-cw-hname">AGL Support</div>
                <div class="agl-cw-hstatus"><span class="agl-dot"></span> <span id="agl-status-text">Online</span></div>
            </div>
            <button class="agl-cw-close" id="agl-chat-close"><i class="fas fa-times"></i></button>
        </div>
        <div class="agl-cw-user-bar" id="agl-user-bar" style="display:none">
            <i class="fas fa-user-circle"></i> Chatting as <span id="agl-username-display">...</span>
        </div>
        <div class="agl-cw-messages" id="agl-messages">
            <div class="agl-cw-welcome" id="agl-welcome">
                <i class="fas fa-comments"></i>
                <p>Hi there! 👋 Have a question about our logistics services? We're here to help.</p>
            </div>
        </div>
        <div class="agl-typing" id="agl-typing">
            <span></span><span></span><span></span>
        </div>
        <div class="agl-cw-footer">
            <textarea id="agl-chat-input" rows="1" placeholder="Type your message…"></textarea>
            <button id="agl-chat-send" disabled><i class="fas fa-paper-plane"></i></button>
        </div>
    </div>`;

    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    document.body.appendChild(wrap);

    // ── REFS ─────────────────────────────────────────────────────────────────────
    const btn       = document.getElementById('agl-chat-btn');
    const win       = document.getElementById('agl-chat-window');
    const closeBtn  = document.getElementById('agl-chat-close');
    const msgBox    = document.getElementById('agl-messages');
    const input     = document.getElementById('agl-chat-input');
    const sendBtn   = document.getElementById('agl-chat-send');
    const badge     = document.getElementById('agl-chat-badge');
    const typingEl  = document.getElementById('agl-typing');
    const userBar   = document.getElementById('agl-user-bar');
    const userDisp  = document.getElementById('agl-username-display');
    const statusTxt = document.getElementById('agl-status-text');
    const welcome   = document.getElementById('agl-welcome');

    let socket     = null;
    let username   = null;
    let isOpen     = false;
    let unread     = 0;
    let typingTimer= null;
    let connected  = false;

    // Restore messages from localStorage
    const STORAGE_KEY = 'agl_chat_msgs';
    let history = [];
    try { history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e) {}

    // ── OPEN / CLOSE ──────────────────────────────────────────────────────────────
    function openChat() {
        isOpen = true;
        win.classList.add('open');
        btn.style.transform = 'scale(.9)';
        unread = 0; badge.style.display = 'none';
        if (!connected) connectSocket();
        restoreHistory();
        setTimeout(() => input.focus(), 300);
    }

    function closeChat() {
        isOpen = false;
        win.classList.remove('open');
        btn.style.transform = '';
    }

    btn.addEventListener('click', () => isOpen ? closeChat() : openChat());
    closeBtn.addEventListener('click', closeChat);

    // ── SOCKET ────────────────────────────────────────────────────────────────────
    function connectSocket() {
        if (connected) return;
        // Load Socket.IO client then connect
        const s = document.createElement('script');
        s.src = '/socket.io/socket.io.js';
        s.onload = () => {
            socket = window.io({ transports: ['websocket','polling'] });

            socket.on('connect', () => {
                connected = true;
                sendBtn.disabled = false;
                socket.emit('visitor:join', { page: location.pathname });
            });

            socket.on('visitor:ready', (data) => {
                username = data.username;
                userBar.style.display = 'flex';
                userDisp.textContent  = username;
                statusTxt.textContent = 'Online — we\'ll reply shortly';
                if (welcome) welcome.style.display = 'none';
            });

            socket.on('admin:message', (msg) => {
                appendMsg({ from: 'admin', text: msg.text, ts: msg.ts });
                saveHistory({ from: 'admin', text: msg.text, ts: msg.ts });
                if (!isOpen) {
                    unread++;
                    badge.textContent = unread;
                    badge.style.display = 'flex';
                }
            });

            socket.on('visitor:echo', (msg) => {
                // already appended optimistically, nothing to do
            });

            socket.on('admin:typing', (isTyping) => {
                typingEl.classList.toggle('show', isTyping);
                msgBox.scrollTop = msgBox.scrollHeight;
            });

            socket.on('disconnect', () => {
                connected = false;
                sendBtn.disabled = true;
                statusTxt.textContent = 'Reconnecting…';
            });

            socket.on('connect_error', () => {
                statusTxt.textContent = 'Connection failed';
            });
        };
        document.head.appendChild(s);
    }

    // ── SEND MESSAGE ──────────────────────────────────────────────────────────────
    function sendMessage() {
        const text = input.value.trim();
        if (!text || !socket || !connected) return;
        appendMsg({ from: 'visitor', text, ts: Date.now() });
        saveHistory({ from: 'visitor', text, ts: Date.now() });
        socket.emit('visitor:message', text);
        input.value = '';
        input.style.height = 'auto';
        socket.emit('visitor:typing', false);
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    // Typing indicator
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 90) + 'px';
        if (socket && connected) {
            socket.emit('visitor:typing', true);
            clearTimeout(typingTimer);
            typingTimer = setTimeout(() => socket.emit('visitor:typing', false), 1500);
        }
        sendBtn.disabled = !input.value.trim();
    });

    // ── RENDER ────────────────────────────────────────────────────────────────────
    function appendMsg({ from, text, ts }) {
        if (welcome) welcome.style.display = 'none';
        const div  = document.createElement('div');
        div.className = `agl-msg ${from}`;
        const time = new Date(ts).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
        div.innerHTML = `<div class="agl-msg-bubble">${escHtml(text)}</div><div class="agl-msg-time">${time}</div>`;
        msgBox.insertBefore(div, typingEl);
        msgBox.scrollTop = msgBox.scrollHeight;
    }

    function restoreHistory() {
        if (!history.length) return;
        if (welcome) welcome.style.display = 'none';
        history.forEach(m => {
            const div  = document.createElement('div');
            div.className = `agl-msg ${m.from}`;
            const time = new Date(m.ts).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
            div.innerHTML = `<div class="agl-msg-bubble">${escHtml(m.text)}</div><div class="agl-msg-time">${time}</div>`;
            msgBox.insertBefore(div, typingEl);
        });
        msgBox.scrollTop = msgBox.scrollHeight;
    }

    function saveHistory(msg) {
        history.push(msg);
        if (history.length > 100) history.shift();
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history)); } catch(e) {}
    }

    function escHtml(t) {
        return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
    }
})();
