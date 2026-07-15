document.addEventListener('DOMContentLoaded', () => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = function(input, init = {}) {
        let requestUrl = '';
        if (typeof input === 'string') {
            requestUrl = input;
        } else if (input && typeof input.url === 'string') {
            requestUrl = input.url;
        }

        if (!requestUrl) {
            return originalFetch(input, init);
        }

        let parsedUrl;
        try {
            parsedUrl = new URL(requestUrl, window.location.origin);
        } catch (_err) {
            return originalFetch(input, init);
        }

        if (!parsedUrl.pathname.startsWith('/api/')) {
            return originalFetch(input, init);
        }

        if (parsedUrl.pathname === '/api/login' || parsedUrl.pathname === '/api/desk-help/google/callback') {
            return originalFetch(input, init);
        }

        const tokenFromStorage = localStorage.getItem('sibumdes_auth') || '';
        const tokenFromQuery = parsedUrl.searchParams.get('session_slug') || '';
        const effectiveToken = (tokenFromStorage || tokenFromQuery || '').trim();

        if (parsedUrl.searchParams.has('session_slug')) {
            parsedUrl.searchParams.delete('session_slug');
        }

        const finalHeaders = new Headers(init.headers || (input && input.headers ? input.headers : {}));
        if (effectiveToken && !finalHeaders.has('Authorization')) {
            finalHeaders.set('Authorization', 'Bearer ' + effectiveToken);
        }

        const finalInit = { ...init, headers: finalHeaders };
        const finalUrl = parsedUrl.toString();

        if (typeof input === 'string') {
            return originalFetch(finalUrl, finalInit);
        }

        return originalFetch(finalUrl, finalInit);
    };

    // Auth Check
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('dashboard-app-container');
    const displayAuthName = document.getElementById('auth-display-name');

    function checkAuth() {
        const token = localStorage.getItem('sibumdes_auth');
        const username = localStorage.getItem('sibumdes_user');
        const roleId = localStorage.getItem('sibumdes_role_id');
        const profileId = localStorage.getItem('sibumdes_profile_id');
        
        const userMenuBtn = document.getElementById('menu-user-btn');
        const btnAddProfile = document.getElementById('btn-add-profile');

        if (roleId === "1" || !profileId) {
            if (userMenuBtn) userMenuBtn.parentElement.style.display = 'block';
        } else {
            if (userMenuBtn) userMenuBtn.parentElement.style.display = 'none';
        }

        if (roleId === "1" && !profileId) {
            if (btnAddProfile) btnAddProfile.style.display = 'inline-block';
        } else {
            if (btnAddProfile) btnAddProfile.style.display = 'none';
        }

        const menuPengaturanBtn = document.getElementById('menu-pengaturan-btn');
        if (menuPengaturanBtn) {
            const profileName = localStorage.getItem('sibumdes_profile_name');
            const isPengembang = profileName && profileName.toLowerCase().includes('pengembang');
            
            if (isPengembang) {
                menuPengaturanBtn.parentElement.style.display = 'block';
            } else {
                menuPengaturanBtn.parentElement.style.display = 'none';
            }
        }

        if (!token) {
            loginContainer.style.display = 'flex';
            dashboardContainer.style.display = 'none';
            return false;
        } else {
            loginContainer.style.display = 'none';
            dashboardContainer.style.display = 'flex';
            
            const roleName = localStorage.getItem('sibumdes_role_name');

            if(displayAuthName && username) displayAuthName.textContent = username;
            
            const headerUserName = document.getElementById('header-user-name');
            const headerUserRole = document.getElementById('header-user-role');
            const headerUserAvatar = document.getElementById('header-user-avatar');
            
            if(headerUserName && username) headerUserName.textContent = username;
            if(headerUserRole) headerUserRole.textContent = roleName || 'Role Aktif';
            if(headerUserAvatar && username) {
                headerUserAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=e2e9e5&color=0a4f3b`;
            }
            
            return true;
        }
    }

    if (!checkAuth()) {
        // Stop execution if not logged in
    }

    const authLoginForm = document.getElementById('authLoginForm');
    if(authLoginForm) {
        authLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const payload = {
                username: document.getElementById('login_username')?.value?.trim() || '',
                password: document.getElementById('login_password')?.value?.trim() || ''
            };
            
            fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(res => {
                if(res.ok) {
                    return res.json();
                } else {
                    throw new Error("Kredensial tidak valid");
                }
            }).then(data => {
                if(data.token) {
                    localStorage.setItem('sibumdes_auth', data.token);
                    localStorage.setItem('sibumdes_user', data.user.Nama);
                    localStorage.setItem('sibumdes_role_id', data.user.RoleID);
                    
                    if (data.user.Role && data.user.Role.NamaPeran) {
                        localStorage.setItem('sibumdes_role_name', data.user.Role.NamaPeran);
                    } else {
                        localStorage.setItem('sibumdes_role_name', 'Pengguna');
                    }

                    if(data.user.ProfileBUMDesID) {
                        localStorage.setItem('sibumdes_profile_id', data.user.ProfileBUMDesID);
                    } else {
                        localStorage.removeItem('sibumdes_profile_id');
                    }

                    if (data.user.ProfileBUMDes && data.user.ProfileBUMDes.NamaBUMDes) {
                        localStorage.setItem('sibumdes_profile_name', data.user.ProfileBUMDes.NamaBUMDes);
                    } else {
                        localStorage.removeItem('sibumdes_profile_name');
                    }
                    authLoginForm.reset();
                    checkAuth();
                    navigateTo('/dashboard');
                }
            }).catch(err => {
                showToast("Login Gagal: " + err.message, true);
            });
        });
    }

    // Logout function
    function performLogout() {
        localStorage.removeItem('sibumdes_auth');
        localStorage.removeItem('sibumdes_user');
        localStorage.removeItem('sibumdes_profile_id');
        localStorage.removeItem('sibumdes_profile_name');
        localStorage.removeItem('sibumdes_role_id');
        localStorage.removeItem('sibumdes_role_name');
        checkAuth();
        navigateTo('/');
    }

    const btnLogout = document.getElementById('btn-logout');
    if(btnLogout) btnLogout.addEventListener('click', performLogout);

    const logoutActionBtns = document.querySelectorAll('.logout-action-btn');
    logoutActionBtns.forEach(btn => btn.addEventListener('click', performLogout));

    // Select Elements
    const toggleBtn = document.getElementById('toggle-sidebar');
    const sidebar = document.getElementById('sidebar');
    const menuItemsWithSubmenu = document.querySelectorAll('.has-submenu');

    // Toggle Sidebar
    toggleBtn.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('mobile-open');
        } else {
            sidebar.classList.toggle('collapsed');
            if (sidebar.classList.contains('collapsed')) {
                menuItemsWithSubmenu.forEach(item => {
                    item.classList.remove('open');
                });
            }
        }
    });

    // Submenu toggling
    menuItemsWithSubmenu.forEach(item => {
        const link = item.querySelector(':scope > a');
        if (!link) return;
        link.addEventListener('click', (e) => {
            if(!link.hasAttribute('data-link')) {
                e.preventDefault();
            }
            if (sidebar.classList.contains('collapsed')) {
                sidebar.classList.remove('collapsed');
            }
            const siblingSubmenus = Array.from(item.parentElement.children).filter((otherItem) => {
                return otherItem !== item && otherItem.classList && otherItem.classList.contains('has-submenu');
            });
            siblingSubmenus.forEach(otherItem => {
                if (otherItem.classList.contains('open')) {
                    otherItem.classList.remove('open');
                }
            });
            item.classList.toggle('open');
            if (item.classList.contains('menu-item')) {
                document.querySelectorAll('.menu-item').forEach(mi => mi.classList.remove('active'));
                item.classList.add('active');
            }
        });
    });

    const submenuLinks = document.querySelectorAll('.submenu li a');
    submenuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if(this.getAttribute('href') === '#') {
                e.preventDefault();
            }
            submenuLinks.forEach(l => {
                l.classList.remove('active-sub');
                l.style.color = '';
                l.style.fontWeight = '';
            });
            this.classList.add('active-sub');
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('mobile-open');
            }
        });
    });

    const standaloneMenuItems = document.querySelectorAll('.menu-item:not(.has-submenu) > a');
    standaloneMenuItems.forEach(link => {
        link.addEventListener('click', function() {
            document.querySelectorAll('.menu-item').forEach(mi => mi.classList.remove('active'));
            document.querySelectorAll('.has-submenu').forEach(mi => mi.classList.remove('open'));
            document.querySelectorAll('.submenu li a').forEach(l => l.classList.remove('active-sub'));
            this.parentElement.classList.add('active');
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('mobile-open');
            }
        });
    });

    const logoInput = document.getElementById('logo_input');
    if (logoInput) {
        logoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            const previewContainer = document.getElementById('logo_preview_container');
            const previewImage = document.getElementById('logo_preview');
            
            if (file && previewContainer && previewImage) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewImage.src = e.target.result;
                    previewContainer.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else if (previewContainer) {
                previewContainer.style.display = 'none';
            }
        });
    }

    // --- SPA Routing Logic ---
    const dashboardView = document.getElementById('dashboard-view');
    const profileView = document.getElementById('profile-view');
    const profileDataView = document.getElementById('profile-data-view');
    const settingsView = document.getElementById('settings-view');
    const rolesDataView = document.getElementById('roles-data-view');
    const rolesView = document.getElementById('roles-view');
    const profileForm = document.getElementById('profileForm');
    const settingsForm = document.getElementById('settingsForm');
    const roleForm = document.getElementById('roleForm');
    const unitUsahaList = document.getElementById('unit-usaha-list');
    const btnAddUnit = document.getElementById('btn-add-unit');
    const richTextEditors = {};

    function escapeHTML(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function sanitizeRichTextHTML(value) {
        const template = document.createElement('template');
        template.innerHTML = value || '';

        const allowedTags = new Set(['A', 'B', 'BR', 'EM', 'I', 'LI', 'OL', 'P', 'STRONG', 'U', 'UL']);
        const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);
        const nodes = [];

        while (walker.nextNode()) {
            nodes.push(walker.currentNode);
        }

        nodes.forEach((node) => {
            if (!allowedTags.has(node.tagName)) {
                const fragment = document.createDocumentFragment();
                while (node.firstChild) {
                    fragment.appendChild(node.firstChild);
                }
                node.replaceWith(fragment);
                return;
            }

            Array.from(node.attributes).forEach((attr) => {
                const attrName = attr.name.toLowerCase();
                if (node.tagName !== 'A' || !['href', 'target', 'rel'].includes(attrName)) {
                    node.removeAttribute(attr.name);
                }
            });

            if (node.tagName === 'A') {
                const href = (node.getAttribute('href') || '').trim();
                const isAllowedHref = /^(https?:|mailto:|tel:|#)/i.test(href);
                if (!isAllowedHref) {
                    node.removeAttribute('href');
                }
                node.setAttribute('target', '_blank');
                node.setAttribute('rel', 'noopener noreferrer');
            }
        });

        return template.innerHTML.trim();
    }

    function normalizeRichTextValue(value) {
        const trimmed = String(value || '').trim();
        if (!trimmed) return '';
        if (/<\/?[a-z][\s\S]*>/i.test(trimmed)) {
            return sanitizeRichTextHTML(trimmed);
        }

        return trimmed
            .split(/\n{2,}/)
            .map(paragraph => `<p>${escapeHTML(paragraph).replace(/\n/g, '<br>')}</p>`)
            .join('');
    }

    function renderRichTextDetail(value) {
        const normalized = normalizeRichTextValue(value);
        return normalized || '<span style="color:var(--text-secondary);">-</span>';
    }

    function setRichTextValue(fieldName, value) {
        const instance = richTextEditors[fieldName];
        if (!instance) return;
        instance.input.value = String(value || '');
    }

    function syncRichTextToInput(fieldName) {
        const instance = richTextEditors[fieldName];
        if (!instance) return '';
        const sanitized = sanitizeRichTextHTML(instance.input.value);
        instance.input.value = sanitized;
        return sanitized;
    }

    function syncRichTextDraft(fieldName) {
        const instance = richTextEditors[fieldName];
        if (!instance) return '';
        instance.input.value = instance.editor.innerHTML;
        updateRichTextPlaceholder(instance.editor);
        return instance.input.value;
    }

    function syncAllRichTextEditors() {
        Object.keys(richTextEditors).forEach((fieldName) => {
            syncRichTextToInput(fieldName);
        });
    }

    function selectionBelongsToEditor(selection, editor) {
        if (!selection || selection.rangeCount === 0 || !editor) {
            return false;
        }

        const range = selection.getRangeAt(0);
        return editor.contains(range.commonAncestorContainer);
    }

    function storeSelection(fieldName) {
        const instance = richTextEditors[fieldName];
        if (!instance) return;

        const selection = window.getSelection();
        if (!selectionBelongsToEditor(selection, instance.editor)) {
            return;
        }

        instance.selection = selection.getRangeAt(0).cloneRange();
    }

    function restoreSelection(fieldName) {
        const instance = richTextEditors[fieldName];
        if (!instance) return false;

        instance.editor.focus();

        if (!instance.selection) {
            return false;
        }

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(instance.selection.cloneRange());
        return true;
    }

    document.addEventListener('selectionchange', () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            return;
        }

        Object.keys(richTextEditors).forEach((fieldName) => {
            const instance = richTextEditors[fieldName];
            if (!instance || !instance.editor) {
                return;
            }

            if (selectionBelongsToEditor(selection, instance.editor)) {
                instance.selection = selection.getRangeAt(0).cloneRange();
            }
        });
    });

    document.querySelectorAll('.rich-text-editor').forEach((wrapper) => {
        const fieldName = wrapper.dataset.field;
        const input = wrapper.querySelector('textarea[name]');
        const editor = wrapper.querySelector('.rich-text-input');
        const toolbar = wrapper.querySelector('.rich-text-toolbar');

        if (!fieldName || !input || !editor || !toolbar) {
            return;
        }

        richTextEditors[fieldName] = { input, editor, toolbar, selection: null };
        setRichTextValue(fieldName, input.value);

        ['mouseup', 'keyup', 'focus'].forEach((eventName) => {
            editor.addEventListener(eventName, () => {
                storeSelection(fieldName);
                syncRichTextDraft(fieldName);
            });
        });

        editor.addEventListener('input', () => {
            storeSelection(fieldName);
            syncRichTextDraft(fieldName);
        });

        editor.addEventListener('blur', () => {
            storeSelection(fieldName);
            syncRichTextToInput(fieldName);
        });

        toolbar.addEventListener('mousedown', (event) => {
            if (event.target.closest('.rich-text-btn')) {
                event.preventDefault();
            }
        });

        toolbar.addEventListener('click', (event) => {
            const button = event.target.closest('.rich-text-btn');
            if (!button) return;

            const command = button.dataset.command;
            restoreSelection(fieldName);

            if (command === 'createLink') {
                const url = window.prompt('Masukkan URL tautan', 'https://');
                if (!url) return;
                document.execCommand('createLink', false, url);
            } else {
                document.execCommand(command, false, null);
            }

            storeSelection(fieldName);
            syncRichTextToInput(fieldName);
        });
    });

    window.navigateTo = function(url) {
        if(!checkAuth()) return; // enforce
        history.pushState(null, null, url);
        router();
    };

    const MAPPING_RETURN_STATE_KEY = 'sibumdes_mapping_return_state';

    function setPendingMappingReturnState(routeBase, slug, scrollY) {
        if (!routeBase || !slug) return;
        try {
            sessionStorage.setItem(MAPPING_RETURN_STATE_KEY, JSON.stringify({
                routeBase,
                slug,
                scrollY: Number.isFinite(scrollY) ? scrollY : null,
            }));
        } catch (error) {
            console.warn('Failed to save mapping return state', error);
        }
    }

    function consumePendingMappingReturnState(routeBase) {
        if (!routeBase) return null;
        try {
            const raw = sessionStorage.getItem(MAPPING_RETURN_STATE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            sessionStorage.removeItem(MAPPING_RETURN_STATE_KEY);
            if (!parsed || parsed.routeBase !== routeBase || !parsed.slug) return null;
            return parsed;
        } catch (error) {
            sessionStorage.removeItem(MAPPING_RETURN_STATE_KEY);
            return null;
        }
    }

    function restorePendingMappingReturnState(routeBase) {
        if (!routeBase || window.location.pathname !== routeBase) return;
        const pendingState = consumePendingMappingReturnState(routeBase);
        if (!pendingState) return;

        requestAnimationFrame(() => {
            const targetRow = Array.from(document.querySelectorAll('[data-mapping-slug]')).find((row) => row.getAttribute('data-mapping-slug') === pendingState.slug);
            if (Number.isFinite(pendingState.scrollY)) {
                window.scrollTo({ top: pendingState.scrollY, behavior: 'auto' });
            } else if (targetRow) {
                targetRow.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }

            if (targetRow) {
                const originalBoxShadow = targetRow.style.boxShadow;
                targetRow.style.boxShadow = 'inset 0 0 0 2px rgba(25, 118, 210, 0.35)';
                setTimeout(() => {
                    targetRow.style.boxShadow = originalBoxShadow;
                }, 1500);
            }
        });
    }

    window.prepareMappingTransaksiReturn = function(slug) {
        const mappingContext = getCurrentMappingContext() || getCurrentMappingContext('/mapping-transaksi');
        setPendingMappingReturnState(mappingContext ? mappingContext.routeBase : '/mapping-transaksi', slug, window.scrollY || window.pageYOffset || 0);
    };

    function getCurrentMappingContext(pathname = window.location.pathname) {
        const path = pathname || '/mapping-transaksi';
        if (!path.startsWith('/mapping-transaksi')) {
            return null;
        }

        let routeSegment = 'harian';
        if (path.startsWith('/mapping-transaksi/non-rutin')) {
            routeSegment = 'non-rutin';
        } else if (path.startsWith('/mapping-transaksi/umum')) {
            routeSegment = 'umum';
        } else if (path.startsWith('/mapping-transaksi/jurnal')) {
            routeSegment = 'jurnal';
        }

        const routeBase = routeSegment === 'harian' ? '/mapping-transaksi' : `/mapping-transaksi/${routeSegment}`;
        const apiValue = routeSegment.replace(/-/g, '_');
        const labels = {
            harian: {
                heading: 'Data Mapping Transaksi - Transaksi Harian',
                subtitle: 'Kelola mapping transaksi harian ke akun keuangan dan buku pembantu.',
                formTitle: 'Tambah Mapping Transaksi Harian',
                editTitle: 'Edit Mapping Transaksi Harian',
            },
            'non-rutin': {
                heading: 'Data Mapping Transaksi - Transaksi Non Rutin',
                subtitle: 'Kelola mapping transaksi non rutin ke akun keuangan dan buku pembantu.',
                formTitle: 'Tambah Mapping Transaksi Non Rutin',
                editTitle: 'Edit Mapping Transaksi Non Rutin',
            },
            umum: {
                heading: 'Data Mapping Transaksi - Transaksi Lainnya',
                subtitle: 'Kelola mapping transaksi lainnya ke akun keuangan dan buku pembantu.',
                formTitle: 'Tambah Mapping Transaksi Lainnya',
                editTitle: 'Edit Mapping Transaksi Lainnya',
            },
            jurnal: {
                heading: 'Data Mapping Transaksi - Jurnal',
                subtitle: 'Kelola mapping jurnal ke akun keuangan dan buku pembantu.',
                formTitle: 'Tambah Mapping Jurnal',
                editTitle: 'Edit Mapping Jurnal',
            },
        };

        return {
            routeSegment,
            routeBase,
            apiValue,
            heading: labels[routeSegment].heading,
            subtitle: labels[routeSegment].subtitle,
            formTitle: labels[routeSegment].formTitle,
            editTitle: labels[routeSegment].editTitle,
        };
    }

    function applyMappingContextToView(pathname = window.location.pathname) {
        const context = getCurrentMappingContext(pathname);
        if (!context) return null;

        const headingEl = document.getElementById('mapping-transaksi-heading');
        const subtitleEl = document.getElementById('mapping-transaksi-subtitle');
        const hiddenJenisEl = document.getElementById('mapping_jenis_mapping_hidden');
        const menuLinks = document.querySelectorAll('.mapping-submenu-link');
        const templateHintEl = document.getElementById('mapping-template-hint');
        const advancedDetailsEl = document.getElementById('mapping-advanced-details');
        const advancedSummaryEl = document.getElementById('mapping-advanced-summary');
        const klasifikasiLabelEl = document.getElementById('mapping-klasifikasi-label');
        const kategoriLabelEl = document.getElementById('mapping-kategori-label');
        const kategoriInputEl = document.getElementById('mapping_kategori_arus_kas');
        const jurnalPenyesuaianGroupEl = document.getElementById('mapping-link-jurnal-penyesuaian-group');
        const cashFlowGroupEl = document.getElementById('mapping-cash-flow-group');
        const klasifikasiGroupEl = document.getElementById('mapping-klasifikasi-group');
        const kategoriGroupEl = document.getElementById('mapping-kategori-group');
        const keteranganMainGroupEl = document.getElementById('mapping-keterangan-main-group');
        const keteranganAdvancedGroupEl = document.getElementById('mapping-keterangan-advanced-group');
        const cashFlowInputEl = document.getElementById('mapping_cash_in_out');

        if (headingEl) headingEl.textContent = context.heading;
        if (subtitleEl) subtitleEl.textContent = context.subtitle;
        if (hiddenJenisEl) hiddenJenisEl.value = context.apiValue;

        const isUmumLike = context.apiValue === 'umum' || context.apiValue === 'jurnal';

        if (templateHintEl) {
            templateHintEl.textContent = context.apiValue === 'non_rutin'
                ? 'Urutan isian utama mengikuti assets/maping_non_rutin.xlsx: Unit Usaha, Deskripsi, Debit, Kredit, Cash Flow, Kriteria, Sub Kriteria, dan Link Buku Pembantu.'
                : context.apiValue === 'harian'
                    ? 'Urutan isian utama mengikuti assets/maping.xlsx: Unit Usaha, Deskripsi, Debit, Kredit, Cash Flow, Kategori, Sub Kategori, dan Link Buku Pembantu.'
                    : isUmumLike
                        ? 'Urutan isian utama mengikuti assets/maping.xlsx: Unit Usaha, Deskripsi, Debit, Kredit, Keterangan, dan Link Buku Pembantu.'
                        : 'Urutan isian utama mengikuti assets/maping.xlsx: Unit Usaha, Deskripsi, Debit, Kredit, Cash Flow, dan Link Buku Pembantu.';
        }
        if (advancedSummaryEl) {
            advancedSummaryEl.textContent = context.apiValue === 'non_rutin' ? 'Kriteria, Sub Kriteria, dan Pengaturan Lanjutan' : 'Pengaturan Lanjutan';
        }
        if (advancedDetailsEl) {
            advancedDetailsEl.open = context.apiValue === 'non_rutin' || isUmumLike;
        }
        if (klasifikasiLabelEl) {
            klasifikasiLabelEl.textContent = context.apiValue === 'non_rutin'
                ? 'Kriteria'
                : context.apiValue === 'harian'
                    ? 'Kategori'
                    : 'Klasifikasi Arus Kas';
        }
        if (kategoriLabelEl) {
            kategoriLabelEl.textContent = context.apiValue === 'non_rutin'
                ? 'Sub Kriteria'
                : context.apiValue === 'harian'
                    ? 'Sub Kategori'
                    : 'Kategori Arus Kas';
        }
        if (kategoriInputEl) {
            kategoriInputEl.placeholder = context.apiValue === 'non_rutin'
                ? 'Isi Sub Kriteria sesuai template non rutin'
                : context.apiValue === 'harian'
                    ? 'Isi Sub Kategori sesuai template harian'
                    : 'Kosongkan untuk mengikuti deskripsi';
        }
        if (jurnalPenyesuaianGroupEl) {
            jurnalPenyesuaianGroupEl.style.display = isUmumLike ? '' : 'none';
        }
        if (cashFlowGroupEl) {
            cashFlowGroupEl.style.display = isUmumLike ? 'none' : '';
        }
        if (klasifikasiGroupEl) {
            klasifikasiGroupEl.style.display = isUmumLike ? 'none' : '';
        }
        if (kategoriGroupEl) {
            kategoriGroupEl.style.display = isUmumLike ? 'none' : '';
        }
        if (keteranganMainGroupEl) {
            keteranganMainGroupEl.style.display = isUmumLike ? '' : 'none';
        }
        if (keteranganAdvancedGroupEl) {
            keteranganAdvancedGroupEl.style.display = isUmumLike ? 'none' : '';
        }
        if (cashFlowInputEl) {
            cashFlowInputEl.required = !isUmumLike;
        }
        const seedButtonEl = document.getElementById('btn-seed-mapping-harian');
        if (seedButtonEl) {
            if (context.apiValue === 'harian') {
                seedButtonEl.style.display = '';
                seedButtonEl.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Isi Data Default (Harian.xlsx)';
            } else if (context.apiValue === 'non_rutin') {
                seedButtonEl.style.display = '';
                seedButtonEl.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Isi Data Default (NonRutin.xlsx)';
            } else if (context.apiValue === 'umum') {
                seedButtonEl.style.display = '';
                seedButtonEl.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Isi Data Default (TransaksiLainnya.xlsx)';
            } else if (context.apiValue === 'jurnal') {
                seedButtonEl.style.display = '';
                seedButtonEl.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Isi Data Default (Jurnal.xlsx)';
            } else {
                seedButtonEl.style.display = 'none';
            }
        }

        menuLinks.forEach((link) => {
            const isActive = link.dataset.mappingMenu === context.routeSegment;
            link.style.background = isActive ? 'var(--primary)' : '#fff';
            link.style.color = isActive ? '#fff' : 'var(--text-secondary)';
            link.style.borderColor = isActive ? 'var(--primary)' : 'var(--border)';
        });

        return context;
    }

    const COA_DRAFT_STORAGE_KEY = 'sibumdes_coa_draft';
    const expandedCoaNodes = new Set();
    let coaDraftEntriesCache = [];
    let coaDraftLoaded = false;

    function inferCoaSaldoNormal(kelompok, namaAkun, catatan) {
        const normalized = String(kelompok || '').trim().toLowerCase();
        const descriptor = `${namaAkun || ''} ${catatan || ''}`.toLowerCase();

        if (/(penyisihan|akumulasi penyusutan|akumulasi|amortisasi|cadangan)/.test(descriptor)) {
            return 'Kredit';
        }

        if (['kewajiban', 'ekuitas', 'pendapatan'].includes(normalized)) {
            return 'Kredit';
        }
        return 'Debit';
    }

    function normalizeCoaSaldoNormal(value, kelompok, namaAkun, catatan) {
        const normalized = String(value || '').trim().toLowerCase();
        if (normalized === 'debit') return 'Debit';
        if (normalized === 'kredit') return 'Kredit';
        return inferCoaSaldoNormal(kelompok, namaAkun, catatan);
    }

    function normalizeCoaDraftEntry(entry) {
        const kelompok = String(entry?.kelompok || entry?.kategoriAkun || '').trim();
        const statusAkun = String(entry?.statusAkun || entry?.headerDetail || '').trim();
        const catatan = String(entry?.catatan || entry?.definisi || '').trim();

        return {
            kategoriAkun: String(entry?.kategoriAkun || kelompok).trim(),
            kelompok,
            headerDetail: statusAkun,
            statusAkun,
            level: String(entry?.level || '').trim(),
            kodeAkun: String(entry?.kodeAkun || '').trim(),
            kodeParent: String(entry?.kodeParent || '').trim(),
            namaAkun: String(entry?.namaAkun || '').trim(),
            saldoNormal: normalizeCoaSaldoNormal(entry?.saldoNormal, kelompok, entry?.namaAkun, catatan),
            definisi: catatan,
            catatan,
            mataUang: String(entry?.mataUang || 'Rupiah').trim() || 'Rupiah',
        };
    }

    function getCoaSessionSlug() {
        return localStorage.getItem('sibumdes_auth') || '';
    }

    function mapBackendCoaEntryToDraft(entry) {
        return normalizeCoaDraftEntry({
            kelompok: entry?.kelompok,
            statusAkun: entry?.status_akun || entry?.statusAkun,
            level: entry?.level_akun || entry?.levelAkun,
            kodeAkun: entry?.kode_akun || entry?.kodeAkun,
            kodeParent: entry?.kode_parent || entry?.kodeParent,
            namaAkun: entry?.nama_akun || entry?.namaAkun,
            saldoNormal: entry?.saldo_normal || entry?.saldoNormal,
            catatan: entry?.catatan,
        });
    }

    function mapDraftEntryToBackend(entry, index) {
        const normalized = normalizeCoaDraftEntry(entry);
        return {
            kelompok: normalized.kelompok,
            status_akun: normalized.headerDetail,
            level_akun: Number(normalized.level || 0),
            kode_akun: normalized.kodeAkun,
            kode_parent: normalized.kodeParent,
            nama_akun: normalized.namaAkun,
            saldo_normal: normalized.saldoNormal,
            catatan: normalized.catatan,
            display_order: index + 1,
        };
    }

    function deriveCoaParentCodes(entries) {
        const latestCodeByLevel = new Map();

        return entries.map((entry) => {
            const normalizedEntry = normalizeCoaDraftEntry(entry);
            const levelNumber = Number(normalizedEntry.level || '0');

            if (Number.isInteger(levelNumber) && levelNumber > 1 && !normalizedEntry.kodeParent) {
                normalizedEntry.kodeParent = latestCodeByLevel.get(levelNumber - 1) || '';
            }

            if (normalizedEntry.kodeAkun && Number.isInteger(levelNumber) && levelNumber > 0) {
                latestCodeByLevel.set(levelNumber, normalizedEntry.kodeAkun);

                Array.from(latestCodeByLevel.keys()).forEach((levelKey) => {
                    if (levelKey > levelNumber) {
                        latestCodeByLevel.delete(levelKey);
                    }
                });
            }

            return normalizedEntry;
        });
    }

    function getLegacyLocalCoaDraftEntries() {
        try {
            const raw = localStorage.getItem(COA_DRAFT_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? deriveCoaParentCodes(parsed) : [];
        } catch (error) {
            console.error('Failed to parse CoA draft entries', error);
            return [];
        }
    }

    function getCoaDraftEntries() {
        return deriveCoaParentCodes(coaDraftEntriesCache);
    }

    async function loadCoaDraftEntries(forceReload = false) {
        if (coaDraftLoaded && !forceReload) {
            return getCoaDraftEntries();
        }

        try {
            const response = await fetch('/api/coas?session_slug=' + encodeURIComponent(getCoaSessionSlug()) + '&t=' + Date.now());
            if (!response.ok) {
                throw new Error('Tidak bisa memuat draft CoA dari server');
            }

            const data = await response.json();
            coaDraftEntriesCache = Array.isArray(data) ? data.map(mapBackendCoaEntryToDraft) : [];
            coaDraftLoaded = true;

            if (coaDraftEntriesCache.length === 0) {
                const legacyEntries = getLegacyLocalCoaDraftEntries();
                if (legacyEntries.length > 0) {
                    await saveCoaDraftEntries(legacyEntries);
                    localStorage.removeItem(COA_DRAFT_STORAGE_KEY);
                }
            }

            return getCoaDraftEntries();
        } catch (error) {
            console.error('Failed to load CoA draft entries from server', error);
            coaDraftEntriesCache = getLegacyLocalCoaDraftEntries();
            coaDraftLoaded = true;
            return getCoaDraftEntries();
        }
    }

    async function saveCoaDraftEntries(entries) {
        const normalizedEntries = entries.map(normalizeCoaDraftEntry);
        const response = await fetch('/api/coas?session_slug=' + encodeURIComponent(getCoaSessionSlug()), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(normalizedEntries.map(mapDraftEntryToBackend)),
        });

        if (!response.ok) {
            const message = await response.text();
            throw new Error(message || 'Tidak bisa menyimpan draft CoA');
        }

        coaDraftEntriesCache = normalizedEntries;
        coaDraftLoaded = true;
        coaAccountSelectOptionsPromise = null;
        localStorage.removeItem(COA_DRAFT_STORAGE_KEY);
    }

    async function clearCoaDraftEntries() {
        const response = await fetch('/api/coas?session_slug=' + encodeURIComponent(getCoaSessionSlug()), {
            method: 'DELETE',
        });

        if (!response.ok) {
            const message = await response.text();
            throw new Error(message || 'Tidak bisa menghapus draft CoA');
        }

        coaDraftEntriesCache = [];
        coaDraftLoaded = true;
        coaAccountSelectOptionsPromise = null;
        localStorage.removeItem(COA_DRAFT_STORAGE_KEY);
    }

    function updateCoaDraftSummary(count) {
        const countEl = document.getElementById('coa-draft-count');
        if (countEl) {
            countEl.textContent = `${count} akun`;
        }
    }

    function setCoaFormMode(isEdit) {
        const modeEl = document.getElementById('coa-form-mode');
        const cancelBtn = document.getElementById('btn-cancel-coa-edit');
        if (modeEl) {
            modeEl.innerHTML = '<i class="fa-solid fa-plus"></i> Tambah Baru';
            modeEl.style.background = isEdit ? '#fff7ed' : '#eef6f1';
            modeEl.style.color = isEdit ? '#9a3412' : '#0a4f3b';
            modeEl.style.borderColor = isEdit ? '#fed7aa' : '#cfe8da';
        }
        if (cancelBtn) {
            cancelBtn.style.display = isEdit ? 'inline-flex' : 'none';
        }
    }

    function setCoaFormVisible(isVisible, shouldScroll) {
        const formWidget = document.getElementById('coa-form-widget');
        if (!formWidget) return;

        formWidget.style.display = isVisible ? 'block' : 'none';

        if (isVisible && shouldScroll) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    function resetCoaForm() {
        const form = document.getElementById('coaForm');
        if (form) form.reset();

        const editIndexEl = document.getElementById('coa_edit_index');
        const kodeParentEl = document.getElementById('coa_kode_parent');
        const kelompokEl = document.getElementById('coa_kelompok');
        const saldoNormalEl = document.getElementById('coa_saldo_normal');
        if (editIndexEl) editIndexEl.value = '';
        if (kodeParentEl) kodeParentEl.value = '';
        if (saldoNormalEl) saldoNormalEl.value = inferCoaSaldoNormal(kelompokEl ? kelompokEl.value : '');

        syncCoaParentOptions();
        setCoaFormMode(false);
    }

    function syncCoaParentOptions() {
        const parentEl = document.getElementById('coa_kode_parent');
        const levelEl = document.getElementById('coa_level');
        const kodeAkunEl = document.getElementById('coa_kode_akun');
        if (!parentEl || !levelEl || !kodeAkunEl) return;

        const selectedValue = parentEl.value;
        const currentCode = kodeAkunEl.value.trim();
        const levelValue = Number(levelEl.value || '0');
        const entries = getCoaDraftEntries()
            .filter((entry) => entry.kodeAkun && entry.kodeAkun !== currentCode)
            .filter((entry) => {
                if (!Number.isInteger(levelValue) || levelValue <= 1) {
                    return false;
                }

                return Number(entry.level || '0') === levelValue - 1;
            });

        let placeholder = '-- Pilih Parent --';
        if (!Number.isInteger(levelValue) || levelValue <= 0) {
            placeholder = '-- Isi level terlebih dahulu --';
        } else if (levelValue === 1) {
            placeholder = '-- Level 1 tidak memakai parent --';
        } else if (entries.length === 0) {
            placeholder = '-- Belum ada akun parent pada level di atasnya --';
        }

        const options = [`<option value="">${escapeHTML(placeholder)}</option>`];
        entries.forEach((entry) => {
            options.push(`<option value="${escapeHTML(entry.kodeAkun)}">${escapeHTML(entry.kodeAkun)} - ${escapeHTML(entry.namaAkun || entry.kelompok || 'Tanpa Nama')}</option>`);
        });
        parentEl.innerHTML = options.join('');

        if (entries.some((entry) => entry.kodeAkun === selectedValue)) {
            parentEl.value = selectedValue;
        } else {
            parentEl.value = '';
        }

        parentEl.disabled = !Number.isInteger(levelValue) || levelValue <= 1 || entries.length === 0;
    }

    function validateCoaEntry(entry, entries, editIndex) {
        const levelNumber = Number(entry.level || '0');
        if (!Number.isInteger(levelNumber) || levelNumber < 1) {
            return 'Level akun harus berupa angka minimal 1.';
        }

        if (levelNumber > 5) {
            return 'Level akun maksimal 5 agar tetap sesuai susunan kolom kerja CoA.';
        }

        if (!['Header', 'Detail'].includes(entry.headerDetail)) {
            return 'Header/Detail harus bernilai Header atau Detail.';
        }

        if (!['Debit', 'Kredit'].includes(entry.saldoNormal)) {
            return 'Sisi saldo normal harus bernilai Debit atau Kredit.';
        }

        if (entry.kodeParent && entry.kodeParent === entry.kodeAkun) {
            return 'Kode Parent tidak boleh sama dengan Kode Akun.';
        }

        const comparableEntries = entries.filter((_, index) => String(index) !== String(editIndex));
        if (levelNumber === 1) {
            if (entry.headerDetail !== 'Header') {
                return 'Akun level 1 harus bertipe Header.';
            }
            entry.kodeParent = '';
            return '';
        }

        if (!entry.kodeParent) {
            return 'Akun dengan level di atas 1 wajib memilih Kode Parent.';
        }

        const parentEntry = comparableEntries.find((item) => item.kodeAkun === entry.kodeParent);
        if (!parentEntry) {
            return 'Kode Parent harus dipilih dari akun yang sudah ada.';
        }

        if (parentEntry.headerDetail !== 'Header') {
            return 'Kode Parent harus mengarah ke akun bertipe Header.';
        }

        const parentLevel = Number(parentEntry.level || '0');
        if (parentLevel !== levelNumber - 1) {
            return 'Level parent harus tepat satu tingkat di atas akun ini.';
        }

        return '';
    }

    function validateCoaImportSequence(entry, latestImportedCodeByLevel) {
        const levelNumber = Number(entry.level || '0');
        if (!Number.isInteger(levelNumber) || levelNumber <= 1) {
            if (Number.isInteger(levelNumber) && levelNumber === 1) {
                latestImportedCodeByLevel.clear();
                latestImportedCodeByLevel.set(1, entry.kodeAkun);
            }
            return '';
        }

        const expectedParent = latestImportedCodeByLevel.get(levelNumber - 1);
        if (expectedParent && entry.kodeParent !== expectedParent) {
            return `Urutan hierarki CSV tidak konsisten. Untuk level ${levelNumber}, parent yang diharapkan pada urutan saat ini adalah ${expectedParent}.`;
        }

        latestImportedCodeByLevel.set(levelNumber, entry.kodeAkun);
        Array.from(latestImportedCodeByLevel.keys()).forEach((levelKey) => {
            if (levelKey > levelNumber) {
                latestImportedCodeByLevel.delete(levelKey);
            }
        });

        return '';
    }

    function hasCoaChildren(entry, entryMap) {
        return Array.isArray(entryMap.get(entry.kodeAkun)) && entryMap.get(entry.kodeAkun).length > 0;
    }

    function expandCoaAncestorChain(entries, kodeAkun) {
        if (!kodeAkun) return;

        let currentEntry = entries.find((entry) => entry.kodeAkun === kodeAkun);
        while (currentEntry && currentEntry.kodeParent) {
            expandedCoaNodes.add(currentEntry.kodeParent);
            currentEntry = entries.find((entry) => entry.kodeAkun === currentEntry.kodeParent);
        }
    }

    function expandCoaEntriesVisibility(entriesToExpand, allEntries) {
        entriesToExpand.forEach((entry) => {
            if (entry.kodeParent) {
                expandedCoaNodes.add(entry.kodeParent);
            }

            expandCoaAncestorChain(allEntries, entry.kodeAkun);
        });
    }

    function buildCoaLevelCells(entry) {
        const levelNumber = Math.min(Math.max(Number(entry.level || '1'), 1), 5);
        let cells = '';

        for (let index = 1; index <= 5; index++) {
            const isActiveLevel = index === levelNumber;
            cells += `<td style="padding:10px 12px; border-bottom:1px solid #55b4ea; border-right:1px solid #8fd0f2; text-align:center; white-space:nowrap; font-weight:${isActiveLevel ? '700' : '400'}; color:${isActiveLevel ? '#0f172a' : '#6b7280'};">${isActiveLevel ? escapeHTML(entry.kodeAkun) : ''}</td>`;
        }

        return cells;
    }

    function renderCoaDraftTable() {
        const container = document.getElementById('coa-table-container');
        if (!container) return;

        const entries = getCoaDraftEntries().map((entry, index) => ({ ...entry, index }));
        updateCoaDraftSummary(entries.length);

        if (entries.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:36px; color:var(--text-secondary); border:1px dashed var(--border); border-radius:12px; background:#fafafa;">
                <i class="fa-solid fa-folder-open fa-2x" style="margin-bottom:12px; opacity:0.5;"></i>
                <p>Belum ada draft bagan akun.</p>
                <p style="font-size:0.85rem; margin-top:6px;">Isi form di atas atau gunakan template assets/coa.csv sebagai referensi.</p>
            </div>`;
            return;
        }

        let rows = '';
        entries.forEach((entry, index) => {
            const isHeader = entry.headerDetail === 'Header';
            const backgroundColor = isHeader ? '#b9dff1' : (index % 2 === 0 ? '#ffffff' : '#f8fbfd');
            const saldoNormalBadgeColor = entry.saldoNormal === 'Kredit' ? '#fff1f2' : '#eff6ff';
            const saldoNormalTextColor = entry.saldoNormal === 'Kredit' ? '#9f1239' : '#1d4ed8';

            rows += `
                <tr style="background:${backgroundColor};">
                    ${buildCoaLevelCells(entry)}
                    <td style="padding:10px 12px; border-bottom:1px solid #55b4ea; border-right:1px solid #8fd0f2; white-space:nowrap; color:#0f172a; font-weight:${isHeader ? '700' : '500'};">${escapeHTML(entry.namaAkun)}</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #55b4ea; border-right:1px solid #8fd0f2; white-space:nowrap; color:#1f2937;">${escapeHTML(entry.kelompok)}</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #55b4ea; border-right:1px solid #8fd0f2; white-space:nowrap; color:#1f2937;">${escapeHTML(entry.headerDetail)}</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #55b4ea; border-right:1px solid #8fd0f2; text-align:center; white-space:nowrap; color:#1f2937;">${escapeHTML(entry.level)}</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #55b4ea; border-right:1px solid #8fd0f2; white-space:nowrap; color:#1f2937;">
                        <span style="display:inline-flex; align-items:center; padding:4px 12px; border-radius:999px; background:${saldoNormalBadgeColor}; color:${saldoNormalTextColor}; font-weight:600;">${escapeHTML(entry.saldoNormal)}</span>
                    </td>
                    <td style="padding:10px 12px; border-bottom:1px solid #55b4ea; color:#111827; min-width:520px;">${escapeHTML(entry.catatan || '-')}</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #55b4ea; text-align:center; white-space:nowrap; background:#f8fafc;" onclick="event.stopPropagation()">
                        <button type="button" class="action-btn edit" title="Edit" onclick="editCoaDraft(${entry.index}); event.stopPropagation();"><i class="fa-solid fa-pen"></i></button>
                        <button type="button" class="action-btn delete" title="Hapus" onclick="deleteCoaDraft(${entry.index}); event.stopPropagation();"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>`;
        });

        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px; flex-wrap:wrap;">
                <span style="font-size:0.82rem; color:var(--text-secondary);">${entries.length} akun tersusun pada draft CoA</span>
                <span style="font-size:0.82rem; color:var(--text-secondary);">Kolom 1-5 pada bagian kode akun mengikuti level hierarki</span>
            </div>
            <div style="overflow-x:auto; border:1px solid #55b4ea; border-radius:12px; background:#ffffff; box-shadow:0 12px 28px rgba(15, 23, 42, 0.08);">
                <table style="width:100%; border-collapse:collapse; min-width:1800px; font-size:13px;">
                    <thead>
                        <tr style="background:#0f5d66; color:#ffffff;">
                            <th colspan="5" style="padding:10px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">Kode Akun</th>
                            <th rowspan="2" style="padding:10px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">Nama Akun</th>
                            <th rowspan="2" style="padding:10px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">Kelompok</th>
                            <th rowspan="2" style="padding:10px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">Status Akun</th>
                            <th rowspan="2" style="padding:10px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">Level Akun</th>
                            <th rowspan="2" style="padding:10px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">(Sisi) Saldo Normal</th>
                            <th rowspan="2" style="padding:10px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">Catatan</th>
                            <th rowspan="2" style="padding:10px 12px; text-align:center;">
                                <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
                                    <span>Aksi</span>
                                    <button type="button" onclick="clearCoaDraftAction(); event.stopPropagation();" title="Kosongkan Draft" style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;background:#ffebee;color:#c62828;border:none;cursor:pointer;">
                                        <i class="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </th>
                        </tr>
                        <tr style="background:#2f7a68; color:#d8f3dc;">
                            <th style="padding:6px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">1</th>
                            <th style="padding:6px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">2</th>
                            <th style="padding:6px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">3</th>
                            <th style="padding:6px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">4</th>
                            <th style="padding:6px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">5</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    }

    async function loadCoaView() {
        await loadCoaDraftEntries(true);
        renderCoaDraftTable();
        resetCoaForm();
        setCoaFormVisible(false, false);
    }

    const saldoAwalState = {
        rows: [],
        coaEntries: [],
        lastMasterRefreshAt: '',
    };

    function getSaldoAwalStorageKey() {
        const profileId = localStorage.getItem('sibumdes_profile_id') || 'global';
        return `sibumdes_saldo_awal_report:${profileId}`;
    }

    function getSaldoAwalSessionSlug() {
        return localStorage.getItem('sibumdes_auth') || '';
    }

    function getSaldoAwalProfileId() {
        const raw = String(localStorage.getItem('sibumdes_profile_id') || '').trim();
        return /^\d+$/.test(raw) ? raw : '';
    }

    function buildSaldoAwalApiUrl() {
        const params = new URLSearchParams();
        const sessionSlug = getSaldoAwalSessionSlug();
        const profileId = getSaldoAwalProfileId();
        if (sessionSlug) params.set('session_slug', sessionSlug);
        if (profileId) params.set('profile_bumdes_id', profileId);
        params.set('t', Date.now());
        return `/api/saldo-awal-report?${params.toString()}`;
    }

    function getDefaultSaldoAwalPeriod() {
        const now = new Date();
        return `${now.getFullYear()}-01-01`;
    }

    function clampSaldoAwalLevel(value) {
        return Math.min(Math.max(Number(value || 1), 1), 5);
    }

    function parseSaldoAwalAccountCode(value) {
        const normalized = String(value || '').trim();
        const matched = normalized.match(/^\d+(?:-\d+)+/);
        if (matched) return matched[0];
        const firstToken = normalized.split(/\s+/)[0] || '';
        return firstToken.includes('-') ? firstToken : normalized;
    }

    function createEmptySaldoAwalAmounts() {
        return Array.from({ length: 5 }, () => 0);
    }

    function createSaldoAwalValueColumns(row, amount) {
        const debitValues = createEmptySaldoAwalAmounts();
        const kreditValues = createEmptySaldoAwalAmounts();
        const numericAmount = Number(amount) || 0;
        const columnIndex = clampSaldoAwalLevel(row?.level) - 1;
        const saldoNormal = normalizeCoaSaldoNormal(row?.saldoNormal, row?.kelompok, row?.namaAkun, row?.catatan);

        if (saldoNormal === 'Kredit') {
            kreditValues[columnIndex] = numericAmount;
        } else {
            debitValues[columnIndex] = numericAmount;
        }

        return { debitValues, kreditValues };
    }

    function parseSaldoAwalLinkedAccountCode(value, segmentIndex = 0) {
        const segments = String(value || '')
            .split(';')
            .map((segment) => String(segment || '').trim())
            .filter(Boolean);
        const targetSegment = segments[segmentIndex] || segments[0] || '';
        const code = parseSaldoAwalAccountCode(targetSegment);
        return code === '-' ? '' : code;
    }

    function accumulateSaldoAwalAccountTotal(targetMap, rawCode, amount) {
        const code = parseSaldoAwalAccountCode(rawCode);
        const numericAmount = Number(amount) || 0;
        if (!code || code === '-' || !Number.isFinite(numericAmount)) return;
        targetMap.set(code, (targetMap.get(code) || 0) + numericAmount);
    }

    async function loadSaldoAwalMasterAccountTotals() {
        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        const timestamp = Date.now();
        const endpoints = [
            `/api/pelanggans?session_slug=${encodeURIComponent(sessionSlug)}&t=${timestamp}`,
            `/api/suppliers?session_slug=${encodeURIComponent(sessionSlug)}&t=${timestamp}`,
            `/api/barangs?session_slug=${encodeURIComponent(sessionSlug)}&t=${timestamp}`,
            `/api/inventariss?session_slug=${encodeURIComponent(sessionSlug)}&t=${timestamp}`,
        ];

        const [pelangganRows, supplierRows, barangRows, inventarisRows] = await Promise.all(
            endpoints.map((url) => fetch(url)
                .then((response) => response.ok ? response.json() : [])
                .catch(() => []))
        );

        const totalsByCode = new Map();

        (Array.isArray(pelangganRows) ? pelangganRows : []).forEach((item) => {
            const code = parseSaldoAwalLinkedAccountCode(item && item.link_akun);
            accumulateSaldoAwalAccountTotal(totalsByCode, code, item && item.saldo_awal);
        });

        (Array.isArray(supplierRows) ? supplierRows : []).forEach((item) => {
            const code = parseSaldoAwalLinkedAccountCode(item && item.link_akun);
            accumulateSaldoAwalAccountTotal(totalsByCode, code, item && item.saldo_awal);
        });

        (Array.isArray(barangRows) ? barangRows : []).forEach((item) => {
            const code = parseSaldoAwalLinkedAccountCode(item && item.link_akun, 0);
            accumulateSaldoAwalAccountTotal(totalsByCode, code, item && item.saldo_awal_nominal);
        });

        (Array.isArray(inventarisRows) ? inventarisRows : []).forEach((item) => {
            const asetTetapCode = parseSaldoAwalLinkedAccountCode(item && item.link_akun_aset_tetap);
            const akumulasiCode = parseSaldoAwalLinkedAccountCode(item && item.link_akun_akumulasi_penyusutan);
            accumulateSaldoAwalAccountTotal(totalsByCode, asetTetapCode, item && item.saldo_awal);
            accumulateSaldoAwalAccountTotal(totalsByCode, akumulasiCode, item && item.akumulasi_penyusutan_awal);
        });

        return totalsByCode;
    }

    function normalizeSaldoAwalRow(row) {
        const level = clampSaldoAwalLevel(row?.level);
        const debitValues = Array.isArray(row?.debitValues) ? row.debitValues.slice(0, 5) : [];
        const kreditValues = Array.isArray(row?.kreditValues) ? row.kreditValues.slice(0, 5) : [];
        while (debitValues.length < 5) debitValues.push(0);
        while (kreditValues.length < 5) kreditValues.push(0);

        return {
            id: String(row?.id || `${row?.kodeAkun || 'manual'}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`),
            kodeAkun: String(row?.kodeAkun || '').trim(),
            kodeParent: String(row?.kodeParent || '').trim(),
            namaAkun: String(row?.namaAkun || '').trim(),
            kelompok: String(row?.kelompok || '').trim(),
            statusAkun: String(row?.statusAkun || row?.headerDetail || 'Detail').trim() || 'Detail',
            saldoNormal: normalizeCoaSaldoNormal(row?.saldoNormal, row?.kelompok, row?.namaAkun, row?.catatan),
            level,
            manual: !!row?.manual,
            autoGenerated: !!row?.autoGenerated,
            debitValues: debitValues.map((value) => Number(value) || 0),
            kreditValues: kreditValues.map((value) => Number(value) || 0),
        };
    }

    function getSaldoAwalStoredState() {
        try {
            const raw = localStorage.getItem(getSaldoAwalStorageKey());
            if (!raw) {
                return { period: getDefaultSaldoAwalPeriod(), rows: [], lastMasterRefreshAt: '' };
            }

            const parsed = JSON.parse(raw);
            return {
                period: parsed?.period || getDefaultSaldoAwalPeriod(),
                rows: Array.isArray(parsed?.rows) ? parsed.rows.map(normalizeSaldoAwalRow) : [],
                lastMasterRefreshAt: String(parsed?.lastMasterRefreshAt || ''),
            };
        } catch (error) {
            console.error('Failed to read saldo awal state', error);
            return { period: getDefaultSaldoAwalPeriod(), rows: [], lastMasterRefreshAt: '' };
        }
    }

    async function fetchSaldoAwalStoredState() {
        const fallbackState = getSaldoAwalStoredState();
        try {
            const response = await fetch(buildSaldoAwalApiUrl());
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const payload = await response.json();
            return {
                period: payload?.period || fallbackState.period || getDefaultSaldoAwalPeriod(),
                rows: Array.isArray(payload?.rows) ? payload.rows.map(normalizeSaldoAwalRow) : fallbackState.rows,
                lastMasterRefreshAt: String(payload?.last_master_refresh_at || fallbackState.lastMasterRefreshAt || ''),
            };
        } catch (error) {
            console.error('Failed to load saldo awal state from API', error);
            return fallbackState;
        }
    }

    async function persistSaldoAwalState() {
        const periodInput = document.getElementById('saldo-awal-periode-input');
        const payload = {
            period: periodInput && periodInput.value ? periodInput.value : getDefaultSaldoAwalPeriod(),
            rows: saldoAwalState.rows.map(normalizeSaldoAwalRow),
            lastMasterRefreshAt: saldoAwalState.lastMasterRefreshAt || '',
            last_master_refresh_at: saldoAwalState.lastMasterRefreshAt || '',
            profile_bumdes_id: getSaldoAwalProfileId() ? Number(getSaldoAwalProfileId()) : null,
        };
        localStorage.setItem(getSaldoAwalStorageKey(), JSON.stringify(payload));

        const response = await fetch(buildSaldoAwalApiUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const saved = await response.json();
        saldoAwalState.lastMasterRefreshAt = String(saved?.last_master_refresh_at || saldoAwalState.lastMasterRefreshAt || '');
        updateSaldoAwalLastRefreshLabel();
        return saved;
    }

    function formatSaldoAwalRefreshLabel(value) {
        const normalized = String(value || '').trim();
        if (!normalized) return 'Terakhir ditarik: belum ada';
        const date = new Date(normalized);
        if (Number.isNaN(date.getTime())) return 'Terakhir ditarik: belum ada';
        return `Terakhir ditarik: ${date.toLocaleString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })}`;
    }

    function updateSaldoAwalLastRefreshLabel() {
        const label = document.getElementById('saldo-awal-last-refresh');
        if (!label) return;
        label.textContent = formatSaldoAwalRefreshLabel(saldoAwalState.lastMasterRefreshAt);
    }

    function formatSaldoAwalPeriodLabel(value) {
        if (!value) return 'PERIODE 1 JANUARI';
        const date = new Date(`${value}T00:00:00`);
        if (Number.isNaN(date.getTime())) {
            return `PERIODE ${String(value).toUpperCase()}`;
        }
        return `PERIODE ${date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}`;
    }

    function formatSaldoAwalPeriodValue(value) {
        const normalized = String(value || '').trim();
        if (!normalized) return '';

        const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoMatch) {
            return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
        }

        return normalized;
    }

    function getSaldoAwalProfileLabel() {
        return String(localStorage.getItem('sibumdes_profile_name') || 'BUMDES').toUpperCase();
    }

    function normalizeSaldoAwalPeriodInput(value) {
        const normalized = String(value || '').trim();
        if (!normalized) return getDefaultSaldoAwalPeriod();

        const isoMatch = normalized.match(/^\d{4}-\d{2}-\d{2}$/);
        if (isoMatch) return normalized;

        const slashMatch = normalized.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
        if (slashMatch) {
            const day = slashMatch[1].padStart(2, '0');
            const month = slashMatch[2].padStart(2, '0');
            const year = slashMatch[3];
            return `${year}-${month}-${day}`;
        }

        const longMatch = normalized.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/i);
        if (longMatch) {
            const monthNames = {
                januari: '01',
                februari: '02',
                maret: '03',
                april: '04',
                mei: '05',
                juni: '06',
                juli: '07',
                agustus: '08',
                september: '09',
                oktober: '10',
                november: '11',
                desember: '12',
            };
            const day = longMatch[1].padStart(2, '0');
            const month = monthNames[longMatch[2].toLowerCase()];
            const year = longMatch[3];
            if (month) {
                return `${year}-${month}-${day}`;
            }
        }

        return normalized;
    }

    function extractSaldoAwalReferencedCodes(mappingItems) {
        const codes = new Set();
        (mappingItems || []).forEach((item) => {
            const details = Array.isArray(item?.details) && item.details.length
                ? item.details
                : [{ akun_debet: item?.akun_debet || '', akun_kredit: item?.akun_kredit || '' }];

            details.forEach((detail) => {
                const debitCode = parseSaldoAwalAccountCode(detail?.akun_debet || '');
                const kreditCode = parseSaldoAwalAccountCode(detail?.akun_kredit || '');
                if (debitCode) codes.add(debitCode);
                if (kreditCode) codes.add(kreditCode);
            });
        });
        return codes;
    }

    function includeSaldoAwalAncestors(code, coaByCode, targetSet) {
        let currentCode = code;
        while (currentCode) {
            if (!targetSet.has(currentCode)) {
                targetSet.add(currentCode);
            }
            const currentEntry = coaByCode.get(currentCode);
            currentCode = currentEntry ? currentEntry.kodeParent : '';
        }
    }

    function mergeSaldoAwalRowsFromSources(coaEntries, existingRows, masterTotalsByCode = new Map()) {
        const coaCodes = new Set((coaEntries || []).map((entry) => normalizeCoaDraftEntry(entry).kodeAkun));
        const existingByCode = new Map((existingRows || []).map((row) => {
            const normalized = normalizeSaldoAwalRow(row);
            return [normalized.kodeAkun, normalized];
        }));

        const generatedRows = (coaEntries || [])
            .map((entry) => normalizeCoaDraftEntry(entry))
            .map((entry) => {
                const previous = existingByCode.get(entry.kodeAkun);
                const hasMasterTotal = masterTotalsByCode.has(entry.kodeAkun);
                const generatedValues = hasMasterTotal
                    ? createSaldoAwalValueColumns({
                        level: entry.level,
                        saldoNormal: entry.saldoNormal,
                        kelompok: entry.kelompok,
                        namaAkun: entry.namaAkun,
                        catatan: entry.catatan,
                    }, masterTotalsByCode.get(entry.kodeAkun))
                    : null;
                return normalizeSaldoAwalRow({
                    id: previous?.id || `coa:${entry.kodeAkun}`,
                    kodeAkun: entry.kodeAkun,
                    kodeParent: entry.kodeParent,
                    namaAkun: entry.namaAkun,
                    kelompok: entry.kelompok,
                    statusAkun: entry.statusAkun,
                    saldoNormal: entry.saldoNormal,
                    level: entry.level,
                    manual: false,
                    autoGenerated: hasMasterTotal,
                    debitValues: generatedValues ? generatedValues.debitValues : (previous?.debitValues || createEmptySaldoAwalAmounts()),
                    kreditValues: generatedValues ? generatedValues.kreditValues : (previous?.kreditValues || createEmptySaldoAwalAmounts()),
                });
            });

        const manualRows = (existingRows || [])
            .map(normalizeSaldoAwalRow)
            .filter((row) => row.manual && !coaCodes.has(row.kodeAkun));

        return [...generatedRows, ...manualRows];
    }

    function renderSaldoAwalCoaOptions() {
        const selectEl = document.getElementById('saldo_awal_coa_select');
        if (!selectEl) return;

        const options = saldoAwalState.coaEntries
            .slice()
            .sort((left, right) => String(left.kodeAkun || '').localeCompare(String(right.kodeAkun || ''), 'id'))
            .map((entry) => `<option value="${escapeHTML(entry.kodeAkun)}">${escapeHTML(entry.kodeAkun)} - ${escapeHTML(entry.namaAkun)}</option>`)
            .join('');

        selectEl.innerHTML = `<option value="">-- Pilih Akun CoA --</option>${options}`;
    }

    function setSaldoAwalFormVisible(isVisible) {
        const widget = document.getElementById('saldo-awal-form-widget');
        if (!widget) return;
        widget.style.display = isVisible ? 'block' : 'none';
    }

    function resetSaldoAwalForm() {
        const form = document.getElementById('saldoAwalForm');
        if (form) form.reset();
        const editIndexEl = document.getElementById('saldo_awal_edit_index');
        if (editIndexEl) editIndexEl.value = '';
    }

    function syncSaldoAwalFormFromCoa(kodeAkun) {
        if (!kodeAkun) return;
        const entry = saldoAwalState.coaEntries.find((item) => item.kodeAkun === kodeAkun);
        if (!entry) return;

        const levelEl = document.getElementById('saldo_awal_level');
        const kelompokEl = document.getElementById('saldo_awal_kelompok');
        const statusEl = document.getElementById('saldo_awal_status');
        const namaEl = document.getElementById('saldo_awal_nama_akun');
        if (levelEl) levelEl.value = entry.level || '';
        if (kelompokEl) kelompokEl.value = entry.kelompok || '';
        if (statusEl) statusEl.value = entry.statusAkun || entry.headerDetail || 'Detail';
        if (namaEl) namaEl.value = entry.namaAkun || '';
    }

    function updateSaldoAwalSummary() {
        const summaryEl = document.getElementById('saldo-awal-summary');
        if (!summaryEl) return;

        const computedRows = syncSaldoAwalComputedState();
        const totalDebit = computedRows
            .filter((row) => row.isEditable)
            .reduce((sum, row) => sum + row.debitValues.reduce((acc, value) => acc + (Number(value) || 0), 0), 0);
        const totalKredit = computedRows
            .filter((row) => row.isEditable)
            .reduce((sum, row) => sum + row.kreditValues.reduce((acc, value) => acc + (Number(value) || 0), 0), 0);
        summaryEl.textContent = `Debit ${formatPelangganCurrency(totalDebit)} | Kredit ${formatPelangganCurrency(totalKredit)}`;
    }

    function buildSaldoAwalComputedRows(rows) {
        const normalizedRows = (rows || []).map(normalizeSaldoAwalRow);
        const rowsByCode = new Map(normalizedRows.map((row) => [row.kodeAkun, row]));
        const childrenByParent = new Map();

        function getSaldoAwalDerivedParentCode(row) {
            const explicitParent = String(row?.kodeParent || '').trim();
            if (explicitParent) return explicitParent;

            const code = String(row?.kodeAkun || '').trim();
            const level = Number(row?.level || 0);
            if (!code || level <= 1) return '';

            const segments = code.split('-').filter(Boolean);
            if (segments.length <= 1) return '';

            return segments.slice(0, -1).join('-');
        }

        normalizedRows.forEach((row) => {
            const parentCode = getSaldoAwalDerivedParentCode(row);
            if (!parentCode) return;
            if (!childrenByParent.has(parentCode)) {
                childrenByParent.set(parentCode, []);
            }
            childrenByParent.get(parentCode).push(row.kodeAkun);
        });

        const cache = new Map();

        function sumSaldoAwalValues(values) {
            return (values || []).reduce((sum, value) => sum + (Number(value) || 0), 0);
        }

        function computeRow(code, stack = new Set()) {
            if (cache.has(code)) return cache.get(code);

            const row = rowsByCode.get(code);
            if (!row) return null;
            if (stack.has(code)) {
                const fallback = {
                    ...row,
                    isEditable: true,
                    autoGenerated: !!row.autoGenerated,
                    debitValues: row.debitValues.map((value) => Number(value) || 0),
                    kreditValues: row.kreditValues.map((value) => Number(value) || 0),
                };
                cache.set(code, fallback);
                return fallback;
            }

            const nextStack = new Set(stack);
            nextStack.add(code);

            const childCodes = childrenByParent.get(code) || [];
            if (!childCodes.length) {
                const leaf = {
                    ...row,
                    isEditable: true,
                    autoGenerated: !!row.autoGenerated,
                    debitValues: row.debitValues.map((value) => Number(value) || 0),
                    kreditValues: row.kreditValues.map((value) => Number(value) || 0),
                };
                cache.set(code, leaf);
                return leaf;
            }

            let childDebitTotal = 0;
            let childKreditTotal = 0;
            childCodes.forEach((childCode) => {
                const childRow = computeRow(childCode, nextStack);
                if (!childRow) return;
                childDebitTotal += sumSaldoAwalValues(childRow.debitValues);
                childKreditTotal += sumSaldoAwalValues(childRow.kreditValues);
            });

            const debitValues = createEmptySaldoAwalAmounts();
            const kreditValues = createEmptySaldoAwalAmounts();
            const parentColumnIndex = clampSaldoAwalLevel(row.level) - 1;
            debitValues[parentColumnIndex] = childDebitTotal;
            kreditValues[parentColumnIndex] = childKreditTotal;

            const computed = {
                ...row,
                isEditable: false,
                saldoNormal: normalizeCoaSaldoNormal(row?.saldoNormal, row?.kelompok, row?.namaAkun, row?.catatan),
                debitValues,
                kreditValues,
            };
            cache.set(code, computed);
            return computed;
        }

        return normalizedRows.map((row) => computeRow(row.kodeAkun) || row);
    }

    function syncSaldoAwalComputedState() {
        const computedRows = buildSaldoAwalComputedRows(saldoAwalState.rows);
        const computedByCode = new Map(computedRows.map((row) => [row.kodeAkun, row]));

        saldoAwalState.rows = saldoAwalState.rows.map((row) => {
            const normalized = normalizeSaldoAwalRow(row);
            const computed = computedByCode.get(normalized.kodeAkun);
            if (!computed) return normalized;

            return normalizeSaldoAwalRow({
                ...normalized,
                saldoNormal: computed.saldoNormal,
                debitValues: computed.debitValues,
                kreditValues: computed.kreditValues,
            });
        });

        return computedRows;
    }

    function buildSaldoAwalEditableCell(row, side, columnIndex) {
        const blankBackground = side === 'debit' ? '#f0fdf4' : '#fff7f9';
        const blankColor = side === 'debit' ? '#86efac' : '#f9a8d4';
        const isActiveColumn = row.level === columnIndex + 1;
        if (!isActiveColumn) {
            return `<td style="padding:10px 12px; border-bottom:1px solid #d8dee6; text-align:right; background:${blankBackground}; color:${blankColor};">&nbsp;</td>`;
        }

        const saldoNormal = normalizeCoaSaldoNormal(row?.saldoNormal, row?.kelompok, row?.namaAkun, row?.catatan);
        if ((side === 'debit' && saldoNormal !== 'Debit') || (side === 'kredit' && saldoNormal !== 'Kredit')) {
            return `<td style="padding:10px 12px; border-bottom:1px solid #d8dee6; text-align:right; background:${blankBackground}; color:${blankColor};">&nbsp;</td>`;
        }

        const values = side === 'debit' ? row.debitValues : row.kreditValues;
        const cellValue = Number(values[columnIndex]) || 0;
        const computedBackground = side === 'debit' ? '#dcfce7' : '#fee2e2';
        const computedColor = side === 'debit' ? '#166534' : '#9d174d';
        const editableBackground = row.autoGenerated
            ? (side === 'debit' ? '#dbeafe' : '#dbeafe')
            : (side === 'debit' ? '#fef9c3' : '#fff1f5');
        const editableColor = row.autoGenerated
            ? '#1d4ed8'
            : (side === 'debit' ? '#365314' : '#9d174d');
        const hoverBackground = row.autoGenerated
            ? '#bfdbfe'
            : (side === 'debit' ? '#fde68a' : '#fce7f3');
        const hoverColor = row.autoGenerated
            ? '#1e40af'
            : (side === 'debit' ? '#365314' : '#831843');
        if (!row.isEditable) {
            return `<td style="padding:10px 12px; border-bottom:1px solid #d8dee6; text-align:right; background:${computedBackground}; color:${computedColor}; font-weight:700; white-space:nowrap; min-width:110px;">${formatPelangganCurrency(cellValue)}</td>`;
        }
        return `<td contenteditable="true" data-saldo-awal-cell="currency" data-row-id="${escapeHTML(row.id)}" data-side="${side}" data-col="${columnIndex}" data-base-background="${editableBackground}" data-base-color="${editableColor}" data-hover-background="${hoverBackground}" data-hover-color="${hoverColor}" style="padding:10px 12px; border-bottom:1px solid #d8dee6; text-align:right; background:${editableBackground}; color:${editableColor}; font-weight:600; white-space:nowrap; min-width:110px; cursor:text; transition:background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;">${formatPelangganCurrency(cellValue)}</td>`;
    }

    function renderSaldoAwalTable() {
        const container = document.getElementById('saldo-awal-table-container');
        if (!container) return;

        const existingScrollWrapper = container.firstElementChild;
        const preservedScrollLeft = existingScrollWrapper ? existingScrollWrapper.scrollLeft : 0;
        const preservedScrollTop = existingScrollWrapper ? existingScrollWrapper.scrollTop : 0;

        updateSaldoAwalSummary();
        updateSaldoAwalLastRefreshLabel();

        if (!saldoAwalState.rows.length) {
            container.innerHTML = `<div style="text-align:center; padding:36px; color:var(--text-secondary); border:1px dashed var(--border); border-radius:12px; background:#fafafa;">
                <i class="fa-solid fa-scale-balanced fa-2x" style="margin-bottom:12px; opacity:0.5;"></i>
                <p>Belum ada baris saldo awal.</p>
                <p style="font-size:0.85rem; margin-top:6px;">Baris akan dibentuk dari data CoA yang tersedia.</p>
            </div>`;
            return;
        }

        const periodInput = document.getElementById('saldo-awal-periode-input');
        const periodValue = periodInput && periodInput.value ? periodInput.value : getDefaultSaldoAwalPeriod();
        const computedRows = syncSaldoAwalComputedState();
        const totalDebit = computedRows
            .filter((row) => row.isEditable)
            .reduce((sum, row) => sum + row.debitValues.reduce((acc, value) => acc + (Number(value) || 0), 0), 0);
        const totalKredit = computedRows
            .filter((row) => row.isEditable)
            .reduce((sum, row) => sum + row.kreditValues.reduce((acc, value) => acc + (Number(value) || 0), 0), 0);
        const rowsHtml = computedRows.map((row, index) => {
            const level = clampSaldoAwalLevel(row.level);
            const codeColumns = Array.from({ length: 5 }, (_, columnIndex) => {
                const value = level === columnIndex + 1 ? row.kodeAkun : '0';
                return `<td style="padding:10px 12px; border-bottom:1px solid #d8dee6; border-right:1px solid #edf2f7; text-align:center; white-space:nowrap; font-weight:${level === columnIndex + 1 ? '700' : '500'}; color:${level === columnIndex + 1 ? '#0f172a' : '#94a3b8'};">${escapeHTML(value)}</td>`;
            }).join('');

            return `
                <tr style="background:${index % 2 === 0 ? '#ffffff' : '#fbfdff'};">
                    ${codeColumns}
                    <td style="padding:10px 12px; border-bottom:1px solid #d8dee6; color:#0f172a; font-weight:600; min-width:240px;">${escapeHTML(row.namaAkun)}</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #d8dee6; color:#334155; white-space:nowrap;">${escapeHTML(row.kelompok)}</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #d8dee6; color:#334155; white-space:nowrap;">${escapeHTML(row.statusAkun)}</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #d8dee6; text-align:center; color:#334155;">${escapeHTML(String(level))}</td>
                    ${Array.from({ length: 5 }, (_, columnIndex) => buildSaldoAwalEditableCell(row, 'debit', columnIndex)).join('')}
                    ${Array.from({ length: 5 }, (_, columnIndex) => buildSaldoAwalEditableCell(row, 'kredit', columnIndex)).join('')}
                </tr>`;
        }).join('');

        const totalRowHtml = `
                <tr style="background:#f8fafc; font-weight:700;">
                    <td colspan="9" style="padding:12px 16px; border-top:2px solid #cbd5e1; text-align:right; color:#0f172a;">TOTAL</td>
                    <td colspan="5" style="padding:12px 16px; border-top:2px solid #cbd5e1; text-align:center; background:#ecfdf5; color:#065f46;">Total Debit: ${escapeHTML(formatPelangganCurrency(totalDebit))}</td>
                    <td colspan="5" style="padding:12px 16px; border-top:2px solid #cbd5e1; text-align:center; background:#fdf2f8; color:#9d174d;">Total Kredit: ${escapeHTML(formatPelangganCurrency(totalKredit))}</td>
                </tr>`;

        container.innerHTML = `
            <div style="overflow-x:auto; border:1px solid #d8dee6; border-radius:12px; background:#ffffff; box-shadow:0 12px 28px rgba(15, 23, 42, 0.08);">
                <table style="width:100%; border-collapse:collapse; min-width:2200px; font-size:13px;">
                    <thead>
                        <tr>
                            <th colspan="19" style="padding:12px 16px; text-align:left; background:#ffffff; color:#0f172a; font-size:1rem; border-bottom:1px solid #d8dee6;">
                                <div style="display:inline-flex; align-items:center; gap:12px;">
                                    <span>${escapeHTML(getSaldoAwalProfileLabel())}</span>
                                    <button type="button" onclick="saveSaldoAwalReportAction()" style="display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border:none;border-radius:8px;background:#0f766e;color:#ffffff;font-size:0.85rem;font-weight:700;cursor:pointer;white-space:nowrap;"><i class="fa-solid fa-floppy-disk"></i> Simpan</button>
                                </div>
                            </th>
                        </tr>
                        <tr>
                            <th colspan="19" style="padding:12px 16px; text-align:left; background:#ffffff; color:#0f172a; font-size:1rem; border-bottom:1px solid #d8dee6;">SALDO AWAL</th>
                        </tr>
                        <tr>
                            <th colspan="19" style="padding:12px 16px; text-align:left; background:#ffffff; color:#475569; font-size:0.92rem; border-bottom:1px solid #d8dee6;">${escapeHTML(formatSaldoAwalPeriodLabel(periodValue))}</th>
                        </tr>
                        <tr>
                            <th colspan="4" style="padding:10px 12px; text-align:left; background:#ffffff; border-bottom:1px solid #d8dee6;">Buka Periode</th>
                            <th colspan="2" data-saldo-awal-cell="period" style="padding:10px 12px; text-align:center; background:#fff59d; border-bottom:1px solid #d8dee6; font-weight:700; color:#0f172a; cursor:pointer; user-select:none;">${escapeHTML(formatSaldoAwalPeriodValue(periodValue))}</th>
                            <th colspan="13" style="padding:10px 12px; background:#ffffff; border-bottom:1px solid #d8dee6;"></th>
                        </tr>
                        <tr style="background:#0f5d66; color:#ffffff;">
                            <th colspan="5" style="padding:10px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">Kode Akun</th>
                            <th rowspan="2" style="padding:10px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">Nama Akun</th>
                            <th rowspan="2" style="padding:10px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">Kelompok</th>
                            <th rowspan="2" style="padding:10px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">Status Akun</th>
                            <th rowspan="2" style="padding:10px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">Level Akun</th>
                            <th colspan="5" style="padding:10px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18); background:#15803d; color:#f0fdf4;">Debit</th>
                            <th colspan="5" style="padding:10px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18); background:#f9a8d4; color:#831843;">Kredit</th>
                        </tr>
                        <tr style="background:#2f7a68; color:#d8f3dc;">
                            <th style="padding:6px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">1</th>
                            <th style="padding:6px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">2</th>
                            <th style="padding:6px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">3</th>
                            <th style="padding:6px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">4</th>
                            <th style="padding:6px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">5</th>
                            <th style="padding:6px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18); background:#166534; color:#dcfce7;">1</th>
                            <th style="padding:6px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18); background:#166534; color:#dcfce7;">2</th>
                            <th style="padding:6px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18); background:#166534; color:#dcfce7;">3</th>
                            <th style="padding:6px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18); background:#166534; color:#dcfce7;">4</th>
                            <th style="padding:6px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18); background:#166534; color:#dcfce7;">5</th>
                            <th style="padding:6px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18); background:#fbcfe8; color:#9d174d;">1</th>
                            <th style="padding:6px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18); background:#fbcfe8; color:#9d174d;">2</th>
                            <th style="padding:6px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18); background:#fbcfe8; color:#9d174d;">3</th>
                            <th style="padding:6px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18); background:#fbcfe8; color:#9d174d;">4</th>
                            <th style="padding:6px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18); background:#fbcfe8; color:#9d174d;">5</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}${totalRowHtml}</tbody>
                </table>
            </div>`;

        const nextScrollWrapper = container.firstElementChild;
        if (nextScrollWrapper) {
            nextScrollWrapper.scrollLeft = preservedScrollLeft;
            nextScrollWrapper.scrollTop = preservedScrollTop;
        }

        if (container.dataset.bound !== 'true') {
            container.addEventListener('mouseover', (event) => {
                const cell = event.target.closest('[data-saldo-awal-cell="currency"]');
                if (!cell) return;
                cell.style.background = cell.dataset.hoverBackground || cell.style.background;
                cell.style.color = cell.dataset.hoverColor || cell.style.color;
                cell.style.boxShadow = 'inset 0 0 0 2px rgba(15, 23, 42, 0.08)';
            });

            container.addEventListener('mouseout', (event) => {
                const cell = event.target.closest('[data-saldo-awal-cell="currency"]');
                if (!cell) return;
                const relatedTarget = event.relatedTarget;
                if (relatedTarget instanceof Node && cell.contains(relatedTarget)) return;
                cell.style.background = cell.dataset.baseBackground || cell.style.background;
                cell.style.color = cell.dataset.baseColor || cell.style.color;
                cell.style.boxShadow = 'none';
            });

            container.addEventListener('click', (event) => {
                const periodCell = event.target.closest('[data-saldo-awal-cell="period"]');
                if (!periodCell || !periodInput) return;
                periodInput.focus();
                if (typeof periodInput.showPicker === 'function') {
                    periodInput.showPicker();
                } else {
                    periodInput.click();
                }
            });

            container.addEventListener('focusin', (event) => {
                const cell = event.target.closest('[data-saldo-awal-cell="currency"]');
                if (!cell) return;
                const row = saldoAwalState.rows.find((item) => item.id === cell.dataset.rowId);
                if (!row) return;
                const columnIndex = Number(cell.dataset.col || 0);
                const values = cell.dataset.side === 'debit' ? row.debitValues : row.kreditValues;
                const currentValue = Number(values[columnIndex]) || 0;
                cell.textContent = currentValue ? String(currentValue) : '';
            });

            container.addEventListener('input', (event) => {
                const cell = event.target.closest('[data-saldo-awal-cell="currency"]');
                if (!cell) return;
                const row = saldoAwalState.rows.find((item) => item.id === cell.dataset.rowId);
                if (!row) return;
                const columnIndex = Number(cell.dataset.col || 0);
                const numericValue = parsePelangganNumber(cell.textContent || '');
                if (cell.dataset.side === 'debit') {
                    row.debitValues[columnIndex] = numericValue;
                } else {
                    row.kreditValues[columnIndex] = numericValue;
                }
                renderSaldoAwalTable();
                const refreshedCell = container.querySelector(`[data-saldo-awal-cell="currency"][data-row-id="${cell.dataset.rowId}"][data-side="${cell.dataset.side}"][data-col="${cell.dataset.col}"]`);
                if (refreshedCell) {
                    refreshedCell.focus();
                    refreshedCell.textContent = numericValue ? String(numericValue) : '';
                    const selection = window.getSelection();
                    if (selection) {
                        const range = document.createRange();
                        range.selectNodeContents(refreshedCell);
                        range.collapse(false);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                }
            });

            container.addEventListener('focusout', (event) => {
                const cell = event.target.closest('[data-saldo-awal-cell="currency"]');
                if (!cell) return;
                const row = saldoAwalState.rows.find((item) => item.id === cell.dataset.rowId);
                if (!row) return;
                const columnIndex = Number(cell.dataset.col || 0);
                const numericValue = parsePelangganNumber(cell.textContent || '');
                if (cell.dataset.side === 'debit') {
                    row.debitValues[columnIndex] = numericValue;
                } else {
                    row.kreditValues[columnIndex] = numericValue;
                }
                renderSaldoAwalTable();
            });

            container.addEventListener('keydown', (event) => {
                const cell = event.target.closest('[data-saldo-awal-cell="currency"]');
                if (!cell) return;
                if (event.key === 'Enter') {
                    event.preventDefault();
                    cell.blur();
                }
            });

            container.dataset.bound = 'true';
        }
    }

    async function generateSaldoAwalReport(options = {}) {
        const { preserveCurrent = true, persist = false, masterRefreshedAt = '' } = options;
        await loadCoaDraftEntries(true);
        saldoAwalState.coaEntries = getCoaDraftEntries().map((entry) => normalizeCoaDraftEntry(entry));
        renderSaldoAwalCoaOptions();
        const masterTotalsByCode = await loadSaldoAwalMasterAccountTotals();

        const existingRows = preserveCurrent ? saldoAwalState.rows : [];
        saldoAwalState.rows = mergeSaldoAwalRowsFromSources(saldoAwalState.coaEntries, existingRows, masterTotalsByCode);
        if (masterRefreshedAt) {
            saldoAwalState.lastMasterRefreshAt = masterRefreshedAt;
        }
        renderSaldoAwalTable();

        if (persist) {
            await persistSaldoAwalState();
        }
    }

    async function loadSaldoAwalView() {
        const periodInput = document.getElementById('saldo-awal-periode-input');
        const storedState = await fetchSaldoAwalStoredState();
        saldoAwalState.rows = storedState.rows;
        saldoAwalState.lastMasterRefreshAt = String(storedState.lastMasterRefreshAt || '');
        if (periodInput) {
            periodInput.value = storedState.period || getDefaultSaldoAwalPeriod();
        }

        await loadCoaDraftEntries(true);
        saldoAwalState.coaEntries = getCoaDraftEntries().map((entry) => normalizeCoaDraftEntry(entry));
        renderSaldoAwalCoaOptions();
        const masterTotalsByCode = await loadSaldoAwalMasterAccountTotals();

        saldoAwalState.rows = mergeSaldoAwalRowsFromSources(saldoAwalState.coaEntries, saldoAwalState.rows, masterTotalsByCode);
        renderSaldoAwalTable();

        resetSaldoAwalForm();
        setSaldoAwalFormVisible(false);
    }

    function formatSaldoAwalReportAmount(value) {
        const numericValue = Number(value) || 0;
        return numericValue ? formatPelangganCurrency(numericValue) : '0';
    }

    function buildSaldoAwalReportRows(rows) {
        return buildSaldoAwalComputedRows(rows)
            .filter((row) => row.isEditable)
            .map((row) => ({
                kodeAkun: row.kodeAkun,
                namaAkun: row.namaAkun,
                debit: row.debitValues.reduce((sum, value) => sum + (Number(value) || 0), 0),
                kredit: row.kreditValues.reduce((sum, value) => sum + (Number(value) || 0), 0),
            }));
    }

    function renderSaldoAwalReportTable(rows, periodValue) {
        const container = document.getElementById('saldo-awal-report-container');
        const summaryEl = document.getElementById('saldo-awal-report-summary');
        if (!container) return;

        if (!rows.length) {
            if (summaryEl) {
                summaryEl.textContent = 'Belum ada data saldo awal.';
            }
            container.innerHTML = `<div style="text-align:center; padding:36px; color:var(--text-secondary); border:1px dashed var(--border); border-radius:12px; background:#fafafa;">
                <i class="fa-solid fa-file-circle-xmark fa-2x" style="margin-bottom:12px; opacity:0.5;"></i>
                <p>Belum ada hasil Saldo Awal.</p>
                <p style="font-size:0.85rem; margin-top:6px;">Isi tabel Buka Periode terlebih dahulu agar laporan Saldo Awal dapat digenerate.</p>
            </div>`;
            return;
        }

        const totalDebit = rows.reduce((sum, row) => sum + row.debit, 0);
        const totalKredit = rows.reduce((sum, row) => sum + row.kredit, 0);
        if (summaryEl) {
            summaryEl.textContent = `Debit ${formatPelangganCurrency(totalDebit)} | Kredit ${formatPelangganCurrency(totalKredit)}`;
        }

        const rowsHtml = rows.map((row, index) => `
            <tr style="background:${index % 2 === 0 ? '#ffffff' : '#fbfdff'};">
                <td style="padding:10px 12px; border-bottom:1px solid #d8dee6; color:#0f172a; font-weight:600; white-space:nowrap;">${escapeHTML(row.kodeAkun)}</td>
                <td style="padding:10px 12px; border-bottom:1px solid #d8dee6; color:#0f172a; min-width:280px;">${escapeHTML(row.namaAkun)}</td>
                <td style="padding:10px 12px; border-bottom:1px solid #d8dee6; text-align:right; background:#fefce8; color:#713f12; font-weight:600; white-space:nowrap;">${escapeHTML(formatSaldoAwalReportAmount(row.debit))}</td>
                <td style="padding:10px 12px; border-bottom:1px solid #d8dee6; text-align:right; background:#fdf2f8; color:#9d174d; font-weight:600; white-space:nowrap;">${escapeHTML(formatSaldoAwalReportAmount(row.kredit))}</td>
            </tr>`).join('');

        container.innerHTML = `
            <div style="border:1px solid #d8dee6; border-radius:12px; background:#ffffff; box-shadow:0 12px 28px rgba(15, 23, 42, 0.08); overflow:hidden;">
                <div style="padding:18px 20px; border-bottom:1px solid #d8dee6; background:linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);">
                    <div style="font-size:1rem; font-weight:700; color:#0f172a;">${escapeHTML(getSaldoAwalProfileLabel())}</div>
                    <div style="margin-top:4px; font-size:0.88rem; color:#475569;">SALDO AWAL</div>
                    <div style="margin-top:4px; font-size:0.82rem; color:#64748b;">${escapeHTML(formatSaldoAwalPeriodLabel(periodValue))}</div>
                </div>
                <div style="overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse; min-width:720px; font-size:13px;">
                        <thead>
                            <tr style="background:#0f5d66; color:#ffffff;">
                                <th style="padding:10px 12px; text-align:left; border-right:1px solid rgba(255,255,255,0.18);">Kode Akun</th>
                                <th style="padding:10px 12px; text-align:left; border-right:1px solid rgba(255,255,255,0.18);">Nama Akun</th>
                                <th style="padding:10px 12px; text-align:right; border-right:1px solid rgba(255,255,255,0.18); background:#ca8a04; color:#fffbeb;">Debit</th>
                                <th style="padding:10px 12px; text-align:right; background:#f9a8d4; color:#831843;">Kredit</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                        <tfoot>
                            <tr style="background:#f8fafc; font-weight:700;">
                                <td colspan="2" style="padding:12px 16px; border-top:2px solid #cbd5e1; text-align:right; color:#0f172a;">TOTAL</td>
                                <td style="padding:12px 16px; border-top:2px solid #cbd5e1; text-align:right; background:#fefce8; color:#713f12;">${escapeHTML(formatSaldoAwalReportAmount(totalDebit))}</td>
                                <td style="padding:12px 16px; border-top:2px solid #cbd5e1; text-align:right; background:#fdf2f8; color:#9d174d;">${escapeHTML(formatSaldoAwalReportAmount(totalKredit))}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>`;
    }

    async function loadSaldoAwalReportView() {
        const storedState = await fetchSaldoAwalStoredState();
        const periodInput = document.getElementById('saldo-awal-periode-input');
        const periodValue = periodInput && periodInput.value
            ? periodInput.value
            : (storedState.period || getDefaultSaldoAwalPeriod());
        const sourceRows = saldoAwalState.rows.length ? saldoAwalState.rows : storedState.rows;

        await loadCoaDraftEntries(true);
        saldoAwalState.coaEntries = getCoaDraftEntries().map((entry) => normalizeCoaDraftEntry(entry));
        saldoAwalState.rows = mergeSaldoAwalRowsFromSources(saldoAwalState.coaEntries, sourceRows);

        const reportRows = buildSaldoAwalReportRows(saldoAwalState.rows);
        renderSaldoAwalReportTable(reportRows, periodValue);
    }

    function buildCoaCsvCell(value) {
        const normalized = String(value || '');
        if (normalized.includes(';') || normalized.includes('"') || normalized.includes('\n')) {
            return `"${normalized.replace(/"/g, '""')}"`;
        }
        return normalized;
    }

    function normalizeCoaHeader(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/[\s/_.-]+/g, '')
            .trim();
    }

    function mapCoaCsvRowToEntry(headers, row) {
        const findValue = (...names) => {
            for (const name of names) {
                const index = headers.findIndex((header) => header === normalizeCoaHeader(name));
                if (index >= 0) {
                    return String(row[index] || '').trim();
                }
            }
            return '';
        };

        return {
            kategoriAkun: findValue('Kategori Akun', 'KategoriAkun', 'Kelompok'),
            kelompok: findValue('Kelompok', 'Kategori Akun', 'KategoriAkun'),
            headerDetail: findValue('Status Akun', 'Header/ Detail', 'Header/Detail', 'HeaderDetail'),
            statusAkun: findValue('Status Akun', 'Header/ Detail', 'Header/Detail', 'HeaderDetail'),
            level: findValue('Level Akun', 'Level'),
            kodeAkun: findValue('Kode Akun', 'KodeAkun'),
            kodeParent: findValue('Kode Parent', 'KodeParent', 'Parent', 'ParentCode'),
            namaAkun: findValue('Nama Akun', 'NamaAkun'),
            saldoNormal: findValue('(Sisi) Saldo Normal', 'Saldo Normal', 'Sisi Saldo Normal'),
            definisi: findValue('Catatan', 'Definisi'),
            catatan: findValue('Catatan', 'Definisi'),
            mataUang: findValue('Mata Uang', 'MataUang') || 'Rupiah',
        };
    }

    let coaAccountSelectOptionsPromise = null;

    function buildMappingCoaOptionLabel(entry) {
        return `${entry.kodeAkun} ${entry.namaAkun}`.trim();
    }

    function ensureDatalistHasValue(inputEl, listEl, value) {
        if (!inputEl || !listEl || !value) return;

        const existingOption = Array.from(listEl.options).find((option) => option.value === value);
        if (!existingOption) {
            const fallbackOption = document.createElement('option');
            fallbackOption.value = value;
            listEl.appendChild(fallbackOption);
        }

        inputEl.value = value;
    }

    function fetchCoaAccountOptions() {
        if (!coaAccountSelectOptionsPromise) {
            const mapEntriesToOptions = (entries) => entries
                .map((entry) => normalizeCoaDraftEntry(entry))
                .filter((entry) => entry.kodeAkun && entry.namaAkun)
                .filter((entry) => entry.headerDetail === 'Detail')
                .map((entry) => ({
                    value: buildMappingCoaOptionLabel(entry),
                    label: buildMappingCoaOptionLabel(entry),
                    kategoriAkun: entry.kategoriAkun || entry.kelompok || 'Lainnya',
                }));

            coaAccountSelectOptionsPromise = fetch('/api/coas?session_slug=' + encodeURIComponent(getCoaSessionSlug()) + '&t=' + Date.now())
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Draft CoA tidak tersedia di server');
                    }
                    return response.json();
                })
                .then((entries) => {
                    const mappedEntries = Array.isArray(entries) ? entries.map(mapBackendCoaEntryToDraft) : [];
                    if (mappedEntries.length > 0) {
                        return mapEntriesToOptions(mappedEntries);
                    }

                    return fetch('/assets/coa.csv', { cache: 'no-store' })
                        .then((response) => {
                            if (!response.ok) {
                                throw new Error('Template CoA tidak tersedia');
                            }
                            return response.text();
                        })
                        .then((fileText) => {
                            const records = parseMappingCsvText(fileText);
                            if (records.length <= 1) {
                                return [];
                            }

                            const headers = records[0].map((header) => normalizeCoaHeader(header));
                            const fallbackEntries = [];
                            for (let index = 1; index < records.length; index++) {
                                const row = records[index];
                                if (!row || row.every((cell) => !String(cell || '').trim())) {
                                    continue;
                                }

                                fallbackEntries.push(mapCoaCsvRowToEntry(headers, row));
                            }

                            return mapEntriesToOptions(fallbackEntries);
                        });
                })
                .catch((error) => {
                    coaAccountSelectOptionsPromise = null;
                    throw error;
                });
        }

        return coaAccountSelectOptionsPromise;
    }

    function buildMappingCoaSelectOptionsHtml(options, selectedValue, placeholder) {
        const normalizedSelectedValue = String(selectedValue || '').trim();
        const selectOptions = options
            .slice()
            .sort((left, right) => String(left.label || '').localeCompare(String(right.label || ''), 'id'))
            .map((option) => {
                const value = String(option.value || '');
                const isSelected = value === normalizedSelectedValue ? ' selected' : '';
                return `<option value="${escapeHTML(value)}"${isSelected}>${escapeHTML(option.label)}</option>`;
            })
            .join('');
        const placeholderSelected = normalizedSelectedValue ? '' : ' selected';
        const missingSelectedOption = normalizedSelectedValue && !options.some((option) => String(option.value || '') === normalizedSelectedValue)
            ? `<option value="${escapeHTML(normalizedSelectedValue)}" selected>${escapeHTML(normalizedSelectedValue)}</option>`
            : '';

        return `<option value=""${placeholderSelected}>${escapeHTML(placeholder || '-- Pilih akun CoA --')}</option>${missingSelectedOption}${selectOptions}`;
    }

    function renderMappingCoaSelect(selectEl, options, selectedValue, placeholder) {
        if (!selectEl) return;
        selectEl.innerHTML = buildMappingCoaSelectOptionsHtml(options, selectedValue, placeholder);
        selectEl.value = selectedValue || '';
        if (selectedValue && selectEl.value !== selectedValue) {
            selectEl.value = selectedValue;
        }
    }

    function loadMappingCoaAccountOptions(selectedDebit, selectedKredit) {
        const debitSelects = Array.from(document.querySelectorAll('#mapping-journal-rows select[name="akun_debet"], #mapping-journal-rows select[name="detail_akun_debet[]"]'));
        const kreditSelects = Array.from(document.querySelectorAll('#mapping-journal-rows select[name="akun_kredit"], #mapping-journal-rows select[name="detail_akun_kredit[]"]'));
        if (!debitSelects.length && !kreditSelects.length) return Promise.resolve();

        debitSelects.forEach((selectEl) => {
            selectEl.innerHTML = '<option value="">Memuat akun CoA...</option>';
        });
        kreditSelects.forEach((selectEl) => {
            selectEl.innerHTML = '<option value="">Memuat akun CoA...</option>';
        });

        return fetchCoaAccountOptions()
            .then((options) => {
                document.querySelectorAll('#mapping-journal-rows select[name="akun_debet"], #mapping-journal-rows select[name="detail_akun_debet[]"]').forEach((selectEl) => {
                    const value = selectEl.value || (selectEl.dataset.pendingValue || '');
                    renderMappingCoaSelect(selectEl, options, value, '-- Pilih akun debit CoA --');
                });
                document.querySelectorAll('#mapping-journal-rows select[name="akun_kredit"], #mapping-journal-rows select[name="detail_akun_kredit[]"]').forEach((selectEl) => {
                    const value = selectEl.value || (selectEl.dataset.pendingValue || '');
                    renderMappingCoaSelect(selectEl, options, value, '-- Pilih akun kredit CoA --');
                });

                // Optional defaults for first row
                if (selectedDebit) {
                    const firstDebit = document.querySelector('#mapping-journal-rows select[name="akun_debet"]');
                    if (firstDebit && !firstDebit.value) {
                        firstDebit.value = selectedDebit;
                    }
                }
                if (selectedKredit) {
                    const firstKredit = document.querySelector('#mapping-journal-rows select[name="akun_kredit"]');
                    if (firstKredit && !firstKredit.value) {
                        firstKredit.value = selectedKredit;
                    }
                }
            })
            .catch((error) => {
                console.error('Failed to load CoA options for mapping transaksi', error);
                document.querySelectorAll('#mapping-journal-rows select[name="akun_debet"], #mapping-journal-rows select[name="detail_akun_debet[]"]').forEach((selectEl) => {
                    selectEl.innerHTML = '<option value="">Gagal memuat akun CoA</option>';
                });
                document.querySelectorAll('#mapping-journal-rows select[name="akun_kredit"], #mapping-journal-rows select[name="detail_akun_kredit[]"]').forEach((selectEl) => {
                    selectEl.innerHTML = '<option value="">Gagal memuat akun CoA</option>';
                });
                showToast('Gagal memuat akun CoA untuk mapping transaksi.', true);
            });
    }

    function buildMappingJournalRowHTML(isFirst, detail = {}) {
        const debitName = isFirst ? 'akun_debet' : 'detail_akun_debet[]';
        const kreditName = isFirst ? 'akun_kredit' : 'detail_akun_kredit[]';
        const requiredAttr = isFirst ? 'required' : 'required';
        const removeBtn = isFirst
            ? ''
            : '<button type="button" class="btn-remove-journal-row primary-btn" title="Hapus baris" style="background:#fff;color:#dc2626;border:1px solid #fecaca;padding:8px 10px;"><i class="fa-solid fa-trash"></i></button>';
        const debit = detail.akun_debet || '';
        const kredit = detail.akun_kredit || '';
        const linkBkUtangChecked = detail.link_bk_utang ? 'checked' : '';
        const linkBkPiutangChecked = detail.link_bk_piutang ? 'checked' : '';
        const linkPersediaanChecked = detail.link_persediaan ? 'checked' : '';
        const linkAsetTetapChecked = detail.link_aset_tetap ? 'checked' : '';
        return `
            <div class="mapping-journal-row" style="display:grid; grid-template-columns: 1fr 1fr auto; gap:10px; align-items:end; margin-bottom:10px; padding:12px; border:1px dashed var(--border); border-radius:8px; background:#fff;">
                <div>
                    <label style="font-size:0.78rem;color:var(--text-secondary);">Akun Debit</label>
                    <select name="${debitName}" ${requiredAttr} data-pending-value="${escapeHTML(debit || '')}">
                        <option value="">Memuat akun CoA...</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:0.78rem;color:var(--text-secondary);">Akun Kredit</label>
                    <select name="${kreditName}" ${requiredAttr} data-pending-value="${escapeHTML(kredit || '')}">
                        <option value="">Memuat akun CoA...</option>
                    </select>
                </div>
                <div>${removeBtn}</div>
                <div style="grid-column:1 / -1; border-top:1px solid var(--border); padding-top:10px; margin-top:2px;">
                    <div style="font-size:0.78rem;color:var(--text-secondary); margin-bottom:8px;">Link Buku Pembantu untuk baris jurnal ini</div>
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:10px;">
                        <label style="display:flex; align-items:center; gap:10px; padding:10px 12px; border:1px solid var(--border); border-radius:8px; background:#fafafa; cursor:pointer;">
                            <input type="checkbox" data-field="link_bk_utang" value="1" ${linkBkUtangChecked} style="width:16px;height:16px;accent-color:var(--primary);cursor:pointer;">
                            <span style="font-weight:500; color:var(--text-primary);">BP Utang</span>
                        </label>
                        <label style="display:flex; align-items:center; gap:10px; padding:10px 12px; border:1px solid var(--border); border-radius:8px; background:#fafafa; cursor:pointer;">
                            <input type="checkbox" data-field="link_bk_piutang" value="1" ${linkBkPiutangChecked} style="width:16px;height:16px;accent-color:var(--primary);cursor:pointer;">
                            <span style="font-weight:500; color:var(--text-primary);">BP Piutang</span>
                        </label>
                        <label style="display:flex; align-items:center; gap:10px; padding:10px 12px; border:1px solid var(--border); border-radius:8px; background:#fafafa; cursor:pointer;">
                            <input type="checkbox" data-field="link_persediaan" value="1" ${linkPersediaanChecked} style="width:16px;height:16px;accent-color:var(--primary);cursor:pointer;">
                            <span style="font-weight:500; color:var(--text-primary);">Kartu Persediaan</span>
                        </label>
                        <label style="display:flex; align-items:center; gap:10px; padding:10px 12px; border:1px solid var(--border); border-radius:8px; background:#fafafa; cursor:pointer;">
                            <input type="checkbox" data-field="link_aset_tetap" value="1" ${linkAsetTetapChecked} style="width:16px;height:16px;accent-color:var(--primary);cursor:pointer;">
                            <span style="font-weight:500; color:var(--text-primary);">Kartu Aset Tetap (Inventaris)</span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    function addMappingJournalRow(detail = {}) {
        const container = document.getElementById('mapping-journal-rows');
        if (!container) return;
        const isFirst = container.querySelectorAll('.mapping-journal-row').length === 0;
        const wrap = document.createElement('div');
        wrap.innerHTML = buildMappingJournalRowHTML(isFirst, detail).trim();
        const row = wrap.firstElementChild;
        container.appendChild(row);
        const removeBtn = row.querySelector('.btn-remove-journal-row');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => row.remove());
        }
        loadMappingCoaAccountOptions();
    }

    function resetMappingJournalRows(details) {
        const container = document.getElementById('mapping-journal-rows');
        if (!container) return;
        container.innerHTML = '';
        const list = Array.isArray(details) && details.length ? details : [{ akun_debet: '', akun_kredit: '', link_bk_utang: false, link_bk_piutang: false, link_persediaan: false, link_aset_tetap: false }];
        list.forEach((d) => addMappingJournalRow(d));
    }

    window.editCoaDraft = function(index) {
        const entries = getCoaDraftEntries();
        const entry = entries[index];
        if (!entry) return;

        if (window.location.pathname !== '/coa') {
            navigateTo('/coa');
        }

        document.getElementById('coa_edit_index').value = String(index);
        document.getElementById('coa_kelompok').value = entry.kelompok || '';
        document.getElementById('coa_header_detail').value = entry.headerDetail || '';
        document.getElementById('coa_level').value = entry.level || '';
        document.getElementById('coa_kode_akun').value = entry.kodeAkun || '';
        syncCoaParentOptions();
        document.getElementById('coa_kode_parent').value = entry.kodeParent || '';
        document.getElementById('coa_saldo_normal').value = normalizeCoaSaldoNormal(entry.saldoNormal, entry.kelompok);
        document.getElementById('coa_nama_akun').value = entry.namaAkun || '';
        document.getElementById('coa_definisi').value = entry.definisi || '';
        setCoaFormVisible(true, true);
        setCoaFormMode(true);
    };

    window.deleteCoaDraft = function(index) {
        window.showConfirmModal('Hapus draft bagan akun ini?', async function() {
            const entries = getCoaDraftEntries();
            if (!entries[index]) return;
            entries.splice(index, 1);

            try {
                await saveCoaDraftEntries(entries);
                renderCoaDraftTable();
                resetCoaForm();
                showToast('Draft CoA berhasil dihapus.');
            } catch (error) {
                console.error('Failed to delete CoA draft entry', error);
                showToast('Gagal menghapus draft CoA: ' + error.message, true);
            }
        });
    };

    const router = async () => {
        if(!checkAuth()) return; // enforce
        let path = window.location.pathname;

        // Hide all views globally
        if(dashboardView) dashboardView.style.display = 'none';
        if(profileView) profileView.style.display = 'none';
        if(profileDataView) profileDataView.style.display = 'none';
        if(settingsView) settingsView.style.display = 'none';
        if(rolesDataView) rolesDataView.style.display = 'none';
        if(rolesView) rolesView.style.display = 'none';
        
        const pelangganDataView = document.getElementById('pelanggan-data-view');
        const pelangganView = document.getElementById('pelanggan-view');
        if(pelangganDataView) pelangganDataView.style.display = 'none';
        if(pelangganView) pelangganView.style.display = 'none';

        const supplierDataView = document.getElementById('supplier-data-view');
        const supplierView = document.getElementById('supplier-view');
        if(supplierDataView) supplierDataView.style.display = 'none';
        if(supplierView) supplierView.style.display = 'none';
        
        const barangDataView = document.getElementById('barang-data-view');
        const barangView = document.getElementById('barang-view');
        if(barangDataView) barangDataView.style.display = 'none';
        if(barangView) barangView.style.display = 'none';

        const barangJasaDataView = document.getElementById('barang-jasa-data-view');
        const barangJasaView = document.getElementById('barang-jasa-view');
        if(barangJasaDataView) barangJasaDataView.style.display = 'none';
        if(barangJasaView) barangJasaView.style.display = 'none';

        const inventarisDataView = document.getElementById('inventaris-data-view');
        const inventarisView = document.getElementById('inventaris-view');
        if(inventarisDataView) inventarisDataView.style.display = 'none';
        if(inventarisView) inventarisView.style.display = 'none';

        const coaView = document.getElementById('coa-view');
        if(coaView) coaView.style.display = 'none';

        const bukaPeriodeView = document.getElementById('buka-periode-view');
        const saldoAwalView = document.getElementById('saldo-awal-view');
        if(bukaPeriodeView) bukaPeriodeView.style.display = 'none';
        if(saldoAwalView) saldoAwalView.style.display = 'none';
        
        const usersDataView = document.getElementById('users-data-view');
        const usersView = document.getElementById('users-view');
        if(usersDataView) usersDataView.style.display = 'none';
        if(usersView) usersView.style.display = 'none';

        const transaksiDataView = document.getElementById('transaksi-data-view');
        const transaksiView = document.getElementById('transaksi-view');
        const transaksiSubledgerView = document.getElementById('transaksi-subledger-view');
        const kartuPersediaanView = document.getElementById('kartu-persediaan-view');
        if(transaksiDataView) transaksiDataView.style.display = 'none';
        if(transaksiView) transaksiView.style.display = 'none';
        if(transaksiSubledgerView) transaksiSubledgerView.style.display = 'none';
        if(kartuPersediaanView) kartuPersediaanView.style.display = 'none';

        const mappingTransaksiDataView = document.getElementById('mapping-transaksi-data-view');
        const mappingTransaksiView = document.getElementById('mapping-transaksi-view');
        if(mappingTransaksiDataView) mappingTransaksiDataView.style.display = 'none';
        if(mappingTransaksiView) mappingTransaksiView.style.display = 'none';

        const jurnalView = document.getElementById('jurnal-view');
        if(jurnalView) jurnalView.style.display = 'none';

        const jurnalRekapView = document.getElementById('jurnal-rekap-view');
        if(jurnalRekapView) jurnalRekapView.style.display = 'none';

        const historiAkunView = document.getElementById('histori-akun-view');
        if(historiAkunView) historiAkunView.style.display = 'none';

        const jurnalPenyesuaianView = document.getElementById('jurnal-penyesuaian-view');
        if(jurnalPenyesuaianView) jurnalPenyesuaianView.style.display = 'none';

        const jurnalPenyesuaianRekapView = document.getElementById('jurnal-penyesuaian-rekap-view');
        if(jurnalPenyesuaianRekapView) jurnalPenyesuaianRekapView.style.display = 'none';

        const neracaSaldoSetelahPenyesuaianView = document.getElementById('neraca-saldo-setelah-penyesuaian-view');
        if(neracaSaldoSetelahPenyesuaianView) neracaSaldoSetelahPenyesuaianView.style.display = 'none';

        const laporanLabaRugiView = document.getElementById('laporan-laba-rugi-view');
        if(laporanLabaRugiView) laporanLabaRugiView.style.display = 'none';

        const laporanPenyertaanModalView = document.getElementById('laporan-penyertaan-modal-view');
        if(laporanPenyertaanModalView) laporanPenyertaanModalView.style.display = 'none';

        const laporanPerubahanModalView = document.getElementById('laporan-perubahan-modal-view');
        if(laporanPerubahanModalView) laporanPerubahanModalView.style.display = 'none';

        const posisiKeuanganNeracaView = document.getElementById('posisi-keuangan-neraca-view');
        if(posisiKeuanganNeracaView) posisiKeuanganNeracaView.style.display = 'none';

        const laporanArusKasView = document.getElementById('laporan-arus-kas-view');
        if(laporanArusKasView) laporanArusKasView.style.display = 'none';

        const deskHelpView = document.getElementById('desk-help-view');
        if(deskHelpView) deskHelpView.style.display = 'none';

        const pageTitle = document.getElementById('page-title');

        const roleId = localStorage.getItem('sibumdes_role_id');
        const profileId = localStorage.getItem('sibumdes_profile_id');
        const userPaths = ['/users', '/user/add', '/user/edit', '/roles', '/role/add', '/role/edit'];
        
        const isUserAccessDenied = userPaths.some(p => path.startsWith(p)) && (roleId !== "1" && profileId);
        const isProfileAddDenied = path.startsWith('/profile/add') && (roleId !== "1" || profileId);
        
        if (isUserAccessDenied || isProfileAddDenied) {
            showToast("Akses Ditolak: Anda tidak memiliki izin ke halaman ini.", true);
            // Revert pathname explicitly if needed, but navigateTo handles it
            window.history.replaceState({}, '', '/dashboard');
            path = '/dashboard';
        }

        refreshAsetTetapInboxNotifications();

        // Route map
        if (path === '/' || path === '/dashboard' || path === '/index.html') {
            if(dashboardView) dashboardView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Dashboard Overview';
        } else if (path === '/pengaturan') {
            if(settingsView) settingsView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Pengaturan';
            loadGeminiSettings();
        } else if (path === '/profiles') {
            if(profileDataView) profileDataView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Data Profil BUMDes';
            loadProfiles();
        } else if (path === '/profile/add') {
            if(profileView) profileView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Tambah Profil BUMDes';
            if(profileForm) {
                profileForm.reset();
                setRichTextValue('visi', '');
                setRichTextValue('misi', '');
                const previewContainer = document.getElementById('logo_preview_container');
                if(previewContainer) {
                    previewContainer.style.display = 'none';
                    document.getElementById('logo_preview').src = '';
                }
                const idEl = document.getElementById('profile_id');
                if(idEl) idEl.value = "";
                const slugEl = document.getElementById('profile_slug');
                if(slugEl) slugEl.value = "";
                if(unitUsahaList) {
                    unitUsahaList.innerHTML = '';
                    if(btnAddUnit) btnAddUnit.click(); // Append an empty unit
                }
            }
        } else if (path.startsWith('/profile/edit/')) {
            const id = path.split('/').pop();
            if(profileView) profileView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Edit Profil BUMDes';
            editProfileData(id);
        } else if (path === '/pelanggan') {
            const pelangganDataView = document.getElementById('pelanggan-data-view');
            if(pelangganDataView) pelangganDataView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Data Pelanggan';
            loadPelanggan();
        } else if (path === '/pelanggan/add') {
            const pelangganView = document.getElementById('pelanggan-view');
            if(pelangganView) pelangganView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Tambah Pelanggan';
            const pelangganForm = document.getElementById('pelangganForm');
            if(pelangganForm) {
                pelangganForm.reset();
                const idEl = document.getElementById('pelanggan_id');
                if(idEl) idEl.value = "";
            }
            applyPelangganFormDefaults();
            setupPelangganSaldoAwalInput();
            loadPelangganLinkAkunOptions('-');
            loadPelangganProfileBumdesDropdown();
            
            const profileDropdown = document.getElementById('pelanggan_profile_bumdes_id');
            if(profileDropdown) {
                profileDropdown.onchange = function(e) {
                    loadUnitUsahaDropdown(null, e.target.value);
                };
            }
        } else if (path.startsWith('/pelanggan/edit/')) {
            const slug = path.split('/').pop();
            openPelangganEditView(slug, { updateHistory: false });
        } else if (path === '/supplier') {
            const supplierDataView = document.getElementById('supplier-data-view');
            if(supplierDataView) supplierDataView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Data Supplier';
            loadSupplier();
        } else if (path === '/supplier/add') {
            const supplierView = document.getElementById('supplier-view');
            if(supplierView) supplierView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Tambah Supplier';
            const supplierForm = document.getElementById('supplierForm');
            if(supplierForm) {
                supplierForm.reset();
                const idEl = document.getElementById('supplier_id');
                if(idEl) idEl.value = "";
            }
            applySupplierFormDefaults();
            setupSupplierSaldoAwalInput();
            loadSupplierLinkAkunOptions('2-0100 Utang Usaha');
            loadSupplierProfileBumdesDropdown();
            
            const profileDropdown = document.getElementById('supplier_profile_bumdes_id');
            if(profileDropdown) {
                profileDropdown.onchange = function(e) {
                    loadUnitUsahaDropdown(null, e.target.value, 'supplier_unit_usaha_id');
                };
            }
        } else if (path.startsWith('/supplier/edit/')) {
            const slug = path.split('/').pop();
            openSupplierEditView(slug, { updateHistory: false });
        } else if (path === '/barang') {
            const barangDataView = document.getElementById('barang-data-view');
            if(barangDataView) barangDataView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Data Barang Persediaan';
            loadBarang();
        } else if (path === '/barang/add') {
            const barangView = document.getElementById('barang-view');
            if(barangView) barangView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Tambah Barang';
            const barangForm = document.getElementById('barangForm');
            if(barangForm) {
                barangForm.reset();
                const idEl = document.getElementById('barang_id');
                if(idEl) idEl.value = "";
            }
            applyBarangFormDefaults();
            setupBarangSaldoAwalNominalInput();
            loadBarangLinkAkunOptions('1-1420 Persediaan Barang Jadi; 5-1200 HPP Barang Jadi');
            loadBarangProfileBumdesDropdown();
            
            const profileDropdown = document.getElementById('barang_profile_bumdes_id');
            if(profileDropdown) {
                profileDropdown.onchange = function(e) {
                    loadUnitUsahaDropdown(null, e.target.value, 'barang_unit_usaha_id');
                };
            }
        } else if (path.startsWith('/barang/edit/')) {
            const slug = path.split('/').pop();
            const barangView = document.getElementById('barang-view');
            if(barangView) barangView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Edit Barang';
            applyBarangFormDefaults();
            setupBarangSaldoAwalNominalInput();
            loadBarangLinkAkunOptions('1-1420 Persediaan Barang Jadi; 5-1200 HPP Barang Jadi');
            loadBarangProfileBumdesDropdown();
            loadUnitUsahaDropdown(null, null, 'barang_unit_usaha_id');
            editBarangData(slug);
        } else if (path === '/barang-jasa') {
            const barangJasaDataView = document.getElementById('barang-jasa-data-view');
            if(barangJasaDataView) barangJasaDataView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Data Barang & Jasa';
            loadBarangJasa();
        } else if (path === '/barang-jasa/add') {
            const barangJasaView = document.getElementById('barang-jasa-view');
            if(barangJasaView) barangJasaView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Tambah Barang & Jasa';
            const barangJasaForm = document.getElementById('barangJasaForm');
            if(barangJasaForm) {
                barangJasaForm.reset();
                const idEl = document.getElementById('barang_jasa_id');
                if(idEl) {
                    idEl.value = "";
                    idEl.name = "id";
                }
            }
            loadBarangJasaProfileBumdesDropdown();

            const profileDropdown = document.getElementById('barang_jasa_profile_bumdes_id');
            if(profileDropdown) {
                profileDropdown.onchange = function(e) {
                    loadUnitUsahaDropdown(null, e.target.value, 'barang_jasa_unit_usaha_id');
                };
            }
        } else if (path.startsWith('/barang-jasa/edit/')) {
            const slug = path.split('/').pop();
            const barangJasaView = document.getElementById('barang-jasa-view');
            if(barangJasaView) barangJasaView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Edit Barang & Jasa';
            loadBarangJasaProfileBumdesDropdown();
            loadUnitUsahaDropdown(null, null, 'barang_jasa_unit_usaha_id');
            editBarangJasaData(slug);
        } else if (path === '/inventaris') {
            const inventarisDataView = document.getElementById('inventaris-data-view');
            if(inventarisDataView) inventarisDataView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Data Inventaris';
            loadInventaris();
        } else if (path === '/coa') {
            const coaView = document.getElementById('coa-view');
            if(coaView) coaView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Form Chart of Account:';
            await loadCoaView();
        } else if (path === '/buka-periode') {
            const bukaPeriodeView = document.getElementById('buka-periode-view');
            if(bukaPeriodeView) bukaPeriodeView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Buka Periode';
            await loadSaldoAwalView();
        } else if (path === '/saldo-awal') {
            const saldoAwalView = document.getElementById('saldo-awal-view');
            if(saldoAwalView) saldoAwalView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Saldo Awal';
            await loadSaldoAwalReportView();
        } else if (path === '/inventaris/add') {
            const inventarisView = document.getElementById('inventaris-view');
            if(inventarisView) inventarisView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Tambah Inventaris';
            const inventarisForm = document.getElementById('inventarisForm');
            if(inventarisForm) {
                inventarisForm.reset();
                const idEl = document.getElementById('inventaris_slug');
                if(idEl) {
                    idEl.name = 'slug';
                    idEl.value = '';
                }
            }
            loadInventarisProfileBumdesDropdown();

            const profileDropdown = document.getElementById('inventaris_profile_bumdes_id');
            if(profileDropdown) {
                profileDropdown.onchange = function(e) {
                    loadUnitUsahaDropdown(null, e.target.value, 'inventaris_unit_usaha_id');
                };
            }
            applyInventarisFormDefaults();
            loadInventarisLinkAkunOptions('asetTetap', '-');
            loadInventarisLinkAkunOptions('akumulasi', '-');
            setupInventarisCurrencyInputs();
            updateInventarisBookValue();
        } else if (path.startsWith('/inventaris/edit/')) {
            const slug = path.split('/').pop();
            const inventarisView = document.getElementById('inventaris-view');
            if(inventarisView) inventarisView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Edit Inventaris';
            loadInventarisProfileBumdesDropdown();
            loadUnitUsahaDropdown(null, null, 'inventaris_unit_usaha_id');
            editInventarisData(slug);
        } else if (path === '/roles') {
            if(rolesDataView) rolesDataView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Daftar Hak Akses Sistem';
            loadRoles();
        } else if (path === '/role/add') {
            if(rolesView) rolesView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Tambah Hak Akses';
            if(roleForm) {
                roleForm.reset();
                const idEl = document.getElementById('role_id');
                if(idEl) idEl.value = "";
            }
        } else if (path.startsWith('/role/edit/')) {
            const id = path.split('/').pop();
            if(rolesView) rolesView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Edit Hak Akses';
            editRoleData(id);
        } else if (path === '/users') {
            const usersDataView = document.getElementById('users-data-view');
            if(usersDataView) usersDataView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Daftar Pengguna Sistem';
            loadUsers();
        } else if (path === '/user/add') {
            const usersView = document.getElementById('users-view');
            if(usersView) usersView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Tambah User & Hak Akses';
            const userForm = document.getElementById('userForm');
            if(userForm) {
                userForm.reset();
                const idEl = document.getElementById('user_id');
                if(idEl) idEl.value = "";
            }
            loadRolesDropdown();
            
            const sessionProfileId = localStorage.getItem('sibumdes_profile_id');
            loadUserProfileBumdesDropdown(sessionProfileId);
        } else if (path.startsWith('/user/edit/')) {
            const id = path.split('/').pop();
            const usersView = document.getElementById('users-view');
            if(usersView) usersView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Edit User & Hak Akses';
            editUserData(id);
        } else if (path === '/transaksi') {
            const transaksiDataView = document.getElementById('transaksi-data-view');
            if(transaksiDataView) transaksiDataView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Data Transaksi';
            loadTransaksiDataView();
        } else if (path === '/transaksi/add') {
            const transaksiView = document.getElementById('transaksi-view');
            if(transaksiView) transaksiView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Input Transaksi Harian';
            loadUnitUsahaDropdown(null, null, 'transaksi-unit-usaha');
            loadTransaksiPelangganList();
            loadTransaksiHistory();
            const initialDateInput = document.getElementById('transaksi-initial-date');
            if (initialDateInput) {
                initialDateInput.value = getToday();
            }
        } else if (path === '/kartu-persediaan') {
            const kartuPersediaanView = document.getElementById('kartu-persediaan-view');
            if(kartuPersediaanView) kartuPersediaanView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Kartu Persediaan';
            loadKartuPersediaanView();
        } else if (path === '/bp-utang' || path === '/bp-piutang' || path === '/kartu-aset-tetap') {
            const transaksiSubledgerView = document.getElementById('transaksi-subledger-view');
            const meta = getTransaksiSubledgerMeta(path);
            renderTransaksiSubledgerView(path);
            if(transaksiSubledgerView) transaksiSubledgerView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = meta ? meta.title : 'Subledger Transaksi';
        } else if (path === '/mapping-transaksi' || path === '/mapping-transaksi/non-rutin' || path === '/mapping-transaksi/umum' || path === '/mapping-transaksi/jurnal') {
            const mappingContext = applyMappingContextToView(path);
            const mappingTransaksiDataView = document.getElementById('mapping-transaksi-data-view');
            if(mappingTransaksiDataView) mappingTransaksiDataView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = mappingContext ? mappingContext.heading : 'Data Mapping Transaksi';
            loadMappingTransaksi();
        } else if (path === '/mapping-transaksi/add' || path === '/mapping-transaksi/non-rutin/add' || path === '/mapping-transaksi/umum/add' || path === '/mapping-transaksi/jurnal/add') {
            const mappingContext = applyMappingContextToView(path);
            const mappingTransaksiView = document.getElementById('mapping-transaksi-view');
            if(mappingTransaksiView) mappingTransaksiView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = mappingContext ? mappingContext.formTitle : 'Tambah Mapping Transaksi';
            const ft = document.getElementById('mapping-transaksi-form-title');
            if(ft) ft.textContent = mappingContext ? mappingContext.formTitle : 'Tambah Mapping Transaksi';
            const form = document.getElementById('mappingTransaksiForm');
            if(form) form.reset();
            document.getElementById('mapping_transaksi_slug').value = '';
            document.getElementById('mapping_transaksi_session_slug').value = localStorage.getItem('sibumdes_auth') || '';
            loadUnitUsahaDropdown(null, null, 'mapping_unit_usaha_id');
            resetMappingJournalRows(null);
            loadMappingCoaAccountOptions();
            loadMappingTransaksi();
        } else if (path.startsWith('/mapping-transaksi/edit/') || path.startsWith('/mapping-transaksi/non-rutin/edit/') || path.startsWith('/mapping-transaksi/umum/edit/') || path.startsWith('/mapping-transaksi/jurnal/edit/')) {
            const mappingContext = applyMappingContextToView(path);
            const slug = path.split('/').pop();
            const mappingTransaksiView = document.getElementById('mapping-transaksi-view');
            if(mappingTransaksiView) mappingTransaksiView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = mappingContext ? mappingContext.editTitle : 'Edit Mapping Transaksi';
            const ft = document.getElementById('mapping-transaksi-form-title');
            if(ft) ft.textContent = mappingContext ? mappingContext.editTitle : 'Edit Mapping Transaksi';
            document.getElementById('mapping_transaksi_session_slug').value = localStorage.getItem('sibumdes_auth') || '';
            loadUnitUsahaDropdown(null, null, 'mapping_unit_usaha_id');
            loadMappingCoaAccountOptions();
            loadMappingTransaksi();
            editMappingTransaksiData(slug);
        } else if (path === '/jurnal') {
            const jurnalView = document.getElementById('jurnal-view');
            if(jurnalView) jurnalView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Jurnal';
            loadJurnalView();
        } else if (path === '/jurnal-rekapitulasi') {
            const jurnalRekapView = document.getElementById('jurnal-rekap-view');
            if(jurnalRekapView) jurnalRekapView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Rekapitulasi';
            loadJurnalRekapitulasiView();
        } else if (path === '/histori-akun') {
            const historiAkunView = document.getElementById('histori-akun-view');
            if(historiAkunView) historiAkunView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Histori Akun';
            loadHistoriAkunView();
        } else if (path === '/jurnal-penyesuaian') {
            const jurnalPenyesuaianView = document.getElementById('jurnal-penyesuaian-view');
            if(jurnalPenyesuaianView) jurnalPenyesuaianView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Jurnal Penyesuaian';
            loadJurnalPenyesuaianView();
        } else if (path === '/jurnal-penyesuaian/rekapitulasi-jurnal') {
            const jurnalPenyesuaianRekapView = document.getElementById('jurnal-penyesuaian-rekap-view');
            if(jurnalPenyesuaianRekapView) jurnalPenyesuaianRekapView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Rekapitulasi Jurnal Penyesuaian';
            loadJurnalPenyesuaianRekapView();
        } else if (path === '/neraca-saldo-setelah-penyesuaian') {
            const neracaSaldoSetelahPenyesuaianView = document.getElementById('neraca-saldo-setelah-penyesuaian-view');
            if(neracaSaldoSetelahPenyesuaianView) neracaSaldoSetelahPenyesuaianView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Neraca Saldo Setelah Penyesuaian';
            loadNeracaSaldoSetelahPenyesuaianView();
        } else if (path === '/laporan-laba-rugi') {
            const laporanLabaRugiView = document.getElementById('laporan-laba-rugi-view');
            if(laporanLabaRugiView) laporanLabaRugiView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Laporan Laba Rugi';
            loadLaporanLabaRugiView();
        } else if (path === '/laporan-penyertaan-modal') {
            const laporanPenyertaanModalView = document.getElementById('laporan-penyertaan-modal-view');
            if(laporanPenyertaanModalView) laporanPenyertaanModalView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Laporan Penyertaan Modal';
            loadLaporanPenyertaanModalView();
        } else if (path === '/laporan-perubahan-modal') {
            const laporanPerubahanModalView = document.getElementById('laporan-perubahan-modal-view');
            if(laporanPerubahanModalView) laporanPerubahanModalView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Laporan Perubahan Modal';
            loadLaporanPerubahanModalView();
        } else if (path === '/posisi-keuangan-neraca') {
            const posisiKeuanganNeracaView = document.getElementById('posisi-keuangan-neraca-view');
            if(posisiKeuanganNeracaView) posisiKeuanganNeracaView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Posisi Keuangan / Neraca';
            loadPosisiKeuanganNeracaView();
        } else if (path === '/laporan-arus-kas') {
            const laporanArusKasView = document.getElementById('laporan-arus-kas-view');
            if(laporanArusKasView) laporanArusKasView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Laporan Arus Kas';
            loadLaporanArusKasView();
        } else if (path === '/desk-help') {
            const deskHelpView = document.getElementById('desk-help-view');
            if(deskHelpView) deskHelpView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Desk Help';
            loadDeskHelpGoogleStatus();
            setDeskHelpDefaultDateTime();
        } else {
            // Default fallback
            if(dashboardView) dashboardView.style.display = 'block';
            if(pageTitle) pageTitle.textContent = 'Dashboard Overview';
            history.replaceState(null, null, '/dashboard');
        }
    };

    // Handle back/forward events
    window.addEventListener('popstate', router);

    // Delegate intercepting link clicks for elements with data-link
    document.body.addEventListener('click', e => {
        if (e.target.matches('[data-link]')) {
            e.preventDefault();
            navigateTo(e.target.href);
        } else if (e.target.closest('[data-link]')) {
            e.preventDefault();
            navigateTo(e.target.closest('[data-link]').href);
        }
    });

    // Other Buttons mapped to router
    const btnAddProfile = document.getElementById('btn-add-profile');
    if(btnAddProfile) {
        btnAddProfile.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('/profile/add');
        });
    }

    const btnAddRole = document.getElementById('btn-add-role');
    if(btnAddRole) {
        btnAddRole.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('/role/add');
        });
    }

    const btnAddPelanggan = document.getElementById('btn-add-pelanggan');
    if(btnAddPelanggan) {
        btnAddPelanggan.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('/pelanggan/add');
        });
    }

    const btnAddSupplier = document.getElementById('btn-add-supplier');
    if(btnAddSupplier) {
        btnAddSupplier.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('/supplier/add');
        });
    }

    const btnAddBarang = document.getElementById('btn-add-barang');
    if(btnAddBarang) {
        btnAddBarang.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('/barang/add');
        });
    }

    const btnAddBarangJasa = document.getElementById('btn-add-barang-jasa');
    if(btnAddBarangJasa) {
        btnAddBarangJasa.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('/barang-jasa/add');
        });
    }

    const btnAddInventaris = document.getElementById('btn-add-inventaris');
    if(btnAddInventaris) {
        btnAddInventaris.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('/inventaris/add');
        });
    }

    const btnAddTransaksi = document.getElementById('btn-add-transaksi');
    if(btnAddTransaksi) {
        btnAddTransaksi.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('/transaksi/add');
        });
    }

    const btnAddMappingTransaksi = document.getElementById('btn-add-mapping-transaksi');
    if(btnAddMappingTransaksi) {
        btnAddMappingTransaksi.addEventListener('click', (e) => {
            e.preventDefault();
            const mappingContext = getCurrentMappingContext();
            navigateTo(mappingContext ? `${mappingContext.routeBase}/add` : '/mapping-transaksi/add');
        });
    }

    const btnBackMappingTransaksi = document.getElementById('btn-back-mapping-transaksi');
    if (btnBackMappingTransaksi) {
        btnBackMappingTransaksi.addEventListener('click', (e) => {
            e.preventDefault();
            const mappingContext = getCurrentMappingContext() || getCurrentMappingContext('/mapping-transaksi');
            navigateTo(mappingContext ? mappingContext.routeBase : '/mapping-transaksi');
        });
    }

    const coaForm = document.getElementById('coaForm');
    const coaLevelInput = document.getElementById('coa_level');
    const coaKodeAkunInput = document.getElementById('coa_kode_akun');
    const coaKelompokInput = document.getElementById('coa_kelompok');
    if (coaLevelInput) {
        coaLevelInput.addEventListener('input', () => {
            syncCoaParentOptions();
        });
    }

    if (coaKodeAkunInput) {
        coaKodeAkunInput.addEventListener('input', () => {
            syncCoaParentOptions();
        });
    }

    if (coaKelompokInput) {
        coaKelompokInput.addEventListener('change', () => {
            const saldoNormalEl = document.getElementById('coa_saldo_normal');
            if (saldoNormalEl && !document.getElementById('coa_edit_index').value) {
                saldoNormalEl.value = inferCoaSaldoNormal(coaKelompokInput.value);
            }
        });
    }

    if (coaForm) {
        coaForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const entries = getCoaDraftEntries();
            const editIndex = document.getElementById('coa_edit_index').value;
            const entry = normalizeCoaDraftEntry({
                kelompok: document.getElementById('coa_kelompok').value.trim(),
                headerDetail: document.getElementById('coa_header_detail').value.trim(),
                level: document.getElementById('coa_level').value.trim(),
                kodeAkun: document.getElementById('coa_kode_akun').value.trim(),
                kodeParent: document.getElementById('coa_kode_parent').value.trim(),
                namaAkun: document.getElementById('coa_nama_akun').value.trim(),
                saldoNormal: document.getElementById('coa_saldo_normal').value.trim(),
                definisi: document.getElementById('coa_definisi').value.trim(),
            });

            const validationError = validateCoaEntry(entry, entries, editIndex);
            if (validationError) {
                showToast(validationError, true);
                return;
            }

            if (editIndex !== '') {
                entries[Number(editIndex)] = entry;
            } else {
                entries.push(entry);
            }

            try {
                expandCoaEntriesVisibility([entry], entries);
                await saveCoaDraftEntries(entries);
                renderCoaDraftTable();
                resetCoaForm();
                setCoaFormVisible(false, false);
                showToast(editIndex !== '' ? 'Draft CoA berhasil diperbarui.' : 'Draft CoA berhasil disimpan.');
            } catch (error) {
                console.error('Failed to save CoA draft', error);
                showToast('Gagal menyimpan draft CoA: ' + error.message, true);
            }
        });
    }

    const btnCancelCoaEdit = document.getElementById('btn-cancel-coa-edit');
    if (btnCancelCoaEdit) {
        btnCancelCoaEdit.addEventListener('click', () => {
            resetCoaForm();
            setCoaFormVisible(false, false);
        });
    }

    const btnAddCoa = document.getElementById('btn-add-coa');
    if (btnAddCoa) {
        btnAddCoa.addEventListener('click', () => {
            resetCoaForm();
            setCoaFormVisible(true, true);
        });
    }

    const btnCoaFormMode = document.getElementById('coa-form-mode');
    if (btnCoaFormMode) {
        btnCoaFormMode.addEventListener('click', () => {
            resetCoaForm();
            setCoaFormVisible(true, false);
        });
    }

    const saldoAwalPeriodInput = document.getElementById('saldo-awal-periode-input');
    if (saldoAwalPeriodInput) {
        saldoAwalPeriodInput.addEventListener('change', () => {
            renderSaldoAwalTable();
        });
    }

    const btnCancelSaldoAwalForm = document.getElementById('btn-cancel-saldo-awal-form');
    if (btnCancelSaldoAwalForm) {
        btnCancelSaldoAwalForm.addEventListener('click', () => {
            resetSaldoAwalForm();
            setSaldoAwalFormVisible(false);
        });
    }

    const saldoAwalCoaSelect = document.getElementById('saldo_awal_coa_select');
    if (saldoAwalCoaSelect) {
        saldoAwalCoaSelect.addEventListener('change', () => {
            syncSaldoAwalFormFromCoa(saldoAwalCoaSelect.value);
        });
    }

    const saldoAwalForm = document.getElementById('saldoAwalForm');
    if (saldoAwalForm) {
        saldoAwalForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const kodeAkun = document.getElementById('saldo_awal_coa_select').value.trim();
            if (!kodeAkun) {
                showToast('Pilih akun CoA terlebih dahulu.', true);
                return;
            }

            if (saldoAwalState.rows.some((row) => row.kodeAkun === kodeAkun)) {
                showToast('Akun tersebut sudah ada pada laporan saldo awal.', true);
                return;
            }

            saldoAwalState.rows.push(normalizeSaldoAwalRow({
                id: `manual:${kodeAkun}:${Date.now()}`,
                kodeAkun,
                namaAkun: document.getElementById('saldo_awal_nama_akun').value.trim(),
                kelompok: document.getElementById('saldo_awal_kelompok').value.trim(),
                statusAkun: document.getElementById('saldo_awal_status').value.trim(),
                level: document.getElementById('saldo_awal_level').value.trim(),
                manual: true,
                debitValues: createEmptySaldoAwalAmounts(),
                kreditValues: createEmptySaldoAwalAmounts(),
            }));
            saldoAwalState.rows.sort((left, right) => String(left.kodeAkun || '').localeCompare(String(right.kodeAkun || ''), 'id'));
            renderSaldoAwalTable();
            resetSaldoAwalForm();
            setSaldoAwalFormVisible(false);
            showToast('Baris saldo awal berhasil ditambahkan.');
        });
    }

    window.saveSaldoAwalReportAction = async function() {
        syncSaldoAwalComputedState();
        try {
            await persistSaldoAwalState();
            showToast('Laporan saldo awal berhasil disimpan ke database.');
        } catch (error) {
            console.error('Failed to persist saldo awal report', error);
            showToast('Gagal menyimpan laporan saldo awal ke database.', true);
        }
    };

    window.refreshSaldoAwalMasterDataAction = async function() {
        const refreshButton = document.getElementById('btn-refresh-saldo-awal-master');
        const originalHtml = refreshButton ? refreshButton.innerHTML : '';
        if (refreshButton) {
            refreshButton.disabled = true;
            refreshButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menarik Data...';
        }

        try {
            const refreshedAt = new Date().toISOString();
            await generateSaldoAwalReport({ preserveCurrent: true, persist: true, masterRefreshedAt: refreshedAt });
            showToast('Data master untuk Buka Periode berhasil diperbarui dan disimpan ke database.');
        } catch (error) {
            console.error('Failed to refresh saldo awal master data', error);
            showToast('Gagal menarik data master terbaru untuk Buka Periode.', true);
        } finally {
            if (refreshButton) {
                updateSaldoAwalLastRefreshLabel();
                refreshButton.disabled = false;
                refreshButton.innerHTML = originalHtml || '<i class="fa-solid fa-rotate"></i> Tarik Data';
            }
        }
    };

    const btnRefreshSaldoAwalMaster = document.getElementById('btn-refresh-saldo-awal-master');
    if (btnRefreshSaldoAwalMaster) {
        btnRefreshSaldoAwalMaster.addEventListener('click', () => {
            window.refreshSaldoAwalMasterDataAction();
        });
    }

    window.clearCoaDraftAction = function() {
        window.showConfirmModal('Kosongkan seluruh draft bagan akun?', async function() {
            try {
                await clearCoaDraftEntries();
                renderCoaDraftTable();
                resetCoaForm();
                showToast('Draft CoA berhasil dikosongkan.');
            } catch (error) {
                console.error('Failed to clear CoA draft', error);
                showToast('Gagal mengosongkan draft CoA: ' + error.message, true);
            }
        });
    };

    const btnDownloadTemplateCoa = document.getElementById('btn-download-template-coa');
    if (btnDownloadTemplateCoa) {
        btnDownloadTemplateCoa.addEventListener('click', async (e) => {
            e.preventDefault();

            const originalLabel = btnDownloadTemplateCoa.innerHTML;
            btnDownloadTemplateCoa.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan...';
            btnDownloadTemplateCoa.style.pointerEvents = 'none';

            try {
                const response = await fetch('/assets/coa.csv', { cache: 'no-store' });
                if (!response.ok) {
                    throw new Error('Template CoA tidak tersedia');
                }

                const fileText = await response.text();
                const records = parseMappingCsvText(fileText);
                if (records.length <= 1) {
                    throw new Error('Template CoA kosong');
                }

                const headers = records[0].map((header) => normalizeCoaHeader(header));
                const exportRows = [
                    ['Kelompok', 'Status Akun', 'Level Akun', 'Kode Akun', 'Nama Akun', '(Sisi) Saldo Normal', 'Catatan'].join(';')
                ];

                for (let index = 1; index < records.length; index++) {
                    const row = records[index];
                    if (!row || row.every((cell) => !String(cell || '').trim())) {
                        continue;
                    }

                    const entry = normalizeCoaDraftEntry(mapCoaCsvRowToEntry(headers, row));
                    if (!entry.kodeAkun || !entry.namaAkun) {
                        continue;
                    }

                    exportRows.push([
                        buildCoaCsvCell(entry.kelompok),
                        buildCoaCsvCell(entry.headerDetail),
                        buildCoaCsvCell(entry.level),
                        buildCoaCsvCell(entry.kodeAkun),
                        buildCoaCsvCell(entry.namaAkun),
                        buildCoaCsvCell(entry.saldoNormal),
                        buildCoaCsvCell(entry.catatan),
                    ].join(';'));
                }

                const blob = new Blob([exportRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                const blobUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = 'coa_template_bidang_akun.csv';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);
                showToast('Template CoA berhasil diunduh.');
            } catch (error) {
                console.error('Failed to download CoA template', error);
                showToast('Gagal mengunduh template CoA.', true);
            } finally {
                btnDownloadTemplateCoa.innerHTML = originalLabel;
                btnDownloadTemplateCoa.style.pointerEvents = '';
            }
        });
    }

    const btnUploadCoaCsv = document.getElementById('btn-upload-coa-csv');
    const inputUploadCoaCsv = document.getElementById('input-upload-coa-csv');
    if (btnUploadCoaCsv && inputUploadCoaCsv) {
        btnUploadCoaCsv.addEventListener('click', () => {
            inputUploadCoaCsv.click();
        });

        inputUploadCoaCsv.addEventListener('change', async (e) => {
            if (!e.target.files.length) return;

            const file = e.target.files[0];

            try {
                const fileText = await file.text();
                const records = parseMappingCsvText(fileText);
                if (records.length <= 1) {
                    throw new Error('File CSV kosong atau hanya berisi header');
                }

                const headers = records[0].map((header) => normalizeCoaHeader(header));
                const importedEntries = [];
                const existingEntries = getCoaDraftEntries();
                const latestImportedCodeByLevel = new Map();

                for (let index = 1; index < records.length; index++) {
                    const row = records[index];
                    if (!row || row.every((cell) => !String(cell || '').trim())) {
                        continue;
                    }

                    const entry = normalizeCoaDraftEntry(mapCoaCsvRowToEntry(headers, row));
                    if (!entry.kodeAkun || !entry.namaAkun) {
                        continue;
                    }

                    const levelNumber = Number(entry.level || '0');
                    if (levelNumber > 1 && !entry.kodeParent) {
                        entry.kodeParent = latestImportedCodeByLevel.get(levelNumber - 1) || '';
                    }

                    const validationEntries = [...existingEntries, ...importedEntries];
                    const validationError = validateCoaEntry(entry, validationEntries, '');
                    if (validationError) {
                        throw new Error(`Baris ${index + 1}: ${validationError}`);
                    }

                    const sequenceError = validateCoaImportSequence(entry, latestImportedCodeByLevel);
                    if (sequenceError) {
                        throw new Error(`Baris ${index + 1}: ${sequenceError}`);
                    }

                    importedEntries.push(entry);
                }

                if (importedEntries.length === 0) {
                    throw new Error('Tidak ada baris CoA yang valid untuk diimpor');
                }

                const mergedEntries = [...existingEntries, ...importedEntries];
                expandCoaEntriesVisibility(importedEntries, mergedEntries);
                await saveCoaDraftEntries(mergedEntries);
                renderCoaDraftTable();
                resetCoaForm();
                showToast(`${importedEntries.length} data CoA berhasil diupload ke draft.`);
            } catch (error) {
                console.error('Failed to import CoA CSV', error);
                showToast('Gagal upload CSV CoA: ' + error.message, true);
            } finally {
                inputUploadCoaCsv.value = '';
            }
        });
    }

    function parseDelimitedLine(line, delimiter) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let index = 0; index < line.length; index++) {
            const char = line[index];
            const nextChar = line[index + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    index += 1;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (char === delimiter && !inQuotes) {
                result.push(current);
                current = '';
                continue;
            }

            current += char;
        }

        result.push(current);
        return result.map((value) => value.trim());
    }

    function parseMappingCsvText(text) {
        const normalizedText = String(text || '').replace(/^\uFEFF/, '').replace(/\r/g, '').trim();
        if (!normalizedText) return [];

        const lines = normalizedText.split('\n').filter((line) => line.trim().length > 0);
        if (lines.length === 0) return [];

        const delimiter = lines[0].includes(';') ? ';' : ',';
        return lines.map((line) => parseDelimitedLine(line, delimiter));
    }

    function parseCsvBoolean(value) {
        const normalized = String(value || '').trim().toLowerCase();
        return ['1', 'true', 'ya', 'y', 'yes', 'v', 'check', 'checked'].includes(normalized);
    }

    function inferCashInOutFromAccounts(akunDebet, akunKredit) {
        const debet = String(akunDebet || '').toLowerCase();
        const kredit = String(akunKredit || '').toLowerCase();
        if (/(^|\s)(kas|bank)/.test(debet) || debet.includes('kas') || debet.includes('bank')) {
            return 'kas_masuk';
        }
        if (/(^|\s)(kas|bank)/.test(kredit) || kredit.includes('kas') || kredit.includes('bank')) {
            return 'kas_keluar';
        }
        return 'kas_masuk';
    }

    function normalizeUnitUsahaKey(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/^"+|"+$/g, '')
            .replace(/\s+/g, ' ')
            .replace(/[._\-/]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function fetchAccessibleUnitReferences() {
        return fetch('/api/profiles')
            .then((res) => res.json())
            .then((profiles) => {
                const loggedProfileId = localStorage.getItem('sibumdes_profile_id');
                const units = [];
                (profiles || []).forEach((profile) => {
                    if (loggedProfileId && String(profile.ID) !== String(loggedProfileId)) {
                        return;
                    }
                    (profile.UnitUsaha || []).forEach((unit) => {
                        units.push({
                            id: unit.ID,
                            nama: unit.NamaUnitUsaha || '',
                            namaKey: normalizeUnitUsahaKey(unit.NamaUnitUsaha || ''),
                            bumdes: profile.NamaBUMDes || '',
                        });
                    });
                });
                return units;
            });
    }

    function buildMappingTemplateRows(units, mappingContext) {
        const isNonRutin = mappingContext && mappingContext.apiValue === 'non_rutin';
        const headers = isNonRutin
            ? [
                'No',
                'Unit Usaha',
                'Deskripsi',
                'Debit',
                'Kredit',
                'Cash Flow',
                'Kategori',
                'Sub Kategori',
                'BP Utang',
                'BP Piutang',
                'Kartu Persediaan',
                'Kartu Aset Tetap (Inventaris)',
            ]
            : [
                'No',
                'Unit Usaha',
                'Deskripsi',
                'Debit',
                'Kredit',
                'Cash Flow',
                'BP Utang',
                'BP Piutang',
                'Kartu Persediaan',
                'Kartu Aset Tetap (Inventaris)',
            ];

        const sampleRows = isNonRutin
            ? [
                ['1', units[0]?.nama || 'Unit Usaha 1', 'Jual Kandang Lama', '1-1110 Kas', '1-1710 Aset Tetap', 'Kas Masuk', 'Investasi', 'Penerimaan kas dari penjualan aset tetap', '0', '0', '0', '1'],
                ['2', units[0]?.nama || 'Unit Usaha 1', 'Beli Kandang Ayam Baru', '1-1710 Aset Tetap', '1-1110 Kas', 'Kas Keluar', 'Investasi', 'Pengeluaran kas untuk pembelian aset tetap', '0', '0', '0', '1'],
            ]
            : [
                ['1', units[0]?.nama || 'Unit Usaha 1', `Contoh ${mappingContext.routeSegment} - Penjualan Tunai`, '1-1110 Kas', '4-1016 Pendapatan Penjualan', 'Kas Masuk', '0', '0', '1', '0'],
                ['2', units[0]?.nama || 'Unit Usaha 1', `Contoh ${mappingContext.routeSegment} - Pembelian Inventaris`, '1-1510 Inventaris', '1-1110 Kas', 'Kas Keluar', '0', '0', '0', '1'],
            ];

        const rows = [headers];
        const maxRows = Math.max(sampleRows.length, units.length);

        for (let index = 0; index < maxRows; index++) {
            const row = index < sampleRows.length
                ? [...sampleRows[index]]
                : (isNonRutin
                    ? ['', units[index]?.nama || '', '', '', '', '', '', '', '0', '0', '0', '0']
                    : ['', units[index]?.nama || '', '', '', '', '', '0', '0', '0', '0']);

            rows.push(row);
        }

        return rows;
    }

    function normalizeMappingColumnName(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[._\-/]+/g, ' ')
            .trim();
    }

    function getMappingColumnIndices(headers) {
        const normalizedHeaders = (headers || []).map((header) => normalizeMappingColumnName(header));
        const findIndex = (...candidates) => {
            const normalizedCandidates = candidates.map((candidate) => normalizeMappingColumnName(candidate));
            return normalizedHeaders.findIndex((header) => normalizedCandidates.includes(header));
        };

        return {
            unitUsaha: findIndex('Unit Usaha'),
            namaMapping: findIndex('Deskripsi'),
            akunDebet: findIndex('Debit'),
            akunKredit: findIndex('Kredit'),
            cashFlow: findIndex('Cash Flow', 'Cash In/Out'),
            kategori: findIndex('Kategori', 'Kriteria', 'Klasifikasi Arus Kas'),
            subKategori: findIndex('Sub Kategori', 'Sub Kriteria', 'Kategori Arus Kas'),
            linkBkUtang: findIndex('BP Utang'),
            linkBkPiutang: findIndex('BP Piutang'),
            linkPersediaan: findIndex('Kartu Persediaan'),
            linkAsetTetap: findIndex('Kartu Aset Tetap (Inventaris)'),
            tipeDefault: findIndex('Tipe Default'),
            keterangan: findIndex('Keterangan'),
            referensiUnitId: findIndex('REFERENSI ID UNIT'),
            referensiNamaUnit: findIndex('NAMA UNIT USAHA'),
        };
    }

    function resolveUnitIdForMappingRecord(record, units, columnIndices = {}) {
        const referenceIdIndex = columnIndices.referensiUnitId >= 0 ? columnIndices.referensiUnitId : 15;
        const unitUsahaIndex = columnIndices.unitUsaha >= 0 ? columnIndices.unitUsaha : 1;
        const referensiNamaUnitIndex = columnIndices.referensiNamaUnit >= 0 ? columnIndices.referensiNamaUnit : 16;
        const referenceId = String(record[referenceIdIndex] || '').trim();
        if (referenceId) {
            const matchedById = units.find((unit) => String(unit.id) === referenceId);
            if (matchedById) return matchedById.id;
        }

        const candidates = [record[unitUsahaIndex], record[referensiNamaUnitIndex], record[referenceIdIndex]]
            .map((value) => String(value || '').trim())
            .filter(Boolean);

        for (const candidate of candidates) {
            if (/^\d+$/.test(candidate)) {
                const matchedByNumericId = units.find((unit) => String(unit.id) === candidate);
                if (matchedByNumericId) return matchedByNumericId.id;
            }

            const normalizedCandidate = normalizeUnitUsahaKey(candidate);
            if (!normalizedCandidate) {
                continue;
            }

            const exactMatch = units.find((unit) => unit.namaKey === normalizedCandidate);
            if (exactMatch) return exactMatch.id;

            const partialMatch = units.find((unit) =>
                unit.namaKey.includes(normalizedCandidate) || normalizedCandidate.includes(unit.namaKey)
            );
            if (partialMatch) return partialMatch.id;
        }

        return null;
    }

    function handleMappingTemplateDownload(buttonEl) {
        if (!buttonEl) return;

        buttonEl.addEventListener('click', (e) => {
            e.preventDefault();

            const mappingContext = getCurrentMappingContext() || getCurrentMappingContext('/mapping-transaksi');
            const originalText = buttonEl.innerHTML;
            buttonEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan...';
            buttonEl.disabled = true;

            fetchAccessibleUnitReferences()
                .then((units) => {
                    const rows = buildMappingTemplateRows(units, mappingContext);
                    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((row) => row.join(';')).join('\n');
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement('a');
                    link.setAttribute('href', encodedUri);
                    link.setAttribute('download', `Template_Mapping_Transaksi_${mappingContext.routeSegment}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    showToast('Template mapping transaksi berhasil diunduh.', false);
                })
                .catch((err) => {
                    console.error('Failed to generate mapping template', err);
                    showToast('Gagal menyiapkan template mapping transaksi.', true);
                })
                .finally(() => {
                    buttonEl.innerHTML = originalText;
                    buttonEl.disabled = false;
                });
        });
    }

    function handleMappingTemplateUpload(buttonEl, inputEl) {
        if (!buttonEl || !inputEl) return;

        buttonEl.addEventListener('click', () => {
            inputEl.click();
        });

        inputEl.addEventListener('change', async (e) => {
            if (!e.target.files.length) return;

            const mappingContext = getCurrentMappingContext() || getCurrentMappingContext('/mapping-transaksi');
            const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
            const file = e.target.files[0];

            try {
                showToast('Mengimpor mapping transaksi...', false);
                const [fileText, units] = await Promise.all([file.text(), fetchAccessibleUnitReferences()]);
                const records = parseMappingCsvText(fileText);
                if (records.length <= 1) {
                    throw new Error('File CSV kosong atau hanya berisi header');
                }

                const columnIndices = getMappingColumnIndices(records[0] || []);

                let successCount = 0;
                let skippedCount = 0;
                let lastErrorMessage = '';

                for (let index = 1; index < records.length; index++) {
                    const record = records[index];
                    if (!record || record.every((cell) => !String(cell || '').trim())) {
                        continue;
                    }

                    const unitUsahaID = resolveUnitIdForMappingRecord(record, units, columnIndices);
                    const rawUnitReference = [record[columnIndices.unitUsaha], record[columnIndices.referensiUnitId], record[columnIndices.referensiNamaUnit]]
                        .map((value) => String(value || '').trim())
                        .filter(Boolean)
                        .join(' | ');
                    const namaMapping = String(record[columnIndices.namaMapping] || '').trim();
                    const akunDebet = String(record[columnIndices.akunDebet] || '').trim();
                    const akunKredit = String(record[columnIndices.akunKredit] || '').trim();
                    if (!namaMapping || !akunDebet || !akunKredit) {
                        skippedCount += 1;
                        continue;
                    }
                    if (rawUnitReference && !unitUsahaID) {
                        skippedCount += 1;
                        lastErrorMessage = `Unit usaha tidak dikenali pada baris ${index + 1}: ${rawUnitReference}`;
                        continue;
                    }

                    const rawKategori = String(record[columnIndices.kategori] || '').trim();
                    const rawCashInOut = String(record[columnIndices.cashFlow] || '').trim();
                    const rawSubKategori = String(record[columnIndices.subKategori] || '').trim();
                    const klasifikasi = rawKategori
                        ? (rawKategori.toLowerCase().startsWith('aktivitas ') ? rawKategori : `Aktivitas ${rawKategori}`)
                        : 'Aktivitas Operasi';
                    const cashInOut = rawCashInOut
                        ? rawCashInOut.toLowerCase().replace(/\s+/g, '_')
                        : inferCashInOutFromAccounts(akunDebet, akunKredit);
                    const kategoriArusKas = rawSubKategori || namaMapping;
                    const tipeDefault = String(record[columnIndices.tipeDefault] || '').trim() || 'semua';
                    const keterangan = String(record[columnIndices.keterangan] || '').trim();

                    const payload = new URLSearchParams();
                    payload.set('session_slug', sessionSlug);
                    payload.set('jenis_mapping', mappingContext.apiValue);
                    payload.set('nama_mapping', namaMapping);
                    payload.set('akun_debet', akunDebet);
                    payload.set('akun_kredit', akunKredit);
                    payload.set('klasifikasi_arus_kas', klasifikasi);
                    payload.set('cash_in_out', cashInOut);
                    payload.set('kategori_arus_kas', kategoriArusKas);
                    payload.set('tipe_default', tipeDefault);
                    payload.set('keterangan', keterangan);
                    payload.set('kategori_transaksi', cashInOut === 'kas_keluar' ? 'keluar' : 'masuk');
                    payload.set('link_bk_utang', parseCsvBoolean(record[columnIndices.linkBkUtang]) ? '1' : '0');
                    payload.set('link_bk_piutang', parseCsvBoolean(record[columnIndices.linkBkPiutang]) ? '1' : '0');
                    payload.set('link_persediaan', parseCsvBoolean(record[columnIndices.linkPersediaan]) ? '1' : '0');
                    payload.set('link_aset_tetap', parseCsvBoolean(record[columnIndices.linkAsetTetap]) ? '1' : '0');
                    payload.set('link_jurnal_penyesuaian', '0');
                    if (unitUsahaID) {
                        payload.set('unit_usaha_id', String(unitUsahaID));
                    }

                    const res = await fetch('/api/mapping-transaksi', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: payload.toString(),
                    });

                    if (res.ok) {
                        successCount += 1;
                    } else {
                        skippedCount += 1;
                        lastErrorMessage = await res.text();
                    }
                }

                if (successCount === 0) {
                    throw new Error(lastErrorMessage || 'Tidak ada baris yang berhasil diimpor');
                }

                showToast(`Import mapping selesai: ${successCount} berhasil${skippedCount ? `, ${skippedCount} dilewati` : ''}.`, false);
                loadMappingTransaksi();
            } catch (err) {
                console.error('Mapping import failed', err);
                showToast('Gagal import mapping: ' + err.message, true);
            } finally {
                inputEl.value = '';
            }
        });
    }

    handleMappingTemplateDownload(document.getElementById('btn-download-template-mapping-harian'));
    handleMappingTemplateDownload(document.getElementById('btn-download-template-mapping-form'));
    handleMappingTemplateUpload(
        document.getElementById('btn-upload-template-mapping-harian'),
        document.getElementById('input-upload-template-mapping-harian')
    );
    handleMappingTemplateUpload(
        document.getElementById('btn-upload-template-mapping-form'),
        document.getElementById('input-upload-template-mapping-form')
    );

    const btnSeedMappingHarian = document.getElementById('btn-seed-mapping-harian');
    if (btnSeedMappingHarian) {
        btnSeedMappingHarian.addEventListener('click', function(e) {
            e.preventDefault();
            const mappingContext = getCurrentMappingContext() || getCurrentMappingContext('/mapping-transaksi');
            const isNonRutin = mappingContext && mappingContext.apiValue === 'non_rutin';
            const isLainnya = mappingContext && mappingContext.apiValue === 'umum';
            const isJurnal = mappingContext && mappingContext.apiValue === 'jurnal';
            const fileLabel = isNonRutin ? 'NonRutin.xlsx' : (isLainnya ? 'TransaksiLainnya.xlsx' : (isJurnal ? 'Jurnal.xlsx' : 'Harian.xlsx'));
            const endpoint = isNonRutin
                ? '/api/mapping-transaksi/seed-non-rutin'
                : (isLainnya ? '/api/mapping-transaksi/seed-lainnya' : (isJurnal ? '/api/mapping-transaksi/seed-jurnal' : '/api/mapping-transaksi/seed-harian'));
            const seedLabel = isNonRutin
                ? 'mapping transaksi non rutin'
                : (isLainnya ? 'mapping transaksi lainnya' : (isJurnal ? 'mapping jurnal' : 'mapping transaksi harian'));
            const jenisMapping = isNonRutin ? 'non_rutin' : (isLainnya ? 'umum' : (isJurnal ? 'jurnal' : 'harian'));
            window.showConfirmModal('Isi ' + seedLabel + ' dengan data default sesuai ' + fileLabel + '? Data yang sudah ada (nama mapping + unit usaha sama) akan dilewati.', function() {
                const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
                btnSeedMappingHarian.disabled = true;
                const originalHtml = btnSeedMappingHarian.innerHTML;
                btnSeedMappingHarian.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';
                fetch(endpoint + '?session_slug=' + encodeURIComponent(sessionSlug) + '&jenis_mapping=' + encodeURIComponent(jenisMapping), { method: 'POST' })
                    .then(async (res) => {
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) {
                            throw new Error(data.message || 'Gagal seed data');
                        }
                        const ins = data.inserted || 0;
                        const skp = data.skipped || 0;
                        showToast('Seed selesai: ' + ins + ' ditambahkan, ' + skp + ' dilewati.');
                        if (Array.isArray(data.warnings) && data.warnings.length) {
                            console.warn('Seed warnings:', data.warnings);
                        }
                        loadMappingTransaksi();
                    })
                    .catch((err) => showToast('Gagal seed data: ' + err.message, true))
                    .finally(() => {
                        btnSeedMappingHarian.disabled = false;
                        btnSeedMappingHarian.innerHTML = originalHtml;
                    });
            });
        });
    }

    const btnRefreshJurnalRekap = document.getElementById('btn-refresh-jurnal-rekap');
    if(btnRefreshJurnalRekap) {
        btnRefreshJurnalRekap.addEventListener('click', (e) => {
            e.preventDefault();
            loadJurnalRekapitulasi();
        });
    }

    const btnRefreshHistoriAkun = document.getElementById('btn-refresh-histori-akun');
    if(btnRefreshHistoriAkun) {
        btnRefreshHistoriAkun.addEventListener('click', (e) => {
            e.preventDefault();
            loadHistoriAkun();
        });
    }

    const btnRefreshJurnalPenyesuaian = document.getElementById('btn-refresh-jurnal-penyesuaian');
    if(btnRefreshJurnalPenyesuaian) {
        btnRefreshJurnalPenyesuaian.addEventListener('click', (e) => {
            e.preventDefault();
            loadJurnalPenyesuaian();
        });
    }

    const btnRefreshJurnalPenyesuaianRekap = document.getElementById('btn-refresh-jurnal-penyesuaian-rekap');
    if(btnRefreshJurnalPenyesuaianRekap) {
        btnRefreshJurnalPenyesuaianRekap.addEventListener('click', (e) => {
            e.preventDefault();
            loadJurnalPenyesuaianRekap();
        });
    }

    const btnRefreshNeracaSaldoSetelahPenyesuaian = document.getElementById('btn-refresh-neraca-saldo-setelah-penyesuaian');
    if(btnRefreshNeracaSaldoSetelahPenyesuaian) {
        btnRefreshNeracaSaldoSetelahPenyesuaian.addEventListener('click', (e) => {
            e.preventDefault();
            loadNeracaSaldoSetelahPenyesuaian();
        });
    }

    const btnRefreshLaporanLabaRugi = document.getElementById('btn-refresh-laporan-laba-rugi');
    if(btnRefreshLaporanLabaRugi) {
        btnRefreshLaporanLabaRugi.addEventListener('click', (e) => {
            e.preventDefault();
            loadLaporanLabaRugi();
        });
    }

    const btnRefreshLaporanPenyertaanModal = document.getElementById('btn-refresh-laporan-penyertaan-modal');
    if(btnRefreshLaporanPenyertaanModal) {
        btnRefreshLaporanPenyertaanModal.addEventListener('click', (e) => {
            e.preventDefault();
            loadLaporanPenyertaanModal();
        });
    }

    const btnRefreshLaporanPerubahanModal = document.getElementById('btn-refresh-laporan-perubahan-modal');
    if(btnRefreshLaporanPerubahanModal) {
        btnRefreshLaporanPerubahanModal.addEventListener('click', (e) => {
            e.preventDefault();
            loadLaporanPerubahanModal();
        });
    }

    const btnRefreshPosisiKeuanganNeraca = document.getElementById('btn-refresh-posisi-keuangan-neraca');
    if(btnRefreshPosisiKeuanganNeraca) {
        btnRefreshPosisiKeuanganNeraca.addEventListener('click', (e) => {
            e.preventDefault();
            loadPosisiKeuanganNeraca();
        });
    }

    const btnRefreshLaporanArusKas = document.getElementById('btn-refresh-laporan-arus-kas');
    if(btnRefreshLaporanArusKas) {
        btnRefreshLaporanArusKas.addEventListener('click', (e) => {
            e.preventDefault();
            loadLaporanArusKas();
        });
    }

    const btnRefreshJurnal = document.getElementById('btn-refresh-jurnal');
    if(btnRefreshJurnal) {
        btnRefreshJurnal.addEventListener('click', (e) => {
            e.preventDefault();
            loadJurnalView();
        });
    }

    const btnRefreshKartuPersediaan = document.getElementById('btn-refresh-kartu-persediaan');
    if(btnRefreshKartuPersediaan) {
        btnRefreshKartuPersediaan.addEventListener('click', (e) => {
            e.preventDefault();
            loadKartuPersediaanView();
        });
    }

    const btnRefreshTransaksiSubledger = document.getElementById('btn-refresh-transaksi-subledger');
    if (btnRefreshTransaksiSubledger) {
        btnRefreshTransaksiSubledger.addEventListener('click', (e) => {
            e.preventDefault();
            const path = window.location.pathname;
            if (path === '/bp-piutang' || path === '/bp-utang') {
                renderTransaksiSubledgerView(path);
            }
        });
    }

    const transaksiSubledgerUnitFilterStorageKey = 'sibumdes_transaksi_subledger_unit_filter';
    const transaksiSubledgerUnitFilterState = {
        '/bp-utang': 'all',
        '/bp-piutang': 'all',
    };

    function loadTransaksiSubledgerUnitFilterState() {
        try {
            const raw = sessionStorage.getItem(transaksiSubledgerUnitFilterStorageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return;
            ['/bp-utang', '/bp-piutang'].forEach((path) => {
                const value = String(parsed[path] || '').trim();
                if (value) {
                    transaksiSubledgerUnitFilterState[path] = value;
                }
            });
        } catch (error) {
            console.warn('Failed to restore BP unit filter state', error);
        }
    }

    function saveTransaksiSubledgerUnitFilterState() {
        try {
            sessionStorage.setItem(
                transaksiSubledgerUnitFilterStorageKey,
                JSON.stringify(transaksiSubledgerUnitFilterState)
            );
        } catch (error) {
            console.warn('Failed to persist BP unit filter state', error);
        }
    }

    loadTransaksiSubledgerUnitFilterState();

    function getTransaksiSubledgerUnitFilterValue(path) {
        return transaksiSubledgerUnitFilterState[path] || 'all';
    }

    function setTransaksiSubledgerUnitFilterValue(path, value) {
        if (!Object.prototype.hasOwnProperty.call(transaksiSubledgerUnitFilterState, path)) {
            return;
        }

        const normalized = String(value || '').trim() || 'all';
        transaksiSubledgerUnitFilterState[path] = normalized;
        saveTransaksiSubledgerUnitFilterState();
    }

    const transaksiSubledgerUnitFilter = document.getElementById('transaksi-subledger-unit-filter');
    if (transaksiSubledgerUnitFilter) {
        transaksiSubledgerUnitFilter.addEventListener('change', () => {
            const path = window.location.pathname;
            if (path === '/bp-piutang' || path === '/bp-utang') {
                setTransaksiSubledgerUnitFilterValue(path, transaksiSubledgerUnitFilter.value);
                renderTransaksiSubledgerView(path);
            }
        });
    }

    const kartuPersediaanUnitFilter = document.getElementById('kartu-persediaan-unit-filter');
    if (kartuPersediaanUnitFilter) {
        kartuPersediaanUnitFilter.addEventListener('change', () => {
            if (window.location.pathname === '/kartu-persediaan') {
                loadKartuPersediaanView();
            }
        });
    }

    function loadDeskHelpGoogleStatus() {
        const statusEl = document.getElementById('desk-help-google-status');
        const connectBtn = document.getElementById('desk-help-connect-google-btn');
        if (!statusEl) return;

        statusEl.textContent = 'Google: mengecek...';
        fetch('/api/desk-help/google/status')
            .then(res => res.json())
            .then(data => {
                const connected = !!(data && data.connected);
                statusEl.textContent = connected ? 'Google: Terhubung' : 'Google: Belum terhubung';
                if (connectBtn) {
                    connectBtn.textContent = connected ? 'Re-connect Google' : 'Hubungkan Google';
                }
            })
            .catch(() => {
                statusEl.textContent = 'Google: Status tidak tersedia';
            });
    }

    function formatDateForInput(dateObj) {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function formatTimeForInput(dateObj) {
        const h = String(dateObj.getHours()).padStart(2, '0');
        const m = String(dateObj.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
    }

    function setDeskHelpDefaultDateTime() {
        const eventDateEl = document.getElementById('desk_help_event_date');
        const startTimeEl = document.getElementById('desk_help_start_time');
        const endTimeEl = document.getElementById('desk_help_end_time');
        if (!eventDateEl || !startTimeEl || !endTimeEl) return;

        const now = new Date();
        const start = new Date(now.getTime() + (1 * 60 * 1000));
        const end = new Date(now.getTime() + (5 * 60 * 1000));

        eventDateEl.value = formatDateForInput(now);
        startTimeEl.value = formatTimeForInput(start);
        endTimeEl.value = formatTimeForInput(end);
    }

    const connectGoogleBtn = document.getElementById('desk-help-connect-google-btn');
    function openGoogleConnectFlow() {
        return fetch('/api/desk-help/google/auth-url')
            .then(async res => {
                const text = await res.text();
                if (!res.ok) {
                    throw new Error(text || 'Gagal membuat auth URL Google');
                }
                return JSON.parse(text);
            })
            .then(data => {
                if (!data || !data.auth_url) {
                    throw new Error('Auth URL Google tidak tersedia');
                }
                window.open(data.auth_url, '_blank', 'noopener');
                showToast('Silakan login Google di tab baru, lalu kembali ke Desk Help.');
            });
    }

    if (connectGoogleBtn) {
        connectGoogleBtn.addEventListener('click', () => {
            openGoogleConnectFlow().catch(err => {
                showToast('Gagal koneksi Google: ' + err.message, true);
            });
        });
    }

    let lastDeskHelpPayload = null;

    const openDeskHelpCalendarBtn = document.getElementById('desk-help-open-calendar-btn');
    if (openDeskHelpCalendarBtn) {
        openDeskHelpCalendarBtn.addEventListener('click', () => {
            if (!lastDeskHelpPayload) {
                showToast('Belum ada data event. Klik Buat Event terlebih dahulu.', true);
                return;
            }

            fetch('/api/desk-help/google/status')
                .then(async (statusRes) => {
                    const statusText = await statusRes.text();
                    if (!statusRes.ok) {
                        throw new Error(statusText || 'Gagal cek status Google');
                    }
                    try {
                        return JSON.parse(statusText);
                    } catch (e) {
                        throw new Error('Respons status Google tidak valid');
                    }
                })
                .then((statusData) => {
                    if (!statusData || !statusData.connected) {
                        throw new Error('GOOGLE_NOT_CONNECTED');
                    }

                    // Open a tab synchronously right before async calendar response to reduce popup blocking risk.
                    const calendarWindow = window.open('about:blank', '_blank');

                    const originalBtnText = openDeskHelpCalendarBtn.innerHTML;
                    openDeskHelpCalendarBtn.disabled = true;
                    openDeskHelpCalendarBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Membuat otomatis...';

                    fetch('/api/desk-help/calendar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...lastDeskHelpPayload, auto_create: true }),
                    }).then(async (res) => {
                        const text = await res.text();
                        if (!res.ok) {
                            throw new Error(text || 'Gagal membuat event otomatis');
                        }
                        try {
                            return JSON.parse(text);
                        } catch (e) {
                            throw new Error('Respons server tidak valid');
                        }
                    }).then((data) => {
                        const calendarUrl = data.calendar_url || '';
                        if (calendarUrl) {
                            openDeskHelpCalendarBtn.dataset.calendarUrl = calendarUrl;
                        }

                        if (data.auto_created) {
                            showToast('Event berhasil dibuat otomatis ke Google Calendar.');
                            if (calendarUrl) {
                                if (calendarWindow && !calendarWindow.closed) {
                                    calendarWindow.location.href = calendarUrl;
                                } else {
                                    window.open(calendarUrl, '_blank', 'noopener');
                                }
                            } else if (calendarWindow && !calendarWindow.closed) {
                                calendarWindow.close();
                            }
                            return;
                        }

                        if (calendarWindow && !calendarWindow.closed) {
                            calendarWindow.close();
                        }
                        showToast('Auto-create gagal. Event tidak dibuka ke mode manual.', true);
                    }).catch((err) => {
                        if (calendarWindow && !calendarWindow.closed) {
                            calendarWindow.close();
                        }
                        showToast('Auto-create gagal: ' + err.message, true);
                    }).finally(() => {
                        openDeskHelpCalendarBtn.disabled = false;
                        openDeskHelpCalendarBtn.innerHTML = originalBtnText;
                    });
                })
                .catch((err) => {
                    if (err && err.message === 'GOOGLE_NOT_CONNECTED') {
                        openGoogleConnectFlow().catch(connectErr => {
                            showToast('Google belum terhubung: ' + connectErr.message, true);
                        });
                        return;
                    }
                    showToast('Gagal membuka Google Calendar: ' + err.message, true);
                });
        });
    }

    const deskHelpForm = document.getElementById('deskHelpForm');
    if (deskHelpForm) {
        deskHelpForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const emailsEl = document.getElementById('desk_help_emails');
            const promptEl = document.getElementById('desk_help_prompt');
            const timezoneEl = document.getElementById('desk_help_timezone');
            const eventDateEl = document.getElementById('desk_help_event_date');
            const startTimeEl = document.getElementById('desk_help_start_time');
            const endTimeEl = document.getElementById('desk_help_end_time');
            const alarmHoursEl = document.getElementById('desk_help_alarm_hours');
            const submitBtn = document.getElementById('desk-help-submit-btn');
            const openCalendarBtn = document.getElementById('desk-help-open-calendar-btn');
            const resultBox = document.getElementById('desk-help-result');

            const payload = {
                emails: emailsEl ? emailsEl.value.trim() : '',
                prompt: promptEl ? promptEl.value.trim() : '',
                timezone: timezoneEl ? timezoneEl.value.trim() : 'Asia/Jakarta',
                event_date: eventDateEl ? eventDateEl.value.trim() : '',
                start_time: startTimeEl ? startTimeEl.value.trim() : '',
                end_time: endTimeEl ? endTimeEl.value.trim() : '',
                alarm_hours: alarmHoursEl ? parseInt(alarmHoursEl.value || '0', 10) || 0 : 0,
                auto_create: false,
            };

            if (!payload.emails || !payload.prompt) {
                showToast('Email dan perintah event wajib diisi.', true);
                return;
            }

            const hasAnyTime = !!payload.start_time || !!payload.end_time;
            if (hasAnyTime && !payload.event_date) {
                showToast('Jika mengisi jam event, tanggal event wajib diisi.', true);
                return;
            }

            const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';
            }
            if (openCalendarBtn) {
                openCalendarBtn.disabled = true;
                openCalendarBtn.dataset.calendarUrl = '';
            }
            lastDeskHelpPayload = {
                emails: payload.emails,
                prompt: payload.prompt,
                timezone: payload.timezone,
                event_date: payload.event_date,
                start_time: payload.start_time,
                end_time: payload.end_time,
                alarm_hours: payload.alarm_hours,
            };
            showToast('Memproses Desk Help...', false);

            fetch('/api/desk-help/calendar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }).then(async (res) => {
                const text = await res.text();
                if (!res.ok) {
                    throw new Error(text || 'Gagal membuat link Google Calendar');
                }
                try {
                    return JSON.parse(text);
                } catch (e) {
                    throw new Error('Respons server tidak valid');
                }
            }).then((data) => {
                if (resultBox) {
                    resultBox.style.display = 'block';
                    resultBox.innerHTML = `
                        <div><strong>Judul:</strong> ${data.title || '-'}</div>
                        <div><strong>Mulai:</strong> ${data.start_rfc3339 || '-'}</div>
                        <div><strong>Selesai:</strong> ${data.end_rfc3339 || '-'}</div>
                        <div><strong>Alarm:</strong> ${typeof data.alarm_hours === 'number' ? data.alarm_hours + ' jam sebelum event' : '-'}</div>
                        <div style="margin-top:8px; color:var(--text-secondary);">${data.message || 'Link berhasil dibuat'}</div>
                        <div style="margin-top:8px; color:#0f766e; font-weight:600;">${data.auto_created ? 'Event dibuat otomatis. Anda tetap bisa buka event lewat tombol Google Calendar.' : 'Langkah berikutnya: klik tombol Buka Google Calendar, lalu klik Simpan agar tersinkron ke HP.'}</div>
                    `;
                }
                if (openCalendarBtn) {
                    openCalendarBtn.dataset.calendarUrl = '';
                    openCalendarBtn.disabled = false;
                }
                showToast('Event siap. Klik tombol Buka Google Calendar untuk auto-create.');
            }).catch((err) => {
                lastDeskHelpPayload = null;
                showToast('Desk Help gagal: ' + err.message, true);
            }).finally(() => {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }
            });
        });
    }
    
    // Import Data Template logic
    const btnDownloadTemplate = document.getElementById('btn-download-template');
    if(btnDownloadTemplate) {
        btnDownloadTemplate.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Backup text and show loading
            const originalText = btnDownloadTemplate.innerHTML;
            btnDownloadTemplate.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan...';
            btnDownloadTemplate.disabled = true;

            fetch('/api/profiles')
                .then(res => res.json())
                .then(profiles => {
                    const loggedProfileId = localStorage.getItem('sibumdes_profile_id');
                    let units = [];
                    
                    if (profiles && profiles.length > 0) {
                        profiles.forEach(p => {
                            if (loggedProfileId && p.ID != loggedProfileId) return; // filter by logged in bumdes
                            if (p.UnitUsaha && p.UnitUsaha.length > 0) {
                                p.UnitUsaha.forEach(u => {
                                    units.push({
                                        id: u.ID,
                                        nama: u.NamaUnitUsaha,
                                        bumdes: p.NamaBUMDes
                                    });
                                });
                            }
                        });
                    }

                    let csvRows = [];
                    // Row 0 - Headers
                    csvRows.push(["Kode Pelanggan", "Nama Pelanggan", "No Telepon (Format Text)", "Alamat", "Unit Usaha ID", "Status", "Saldo Awal", "Bk Pembantu Piutang (true/false)", "Link Akun", "", "REFERENSI ID UNIT", "NAMA UNIT USAHA", "PROFILE BUMDES"].join(";"));
                    
                    // Base template data (we can make it max between template rows and unit reference rows)
                    const templateData = [
                        ["", "Alif Khaidar", '="628123456701"', "Dsn Pasar Baru, Ngunut", "1", "Aktif", "100000", "true", "1-1310 Piutang Usaha"],
                        ["", "Siti Rahmawati", '="628123456702"', "Dsn Krajan, Ngunut", "2", "Aktif", "50000", "true", "1-1310 Piutang Usaha"]
                    ];

                    const maxRows = Math.max(templateData.length, units.length);
                    for (let i = 0; i < maxRows; i++) {
                        let row = [];
                        
                        // Default template part (Columns A to I)
                        if (i < templateData.length) {
                            row.push(...templateData[i]);
                        } else {
                            row.push("", "", "", "", "", "", "", "", "");
                        }

                        // Column J (Spacing)
                        row.push("");

                        // Column K, L, M (Referensi Unit)
                        if (i < units.length) {
                            // Escape commas in names to prevent CSV breakage
                            let unitName = units[i].nama ? `"${units[i].nama.replace(/"/g, '""')}"` : "";
                            let bumdesName = units[i].bumdes ? `"${units[i].bumdes.replace(/"/g, '""')}"` : "";
                            row.push(units[i].id, unitName, bumdesName);
                        } else {
                            row.push("", "", "");
                        }

                        csvRows.push(row.join(";"));
                    }

                    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "Template_Import_Pelanggan.csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    showToast('Template Import berhasil diunduh beserta Referensi Unit.', false);
                })
                .catch(err => {
                    console.error("Failed to generate template", err);
                    showToast('Gagal memuat template. Terjadi masalah jaringan.', true);
                })
                .finally(() => {
                    btnDownloadTemplate.innerHTML = originalText;
                    btnDownloadTemplate.disabled = false;
                });
        });
    }

    const btnImportCsv = document.getElementById('btn-import-csv');
    const importCsvInput = document.getElementById('import-csv-input');
    
    if(btnImportCsv && importCsvInput) {
        btnImportCsv.addEventListener('click', () => {
            importCsvInput.click();
        });
        
        importCsvInput.addEventListener('change', (e) => {
            if(!e.target.files.length) return;
            const file = e.target.files[0];
            
            const formData = new FormData();
            formData.append('file', file);
            
            showToast('Mengimpor data...', false);
            
            const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
            fetch('/api/pelanggan/import?session_slug=' + sessionSlug, {
                method: 'POST',
                body: formData
            })
            .then(res => {
                if (res.ok) {
                    res.text().then(msg => {
                        showToast(msg + ' ✅');
                        loadPelanggan(); // Reload the table
                    });
                } else {
                    res.text().then(t => showToast('Gagal import: ' + t, true));
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Kesalahan jaringan saat import.', true);
            })
            .finally(() => {
                importCsvInput.value = ''; // Reset input to allow selecting the same file again
            });
        });
    }

    const btnDownloadTemplateSupplier = document.getElementById('btn-download-template-supplier');
    if(btnDownloadTemplateSupplier) {
        btnDownloadTemplateSupplier.addEventListener('click', (e) => {
            e.preventDefault();
            
            const originalText = btnDownloadTemplateSupplier.innerHTML;
            btnDownloadTemplateSupplier.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan...';
            btnDownloadTemplateSupplier.disabled = true;

            fetch('/api/profiles')
                .then(res => res.json())
                .then(profiles => {
                    const loggedProfileId = localStorage.getItem('sibumdes_profile_id');
                    let units = [];
                    
                    if (profiles && profiles.length > 0) {
                        profiles.forEach(p => {
                            if (loggedProfileId && p.ID != loggedProfileId) return;
                            if (p.UnitUsaha && p.UnitUsaha.length > 0) {
                                p.UnitUsaha.forEach(u => {
                                    units.push({
                                        id: u.ID,
                                        nama: u.NamaUnitUsaha,
                                        bumdes: p.NamaBUMDes
                                    });
                                });
                            }
                        });
                    }

                    let csvRows = [];
                    csvRows.push(["Kode Supplier", "Nama Supplier", "No Telepon (Format Text)", "Alamat", "Unit Usaha ID", "Bidang Supply", "Status", "Saldo Awal", "Bk Pembantu Utang (true/false)", "Link Akun", "", "REFERENSI ID UNIT", "NAMA UNIT USAHA", "PROFILE BUMDES"].join(";"));
                    
                    const templateData = [
                        ["", "CV Pakan Unggul Nusantara", '=\"628113456701\"', "Kediri", "1", "Pakan Ternak", "Aktif", "110000", "true", "2-0100 Utang Usaha"],
                        ["", "PT Sentra Bibit Ayam", '=\"628113456702\"', "Blitar", "2", "Bibit Ayam", "Aktif", "120000", "true", "2-0100 Utang Usaha"]
                    ];

                    const maxRows = Math.max(templateData.length, units.length);
                    for (let i = 0; i < maxRows; i++) {
                        let row = [];
                        
                        if (i < templateData.length) {
                            row.push(...templateData[i]);
                        } else {
                            row.push("", "", "", "", "", "", "", "", "", "");
                        }

                        row.push("");

                        if (i < units.length) {
                            let unitName = units[i].nama ? `"${units[i].nama.replace(/"/g, '""')}"` : "";
                            let bumdesName = units[i].bumdes ? `"${units[i].bumdes.replace(/"/g, '""')}"` : "";
                            row.push(units[i].id, unitName, bumdesName);
                        } else {
                            row.push("", "", "");
                        }

                        csvRows.push(row.join(";"));
                    }

                    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "Template_Import_Supplier.csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    showToast('Template Import berhasil diunduh beserta Referensi Unit.', false);
                })
                .catch(err => {
                    console.error("Failed to generate template", err);
                    showToast('Gagal memuat template. Terjadi masalah jaringan.', true);
                })
                .finally(() => {
                    btnDownloadTemplateSupplier.innerHTML = originalText;
                    btnDownloadTemplateSupplier.disabled = false;
                });
        });
    }

    const btnImportCsvSupplier = document.getElementById('btn-import-csv-supplier');
    const importCsvInputSupplier = document.getElementById('import-csv-input-supplier');
    
    if(btnImportCsvSupplier && importCsvInputSupplier) {
        btnImportCsvSupplier.addEventListener('click', () => {
            importCsvInputSupplier.click();
        });
        
        importCsvInputSupplier.addEventListener('change', (e) => {
            if(!e.target.files.length) return;
            const file = e.target.files[0];
            
            const formData = new FormData();
            formData.append('file', file);
            
            showToast('Mengimpor data...', false);
            
            const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
            fetch('/api/supplier/import?session_slug=' + sessionSlug, {
                method: 'POST',
                body: formData
            })
            .then(res => {
                if (res.ok) {
                    res.text().then(msg => {
                        showToast(msg + ' ✅');
                        loadSupplier(); // Reload the table
                    });
                } else {
                    res.text().then(t => showToast('Gagal import: ' + t, true));
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Kesalahan jaringan saat import.', true);
            })
            .finally(() => {
                importCsvInputSupplier.value = '';
            });
        });
    }

    const btnDownloadTemplateBarang = document.getElementById('btn-download-template-barang');
    if(btnDownloadTemplateBarang) {
        btnDownloadTemplateBarang.addEventListener('click', (e) => {
            e.preventDefault();
            
            const originalText = btnDownloadTemplateBarang.innerHTML;
            btnDownloadTemplateBarang.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan...';
            btnDownloadTemplateBarang.disabled = true;

            fetch('/api/profiles')
                .then(res => res.json())
                .then(profiles => {
                    const loggedProfileId = localStorage.getItem('sibumdes_profile_id');
                    let units = [];
                    
                    if (profiles && profiles.length > 0) {
                        profiles.forEach(p => {
                            if (loggedProfileId && p.ID != loggedProfileId) return;
                            if (p.UnitUsaha && p.UnitUsaha.length > 0) {
                                p.UnitUsaha.forEach(u => {
                                    units.push({
                                        id: u.ID,
                                        nama: u.NamaUnitUsaha,
                                        bumdes: p.NamaBUMDes
                                    });
                                });
                            }
                        });
                    }

                    let csvRows = [];
                    csvRows.push(["Kode Barang", "Nama Barang", "Merk Barang", "Harga Beli Awal", "Harga Jual", "Satuan", "Saldo Awal Qty", "Saldo Awal Nominal", "Status", "Kartu Persediaan (true/false)", "Link Akun", "Unit Usaha ID", "", "REFERENSI ID UNIT", "NAMA UNIT USAHA", "PROFILE BUMDES"].join(";"));
                    
                    const templateData = [
                        ["", "Telur Ayam Grade A", "BBS-01", "10000", "12500", "Kg", "10", "100000", "Aktif", "true", "1-1420 Persediaan Barang Jadi; 5-1200 HPP Barang Jadi", "1"],
                        ["", "Telur Ayam Grade B", "BBS-02", "8500", "10500", "Kg", "10", "85000", "Aktif", "true", "1-1420 Persediaan Barang Jadi; 5-1200 HPP Barang Jadi", "2"]
                    ];

                    const maxRows = Math.max(templateData.length, units.length);
                    for (let i = 0; i < maxRows; i++) {
                        let row = [];
                        
                        if (i < templateData.length) {
                            row.push(...templateData[i]);
                        } else {
                            row.push("", "", "", "", "", "", "", "", "", "", "", "");
                        }

                        row.push("");

                        if (i < units.length) {
                            let unitName = units[i].nama ? `"${units[i].nama.replace(/"/g, '""')}"` : "";
                            let bumdesName = units[i].bumdes ? `"${units[i].bumdes.replace(/"/g, '""')}"` : "";
                            row.push(units[i].id, unitName, bumdesName);
                        } else {
                            row.push("", "", "");
                        }

                        csvRows.push(row.join(";"));
                    }

                    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "Template_Import_Barang.csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    showToast('Template Import berhasil diunduh beserta Referensi Unit.', false);
                })
                .catch(err => {
                    console.error("Failed to generate template", err);
                    showToast('Gagal memuat template. Terjadi masalah jaringan.', true);
                })
                .finally(() => {
                    btnDownloadTemplateBarang.innerHTML = originalText;
                    btnDownloadTemplateBarang.disabled = false;
                });
        });
    }

    const btnImportCsvBarang = document.getElementById('btn-import-csv-barang');
    const importCsvInputBarang = document.getElementById('import-csv-input-barang');
    
    if(btnImportCsvBarang && importCsvInputBarang) {
        btnImportCsvBarang.addEventListener('click', () => {
            importCsvInputBarang.click();
        });
        
        importCsvInputBarang.addEventListener('change', (e) => {
            if(!e.target.files.length) return;
            const file = e.target.files[0];
            
            const formData = new FormData();
            formData.append('file', file);
            
            showToast('Mengimpor data...', false);
            
            const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
            fetch('/api/barang/import?session_slug=' + sessionSlug, {
                method: 'POST',
                body: formData
            })
            .then(res => {
                if (res.ok) {
                    res.text().then(msg => {
                        showToast(msg + ' ✅');
                        loadBarang(); // Reload the table
                    });
                } else {
                    res.text().then(t => showToast('Gagal import: ' + t, true));
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Kesalahan jaringan saat import.', true);
            })
            .finally(() => {
                importCsvInputBarang.value = '';
            });
        });
    }

    const btnDownloadTemplateInventaris = document.getElementById('btn-download-template-inventaris');
    if(btnDownloadTemplateInventaris) {
        btnDownloadTemplateInventaris.addEventListener('click', (e) => {
            e.preventDefault();

            const originalText = btnDownloadTemplateInventaris.innerHTML;
            btnDownloadTemplateInventaris.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan...';
            btnDownloadTemplateInventaris.disabled = true;

            fetch('/api/profiles')
                .then(res => res.json())
                .then(profiles => {
                    const loggedProfileId = localStorage.getItem('sibumdes_profile_id');
                    let units = [];

                    if (profiles && profiles.length > 0) {
                        profiles.forEach(p => {
                            if (loggedProfileId && p.ID != loggedProfileId) return;
                            if (p.UnitUsaha && p.UnitUsaha.length > 0) {
                                p.UnitUsaha.forEach(u => {
                                    units.push({
                                        id: u.ID,
                                        nama: u.NamaUnitUsaha,
                                        bumdes: p.NamaBUMDes
                                    });
                                });
                            }
                        });
                    }

                    let csvRows = [];
                    csvRows.push(["Kode Aset", "Nama Aset", "Merk Aset", "Kategori Aset", "Harga Perolehan", "Tanggal Beli (YYYY-MM-DD)", "Umur Ekonomis", "Nilai Residu", "Saldo Awal Per 1 Januari 2026", "Link Akun Aset Tetap", "Akumulasi Penyusutan Per 1 Januari 2026", "Link Akun Akumulasi Penyusutan", "Status", "Tanggal Digunakan (YYYY-MM-DD)", "Tanggal Status Tidak Aktif (YYYY-MM-DD)", "Kartu Aset Tetap (true/false)", "Unit Usaha ID", "", "REFERENSI ID UNIT", "NAMA UNIT USAHA", "PROFILE BUMDES"].join(";"));

                    const templateData = [
                        ["", "Kandang Ayam Petelur", "Bangunan PL", "Bangunan", "54000000", "2025-01-25", "20", "0", "54000000", "1-2020 Bangunan", "2475000", "1-2091 Akumulasi Penyusutan Bangunan", "Aktif", "2025-02-01", "", "true", "1"],
                        ["", "Mesin Pakan Otomatis", "FeedPro X2", "Mesin", "17000000", "2025-01-05", "8", "0", "17000000", "1-2040 Peralatan dan Mesin", "1947917", "1-2093 Akumulasi Penyusutan Peralatan dan Mesin", "Aktif", "2025-01-15", "", "true", "2"]
                    ];

                    const maxRows = Math.max(templateData.length, units.length);
                    for (let i = 0; i < maxRows; i++) {
                        let row = [];

                        if (i < templateData.length) {
                            row.push(...templateData[i]);
                        } else {
                            row.push("", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "");
                        }

                        row.push("");

                        if (i < units.length) {
                            let unitName = units[i].nama ? `"${units[i].nama.replace(/"/g, '""')}"` : "";
                            let bumdesName = units[i].bumdes ? `"${units[i].bumdes.replace(/"/g, '""')}"` : "";
                            row.push(units[i].id, unitName, bumdesName);
                        } else {
                            row.push("", "", "");
                        }

                        csvRows.push(row.join(";"));
                    }

                    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "Template_Import_Inventaris.csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    showToast('Template Import inventaris berhasil diunduh beserta referensi unit.', false);
                })
                .catch(err => {
                    console.error('Failed to generate inventaris template', err);
                    showToast('Gagal memuat template inventaris. Terjadi masalah jaringan.', true);
                })
                .finally(() => {
                    btnDownloadTemplateInventaris.innerHTML = originalText;
                    btnDownloadTemplateInventaris.disabled = false;
                });
        });
    }

    const btnImportCsvInventaris = document.getElementById('btn-import-csv-inventaris');
    const importCsvInputInventaris = document.getElementById('import-csv-input-inventaris');

    if(btnImportCsvInventaris && importCsvInputInventaris) {
        btnImportCsvInventaris.addEventListener('click', () => {
            importCsvInputInventaris.click();
        });

        importCsvInputInventaris.addEventListener('change', (e) => {
            if(!e.target.files.length) return;
            const file = e.target.files[0];

            const formData = new FormData();
            formData.append('file', file);

            showToast('Mengimpor data inventaris...', false);

            const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
            fetch('/api/inventaris/import?session_slug=' + sessionSlug, {
                method: 'POST',
                body: formData
            })
            .then(res => {
                if (res.ok) {
                    res.text().then(msg => {
                        showToast(msg + ' ✅');
                        loadInventaris();
                    });
                } else {
                    res.text().then(t => showToast('Gagal import inventaris: ' + t, true));
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Kesalahan jaringan saat import inventaris.', true);
            })
            .finally(() => {
                importCsvInputInventaris.value = '';
            });
        });
    }

    const btnAddUser = document.getElementById('btn-add-user');
    if(btnAddUser) {
        btnAddUser.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('/user/add');
        });
    }

    // --- Toast Notification Logic ---
    function showToast(message, isError = false) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${isError ? 'toast-error' : ''}`;
        toast.innerHTML = `<i class="fa-solid ${isError ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> <span>${message}</span>`;
        
        container.appendChild(toast);
        toast.offsetHeight;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    window.showToast = showToast;

    // --- Custom Confirm Modal Logic ---
    window.showConfirmModal = function(text, onConfirmCallback, options = {}) {
        const modal = document.getElementById('custom-confirm-modal');
        const textEl = document.getElementById('confirm-modal-text');
        const btnCancel = document.getElementById('confirm-btn-cancel');
        const btnOk = document.getElementById('confirm-btn-ok');

        if (!modal) return;

        const confirmText = (options && typeof options.confirmText === 'string' && options.confirmText.trim())
            ? options.confirmText.trim()
            : 'Ya, Hapus';
        const cancelText = (options && typeof options.cancelText === 'string' && options.cancelText.trim())
            ? options.cancelText.trim()
            : 'Batal';
        
        textEl.textContent = text;
        btnOk.textContent = confirmText;
        btnCancel.textContent = cancelText;
        modal.style.display = 'flex';

        const cleanup = () => {
            modal.style.display = 'none';
            btnCancel.removeEventListener('click', handleCancel);
            btnOk.removeEventListener('click', handleConfirm);
        };

        const handleCancel = () => cleanup();
        const handleConfirm = () => {
            cleanup();
            if(onConfirmCallback) onConfirmCallback();
        };

        btnCancel.addEventListener('click', handleCancel);
        btnOk.addEventListener('click', handleConfirm);
    };

    // --- Image Preview Logic ---
    window.showImageModal = function(src, e) {
        if(e) e.stopPropagation();
        const modal = document.getElementById('image-modal');
        const img = document.getElementById('image-modal-content');
        if(!modal || !img) return;
        
        img.src = src;
        modal.style.display = 'flex';

        const closeHandler = function() {
            modal.style.display = 'none';
            modal.removeEventListener('click', closeHandler);
        };
        modal.addEventListener('click', closeHandler);
    };

    const asetTetapInboxModal = document.getElementById('aset-tetap-inbox-modal');
    const asetTetapInboxCloseBtn = document.getElementById('aset-tetap-inbox-close');
    if (asetTetapInboxCloseBtn) {
        asetTetapInboxCloseBtn.addEventListener('click', closeAsetTetapInboxModal);
    }
    if (asetTetapInboxModal) {
        asetTetapInboxModal.addEventListener('click', (event) => {
            if (event.target === asetTetapInboxModal) {
                closeAsetTetapInboxModal();
            }
        });
    }

    // --- Dynamic Unit Usaha Logic ---
    if(btnAddUnit && unitUsahaList) {
        const bindUnitRemoveAction = (blockEl, unitId = 0) => {
            const removeBtn = blockEl.querySelector('.btn-remove-unit');
            if(!removeBtn) return;

            removeBtn.addEventListener('click', function() {
                const persistedUnitId = parseInt(unitId, 10) || 0;

                if (persistedUnitId > 0) {
                    window.showConfirmModal('Unit usaha ini akan dihapus permanen. Lanjutkan?', () => {
                        fetch('/api/unit-usaha?id=' + persistedUnitId, {
                            method: 'DELETE'
                        })
                        .then(res => {
                            if (!res.ok) {
                                return res.text().then(text => {
                                    throw new Error(text || 'Gagal menghapus unit usaha');
                                });
                            }
                            blockEl.remove();
                            showToast('Unit usaha berhasil dihapus.');
                        })
                        .catch(err => {
                            showToast('Gagal menghapus unit usaha: ' + err.message, true);
                        });
                    });
                    return;
                }

                blockEl.remove();
            });
        };

        btnAddUnit.addEventListener('click', () => {
            const newBlock = document.createElement('div');
            newBlock.className = 'form-grid unit-usaha-item';
            newBlock.style.position = 'relative';
            newBlock.style.marginBottom = '20px';
            newBlock.style.paddingBottom = '20px';
            newBlock.style.borderBottom = '1px dashed var(--border)';
            
            newBlock.innerHTML = `
                <button type="button" class="btn-remove-unit" style="position:absolute; right:0; top:-10px; background:none; border:none; color:#EF4444; font-size:1.2rem; cursor:pointer;" title="Hapus Unit"><i class="fa-solid fa-circle-xmark"></i></button>
                <input type="hidden" name="unit_usaha_id[]" value="">
                <div class="form-group">
                    <label>Nama Unit Usaha <span class="req">*</span></label>
                    <input type="text" name="nama_unit_usaha[]" required>
                </div>
                <div class="form-group">
                    <label>Bidang Usaha</label>
                    <input type="text" name="bidang_usaha[]">
                </div>
                <div class="form-group">
                    <label>Penanggung Jawab <span class="req">*</span></label>
                    <input type="text" name="penanggung_jawab[]" required>
                </div>
                <div class="form-group">
                    <label>Mata Uang</label>
                    <input type="text" name="mata_uang[]" value="Rp" readonly style="background-color:#eee;">
                </div>
                <div class="form-group">
                    <label>Tanggal Daftar <span class="req">*</span></label>
                    <input type="date" name="tanggal_daftar[]" required>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <input type="text" name="status_unit[]" value="Aktif">
                </div>
            `;

            bindUnitRemoveAction(newBlock);

            unitUsahaList.appendChild(newBlock);
        });

        window.bindUnitRemoveAction = bindUnitRemoveAction;
    }

    // Helper: Get today's date in YYYY-MM-DD format
    function getToday() {
        return new Date().toISOString().split('T')[0];
    }

    function isOperatorDataTransaksiRole() {
        const roleName = String(localStorage.getItem('sibumdes_role_name') || '').trim().toLowerCase();
        return roleName === 'operator data transaksi';
    }

    function normalizeTransaksiValidasiLabel(value) {
        return String(value || '').trim().toLowerCase() === 'sudah' ? 'Sudah' : 'Belum';
    }

    function getTransaksiValidasiPillStyles(label) {
        const normalizedLabel = normalizeTransaksiValidasiLabel(label);
        return normalizedLabel === 'Sudah'
            ? { background: '#d1fae5', color: '#065f46' }
            : { background: '#fef3c7', color: '#92400e' };
    }

    function updateTransaksiValidasiButtons(id, label) {
        const normalizedLabel = normalizeTransaksiValidasiLabel(label);
        const styles = getTransaksiValidasiPillStyles(normalizedLabel);
        const selector = `button[data-role="transaksi-validasi-toggle"][data-transaksi-id="${String(id)}"]`;
        document.querySelectorAll(selector).forEach((button) => {
            button.textContent = normalizedLabel;
            button.style.background = styles.background;
            button.style.color = styles.color;
            button.dataset.validasi = normalizedLabel;
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
        });
    }

    function updateTransaksiValidasiState(id, label) {
        const normalizedLabel = normalizeTransaksiValidasiLabel(label);
        transaksiDataViewState.items = (transaksiDataViewState.items || []).map((item) => {
            if (Number(item.id) !== Number(id)) {
                return item;
            }
            return {
                ...item,
                validasi: normalizedLabel,
            };
        });
        transaksiHistoryState.items = (transaksiHistoryState.items || []).map((item) => {
            if (Number(item.id) !== Number(id)) {
                return item;
            }
            return {
                ...item,
                validasi: normalizedLabel,
            };
        });
    }

    function findTransaksiRecordById(id) {
        const numericId = Number(id);
        return (transaksiDataViewState.items || []).find((item) => Number(item.id) === numericId)
            || (transaksiHistoryState.items || []).find((item) => Number(item.id) === numericId)
            || null;
    }

    function mergeUpdatedTransaksiRecord(existing, payload) {
        return {
            ...existing,
            tanggal: payload.tanggal,
            nama_pelanggan_pemasok: payload.nama_pelanggan_pemasok,
            alamat: payload.alamat,
            no_telepon: payload.no_telepon,
            keterangan: payload.keterangan,
            deskripsi: payload.deskripsi,
            mapping_slug: payload.mapping_slug,
            mapping_jenis: payload.mapping_jenis,
            akun_debet: payload.akun_debet,
            akun_kredit: payload.akun_kredit,
            validasi: normalizeTransaksiValidasiLabel(payload.validasi),
            nominal: Number(payload.nominal || 0),
            tipe_kas: payload.tipe_kas,
            status_bayar: payload.status_bayar,
            partner_type: payload.partner_type,
        };
    }

    function applyUpdatedTransaksiRecord(updatedTx) {
        transaksiDataViewState.items = (transaksiDataViewState.items || []).map((item) =>
            Number(item.id) === Number(updatedTx.id) ? updatedTx : item
        );
        transaksiHistoryState.items = (transaksiHistoryState.items || []).map((item) =>
            Number(item.id) === Number(updatedTx.id) ? updatedTx : item
        );
        updateAsetTetapInboxFromState();
    }

    function rerenderLocalTransaksiViews() {
        const dataContainer = document.getElementById('transaksi-table-container');
        if (dataContainer) {
            renderTransaksiDataTable(getFilteredTransaksiDataViewItems());
        }

        const historyContainer = document.getElementById('transaksi-history-table-container');
        if (historyContainer) {
            renderTransaksiHistoryTable(transaksiHistoryState.items || []);
        }
    }

    function buildTransaksiUpdatePayload(tx, overrides = {}) {
        const basePayload = {
            tanggal: tx && tx.tanggal ? String(tx.tanggal).split('T')[0] : '',
            nama_pelanggan_pemasok: tx && tx.nama_pelanggan_pemasok ? tx.nama_pelanggan_pemasok : '',
            alamat: tx && tx.alamat ? tx.alamat : '',
            no_telepon: tx && tx.no_telepon ? tx.no_telepon : '',
            keterangan: tx && tx.keterangan ? tx.keterangan : '',
            deskripsi: tx && tx.deskripsi ? tx.deskripsi : '',
            mapping_slug: tx && tx.mapping_slug ? tx.mapping_slug : '',
            mapping_jenis: tx && tx.mapping_jenis ? tx.mapping_jenis : '',
            akun_debet: tx && tx.akun_debet ? tx.akun_debet : '',
            akun_kredit: tx && tx.akun_kredit ? tx.akun_kredit : '',
            validasi: normalizeTransaksiValidasiLabel(tx && tx.validasi ? tx.validasi : 'Belum'),
            nominal: tx && tx.nominal ? Number(tx.nominal) : 0,
            tipe_kas: tx && tx.tipe_kas ? tx.tipe_kas : '',
            status_bayar: tx && tx.status_bayar ? tx.status_bayar : 'tunai',
            partner_type: tx && tx.partner_type === 'supplier' ? 'supplier' : 'pelanggan',
        };

        return {
            ...basePayload,
            ...overrides,
        };
    }

    // --- Dynamic Transaksi Row Logic ---
    let transaksiMappingCache = null;
    const transaksiAIMappingCache = new Map();

    function normalizeTransaksiMappingKey(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[._\-/]+/g, ' ')
            .trim();
    }

    function mapCashInOutToTipeKas(value) {
        const normalizedValue = String(value || '').trim().toLowerCase();
        if (normalizedValue === 'kas_keluar') {
            return 'kurang';
        }
        if (normalizedValue === 'kas_masuk') {
            return 'tambah';
        }
        return '';
    }

    function buildTransaksiMappingReferenceKey(mapping) {
        return [
            mapping.namaKey || '',
            mapping.unitUsahaKey || '',
            mapping.tipeKas || '',
            mapping.tipeDefaultKey || '',
            normalizeTransaksiMappingKey(mapping.akun_debet || ''),
            normalizeTransaksiMappingKey(mapping.akun_kredit || ''),
        ].join('|');
    }

    function getTransaksiAISuggestionCacheKey(keterangan, unitUsahaID) {
        return [
            normalizeTransaksiMappingKey(keterangan || ''),
            String(unitUsahaID || '').trim(),
        ].join('|');
    }

    async function fetchTransaksiAISuggestion(keterangan, unitUsahaID) {
        const normalizedKeterangan = String(keterangan || '').trim();
        if (!normalizedKeterangan || normalizedKeterangan === '-') {
            return null;
        }

        const cacheKey = getTransaksiAISuggestionCacheKey(normalizedKeterangan, unitUsahaID);
        if (transaksiAIMappingCache.has(cacheKey)) {
            return transaksiAIMappingCache.get(cacheKey);
        }

        const response = await fetch('/api/ai/suggest-transaksi', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                keterangan: normalizedKeterangan,
                session_slug: localStorage.getItem('sibumdes_auth') || '',
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        transaksiAIMappingCache.set(cacheKey, result || null);
        return result || null;
    }

    async function fetchTransaksiMappingReferences() {
        if (Array.isArray(transaksiMappingCache)) {
            return transaksiMappingCache;
        }

        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        const timestamp = String(new Date().getTime());
        const kinds = ['harian', 'non_rutin', 'umum', 'jurnal'];
        const responses = await Promise.all(kinds.map(async (kind) => {
            const res = await fetch('/api/mapping-transaksis?session_slug=' + sessionSlug + '&jenis_mapping=' + kind + '&t=' + timestamp);
            if (!res.ok) {
                throw new Error('Gagal memuat referensi mapping transaksi');
            }
            const items = await res.json();
            return (items || []).map((item) => ({
                ...item,
                jenis_mapping: item && item.jenis_mapping ? item.jenis_mapping : kind,
            }));
        }));

        const normalizedMappings = responses
            .flatMap((items) => items || [])
            .map((item) => ({
                ...item,
                namaKey: normalizeTransaksiMappingKey(item.nama_mapping || ''),
                tipeKas: mapCashInOutToTipeKas(item.cash_in_out),
                tipeDefaultKey: normalizeTransaksiMappingKey(item.tipe_default || 'semua'),
                unitUsahaKey: item.unit_usaha_id ? String(item.unit_usaha_id) : '',
            }));

        transaksiMappingCache = normalizedMappings;
        return transaksiMappingCache;
    }

    function getTransaksiMappingGroupLabel(jenisMapping) {
        const normalized = normalizeTransaksiMappingKey(jenisMapping || '');
        if (normalized === 'harian') return 'Mapping Harian';
        if (normalized === 'non rutin' || normalized === 'non_rutin') return 'Mapping Non Rutin';
        if (normalized === 'umum') return 'Mapping Lainnya';
        if (normalized === 'jurnal') return 'Mapping Jurnal';
        return 'Mapping Lainnya';
    }

    function getTransaksiMappingTheme(jenisMapping) {
        const normalized = normalizeTransaksiMappingKey(jenisMapping || '');

        if (normalized === 'harian') {
            return {
                headerBg: '#dbeafe',
                headerBorder: '#93c5fd',
                headerText: '#1d4ed8',
                itemBg: '#f8fbff',
                selectedBg: '#dbeafe',
                suggestedBg: '#eff6ff',
            };
        }

        if (normalized === 'non rutin' || normalized === 'non_rutin') {
            return {
                headerBg: '#dcfce7',
                headerBorder: '#86efac',
                headerText: '#15803d',
                itemBg: '#f7fef9',
                selectedBg: '#dcfce7',
                suggestedBg: '#ecfdf3',
            };
        }

        if (normalized === 'jurnal') {
            return {
                headerBg: '#f3e8ff',
                headerBorder: '#d8b4fe',
                headerText: '#7e22ce',
                itemBg: '#fcf7ff',
                selectedBg: '#f3e8ff',
                suggestedBg: '#faf5ff',
            };
        }

        return {
            headerBg: '#fef3c7',
            headerBorder: '#fcd34d',
            headerText: '#b45309',
            itemBg: '#fffdf5',
            selectedBg: '#fef3c7',
            suggestedBg: '#fffbeb',
        };
    }

    function getTransaksiMappingDescriptionLabel(mapping) {
        const description = String(mapping && mapping.keterangan || '').trim();
        if (description) return description;
        const name = String(mapping && mapping.nama_mapping || '').trim();
        return name || '-';
    }

    function getTransaksiMappingSelectedMetaLabel(mapping) {
        if (!mapping) return 'Belum ada mapping yang dipilih';
        return `Terpilih dari ${getTransaksiMappingGroupLabel(mapping.jenis_mapping || '')}`;
    }

    function getTransaksiMappingOrderIndex(jenisMapping) {
        const order = ['harian', 'non rutin', 'umum', 'jurnal'];
        const normalized = normalizeTransaksiMappingKey(jenisMapping || '');
        const index = order.indexOf(normalized);
        return index === -1 ? order.length : index;
    }

    function sortTransaksiMappingsForPicker(mappings) {
        return (mappings || []).slice().sort((left, right) => {
            const leftKind = normalizeTransaksiMappingKey(left && left.jenis_mapping || '');
            const rightKind = normalizeTransaksiMappingKey(right && right.jenis_mapping || '');
            const leftIndex = getTransaksiMappingOrderIndex(leftKind);
            const rightIndex = getTransaksiMappingOrderIndex(rightKind);
            if (leftIndex !== rightIndex) {
                return leftIndex - rightIndex;
            }

            return String(left && left.nama_mapping || '').localeCompare(String(right && right.nama_mapping || ''), 'id');
        });
    }

    function renderTransaksiMappingSelectOptions(selectEl, mappings) {
        if (!selectEl) return;

        const sortedMappings = sortTransaksiMappingsForPicker(mappings);
        selectEl.innerHTML = '';

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '-';
        selectEl.appendChild(placeholder);

        let currentGroup = '';
        sortedMappings.forEach((mapping) => {
            const groupKey = normalizeTransaksiMappingKey(mapping && mapping.jenis_mapping || '');
            if (groupKey !== currentGroup) {
                currentGroup = groupKey;
                const separator = document.createElement('option');
                separator.value = '';
                separator.textContent = `----- ${getTransaksiMappingGroupLabel(groupKey)} -----`;
                separator.disabled = true;
                selectEl.appendChild(separator);
            }

            const option = document.createElement('option');
            option.value = mapping.slug || mapping.nama_mapping || '';
            option.textContent = mapping.nama_mapping || '-';
            selectEl.appendChild(option);
        });
    }

    function filterTransaksiMappingsBySearch(mappings, query) {
        const normalizedQuery = normalizeTransaksiMappingKey(query || '');
        const baseMappings = Array.isArray(mappings) ? mappings.slice() : [];
        if (!normalizedQuery) {
            return baseMappings;
        }

        const scoredMappings = baseMappings.map((mapping, index) => {
            const haystack = normalizeTransaksiMappingKey([
                mapping && mapping.nama_mapping,
                mapping && mapping.keterangan,
                mapping && mapping.akun_debet,
                mapping && mapping.akun_kredit,
                getTransaksiMappingGroupLabel(mapping && mapping.jenis_mapping),
            ].filter(Boolean).join(' '));

            let score = 0;
            if (haystack.includes(normalizedQuery)) {
                score += 100;
            }
            if (normalizeTransaksiMappingKey(mapping && mapping.nama_mapping || '').includes(normalizedQuery)) {
                score += 80;
            }
            if (normalizeTransaksiMappingKey(mapping && mapping.keterangan || '').includes(normalizedQuery)) {
                score += 40;
            }

            return { mapping, score, index };
        });

        return scoredMappings
            .sort((left, right) => {
                const leftOrder = getTransaksiMappingOrderIndex(left.mapping && left.mapping.jenis_mapping || '');
                const rightOrder = getTransaksiMappingOrderIndex(right.mapping && right.mapping.jenis_mapping || '');
                if (leftOrder !== rightOrder) {
                    return leftOrder - rightOrder;
                }

                return right.score - left.score || left.index - right.index;
            })
            .map((item) => item.mapping);
    }

    function prioritizeTransaksiVisibleMappings(mappings, semanticCandidates) {
        const orderedMappings = Array.isArray(mappings) ? mappings.slice() : [];
        const semanticList = Array.isArray(semanticCandidates) ? semanticCandidates : [];
        if (!semanticList.length) {
            return orderedMappings;
        }

        const semanticBySlug = new Map();
        semanticList.forEach((candidate) => {
            const slug = String(candidate && candidate.slug || '').trim();
            if (!slug || semanticBySlug.has(slug)) return;
            semanticBySlug.set(slug, candidate);
        });

        const prioritized = [];
        semanticBySlug.forEach((candidate) => {
            prioritized.push(candidate);
        });

        orderedMappings.forEach((mapping) => {
            const slug = String(mapping && mapping.slug || '').trim();
            if (slug && semanticBySlug.has(slug)) {
                return;
            }
            prioritized.push(mapping);
        });

        return prioritized;
    }

    function focusSuggestedTransaksiMappingInDropdown(mainRow, dropdownEl) {
        if (!mainRow || !dropdownEl) return;

        const focusSlug = String(mainRow.dataset.suggestedMappingSlug || mainRow.dataset.selectedMappingSlug || '').trim();
        if (!focusSlug) return;

        const suggestedButton = dropdownEl.querySelector(`button[data-value="${CSS.escape(focusSlug)}"]`);
        if (!suggestedButton) return;

        requestAnimationFrame(() => {
            dropdownEl.scrollTop = Math.max(0, suggestedButton.offsetTop - 8);
        });
    }

    function captureTransaksiEditScrollState(mainRow) {
        if (!mainRow) return [];

        const scrollTargets = [];
        const modalTableWrap = mainRow.closest('.transaksi-edit-modal-table-wrap');
        const modalOverlay = mainRow.closest('.transaksi-edit-modal-overlay');

        if (modalTableWrap) {
            scrollTargets.push({ element: modalTableWrap, top: modalTableWrap.scrollTop, left: modalTableWrap.scrollLeft });
        }
        if (modalOverlay) {
            scrollTargets.push({ element: modalOverlay, top: modalOverlay.scrollTop, left: modalOverlay.scrollLeft });
        }

        return scrollTargets;
    }

    function restoreTransaksiEditScrollState(scrollTargets) {
        if (!Array.isArray(scrollTargets) || scrollTargets.length === 0) return;

        requestAnimationFrame(() => {
            scrollTargets.forEach((target) => {
                if (!target || !target.element) return;
                target.element.scrollTop = target.top || 0;
                target.element.scrollLeft = target.left || 0;
            });
        });
    }

    function renderTransaksiMappingAutocompleteDropdown(mainRow, filteredCandidates) {
        const detailRow = getDetailRowForMainRow(mainRow);
        if (!detailRow) return;

        const scrollTargets = captureTransaksiEditScrollState(mainRow);

        const dropdownEl = detailRow.querySelector('[data-field="mapping-dropdown"]');
        const inputEl = detailRow.querySelector('[data-field="mapping-search"]');
        if (!dropdownEl || !inputEl) return;

        if (!filteredCandidates.length) {
            dropdownEl.innerHTML = '<div style="padding:12px 14px; color:var(--text-secondary);">Tidak ada mapping yang cocok.</div>';
            dropdownEl.style.display = 'block';
            restoreTransaksiEditScrollState(scrollTargets);
            return;
        }

        const selectedSlug = String(mainRow.dataset.selectedMappingSlug || '').trim();
        const suggestedSlug = String(mainRow.dataset.suggestedMappingSlug || '').trim();
        const normalizedSearchQuery = normalizeTransaksiMappingKey(inputEl.value || '');
        const firstSearchMatchSlug = normalizedSearchQuery
            ? String((filteredCandidates.find((candidate) => {
                const haystack = normalizeTransaksiMappingKey([
                    candidate && candidate.nama_mapping,
                    candidate && candidate.keterangan,
                    candidate && candidate.akun_debet,
                    candidate && candidate.akun_kredit,
                    getTransaksiMappingGroupLabel(candidate && candidate.jenis_mapping),
                ].filter(Boolean).join(' '));

                return haystack.includes(normalizedSearchQuery);
            }) || {}).slug || '').trim()
            : '';
        let currentGroup = '';
        dropdownEl.innerHTML = filteredCandidates.map((candidate) => {
            const groupKey = normalizeTransaksiMappingKey(candidate && candidate.jenis_mapping || '');
            const theme = getTransaksiMappingTheme(groupKey);
            const slug = String(candidate && candidate.slug || '').trim();
            const label = String(candidate && candidate.nama_mapping || '-').trim() || '-';
            const isSelected = selectedSlug && slug === selectedSlug;
            const isSuggested = !isSelected && suggestedSlug && slug === suggestedSlug;
            const isSearchHighlighted = !isSelected && !isSuggested && firstSearchMatchSlug && slug === firstSearchMatchSlug;
            const groupHeader = groupKey !== currentGroup
                ? `<div style="padding:8px 14px; font-size:12px; font-weight:700; color:${theme.headerText}; background:${theme.headerBg}; border-top:${currentGroup ? `1px solid ${theme.headerBorder}` : 'none'}; border-bottom:1px solid ${theme.headerBorder};">${escapeHTML(getTransaksiMappingGroupLabel(groupKey))}</div>`
                : '';

            currentGroup = groupKey;

            let buttonBackground = theme.itemBg;
            if (isSelected) {
                buttonBackground = theme.selectedBg;
            } else if (isSuggested) {
                buttonBackground = theme.suggestedBg;
            }

            const buttonClasses = ['transaksi-mapping-option'];
            if (isSelected) {
                buttonClasses.push('is-selected');
            }
            if (isSuggested) {
                buttonClasses.push('is-ai-highlight');
            }
            if (isSearchHighlighted) {
                buttonClasses.push('is-search-highlight');
            }

            const accentColor = isSuggested
                ? '#d62828'
                : (isSearchHighlighted ? '#ff5a1f' : theme.headerText);

            return `${groupHeader}<button type="button" class="${buttonClasses.join(' ')}" data-value="${escapeHTML(slug)}" data-suggested="${isSuggested ? 'true' : 'false'}" data-search-highlight="${isSearchHighlighted ? 'true' : 'false'}" style="display:block; width:100%; padding:10px 14px; text-align:left; border:none; border-bottom:1px solid rgba(15, 23, 42, 0.06); background:${buttonBackground}; --mapping-accent:${accentColor}; color:var(--text-primary); cursor:pointer;">${escapeHTML(label)}</button>`;
        }).join('');
        dropdownEl.style.display = 'block';
        restoreTransaksiEditScrollState(scrollTargets);
        focusSuggestedTransaksiMappingInDropdown(mainRow, dropdownEl);

    }

    function hideTransaksiMappingAutocompleteDropdown(mainRow) {
        const detailRow = getDetailRowForMainRow(mainRow);
        if (!detailRow) return;

        const dropdownEl = detailRow.querySelector('[data-field="mapping-dropdown"]');
        if (dropdownEl) {
            dropdownEl.style.display = 'none';
        }
    }

    function getTransaksiAILoadingElement(mainRow) {
        return mainRow ? mainRow.querySelector('[data-field="ai-loading"]') : null;
    }

    function setTransaksiAILoadingState(mainRow, isLoading) {
        const loadingEl = getTransaksiAILoadingElement(mainRow);
        if (!loadingEl) return;
        loadingEl.style.display = isLoading ? 'inline-flex' : 'none';
    }

    function syncTransaksiMappingSelectFromState(mainRow, preferredSlug = '', fallbackCandidate = null, query = null) {
        const detailRow = getDetailRowForMainRow(mainRow);
        if (!detailRow) return null;

        const selectEl = detailRow.querySelector('[data-field="mapping-select"]');
        const searchInput = detailRow.querySelector('[data-field="mapping-search"]');
        if (!selectEl) return null;

        const effectiveQuery = typeof query === 'string'
            ? query
            : (searchInput ? searchInput.value : '');

        const filteredCandidates = prioritizeTransaksiVisibleMappings(
            filterTransaksiMappingsBySearch(
                Array.isArray(mainRow._mappingCandidates) ? mainRow._mappingCandidates : [],
                effectiveQuery
            ),
            Array.isArray(mainRow._semanticMappingCandidates) ? mainRow._semanticMappingCandidates : []
        );

        const selectedSlug = String(preferredSlug || '').trim();
        if (selectedSlug && !filteredCandidates.some((candidate) => String(candidate && candidate.slug || '').trim() === selectedSlug)) {
            const selectedFromAllCandidates = (Array.isArray(mainRow._mappingCandidates) ? mainRow._mappingCandidates : [])
                .find((candidate) => String(candidate && candidate.slug || '').trim() === selectedSlug);
            if (selectedFromAllCandidates) {
                filteredCandidates.unshift(selectedFromAllCandidates);
            }
        }

        mainRow._visibleMappingCandidates = filteredCandidates;
        renderTransaksiMappingSelectOptions(selectEl, filteredCandidates);
        renderTransaksiMappingAutocompleteDropdown(mainRow, filteredCandidates);

        const selectedCandidate = preferredSlug
            ? (filteredCandidates.find((candidate) => candidate.slug === preferredSlug) || null)
            : (fallbackCandidate && filteredCandidates.some((candidate) => candidate.slug === fallbackCandidate.slug) ? fallbackCandidate : null);

        selectEl.value = selectedCandidate ? (selectedCandidate.slug || '') : '';
        if (searchInput && selectedCandidate && typeof query !== 'string') {
            searchInput.value = selectedCandidate.nama_mapping || '';
        }
        return selectedCandidate;
    }

    function getTransaksiUnitUsahaIdForRow(mainRow, unitUsahaIDOverride = null) {
        if (unitUsahaIDOverride !== null && unitUsahaIDOverride !== undefined) {
            return String(unitUsahaIDOverride || '').trim();
        }

        const unitUsahaSelect = document.getElementById('transaksi-unit-usaha');
        return String(mainRow && mainRow.dataset
            ? (mainRow.dataset.unitUsahaId || (unitUsahaSelect ? unitUsahaSelect.value : '') || '')
            : '')
            .trim();
    }

    function handleTransaksiMappingSearchInput(mainRow, query) {
        if (!mainRow) return;

        const normalizedQuery = normalizeTransaksiMappingKey(query || '');
        const currentSelectedCandidate = getSelectedTransaksiMappingCandidate(mainRow);
        const currentSelectedNameKey = normalizeTransaksiMappingKey(currentSelectedCandidate && currentSelectedCandidate.nama_mapping || '');
        const shouldKeepSelectedCandidate = normalizedQuery && normalizedQuery === currentSelectedNameKey;

        if (!shouldKeepSelectedCandidate && String(mainRow.dataset.selectedMappingSlug || '').trim()) {
            mainRow.dataset.selectedMappingSlug = '';
            mainRow.dataset.suggestedMappingSlug = '';
            mainRow.dataset.selectedMappingDetailIndex = '0';
        }

        const selectedCandidate = syncTransaksiMappingSelectFromState(
            mainRow,
            shouldKeepSelectedCandidate ? (currentSelectedCandidate && currentSelectedCandidate.slug ? currentSelectedCandidate.slug : '') : '',
            null,
            String(query || '')
        );
        renderTransaksiMappingAutocompleteDropdown(mainRow, Array.isArray(mainRow._visibleMappingCandidates) ? mainRow._visibleMappingCandidates : []);
        if (!selectedCandidate) {
            applySelectedTransaksiMapping(mainRow, null);
        }
    }

    function handleTransaksiMappingSearchFocus(mainRow, unitUsahaIDOverride = null) {
        if (!mainRow) return Promise.resolve();

        return refreshTransaksiMappingSuggestion(mainRow, getTransaksiUnitUsahaIdForRow(mainRow, unitUsahaIDOverride), null, true).then(() => {
            syncTransaksiMappingSelectFromState(mainRow, mainRow.dataset.selectedMappingSlug || '', null, '');
            renderTransaksiMappingAutocompleteDropdown(mainRow, Array.isArray(mainRow._visibleMappingCandidates) ? mainRow._visibleMappingCandidates : []);
        });
    }

    function handleTransaksiMappingSelectFocus(mainRow, unitUsahaIDOverride = null) {
        if (!mainRow) return Promise.resolve();
        return refreshTransaksiMappingSuggestion(mainRow, getTransaksiUnitUsahaIdForRow(mainRow, unitUsahaIDOverride), null, true);
    }

    function handleTransaksiMappingDropdownClick(mainRow, searchInput, slug) {
        if (!mainRow) return;

        const candidates = Array.isArray(mainRow._mappingCandidates) ? mainRow._mappingCandidates : [];
        const selected = candidates.find((candidate) => (candidate.slug || '') === slug) || null;
        if (searchInput) {
            searchInput.value = selected && selected.nama_mapping ? selected.nama_mapping : '';
        }
        if (selected) {
            mainRow.dataset.selectedMappingSlug = selected.slug || '';
            mainRow.dataset.suggestedMappingSlug = selected.slug || '';
        }
        syncTransaksiMappingSelectFromState(mainRow, selected ? (selected.slug || '') : '', selected);
        applySelectedTransaksiMapping(mainRow, selected);
        hideTransaksiMappingAutocompleteDropdown(mainRow);
    }

    function containsTransaksiKeyword(text, keywords) {
        return (keywords || []).some((keyword) => text.includes(keyword));
    }

    function buildTransaksiIntentProfile(keteranganKey) {
        const profile = {
            isSale: containsTransaksiKeyword(keteranganKey, ['jual', 'penjualan']),
            isPurchase: containsTransaksiKeyword(keteranganKey, ['beli', 'pembelian']),
            isFeedPurchase: containsTransaksiKeyword(keteranganKey, ['pakan'])
                && containsTransaksiKeyword(keteranganKey, ['ayam', 'layer', 'petelur']),
            isPayment: containsTransaksiKeyword(keteranganKey, ['bayar', 'pelunasan', 'lunas', 'setor']),
            isTaxPayment: containsTransaksiKeyword(keteranganKey, ['pajak']),
            isCapitalInjection: containsTransaksiKeyword(keteranganKey, ['tambahan modal', 'modal']),
            isLoanReceipt: containsTransaksiKeyword(keteranganKey, ['pinjaman', 'utang bank', 'kredit bank'])
                && !containsTransaksiKeyword(keteranganKey, ['bayar', 'cicilan', 'angsuran', 'bunga', 'pelunasan', 'lunas']),
            isProfitSharing: containsTransaksiKeyword(keteranganKey, ['bagi hasil']),
            isPayroll: containsTransaksiKeyword(keteranganKey, ['gaji', 'upah', 'honor', 'kasir', 'penjaga']),
            isCleaningExpense: containsTransaksiKeyword(keteranganKey, ['kebersihan', 'bersih bersih', 'cleaning'])
                && containsTransaksiKeyword(keteranganKey, ['bayar', 'biaya', 'jasa']),
            isUtility: containsTransaksiKeyword(keteranganKey, ['listrik', 'utilitas']),
            isSupplies: containsTransaksiKeyword(keteranganKey, ['plastik', 'kantong', 'belanja toko', 'kemasan', 'alat kebersihan', 'kebersihan toko', 'sapu', 'pel', 'lap', 'deterjen', 'pembersih', 'perlengkapan']),
            isOfficeSupplies: containsTransaksiKeyword(keteranganKey, ['nota', 'pulpen', 'pena', 'atk', 'alat tulis', 'kertas']),
            isSuppliesUsage: containsTransaksiKeyword(keteranganKey, ['pemakaian perlengkapan', 'perlengkapan terpakai'])
                || (keteranganKey.includes('perlengkapan') && keteranganKey.includes('periode')),
            isInventoryCreditPurchase: containsTransaksiKeyword(keteranganKey, ['beli', 'pembelian'])
                && containsTransaksiKeyword(keteranganKey, ['belum dibayar', 'belum bayar', 'kredit', 'hutang', 'utang']),
            isPayableSettlement: containsTransaksiKeyword(keteranganKey, ['pelunasan', 'lunas', 'bayar'])
                && containsTransaksiKeyword(keteranganKey, ['utang', 'hutang']),
            isUtilityAccrual: containsTransaksiKeyword(keteranganKey, ['listrik', 'utilitas'])
                && containsTransaksiKeyword(keteranganKey, ['belum dibayar', 'masih harus dibayar', 'akhir bulan']),
            isFixedAssetSale: containsTransaksiKeyword(keteranganKey, ['kandang lama', 'aset tetap'])
                && containsTransaksiKeyword(keteranganKey, ['jual', 'penjualan']),
            isProductionCostCapitalization: containsTransaksiKeyword(keteranganKey, ['biaya produksi']),
            isDepreciation: containsTransaksiKeyword(keteranganKey, ['penyusutan']),
            isBuildingAsset: containsTransaksiKeyword(keteranganKey, ['bangunan', 'kandang']),
            isStockDecrease: containsTransaksiKeyword(keteranganKey, ['selisih stok', 'stok berkurang', 'pecah', 'rusak']),
            isStockIncrease: containsTransaksiKeyword(keteranganKey, ['stok bertambah', 'selisih lebih', 'surplus']),
        };

        return profile;
    }

    function buildTransaksiMappingSemanticProfile(mapping) {
        const namaKey = mapping.namaKey || normalizeTransaksiMappingKey(mapping.nama_mapping || '');
        const akunDebetKey = normalizeTransaksiMappingKey(mapping.akun_debet || '');
        const akunKreditKey = normalizeTransaksiMappingKey(mapping.akun_kredit || '');
        const keteranganKey = normalizeTransaksiMappingKey(mapping.keterangan || '');

        const isPurchaseMapping = namaKey.includes('beli');
        const isPaymentMapping = namaKey.includes('bayar');
        const isSaleMapping = namaKey.includes('jual');

        return {
            namaKey,
            akunDebetKey,
            akunKreditKey,
            keteranganKey,
            isPurchaseMapping,
            isPaymentMapping,
            isSaleMapping,
            isPayrollMapping: namaKey.includes('gaji') || akunDebetKey.includes('beban pegawai'),
            isCapitalInjectionMapping: namaKey.includes('terima modal') || akunKreditKey.includes('penyertaan modal'),
            isLoanReceiptMapping: namaKey.includes('pinjaman bank')
                || namaKey.includes('terima pinjaman')
                || akunKreditKey.includes('utang bank jangka panjang')
                || akunKreditKey.includes('utang pihak ketiga jangka panjang'),
            isProfitSharingMapping: namaKey.includes('bagi hasil') || akunDebetKey.includes('bagi hasil'),
            isCleaningMapping: namaKey.includes('kebersihan') || akunDebetKey.includes('beban operasional minimarket'),
            isFeedPurchaseMapping: namaKey.includes('pakan ayam')
                || (akunDebetKey.includes('beban operasional peternakan ayam petelur') && namaKey.includes('beli pakan')),
            isTaxPaymentMapping: namaKey.includes('pajak')
                || akunDebetKey.includes('beban pajak')
                || akunKreditKey.includes('utang pajak'),
            isSuppliesMapping: namaKey.includes('perlengkapan') || akunDebetKey.includes('perlengkapan'),
            isOfficeSupplyMapping: namaKey.includes('atk') || akunDebetKey.includes('beban administrasi dan umum'),
            isSuppliesUsageMapping: namaKey.includes('perlengkapan yang sudah terpakai')
                || (akunDebetKey.includes('beban perlengkapan') && akunKreditKey.includes('perlengkapan')),
            isUtilityPaymentMapping: (namaKey.includes('listrik') && !namaKey.includes('masih harus dibayar'))
                || (akunDebetKey.includes('beban utilitas') && (akunKreditKey.includes('kas') || akunKreditKey.includes('bank'))),
            isUtilityAccrualMapping: namaKey.includes('masih harus dibayar')
                && (namaKey.includes('listrik') || akunKreditKey.includes('utang utilitas')),
            isInventoryPurchaseMapping: namaKey.includes('beli barang dagang') || akunDebetKey.includes('persediaan barang dagangan'),
            isCreditPurchaseMapping: namaKey.includes('belum dibayar')
                || (akunDebetKey.includes('persediaan barang dagangan') && akunKreditKey.includes('utang usaha')),
            isPayableSettlementMapping: namaKey.includes('bayar supplier') || akunDebetKey.includes('utang usaha'),
            isFixedAssetSaleMapping: namaKey.includes('kandang lama') || keteranganKey.includes('penjualan aset tetap'),
            isFixedAssetPurchaseMapping: isPurchaseMapping && (
                akunDebetKey.includes('meubelair')
                || akunDebetKey.includes('peralatan dan mesin')
                || akunDebetKey.includes('aset tetap')
                || namaKey.includes('rak toko baru')
                || namaKey.includes('mesin kasir')
            ),
            isProductionCostCapitalizationMapping: namaKey.includes('biaya produksi') && namaKey.includes('stok telur'),
            isDepreciationMapping: namaKey.includes('penyusutan aset tetap') || akunKreditKey.includes('akumulasi penyusutan'),
            isBuildingDepreciationMapping: (namaKey.includes('penyusutan aset tetap') || akunKreditKey.includes('akumulasi penyusutan'))
                && (namaKey.includes('bangunan') || namaKey.includes('kandang')),
            isStockDecreaseMapping: namaKey.includes('stok berkurang/rusak') || keteranganKey.includes('stok telur rusak'),
            isStockIncreaseMapping: namaKey.includes('stok bertambah') || (namaKey.includes('penyesuaian stok') && !namaKey.includes('berkurang')),
        };
    }

    function scoreTransaksiIntentProfile(intentProfile, mappingProfile) {
        let score = 0;

        if (intentProfile.isSale && mappingProfile.isSaleMapping) score += 25;
        if (intentProfile.isPurchase && mappingProfile.isPurchaseMapping) score += 20;
        if (intentProfile.isPayment && mappingProfile.isPaymentMapping) score += 20;

        if (intentProfile.isPayroll) {
            if (mappingProfile.isPayrollMapping) score += 135;
            if (mappingProfile.isPurchaseMapping) score -= 110;
        }

        if (intentProfile.isCapitalInjection) {
            if (mappingProfile.isCapitalInjectionMapping) score += 115;
        }

        if (intentProfile.isLoanReceipt) {
            if (mappingProfile.isLoanReceiptMapping) score += 165;
            if (mappingProfile.isCapitalInjectionMapping) score -= 85;
            if (mappingProfile.isPayableSettlementMapping || mappingProfile.isPaymentMapping) score -= 95;
        }

        if (intentProfile.isProfitSharing) {
            if (mappingProfile.isProfitSharingMapping) score += 125;
        }

        if (intentProfile.isCleaningExpense) {
            if (mappingProfile.isCleaningMapping) score += 135;
            if (mappingProfile.isPurchaseMapping) score -= 110;
        }

        if (intentProfile.isFeedPurchase) {
            if (mappingProfile.isFeedPurchaseMapping) score += 150;
            if (mappingProfile.isFixedAssetPurchaseMapping) score -= 135;
        }

        if (intentProfile.isTaxPayment) {
            if (mappingProfile.isTaxPaymentMapping) score += 155;
            if (mappingProfile.isUtilityPaymentMapping || mappingProfile.isCleaningMapping) score -= 90;
            if (mappingProfile.isFeedPurchaseMapping || mappingProfile.isInventoryPurchaseMapping) score -= 135;
        }

        if (intentProfile.isOfficeSupplies) {
            if (mappingProfile.isOfficeSupplyMapping) score += 145;
            if (mappingProfile.isSuppliesMapping) score -= 20;
            if (mappingProfile.isFixedAssetPurchaseMapping || mappingProfile.isInventoryPurchaseMapping) score -= 120;
        }

        if (intentProfile.isSupplies && !intentProfile.isOfficeSupplies) {
            if (mappingProfile.isSuppliesMapping) score += 130;
            if (mappingProfile.isInventoryPurchaseMapping) score -= 80;
            if (mappingProfile.isFixedAssetPurchaseMapping) score -= 120;
        }

        if (intentProfile.isSuppliesUsage) {
            if (mappingProfile.isSuppliesUsageMapping) score += 140;
            if (mappingProfile.isSuppliesMapping && !mappingProfile.isSuppliesUsageMapping) score -= 55;
            if (mappingProfile.isPaymentMapping) score -= 70;
        }

        if (intentProfile.isUtility && !intentProfile.isUtilityAccrual) {
            if (mappingProfile.isUtilityPaymentMapping) score += 120;
            if (mappingProfile.isUtilityAccrualMapping) score -= 90;
            if (mappingProfile.isPurchaseMapping) score -= 60;
        }

        if (intentProfile.isUtilityAccrual) {
            if (mappingProfile.isUtilityAccrualMapping) score += 135;
            if (mappingProfile.isUtilityPaymentMapping) score -= 100;
        }

        if (intentProfile.isInventoryCreditPurchase) {
            if (mappingProfile.isCreditPurchaseMapping) score += 135;
            if (mappingProfile.isInventoryPurchaseMapping && (mappingProfile.namaKey.includes('tunai') || mappingProfile.namaKey.includes('transfer'))) score -= 95;
        }

        if (intentProfile.isPayableSettlement) {
            if (mappingProfile.isPayableSettlementMapping) score += 135;
            if (mappingProfile.isPurchaseMapping) score -= 110;
        }

        if (intentProfile.isFixedAssetSale) {
            if (mappingProfile.isFixedAssetSaleMapping) score += 130;
        }

        if (intentProfile.isProductionCostCapitalization) {
            if (mappingProfile.isProductionCostCapitalizationMapping) score += 125;
        }

        if (intentProfile.isDepreciation) {
            if (mappingProfile.isDepreciationMapping) score += 125;
            if (intentProfile.isBuildingAsset && mappingProfile.isBuildingDepreciationMapping) score += 60;
            if (mappingProfile.isFixedAssetPurchaseMapping) score -= 110;
        }

        if (intentProfile.isStockDecrease && mappingProfile.isStockDecreaseMapping) score += 115;
        if (intentProfile.isStockIncrease && mappingProfile.isStockIncreaseMapping) score += 115;

        return score;
    }

    function extractTransaksiEggGradeKey(text) {
        const normalizedText = normalizeTransaksiMappingKey(text || '');
        if (/\bgrade\s*a\b/.test(normalizedText)) return 'grade a';
        if (/\bgrade\s*b\b/.test(normalizedText)) return 'grade b';
        return '';
    }

    function scoreTransaksiSurfaceProfile(keteranganKey, mapping, statusBayar) {
        let score = 0;
        const inputGradeKey = extractTransaksiEggGradeKey(keteranganKey);
        const mappingGradeKey = extractTransaksiEggGradeKey(mapping.namaKey);

        if (keteranganKey.includes(mapping.namaKey)) {
            score += 45;
        }
        if (inputGradeKey && mappingGradeKey) {
            if (inputGradeKey === mappingGradeKey) {
                score += 48;
            } else {
                score -= 42;
            }
        }
        if ((keteranganKey.includes('penjualan') || keteranganKey.includes('jual')) && mapping.namaKey.includes('jual')) {
            score += 35;
        }
        if (keteranganKey.includes('stok') && mapping.namaKey.includes('stok')) {
            score += 30;
        }
        if (statusBayar === 'tunai' && mapping.namaKey.includes('tunai')) {
            score += 18;
        }
        if (statusBayar === 'kredit' && mapping.namaKey.includes('kredit')) {
            score += 18;
        }
        if (/qris/.test(keteranganKey) && (mapping.namaKey.includes('transfer') || mapping.namaKey.includes('qris'))) {
            score += 95;
        }
        if (/qris/.test(keteranganKey) && mapping.namaKey.includes('tunai')) {
            score -= 55;
        }
        if (/(transfer|bank|bri|bni|mandiri)/.test(keteranganKey) && mapping.namaKey.includes('transfer')) {
            score += 18;
        }
        if (statusBayar === 'tunai' && mapping.namaKey.includes('transfer') && !/(transfer|bank|bri|bni|mandiri)/.test(keteranganKey)) {
            score -= 6;
        }
        if (statusBayar === 'tunai' && mapping.namaKey.includes('kredit')) {
            score -= 18;
        }
        if (statusBayar === 'kredit' && mapping.namaKey.includes('tunai')) {
            score -= 18;
        }
        if (!keteranganKey.includes('koreksi') && mapping.namaKey.includes('koreksi')) {
            score -= 30;
        }
        if (!keteranganKey.includes('perbaiki') && mapping.namaKey.includes('perbaiki')) {
            score -= 30;
        }
        if (!keteranganKey.includes('penyesuaian') && mapping.namaKey.includes('penyesuaian')) {
            score -= 30;
        }

        const tokens = keteranganKey.split(' ').filter((token) => token.length >= 3);
        tokens.forEach((token) => {
            if (mapping.namaKey.includes(token)) {
                score += 8;
            }
        });

        return score;
    }

    function scoreTransaksiMappingCandidate(mapping, options) {
        const keteranganKey = normalizeTransaksiMappingKey(options.keterangan || '');
        const statusBayar = normalizeTransaksiMappingKey(options.statusBayar || 'tunai');
        const tipeKas = normalizeTransaksiMappingKey(options.tipeKas || '');
        const unitUsahaID = options.unitUsahaID ? String(options.unitUsahaID) : '';
        const cashInOutKey = normalizeTransaksiMappingKey(mapping.cash_in_out || '');
        const isBiayaProduksiStokTelurCandidate = keteranganKey.includes('biaya produksi')
            && mapping.namaKey.includes('biaya produksi')
            && mapping.namaKey.includes('stok telur');

        if (unitUsahaID && mapping.unitUsahaKey && mapping.unitUsahaKey !== unitUsahaID) {
            return -1;
        }
        if (tipeKas && !mapping.tipeKas && cashInOutKey === 'non kas' && !isBiayaProduksiStokTelurCandidate) {
            return -1;
        }
        if (tipeKas && mapping.tipeKas && mapping.tipeKas !== tipeKas) {
            return -1;
        }
        if (mapping.tipeDefaultKey && mapping.tipeDefaultKey !== 'semua' && statusBayar && mapping.tipeDefaultKey !== statusBayar) {
            return -1;
        }

        let score = 0;

        if (keteranganKey) {
            const intentProfile = buildTransaksiIntentProfile(keteranganKey);
            const mappingProfile = buildTransaksiMappingSemanticProfile(mapping);
            score += scoreTransaksiIntentProfile(intentProfile, mappingProfile);
            score += scoreTransaksiSurfaceProfile(keteranganKey, mapping, statusBayar);
        }

        return score;
    }

    function findTransaksiMappingCandidates(mappings, options) {
        return (mappings || [])
            .map((mapping) => ({ mapping, score: scoreTransaksiMappingCandidate(mapping, options) }))
            .filter((item) => item.score > 0)
            .sort((left, right) => right.score - left.score || String(left.mapping.nama_mapping || '').localeCompare(String(right.mapping.nama_mapping || '')))
            .map((item) => item.mapping)
            .slice(0, 8);
    }
    function prioritizeTransaksiSemanticCandidates(candidates, aiMatchedCandidate) {
        const normalizedCandidates = Array.isArray(candidates) ? candidates.slice() : [];
        if (!aiMatchedCandidate || !aiMatchedCandidate.slug) {
            return normalizedCandidates;
        }

        const aiSlug = String(aiMatchedCandidate.slug || '').trim();
        const withoutAI = normalizedCandidates.filter((candidate) => String(candidate && candidate.slug || '').trim() !== aiSlug);
        return [aiMatchedCandidate, ...withoutAI];
    }

    function getTransaksiMappingDetailOptions(mapping) {
        if (!mapping) {
            return [{ akun_debet: '', akun_kredit: '' }];
        }

        if (Array.isArray(mapping.details) && mapping.details.length > 0) {
            return mapping.details.map((detail) => ({
                akun_debet: detail && detail.akun_debet ? detail.akun_debet : '',
                akun_kredit: detail && detail.akun_kredit ? detail.akun_kredit : '',
            }));
        }

        return [{
            akun_debet: mapping.akun_debet || '',
            akun_kredit: mapping.akun_kredit || '',
        }];
    }

    function getSelectedTransaksiAccountValues(mainRow) {
        const detailRow = getDetailRowForMainRow(mainRow);
        if (!detailRow) {
            return { akunDebet: '', akunKredit: '' };
        }

        const debitField = detailRow.querySelector('[data-field="akun-debet"]');
        const kreditField = detailRow.querySelector('[data-field="akun-kredit"]');
        const akunDebet = debitField
            ? String(debitField.tagName === 'SELECT'
                ? (debitField.selectedOptions && debitField.selectedOptions[0] ? debitField.selectedOptions[0].textContent : '')
                : (debitField.value || '')).trim()
            : '';
        const akunKredit = kreditField
            ? String(kreditField.tagName === 'SELECT'
                ? (kreditField.selectedOptions && kreditField.selectedOptions[0] ? kreditField.selectedOptions[0].textContent : '')
                : (kreditField.value || '')).trim()
            : '';
        return { akunDebet, akunKredit };
    }

    function getSelectedTransaksiMappingCandidate(mainRow) {
        if (!mainRow || !Array.isArray(mainRow._mappingCandidates)) return null;

        const detailRow = getDetailRowForMainRow(mainRow);
        const mappingSelect = detailRow ? detailRow.querySelector('[data-field="mapping-select"]') : null;
        const selectedSlug = String(
            (mainRow.dataset && mainRow.dataset.selectedMappingSlug) ||
            (mappingSelect ? mappingSelect.value : '') ||
            ''
        ).trim();

        if (!selectedSlug) {
            return null;
        }

        return mainRow._mappingCandidates.find((candidate) => String(candidate && candidate.slug || '').trim() === selectedSlug) || null;
    }

    function getSelectedTransaksiMappingIdentity(mainRow) {
        const selectedMapping = getSelectedTransaksiMappingCandidate(mainRow);
        return {
            mappingSlug: selectedMapping && selectedMapping.slug ? String(selectedMapping.slug).trim() : '',
            mappingJenis: selectedMapping && selectedMapping.jenis_mapping ? String(selectedMapping.jenis_mapping).trim() : '',
        };
    }

    function hasExplicitTransaksiMappingSelection(mainRow) {
        return !!getSelectedTransaksiMappingIdentity(mainRow).mappingSlug;
    }

    function resolveTransaksiDeskripsiForSubmit(mainRow, fallbackValue) {
        const selectedMapping = getSelectedTransaksiMappingCandidate(mainRow);
        if (selectedMapping && selectedMapping.nama_mapping) {
            return String(selectedMapping.nama_mapping).trim();
        }
        return String(fallbackValue || '').trim();
    }

    function inferNonKasTransaksiTipeKas(mapping) {
        if (!mapping) return '';

        const akunDebetKey = normalizeTransaksiMappingKey(mapping.akun_debet || '');
        const akunKreditKey = normalizeTransaksiMappingKey(mapping.akun_kredit || '');
        const mappingKey = normalizeTransaksiMappingKey([mapping.nama_mapping, mapping.keterangan, mapping.akun_debet, mapping.akun_kredit].filter(Boolean).join(' '));

        if (/stok berkurang|rusak|pecah|hilang/.test(mappingKey)) return 'kurang';
        if (/stok bertambah|selisih lebih|surplus/.test(mappingKey)) return 'tambah';
        if ((/hpp|beban|biaya/.test(akunDebetKey) && /persediaan/.test(akunKreditKey)) || /jurnal penyesuaian/.test(mappingKey)) return 'kurang';
        if ((/persediaan|piutang|aset/.test(akunDebetKey) && /beban|biaya|modal|pendapatan/.test(akunKreditKey)) || /terima|jual|pendapatan/.test(mappingKey)) return 'tambah';

        return 'kurang';
    }

    function resolveTransaksiTipeKasForSubmit(mainRow, explicitValue) {
        const normalizedValue = String(explicitValue || '').trim().toLowerCase();
        if (normalizedValue === 'tambah' || normalizedValue === 'kurang') {
            return normalizedValue;
        }

        const selectedMapping = getSelectedTransaksiMappingCandidate(mainRow);
        if (!selectedMapping) return '';
        if (selectedMapping.tipeKas === 'tambah' || selectedMapping.tipeKas === 'kurang') {
            return selectedMapping.tipeKas;
        }

        return inferNonKasTransaksiTipeKas(selectedMapping);
    }

    function getTransaksiSubledgerMeta(path) {
        const metaByPath = {
            '/bp-utang': {
                title: 'BP Utang',
                description: 'Halaman buku pembantu utang berdasarkan link BP Utang pada mapping transaksi akan ditampilkan di sini.',
            },
            '/bp-piutang': {
                title: 'BP Piutang',
                description: 'Halaman buku pembantu piutang berdasarkan link BP Piutang pada mapping transaksi akan ditampilkan di sini.',
            },
            '/kartu-persediaan': {
                title: 'Kartu Persediaan',
                description: 'Halaman kartu persediaan dari transaksi yang terhubung ke persediaan akan ditampilkan di sini, termasuk data yang masih dalam proses input.',
            },
            '/kartu-aset-tetap': {
                title: 'Kartu Aset Tetap',
                description: 'Halaman kartu aset tetap dari transaksi yang terhubung ke aset tetap akan ditampilkan di sini.',
            },
        };
        return metaByPath[path] || null;
    }

    function renderTransaksiSubledgerView(path) {
        const meta = getTransaksiSubledgerMeta(path);
        if (!meta) return;

        const titleEl = document.getElementById('transaksi-subledger-title');
        const descriptionEl = document.getElementById('transaksi-subledger-description');
        const emptyTitleEl = document.getElementById('transaksi-subledger-empty-title');
        const emptyDescriptionEl = document.getElementById('transaksi-subledger-empty-description');
        const placeholderEl = document.getElementById('transaksi-subledger-placeholder');
        const tableContainerEl = document.getElementById('transaksi-subledger-table-container');

        if (titleEl) titleEl.textContent = meta.title;
        if (descriptionEl) descriptionEl.textContent = meta.description;
        if (emptyTitleEl) emptyTitleEl.textContent = meta.title;
        if (emptyDescriptionEl) emptyDescriptionEl.textContent = meta.description;
        const unitFilterReady = loadWorkbookUnitFilterOptions('transaksi-subledger-unit-filter', getTransaksiSubledgerUnitFilterValue(path), path);

        if (path === '/bp-piutang') {
            if (placeholderEl) placeholderEl.style.display = 'none';
            if (tableContainerEl) tableContainerEl.style.display = 'block';
            unitFilterReady.finally(() => {
                loadBukuPembantuPiutangView();
            });
            return;
        }

        if (path === '/bp-utang') {
            if (placeholderEl) placeholderEl.style.display = 'none';
            if (tableContainerEl) tableContainerEl.style.display = 'block';
            unitFilterReady.finally(() => {
                loadBukuPembantuUtangView();
            });
            return;
        }

        if (path === '/kartu-aset-tetap') {
            if (placeholderEl) placeholderEl.style.display = 'none';
            if (tableContainerEl) tableContainerEl.style.display = 'block';
            loadKartuAsetTetapView();
            return;
        }

        if (tableContainerEl) {
            tableContainerEl.style.display = 'none';
            tableContainerEl.innerHTML = '';
        }
        if (placeholderEl) {
            placeholderEl.style.display = 'block';
        }
    }

    function resolveTransaksiMappingDetailIndex(mapping, akunDebet, akunKredit) {
        const detailOptions = getTransaksiMappingDetailOptions(mapping);
        const debitKey = String(akunDebet || '').trim().toLowerCase();
        const kreditKey = String(akunKredit || '').trim().toLowerCase();
        if (!debitKey && !kreditKey) return 0;

        const matchedIndex = detailOptions.findIndex((detail) => {
            const detailDebit = String(detail && detail.akun_debet ? detail.akun_debet : '').trim().toLowerCase();
            const detailKredit = String(detail && detail.akun_kredit ? detail.akun_kredit : '').trim().toLowerCase();
            if (debitKey && kreditKey) {
                return detailDebit === debitKey && detailKredit === kreditKey;
            }
            if (debitKey) {
                return detailDebit === debitKey;
            }
            return detailKredit === kreditKey;
        });

        return matchedIndex >= 0 ? matchedIndex : 0;
    }

    function createTransaksiReadonlyAccountField(fieldName, value) {
        const input = document.createElement('input');
        input.type = 'text';
        input.dataset.field = fieldName;
        input.readOnly = true;
        input.placeholder = 'otomatis dari mapping...';
        input.value = value || '';
        input.style.cssText = 'width: 100%; border: 1px solid #ddd; background: #f8fafc; padding: 7px 10px; border-radius: 6px; font-size: 0.84rem; color:#334155;';
        return input;
    }

    function createTransaksiAccountDropdown(fieldName, options, selectedIndex, side) {
        const select = document.createElement('select');
        select.dataset.field = fieldName;
        select.style.cssText = 'appearance:none; width: 100%; background:#ffffff; border:1px solid #ddd; border-radius:6px; padding:7px 8px; font-size:0.84rem; color:#334155; cursor:pointer;';

        options.forEach((detail, index) => {
            const option = document.createElement('option');
            option.value = String(index);
            option.textContent = side === 'debet'
                ? (detail.akun_debet || `Child ${index + 1}`)
                : (detail.akun_kredit || `Child ${index + 1}`);
            select.appendChild(option);
        });

        select.value = String(selectedIndex);
        return select;
    }

    function renderTransaksiMappingDetailFields(mainRow, mapping, preferredIndex) {
        const detailRow = getDetailRowForMainRow(mainRow);
        if (!detailRow) return;

        const debitField = detailRow.querySelector('[data-field="akun-debet"]');
        const kreditField = detailRow.querySelector('[data-field="akun-kredit"]');
        if (!debitField || !kreditField) return;

        const detailOptions = getTransaksiMappingDetailOptions(mapping);
        const maxIndex = Math.max(detailOptions.length - 1, 0);
        const selectedIndex = Math.min(Math.max(Number(preferredIndex) || 0, 0), maxIndex);
        const selectedDetail = detailOptions[selectedIndex] || { akun_debet: '', akun_kredit: '' };

        const debitReplacement = detailOptions.length > 1
            ? createTransaksiAccountDropdown('akun-debet', detailOptions, selectedIndex, 'debet')
            : createTransaksiReadonlyAccountField('akun-debet', selectedDetail.akun_debet || '');
        const kreditReplacement = detailOptions.length > 1
            ? createTransaksiAccountDropdown('akun-kredit', detailOptions, selectedIndex, 'kredit')
            : createTransaksiReadonlyAccountField('akun-kredit', selectedDetail.akun_kredit || '');

        debitField.replaceWith(debitReplacement);
        kreditField.replaceWith(kreditReplacement);
        mainRow.dataset.selectedMappingDetailIndex = String(selectedIndex);
    }

    function applySelectedTransaksiMapping(mainRow, mapping) {
        const detailRow = getDetailRowForMainRow(mainRow);
        const mappingSearchInput = detailRow ? detailRow.querySelector('[data-field="mapping-search"]') : null;
        const mappingSelect = detailRow ? detailRow.querySelector('[data-field="mapping-select"]') : null;
        const mappingMeta = detailRow ? detailRow.querySelector('[data-field="mapping-selected-meta"]') : null;
        const tipeKasSelect = detailRow ? detailRow.querySelector('[data-field="tipe-kas"]') : null;
        const statusBayarSelect = detailRow ? detailRow.querySelector('[data-field="status-bayar"]') : null;
        const previousSlug = mainRow.dataset.selectedMappingSlug || '';
        const preferredDetailIndex = previousSlug && mapping && previousSlug === (mapping.slug || '')
            ? Number(mainRow.dataset.selectedMappingDetailIndex || '0')
            : 0;

        if (mappingSearchInput) {
            const fallbackMappingName = mappingSearchInput.value || '';
            mappingSearchInput.value = mapping ? (mapping.nama_mapping || '') : fallbackMappingName;
        }
        if (mappingSelect) {
            mappingSelect.value = mapping ? (mapping.slug || '') : '';
        }
        if (mappingMeta) {
            mappingMeta.textContent = getTransaksiMappingSelectedMetaLabel(mapping);
            mappingMeta.style.color = mapping ? '#1d4ed8' : 'var(--text-secondary)';
        }
        renderTransaksiMappingDetailFields(mainRow, mapping, preferredDetailIndex);
        if (mapping && tipeKasSelect && mapping.tipeKas) tipeKasSelect.value = mapping.tipeKas;
        if (mapping && statusBayarSelect && mapping.tipeDefaultKey && mapping.tipeDefaultKey !== 'semua') {
            statusBayarSelect.value = mapping.tipeDefaultKey === 'kredit' ? 'kredit' : 'tunai';
        }
        mainRow.dataset.selectedMappingSlug = mapping ? (mapping.slug || '') : '';
        mainRow._selectedMappingCandidate = mapping || null;
    }

    function resetTransaksiMappingPreference(mainRow) {
        if (!mainRow) return;
        mainRow.dataset.selectedMappingSlug = '';
        mainRow.dataset.suggestedMappingSlug = '';
        mainRow.dataset.selectedMappingDetailIndex = '0';
        mainRow._selectedMappingCandidate = null;

        const detailRow = getDetailRowForMainRow(mainRow);
        if (!detailRow) return;

        const mappingSearchInput = detailRow.querySelector('[data-field="mapping-search"]');
        const mappingSelect = detailRow.querySelector('[data-field="mapping-select"]');
        if (mappingSearchInput) {
            mappingSearchInput.value = '';
        }
        if (mappingSelect) {
            mappingSelect.value = '';
        }
    }

    function syncTransaksiDerivedInputsFromKeterangan(keterangan, options = {}) {
        const normalizedText = String(keterangan || '').trim();
        const nominalInput = options.nominalInput || null;
        const statusBayarSelect = options.statusBayarSelect || null;
        const tipeKasSelect = options.tipeKasSelect || null;
        const lower = normalizedText.toLowerCase();
        const isCreditPurchasePhrase = /(beli|pembelian)/.test(lower)
            && /(kredit|hutang|utang|\bbon\b|tempo|cicil|nyicil|angsuran|pinjam|bayar nanti|belum dibayar|belum bayar|masih harus dibayar)/.test(lower);

        const extractedNominal = extractNominalFromTransaksiKeterangan(normalizedText);
        if (nominalInput && extractedNominal > 0) {
            nominalInput.value = String(extractedNominal);
        }

        if (statusBayarSelect) {
            statusBayarSelect.value = (/pelunasan|lunas|pelunasan utang|pelunasan hutang/.test(lower))
                ? 'tunai'
                : ((/kredit|hutang|utang|\bbon\b|tempo|cicil|nyicil|angsuran|pinjam|bayar nanti|belum dibayar|belum bayar|masih harus dibayar/.test(lower)) ? 'kredit' : 'tunai');
        }

        if (tipeKasSelect && (isCreditPurchasePhrase || /(selisih stok|stok berkurang|stok bertambah|pecah|rusak|penyesuaian stok|biaya produksi|penyusutan|pemakaian perlengkapan|perlengkapan.*terpakai|perlengkapan terpakai|tagihan listrik|masih harus dibayar|akhir bulan belum dibayar|belum dibayar|belum bayar)/.test(lower))) {
            tipeKasSelect.value = '';
        }
    }

    async function refreshTransaksiMappingSuggestion(mainRow, unitUsahaIDOverride = null, aiSuggestion = null, forceBestMatch = false) {
        if (!mainRow) return;
        const detailRow = getDetailRowForMainRow(mainRow);
        if (!detailRow) return;

        const keteranganInput = mainRow.querySelector('[data-field="keterangan"]');
        const nominalInput = detailRow.querySelector('[data-field="nominal"]');
        const statusBayarSelect = detailRow.querySelector('[data-field="status-bayar"]');
        const tipeKasSelect = detailRow.querySelector('[data-field="tipe-kas"]');
        const selectWrap = detailRow.querySelector('[data-field="mapping-select-wrap"]');
        const selectEl = detailRow.querySelector('[data-field="mapping-select"]');
        const unitUsahaSelect = document.getElementById('transaksi-unit-usaha');

        if (!keteranganInput || !selectWrap || !selectEl) return;

        const keterangan = keteranganInput.value.trim();

        try {
            const mappings = await fetchTransaksiMappingReferences();
            const allMappings = sortTransaksiMappingsForPicker(mappings);
            const candidates = !keterangan || keterangan === '-'
                ? allMappings
                : findTransaksiMappingCandidates(allMappings, {
                    keterangan,
                    tipeKas: tipeKasSelect ? tipeKasSelect.value : '',
                    statusBayar: statusBayarSelect ? statusBayarSelect.value : 'tunai',
                });

            const effectiveAISuggestion = aiSuggestion || mainRow._aiTransaksiSuggestion || null;
            const aiDeskripsiKey = normalizeTransaksiMappingKey(effectiveAISuggestion && effectiveAISuggestion.deskripsi ? effectiveAISuggestion.deskripsi : '');
            const aiMatchedCandidate = aiDeskripsiKey
                ? (allMappings.find((candidate) => normalizeTransaksiMappingKey(candidate && candidate.nama_mapping || '') === aiDeskripsiKey) || null)
                : null;

            const semanticCandidates = prioritizeTransaksiSemanticCandidates(candidates, aiMatchedCandidate);

            if (effectiveAISuggestion) {
                if (nominalInput && Number(effectiveAISuggestion.nominal) > 0 && !(Number(nominalInput.value) > 0)) {
                    nominalInput.value = String(Number(effectiveAISuggestion.nominal));
                }
                if (tipeKasSelect && (effectiveAISuggestion.tipe_kas === 'tambah' || effectiveAISuggestion.tipe_kas === 'kurang') && !tipeKasSelect.value) {
                    tipeKasSelect.value = effectiveAISuggestion.tipe_kas;
                }
            }

            mainRow._mappingCandidates = allMappings;
            mainRow._semanticMappingCandidates = semanticCandidates;

            const topSemanticCandidate = keterangan && keterangan !== '-'
                ? (aiMatchedCandidate || semanticCandidates[0] || null)
                : null;
            mainRow.dataset.suggestedMappingSlug = forceBestMatch && topSemanticCandidate
                ? String(topSemanticCandidate.slug || '')
                : '';

            const preferredSlug = mainRow.dataset.selectedMappingSlug || '';
            const selectedCandidate = syncTransaksiMappingSelectFromState(
                mainRow,
                preferredSlug,
                forceBestMatch ? topSemanticCandidate : null
            );

            selectWrap.style.display = 'block';
            applySelectedTransaksiMapping(mainRow, selectedCandidate);
        } catch (error) {
            console.error('Failed to refresh transaksi mapping suggestion', error);
        }
    }

    function scheduleTransaksiAISuggestion(mainRow) {
        if (!mainRow) return;

        if (mainRow._transaksiAISuggestTimer) {
            clearTimeout(mainRow._transaksiAISuggestTimer);
        }

        const keteranganInput = mainRow.querySelector('[data-field="keterangan"]');
        const unitUsahaSelect = document.getElementById('transaksi-unit-usaha');
        const unitUsahaID = String(mainRow.dataset.unitUsahaId || (unitUsahaSelect ? unitUsahaSelect.value : '') || '').trim();
        const keterangan = keteranganInput ? String(keteranganInput.value || '').trim() : '';
        if (!keterangan || keterangan === '-') {
            mainRow._aiTransaksiSuggestion = null;
            setTransaksiAILoadingState(mainRow, false);
            return;
        }

        const requestToken = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
        mainRow.dataset.aiSuggestionToken = requestToken;
        mainRow._transaksiAISuggestTimer = setTimeout(async () => {
            setTransaksiAILoadingState(mainRow, true);
            try {
                const suggestion = await fetchTransaksiAISuggestion(keterangan, unitUsahaID);
                if (mainRow.dataset.aiSuggestionToken !== requestToken) {
                    return;
                }
                mainRow._aiTransaksiSuggestion = suggestion;
                await refreshTransaksiMappingSuggestion(mainRow, unitUsahaID, suggestion, true);
            } catch (error) {
                if (mainRow.dataset.aiSuggestionToken === requestToken) {
                    mainRow._aiTransaksiSuggestion = null;
                }
                console.error('Failed to fetch Gemini transaksi suggestion', error);
            } finally {
                if (mainRow.dataset.aiSuggestionToken === requestToken) {
                    setTransaksiAILoadingState(mainRow, false);
                }
            }
        }, 650);
    }

    const btnAddRowTransaksi = document.getElementById('btn-add-row-transaksi');
    if(btnAddRowTransaksi) {
        btnAddRowTransaksi.addEventListener('click', () => {
            const tbody = document.getElementById('transaksi-form-tbody');
            if(tbody) {
                const tr = document.createElement('tr');
                tr.dataset.rowType = 'main';
                tr.style.backgroundColor = '#f9faf9';
                tr.style.borderBottom = '1px solid var(--border)';
                tr.innerHTML = `
                    <td style="padding: 12px 16px; border-right: 1px solid var(--border);">
                        <input type="date" value="${getToday()}" style="width: 100%; border: 1px solid #ddd; background: #ffffff; padding: 6px 8px; border-radius: 4px; font-weight: 500; font-size: 0.9rem;" required>
                    </td>
                    <td style="padding: 12px 16px; border-right: 1px solid var(--border);">
                        <div style="display:grid; grid-template-columns: 170px minmax(0, 1fr); gap:8px; align-items:center;">
                            <select data-field="partner-type" style="width:100%; background:#ffffff; border:1px solid #ddd; border-radius:6px; padding:7px 10px; font-size:0.85rem;" autocomplete="off">
                                <option value="pelanggan" selected>Pelanggan</option>
                                <option value="supplier">Supplier / Pemasok</option>
                            </select>
                            <input type="text" data-field="partner-name" list="transaksi-pelanggan-list" style="width: 100%; background: #ffffff; border: 1px solid #ddd; border-radius: 6px; padding: 8px 12px; font-size: 0.9rem;" placeholder="Pilih atau ketik nama pelanggan..." autocomplete="off">
                        </div>
                    </td>
                    <td style="padding: 12px 16px; border-right: 1px solid var(--border); position:relative;">
                        <input type="text" data-field="keterangan" style="width: 100%; border: 1px solid #ddd; background: #ffffff; padding: 6px 104px 6px 8px; border-radius: 4px; font-size: 0.9rem;" placeholder="" required>
                        <div data-field="ai-loading" style="display:none; align-items:center; gap:6px; position:absolute; right:20px; top:50%; transform:translateY(-50%); padding:4px 8px; border-radius:999px; background:rgba(29, 78, 216, 0.08); border:1px solid rgba(29, 78, 216, 0.16);">
                            <span style="font-size:0.68rem; font-weight:700; letter-spacing:0.2px; color:#1d4ed8;">AI</span>
                            <span style="display:block; width:52px; height:6px; border-radius:999px; background:linear-gradient(90deg, rgba(29,78,216,0.18) 0%, rgba(59,130,246,0.95) 35%, rgba(147,197,253,1) 50%, rgba(59,130,246,0.95) 65%, rgba(29,78,216,0.18) 100%); background-size:200% 100%; animation:transaksiAiProgress 1.15s linear infinite;"></span>
                        </div>
                    </td>
                    <td style="padding: 12px 16px; text-align: center;">
                        <button type="button" class="action-btn delete" onclick="removeTransaksiRow(this)" style="border: none; background: none; cursor: pointer; color: #999; font-size: 1.2rem;" title="Hapus baris"><i class="fa-solid fa-xmark"></i></button>
                    </td>
                `;

                const detailRow = document.createElement('tr');
                detailRow.dataset.rowType = 'detail';
                detailRow.style.display = 'table-row';
                detailRow.style.background = '#f7fbff';
                detailRow.style.borderBottom = '1px solid var(--border)';
                detailRow.innerHTML = `
                    <td colspan="4" style="padding: 10px 16px 12px 16px; border-top: none;">
                        <div style="display:grid; grid-template-columns: 1.4fr 1fr 1fr 0.8fr 0.7fr 0.7fr; gap:10px; align-items:end;">
                            <div>
                                <div data-field="mapping-select-wrap" style="display:block; position:relative; margin-top:8px;">
                                    <div style="font-size:0.74rem; font-weight:600; letter-spacing:0.3px; color:#1d4ed8; margin-bottom:4px;">Pilihan Mapping</div>
                                    <input type="text" data-field="mapping-search" style="width:100%; background:#ffffff; border:1px solid #c7d2fe; border-radius:6px; padding:7px 10px; font-size:0.82rem; color:#334155;" placeholder="Cari atau pilih mapping..." autocomplete="off">
                                    <div data-field="mapping-dropdown" style="display:none; position:absolute; top:calc(100% + 4px); left:0; right:0; z-index:40; max-height:220px; overflow:auto; border:1px solid #c7d2fe; border-radius:8px; background:#ffffff; box-shadow:0 12px 24px rgba(15, 23, 42, 0.12);"></div>
                                    <div data-field="mapping-selected-meta" style="margin-top:6px; font-size:0.72rem; font-weight:600; color:var(--text-secondary);">Belum ada mapping yang dipilih</div>
                                    <select data-field="mapping-select" style="display:none;">
                                        <option value="">-</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <div style="font-size:0.74rem; font-weight:600; letter-spacing:0.3px; color:var(--text-secondary); margin-bottom:4px;">Debit</div>
                                <input type="text" data-field="akun-debet" style="width: 100%; border: 1px solid #ddd; background: #f8fafc; padding: 7px 10px; border-radius: 6px; font-size: 0.84rem; color:#334155;" placeholder="otomatis dari mapping..." readonly>
                            </div>
                            <div>
                                <div style="font-size:0.74rem; font-weight:600; letter-spacing:0.3px; color:var(--text-secondary); margin-bottom:4px;">Kredit</div>
                                <input type="text" data-field="akun-kredit" style="width: 100%; border: 1px solid #ddd; background: #f8fafc; padding: 7px 10px; border-radius: 6px; font-size: 0.84rem; color:#334155;" placeholder="otomatis dari mapping..." readonly>
                            </div>
                            <div>
                                <div style="font-size:0.74rem; font-weight:600; letter-spacing:0.3px; color:var(--text-secondary); margin-bottom:4px;">Nominal</div>
                                <input type="number" data-field="nominal" style="width: 100%; border: 1px solid #ddd; background: #ffffff; padding: 7px 10px; border-radius: 6px; text-align: right; font-weight: 500; font-size: 0.86rem;" placeholder="0" required>
                            </div>
                            <div>
                                <div style="font-size:0.74rem; font-weight:600; letter-spacing:0.3px; color:var(--text-secondary); margin-bottom:4px;">Kas Masuk/Kas Keluar</div>
                                <select data-field="tipe-kas" style="appearance: none; width: 100%; background: #ffffff; border: 1px solid #ddd; border-radius: 6px; padding: 7px 8px; font-weight: 500; font-size: 0.86rem; text-align: center; cursor: pointer;">
                                    <option value="">-</option>
                                    <option value="tambah">Kas Masuk</option>
                                    <option value="kurang">Kas Keluar</option>
                                </select>
                            </div>
                            <div>
                                <div style="font-size:0.74rem; font-weight:600; letter-spacing:0.3px; color:var(--text-secondary); margin-bottom:4px;">Tunai/Kredit</div>
                                <select data-field="status-bayar" style="appearance: none; width: 100%; background: #ffffff; border: 1px solid #ddd; border-radius: 6px; padding: 7px 8px; font-weight: 500; font-size: 0.86rem; text-align: center; cursor: pointer;">
                                    <option value="tunai" selected>Tunai</option>
                                    <option value="kredit">Kredit</option>
                                </select>
                            </div>
                        </div>
                    </td>
                `;

                tbody.appendChild(tr);
                tbody.appendChild(detailRow);
                syncTransaksiPartnerInputSource(tr);
            }
        });
    }

    function getTransaksiPartnerTypeSelect(mainRow) {
        return mainRow ? mainRow.querySelector('[data-field="partner-type"]') : null;
    }

    function getTransaksiNamaInput(mainRow) {
        return mainRow ? mainRow.querySelector('[data-field="partner-name"]') : null;
    }

    function getTransaksiPartnerListId(partnerType) {
        return partnerType === 'supplier' ? 'transaksi-supplier-list' : 'transaksi-pelanggan-list';
    }

    function buildTransaksiPartnerContactKey(name, partnerType) {
        return `${partnerType === 'supplier' ? 'supplier' : 'pelanggan'}::${normalizePelangganName(name)}`;
    }

    function syncTransaksiPartnerInputSource(mainRow) {
        const partnerTypeSelect = getTransaksiPartnerTypeSelect(mainRow);
        const namaInput = getTransaksiNamaInput(mainRow);
        if (!partnerTypeSelect || !namaInput) return;

        const partnerType = partnerTypeSelect.value === 'supplier' ? 'supplier' : 'pelanggan';
        namaInput.setAttribute('list', getTransaksiPartnerListId(partnerType));
        namaInput.placeholder = partnerType === 'supplier'
            ? 'Pilih atau ketik nama supplier...'
            : 'Pilih atau ketik nama pelanggan...';
    }

    function isExistingPelangganName(name) {
        const datalists = [
            document.getElementById('transaksi-pelanggan-list'),
            document.getElementById('transaksi-supplier-list')
        ].filter(Boolean);
        if(!datalists.length) return false;
        const target = (name || '').trim().toLowerCase();
        if(!target) return false;
        return datalists.some(datalist => Array.from(datalist.options).some(opt => (opt.value || '').trim().toLowerCase() === target));
    }

    function normalizePelangganName(name) {
        return (name || '').trim().toLowerCase();
    }

    function parseTransaksiNumber(rawValue) {
        let cleaned = String(rawValue || '').trim().toLowerCase();
        cleaned = cleaned.replace(/rp\.?/g, '').replace(/\s+/g, '');
        if (!cleaned) return 0;

        const lastComma = cleaned.lastIndexOf(',');
        const lastDot = cleaned.lastIndexOf('.');
        if (lastComma >= 0 && lastDot >= 0) {
            if (lastComma > lastDot) {
                cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
            } else {
                cleaned = cleaned.replace(/,/g, '');
            }
        } else if (lastComma >= 0) {
            cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
        } else {
            cleaned = cleaned.replace(/\./g, '');
        }

        const parsed = Number.parseFloat(cleaned);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function extractNominalFromTransaksiKeterangan(keterangan) {
        const text = String(keterangan || '').trim().toLowerCase();
        if (!text) return 0;

        const multiplyPatterns = [
            /@\s*(rp\s*)?([\d.,]+)\s*(?:x|×)?\s*(\d+(?:[.,]\d+)?)\s*(?:buah|pcs|unit|item|sak|karung|ekor|kg|gram|liter|ltr|pak|pack|botol)?\b/i,
            /(\d+(?:[.,]\d+)?)\s*(?:buah|pcs|unit|item|sak|karung|ekor|kg|gram|liter|ltr|pak|pack|botol)\s*@\s*(rp\s*)?([\d.,]+)\b/i,
            /(\d+(?:[.,]\d+)?)\s*(?:x|×)\s*(rp\s*)?([\d.,]+)\b/i,
        ];

        for (let index = 0; index < multiplyPatterns.length; index += 1) {
            const match = text.match(multiplyPatterns[index]);
            if (!match) continue;

            let qtyRaw = '';
            let priceRaw = '';
            if (index === 0) {
                priceRaw = match[2];
                qtyRaw = match[3];
            } else {
                qtyRaw = match[1];
                priceRaw = match[3];
            }

            const qty = parseTransaksiNumber(qtyRaw);
            const price = parseTransaksiNumber(priceRaw);
            if (qty > 0 && price > 0) {
                return qty * price;
            }
        }

        const matches = [...text.matchAll(/(?:rp\s*)?([\d][\d.,]*)/gi)];
        if (!matches.length) return 0;

        const values = matches
            .map((match) => parseTransaksiNumber(match[1]))
            .filter((value) => value > 0);

        if (!values.length) return 0;
        return Math.max(...values);
    }

    function extractCounterpartyNameFromKeterangan(keterangan) {
        const text = String(keterangan || '').trim();
        if (!text) return '';

        const match = text.match(/\b(?:ke|kepada|dari|oleh)\s+([A-Za-z0-9][A-Za-z0-9 .&'()\/-]{1,})/i);
        if (!match || !match[1]) return '';

        let candidate = match[1]
            .split(/\b(?:sebesar|senilai|sejumlah|rp\.?|untuk|karena|tanggal|tgl\.?|jam|via|dengan|pakai)\b/i)[0]
            .replace(/[,:;]+$/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (candidate.length < 2) return '';
        return candidate;
    }

    function syncNamaPelangganFromKeterangan(mainRow) {
        if (!mainRow) return;
        const namaInput = getTransaksiNamaInput(mainRow);
        const keteranganInput = mainRow.querySelector('[data-field="keterangan"]');
        if (!namaInput || !keteranganInput) return;

        const extractedName = extractCounterpartyNameFromKeterangan(keteranganInput.value);
        const canAutoFill = !String(namaInput.value || '').trim() || namaInput.dataset.autoFilledByKeterangan === '1';

        if (!extractedName) {
            if (namaInput.dataset.autoFilledByKeterangan === '1') {
                namaInput.value = '';
                delete namaInput.dataset.autoFilledByKeterangan;
            }
            return;
        }

        if (canAutoFill) {
            namaInput.value = extractedName;
            namaInput.dataset.autoFilledByKeterangan = '1';
        }
    }

    async function fetchExistingPelangganNameSet(unitUsahaID) {
        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        const res = await fetch('/api/pelanggans?session_slug=' + sessionSlug + '&t=' + new Date().getTime());
        if (!res.ok) {
            throw new Error('Gagal memuat data pelanggan');
        }

        const data = await res.json();
        const nameSet = new Set();
        (data || []).forEach(p => {
            if (unitUsahaID && p.unit_usaha_id && parseInt(p.unit_usaha_id, 10) !== parseInt(unitUsahaID, 10)) {
                return;
            }
            const key = normalizePelangganName(p.nama_pelanggan);
            if (key) nameSet.add(key);
        });
        return nameSet;
    }

    async function fetchExistingPartnerNameSets(unitUsahaID) {
        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        const [pelangganRes, supplierRes] = await Promise.all([
            fetch('/api/pelanggans?session_slug=' + sessionSlug + '&t=' + new Date().getTime()),
            fetch('/api/suppliers?session_slug=' + sessionSlug + '&t=' + new Date().getTime()),
        ]);

        if (!pelangganRes.ok || !supplierRes.ok) {
            throw new Error('Gagal memuat data partner');
        }

        const [pelangganData, supplierData] = await Promise.all([pelangganRes.json(), supplierRes.json()]);
        const pelangganSet = new Set();
        const supplierSet = new Set();

        (pelangganData || []).forEach((item) => {
            if (unitUsahaID && item.unit_usaha_id && parseInt(item.unit_usaha_id, 10) !== parseInt(unitUsahaID, 10)) {
                return;
            }
            const key = normalizePelangganName(item.nama_pelanggan);
            if (key) pelangganSet.add(key);
        });

        (supplierData || []).forEach((item) => {
            if (unitUsahaID && item.unit_usaha_id && parseInt(item.unit_usaha_id, 10) !== parseInt(unitUsahaID, 10)) {
                return;
            }
            const key = normalizePelangganName(item.nama_supplier);
            if (key) supplierSet.add(key);
        });

        return { pelangganSet, supplierSet };
    }

    function collectNewPelangganContacts(newPartners) {
        return new Promise((resolve) => {
            if (!newPartners || newPartners.length === 0) {
                resolve({});
                return;
            }

            const modal = document.createElement('div');
            modal.id = 'batch-pelanggan-modal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;';

            const rowsHtml = newPartners.map((partner, idx) => {
                const partnerType = partner.partnerType === 'supplier' ? 'supplier' : 'pelanggan';
                const contactKey = buildTransaksiPartnerContactKey(partner.name, partnerType);
                return `
                <div style="border:1px solid var(--border); border-radius:8px; padding:12px; margin-bottom:10px; background:#fafdfb;">
                    <div style="font-weight:600; color:var(--text-primary); margin-bottom:8px;">${idx + 1}. ${partner.name}</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                        <div>
                            <label style="font-size:0.8rem; color:var(--text-secondary); display:block; margin-bottom:4px;">Simpan Sebagai</label>
                            <select class="new-pelanggan-partner-type" data-contact-key="${contactKey}" style="width:100%; border:1px solid #ddd; border-radius:6px; padding:8px; font-size:0.9rem; background:#fff;">
                                <option value="pelanggan" ${partnerType === 'pelanggan' ? 'selected' : ''}>Pelanggan</option>
                                <option value="supplier" ${partnerType === 'supplier' ? 'selected' : ''}>Supplier / Pemasok</option>
                            </select>
                        </div>
                        <div></div>
                        <div>
                            <label style="font-size:0.8rem; color:var(--text-secondary); display:block; margin-bottom:4px;">Alamat</label>
                            <input type="text" class="new-pelanggan-alamat" data-contact-key="${contactKey}" style="width:100%; border:1px solid #ddd; border-radius:6px; padding:8px; font-size:0.9rem;" placeholder="Masukkan alamat" />
                        </div>
                        <div>
                            <label style="font-size:0.8rem; color:var(--text-secondary); display:block; margin-bottom:4px;">No Telepon</label>
                            <input type="text" class="new-pelanggan-telepon" data-contact-key="${contactKey}" style="width:100%; border:1px solid #ddd; border-radius:6px; padding:8px; font-size:0.9rem;" placeholder="08xxxxxxxxxx" />
                        </div>
                    </div>
                </div>
            `;
            }).join('');

            modal.innerHTML = `
                <div style="background:#fff; width:100%; max-width:760px; border-radius:12px; box-shadow:0 12px 30px rgba(0,0,0,0.18); overflow:hidden;">
                    <div style="padding:16px 20px; border-bottom:1px solid var(--border); font-weight:700; color:var(--text-primary);">
                        Data Partner Baru
                    </div>
                    <div style="padding:16px 20px; max-height:60vh; overflow:auto;">
                        <p style="margin:0 0 12px; color:var(--text-secondary); font-size:0.9rem;">
                            Lengkapi jenis partner, alamat, dan no telepon untuk data baru berikut:
                        </p>
                        ${rowsHtml}
                    </div>
                    <div style="padding:14px 20px; border-top:1px solid var(--border); display:flex; justify-content:flex-end; gap:10px;">
                        <button type="button" id="batch-pelanggan-cancel" style="padding:8px 14px; border:1px solid var(--border); border-radius:6px; background:#fff; cursor:pointer;">Batal</button>
                        <button type="button" id="batch-pelanggan-save" style="padding:8px 14px; border:none; border-radius:6px; background:var(--primary); color:#fff; cursor:pointer;">Lanjut Simpan</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const cleanup = () => {
                modal.remove();
            };

            modal.querySelector('#batch-pelanggan-cancel').addEventListener('click', () => {
                cleanup();
                resolve(null);
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    cleanup();
                    resolve(null);
                }
            });

            modal.querySelector('#batch-pelanggan-save').addEventListener('click', () => {
                const result = {};
                for (const partner of newPartners) {
                    const partnerName = partner.name || '';
                    const contactKey = buildTransaksiPartnerContactKey(partner.name, partner.partnerType);
                    const partnerTypeEl = modal.querySelector(`.new-pelanggan-partner-type[data-contact-key="${contactKey}"]`);
                    const alamatEl = modal.querySelector(`.new-pelanggan-alamat[data-contact-key="${contactKey}"]`);
                    const teleponEl = modal.querySelector(`.new-pelanggan-telepon[data-contact-key="${contactKey}"]`);
                    const partnerType = partnerTypeEl ? partnerTypeEl.value.trim() : 'pelanggan';
                    const alamat = alamatEl ? alamatEl.value.trim() : '';
                    const noTelepon = teleponEl ? teleponEl.value.trim() : '';

                    if (!alamat || !noTelepon) {
                        showToast(`Lengkapi alamat dan no telepon untuk ${partnerName}.`, true);
                        if (!alamat && alamatEl) alamatEl.focus();
                        if (alamat && !noTelepon && teleponEl) teleponEl.focus();
                        return;
                    }

                    if (alamat.length < 5) {
                        showToast(`Alamat untuk ${partnerName} minimal 5 karakter.`, true);
                        if (alamatEl) alamatEl.focus();
                        return;
                    }

                    const phoneNormalized = noTelepon.replace(/[\s\-]/g, '');
                    if (!/^\+?\d{8,15}$/.test(phoneNormalized)) {
                        showToast(`No telepon untuk ${partnerName} tidak valid. Gunakan 8-15 digit, boleh diawali +.`, true);
                        if (teleponEl) teleponEl.focus();
                        return;
                    }

                    result[contactKey] = { alamat, noTelepon: phoneNormalized, partnerType };
                }

                cleanup();
                resolve(result);
            });
        });
    }

    // Global function to remove transaksi row
    window.removeTransaksiRow = function(btn) {
        const row = btn.closest('tr');
        if (!row) return;

        if (row.dataset.rowType === 'main') {
            const nextRow = row.nextElementSibling;
            row.remove();
            if (nextRow && nextRow.dataset.rowType === 'detail') {
                nextRow.remove();
            }
            return;
        }

        row.remove();
    };

    function getDetailRowForMainRow(mainRow) {
        if (!mainRow) return null;
        const detailRow = mainRow.nextElementSibling;
        if (!detailRow || detailRow.dataset.rowType !== 'detail') return null;

        detailRow.hidden = false;
        detailRow.style.display = 'table-row';

        const selectWrap = detailRow.querySelector('[data-field="mapping-select-wrap"]');
        if (selectWrap) {
            selectWrap.hidden = false;
            selectWrap.style.display = 'block';
        }

        return detailRow;
    }

    // --- Plain Keterangan input ---
    (function() {
        const tbody = document.getElementById('transaksi-form-tbody');
        if (!tbody) return;

        tbody.addEventListener('input', function(e) {
            const input = e.target;
            if (input.matches('[data-field="partner-name"]')) {
                delete input.dataset.autoFilledByKeterangan;
            }

            if (input.matches('[data-field="mapping-search"]')) {
                const detailRow = input.closest('tr[data-row-type="detail"]');
                const row = detailRow ? detailRow.previousElementSibling : null;
                if (!row) return;

                handleTransaksiMappingSearchInput(row, input.value || '');
                return;
            }

            if (input.matches('[data-field="keterangan"]')) {
                const row = input.closest('tr[data-row-type="main"]');
                if (!row) return;

                const detailRow = getDetailRowForMainRow(row);
                const nominalInput = detailRow ? detailRow.querySelector('[data-field="nominal"]') : null;
                const statusBayarSelect = detailRow ? detailRow.querySelector('[data-field="status-bayar"]') : null;
                const tipeKasSelect = detailRow ? detailRow.querySelector('[data-field="tipe-kas"]') : null;

                syncNamaPelangganFromKeterangan(row);
                syncTransaksiDerivedInputsFromKeterangan(input.value, {
                    nominalInput,
                    statusBayarSelect,
                    tipeKasSelect,
                });
                const normalizedKeterangan = normalizeTransaksiMappingKey(input.value || '');
                if (row.dataset.lastSemanticKeteranganKey !== normalizedKeterangan) {
                    resetTransaksiMappingPreference(row);
                    row.dataset.lastSemanticKeteranganKey = normalizedKeterangan;
                }
                refreshTransaksiMappingSuggestion(row, null, null, true);
                scheduleTransaksiAISuggestion(row);
            }
        });

        tbody.addEventListener('focusin', function(e) {
            const target = e.target;
            if (target.matches('[data-field="mapping-search"]')) {
                const row = target.closest('tr[data-row-type="detail"]')
                    ? target.closest('tr[data-row-type="detail"]').previousElementSibling
                    : target.closest('tr[data-row-type="main"]');
                if (row) {
                    handleTransaksiMappingSearchFocus(row);
                }
                return;
            }

            if (target.matches('[data-field="mapping-select"]')) {
                const row = target.closest('tr[data-row-type="detail"]')
                    ? target.closest('tr[data-row-type="detail"]').previousElementSibling
                    : target.closest('tr[data-row-type="main"]');
                if (row) {
                    handleTransaksiMappingSelectFocus(row);
                }
            }
        });

        tbody.addEventListener('focusout', function(e) {
            const target = e.target;
            if (!target.matches('[data-field="mapping-search"]')) return;

            const row = target.closest('tr[data-row-type="detail"]')
                ? target.closest('tr[data-row-type="detail"]').previousElementSibling
                : target.closest('tr[data-row-type="main"]');
            if (!row) return;

            setTimeout(() => hideTransaksiMappingAutocompleteDropdown(row), 120);
        });

        tbody.addEventListener('click', function(e) {
            const mappingOption = e.target.closest('[data-field="mapping-dropdown"] button[data-value]');
            if (mappingOption) {
                const detailRow = mappingOption.closest('tr[data-row-type="detail"]');
                const row = detailRow ? detailRow.previousElementSibling : null;
                if (!row) return;

                const slug = mappingOption.getAttribute('data-value') || '';
                const detail = getDetailRowForMainRow(row);
                const searchInput = detail ? detail.querySelector('[data-field="mapping-search"]') : null;
                handleTransaksiMappingDropdownClick(row, searchInput, slug);
                return;
            }

            const target = e.target.closest('[data-field="mapping-select"]');
            if (!target) return;

            const row = target.closest('tr[data-row-type="detail"]')
                ? target.closest('tr[data-row-type="detail"]').previousElementSibling
                : target.closest('tr[data-row-type="main"]');
            if (row) {
                refreshTransaksiMappingSuggestion(row);
            }
        });

        tbody.addEventListener('change', function(e) {
            const target = e.target;
            const row = target.closest('tr[data-row-type="main"]') || (target.closest('tr[data-row-type="detail"]') ? target.closest('tr[data-row-type="detail"]').previousElementSibling : null);
            if (!row) return;

            if (target.dataset.field === 'mapping-select') {
                const candidates = Array.isArray(row._mappingCandidates) ? row._mappingCandidates : [];
                const selected = candidates.find((candidate) => candidate.slug === target.value) || null;
                row.dataset.selectedMappingSlug = selected ? (selected.slug || '') : '';
                row.dataset.suggestedMappingSlug = selected ? (selected.slug || '') : '';
                applySelectedTransaksiMapping(row, selected);
                return;
            }

            if (target.dataset.field === 'akun-debet' || target.dataset.field === 'akun-kredit') {
                const currentMapping = Array.isArray(row._mappingCandidates)
                    ? row._mappingCandidates.find((candidate) => candidate.slug === row.dataset.selectedMappingSlug)
                    : null;
                renderTransaksiMappingDetailFields(row, currentMapping, Number(target.value || '0'));
                return;
            }

        });

        tbody.addEventListener('change', function(e) {
            const input = e.target;
            if (!input.matches('[data-field="partner-type"]')) return;

            const row = input.closest('tr[data-row-type="main"]');
            if (!row) return;
            syncTransaksiPartnerInputSource(row);
        });
    })();

    const btnSaveTransaksi = document.getElementById('btn-save-transaksi');
    const transaksiUnitUsahaSelect = document.getElementById('transaksi-unit-usaha');

    if (transaksiUnitUsahaSelect) {
        transaksiUnitUsahaSelect.addEventListener('change', async () => {
            loadTransaksiPelangganList();
            const unitUsahaID = String(transaksiUnitUsahaSelect.value || '').trim();
            const tbody = document.getElementById('transaksi-form-tbody');
            const rows = tbody ? Array.from(tbody.querySelectorAll('tr[data-row-type="main"]')) : [];
            rows.forEach((row) => {
                row.dataset.unitUsahaId = unitUsahaID;
            });
        });
    }

    if(btnSaveTransaksi) {
        btnSaveTransaksi.addEventListener('click', async () => {
            const tbody = document.getElementById('transaksi-form-tbody');
            const unitUsahaSelect = document.getElementById('transaksi-unit-usaha');
            
            if(!unitUsahaSelect || !unitUsahaSelect.value) {
                showToast("Pilih Unit Usaha terlebih dahulu!", true);
                return;
            }

            const unitUsahaID = parseInt(unitUsahaSelect.value);
            const rows = Array.from(tbody.querySelectorAll('tr[data-row-type="main"]'));
            rows.forEach((row) => {
                row.dataset.unitUsahaId = String(unitUsahaID);
            });
            const parsedRows = [];
            
            let hasError = false;
            rows.forEach((tr, index) => {
                const tanggalInput = tr.querySelector('input[type="date"]');
                const namaInput = getTransaksiNamaInput(tr);
                const partnerTypeSelect = getTransaksiPartnerTypeSelect(tr);
                const keteranganInput = tr.querySelector('[data-field="keterangan"]');
                const detailRow = getDetailRowForMainRow(tr);
                const nominalInput = detailRow ? detailRow.querySelector('[data-field="nominal"]') : null;
                const tipeKasSelect = detailRow ? detailRow.querySelector('[data-field="tipe-kas"]') : null;
                const statusBayarSelect = detailRow ? detailRow.querySelector('[data-field="status-bayar"]') : null;

                const tanggal = tanggalInput ? tanggalInput.value : '';
                const nama = namaInput ? namaInput.value : '';
                const partnerType = partnerTypeSelect && partnerTypeSelect.value === 'supplier' ? 'supplier' : 'pelanggan';
                const keterangan = keteranganInput ? keteranganInput.value : '';
                const deskripsi = resolveTransaksiDeskripsiForSubmit(tr, '');
                const nominal = nominalInput ? parseFloat(nominalInput.value) : NaN;
                const tipeKas = resolveTransaksiTipeKasForSubmit(tr, tipeKasSelect ? tipeKasSelect.value : '');
                const statusBayar = statusBayarSelect ? statusBayarSelect.value : 'tunai';
                const hasSelectedMapping = hasExplicitTransaksiMappingSelection(tr);
                
                if (!hasSelectedMapping) {
                    showToast(`Baris ke-${index + 1} wajib memilih Pilihan Mapping terlebih dahulu!`, true);
                    hasError = true;
                    return;
                }

                if(!tanggal || !keterangan || !keterangan.trim() || isNaN(nominal) || nominal <= 0 || !tipeKas) {
                    showToast(`Baris ke-${index + 1} belum terisi lengkap dengan benar!`, true);
                    hasError = true;
                    return;
                }

                const selectedAccounts = getSelectedTransaksiAccountValues(tr);

                parsedRows.push({
                    tanggal: tanggal,
                    nama_pelanggan_pemasok: nama,
                    partner_type: partnerType,
                    keterangan: keterangan,
                    deskripsi: deskripsi,
                    mapping_slug: getSelectedTransaksiMappingIdentity(tr).mappingSlug,
                    mapping_jenis: getSelectedTransaksiMappingIdentity(tr).mappingJenis,
                    akun_debet: selectedAccounts.akunDebet,
                    akun_kredit: selectedAccounts.akunKredit,
                    validasi: 'Belum',
                    nominal: nominal,
                    tipe_kas: tipeKas,
                    status_bayar: statusBayar
                });
            });

            if(hasError) return;
            if(parsedRows.length === 0) {
                showToast("Tidak ada baris transaksi untuk disubmit!", true);
                return;
            }

            let existingPartnerSets;
            try {
                existingPartnerSets = await fetchExistingPartnerNameSets(unitUsahaID);
            } catch (err) {
                // fallback to local datalist if API check fails
                existingPartnerSets = { pelangganSet: new Set(), supplierSet: new Set() };
                const pelangganList = document.getElementById('transaksi-pelanggan-list');
                const supplierList = document.getElementById('transaksi-supplier-list');
                if (pelangganList) {
                    Array.from(pelangganList.options).forEach(opt => {
                        const key = normalizePelangganName(opt.value);
                        if (key) existingPartnerSets.pelangganSet.add(key);
                    });
                }
                if (supplierList) {
                    Array.from(supplierList.options).forEach(opt => {
                        const key = normalizePelangganName(opt.value);
                        if (key) existingPartnerSets.supplierSet.add(key);
                    });
                }
            }

            const newPartners = [];
            const seenPartners = {};
            parsedRows.forEach(row => {
                const nama = row.nama_pelanggan_pemasok || '';
                const namaKey = normalizePelangganName(nama);
                const partnerType = row.partner_type === 'supplier' ? 'supplier' : 'pelanggan';
                const seenKey = buildTransaksiPartnerContactKey(nama, partnerType);
                if (!namaKey || seenPartners[seenKey]) return;
                seenPartners[seenKey] = true;
                const targetSet = partnerType === 'supplier' ? existingPartnerSets.supplierSet : existingPartnerSets.pelangganSet;
                if (!targetSet.has(namaKey)) {
                    newPartners.push({ name: nama, partnerType });
                }
            });

            let contactByName = {};
            if (newPartners.length > 0) {
                const contactResult = await collectNewPelangganContacts(newPartners);
                if (!contactResult) {
                    showToast('Penyimpanan dibatalkan.', true);
                    return;
                }
                contactByName = contactResult;
            }

            const items = parsedRows.map(row => {
                const contactKey = buildTransaksiPartnerContactKey(row.nama_pelanggan_pemasok, row.partner_type);
                const contact = contactByName[contactKey] || { alamat: '', noTelepon: '', partnerType: row.partner_type || '' };
                return {
                    ...row,
                    alamat: contact.alamat || '',
                    no_telepon: contact.noTelepon || '',
                    partner_type: contact.partnerType || row.partner_type || ''
                };
            });

            const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
            const payload = {
                session_slug: sessionSlug,
                unit_usaha_id: unitUsahaID,
                items: items
            };

            const btnOriginalText = btnSaveTransaksi.innerHTML;
            btnSaveTransaksi.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
            btnSaveTransaksi.disabled = true;

            fetch('/api/transaksi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(res => {
                if(!res.ok) {
                    return res.text().then(text => { throw new Error(text) });
                }
                return res.text();
            }).then(msg => {
                showToast(msg, false);
                // Reset table to single empty row
                tbody.innerHTML = `
                    <tr data-row-type="main" style="background-color: #f9faf9; border-bottom: 1px solid var(--border);">
                        <td style="padding: 12px 16px; border-right: 1px solid var(--border);">
                            <input type="date" value="${getToday()}" style="width: 100%; border: 1px solid #ddd; background: #ffffff; padding: 6px 8px; border-radius: 4px; font-weight: 500; font-size: 0.9rem;" required>
                        </td>
                        <td style="padding: 12px 16px; border-right: 1px solid var(--border);">
                            <div style="display:grid; grid-template-columns: 170px minmax(0, 1fr); gap:8px; align-items:center;">
                                <select data-field="partner-type" style="width:100%; background:#ffffff; border:1px solid #ddd; border-radius:6px; padding:7px 10px; font-size:0.85rem;" autocomplete="off">
                                    <option value="pelanggan" selected>Pelanggan</option>
                                    <option value="supplier">Supplier / Pemasok</option>
                                </select>
                                <input type="text" data-field="partner-name" list="transaksi-pelanggan-list" style="width: 100%; background: #ffffff; border: 1px solid #ddd; border-radius: 6px; padding: 8px 12px; font-size: 0.9rem;" placeholder="Pilih atau ketik nama pelanggan..." autocomplete="off">
                            </div>
                        </td>
                        <td style="padding: 12px 16px; border-right: 1px solid var(--border); position:relative;">
                            <input type="text" data-field="keterangan" style="width: 100%; border: 1px solid #ddd; background: #ffffff; padding: 6px 8px; border-radius: 4px; font-size: 0.9rem;" placeholder="" required>
                        </td>
                        <td style="padding: 12px 16px; text-align: center;">
                            <button type="button" class="action-btn delete" onclick="removeTransaksiRow(this)" style="border: none; background: none; cursor: pointer; color: #999; font-size: 1.2rem;" title="Hapus baris"><i class="fa-solid fa-xmark"></i></button>
                        </td>
                    </tr>
                    <tr data-row-type="detail" style="display:table-row; background:#f7fbff; border-bottom: 1px solid var(--border);">
                        <td colspan="4" style="padding: 10px 16px 12px 16px; border-top: none;">
                            <div style="display:grid; grid-template-columns: 1.4fr 1fr 1fr 0.8fr 0.7fr 0.7fr; gap:10px; align-items:end;">
                                <div>
                                    <div data-field="mapping-select-wrap" style="display:block; position:relative; margin-top:8px;">
                                        <div style="font-size:0.74rem; font-weight:600; letter-spacing:0.3px; color:#1d4ed8; margin-bottom:4px;">Pilihan Mapping</div>
                                        <input type="text" data-field="mapping-search" style="width:100%; background:#ffffff; border:1px solid #c7d2fe; border-radius:6px; padding:7px 10px; font-size:0.82rem; color:#334155;" placeholder="Cari atau pilih mapping..." autocomplete="off">
                                        <div data-field="mapping-dropdown" style="display:none; position:absolute; top:calc(100% + 4px); left:0; right:0; z-index:40; max-height:220px; overflow:auto; border:1px solid #c7d2fe; border-radius:8px; background:#ffffff; box-shadow:0 12px 24px rgba(15, 23, 42, 0.12);"></div>
                                        <div data-field="mapping-selected-meta" style="margin-top:6px; font-size:0.72rem; font-weight:600; color:var(--text-secondary);">Belum ada mapping yang dipilih</div>
                                        <select data-field="mapping-select" style="display:none;">
                                            <option value="">-</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <div style="font-size:0.74rem; font-weight:600; letter-spacing:0.3px; color:var(--text-secondary); margin-bottom:4px;">Debit</div>
                                    <input type="text" data-field="akun-debet" style="width: 100%; border: 1px solid #ddd; background: #f8fafc; padding: 7px 10px; border-radius: 6px; font-size: 0.84rem; color:#334155;" placeholder="otomatis dari mapping..." readonly>
                                </div>
                                <div>
                                    <div style="font-size:0.74rem; font-weight:600; letter-spacing:0.3px; color:var(--text-secondary); margin-bottom:4px;">Kredit</div>
                                    <input type="text" data-field="akun-kredit" style="width: 100%; border: 1px solid #ddd; background: #f8fafc; padding: 7px 10px; border-radius: 6px; font-size: 0.84rem; color:#334155;" placeholder="otomatis dari mapping..." readonly>
                                </div>
                                <div>
                                    <div style="font-size:0.74rem; font-weight:600; letter-spacing:0.3px; color:var(--text-secondary); margin-bottom:4px;">Nominal</div>
                                    <input type="number" data-field="nominal" style="width: 100%; border: 1px solid #ddd; background: #ffffff; padding: 7px 10px; border-radius: 6px; text-align: right; font-weight: 500; font-size: 0.86rem;" placeholder="0" required>
                                </div>
                                <div>
                                    <div style="font-size:0.74rem; font-weight:600; letter-spacing:0.3px; color:var(--text-secondary); margin-bottom:4px;">Kas Masuk/Kas Keluar</div>
                                    <select data-field="tipe-kas" style="appearance: none; width: 100%; background: #ffffff; border: 1px solid #ddd; border-radius: 6px; padding: 7px 8px; font-weight: 500; font-size: 0.86rem; text-align: center; cursor: pointer;">
                                        <option value="">-</option>
                                        <option value="tambah">Kas Masuk</option>
                                        <option value="kurang">Kas Keluar</option>
                                    </select>
                                </div>
                                <div>
                                    <div style="font-size:0.74rem; font-weight:600; letter-spacing:0.3px; color:var(--text-secondary); margin-bottom:4px;">Tunai/Kredit</div>
                                    <select data-field="status-bayar" style="appearance: none; width: 100%; background: #ffffff; border: 1px solid #ddd; border-radius: 6px; padding: 7px 8px; font-weight: 500; font-size: 0.86rem; text-align: center; cursor: pointer;">
                                        <option value="tunai" selected>Tunai</option>
                                        <option value="kredit">Kredit</option>
                                    </select>
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
                const resetMainRow = tbody.querySelector('tr[data-row-type="main"]');
                if (resetMainRow) {
                    syncTransaksiPartnerInputSource(resetMainRow);
                }
                loadTransaksiHistory();
                navigateTo('/transaksi');
            }).catch(err => {
                if (err && typeof err.message === 'string' && err.message.toLowerCase().includes('maaf stok tidak mencukupi')) {
                    alert(err.message);
                }
                showToast("Gagal menyimpan transaksi: " + err.message, true);
            }).finally(() => {
                btnSaveTransaksi.innerHTML = btnOriginalText;
                btnSaveTransaksi.disabled = false;
            });
        });
    }

    // Profile Data Loading functions
    function loadProfiles() {
        const container = document.getElementById('profile-table-container');
        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        if(container && !container.innerHTML.includes('table')) {
            container.innerHTML = `<div style="text-align:center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat data...</div>`;
        }

        fetch('/api/profiles?session_slug=' + encodeURIComponent(sessionSlug) + '&t=' + new Date().getTime())
            .then(res => res.json())
            .then(data => {
                const sortedProfiles = Array.isArray(data)
                    ? data.slice().sort((left, right) => {
                        const leftTime = new Date(left.UpdatedAt || left.CreatedAt || 0).getTime();
                        const rightTime = new Date(right.UpdatedAt || right.CreatedAt || 0).getTime();
                        if (rightTime !== leftTime) {
                            return rightTime - leftTime;
                        }
                        return Number(right.ID || 0) - Number(left.ID || 0);
                    })
                    : [];
                renderProfileTable(sortedProfiles);
            })
            .catch(err => {
                console.error(err);
                if(container) container.innerHTML = `<div style="color:var(--danger); text-align:center;">Gagal memuat profil.</div>`;
            });
    }

    function editProfileData(identifier) {
        if(profileForm) {
            profileForm.reset();
            setRichTextValue('visi', '');
            setRichTextValue('misi', '');
            const previewContainer = document.getElementById('logo_preview_container');
            if(previewContainer) {
                previewContainer.style.display = 'none';
                document.getElementById('logo_preview').src = '';
            }
        }
        
        let queryParams = isNaN(identifier) ? 'slug=' + identifier : 'id=' + identifier;
        
        fetch('/api/profile?' + queryParams)
            .then(res => res.json())
            .then(data => {
                if(!data || !data.ID) {
                    navigateTo('/profiles');
                    return;
                }

                const idEl = document.getElementById('profile_id');
                if(idEl) idEl.value = data.ID;
                const slugEl = document.getElementById('profile_slug');
                if(slugEl) slugEl.value = data.Slug || '';

                Object.keys(data).forEach(key => {
                    const mappedKey = convertCamelToSnake(key);
                    const input = profileForm.elements[mappedKey];
                    if (input && key !== 'LogoPath' && key !== 'UnitUsaha' && key !== 'TanggalAwalPembukuan' && key !== 'TanggalAkhirPembukuan') {
                        input.value = data[key];
                    }
                });

                if(data.TanggalAwalPembukuan) profileForm.elements['tanggal_awal_pembukuan'].value = data.TanggalAwalPembukuan.split('T')[0];
                if(data.TanggalAkhirPembukuan) profileForm.elements['tanggal_akhir_pembukuan'].value = data.TanggalAkhirPembukuan.split('T')[0];
                setRichTextValue('visi', data.Visi || '');
                setRichTextValue('misi', data.Misi || '');

                if (data.LogoPath) {
                    const previewContainer = document.getElementById('logo_preview_container');
                    const previewImage = document.getElementById('logo_preview');
                    if(previewContainer && previewImage) {
                        previewImage.src = data.LogoPath;
                        previewContainer.style.display = 'block';
                    }
                }

                if (data.UnitUsaha && data.UnitUsaha.length > 0 && unitUsahaList) {
                     unitUsahaList.innerHTML = ''; 
                     data.UnitUsaha.forEach((unit) => {
                         const newBlock = document.createElement('div');
                         newBlock.className = 'form-grid unit-usaha-item';
                         newBlock.style.position = 'relative';
                         newBlock.style.marginBottom = '20px';
                         newBlock.style.paddingBottom = '20px';
                         newBlock.style.borderBottom = '1px dashed var(--border)';

                         const removeBtnHTML = `<button type="button" class="btn-remove-unit" style="position:absolute; right:0; top:-10px; background:none; border:none; color:#EF4444; font-size:1.2rem; cursor:pointer;" title="Hapus Unit"><i class="fa-solid fa-circle-xmark"></i></button>`;

                         newBlock.innerHTML = `
                             ${removeBtnHTML}
                             <input type="hidden" name="unit_usaha_id[]" value="${unit.ID || ''}">
                             <div class="form-group">
                                 <label>Nama Unit Usaha <span class="req">*</span></label>
                                 <input type="text" name="nama_unit_usaha[]" value="${unit.NamaUnitUsaha || ''}" required>
                             </div>
                             <div class="form-group">
                                 <label>Bidang Usaha</label>
                                 <input type="text" name="bidang_usaha[]" value="${unit.BidangUsaha || ''}">
                             </div>
                             <div class="form-group">
                                 <label>Penanggung Jawab <span class="req">*</span></label>
                                 <input type="text" name="penanggung_jawab[]" value="${unit.PenanggungJawab || ''}" required>
                             </div>
                             <div class="form-group">
                                 <label>Mata Uang</label>
                                 <input type="text" name="mata_uang[]" value="${unit.MataUang || 'Rp'}" readonly style="background-color:#eee;">
                             </div>
                             <div class="form-group">
                                 <label>Tanggal Daftar <span class="req">*</span></label>
                                 <input type="date" name="tanggal_daftar[]" value="${unit.TanggalDaftar ? unit.TanggalDaftar.split('T')[0] : ''}" required>
                             </div>
                             <div class="form-group">
                                 <label>Status</label>
                                 <input type="text" name="status_unit[]" value="${unit.Status || 'Aktif'}">
                             </div>
                         `;

                         if (typeof window.bindUnitRemoveAction === 'function') {
                             window.bindUnitRemoveAction(newBlock, unit.ID || 0);
                         } else {
                             newBlock.querySelector('.btn-remove-unit').addEventListener('click', function() {
                                 newBlock.remove();
                             });
                         }
                         unitUsahaList.appendChild(newBlock);
                     });
                 } else if(unitUsahaList) {
                     unitUsahaList.innerHTML = '';
                     if(btnAddUnit) btnAddUnit.click();
                 }
            })
            .catch(err => {
                console.error(err);
                showToast('Gagal memuat profil', true);
            });
    }

    // Expose table inline functions to window
    window.editProfile = function(identifier) {
        navigateTo('/profile/edit/' + identifier);
    };

    window.deleteProfile = function(id) {
        window.showConfirmModal('Apakah Anda yakin ingin menghapus profil ini beserta seluruh unit usahanya?', () => {
            fetch('/api/profile?id=' + id, {
                method: 'DELETE'
            })
            .then(res => {
                if(res.ok) {
                    showToast('Profil berhasil dihapus');
                    // Already in /profiles view, so just reload data
                    loadProfiles();
                } else {
                    showToast('Gagal menghapus profil', true);
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Kesalahan jaringan', true);
            });
        });
    };

    window.toggleDetail = function(idx) {
        const detailRow = document.getElementById('detail-row-' + idx);
        if(detailRow) {
            detailRow.classList.toggle('open');
        }
    };

    function renderProfileTable(profiles) {
        const container = document.getElementById('profile-table-container');
        if(!container) return;

        if (profiles.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-secondary);">
                <i class="fa-solid fa-building fa-3x" style="margin-bottom:16px;"></i>
                <p>Belum ada data profil BUMDes terdaftar.</p>
            </div>`;
            return;
        }

        const roleId = localStorage.getItem('sibumdes_role_id');
        const loggedProfileId = localStorage.getItem('sibumdes_profile_id');
        const canDeleteProfile = (roleId === "1" && !loggedProfileId);

        let tableRows = '';
        profiles.forEach((p, idx) => {
            // Main expandable row
            tableRows += `
                <tr class="expandable-row" onclick="toggleDetail(${idx})" style="border-bottom:1px solid var(--border);">
                    <td style="padding:12px;color:var(--text-secondary);">${idx + 1}</td>
                    <td style="padding:12px;color:var(--text-secondary);">${p.LogoPath ? `<img src="${p.LogoPath}" style="max-height:40px; border-radius:4px; cursor:zoom-in; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'" onclick="window.showImageModal('${p.LogoPath}', event)" title="Klik untuk memperbesar gambar" />` : '-'}</td>
                    <td style="padding:12px;font-weight:500;color:var(--text-primary);">${p.NamaBUMDes || '-'}</td>
                    <td style="padding:12px;color:var(--text-secondary);">${p.AlamatLengkap || '-'}</td>
                    <td style="padding:12px;color:var(--text-secondary);">${p.NomorTelepon || '-'}</td>
                    <td style="padding:12px;color:var(--text-secondary);">${p.KetuaBUMDes || p.NamaKetuaBUMDes || '-'}</td>
                    <td style="padding:12px;text-align:center;" onclick="event.stopPropagation();">
                        <button class="action-btn edit" title="Edit Profil" onclick="editProfile('${p.Slug || p.ID}')" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:6px;background:#e3f2fd;color:#1976d2;margin-right:6px;"><i class="fa-solid fa-pen"></i></button>
                        ${canDeleteProfile ? `<button class="action-btn delete" title="Hapus Profil" onclick="deleteProfile(${p.ID})" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:6px;background:#ffebee;color:#c62828;"><i class="fa-solid fa-trash"></i></button>` : `<button class="action-btn delete" title="Hanya Pengembang yang bisa menghapus Profil" disabled style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:6px;background:#ffebee;color:#c62828;opacity:0.3;cursor:not-allowed;"><i class="fa-solid fa-trash"></i></button>`}
                    </td>
                </tr>
            `;

            // Formatting detail content (Unit Usaha)
            let unitsHTML = '';
            if(p.UnitUsaha && p.UnitUsaha.length > 0) {
                unitsHTML = `<div class="detail-section"><div class="detail-title"><i class="fa-solid fa-store"></i> Daftar Unit Usaha Utama</div><div class="unit-list">`;
                p.UnitUsaha.forEach(unit => {
                    let badgeClass = (unit.Status && unit.Status.toLowerCase() === 'aktif') ? 'badge-active' : 'badge-inactive';
                    unitsHTML += `
                        <div class="unit-item">
                            <div class="unit-header">
                                <strong>${unit.NamaUnitUsaha}</strong>
                                <span class="badge-outline ${badgeClass}">${unit.Status || 'Tidak Diketahui'}</span>
                            </div>
                            <div class="unit-meta">
                                <span><i class="fa-solid fa-briefcase"></i> ${unit.BidangUsaha || 'Tidak spesifik'}</span>
                                <span><i class="fa-solid fa-user"></i> ${unit.PenanggungJawab}</span>
                                <span><i class="fa-solid fa-money-bill"></i> ${unit.MataUang || 'Rp'}</span>
                            </div>
                        </div>
                    `;
                });
                unitsHTML += `</div></div>`;
            } else {
                unitsHTML = `<div class="detail-section"><div class="detail-title"><i class="fa-solid fa-store"></i> Daftar Unit Usaha Utama</div><div class="detail-text" style="text-align:center; font-style: italic; color: #999;">Belum ada unit usaha terdaftar.</div></div>`;
            }

            // Hidden detail row
            tableRows += `
                <tr id="detail-row-${idx}" class="detail-row" style="background:#fbfbfb; border-bottom:1px solid var(--border);">
                    <td colspan="7" style="padding:0;">
                        <div class="detail-content">
                            <div class="detail-grid">
                                <div class="detail-section">
                                    <div class="detail-title"><i class="fa-solid fa-bullseye"></i> Visi</div>
                                    <div class="detail-text">${renderRichTextDetail(p.Visi)}</div>
                                    <div class="detail-title" style="margin-top: 16px;"><i class="fa-solid fa-rocket"></i> Misi</div>
                                    <div class="detail-text">${renderRichTextDetail(p.Misi)}</div>
                                    <div class="detail-title" style="margin-top: 16px;"><i class="fa-solid fa-sitemap"></i> Struktur Organisasi</div>
                                    <div class="detail-text">
                                        <div><strong>Ketua BUMDes:</strong> ${p.NamaKetuaBUMDes || p.KetuaBUMDes || '-'}</div>
                                        <div><strong>Sekretaris BUMDes:</strong> ${p.SekretarisBUMDes || '-'}</div>
                                        <div><strong>Bendahara BUMDes:</strong> ${p.BendaharaBUMDes || '-'}</div>
                                        <div><strong>Pendamping BUMDes:</strong> ${p.PendampingBUMDes || '-'}</div>
                                        <div><strong>Pengawas BUMDes:</strong> ${p.PengawasBUMDes || '-'}</div>
                                    </div>
                                </div>
                                ${unitsHTML}
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        });

        container.innerHTML = `
            <div style="overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-md);">
                <table class="data-table" style="width:100%;border-collapse:collapse;text-align:left;min-width:1040px;">
                    <thead>
                        <tr style="background:#f5f5f5;border-bottom:2px solid var(--border);">
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);white-space:nowrap;">No</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Logo</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Nama BUMDes</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Alamat</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Telepon</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Ketua</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:center;white-space:nowrap;">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
    }

    if(profileForm) {
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            syncAllRichTextEditors();
            const visiInstance = richTextEditors.visi;
            const misiInstance = richTextEditors.misi;
            const visiValue = visiInstance ? visiInstance.input.value : '';
            const misiValue = misiInstance ? misiInstance.input.value : '';

            if (!visiValue || !visiValue.trim()) {
                showToast('Visi wajib diisi.', true);
                if (visiInstance) visiInstance.editor.focus();
                return;
            }

            if (!misiValue || !misiValue.trim()) {
                showToast('Misi wajib diisi.', true);
                if (misiInstance) misiInstance.editor.focus();
                return;
            }
            const formData = new FormData(profileForm);
            
            fetch('/api/profile', {
                method: 'POST',
                body: formData
            })
            .then(res => {
                if (res.ok) {
                    showToast('Data Profil berhasil disimpan! ✅');
                    navigateTo('/profiles');
                    loadProfiles();
                } else {
                    res.text().then(t => showToast('Gagal menyimpan: ' + t, true));
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Terjadi kesalahan jaringan.', true);
            });
        });
    }

    function loadGeminiSettings() {
        const hintEl = document.getElementById('gemini_key_hint');
        if(hintEl) hintEl.textContent = 'Memuat status key...';

        const token = localStorage.getItem('sibumdes_auth');
        fetch('/api/settings/gemini-key?session_slug=' + (token || ''), {
            headers: token ? { 'Authorization': 'Bearer ' + token } : {}
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error('Gagal mengambil pengaturan key');
                }
                return res.json();
            })
            .then(data => {
                if(!hintEl) return;
                if(data && data.has_key) {
                    hintEl.textContent = 'Key saat ini tersimpan: ' + (data.masked_key || '***');
                } else {
                    hintEl.textContent = 'Belum ada GEMINI_API_KEY tersimpan.';
                }
            })
            .catch(err => {
                console.error(err);
                if(hintEl) hintEl.textContent = 'Gagal memuat status key.';
            });
    }

    if(settingsForm) {
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const inputEl = document.getElementById('gemini_api_key');
            const key = inputEl ? inputEl.value.trim() : '';
            if(!key) {
                showToast('GEMINI_API_KEY wajib diisi.', true);
                return;
            }

            const token = localStorage.getItem('sibumdes_auth');
            fetch('/api/settings/gemini-key?session_slug=' + (token || ''), {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': 'Bearer ' + token } : {})
                },
                body: JSON.stringify({ gemini_api_key: key })
            })
            .then(async res => {
                const text = await res.text();
                if (!res.ok) {
                    throw new Error(text || 'Gagal menyimpan key');
                }
                showToast(text || 'GEMINI_API_KEY berhasil disimpan.');
                if(inputEl) inputEl.value = '';

                // Service restart is triggered by backend; reload UI shortly after.
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            })
            .catch(err => {
                console.error(err);
                showToast('Gagal menyimpan key: ' + err.message, true);
            });
        });
    }

    function convertCamelToSnake(str) {
        const mapping = {
            'NamaBUMDes': 'nama_bumdes',
            'AlamatLengkap': 'alamat_lengkap',
            'NomorTelepon': 'nomor_telepon',
            'NomorIzinUsaha': 'nomor_izin_usaha',
            'Visi': 'visi',
            'Misi': 'misi',
            'NamaKetuaBUMDes': 'nama_ketua_bumdes',
            'SekretarisBUMDes': 'sekretaris_bumdes',
            'BendaharaBUMDes': 'bendahara_bumdes',
            'PendampingBUMDes': 'pendamping_bumdes',
            'PengawasBUMDes': 'pengawas_bumdes'
        };
        return mapping[str] || str;
    }

    // Execute Router on Page Load
    router();

    // ===================================
    // ROLE / HAK AKSES LOGIC
    // ===================================
    function loadRoles() {
        const container = document.getElementById('role-table-container');
        if(container && !container.innerHTML.includes('table')) {
            container.innerHTML = `<div style="text-align:center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat data...</div>`;
        }

        fetch('/api/roles?t=' + new Date().getTime())
            .then(res => res.json())
            .then(data => {
                renderRoleTable(data || []);
            })
            .catch(err => {
                console.error(err);
                if(container) container.innerHTML = `<div style="color:var(--danger); text-align:center;">Gagal memuat peran.</div>`;
            });
    }

    function renderRoleTable(roles) {
        const container = document.getElementById('role-table-container');
        if(!container) return;

        if (roles.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-secondary);">
                <i class="fa-solid fa-shield fa-3x" style="margin-bottom:16px;"></i>
                <p>Belum ada role/hak akses yang terdaftar.</p>
            </div>`;
            return;
        }

        let tableRows = '';
        roles.forEach((r, idx) => {
            // formatting multiline string to bullets
            const lines = (r.DeskripsiHakAkses || '').split('\n').filter(x => x.trim() !== '');
            const bullets = lines.map(line => `<li>${line}</li>`).join('');

            tableRows += `
                <tr>
                    <td style="width: 50px;">${idx + 1}</td>
                    <td style="width: 250px;"><strong>${r.NamaPeran || '-'}</strong></td>
                    <td>
                        <ul style="margin: 0; padding-left: 20px; font-size: 0.9rem;">
                            ${bullets || '<li>Tidak ada deskripsi spesifik.</li>'}
                        </ul>
                    </td>
                    <td style="text-align:center; width: 120px;">
                        <button class="action-btn edit" title="Edit Peran" onclick="window.editRoleAction(${r.ID})"><i class="fa-solid fa-pen"></i></button>
                        <button class="action-btn delete" title="Hapus Peran" onclick="window.deleteRoleAction(${r.ID})"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });

        container.innerHTML = `
            <div class="table-responsive">
                <table class="data-table" style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border);">
                            <th>No</th>
                            <th>Nama Peran</th>
                            <th>Ketentuan Akses Menu/Fungsi</th>
                            <th style="text-align:center;">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
    }

    window.editRoleAction = function(id) {
        navigateTo('/role/edit/' + id);
    };

    function editRoleData(id) {
        if(roleForm) roleForm.reset();
        fetch('/api/role?id=' + id)
            .then(res => res.json())
            .then(data => {
                if(!data || !data.ID) {
                    navigateTo('/roles');
                    return;
                }
                const idEl = document.getElementById('role_id');
                if(idEl) idEl.value = data.ID;
                const namaEl = document.getElementById('nama_peran');
                if(namaEl) namaEl.value = data.NamaPeran;
                const descEl = document.getElementById('deskripsi_hak_akses');
                if(descEl) descEl.value = data.DeskripsiHakAkses;
            })
            .catch(err => {
                console.error(err);
                showToast('Gagal memuat peran', true);
            });
    }

    window.deleteRoleAction = function(id) {
        showConfirmModal('Apakah Anda yakin ingin menghapus hak akses ini? Tindakan ini akan mencabut hak pengguna terkait.', () => {
            fetch('/api/role?id=' + id, { method: 'DELETE' })
            .then(res => {
                if(res.ok) {
                    showToast('Peran berhasil dihapus');
                    loadRoles();
                } else {
                    showToast('Gagal menghapus peran', true);
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Kesalahan jaringan', true);
            });
        });
    };

    if(roleForm) {
        roleForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const urlEncodedData = new URLSearchParams(new FormData(roleForm)).toString();
            
            fetch('/api/role', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: urlEncodedData
            })
            .then(res => {
                if (res.ok) {
                    showToast('Data Peran berhasil disimpan! ✅');
                    navigateTo('/roles');
                } else {
                    res.text().then(t => showToast('Gagal menyimpan: ' + t, true));
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Terjadi kesalahan jaringan.', true);
            });
        });
    }

    // ===================================
    // USER MANAGEMENT LOGIC
    // ===================================
    function loadUserProfileBumdesDropdown(selectedProfileId = null) {
        const selectEl = document.getElementById('user_profile_bumdes_id');
        if(!selectEl) return;
        
        fetch('/api/profiles')
            .then(res => res.json())
            .then(data => {
                const loggedProfileId = localStorage.getItem('sibumdes_profile_id');
                let options = '';
                
                // Jika tidak punya ID (sebagai Pengembang), tampilkan opsi global
                if (!loggedProfileId) {
                    options += `<option value="">-- Pengembang (Akses Global) --</option>`;
                }

                if (data && data.length > 0) {
                    data.forEach(p => {
                        // Jika Admin BUMDes, sembunyikan BUMDes orang lain dari pilihan formnya
                        if (loggedProfileId && loggedProfileId != p.ID) return;
                        
                        // Tandai terpilih
                        const isSelected = (selectedProfileId == p.ID) || (loggedProfileId == p.ID) ? 'selected' : '';
                        options += `<option value="${p.ID}" ${isSelected}>${p.NamaBUMDes}</option>`;
                    });
                }
                selectEl.innerHTML = options;
            })
            .catch(err => {
                console.error('Error loading profiles dropdown:', err);
                selectEl.innerHTML = `<option value="">Gagal memuat BUMDes</option>`;
            });
    }

    function loadRolesDropdown(selectedRoleId = null) {
        const selectEl = document.getElementById('user_role');
        if(!selectEl) return;

        fetch('/api/roles?t=' + new Date().getTime())
            .then(res => res.json())
            .then(roles => {
                let options = `<option value="">-- Pilih Peran Hak Akses --</option>`;
                if(roles && roles.length) {
                    roles.forEach(r => {
                        const sel = (selectedRoleId && selectedRoleId == r.ID) ? 'selected' : '';
                        options += `<option value="${r.ID}" ${sel}>${r.NamaPeran}</option>`;
                    });
                }
                selectEl.innerHTML = options;
            })
            .catch(err => {
                console.error('Error loading roles dropdown:', err);
                selectEl.innerHTML = `<option value="">Gagal memuat peran</option>`;
            });
    }

    function loadUsers() {
        const container = document.getElementById('user-table-container');
        if(container && !container.innerHTML.includes('table')) {
            container.innerHTML = `<div style="text-align:center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat data pengguna...</div>`;
        }
        
        const token = localStorage.getItem('sibumdes_auth');
        fetch('/api/users?t=' + new Date().getTime() + (token ? '&session_slug=' + token : ''))
            .then(res => res.json())
            .then(data => {
                renderUserTable(data || []);
            })
            .catch(err => {
                console.error(err);
                if(container) container.innerHTML = `<div style="color:var(--danger); text-align:center;">Gagal memuat pengguna.</div>`;
            });
    }

    function renderUserTable(users) {
        const container = document.getElementById('user-table-container');
        if(!container) return;

        if (users.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-secondary);">
                <i class="fa-solid fa-users fa-3x" style="margin-bottom:16px;"></i>
                <p>Belum ada data pengguna yang terdaftar.</p>
            </div>`;
            return;
        }

        let tableRows = '';
        users.forEach((u, idx) => {
            const roleName = (u.Role && u.Role.NamaPeran) ? u.Role.NamaPeran : 'Tidak diketahui';
            let bumdesBadge = '<span class="badge" style="background:#fee2e2; color:#dc2626;">PENGEMBANG</span>';
            if (u.ProfileBUMDes && u.ProfileBUMDes.NamaBUMDes) {
                bumdesBadge = `<span class="badge" style="background:var(--bg-secondary); color:var(--text-secondary);">${u.ProfileBUMDes.NamaBUMDes}</span>`;
            }
            tableRows += `
                <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:12px;color:var(--text-secondary);">${idx + 1}</td>
                    <td style="padding:12px;font-weight:500;color:var(--text-primary);">${u.Nama || '-'}</td>
                    <td style="padding:12px;color:var(--text-secondary);">${bumdesBadge}</td>
                    <td style="padding:12px;white-space: nowrap;"><span class="badge-outline badge-active">${roleName}</span></td>
                    <td style="padding:12px;color:var(--text-secondary);">${u.NIK || '-'}</td>
                    <td style="padding:12px;color:var(--text-secondary);">${u.NoHP || '-'}</td>
                    <td style="padding:12px;text-align:center;white-space:nowrap;">
                        <button class="action-btn edit" title="Edit Pengguna" onclick="window.editUserAction('${u.Slug || u.ID}')"><i class="fa-solid fa-pen"></i></button>
                        <button class="action-btn delete" title="Hapus Pengguna" onclick="window.deleteUserAction(${u.ID})"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });

        container.innerHTML = `
            <div style="overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-md);">
                <table class="data-table" style="width:100%;border-collapse:collapse;text-align:left;min-width:980px;">
                    <thead>
                        <tr style="background:#f5f5f5;border-bottom:2px solid var(--border);">
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);white-space:nowrap;">No</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Nama</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Profil BUMDes</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Peran / Hak Akses</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">NIK</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">No HP</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:center;white-space:nowrap;">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
    }

    window.editUserAction = function(identifier) {
        navigateTo('/user/edit/' + identifier);
    };

    function editUserData(identifier) {
        const userForm = document.getElementById('userForm');
        if(userForm) userForm.reset();
        
        loadRolesDropdown(); // preload while fetching user
        loadUserProfileBumdesDropdown(); // preload bumdes list

        let queryParams = isNaN(identifier) ? 'slug=' + identifier : 'id=' + identifier;

        fetch('/api/user?' + queryParams)
            .then(res => res.json())
            .then(data => {
                if(!data || !data.ID) {
                    navigateTo('/users');
                    return;
                }
                const idEl = document.getElementById('user_id');
                if(idEl) idEl.value = data.ID;
                
                const namaEl = document.getElementById('user_nama');
                if(namaEl) namaEl.value = data.Nama;
                
                const roleEl = document.getElementById('user_role');
                if(roleEl) {
                    loadRolesDropdown(data.RoleID);
                }
                
                const profileBumdesEl = document.getElementById('user_profile_bumdes_id');
                if(profileBumdesEl) {
                     loadUserProfileBumdesDropdown(data.ProfileBUMDesID);
                }
                
                const nikEl = document.getElementById('user_nik');
                if(nikEl) nikEl.value = data.NIK;
                
                const hppEl = document.getElementById('user_nohp');
                if(hppEl) hppEl.value = data.NoHP;
            })
            .catch(err => {
                console.error(err);
                showToast('Gagal memuat pengguna', true);
            });
    }

    window.deleteUserAction = function(id) {
        window.showConfirmModal('Apakah Anda yakin ingin menghapus pengguna/user ini?', () => {
            fetch('/api/user?id=' + id, { method: 'DELETE' })
            .then(res => {
                if(res.ok) {
                    showToast('Pengguna berhasil dihapus');
                    loadUsers();
                } else {
                    showToast('Gagal menghapus pengguna', true);
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Kesalahan jaringan', true);
            });
        });
    };

    const userForm = document.getElementById('userForm');
    if(userForm) {
        userForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const urlEncodedData = new URLSearchParams(new FormData(userForm)).toString();
            
            fetch('/api/user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: urlEncodedData
            })
            .then(res => {
                if (res.ok) {
                    showToast('Data Pengguna berhasil disimpan! ✅');
                    navigateTo('/users');
                } else {
                    res.text().then(t => showToast('Gagal menyimpan: ' + t, true));
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Terjadi kesalahan jaringan.', true);
            });
        });
    }

    // ===================================
    // PELANGGAN LOGIC
    // ===================================
    function getPelangganTableState() {
        if (!globalThis.__sibumdesPelangganTableState) {
            globalThis.__sibumdesPelangganTableState = {
                items: [],
                searchTerm: '',
            };
        }
        return globalThis.__sibumdesPelangganTableState;
    }

    function capturePelangganListViewState() {
        const pelangganTableState = getPelangganTableState();
        const tableWrapper = document.querySelector('#pelanggan-table-container > div');
        const contentWrapper = document.querySelector('.content-wrapper');
        globalThis.__sibumdesPelangganListViewState = {
            searchTerm: pelangganTableState.searchTerm,
            tableScrollLeft: tableWrapper ? tableWrapper.scrollLeft : 0,
            tableScrollTop: tableWrapper ? tableWrapper.scrollTop : 0,
            contentScrollTop: contentWrapper ? contentWrapper.scrollTop : 0,
        };
    }

    function restorePelangganListViewState() {
        const state = globalThis.__sibumdesPelangganListViewState;
        if (!state) return;

        const pelangganTableState = getPelangganTableState();
        if (typeof state.searchTerm === 'string') {
            pelangganTableState.searchTerm = state.searchTerm;
        }

        requestAnimationFrame(() => {
            const tableWrapper = document.querySelector('#pelanggan-table-container > div');
            const contentWrapper = document.querySelector('.content-wrapper');
            if (tableWrapper) {
                tableWrapper.scrollLeft = state.tableScrollLeft || 0;
                tableWrapper.scrollTop = state.tableScrollTop || 0;
            }
            if (contentWrapper) {
                contentWrapper.scrollTop = state.contentScrollTop || 0;
            }
        });
    }

    function returnToPelangganList(options = {}) {
        const preserveSearch = options.preserveSearch !== false;
        const pelangganTableState = getPelangganTableState();
        const pelangganView = document.getElementById('pelanggan-view');
        const pelangganDataView = document.getElementById('pelanggan-data-view');
        const pageTitle = document.getElementById('page-title');

        if (pelangganView) pelangganView.style.display = 'none';
        if (pelangganDataView) pelangganDataView.style.display = 'block';
        if (pageTitle) pageTitle.textContent = 'Data Pelanggan';
        if (!preserveSearch) {
            pelangganTableState.searchTerm = '';
        }

        history.replaceState(null, null, '/pelanggan');
        setupPelangganTableSearch();

        if (Array.isArray(pelangganTableState.items) && pelangganTableState.items.length > 0) {
            renderPelangganTable();
            restorePelangganListViewState();
            return;
        }

        loadPelanggan({ preserveSearch });
    }

    function openPelangganEditView(slug, options = {}) {
        const pelangganView = document.getElementById('pelanggan-view');
        const pelangganDataView = document.getElementById('pelanggan-data-view');
        const pageTitle = document.getElementById('page-title');

        if (pelangganDataView) pelangganDataView.style.display = 'none';
        if (pelangganView) pelangganView.style.display = 'block';
        if (pageTitle) pageTitle.textContent = 'Edit Pelanggan';

        if (options.updateHistory !== false) {
            history.pushState(null, null, '/pelanggan/edit/' + slug);
        }

        applyPelangganFormDefaults();
        setupPelangganSaldoAwalInput();
        editPelangganData(slug);
    }

    function setupPelangganTableActions() {
        const container = document.getElementById('pelanggan-table-container');
        if (!container || container.dataset.actionsBound === 'true') return;

        container.addEventListener('click', (event) => {
            const actionButton = event.target.closest('[data-pelanggan-action]');
            if (!actionButton || !container.contains(actionButton)) return;

            event.preventDefault();
            event.stopPropagation();

            const actionName = actionButton.getAttribute('data-pelanggan-action');
            const slug = actionButton.getAttribute('data-pelanggan-slug') || '';
            if (!slug) return;

            if (actionName === 'edit') {
                window.editPelangganAction(slug);
                return;
            }

            if (actionName === 'delete') {
                window.deletePelangganAction(slug);
            }
        }, true);

        container.dataset.actionsBound = 'true';
    }

    function mergePelangganTableItem(updatedItem) {
        if (!updatedItem || !updatedItem.slug) return;
        const pelangganTableState = getPelangganTableState();
        const items = Array.isArray(pelangganTableState.items) ? pelangganTableState.items.slice() : [];
        const targetIndex = items.findIndex((item) => item && item.slug === updatedItem.slug);
        if (targetIndex >= 0) {
            items[targetIndex] = updatedItem;
        } else {
            items.unshift(updatedItem);
        }
        pelangganTableState.items = items;
    }

    function removePelangganTableItem(slug) {
        const pelangganTableState = getPelangganTableState();
        const items = Array.isArray(pelangganTableState.items) ? pelangganTableState.items : [];
        pelangganTableState.items = items.filter((item) => item && item.slug !== slug);
    }

    function triggerImmediatePelangganAction(event, actionName, slug) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        globalThis.__sibumdesPelangganImmediateAction = {
            name: actionName,
            slug,
            expiresAt: Date.now() + 400,
        };

        if (typeof window[actionName] === 'function') {
            window[actionName](slug);
        }
    }
    window.triggerImmediatePelangganAction = triggerImmediatePelangganAction;

    function shouldSkipImmediatePelangganAction(actionName, slug) {
        const state = globalThis.__sibumdesPelangganImmediateAction;
        if (!state) return false;
        const shouldSkip = state.name === actionName && state.slug === slug && Date.now() <= state.expiresAt;
        if (shouldSkip) {
            globalThis.__sibumdesPelangganImmediateAction = null;
        }
        return shouldSkip;
    }
    window.shouldSkipImmediatePelangganAction = shouldSkipImmediatePelangganAction;

    function getPelangganSearchInputs() {
        return [
            document.getElementById('top-header-search-input'),
            document.getElementById('pelanggan-search-input'),
        ].filter(Boolean);
    }

    function syncPelangganSearchInputs(value) {
        getPelangganSearchInputs().forEach((inputEl) => {
            if (inputEl.value !== value) {
                inputEl.value = value;
            }
        });
    }

    function handlePelangganSearchChange(event) {
        const pelangganTableState = getPelangganTableState();
        pelangganTableState.searchTerm = event && event.target ? (event.target.value || '') : '';
        syncPelangganSearchInputs(pelangganTableState.searchTerm);
        renderPelangganTable();
    }

    function setupPelangganTableSearch() {
        const pelangganTableState = getPelangganTableState();
        const searchInputs = getPelangganSearchInputs();
        if (!searchInputs.length) return;

        syncPelangganSearchInputs(pelangganTableState.searchTerm);

        searchInputs.forEach((searchInput) => {
            if (searchInput.dataset.bound === 'true') return;

            ['input', 'search'].forEach((eventName) => {
                searchInput.addEventListener(eventName, handlePelangganSearchChange);
            });
            searchInput.dataset.bound = 'true';
        });
    }

    function loadPelanggan(options = {}) {
        const preserveSearch = Boolean(options && options.preserveSearch);
        const pelangganTableState = getPelangganTableState();
        const container = document.getElementById('pelanggan-table-container');
        if (!preserveSearch) {
            pelangganTableState.searchTerm = '';
        }
        setupPelangganTableSearch();
        setupPelangganTableActions();
        if(container && !container.innerHTML.includes('table')) {
            container.innerHTML = `<div style="text-align:center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat data...</div>`;
        }

        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        fetch('/api/pelanggans?session_slug=' + sessionSlug + '&t=' + new Date().getTime())
            .then(res => res.json())
            .then(data => {
                pelangganTableState.items = Array.isArray(data) ? data : [];
                renderPelangganTable();
            })
            .catch(err => {
                console.error(err);
                if(container) container.innerHTML = `<div style="color:var(--danger); text-align:center;">Gagal memuat pelanggan.</div>`;
            });
    }

    function getFilteredPelangganItems() {
        const pelangganTableState = getPelangganTableState();
        const items = Array.isArray(pelangganTableState.items) ? pelangganTableState.items : [];
        const keyword = String(pelangganTableState.searchTerm || '').trim().toLowerCase();
        if (!keyword) return items;

        return items.filter((p) => {
            const unitName = p.unit_usaha && p.unit_usaha.NamaUnitUsaha ? p.unit_usaha.NamaUnitUsaha : '';
            const bumdesName = p.profile_bumdes && p.profile_bumdes.NamaBUMDes ? p.profile_bumdes.NamaBUMDes : '';
            const status = normalizePelangganStatus(p.status);
            const saldoAwal = formatPelangganCurrency(p.saldo_awal);
            const linkAkun = String(p.link_akun || '-').trim() || '-';
            const bkPembantuPiutang = p.bk_pembantu_piutang ? 'ya aktif true 1' : 'tidak nonaktif false 0';
            const haystack = [
                bumdesName,
                unitName,
                p.kode_pelanggan,
                p.nama_pelanggan,
                p.alamat,
                p.no_telepon,
                status,
                saldoAwal,
                linkAkun,
                bkPembantuPiutang,
            ].map((value) => String(value || '').toLowerCase()).join(' ');
            return haystack.includes(keyword);
        });
    }

    function normalizePelangganStatus(value) {
        const normalized = String(value || '').trim();
        return normalized || 'Aktif';
    }

    function formatPelangganCurrency(value) {
        const numericValue = Number(value) || 0;
        return `Rp${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(numericValue)}`;
    }

    var activePelangganBpPiutangSlug = null;

    function getPelangganBpPiutangButtonStyle(isActive) {
        if (isActive) {
            return 'display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:#ca8a04;color:#fff;border:none;cursor:pointer;box-shadow:0 10px 20px rgba(202,138,4,0.28);outline:2px solid rgba(202,138,4,0.2);outline-offset:2px;';
        }
        return 'display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:#0f766e;color:#fff;border:none;cursor:pointer;box-shadow:0 8px 18px rgba(15,118,110,0.18);';
    }

    function updatePelangganBpPiutangButtonState() {
        const buttons = document.querySelectorAll('#pelanggan-table-container button[data-pelanggan-bp-piutang="true"]');
        buttons.forEach((button) => {
            const isActive = button.dataset.pelangganSlug === activePelangganBpPiutangSlug;
            button.setAttribute('style', getPelangganBpPiutangButtonStyle(isActive));
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            button.title = isActive
                ? `Buku pembantu piutang ${button.dataset.pelangganNama || 'pelanggan'} sedang dibuka`
                : `Lihat buku pembantu piutang ${button.dataset.pelangganNama || 'pelanggan'}`;
        });
    }

    function renderBukuPembantuPiutangTable(groups, options = {}) {
        const container = options.container || document.getElementById(options.containerId || 'transaksi-subledger-table-container');
        if (!container) return;

        const emptyMessage = options.emptyMessage || 'Belum ada data buku pembantu piutang untuk pelanggan yang dipilih.';
        if (!groups || groups.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-book-open-reader fa-3x" style="margin-bottom:16px;"></i><p>${escapeHTML(emptyMessage)}</p></div>`;
            return;
        }

        const blocks = groups.map((group) => {
            const bodyRows = (group.rows || []).map((row) => `
                <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:10px 12px;border-right:1px solid var(--border);white-space:nowrap;color:var(--text-secondary);">${escapeHTML(formatJurnalWorkbookDate(row.tanggal))}</td>
                    <td style="padding:10px 12px;border-right:1px solid var(--border);color:var(--text-secondary);">${escapeHTML(row.deskripsi || '-')}</td>
                    <td style="padding:10px 12px;border-right:1px solid var(--border);color:var(--text-primary);">${escapeHTML(row.keterangan || '-')}</td>
                    <td style="padding:10px 12px;border-right:1px solid var(--border);white-space:nowrap;color:var(--text-secondary);">${escapeHTML(row.ref_transaksi || '-')}</td>
                    <td style="padding:10px 12px;border-right:1px solid var(--border);text-align:right;color:var(--text-primary);font-weight:600;white-space:nowrap;">${row.masuk ? escapeHTML(formatJurnalWorkbookCurrency(row.masuk)) : '-'}</td>
                    <td style="padding:10px 12px;border-right:1px solid var(--border);text-align:right;color:var(--text-primary);font-weight:600;white-space:nowrap;">${row.keluar ? escapeHTML(formatJurnalWorkbookCurrency(row.keluar)) : '-'}</td>
                    <td style="padding:10px 12px;text-align:right;color:var(--text-primary);font-weight:700;white-space:nowrap;background:#f8fafc;">${escapeHTML(formatJurnalWorkbookCurrency(typeof row.saldo_piutang === 'number' ? row.saldo_piutang : 0))}</td>
                </tr>`).join('');

            const linkAkun = String(group.link_akun || '').trim() || '-';
            return `
                <div style="margin-bottom:28px; overflow-x:auto; border:1px solid var(--border); border-radius:var(--radius-md);">
                    <table style="width:100%; border-collapse:collapse; text-align:left; min-width:1280px;">
                        <thead>
                            <tr>
                                <th style="background:#dcedc8;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-transform:uppercase;font-size:0.9rem;white-space:nowrap;">BUKU PEMBANTU PIUTANG</th>
                                <th colspan="6" style="background:#dcedc8;padding:12px 16px;border:1px solid var(--border);"></th>
                            </tr>
                            <tr>
                                <th style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;font-size:0.85rem;white-space:nowrap;">Unit Usaha</th>
                                <th colspan="6" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:600;color:var(--text-primary);">${escapeHTML(group.unit_usaha || '-')}</th>
                            </tr>
                            <tr>
                                <th style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;font-size:0.85rem;white-space:nowrap;">Customer</th>
                                <th colspan="6" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:600;color:var(--text-primary);">${escapeHTML(group.pelanggan_name || '-')}</th>
                            </tr>
                            <tr>
                                <th style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;font-size:0.85rem;white-space:nowrap;">Kode Pelanggan</th>
                                <th style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:600;color:var(--text-primary);">${escapeHTML(group.pelanggan_kode || '-')}</th>
                                <th style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;font-size:0.85rem;white-space:nowrap;">Link Akun</th>
                                <th colspan="4" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:600;color:var(--text-primary);">${escapeHTML(linkAkun)}</th>
                            </tr>
                            <tr style="background:#f5f5f5;border-bottom:2px solid var(--border);">
                                <th style="padding:10px 12px;font-weight:700;border-right:1px solid var(--border);white-space:nowrap;">Tanggal</th>
                                <th style="padding:10px 12px;font-weight:700;border-right:1px solid var(--border);min-width:180px;">Deskripsi</th>
                                <th style="padding:10px 12px;font-weight:700;border-right:1px solid var(--border);min-width:320px;">Keterangan</th>
                                <th style="padding:10px 12px;font-weight:700;border-right:1px solid var(--border);white-space:nowrap;">Ref Transaksi</th>
                                <th style="padding:10px 12px;font-weight:700;border-right:1px solid var(--border);text-align:right;white-space:nowrap;">(+)</th>
                                <th style="padding:10px 12px;font-weight:700;border-right:1px solid var(--border);text-align:right;white-space:nowrap;">(-)</th>
                                <th style="padding:10px 12px;font-weight:700;text-align:right;white-space:nowrap;">Saldo Piutang</th>
                            </tr>
                        </thead>
                        <tbody>${bodyRows}</tbody>
                    </table>
                </div>`;
        }).join('');

        container.innerHTML = blocks;
    }

    function loadBukuPembantuPiutang(options = {}) {
        const container = options.container || document.getElementById(options.containerId || 'transaksi-subledger-table-container');
        if (!container) return;

        container.innerHTML = `<div style="text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Menyusun buku pembantu piutang...</div>`;
        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        const params = new URLSearchParams({
            session_slug: sessionSlug,
            t: String(new Date().getTime())
        });
        const unitUsahaId = options.usePageUnitFilter ? getActiveWorkbookUnitUsahaId(['transaksi-subledger-unit-filter']) : '';
        if (unitUsahaId) {
            params.set('unit_usaha_id', unitUsahaId);
        }
        if (options.pelangganSlug) {
            params.set('pelanggan_slug', options.pelangganSlug);
        }

        fetch('/api/bp-piutang?' + params.toString())
            .then((res) => {
                if (!res.ok) throw new Error('Gagal memuat buku pembantu piutang');
                return res.json();
            })
            .then((data) => {
                renderBukuPembantuPiutangTable(data || [], {
                    container,
                    emptyMessage: options.emptyMessage
                });
            })
            .catch((err) => {
                console.error(err);
                container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-exclamation-circle fa-3x" style="margin-bottom:16px;"></i><p>Gagal memuat data buku pembantu piutang.</p></div>`;
            });
    }

    function loadBukuPembantuPiutangView() {
        loadBukuPembantuPiutang({
            containerId: 'transaksi-subledger-table-container',
            usePageUnitFilter: true,
            emptyMessage: 'Belum ada mutasi piutang untuk pelanggan yang mengaktifkan buku pembantu piutang.'
        });
    }

    var activeSupplierBpUtangSlug = null;

    function getSupplierBpUtangButtonStyle(isActive) {
        if (isActive) {
            return 'display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:#ca8a04;color:#fff;border:none;cursor:pointer;box-shadow:0 10px 20px rgba(202,138,4,0.28);outline:2px solid rgba(202,138,4,0.2);outline-offset:2px;';
        }
        return 'display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:#0f766e;color:#fff;border:none;cursor:pointer;box-shadow:0 8px 18px rgba(15,118,110,0.18);';
    }

    function updateSupplierBpUtangButtonState() {
        const buttons = document.querySelectorAll('#supplier-table-container button[data-supplier-bp-utang="true"]');
        buttons.forEach((button) => {
            const isActive = button.dataset.supplierSlug === activeSupplierBpUtangSlug;
            button.setAttribute('style', getSupplierBpUtangButtonStyle(isActive));
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            button.title = isActive
                ? `Buku pembantu utang ${button.dataset.supplierNama || 'supplier'} sedang dibuka`
                : `Lihat buku pembantu utang ${button.dataset.supplierNama || 'supplier'}`;
        });
    }

    function renderBukuPembantuUtangTable(groups, options = {}) {
        const container = options.container || document.getElementById(options.containerId || 'transaksi-subledger-table-container');
        if (!container) return;

        const emptyMessage = options.emptyMessage || 'Belum ada data buku pembantu utang untuk supplier yang dipilih.';
        if (!groups || groups.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-book-open-reader fa-3x" style="margin-bottom:16px;"></i><p>${escapeHTML(emptyMessage)}</p></div>`;
            return;
        }

        const blocks = groups.map((group) => {
            const bodyRows = (group.rows || []).map((row) => `
                <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:10px 12px;border-right:1px solid var(--border);white-space:nowrap;color:var(--text-secondary);">${escapeHTML(formatJurnalWorkbookDate(row.tanggal))}</td>
                    <td style="padding:10px 12px;border-right:1px solid var(--border);color:var(--text-secondary);">${escapeHTML(row.deskripsi || '-')}</td>
                    <td style="padding:10px 12px;border-right:1px solid var(--border);color:var(--text-primary);">${escapeHTML(row.keterangan || '-')}</td>
                    <td style="padding:10px 12px;border-right:1px solid var(--border);white-space:nowrap;color:var(--text-secondary);">${escapeHTML(row.ref_transaksi || '-')}</td>
                    <td style="padding:10px 12px;border-right:1px solid var(--border);text-align:right;color:var(--text-primary);font-weight:600;white-space:nowrap;">${row.masuk ? escapeHTML(formatJurnalWorkbookCurrency(row.masuk)) : '-'}</td>
                    <td style="padding:10px 12px;border-right:1px solid var(--border);text-align:right;color:var(--text-primary);font-weight:600;white-space:nowrap;">${row.keluar ? escapeHTML(formatJurnalWorkbookCurrency(row.keluar)) : '-'}</td>
                    <td style="padding:10px 12px;text-align:right;color:var(--text-primary);font-weight:700;white-space:nowrap;background:#f8fafc;">${escapeHTML(formatJurnalWorkbookCurrency(row.saldo_utang || 0))}</td>
                </tr>`).join('');

            const linkAkun = String(group.link_akun || '').trim() || '-';
            return `
                <div style="margin-bottom:28px; overflow-x:auto; border:1px solid var(--border); border-radius:var(--radius-md);">
                    <table style="width:100%; border-collapse:collapse; text-align:left; min-width:1280px;">
                        <thead>
                            <tr>
                                <th style="background:#dcedc8;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-transform:uppercase;font-size:0.9rem;white-space:nowrap;">BUKU PEMBANTU UTANG</th>
                                <th colspan="6" style="background:#dcedc8;padding:12px 16px;border:1px solid var(--border);"></th>
                            </tr>
                            <tr>
                                <th style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;font-size:0.85rem;white-space:nowrap;">Unit Usaha</th>
                                <th colspan="6" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:600;color:var(--text-primary);">${escapeHTML(group.unit_usaha || '-')}</th>
                            </tr>
                            <tr>
                                <th style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;font-size:0.85rem;white-space:nowrap;">Supplier</th>
                                <th colspan="6" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:600;color:var(--text-primary);">${escapeHTML(group.supplier_name || '-')}</th>
                            </tr>
                            <tr>
                                <th style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;font-size:0.85rem;white-space:nowrap;">Kode Supplier</th>
                                <th style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:600;color:var(--text-primary);">${escapeHTML(group.supplier_kode || '-')}</th>
                                <th style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;font-size:0.85rem;white-space:nowrap;">Link Akun</th>
                                <th colspan="4" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:600;color:var(--text-primary);">${escapeHTML(linkAkun)}</th>
                            </tr>
                            <tr style="background:#f5f5f5;border-bottom:2px solid var(--border);">
                                <th style="padding:10px 12px;font-weight:700;border-right:1px solid var(--border);white-space:nowrap;">Tanggal</th>
                                <th style="padding:10px 12px;font-weight:700;border-right:1px solid var(--border);min-width:180px;">Deskripsi</th>
                                <th style="padding:10px 12px;font-weight:700;border-right:1px solid var(--border);min-width:320px;">Keterangan</th>
                                <th style="padding:10px 12px;font-weight:700;border-right:1px solid var(--border);white-space:nowrap;">Ref Transaksi</th>
                                <th style="padding:10px 12px;font-weight:700;border-right:1px solid var(--border);text-align:right;white-space:nowrap;">(+)</th>
                                <th style="padding:10px 12px;font-weight:700;border-right:1px solid var(--border);text-align:right;white-space:nowrap;">(-)</th>
                                <th style="padding:10px 12px;font-weight:700;text-align:right;white-space:nowrap;">Saldo Utang</th>
                            </tr>
                        </thead>
                        <tbody>${bodyRows}</tbody>
                    </table>
                </div>`;
        }).join('');

        container.innerHTML = blocks;
    }

    function loadBukuPembantuUtang(options = {}) {
        const container = options.container || document.getElementById(options.containerId || 'transaksi-subledger-table-container');
        if (!container) return;

        container.innerHTML = `<div style="text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Menyusun buku pembantu utang...</div>`;
        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        const params = new URLSearchParams({
            session_slug: sessionSlug,
            t: String(new Date().getTime())
        });
        const unitUsahaId = options.usePageUnitFilter ? getActiveWorkbookUnitUsahaId(['transaksi-subledger-unit-filter']) : '';
        if (unitUsahaId) {
            params.set('unit_usaha_id', unitUsahaId);
        }
        if (options.supplierSlug) {
            params.set('supplier_slug', options.supplierSlug);
        }

        fetch('/api/bp-utang?' + params.toString())
            .then((res) => {
                if (!res.ok) throw new Error('Gagal memuat buku pembantu utang');
                return res.json();
            })
            .then((data) => {
                renderBukuPembantuUtangTable(data || [], {
                    container,
                    emptyMessage: options.emptyMessage
                });
            })
            .catch((err) => {
                console.error(err);
                container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-exclamation-circle fa-3x" style="margin-bottom:16px;"></i><p>Gagal memuat data buku pembantu utang.</p></div>`;
            });
    }

    function loadBukuPembantuUtangView() {
        loadBukuPembantuUtang({
            containerId: 'transaksi-subledger-table-container',
            usePageUnitFilter: true,
            emptyMessage: 'Belum ada mutasi utang untuk supplier yang mengaktifkan buku pembantu utang.'
        });
    }

    function parsePelangganNumber(value) {
        const digits = String(value || '').replace(/[^\d]/g, '');
        return digits ? Number(digits) : 0;
    }

    function applyPelangganFormDefaults() {
        const statusInput = document.getElementById('status');
        if (statusInput && !statusInput.value) {
            statusInput.value = 'Aktif';
        }

        const linkAkunInput = document.getElementById('link_akun');
        if (linkAkunInput && !String(linkAkunInput.value || '').trim()) {
            linkAkunInput.value = '-';
        }

        const checkboxInput = document.getElementById('bk_pembantu_piutang');
        if (checkboxInput) {
            checkboxInput.checked = true;
        }
    }

    function setupPelangganSaldoAwalInput() {
        const saldoInput = document.getElementById('saldo_awal');
        if (!saldoInput || saldoInput.dataset.bound === 'true') return;

        saldoInput.addEventListener('focus', () => {
            const numericValue = parsePelangganNumber(saldoInput.value);
            saldoInput.value = numericValue ? String(numericValue) : '';
        });

        saldoInput.addEventListener('blur', () => {
            const numericValue = parsePelangganNumber(saldoInput.value);
            saldoInput.value = numericValue ? formatPelangganCurrency(numericValue) : '';
        });

        saldoInput.dataset.bound = 'true';
    }

    const pelangganLinkAkunAutocompleteState = {
        options: ['-'],
    };

    function renderPelangganLinkAkunDropdown(filterText = '') {
        const dropdownEl = document.getElementById('pelanggan_link_akun_dropdown');
        const inputEl = document.getElementById('link_akun');
        if (!dropdownEl || !inputEl) return;

        const keyword = String(filterText || '').trim().toLowerCase();
        const filteredOptions = pelangganLinkAkunAutocompleteState.options.filter((option) => {
            if (!keyword) return true;
            return String(option || '').toLowerCase().includes(keyword);
        });

        if (!filteredOptions.length) {
            dropdownEl.innerHTML = '<div style="padding:12px 14px; color:var(--text-secondary);">Tidak ada akun yang cocok.</div>';
            dropdownEl.style.display = 'block';
            return;
        }

        dropdownEl.innerHTML = filteredOptions.map((option) => {
            const isSelected = String(inputEl.value || '').trim() === String(option || '').trim();
            return `<button type="button" data-value="${escapeHTML(option)}" style="display:block; width:100%; padding:10px 14px; text-align:left; border:none; background:${isSelected ? '#f0f7ff' : '#fff'}; color:var(--text-primary); cursor:pointer;">${escapeHTML(option)}</button>`;
        }).join('');
        dropdownEl.style.display = 'block';
    }

    function hidePelangganLinkAkunDropdown() {
        const dropdownEl = document.getElementById('pelanggan_link_akun_dropdown');
        if (dropdownEl) {
            dropdownEl.style.display = 'none';
        }
    }

    function setupPelangganLinkAkunAutocomplete() {
        const inputEl = document.getElementById('link_akun');
        const dropdownEl = document.getElementById('pelanggan_link_akun_dropdown');
        if (!inputEl || !dropdownEl || inputEl.dataset.autocompleteBound === 'true') return;

        inputEl.addEventListener('focus', () => {
            renderPelangganLinkAkunDropdown(inputEl.value);
        });

        inputEl.addEventListener('input', () => {
            renderPelangganLinkAkunDropdown(inputEl.value);
        });

        inputEl.addEventListener('blur', () => {
            setTimeout(() => hidePelangganLinkAkunDropdown(), 120);
        });

        dropdownEl.addEventListener('mousedown', (event) => {
            const optionBtn = event.target.closest('button[data-value]');
            if (!optionBtn) return;
            event.preventDefault();
            inputEl.value = optionBtn.getAttribute('data-value') || '-';
            hidePelangganLinkAkunDropdown();
        });

        inputEl.dataset.autocompleteBound = 'true';
    }

    function loadPelangganLinkAkunOptions(selectedValue = '') {
        const inputEl = document.getElementById('link_akun');
        const dropdownEl = document.getElementById('pelanggan_link_akun_dropdown');
        if (!inputEl || !dropdownEl) return Promise.resolve();

        setupPelangganLinkAkunAutocomplete();

        pelangganLinkAkunAutocompleteState.options = ['-'];
        inputEl.value = String(selectedValue || '').trim() || '-';
        dropdownEl.innerHTML = '<div style="padding:12px 14px; color:var(--text-secondary);">Memuat akun CoA...</div>';

        return fetchCoaAccountOptions()
            .then((options) => {
                const fallbackValue = String(selectedValue || '').trim() || '-';
                const normalizedOptions = options
                    .filter((option) => String(option.value || '').trim() && String(option.value || '').trim() !== '-')
                    .slice()
                    .sort((left, right) => String(left.label || '').localeCompare(String(right.label || ''), 'id'))
                    .map((option) => String(option.value || '').trim());
                pelangganLinkAkunAutocompleteState.options = ['-', ...normalizedOptions];
                inputEl.value = fallbackValue;
                hidePelangganLinkAkunDropdown();
            })
            .catch((error) => {
                console.error('Failed to load pelanggan link akun options', error);
                const fallbackValue = String(selectedValue || '').trim() || '-';
                pelangganLinkAkunAutocompleteState.options = ['-', fallbackValue];
                inputEl.value = fallbackValue;
                hidePelangganLinkAkunDropdown();
                showToast('Gagal memuat akun CoA untuk link akun pelanggan.', true);
            });
    }

    function loadPelangganProfileBumdesDropdown(selectedProfileId = null) {
        const selectEl = document.getElementById('pelanggan_profile_bumdes_id');
        const containerEl = document.getElementById('pelanggan_profile_bumdes_container');
        if(!selectEl) return;
        
        fetch('/api/profiles')
            .then(res => res.json())
            .then(data => {
                const loggedProfileId = localStorage.getItem('sibumdes_profile_id');
                let options = '';
                
                if (!loggedProfileId) {
                    if(containerEl) containerEl.style.display = 'block';
                } else {
                    if(containerEl) containerEl.style.display = 'none';
                }

                if (data && data.length > 0) {
                    data.forEach((p, idx) => {
                        if (loggedProfileId && loggedProfileId != p.ID) return;
                        // Select explicitly if match, OR if pengembang and it's the first element AND selectedProfileId is null
                        let isSelected = '';
                        if (selectedProfileId == p.ID || loggedProfileId == p.ID) {
                            isSelected = 'selected';
                        } else if (!loggedProfileId && !selectedProfileId && idx === 0) {
                            isSelected = 'selected';
                        }
                        options += `<option value="${p.ID}" ${isSelected}>${p.NamaBUMDes}</option>`;
                    });
                }
                selectEl.innerHTML = options;
                
                // Trigger change event to load corresponding Unit Usaha automatically
                const event = new Event('change');
                selectEl.dispatchEvent(event);
            });
    }
    
    function loadUnitUsahaDropdown(selectedId = null, targetProfileId = null, elementId = 'pelanggan_unit_usaha_id') {
        const dropdown = document.getElementById(elementId);
        if(!dropdown) return;
        
        fetch('/api/profiles')
            .then(res => res.json())
            .then(profiles => {
                dropdown.innerHTML = '<option value="">-- Pilih Unit Usaha --</option>';
                const loggedProfileId = localStorage.getItem('sibumdes_profile_id');
                const pId = targetProfileId || loggedProfileId;

                if(profiles && profiles.length > 0) {
                    let targetProfile = profiles.find(p => p.ID == pId);
                    if (!targetProfile) targetProfile = profiles[0]; // fallback

                    if(targetProfile && targetProfile.UnitUsaha && targetProfile.UnitUsaha.length > 0) {
                        targetProfile.UnitUsaha.forEach(unit => {
                            const opt = document.createElement('option');
                            opt.value = unit.ID;
                            opt.textContent = unit.NamaUnitUsaha;
                            if(selectedId && parseInt(selectedId) === unit.ID) {
                                opt.selected = true;
                            } else if (dropdown.dataset.selected_unit_id && parseInt(dropdown.dataset.selected_unit_id) === unit.ID) {
                                opt.selected = true;
                            }
                            dropdown.appendChild(opt);
                        });
                    }
                }
            })
            .catch(err => {
                console.error("Failed to load Unit Usaha dropdown", err);
            });
    }

    function loadTransaksiPelangganList() {
        const pelangganList = document.getElementById('transaksi-pelanggan-list');
        const supplierList = document.getElementById('transaksi-supplier-list');
        if(!pelangganList || !supplierList) return;

        const unitSelect = document.getElementById('transaksi-unit-usaha');
        const selectedUnitId = unitSelect ? parseInt(unitSelect.value, 10) : 0;
        
        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        Promise.all([
            fetch('/api/pelanggans?session_slug=' + sessionSlug + '&t=' + new Date().getTime()),
            fetch('/api/suppliers?session_slug=' + sessionSlug + '&t=' + new Date().getTime())
        ])
            .then(async ([pelangganRes, supplierRes]) => {
                if (!pelangganRes.ok || !supplierRes.ok) {
                    throw new Error('Gagal memuat daftar partner transaksi');
                }

                const [pelangganData, supplierData] = await Promise.all([pelangganRes.json(), supplierRes.json()]);
                pelangganList.innerHTML = '';
                supplierList.innerHTML = '';

                const uniquePelangganNames = new Set();
                const uniqueSupplierNames = new Set();

                (pelangganData || []).forEach(p => {
                    if (selectedUnitId && p.unit_usaha_id && parseInt(p.unit_usaha_id, 10) !== selectedUnitId) {
                        return;
                    }

                    const nama = (p.nama_pelanggan || '').trim();
                    const namaKey = normalizePelangganName(nama);
                    if (!nama || uniquePelangganNames.has(namaKey)) return;

                    uniquePelangganNames.add(namaKey);
                    const option = document.createElement('option');
                    option.value = nama;
                    pelangganList.appendChild(option);
                });

                (supplierData || []).forEach(s => {
                    if (selectedUnitId && s.unit_usaha_id && parseInt(s.unit_usaha_id, 10) !== selectedUnitId) {
                        return;
                    }

                    const nama = (s.nama_supplier || '').trim();
                    const namaKey = normalizePelangganName(nama);
                    if (!nama || uniqueSupplierNames.has(namaKey)) return;

                    uniqueSupplierNames.add(namaKey);
                    const option = document.createElement('option');
                    option.value = nama;
                    supplierList.appendChild(option);
                });

                document.querySelectorAll('#transaksi-form-tbody tr[data-row-type="main"]').forEach(syncTransaksiPartnerInputSource);
            })
            .catch(err => {
                console.error('Failed to load transaksi pelanggan list', err);
                pelangganList.innerHTML = '';
                supplierList.innerHTML = '';
            });
    }

    function renderPelangganTable(pelanggan = getFilteredPelangganItems()) {
        const pelangganTableState = getPelangganTableState();
        const container = document.getElementById('pelanggan-table-container');
        if(!container) return;

        syncPelangganSearchInputs(pelangganTableState.searchTerm);

        if (!pelanggan || pelanggan.length === 0) {
            const hasSearch = String(pelangganTableState.searchTerm || '').trim() !== '';
            container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-secondary);">
                <i class="fa-solid fa-users fa-3x" style="margin-bottom:16px;"></i>
                <p>${hasSearch ? 'Tidak ada data pelanggan yang cocok dengan pencarian.' : 'Belum ada data pelanggan yang terdaftar.'}</p>
            </div>`;
            return;
        }

        const totalSaldoAwal = pelanggan.reduce((total, p) => total + (Number(p.saldo_awal) || 0), 0);
        let tableRows = '';
        pelanggan.forEach((p, idx) => {
            const unitName = p.unit_usaha && p.unit_usaha.NamaUnitUsaha ? p.unit_usaha.NamaUnitUsaha : '-';
            const status = normalizePelangganStatus(p.status);
            const statusColor = status.toLowerCase() === 'aktif'
                ? 'background:#dcfce7; color:#166534;'
                : 'background:#fee2e2; color:#b91c1c;';
            const linkAkun = String(p.link_akun || '-').trim() || '-';
            const isActiveBpPiutang = p.slug && p.slug === activePelangganBpPiutangSlug;
            const checkboxIcon = p.bk_pembantu_piutang
                ? `<button type="button" data-pelanggan-bp-piutang="true" data-pelanggan-slug="${p.slug}" data-pelanggan-nama="${escapeHTML(p.nama_pelanggan || 'pelanggan')}" aria-pressed="${isActiveBpPiutang ? 'true' : 'false'}" title="${isActiveBpPiutang ? `Buku pembantu piutang ${escapeHTML(p.nama_pelanggan || 'pelanggan')} sedang dibuka` : `Lihat buku pembantu piutang ${escapeHTML(p.nama_pelanggan || '')}`}" onclick="window.showPelangganBukuPembantuPiutang('${p.slug}', '${String(p.nama_pelanggan || '').replace(/'/g, "\\'")}')" style="${getPelangganBpPiutangButtonStyle(isActiveBpPiutang)}"><i class="fa-solid fa-book-open"></i></button>`
                : '<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text-secondary);"></span>';

            let bumdesBadge = '';
            if (p.profile_bumdes_id && p.profile_bumdes) {
                bumdesBadge = `<span class="badge" style="background:#e0f2fe; color:#0284c7; margin-bottom: 4px; display: inline-block;">${p.profile_bumdes.NamaBUMDes}</span><br>`;
            } else if (!p.profile_bumdes_id) {
                bumdesBadge = `<span class="badge" style="background:#fee2e2; color:#dc2626; margin-bottom: 4px; display: inline-block;">PENGEMBANG</span><br>`;
            }

            tableRows += `
                <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:12px;color:var(--text-secondary);">${idx + 1}</td>
                    <td style="padding:12px;white-space: nowrap;color:var(--text-secondary);">${bumdesBadge}<span class="badge" style="background:var(--bg-secondary); color:var(--text-secondary);">${unitName}</span></td>
                    <td style="padding:12px;font-weight:500;color:var(--text-primary);">${escapeHTML(p.kode_pelanggan || '-')}</td>
                    <td style="padding:12px;color:var(--text-secondary);">${escapeHTML(p.nama_pelanggan || '-')}</td>
                    <td style="padding:12px;color:var(--text-secondary);">${escapeHTML(p.alamat || '-')}</td>
                    <td style="padding:12px;color:var(--text-secondary);white-space:nowrap;">${escapeHTML(p.no_telepon || '-')}</td>
                    <td style="padding:12px;text-align:center;"><span class="badge" style="${statusColor}">${escapeHTML(status)}</span></td>
                    <td style="padding:12px;color:var(--text-primary);text-align:right;font-weight:600;white-space:nowrap;">${formatPelangganCurrency(p.saldo_awal)}</td>
                    <td style="padding:12px;text-align:center;">${checkboxIcon}</td>
                    <td style="padding:12px;color:var(--text-primary);white-space:nowrap;">${escapeHTML(linkAkun)}</td>
                    <td data-no-row-click="true" style="padding:12px;text-align:center;white-space:nowrap;">
                        <button type="button" class="action-btn edit" data-no-row-click="true" data-pelanggan-action="edit" data-pelanggan-slug="${p.slug}" title="Edit Pelanggan"><i class="fa-solid fa-pen"></i></button>
                        <button type="button" class="action-btn delete" data-no-row-click="true" data-pelanggan-action="delete" data-pelanggan-slug="${p.slug}" title="Hapus Pelanggan"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });

        container.innerHTML = `
            <div style="overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-md);">
                <table class="data-table" style="width:100%;border-collapse:collapse;text-align:left;min-width:1560px;">
                    <thead>
                        <tr style="background:#f5f5f5;border-bottom:2px solid var(--border);">
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);white-space:nowrap;">No</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Unit Usaha</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Kode Pelanggan</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Nama Pelanggan</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Alamat</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">No Telepon</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:center;white-space:nowrap;">Status</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:right;white-space:nowrap;">Saldo Awal</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:center;white-space:nowrap;">Bk Pembantu Piutang</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);white-space:nowrap;">Link Akun</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:center;white-space:nowrap;">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                    <tfoot>
                        <tr style="border-top:2px solid var(--border);background:#fff;">
                            <td colspan="7" style="padding:12px;"></td>
                            <td style="padding:12px;background:#fff59d;color:var(--text-primary);font-weight:700;text-align:right;white-space:nowrap;">${formatPelangganCurrency(totalSaldoAwal)}</td>
                            <td colspan="3" style="padding:12px;"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    }

    window.editPelangganAction = function(slug) {
        capturePelangganListViewState();
        openPelangganEditView(slug);
    };

    window.backToPelangganListAction = function() {
        returnToPelangganList({ preserveSearch: true });
    };

    function editPelangganData(slug) {
        const pForm = document.getElementById('pelangganForm');
        if(pForm) pForm.reset();
        
        const profileDropdown = document.getElementById('pelanggan_profile_bumdes_id');
        if(profileDropdown) {
            profileDropdown.onchange = function(e) {
                loadUnitUsahaDropdown(null, e.target.value);
            };
        }
        
        fetch('/api/pelanggan?slug=' + slug)
            .then(res => res.json())
            .then(data => {
                if(!data || !data.slug) {
                    navigateTo('/pelanggan');
                    return;
                }
                const idEl = document.getElementById('pelanggan_id');
                if(idEl) idEl.name = "slug"; // ensure form sends slug instead of id
                if(idEl) idEl.value = data.slug;
                
                if(data.unit_usaha_id) {
                    // Set flag or save desired unit usaha to be selected after dropdown refreshes via change event.
                    // Because loadPelangganProfileBumdesDropdown() triggers 'change' event and clears the list.
                    const drop = document.getElementById('pelanggan_unit_usaha_id');
                    if(drop) drop.dataset.selected_unit_id = data.unit_usaha_id;
                }
                
                loadPelangganProfileBumdesDropdown(data.profile_bumdes_id);

                const kodeEl = document.getElementById('kode_pelanggan');
                if(kodeEl) kodeEl.value = data.kode_pelanggan;
                
                const namaEl = document.getElementById('nama_pelanggan');
                if(namaEl) namaEl.value = data.nama_pelanggan;
                
                const alamatEl = document.getElementById('alamat');
                if(alamatEl) alamatEl.value = data.alamat;

                const tlpEl = document.getElementById('no_telepon');
                if(tlpEl) tlpEl.value = data.no_telepon;

                const statusEl = document.getElementById('status');
                if(statusEl) statusEl.value = normalizePelangganStatus(data.status);

                const saldoEl = document.getElementById('saldo_awal');
                if(saldoEl) saldoEl.value = data.saldo_awal ? formatPelangganCurrency(data.saldo_awal) : '';

                const bkEl = document.getElementById('bk_pembantu_piutang');
                if(bkEl) bkEl.checked = Boolean(data.bk_pembantu_piutang);

                loadPelangganLinkAkunOptions(data.link_akun || '-');
            })
            .catch(err => {
                console.error(err);
                showToast('Gagal memuat profil pelanggan', true);
            });
    }

    window.deletePelangganAction = function(slug) {
        capturePelangganListViewState();
        window.showConfirmModal('Apakah Anda yakin ingin menghapus data pelanggan ini?', () => {
            fetch('/api/pelanggan?slug=' + slug, { method: 'DELETE' })
            .then(res => {
                if(res.ok) {
                    removePelangganTableItem(slug);
                    renderPelangganTable();
                    restorePelangganListViewState();
                    showToast('Pelanggan berhasil dihapus');
                } else {
                    showToast('Gagal menghapus pelanggan', true);
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Kesalahan jaringan', true);
            });
        });
    };

    // Supplier CRUD Functions
    function getSupplierTableState() {
        if (!globalThis.__sibumdesSupplierTableState) {
            globalThis.__sibumdesSupplierTableState = {
                items: [],
                searchTerm: '',
            };
        }
        return globalThis.__sibumdesSupplierTableState;
    }

    function captureSupplierListViewState() {
        const supplierTableState = getSupplierTableState();
        const tableWrapper = document.querySelector('#supplier-table-container > div');
        const contentWrapper = document.querySelector('.content-wrapper');
        globalThis.__sibumdesSupplierListViewState = {
            searchTerm: supplierTableState.searchTerm,
            tableScrollLeft: tableWrapper ? tableWrapper.scrollLeft : 0,
            tableScrollTop: tableWrapper ? tableWrapper.scrollTop : 0,
            contentScrollTop: contentWrapper ? contentWrapper.scrollTop : 0,
        };
    }

    function restoreSupplierListViewState() {
        const state = globalThis.__sibumdesSupplierListViewState;
        if (!state) return;

        const supplierTableState = getSupplierTableState();
        if (typeof state.searchTerm === 'string') {
            supplierTableState.searchTerm = state.searchTerm;
        }

        requestAnimationFrame(() => {
            const tableWrapper = document.querySelector('#supplier-table-container > div');
            const contentWrapper = document.querySelector('.content-wrapper');
            if (tableWrapper) {
                tableWrapper.scrollLeft = state.tableScrollLeft || 0;
                tableWrapper.scrollTop = state.tableScrollTop || 0;
            }
            if (contentWrapper) {
                contentWrapper.scrollTop = state.contentScrollTop || 0;
            }
        });
    }

    function returnToSupplierList(options = {}) {
        const preserveSearch = options.preserveSearch !== false;
        const supplierTableState = getSupplierTableState();
        const supplierView = document.getElementById('supplier-view');
        const supplierDataView = document.getElementById('supplier-data-view');
        const pageTitle = document.getElementById('page-title');

        if (supplierView) supplierView.style.display = 'none';
        if (supplierDataView) supplierDataView.style.display = 'block';
        if (pageTitle) pageTitle.textContent = 'Data Supplier';
        if (!preserveSearch) {
            supplierTableState.searchTerm = '';
        }

        history.replaceState(null, null, '/supplier');
        setupSupplierTableSearch();

        if (Array.isArray(supplierTableState.items) && supplierTableState.items.length > 0) {
            renderSupplierTable();
            restoreSupplierListViewState();
            return;
        }

        loadSupplier({ preserveSearch });
    }

    function openSupplierEditView(slug, options = {}) {
        const supplierView = document.getElementById('supplier-view');
        const supplierDataView = document.getElementById('supplier-data-view');
        const pageTitle = document.getElementById('page-title');

        if (supplierDataView) supplierDataView.style.display = 'none';
        if (supplierView) supplierView.style.display = 'block';
        if (pageTitle) pageTitle.textContent = 'Edit Supplier';

        if (options.updateHistory !== false) {
            history.pushState(null, null, '/supplier/edit/' + slug);
        }

        applySupplierFormDefaults();
        setupSupplierSaldoAwalInput();
        loadSupplierLinkAkunOptions('2-0100 Utang Usaha');
        editSupplierData(slug);
    }

    function setupSupplierTableActions() {
        const container = document.getElementById('supplier-table-container');
        if (!container || container.dataset.actionsBound === 'true') return;

        container.addEventListener('click', (event) => {
            const actionButton = event.target.closest('[data-supplier-action]');
            if (!actionButton || !container.contains(actionButton)) return;

            event.preventDefault();
            event.stopPropagation();

            const actionName = actionButton.getAttribute('data-supplier-action');
            const slug = actionButton.getAttribute('data-supplier-slug') || '';
            if (!slug) return;

            if (actionName === 'edit') {
                window.editSupplierAction(slug);
                return;
            }

            if (actionName === 'delete') {
                window.deleteSupplierAction(slug);
            }
        }, true);

        container.dataset.actionsBound = 'true';
    }

    function mergeSupplierTableItem(updatedItem) {
        if (!updatedItem || !updatedItem.slug) return;
        const supplierTableState = getSupplierTableState();
        const items = Array.isArray(supplierTableState.items) ? supplierTableState.items.slice() : [];
        const targetIndex = items.findIndex((item) => item && item.slug === updatedItem.slug);
        if (targetIndex >= 0) {
            items[targetIndex] = updatedItem;
        } else {
            items.unshift(updatedItem);
        }
        supplierTableState.items = items;
    }

    function removeSupplierTableItem(slug) {
        const supplierTableState = getSupplierTableState();
        const items = Array.isArray(supplierTableState.items) ? supplierTableState.items : [];
        supplierTableState.items = items.filter((item) => item && item.slug !== slug);
    }

    function getSupplierSearchInputs() {
        return [document.getElementById('top-header-search-input')].filter(Boolean);
    }

    function syncSupplierSearchInputs(value) {
        getSupplierSearchInputs().forEach((inputEl) => {
            if (inputEl.value !== value) {
                inputEl.value = value;
            }
        });
    }

    function handleSupplierSearchChange(event) {
        if (window.location.pathname !== '/supplier') return;
        const supplierTableState = getSupplierTableState();
        supplierTableState.searchTerm = event && event.target ? (event.target.value || '') : '';
        syncSupplierSearchInputs(supplierTableState.searchTerm);
        renderSupplierTable();
    }

    function setupSupplierTableSearch() {
        const supplierTableState = getSupplierTableState();
        const searchInputs = getSupplierSearchInputs();
        if (!searchInputs.length) return;

        syncSupplierSearchInputs(supplierTableState.searchTerm);

        searchInputs.forEach((searchInput) => {
            if (searchInput.dataset.supplierBound === 'true') return;

            ['input', 'search'].forEach((eventName) => {
                searchInput.addEventListener(eventName, handleSupplierSearchChange);
            });
            searchInput.dataset.supplierBound = 'true';
        });
    }

    function getFilteredSupplierItems() {
        const supplierTableState = getSupplierTableState();
        const items = Array.isArray(supplierTableState.items) ? supplierTableState.items : [];
        const searchTerm = String(supplierTableState.searchTerm || '').trim().toLowerCase();
        if (!searchTerm) return items;

        return items.filter((item) => {
            const searchableValues = [
                item && item.kode_supplier,
                item && item.nama_supplier,
                item && item.bidang_supply,
                item && item.alamat,
                item && item.no_telepon,
                item && item.status,
                item && item.saldo_awal,
                item && item.link_akun,
                item && item.unit_usaha && item.unit_usaha.NamaUnitUsaha,
                item && item.profile_bumdes && item.profile_bumdes.NamaBUMDes,
            ];

            return searchableValues.some((value) => String(value || '').toLowerCase().includes(searchTerm));
        });
    }

    function loadSupplier(options = {}) {
        const preserveSearch = Boolean(options && options.preserveSearch);
        const supplierTableState = getSupplierTableState();
        const container = document.getElementById('supplier-table-container');
        if (!preserveSearch) {
            supplierTableState.searchTerm = '';
        }
        setupSupplierTableSearch();
        setupSupplierTableActions();
        if(container && !container.innerHTML.includes('table')) {
            container.innerHTML = `<div style="text-align:center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat data...</div>`;
        }

        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        fetch('/api/suppliers?session_slug=' + sessionSlug + '&t=' + new Date().getTime())
            .then(res => res.json())
            .then(data => {
                supplierTableState.items = Array.isArray(data) ? data : [];
                renderSupplierTable();
            })
            .catch(err => {
                console.error(err);
                if(container) container.innerHTML = `<div style="color:var(--danger); text-align:center;">Gagal memuat supplier.</div>`;
            });
    }

    function loadSupplierProfileBumdesDropdown(selectedProfileId = null) {
        const selectEl = document.getElementById('supplier_profile_bumdes_id');
        const containerEl = document.getElementById('supplier_profile_bumdes_container');
        if(!selectEl) return;
        
        fetch('/api/profiles')
            .then(res => res.json())
            .then(data => {
                const loggedProfileId = localStorage.getItem('sibumdes_profile_id');
                let options = '';
                
                if (!loggedProfileId) {
                    if(containerEl) containerEl.style.display = 'block';
                } else {
                    if(containerEl) containerEl.style.display = 'none';
                }

                if (data && data.length > 0) {
                    data.forEach((p, idx) => {
                        if (loggedProfileId && loggedProfileId != p.ID) return;
                        let isSelected = '';
                        if (selectedProfileId == p.ID || loggedProfileId == p.ID) {
                            isSelected = 'selected';
                        } else if (!loggedProfileId && !selectedProfileId && idx === 0) {
                            isSelected = 'selected';
                        }
                        options += `<option value="${p.ID}" ${isSelected}>${p.NamaBUMDes}</option>`;
                    });
                }
                selectEl.innerHTML = options;
                
                const event = new Event('change');
                selectEl.dispatchEvent(event);
            });
    }

    function normalizeSupplierStatus(value) {
        const normalized = String(value || '').trim();
        return normalized || 'Aktif';
    }

    function applySupplierFormDefaults() {
        const statusInput = document.getElementById('supplier_status');
        if (statusInput && !statusInput.value) {
            statusInput.value = 'Aktif';
        }

        const linkAkunInput = document.getElementById('supplier_link_akun');
        if (linkAkunInput && !linkAkunInput.value.trim()) {
            linkAkunInput.value = '2-0100 Utang Usaha';
        }

        const checkboxInput = document.getElementById('bk_pembantu_utang');
        if (checkboxInput) {
            checkboxInput.checked = true;
        }
    }

    function getSupplierLinkAkunAutocompleteState() {
        if (!globalThis.__sibumdesSupplierLinkAkunAutocompleteState) {
            globalThis.__sibumdesSupplierLinkAkunAutocompleteState = {
                options: ['-', '2-0100 Utang Usaha'],
            };
        }
        return globalThis.__sibumdesSupplierLinkAkunAutocompleteState;
    }

    function renderSupplierLinkAkunDropdown(filterText = '') {
        const dropdownEl = document.getElementById('supplier_link_akun_dropdown');
        const inputEl = document.getElementById('supplier_link_akun');
        if (!dropdownEl || !inputEl) return;
        const supplierLinkAkunAutocompleteState = getSupplierLinkAkunAutocompleteState();

        const keyword = String(filterText || '').trim().toLowerCase();
        const filteredOptions = supplierLinkAkunAutocompleteState.options.filter((option) => {
            if (!keyword) return true;
            return String(option || '').toLowerCase().includes(keyword);
        });

        if (!filteredOptions.length) {
            dropdownEl.innerHTML = '<div style="padding:12px 14px; color:var(--text-secondary);">Tidak ada akun yang cocok.</div>';
            dropdownEl.style.display = 'block';
            return;
        }

        dropdownEl.innerHTML = filteredOptions.map((option) => {
            const isSelected = String(inputEl.value || '').trim() === String(option || '').trim();
            return `<button type="button" data-value="${escapeHTML(option)}" style="display:block; width:100%; padding:10px 14px; text-align:left; border:none; background:${isSelected ? '#f0f7ff' : '#fff'}; color:var(--text-primary); cursor:pointer;">${escapeHTML(option)}</button>`;
        }).join('');
        dropdownEl.style.display = 'block';
    }

    function hideSupplierLinkAkunDropdown() {
        const dropdownEl = document.getElementById('supplier_link_akun_dropdown');
        if (dropdownEl) {
            dropdownEl.style.display = 'none';
        }
    }

    function setupSupplierLinkAkunAutocomplete() {
        const inputEl = document.getElementById('supplier_link_akun');
        const dropdownEl = document.getElementById('supplier_link_akun_dropdown');
        if (!inputEl || !dropdownEl || inputEl.dataset.autocompleteBound === 'true') return;

        inputEl.addEventListener('focus', () => {
            renderSupplierLinkAkunDropdown('');
        });

        inputEl.addEventListener('input', () => {
            renderSupplierLinkAkunDropdown(inputEl.value);
        });

        inputEl.addEventListener('blur', () => {
            setTimeout(() => hideSupplierLinkAkunDropdown(), 120);
        });

        dropdownEl.addEventListener('mousedown', (event) => {
            const optionBtn = event.target.closest('button[data-value]');
            if (!optionBtn) return;
            event.preventDefault();
            inputEl.value = optionBtn.getAttribute('data-value') || '-';
            hideSupplierLinkAkunDropdown();
        });

        inputEl.dataset.autocompleteBound = 'true';
    }

    function loadSupplierLinkAkunOptions(selectedValue = '') {
        const inputEl = document.getElementById('supplier_link_akun');
        const dropdownEl = document.getElementById('supplier_link_akun_dropdown');
        if (!inputEl || !dropdownEl) return Promise.resolve();
        const supplierLinkAkunAutocompleteState = getSupplierLinkAkunAutocompleteState();

        setupSupplierLinkAkunAutocomplete();

        supplierLinkAkunAutocompleteState.options = ['-', '2-0100 Utang Usaha'];
        inputEl.value = String(selectedValue || '').trim() || '2-0100 Utang Usaha';
        dropdownEl.innerHTML = '<div style="padding:12px 14px; color:var(--text-secondary);">Memuat akun CoA...</div>';

        return fetchCoaAccountOptions()
            .then((options) => {
                const fallbackValue = String(selectedValue || '').trim() || '2-0100 Utang Usaha';
                const normalizedOptions = options
                    .filter((option) => String(option.value || '').trim() && String(option.value || '').trim() !== '-')
                    .slice()
                    .sort((left, right) => String(left.label || '').localeCompare(String(right.label || ''), 'id'))
                    .map((option) => String(option.value || '').trim());
                const uniqueOptions = Array.from(new Set(['-', '2-0100 Utang Usaha', ...normalizedOptions]));
                supplierLinkAkunAutocompleteState.options = uniqueOptions;
                inputEl.value = fallbackValue;
                hideSupplierLinkAkunDropdown();
            })
            .catch((error) => {
                console.error('Failed to load supplier link akun options', error);
                const fallbackValue = String(selectedValue || '').trim() || '2-0100 Utang Usaha';
                supplierLinkAkunAutocompleteState.options = Array.from(new Set(['-', '2-0100 Utang Usaha', fallbackValue]));
                inputEl.value = fallbackValue;
                hideSupplierLinkAkunDropdown();
                showToast('Gagal memuat akun CoA untuk link akun supplier.', true);
            });
    }

    function setupSupplierSaldoAwalInput() {
        const saldoInput = document.getElementById('supplier_saldo_awal');
        if (!saldoInput || saldoInput.dataset.bound === 'true') return;

        saldoInput.addEventListener('focus', () => {
            const numericValue = parsePelangganNumber(saldoInput.value);
            saldoInput.value = numericValue ? String(numericValue) : '';
        });

        saldoInput.addEventListener('blur', () => {
            const numericValue = parsePelangganNumber(saldoInput.value);
            saldoInput.value = numericValue ? formatPelangganCurrency(numericValue) : '';
        });

        saldoInput.dataset.bound = 'true';
    }

    function renderSupplierTable(supplier = getFilteredSupplierItems()) {
        const container = document.getElementById('supplier-table-container');
        if(!container) return;

        if (supplier.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-secondary);">
                <i class="fa-solid fa-handshake fa-3x" style="margin-bottom:16px;"></i>
                <p>Belum ada data supplier yang terdaftar.</p>
            </div>`;
            return;
        }

        const totalSaldoAwal = supplier.reduce((total, s) => total + (Number(s.saldo_awal) || 0), 0);

        let tableRows = '';
        supplier.forEach((s) => {
            const status = normalizeSupplierStatus(s.status);
            const unitName = s.unit_usaha && s.unit_usaha.NamaUnitUsaha ? s.unit_usaha.NamaUnitUsaha : '-';
            const bumdesName = s.profile_bumdes && s.profile_bumdes.NamaBUMDes ? s.profile_bumdes.NamaBUMDes : '';
            const statusColor = status.toLowerCase() === 'aktif'
                ? 'background:#dcfce7; color:#166534;'
                : 'background:#fee2e2; color:#b91c1c;';
            const isActiveBpUtang = s.slug && s.slug === activeSupplierBpUtangSlug;
            const checkboxIcon = s.bk_pembantu_utang
                ? `<button type="button" data-supplier-bp-utang="true" data-supplier-slug="${s.slug}" data-supplier-nama="${escapeHTML(s.nama_supplier || 'supplier')}" aria-pressed="${isActiveBpUtang ? 'true' : 'false'}" title="${isActiveBpUtang ? `Buku pembantu utang ${escapeHTML(s.nama_supplier || 'supplier')} sedang dibuka` : `Lihat buku pembantu utang ${escapeHTML(s.nama_supplier || '')}`}" onclick="window.showSupplierBukuPembantuUtang('${s.slug}', '${String(s.nama_supplier || '').replace(/'/g, "\\'")}')" style="${getSupplierBpUtangButtonStyle(isActiveBpUtang)}"><i class="fa-solid fa-book-open"></i></button>`
                : '<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text-secondary);"></span>';
            let bumdesBadge = '';
            if (s.profile_bumdes_id && s.profile_bumdes) {
                bumdesBadge = `<span class="badge" style="background:#e0f2fe; color:#0284c7; margin-bottom: 4px; display: inline-block;">${escapeHTML(bumdesName)}</span><br>`;
            } else if (!s.profile_bumdes_id) {
                bumdesBadge = '<span class="badge" style="background:#fee2e2; color:#dc2626; margin-bottom: 4px; display: inline-block;">PENGEMBANG</span><br>';
            }

            tableRows += `
                <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:12px;font-weight:500;color:var(--text-primary);">${s.kode_supplier || '-'}</td>
                    <td style="padding:12px;white-space: nowrap;color:var(--text-secondary);">${bumdesBadge}<span class="badge" style="background:var(--bg-secondary); color:var(--text-secondary);">${escapeHTML(unitName)}</span></td>
                    <td style="padding:12px;color:var(--text-secondary);">${s.nama_supplier || '-'}</td>
                    <td style="padding:12px;color:var(--text-secondary);">${s.bidang_supply || '-'}</td>
                    <td style="padding:12px;color:var(--text-secondary);">${s.alamat || '-'}</td>
                    <td style="padding:12px;color:var(--text-secondary);white-space:nowrap;">${s.no_telepon || '-'}</td>
                    <td style="padding:12px;text-align:center;"><span class="badge" style="${statusColor}">${status}</span></td>
                    <td style="padding:12px;color:var(--text-primary);text-align:right;font-weight:600;white-space:nowrap;">${formatPelangganCurrency(s.saldo_awal)}</td>
                    <td style="padding:12px;text-align:center;">${checkboxIcon}</td>
                    <td style="padding:12px;color:var(--text-primary);white-space:nowrap;">${s.link_akun || '2-0100 Utang Usaha'}</td>
                    <td style="padding:12px;text-align:center;white-space:nowrap;">
                        <button type="button" class="action-btn edit" data-no-row-click="true" data-supplier-action="edit" data-supplier-slug="${s.slug}" title="Edit Supplier"><i class="fa-solid fa-pen"></i></button>
                        <button type="button" class="action-btn delete" data-no-row-click="true" data-supplier-action="delete" data-supplier-slug="${s.slug}" title="Hapus Supplier"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });

        container.innerHTML = `
            <div style="overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-md);">
                <table class="data-table" style="width:100%;border-collapse:collapse;text-align:left;min-width:1500px;">
                    <thead>
                        <tr style="background:#f5f5f5;border-bottom:2px solid var(--border);">
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Kode Supplier</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Unit Usaha</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Nama Supplier</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Bidang Supply</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Alamat</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">No Telepon</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:center;white-space:nowrap;">Status</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:right;white-space:nowrap;">Saldo Awal</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:center;white-space:nowrap;">Bk Pembantu Utang</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);white-space:nowrap;">Link Akun</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:center;white-space:nowrap;">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                    <tfoot>
                        <tr style="border-top:2px solid var(--border);background:#fff;">
                            <td colspan="7" style="padding:12px;"></td>
                            <td style="padding:12px;background:#fff59d;color:var(--text-primary);font-weight:700;text-align:right;white-space:nowrap;">${formatPelangganCurrency(totalSaldoAwal)}</td>
                            <td colspan="3" style="padding:12px;"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    }

    window.editSupplierAction = function(slug) {
        captureSupplierListViewState();
        openSupplierEditView(slug);
    };

    window.backToSupplierListAction = function() {
        returnToSupplierList({ preserveSearch: true });
    };

    function editSupplierData(slug) {
        const sForm = document.getElementById('supplierForm');
        if(sForm) sForm.reset();
        
        const profileDropdown = document.getElementById('supplier_profile_bumdes_id');
        if(profileDropdown) {
            profileDropdown.onchange = function(e) {
                loadUnitUsahaDropdown(null, e.target.value, 'supplier_unit_usaha_id');
            };
        }
        
        fetch('/api/supplier?slug=' + slug)
            .then(res => res.json())
            .then(data => {
                if(!data || !data.slug) {
                    returnToSupplierList({ preserveSearch: true });
                    return;
                }
                const idEl = document.getElementById('supplier_id');
                if(idEl) idEl.name = "slug";
                if(idEl) idEl.value = data.slug;
                
                if(data.unit_usaha_id) {
                    const drop = document.getElementById('supplier_unit_usaha_id');
                    if(drop) drop.dataset.selected_unit_id = data.unit_usaha_id;
                }
                
                loadSupplierProfileBumdesDropdown(data.profile_bumdes_id);

                const kodeEl = document.getElementById('kode_supplier');
                if(kodeEl) kodeEl.value = data.kode_supplier;
                
                const namaEl = document.getElementById('nama_supplier');
                if(namaEl) namaEl.value = data.nama_supplier;

                const bidangEl = document.getElementById('bidang_supply');
                if(bidangEl) bidangEl.value = data.bidang_supply || '';
                
                const alamatEl = document.getElementById('alamat_supplier');
                if(alamatEl) alamatEl.value = data.alamat;

                const tlpEl = document.getElementById('no_telepon_supplier');
                if(tlpEl) tlpEl.value = data.no_telepon;

                const statusEl = document.getElementById('supplier_status');
                if(statusEl) statusEl.value = normalizeSupplierStatus(data.status);

                const saldoEl = document.getElementById('supplier_saldo_awal');
                if(saldoEl) saldoEl.value = data.saldo_awal ? formatPelangganCurrency(data.saldo_awal) : '';

                const bkEl = document.getElementById('bk_pembantu_utang');
                if(bkEl) bkEl.checked = Boolean(data.bk_pembantu_utang);

                loadSupplierLinkAkunOptions(data.link_akun || '2-0100 Utang Usaha');
            })
            .catch(err => {
                console.error(err);
                showToast('Gagal memuat profil supplier', true);
            });
    }

    window.deleteSupplierAction = function(slug) {
        captureSupplierListViewState();
        window.showConfirmModal('Apakah Anda yakin ingin menghapus data supplier ini?', () => {
            fetch('/api/supplier?slug=' + slug, { method: 'DELETE' })
            .then(res => {
                if(res.ok) {
                    removeSupplierTableItem(slug);
                    renderSupplierTable();
                    restoreSupplierListViewState();
                    showToast('Supplier berhasil dihapus');
                } else {
                    showToast('Gagal menghapus supplier', true);
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Kesalahan jaringan', true);
            });
        });
    };

    // Barang CRUD Functions
    function getBarangTableState() {
        if (!globalThis.__sibumdesBarangTableState) {
            globalThis.__sibumdesBarangTableState = {
                items: [],
                searchTerm: '',
            };
        }
        return globalThis.__sibumdesBarangTableState;
    }

    function getBarangSearchInputs() {
        return [document.getElementById('top-header-search-input')].filter(Boolean);
    }

    function syncBarangSearchInputs(value) {
        getBarangSearchInputs().forEach((inputEl) => {
            if (inputEl.value !== value) {
                inputEl.value = value;
            }
        });
    }

    function getFilteredBarangItems() {
        const barangTableState = getBarangTableState();
        const items = Array.isArray(barangTableState.items) ? barangTableState.items : [];
        const keyword = String(barangTableState.searchTerm || '').trim().toLowerCase();
        if (!keyword) return items;

        return items.filter((item) => {
            const unitName = item && item.unit_usaha && item.unit_usaha.NamaUnitUsaha ? item.unit_usaha.NamaUnitUsaha : '';
            const bumdesName = item && item.profile_bumdes && item.profile_bumdes.NamaBUMDes ? item.profile_bumdes.NamaBUMDes : '';
            const status = normalizeBarangStatus(item && item.status);
            const saldoAwalQty = formatBarangQuantity(item && item.saldo_awal_qty);
            const saldoAwalNominal = formatPelangganCurrency(item && item.saldo_awal_nominal);
            const hargaBeliAwal = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format((item && item.harga_beli_awal) || 0);
            const hargaJual = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format((item && item.harga_jual) || 0);
            const kartuPersediaan = item && item.kartu_persediaan ? 'ya aktif true 1' : 'tidak nonaktif false 0';
            const linkAkun = String((item && item.link_akun) || '1-1420 Persediaan Barang Jadi; 5-1200 HPP Barang Jadi').trim();

            const haystack = [
                item && item.kode_barang,
                bumdesName,
                unitName,
                item && item.nama_barang,
                item && item.merk_barang,
                hargaBeliAwal,
                hargaJual,
                item && item.satuan,
                saldoAwalQty,
                saldoAwalNominal,
                status,
                kartuPersediaan,
                linkAkun,
            ].map((value) => String(value || '').toLowerCase()).join(' ');

            return haystack.includes(keyword);
        });
    }

    function handleBarangSearchChange(event) {
        if (window.location.pathname !== '/barang') return;
        const barangTableState = getBarangTableState();
        barangTableState.searchTerm = event && event.target ? (event.target.value || '') : '';
        syncBarangSearchInputs(barangTableState.searchTerm);
        renderBarangTable();
    }

    function setupBarangTableSearch() {
        const barangTableState = getBarangTableState();
        const searchInputs = getBarangSearchInputs();
        if (!searchInputs.length) return;

        syncBarangSearchInputs(barangTableState.searchTerm);

        searchInputs.forEach((searchInput) => {
            if (searchInput.dataset.barangBound === 'true') return;

            ['input', 'search'].forEach((eventName) => {
                searchInput.addEventListener(eventName, handleBarangSearchChange);
            });
            searchInput.dataset.barangBound = 'true';
        });
    }

    function loadBarang() {
        const barangTableState = getBarangTableState();
        const container = document.getElementById('barang-table-container');
        hideBarangKartuPersediaan();
        barangTableState.searchTerm = '';
        setupBarangTableSearch();
        if(container && !container.innerHTML.includes('table')) {
            container.innerHTML = `<div style="text-align:center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat data...</div>`;
        }

        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        fetch('/api/barangs?session_slug=' + sessionSlug + '&t=' + new Date().getTime())
            .then(res => res.json())
            .then(data => {
                barangTableState.items = Array.isArray(data) ? data : [];
                renderBarangTable();
            })
            .catch(err => {
                console.error(err);
                if(container) container.innerHTML = `<div style="color:var(--danger); text-align:center;">Gagal memuat barang.</div>`;
            });
    }

    function loadBarangProfileBumdesDropdown(selectedProfileId = null) {
        const selectEl = document.getElementById('barang_profile_bumdes_id');
        const containerEl = document.getElementById('barang_profile_bumdes_container');
        if(!selectEl) return;
        
        fetch('/api/profiles')
            .then(res => res.json())
            .then(data => {
                const loggedProfileId = localStorage.getItem('sibumdes_profile_id');
                let options = '';
                
                if (!loggedProfileId) {
                    if(containerEl) containerEl.style.display = 'block';
                } else {
                    if(containerEl) containerEl.style.display = 'none';
                }

                if (data && data.length > 0) {
                    data.forEach((p, idx) => {
                        if (loggedProfileId && loggedProfileId != p.ID) return;
                        let isSelected = '';
                        if (selectedProfileId == p.ID || loggedProfileId == p.ID) {
                            isSelected = 'selected';
                        } else if (!loggedProfileId && !selectedProfileId && idx === 0) {
                            isSelected = 'selected';
                        }
                        options += `<option value="${p.ID}" ${isSelected}>${p.NamaBUMDes}</option>`;
                    });
                }
                selectEl.innerHTML = options;
                
                const event = new Event('change');
                selectEl.dispatchEvent(event);
            });
    }

    function normalizeBarangStatus(value) {
        const normalized = String(value || '').trim();
        return normalized || 'Aktif';
    }

    function formatBarangQuantity(value) {
        const numericValue = Number(value) || 0;
        return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(numericValue);
    }

    function applyBarangFormDefaults() {
        const statusInput = document.getElementById('barang_status');
        if (statusInput && !statusInput.value) {
            statusInput.value = 'Aktif';
        }

        const linkAkunInput = document.getElementById('barang_link_akun');
        if (linkAkunInput && !linkAkunInput.value.trim()) {
            linkAkunInput.value = '1-1420 Persediaan Barang Jadi; 5-1200 HPP Barang Jadi';
        }

        const checkboxInput = document.getElementById('kartu_persediaan');
        if (checkboxInput) {
            checkboxInput.checked = true;
        }
    }

    function getBarangLinkAkunAutocompleteState() {
        if (!globalThis.__sibumdesBarangLinkAkunAutocompleteState) {
            globalThis.__sibumdesBarangLinkAkunAutocompleteState = {
                options: ['-', '1-1420 Persediaan Barang Jadi; 5-1200 HPP Barang Jadi'],
            };
        }
        return globalThis.__sibumdesBarangLinkAkunAutocompleteState;
    }

    function renderBarangLinkAkunDropdown(filterText = '') {
        const dropdownEl = document.getElementById('barang_link_akun_dropdown');
        const inputEl = document.getElementById('barang_link_akun');
        if (!dropdownEl || !inputEl) return;
        const barangLinkAkunAutocompleteState = getBarangLinkAkunAutocompleteState();

        const keyword = String(filterText || '').trim().toLowerCase();
        const filteredOptions = barangLinkAkunAutocompleteState.options.filter((option) => {
            if (!keyword) return true;
            return String(option || '').toLowerCase().includes(keyword);
        });

        if (!filteredOptions.length) {
            dropdownEl.innerHTML = '<div style="padding:12px 14px; color:var(--text-secondary);">Tidak ada akun yang cocok.</div>';
            dropdownEl.style.display = 'block';
            return;
        }

        dropdownEl.innerHTML = filteredOptions.map((option) => {
            const isSelected = String(inputEl.value || '').trim() === String(option || '').trim();
            return `<button type="button" data-value="${escapeHTML(option)}" style="display:block; width:100%; padding:10px 14px; text-align:left; border:none; background:${isSelected ? '#f0f7ff' : '#fff'}; color:var(--text-primary); cursor:pointer;">${escapeHTML(option)}</button>`;
        }).join('');
        dropdownEl.style.display = 'block';
    }

    function hideBarangLinkAkunDropdown() {
        const dropdownEl = document.getElementById('barang_link_akun_dropdown');
        if (dropdownEl) {
            dropdownEl.style.display = 'none';
        }
    }

    function setupBarangLinkAkunAutocomplete() {
        const inputEl = document.getElementById('barang_link_akun');
        const dropdownEl = document.getElementById('barang_link_akun_dropdown');
        if (!inputEl || !dropdownEl || inputEl.dataset.autocompleteBound === 'true') return;

        inputEl.addEventListener('focus', () => {
            renderBarangLinkAkunDropdown('');
        });

        inputEl.addEventListener('input', () => {
            renderBarangLinkAkunDropdown(inputEl.value);
        });

        inputEl.addEventListener('blur', () => {
            setTimeout(() => hideBarangLinkAkunDropdown(), 120);
        });

        dropdownEl.addEventListener('mousedown', (event) => {
            const optionBtn = event.target.closest('button[data-value]');
            if (!optionBtn) return;
            event.preventDefault();
            inputEl.value = optionBtn.getAttribute('data-value') || '-';
            hideBarangLinkAkunDropdown();
        });

        inputEl.dataset.autocompleteBound = 'true';
    }

    function loadBarangLinkAkunOptions(selectedValue = '') {
        const inputEl = document.getElementById('barang_link_akun');
        const dropdownEl = document.getElementById('barang_link_akun_dropdown');
        if (!inputEl || !dropdownEl) return Promise.resolve();
        const barangLinkAkunAutocompleteState = getBarangLinkAkunAutocompleteState();

        setupBarangLinkAkunAutocomplete();

        barangLinkAkunAutocompleteState.options = ['-', '1-1420 Persediaan Barang Jadi; 5-1200 HPP Barang Jadi'];
        inputEl.value = String(selectedValue || '').trim() || '1-1420 Persediaan Barang Jadi; 5-1200 HPP Barang Jadi';
        dropdownEl.innerHTML = '<div style="padding:12px 14px; color:var(--text-secondary);">Memuat akun CoA...</div>';

        return fetchCoaAccountOptions()
            .then((options) => {
                const fallbackValue = String(selectedValue || '').trim() || '1-1420 Persediaan Barang Jadi; 5-1200 HPP Barang Jadi';
                const normalizedOptions = options
                    .filter((option) => String(option.value || '').trim() && String(option.value || '').trim() !== '-')
                    .slice()
                    .sort((left, right) => String(left.label || '').localeCompare(String(right.label || ''), 'id'))
                    .map((option) => String(option.value || '').trim());
                const uniqueOptions = Array.from(new Set(['-', '1-1420 Persediaan Barang Jadi; 5-1200 HPP Barang Jadi', ...normalizedOptions]));
                barangLinkAkunAutocompleteState.options = uniqueOptions;
                inputEl.value = fallbackValue;
                hideBarangLinkAkunDropdown();
            })
            .catch((error) => {
                console.error('Failed to load barang link akun options', error);
                const fallbackValue = String(selectedValue || '').trim() || '1-1420 Persediaan Barang Jadi; 5-1200 HPP Barang Jadi';
                barangLinkAkunAutocompleteState.options = Array.from(new Set(['-', '1-1420 Persediaan Barang Jadi; 5-1200 HPP Barang Jadi', fallbackValue]));
                inputEl.value = fallbackValue;
                hideBarangLinkAkunDropdown();
                showToast('Gagal memuat akun CoA untuk link akun barang.', true);
            });
    }

    function setupBarangSaldoAwalNominalInput() {
        const saldoInput = document.getElementById('saldo_awal_nominal');
        if (!saldoInput || saldoInput.dataset.bound === 'true') return;

        saldoInput.addEventListener('focus', () => {
            const numericValue = parsePelangganNumber(saldoInput.value);
            saldoInput.value = numericValue ? String(numericValue) : '';
        });

        saldoInput.addEventListener('blur', () => {
            const numericValue = parsePelangganNumber(saldoInput.value);
            saldoInput.value = numericValue ? formatPelangganCurrency(numericValue) : '';
        });

        saldoInput.dataset.bound = 'true';
    }

    function updateBarangSaldoAwalNominalFromQtyAndHarga() {
        const qtyInput = document.getElementById('saldo_awal_qty');
        const hargaBeliInput = document.getElementById('harga_beli_awal');
        const saldoNominalInput = document.getElementById('saldo_awal_nominal');
        if (!qtyInput || !hargaBeliInput || !saldoNominalInput) return;

        const qtyValue = Number(qtyInput.value || 0);
        const hargaBeliValue = Number(hargaBeliInput.value || 0);
        const totalNominal = qtyValue * hargaBeliValue;

        saldoNominalInput.value = totalNominal ? formatPelangganCurrency(totalNominal) : '';
    }

    function setupBarangSaldoAwalAutoCalculation() {
        const qtyInput = document.getElementById('saldo_awal_qty');
        const hargaBeliInput = document.getElementById('harga_beli_awal');
        if (!qtyInput || !hargaBeliInput) return;

        [qtyInput, hargaBeliInput].forEach((inputEl) => {
            if (inputEl.dataset.autoSaldoNominalBound === 'true') return;

            ['input', 'change'].forEach((eventName) => {
                inputEl.addEventListener(eventName, updateBarangSaldoAwalNominalFromQtyAndHarga);
            });

            inputEl.dataset.autoSaldoNominalBound = 'true';
        });
    }

    var activeBarangKartuPersediaanSlug = null;

    function getBarangKartuPersediaanButtonStyle(isActive) {
        if (isActive) {
            return 'display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:#ca8a04;color:#fff;border:none;cursor:pointer;box-shadow:0 10px 20px rgba(202,138,4,0.28);outline:2px solid rgba(202,138,4,0.2);outline-offset:2px;';
        }
        return 'display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:#0f766e;color:#fff;border:none;cursor:pointer;box-shadow:0 8px 18px rgba(15,118,110,0.18);';
    }

    function updateBarangKartuPersediaanButtonState() {
        const buttons = document.querySelectorAll('#barang-table-container button[data-barang-kartu-persediaan="true"]');
        buttons.forEach((button) => {
            const isActive = button.dataset.barangSlug === activeBarangKartuPersediaanSlug;
            button.setAttribute('style', getBarangKartuPersediaanButtonStyle(isActive));
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            button.title = isActive
                ? `Kartu persediaan ${button.dataset.barangNama || 'barang'} sedang dibuka`
                : `Lihat kartu persediaan ${button.dataset.barangNama || 'barang'}`;
        });
    }

    function renderBarangTable(barang = getFilteredBarangItems()) {
        const container = document.getElementById('barang-table-container');
        if(!container) return;
        const barangTableState = getBarangTableState();

        syncBarangSearchInputs(barangTableState.searchTerm);

        if (barang.length === 0) {
            const hasSearch = String(barangTableState.searchTerm || '').trim() !== '';
            container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-secondary);">
                <i class="fa-solid fa-box fa-3x" style="margin-bottom:16px;"></i>
                <p>${hasSearch ? 'Tidak ada data barang yang cocok dengan pencarian.' : 'Belum ada data barang yang terdaftar.'}</p>
            </div>`;
            return;
        }

        const totalSaldoAwalNominal = barang.reduce((total, b) => total + (Number(b.saldo_awal_nominal) || 0), 0);

        let tableRows = '';
        barang.forEach((b) => {
            const unitName = b.unit_usaha && b.unit_usaha.NamaUnitUsaha ? b.unit_usaha.NamaUnitUsaha : '-';
            const bumdesName = b.profile_bumdes && b.profile_bumdes.NamaBUMDes ? b.profile_bumdes.NamaBUMDes : '';
            const status = normalizeBarangStatus(b.status);
            const isActiveKartu = b.slug === activeBarangKartuPersediaanSlug;
            const checkboxIcon = b.kartu_persediaan
                ? `<button type="button" data-barang-kartu-persediaan="true" data-barang-slug="${b.slug}" data-barang-nama="${escapeHtml(b.nama_barang || 'barang')}" aria-pressed="${isActiveKartu ? 'true' : 'false'}" title="${isActiveKartu ? `Kartu persediaan ${escapeHtml(b.nama_barang || 'barang')} sedang dibuka` : `Lihat kartu persediaan ${escapeHtml(b.nama_barang || '')}`}" onclick="window.showBarangKartuPersediaan('${b.slug}', '${String(b.nama_barang || '').replace(/'/g, "\\'")}')" style="${getBarangKartuPersediaanButtonStyle(isActiveKartu)}"><i class="fa-solid fa-check"></i></button>`
                : '<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--text-secondary);"></span>';
            let bumdesBadge = '';
            if (b.profile_bumdes_id && b.profile_bumdes) {
                bumdesBadge = `<span class="badge" style="background:#e0f2fe; color:#0284c7; margin-bottom: 4px; display: inline-block;">${escapeHTML(bumdesName)}</span><br>`;
            } else if (!b.profile_bumdes_id) {
                bumdesBadge = '<span class="badge" style="background:#fee2e2; color:#dc2626; margin-bottom: 4px; display: inline-block;">PENGEMBANG</span><br>';
            }

            tableRows += `
                <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:12px;font-weight:500;color:var(--text-primary);">${b.kode_barang || '-'}</td>
                    <td style="padding:12px;white-space: nowrap;color:var(--text-secondary);">${bumdesBadge}<span class="badge" style="background:var(--bg-secondary); color:var(--text-secondary);">${escapeHTML(unitName)}</span></td>
                    <td style="padding:12px;color:var(--text-secondary);">${b.nama_barang || '-'}</td>
                    <td style="padding:12px;color:var(--text-secondary);">${b.merk_barang || '-'}</td>
                    <td style="padding:12px;color:var(--text-secondary);text-align:right;">${new Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR'}).format(b.harga_beli_awal || 0) || '-'}</td>
                    <td style="padding:12px;color:var(--text-secondary);text-align:right;">${new Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR'}).format(b.harga_jual || 0) || '-'}</td>
                    <td style="padding:12px;color:var(--text-secondary);text-align:center;">${b.satuan || '-'}</td>
                    <td style="padding:12px;color:var(--text-secondary);text-align:right;">${formatBarangQuantity(b.saldo_awal_qty)}</td>
                    <td style="padding:12px;color:var(--text-secondary);text-align:right;white-space:nowrap;">${formatPelangganCurrency(b.saldo_awal_nominal)}</td>
                    <td style="padding:12px;text-align:center;white-space:nowrap;">${status}</td>
                    <td style="padding:12px;text-align:center;">${checkboxIcon}</td>
                    <td style="padding:12px;color:var(--text-primary);white-space:nowrap;">${b.link_akun || '1-1420 Persediaan Barang Jadi; 5-1200 HPP Barang Jadi'}</td>
                    <td style="padding:12px;text-align:center;white-space:nowrap;">
                        <button class="action-btn edit" title="Edit Barang" onclick="window.editBarangAction('${b.slug}')"><i class="fa-solid fa-pen"></i></button>
                        <button class="action-btn delete" title="Hapus Barang" onclick="window.deleteBarangAction('${b.slug}')"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });

        container.innerHTML = `
            <div style="overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-md);">
                <table class="data-table" style="width:100%;border-collapse:collapse;text-align:left;min-width:1960px;">
                    <thead>
                        <tr style="background:#f5f5f5;border-bottom:1px solid var(--border);">
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Kode Barang</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Unit Usaha</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Nama Barang</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Merk</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:right;">Harga Beli</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:right;">Harga Jual</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:center;">Satuan</th>
                            <th colspan="2" style="padding:12px;font-weight:600;color:var(--text-primary);text-align:center;">Saldo Awal Per 1 Januari 2026</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:center;">Status</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:center;white-space:nowrap;">Kartu Persediaan</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);white-space:nowrap;">Link Akun</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:center;white-space:nowrap;">Aksi</th>
                        </tr>
                        <tr style="background:#f5f5f5;border-bottom:2px solid var(--border);">
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);"></th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);"></th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);"></th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);"></th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);"></th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);"></th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:right;"></th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:right;"></th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);"></th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);"></th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);"></th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);"></th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                    <tfoot>
                        <tr style="border-top:2px solid var(--border);background:#fff;">
                            <td colspan="7" style="padding:12px;"></td>
                            <td style="padding:12px;background:#fff59d;color:var(--text-primary);font-weight:700;white-space:nowrap;">Total Saldo Awal</td>
                            <td style="padding:12px;background:#fff59d;color:var(--text-primary);font-weight:700;text-align:right;white-space:nowrap;">${formatPelangganCurrency(totalSaldoAwalNominal)}</td>
                            <td colspan="4" style="padding:12px;"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    }

    window.editBarangAction = function(slug) {
        navigateTo('/barang/edit/' + slug);
    };

    function editBarangData(slug) {
        const bForm = document.getElementById('barangForm');
        if(bForm) bForm.reset();
        
        const profileDropdown = document.getElementById('barang_profile_bumdes_id');
        if(profileDropdown) {
            profileDropdown.onchange = function(e) {
                loadUnitUsahaDropdown(null, e.target.value, 'barang_unit_usaha_id');
            };
        }
        
        fetch('/api/barang?slug=' + slug)
            .then(res => res.json())
            .then(data => {
                if(!data || !data.slug) {
                    navigateTo('/barang');
                    return;
                }
                const idEl = document.getElementById('barang_id');
                if(idEl) idEl.name = "slug";
                if(idEl) idEl.value = data.slug;
                
                if(data.unit_usaha_id) {
                    const drop = document.getElementById('barang_unit_usaha_id');
                    if(drop) drop.dataset.selected_unit_id = data.unit_usaha_id;
                }
                
                loadBarangProfileBumdesDropdown(data.profile_bumdes_id);

                const kodeEl = document.getElementById('kode_barang');
                if(kodeEl) kodeEl.value = data.kode_barang;
                
                const namaEl = document.getElementById('nama_barang');
                if(namaEl) namaEl.value = data.nama_barang;
                
                const merkEl = document.getElementById('merk_barang');
                if(merkEl) merkEl.value = data.merk_barang;

                const hbaEl = document.getElementById('harga_beli_awal');
                if(hbaEl) hbaEl.value = data.harga_beli_awal;

                const hjEl = document.getElementById('harga_jual');
                if(hjEl) hjEl.value = data.harga_jual;

                const satuanEl = document.getElementById('satuan');
                if(satuanEl) satuanEl.value = data.satuan;

                const saldoQtyEl = document.getElementById('saldo_awal_qty');
                if(saldoQtyEl) saldoQtyEl.value = data.saldo_awal_qty || 0;

                const saldoNominalEl = document.getElementById('saldo_awal_nominal');
                if(saldoNominalEl) saldoNominalEl.value = data.saldo_awal_nominal ? formatPelangganCurrency(data.saldo_awal_nominal) : '';

                const statusEl = document.getElementById('barang_status');
                if(statusEl) statusEl.value = normalizeBarangStatus(data.status);

                const kartuEl = document.getElementById('kartu_persediaan');
                if(kartuEl) kartuEl.checked = Boolean(data.kartu_persediaan);

                loadBarangLinkAkunOptions(data.link_akun || '1-1420 Persediaan Barang Jadi; 5-1200 HPP Barang Jadi');
            })
            .catch(err => {
                console.error(err);
                showToast('Gagal memuat profil barang', true);
            });
    }

    window.deleteBarangAction = function(slug) {
        window.showConfirmModal('Apakah Anda yakin ingin menghapus data barang ini?', () => {
            fetch('/api/barang?slug=' + slug, { method: 'DELETE' })
            .then(res => {
                if(res.ok) {
                    showToast('Barang berhasil dihapus');
                    loadBarang();
                } else {
                    showToast('Gagal menghapus barang', true);
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Kesalahan jaringan', true);
            });
        });
    };

    // Barang & Jasa CRUD Functions
    function loadBarangJasa() {
        const container = document.getElementById('barang-jasa-table-container');
        if(container && !container.innerHTML.includes('table')) {
            container.innerHTML = `<div style="text-align:center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat data...</div>`;
        }

        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        fetch('/api/barang-jasas?session_slug=' + sessionSlug + '&t=' + new Date().getTime())
            .then(res => res.json())
            .then(data => {
                renderBarangJasaTable(data || []);
            })
            .catch(err => {
                console.error(err);
                if(container) container.innerHTML = `<div style="color:var(--danger); text-align:center;">Gagal memuat data barang & jasa.</div>`;
            });
    }

    function loadBarangJasaProfileBumdesDropdown(selectedProfileId = null) {
        const selectEl = document.getElementById('barang_jasa_profile_bumdes_id');
        const containerEl = document.getElementById('barang_jasa_profile_bumdes_container');
        if(!selectEl) return;

        fetch('/api/profiles')
            .then(res => res.json())
            .then(data => {
                const loggedProfileId = localStorage.getItem('sibumdes_profile_id');
                let options = '';

                if (!loggedProfileId) {
                    if(containerEl) containerEl.style.display = 'block';
                } else {
                    if(containerEl) containerEl.style.display = 'none';
                }

                if (data && data.length > 0) {
                    data.forEach((p, idx) => {
                        if (loggedProfileId && loggedProfileId != p.ID) return;
                        let isSelected = '';
                        if (selectedProfileId == p.ID || loggedProfileId == p.ID) {
                            isSelected = 'selected';
                        } else if (!loggedProfileId && !selectedProfileId && idx === 0) {
                            isSelected = 'selected';
                        }
                        options += `<option value="${p.ID}" ${isSelected}>${p.NamaBUMDes}</option>`;
                    });
                }
                selectEl.innerHTML = options;

                const event = new Event('change');
                selectEl.dispatchEvent(event);
            });
    }

    function renderBarangJasaTable(barangJasaList) {
        const container = document.getElementById('barang-jasa-table-container');
        if(!container) return;

        if (barangJasaList.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-secondary);">
                <i class="fa-solid fa-box-open fa-3x" style="margin-bottom:16px;"></i>
                <p>Belum ada data barang & jasa yang terdaftar.</p>
            </div>`;
            return;
        }

        let tableRows = '';
        barangJasaList.forEach((bj, idx) => {
            const unitName = bj.unit_usaha && bj.unit_usaha.NamaUnitUsaha ? bj.unit_usaha.NamaUnitUsaha : '-';
            const jenisLabel = (bj.jenis || '-').toString();
            const jenisBadgeColor = jenisLabel.toLowerCase() === 'jasa'
                ? 'background:#fef3c7; color:#92400e;'
                : 'background:#dcfce7; color:#166534;';

            let bumdesBadge = '';
            if (bj.profile_bumdes_id && bj.profile_bumdes) {
                bumdesBadge = `<span class="badge" style="background:#e0f2fe; color:#0284c7; margin-bottom: 4px; display: inline-block;">${bj.profile_bumdes.NamaBUMDes}</span><br>`;
            } else if (!bj.profile_bumdes_id) {
                bumdesBadge = `<span class="badge" style="background:#fee2e2; color:#dc2626; margin-bottom: 4px; display: inline-block;">PENGEMBANG</span><br>`;
            }

            tableRows += `
                <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:12px;color:var(--text-secondary);">${idx + 1}</td>
                    <td style="padding:12px;white-space: nowrap;color:var(--text-secondary);">${bumdesBadge}<span class="badge" style="background:var(--bg-secondary); color:var(--text-secondary);">${unitName}</span></td>
                    <td style="padding:12px;font-weight:500;color:var(--text-primary);">${bj.kode_barang_jasa || '-'}</td>
                    <td style="padding:12px;color:var(--text-secondary);">${bj.nama_barang_jasa || '-'}</td>
                    <td style="padding:12px;color:var(--text-secondary);"><span class="badge" style="${jenisBadgeColor}">${jenisLabel}</span></td>
                    <td style="padding:12px;color:var(--text-secondary);text-align:center;">${bj.satuan || '-'}</td>
                    <td style="padding:12px;color:var(--text-secondary);text-align:right;">${new Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR'}).format(bj.harga_beli_awal || 0) || '-'}</td>
                    <td style="padding:12px;color:var(--text-secondary);text-align:right;">${new Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR'}).format(bj.harga_jual || 0) || '-'}</td>
                    <td style="padding:12px;text-align:center;white-space:nowrap;">
                        <button class="action-btn edit" title="Edit Barang/Jasa" onclick="window.editBarangJasaAction('${bj.slug}')"><i class="fa-solid fa-pen"></i></button>
                        <button class="action-btn delete" title="Hapus Barang/Jasa" onclick="window.deleteBarangJasaAction('${bj.slug}')"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });

        container.innerHTML = `
            <div style="overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-md);">
                <table class="data-table" style="width:100%;border-collapse:collapse;text-align:left;min-width:1100px;">
                    <thead>
                        <tr style="background:#f5f5f5;border-bottom:2px solid var(--border);">
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);white-space:nowrap;">No</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Unit Usaha</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Kode</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Nama</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Jenis</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:center;">Satuan</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:right;">Harga Beli Awal</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:right;">Harga Jual</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:center;white-space:nowrap;">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
    }

    window.editBarangJasaAction = function(slug) {
        navigateTo('/barang-jasa/edit/' + slug);
    };

    function editBarangJasaData(slug) {
        const bjForm = document.getElementById('barangJasaForm');
        if(bjForm) bjForm.reset();

        const profileDropdown = document.getElementById('barang_jasa_profile_bumdes_id');
        if(profileDropdown) {
            profileDropdown.onchange = function(e) {
                loadUnitUsahaDropdown(null, e.target.value, 'barang_jasa_unit_usaha_id');
            };
        }

        fetch('/api/barang-jasa?slug=' + slug)
            .then(res => res.json())
            .then(data => {
                if(!data || !data.slug) {
                    navigateTo('/barang-jasa');
                    return;
                }

                const idEl = document.getElementById('barang_jasa_id');
                if(idEl) {
                    idEl.name = 'slug';
                    idEl.value = data.slug;
                }

                if(data.unit_usaha_id) {
                    const drop = document.getElementById('barang_jasa_unit_usaha_id');
                    if(drop) drop.dataset.selected_unit_id = data.unit_usaha_id;
                }

                loadBarangJasaProfileBumdesDropdown(data.profile_bumdes_id);

                const kodeEl = document.getElementById('kode_barang_jasa');
                if(kodeEl) kodeEl.value = data.kode_barang_jasa;

                const namaEl = document.getElementById('nama_barang_jasa');
                if(namaEl) namaEl.value = data.nama_barang_jasa;

                const jenisEl = document.getElementById('jenis_barang_jasa');
                if(jenisEl) jenisEl.value = data.jenis;

                const satuanEl = document.getElementById('satuan_barang_jasa');
                if(satuanEl) satuanEl.value = data.satuan;

                const hbaEl = document.getElementById('harga_beli_awal_barang_jasa');
                if(hbaEl) hbaEl.value = data.harga_beli_awal;

                const hjEl = document.getElementById('harga_jual_barang_jasa');
                if(hjEl) hjEl.value = data.harga_jual;
            })
            .catch(err => {
                console.error(err);
                showToast('Gagal memuat data barang & jasa', true);
            });
    }

    window.deleteBarangJasaAction = function(slug) {
        window.showConfirmModal('Apakah Anda yakin ingin menghapus data barang/jasa ini?', () => {
            fetch('/api/barang-jasa?slug=' + slug, { method: 'DELETE' })
            .then(res => {
                if(res.ok) {
                    showToast('Barang/Jasa berhasil dihapus');
                    loadBarangJasa();
                } else {
                    showToast('Gagal menghapus barang/jasa', true);
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Kesalahan jaringan', true);
            });
        });
    };

    // Inventaris CRUD Functions
    function getInventarisTableState() {
        if (!globalThis.__sibumdesInventarisTableState) {
            globalThis.__sibumdesInventarisTableState = {
                items: [],
                searchTerm: '',
            };
        }
        return globalThis.__sibumdesInventarisTableState;
    }

    function getInventarisSearchInputs() {
        return [document.getElementById('top-header-search-input')].filter(Boolean);
    }

    function syncInventarisSearchInputs(value) {
        getInventarisSearchInputs().forEach((inputEl) => {
            if (inputEl.value !== value) {
                inputEl.value = value;
            }
        });
    }

    function getFilteredInventarisItems() {
        const inventarisTableState = getInventarisTableState();
        const items = Array.isArray(inventarisTableState.items) ? inventarisTableState.items : [];
        const keyword = String(inventarisTableState.searchTerm || '').trim().toLowerCase();
        if (!keyword) return items;

        return items.filter((item) => {
            const unitName = item && item.unit_usaha && item.unit_usaha.NamaUnitUsaha ? item.unit_usaha.NamaUnitUsaha : '';
            const bumdesName = item && item.profile_bumdes && item.profile_bumdes.NamaBUMDes ? item.profile_bumdes.NamaBUMDes : '';
            const status = normalizeInventarisStatus(item && (item.status || (item.aktif ? 'Aktif' : 'Tidak Aktif')));
            const kartuAsetTetap = item && item.kartu_aset_tetap ? 'ya aktif true 1' : 'tidak nonaktif false 0';
            const haystack = [
                item && item.kode_aset,
                bumdesName,
                unitName,
                item && item.nama_aset,
                item && item.merk_aset,
                item && item.kategori_aset,
                formatInventarisCurrency(item && item.harga_beli),
                formatJurnalWorkbookDate(item && item.tanggal_pembelian),
                item && item.umur_ekonomis,
                formatInventarisCurrency(item && item.nilai_residu),
                formatInventarisCurrency(item && item.saldo_awal),
                item && item.link_akun_aset_tetap,
                formatInventarisCurrency(item && item.akumulasi_penyusutan_awal),
                item && item.link_akun_akumulasi_penyusutan,
                formatInventarisCurrency(Math.max((Number(item && item.saldo_awal) || 0) - (Number(item && item.akumulasi_penyusutan_awal) || 0), 0)),
                status,
                formatJurnalWorkbookDate(item && item.tanggal_digunakan),
                formatJurnalWorkbookDate(item && item.tanggal_status_tidak_aktif),
                kartuAsetTetap,
            ].map((value) => String(value || '').toLowerCase()).join(' ');

            return haystack.includes(keyword);
        });
    }

    function handleInventarisSearchChange(event) {
        if (window.location.pathname !== '/inventaris') return;
        const inventarisTableState = getInventarisTableState();
        inventarisTableState.searchTerm = event && event.target ? (event.target.value || '') : '';
        syncInventarisSearchInputs(inventarisTableState.searchTerm);
        renderInventarisTable();
    }

    function setupInventarisTableSearch() {
        const inventarisTableState = getInventarisTableState();
        const searchInputs = getInventarisSearchInputs();
        if (!searchInputs.length) return;

        syncInventarisSearchInputs(inventarisTableState.searchTerm);

        searchInputs.forEach((searchInput) => {
            if (searchInput.dataset.inventarisBound === 'true') return;

            ['input', 'search'].forEach((eventName) => {
                searchInput.addEventListener(eventName, handleInventarisSearchChange);
            });
            searchInput.dataset.inventarisBound = 'true';
        });
    }

    function loadInventaris() {
        const inventarisTableState = getInventarisTableState();
        const container = document.getElementById('inventaris-table-container');
        inventarisTableState.searchTerm = '';
        setupInventarisTableSearch();
        if(container && !container.innerHTML.includes('table')) {
            container.innerHTML = `<div style="text-align:center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat data...</div>`;
        }

        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        fetch('/api/inventariss?session_slug=' + sessionSlug + '&t=' + new Date().getTime())
            .then(res => res.json())
            .then(data => {
                inventarisTableState.items = Array.isArray(data) ? data : [];
                renderInventarisTable();
            })
            .catch(err => {
                console.error(err);
                if(container) container.innerHTML = `<div style="color:var(--danger); text-align:center;">Gagal memuat data inventaris.</div>`;
            });
    }

    function mergeInventarisTableItem(updatedItem) {
        if (!updatedItem || !updatedItem.slug) return;
        const inventarisTableState = getInventarisTableState();
        const currentItems = Array.isArray(inventarisTableState.items) ? inventarisTableState.items.slice() : [];
        const targetSlug = String(updatedItem.slug || '').trim();
        const foundIndex = currentItems.findIndex((item) => String(item && item.slug || '').trim() === targetSlug);

        if (foundIndex >= 0) {
            currentItems[foundIndex] = updatedItem;
        } else {
            currentItems.unshift(updatedItem);
        }

        inventarisTableState.items = currentItems;
        renderInventarisTable();
    }

    function buildInventarisKategoriOptions(selectedValue) {
        const normalizedSelected = String(selectedValue || '').trim();
        const options = ['', 'Tanah', 'Bangunan', 'Kendaraan', 'Peralatan', 'Mesin', 'Inventaris Kantor', 'Lainnya'];
        return options.map((option) => {
            const label = option || '-- Pilih Kategori --';
            const selected = option === normalizedSelected ? 'selected' : '';
            return `<option value="${escapeHTML(option)}" ${selected}>${escapeHTML(label)}</option>`;
        }).join('');
    }

    function openEditInventarisModal(slug) {
        const targetSlug = String(slug || '').trim();
        if (!targetSlug) return;

        const existing = document.getElementById('edit-inventaris-modal');
        if (existing) existing.remove();

        fetch('/api/inventaris?slug=' + encodeURIComponent(targetSlug))
            .then((res) => {
                if (!res.ok) throw new Error('Gagal memuat detail inventaris');
                return res.json();
            })
            .then((inv) => {
                if (!inv || !inv.slug) {
                    throw new Error('Data inventaris tidak ditemukan');
                }

                const unitName = inv.unit_usaha && inv.unit_usaha.NamaUnitUsaha ? inv.unit_usaha.NamaUnitUsaha : '-';
                const checkedAttr = inv.kartu_aset_tetap ? 'checked' : '';

                const modal = document.createElement('div');
                modal.id = 'edit-inventaris-modal';
                modal.className = 'modal-overlay';
                modal.style.display = 'flex';
                modal.innerHTML = `
                    <div class="modal-content" style="max-width:960px; width:min(960px, calc(100vw - 32px)); text-align:left; padding:0; overflow:hidden; border:1px solid rgba(148,163,184,0.18); box-shadow:0 28px 80px rgba(15,23,42,0.28);">
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid var(--border); background:#f8fafc;">
                            <div>
                                <h3 style="margin:0; font-size:1.1rem; color:var(--text-primary);">Edit Data Inventaris</h3>
                                <p style="margin:4px 0 0; color:var(--text-secondary); font-size:0.85rem;">Klik Simpan untuk langsung memperbarui tabel.</p>
                            </div>
                            <button id="edit-inventaris-close" type="button" style="border:none; background:none; font-size:1.4rem; line-height:1; cursor:pointer; color:var(--text-secondary);">&times;</button>
                        </div>
                        <form id="edit-inventaris-form" style="padding:20px;">
                            <input type="hidden" name="slug" value="${escapeHTML(inv.slug || '')}">
                            <input type="hidden" name="unit_usaha_id" value="${escapeHTML(String(inv.unit_usaha_id || ''))}">
                            <div style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:12px 14px;">
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:600; margin-bottom:6px;">Kode Aset</label>
                                    <input id="edit-inv-kode-aset" type="text" name="kode_aset" value="${escapeHTML(inv.kode_aset || '')}" readonly style="width:100%; background:#f3f4f6; border:1px solid var(--border); border-radius:8px; padding:8px 10px;">
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:600; margin-bottom:6px;">Unit Usaha</label>
                                    <input type="text" value="${escapeHTML(unitName)}" readonly style="width:100%; background:#f8fafc; border:1px solid var(--border); border-radius:8px; padding:8px 10px; color:var(--text-secondary);">
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:600; margin-bottom:6px;">Nama Aset</label>
                                    <input id="edit-inv-nama-aset" type="text" name="nama_aset" value="${escapeHTML(inv.nama_aset || '')}" required style="width:100%; border:1px solid var(--border); border-radius:8px; padding:8px 10px;">
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:600; margin-bottom:6px;">Merk Aset</label>
                                    <input id="edit-inv-merk-aset" type="text" name="merk_aset" value="${escapeHTML(inv.merk_aset || '')}" style="width:100%; border:1px solid var(--border); border-radius:8px; padding:8px 10px;">
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:600; margin-bottom:6px;">Kategori Aset</label>
                                    <select id="edit-inv-kategori" name="kategori_aset" style="width:100%; border:1px solid var(--border); border-radius:8px; padding:8px 10px;">${buildInventarisKategoriOptions(inv.kategori_aset)}</select>
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:600; margin-bottom:6px;">Status</label>
                                    <select id="edit-inv-status" name="status" style="width:100%; border:1px solid var(--border); border-radius:8px; padding:8px 10px;">
                                        <option value="Aktif" ${normalizeInventarisStatus(inv.status) === 'Aktif' ? 'selected' : ''}>Aktif</option>
                                        <option value="Dijual" ${normalizeInventarisStatus(inv.status) === 'Dijual' ? 'selected' : ''}>Dijual</option>
                                        <option value="Dihapus" ${normalizeInventarisStatus(inv.status) === 'Dihapus' ? 'selected' : ''}>Dihapus</option>
                                        <option value="Tidak Aktif (Dihentikan)" ${normalizeInventarisStatus(inv.status) === 'Tidak Aktif (Dihentikan)' ? 'selected' : ''}>Tidak Aktif (Dihentikan)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:600; margin-bottom:6px;">Harga Perolehan (Rp)</label>
                                    <input id="edit-inv-harga" type="text" name="harga_beli" value="${escapeHTML(formatInventarisCurrency(inv.harga_beli || 0))}" style="width:100%; border:1px solid var(--border); border-radius:8px; padding:8px 10px;">
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:600; margin-bottom:6px;">Tanggal Beli</label>
                                    <input id="edit-inv-tanggal-beli" type="date" name="tanggal_pembelian" value="${escapeHTML(toInputDate(inv.tanggal_pembelian) || '')}" style="width:100%; border:1px solid var(--border); border-radius:8px; padding:8px 10px;">
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:600; margin-bottom:6px;">Umur Ekonomis (tahun)</label>
                                    <input id="edit-inv-umur" type="number" name="umur_ekonomis" min="0" value="${escapeHTML(String(inv.umur_ekonomis || 0))}" style="width:100%; border:1px solid var(--border); border-radius:8px; padding:8px 10px;">
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:600; margin-bottom:6px;">Nilai Residu (Rp)</label>
                                    <input id="edit-inv-residu" type="text" name="nilai_residu" value="${escapeHTML(formatInventarisCurrency(inv.nilai_residu || 0))}" style="width:100%; border:1px solid var(--border); border-radius:8px; padding:8px 10px;">
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:600; margin-bottom:6px;">Saldo Awal (Rp)</label>
                                    <input id="edit-inv-saldo-awal" type="text" name="saldo_awal" value="${escapeHTML(formatInventarisCurrency(inv.saldo_awal || 0))}" style="width:100%; border:1px solid var(--border); border-radius:8px; padding:8px 10px;">
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:600; margin-bottom:6px;">Akumulasi Penyusutan Awal (Rp)</label>
                                    <input id="edit-inv-akumulasi-awal" type="text" name="akumulasi_penyusutan_awal" value="${escapeHTML(formatInventarisCurrency(inv.akumulasi_penyusutan_awal || 0))}" style="width:100%; border:1px solid var(--border); border-radius:8px; padding:8px 10px;">
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:600; margin-bottom:6px;">Link Akun Aset Tetap</label>
                                    <input id="edit-inv-link-aset" type="text" name="link_akun_aset_tetap" value="${escapeHTML(inv.link_akun_aset_tetap || '-')}" style="width:100%; border:1px solid var(--border); border-radius:8px; padding:8px 10px;">
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:600; margin-bottom:6px;">Link Akun Akumulasi Penyusutan</label>
                                    <input id="edit-inv-link-akumulasi" type="text" name="link_akun_akumulasi_penyusutan" value="${escapeHTML(inv.link_akun_akumulasi_penyusutan || '-')}" style="width:100%; border:1px solid var(--border); border-radius:8px; padding:8px 10px;">
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:600; margin-bottom:6px;">Tanggal Digunakan</label>
                                    <input id="edit-inv-tanggal-digunakan" type="date" name="tanggal_digunakan" value="${escapeHTML(toInputDate(inv.tanggal_digunakan) || '')}" style="width:100%; border:1px solid var(--border); border-radius:8px; padding:8px 10px;">
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:600; margin-bottom:6px;">Tanggal Status Tidak Aktif</label>
                                    <input id="edit-inv-tanggal-nonaktif" type="date" name="tanggal_status_tidak_aktif" value="${escapeHTML(toInputDate(inv.tanggal_status_tidak_aktif) || '')}" style="width:100%; border:1px solid var(--border); border-radius:8px; padding:8px 10px;">
                                </div>
                            </div>
                            <div style="margin-top:14px; display:flex; align-items:center; gap:8px;">
                                <input id="edit-inv-kartu" type="checkbox" name="kartu_aset_tetap" value="1" ${checkedAttr} style="width:18px; height:18px; margin:0;">
                                <label for="edit-inv-kartu" style="margin:0; font-size:0.9rem; color:var(--text-primary);">Kartu Aset Tetap</label>
                            </div>
                            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
                                <button id="edit-inv-cancel" type="button" style="padding:10px 16px; border:1px solid var(--border); border-radius:8px; background:#fff; color:var(--text-primary); cursor:pointer;">Batal</button>
                                <button id="edit-inv-save" type="submit" style="padding:10px 16px; border:none; border-radius:8px; background:var(--primary); color:#fff; cursor:pointer; font-weight:600;">Simpan</button>
                            </div>
                        </form>
                    </div>
                `;

                document.body.appendChild(modal);
                document.body.style.overflow = 'hidden';

                const closeModal = () => {
                    modal.remove();
                    document.body.style.overflow = '';
                };

                const form = modal.querySelector('#edit-inventaris-form');
                const saveButton = modal.querySelector('#edit-inv-save');

                modal.querySelector('#edit-inventaris-close')?.addEventListener('click', closeModal);
                modal.querySelector('#edit-inv-cancel')?.addEventListener('click', closeModal);
                modal.addEventListener('click', (event) => {
                    if (event.target === modal) closeModal();
                });

                const currencyInputIds = ['edit-inv-harga', 'edit-inv-residu', 'edit-inv-saldo-awal', 'edit-inv-akumulasi-awal'];
                currencyInputIds.forEach((inputId) => {
                    const inputEl = modal.querySelector('#' + inputId);
                    if (!inputEl) return;

                    inputEl.addEventListener('focus', () => {
                        const numericValue = parsePelangganNumber(inputEl.value);
                        inputEl.value = numericValue ? String(numericValue) : '';
                    });
                    inputEl.addEventListener('blur', () => {
                        const numericValue = parsePelangganNumber(inputEl.value);
                        inputEl.value = numericValue ? formatInventarisCurrency(numericValue) : '';
                    });
                });

                form?.addEventListener('submit', (event) => {
                    event.preventDefault();
                    if (!form || !saveButton) return;

                    const params = new URLSearchParams();
                    params.set('slug', String(form.querySelector('[name="slug"]')?.value || '').trim());
                    params.set('unit_usaha_id', String(form.querySelector('[name="unit_usaha_id"]')?.value || '').trim());
                    params.set('kode_aset', String(form.querySelector('[name="kode_aset"]')?.value || '').trim());
                    params.set('nama_aset', String(form.querySelector('[name="nama_aset"]')?.value || '').trim());
                    params.set('merk_aset', String(form.querySelector('[name="merk_aset"]')?.value || '').trim());
                    params.set('kategori_aset', String(form.querySelector('[name="kategori_aset"]')?.value || '').trim());
                    params.set('harga_beli', String(parsePelangganNumber(form.querySelector('[name="harga_beli"]')?.value || '0')));
                    params.set('tanggal_pembelian', String(form.querySelector('[name="tanggal_pembelian"]')?.value || '').trim());
                    params.set('umur_ekonomis', String(form.querySelector('[name="umur_ekonomis"]')?.value || '0').trim());
                    params.set('nilai_residu', String(parsePelangganNumber(form.querySelector('[name="nilai_residu"]')?.value || '0')));
                    params.set('saldo_awal', String(parsePelangganNumber(form.querySelector('[name="saldo_awal"]')?.value || '0')));
                    params.set('akumulasi_penyusutan_awal', String(parsePelangganNumber(form.querySelector('[name="akumulasi_penyusutan_awal"]')?.value || '0')));
                    params.set('link_akun_aset_tetap', String(form.querySelector('[name="link_akun_aset_tetap"]')?.value || '-').trim() || '-');
                    params.set('link_akun_akumulasi_penyusutan', String(form.querySelector('[name="link_akun_akumulasi_penyusutan"]')?.value || '-').trim() || '-');
                    params.set('status', String(form.querySelector('[name="status"]')?.value || 'Aktif').trim() || 'Aktif');
                    params.set('tanggal_digunakan', String(form.querySelector('[name="tanggal_digunakan"]')?.value || '').trim());
                    params.set('tanggal_status_tidak_aktif', String(form.querySelector('[name="tanggal_status_tidak_aktif"]')?.value || '').trim());
                    params.set('kartu_aset_tetap', form.querySelector('[name="kartu_aset_tetap"]')?.checked ? '1' : '0');

                    const originalButtonLabel = saveButton.innerHTML;
                    saveButton.disabled = true;
                    saveButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

                    fetch('/api/inventaris', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: params.toString()
                    })
                        .then((res) => {
                            if (!res.ok) {
                                return res.text().then((message) => {
                                    throw new Error(message || 'Gagal menyimpan data inventaris');
                                });
                            }
                            return fetch('/api/inventaris?slug=' + encodeURIComponent(targetSlug));
                        })
                        .then((res) => {
                            if (!res.ok) {
                                throw new Error('Gagal memuat data inventaris terbaru');
                            }
                            return res.json();
                        })
                        .then((updatedItem) => {
                            mergeInventarisTableItem(updatedItem);
                            showToast('Data Inventaris berhasil diperbarui! ✅');
                            closeModal();
                        })
                        .catch((error) => {
                            console.error('Failed to update inventaris via modal', error);
                            showToast('Gagal menyimpan inventaris: ' + error.message, true);
                        })
                        .finally(() => {
                            saveButton.disabled = false;
                            saveButton.innerHTML = originalButtonLabel;
                        });
                });
            })
            .catch((error) => {
                console.error(error);
                showToast('Gagal membuka modal edit inventaris.', true);
            });
    }

    window.openInventarisEditModal = openEditInventarisModal;

    function loadInventarisProfileBumdesDropdown(selectedProfileId = null) {
        const selectEl = document.getElementById('inventaris_profile_bumdes_id');
        const containerEl = document.getElementById('inventaris_profile_bumdes_container');
        if(!selectEl) return;

        fetch('/api/profiles')
            .then(res => res.json())
            .then(data => {
                const loggedProfileId = localStorage.getItem('sibumdes_profile_id');
                let options = '';

                if (!loggedProfileId) {
                    if(containerEl) containerEl.style.display = 'block';
                } else {
                    if(containerEl) containerEl.style.display = 'none';
                }

                if (data && data.length > 0) {
                    data.forEach((p, idx) => {
                        if (loggedProfileId && loggedProfileId != p.ID) return;
                        let isSelected = '';
                        if (selectedProfileId == p.ID || loggedProfileId == p.ID) {
                            isSelected = 'selected';
                        } else if (!loggedProfileId && !selectedProfileId && idx === 0) {
                            isSelected = 'selected';
                        }
                        options += `<option value="${p.ID}" ${isSelected}>${p.NamaBUMDes}</option>`;
                    });
                }
                selectEl.innerHTML = options;

                const event = new Event('change');
                selectEl.dispatchEvent(event);
            });
    }

    function renderInventarisTable(inventarisList = getFilteredInventarisItems()) {
        const container = document.getElementById('inventaris-table-container');
        if(!container) return;
        const inventarisTableState = getInventarisTableState();

        syncInventarisSearchInputs(inventarisTableState.searchTerm);

        if (inventarisList.length === 0) {
            const hasSearch = String(inventarisTableState.searchTerm || '').trim() !== '';
            container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-secondary);">
                <i class="fa-solid fa-warehouse fa-3x" style="margin-bottom:16px;"></i>
                <p>${hasSearch ? 'Tidak ada data inventaris yang cocok dengan pencarian.' : 'Belum ada data inventaris yang terdaftar.'}</p>
            </div>`;
            return;
        }

        const formatInventarisCurrency = (value) => `Rp${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(value) || 0)}`;
        let tableRows = '';
        inventarisList.forEach((inv) => {
            const unitName = inv.unit_usaha && inv.unit_usaha.NamaUnitUsaha ? inv.unit_usaha.NamaUnitUsaha : '-';
            const bumdesName = inv.profile_bumdes && inv.profile_bumdes.NamaBUMDes ? inv.profile_bumdes.NamaBUMDes : '';
            const status = normalizeInventarisStatus(inv.status || (inv.aktif ? 'Aktif' : 'Tidak Aktif'));
            const nilaiBuku = Math.max((Number(inv.saldo_awal) || 0) - (Number(inv.akumulasi_penyusutan_awal) || 0), 0);
            const kartuAsetTetap = inv.kartu_aset_tetap
                ? '<span style="font-size:16px; color:#166534;">&#10003;</span>'
                : '<span style="font-size:16px; color:#b91c1c;">&#10007;</span>';
            let bumdesBadge = '';
            if (inv.profile_bumdes_id && inv.profile_bumdes) {
                bumdesBadge = `<span class="badge" style="background:#e0f2fe; color:#0284c7; margin-bottom: 4px; display: inline-block;">${escapeHTML(bumdesName)}</span><br>`;
            } else if (!inv.profile_bumdes_id) {
                bumdesBadge = '<span class="badge" style="background:#fee2e2; color:#dc2626; margin-bottom: 4px; display: inline-block;">PENGEMBANG</span><br>';
            }

            tableRows += `
                <tr style="border-bottom:1px solid #d9dfeb; cursor:pointer;" onclick="window.openInventarisEditModal('${inv.slug}')">
                    <td style="padding:10px 12px; white-space:nowrap; font-weight:600; color:#1f2937;">${inv.kode_aset || '-'}</td>
                    <td style="padding:10px 12px; white-space:nowrap; color:#374151;">${bumdesBadge}<span class="badge" style="background:var(--bg-secondary); color:var(--text-secondary);">${escapeHTML(unitName)}</span></td>
                    <td style="padding:10px 12px; white-space:nowrap; color:#374151;">${inv.nama_aset || '-'}</td>
                    <td style="padding:10px 12px; white-space:nowrap; color:#374151;">${inv.merk_aset || '-'}</td>
                    <td style="padding:10px 12px; white-space:nowrap; color:#374151;">${inv.kategori_aset || '-'}</td>
                    <td style="padding:10px 12px; text-align:right; white-space:nowrap; color:#374151;">${formatInventarisCurrency(inv.harga_beli)}</td>
                    <td style="padding:10px 12px; white-space:nowrap; color:#374151;">${formatJurnalWorkbookDate(inv.tanggal_pembelian)}</td>
                    <td style="padding:10px 12px; text-align:center; white-space:nowrap; color:#374151;">${inv.umur_ekonomis || 0}</td>
                    <td style="padding:10px 12px; text-align:right; white-space:nowrap; color:#374151;">${formatInventarisCurrency(inv.nilai_residu)}</td>
                    <td style="padding:10px 12px; text-align:right; white-space:nowrap; color:#374151;">${formatInventarisCurrency(inv.saldo_awal)}</td>
                    <td style="padding:10px 12px; white-space:nowrap; color:#374151;">${inv.link_akun_aset_tetap || '-'}</td>
                    <td style="padding:10px 12px; text-align:right; white-space:nowrap; color:#374151;">${formatInventarisCurrency(inv.akumulasi_penyusutan_awal)}</td>
                    <td style="padding:10px 12px; white-space:nowrap; color:#374151;">${inv.link_akun_akumulasi_penyusutan || '-'}</td>
                    <td style="padding:10px 12px; text-align:right; white-space:nowrap; color:#374151;">${formatInventarisCurrency(nilaiBuku)}</td>
                    <td style="padding:10px 12px; text-align:center; white-space:nowrap; color:#374151;">${status}</td>
                    <td style="padding:10px 12px; white-space:nowrap; color:#374151;">${formatJurnalWorkbookDate(inv.tanggal_digunakan)}</td>
                    <td style="padding:10px 12px; white-space:nowrap; color:#374151;">${formatJurnalWorkbookDate(inv.tanggal_status_tidak_aktif)}</td>
                    <td style="padding:10px 12px; text-align:center; white-space:nowrap; color:#374151;">${kartuAsetTetap}</td>
                    <td style="padding:10px 12px; text-align:center; white-space:nowrap;">
                        <button class="action-btn edit" title="Edit Inventaris" onclick="event.stopPropagation(); window.editInventarisAction('${inv.slug}')"><i class="fa-solid fa-pen"></i></button>
                        <button class="action-btn delete" title="Hapus Inventaris" onclick="event.stopPropagation(); window.deleteInventarisAction('${inv.slug}')"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });

        container.innerHTML = `
            <div style="overflow-x:auto; border:1px solid #cfd6e4; border-radius:8px; background:#fff; box-shadow:0 10px 24px rgba(15, 23, 42, 0.06);">
                <table class="data-table" style="width:100%; border-collapse:separate; border-spacing:0; text-align:left; min-width:2620px; font-size:13px; color:#1f2937;">
                    <thead>
                        <tr style="background:#f4f6f8; border-bottom:1px solid #cfd6e4;">
                            <th style="padding:10px 12px; font-weight:700; color:#111827; white-space:nowrap; border-bottom:1px solid #cfd6e4;">Kode Aset</th>
                            <th style="padding:10px 12px; font-weight:700; color:#111827; white-space:nowrap; border-bottom:1px solid #cfd6e4;">Unit Usaha</th>
                            <th style="padding:10px 12px; font-weight:700; color:#111827; white-space:nowrap; border-bottom:1px solid #cfd6e4;">Nama Aset</th>
                            <th style="padding:10px 12px; font-weight:700; color:#111827; white-space:nowrap; border-bottom:1px solid #cfd6e4;">Merk</th>
                            <th style="padding:10px 12px; font-weight:700; color:#111827; white-space:nowrap; border-bottom:1px solid #cfd6e4;">Kategori</th>
                            <th style="padding:10px 12px; font-weight:700; color:#111827; white-space:nowrap; text-align:right; border-bottom:1px solid #cfd6e4;">Harga Perolehan</th>
                            <th style="padding:10px 12px; font-weight:700; color:#111827; white-space:nowrap; border-bottom:1px solid #cfd6e4;">Tanggal Beli</th>
                            <th style="padding:10px 12px; font-weight:700; color:#111827; white-space:nowrap; text-align:center; border-bottom:1px solid #cfd6e4;">Umur Ekonomis (tahun)</th>
                            <th style="padding:10px 12px; font-weight:700; color:#111827; white-space:nowrap; text-align:right; border-bottom:1px solid #cfd6e4;">Nilai Residu</th>
                            <th style="padding:10px 12px; font-weight:700; color:#111827; white-space:nowrap; text-align:right; border-bottom:1px solid #cfd6e4;">Saldo Awal Per 1 Januari 2026</th>
                            <th style="padding:10px 12px; font-weight:700; color:#111827; white-space:nowrap; border-bottom:1px solid #cfd6e4;">Link Akun Aset Tetap</th>
                            <th style="padding:10px 12px; font-weight:700; color:#111827; white-space:nowrap; text-align:right; border-bottom:1px solid #cfd6e4;">Akumulasi Penyusutan Per 1 Januari 2026</th>
                            <th style="padding:10px 12px; font-weight:700; color:#111827; white-space:nowrap; border-bottom:1px solid #cfd6e4;">Link Akun Akumulasi Penyusutan</th>
                            <th style="padding:10px 12px; font-weight:700; color:#111827; white-space:nowrap; text-align:right; border-bottom:1px solid #cfd6e4;">Nilai Buku Per 1 Januari 2026</th>
                            <th style="padding:10px 12px; font-weight:700; color:#111827; white-space:nowrap; text-align:center; border-bottom:1px solid #cfd6e4;">Status</th>
                            <th style="padding:10px 12px; font-weight:700; color:#111827; white-space:nowrap; border-bottom:1px solid #cfd6e4;">Tanggal Digunakan</th>
                            <th style="padding:10px 12px; font-weight:700; color:#111827; white-space:nowrap; border-bottom:1px solid #cfd6e4;">Tanggal Status Tidak Aktif</th>
                            <th style="padding:10px 12px; font-weight:700; color:#111827; white-space:nowrap; text-align:center; border-bottom:1px solid #cfd6e4;">Kartu Aset Tetap</th>
                            <th style="padding:10px 12px; font-weight:700; color:#111827; white-space:nowrap; text-align:center; border-bottom:1px solid #cfd6e4;">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
    }

    window.editInventarisAction = function(slug) {
        if (window.location.pathname === '/inventaris') {
            openEditInventarisModal(slug);
            return;
        }
        navigateTo('/inventaris/edit/' + slug);
    };

    function toInputDate(dateValue) {
        if (!dateValue) return '';
        const str = String(dateValue);
        return str.includes('T') ? str.split('T')[0] : str;
    }

    function getInventarisAccountDefaults(category) {
        const normalized = String(category || '').trim().toLowerCase();
        if (normalized === 'bangunan') {
            return {
                asetTetap: '1-2020 Bangunan',
                akumulasi: '1-2091 Akumulasi Penyusutan Bangunan'
            };
        }
        if (normalized === 'kendaraan') {
            return {
                asetTetap: '1-2030 Kendaraan',
                akumulasi: '1-2092 Akumulasi Penyusutan Kendaraan'
            };
        }
        if (normalized === 'mesin' || normalized === 'peralatan' || normalized === 'inventaris kantor') {
            return {
                asetTetap: '1-2040 Peralatan dan Mesin',
                akumulasi: '1-2093 Akumulasi Penyusutan Peralatan dan Mesin'
            };
        }
        if (normalized === 'tanah') {
            return {
                asetTetap: '1-2010 Tanah',
                akumulasi: '1-2090 Akumulasi Penyusutan Aset Tetap'
            };
        }
        return {
            asetTetap: '1-2040 Peralatan dan Mesin',
            akumulasi: '1-2093 Akumulasi Penyusutan Peralatan dan Mesin'
        };
    }

    function normalizeInventarisStatus(value) {
        const normalized = String(value || '').trim();
        if (normalized.toLowerCase() === 'tidak aktif') {
            return 'Tidak Aktif (Dihentikan)';
        }
        return normalized || 'Aktif';
    }

    function formatInventarisCurrency(value) {
        const numericValue = Number(value) || 0;
        return `Rp${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(numericValue)}`;
    }

    function getInventarisLinkAkunAutocompleteState() {
        if (!globalThis.__sibumdesInventarisLinkAkunAutocompleteState) {
            globalThis.__sibumdesInventarisLinkAkunAutocompleteState = {
                asetTetap: ['-'],
                akumulasi: ['-'],
            };
        }
        return globalThis.__sibumdesInventarisLinkAkunAutocompleteState;
    }

    function getInventarisLinkAkunAutocompleteConfig(fieldKey) {
        if (fieldKey === 'akumulasi') {
            return {
                inputId: 'inv_link_akun_akumulasi_penyusutan',
                dropdownId: 'inv_link_akun_akumulasi_penyusutan_dropdown',
                stateKey: 'akumulasi',
                errorMessage: 'Gagal memuat akun CoA untuk akun akumulasi penyusutan inventaris.',
            };
        }

        return {
            inputId: 'inv_link_akun_aset_tetap',
            dropdownId: 'inv_link_akun_aset_tetap_dropdown',
            stateKey: 'asetTetap',
            errorMessage: 'Gagal memuat akun CoA untuk akun aset tetap inventaris.',
        };
    }

    function renderInventarisLinkAkunDropdown(fieldKey, filterText = '') {
        const config = getInventarisLinkAkunAutocompleteConfig(fieldKey);
        const dropdownEl = document.getElementById(config.dropdownId);
        const inputEl = document.getElementById(config.inputId);
        if (!dropdownEl || !inputEl) return;

        const inventarisLinkAkunAutocompleteState = getInventarisLinkAkunAutocompleteState();
        const options = inventarisLinkAkunAutocompleteState[config.stateKey] || ['-'];
        const keyword = String(filterText || '').trim().toLowerCase();
        const filteredOptions = options.filter((option) => {
            if (!keyword) return true;
            return String(option || '').toLowerCase().includes(keyword);
        });

        if (!filteredOptions.length) {
            dropdownEl.innerHTML = '<div style="padding:12px 14px; color:var(--text-secondary);">Tidak ada akun yang cocok.</div>';
            dropdownEl.style.display = 'block';
            return;
        }

        dropdownEl.innerHTML = filteredOptions.map((option) => {
            const isSelected = String(inputEl.value || '').trim() === String(option || '').trim();
            return `<button type="button" data-value="${escapeHTML(option)}" style="display:block; width:100%; padding:10px 14px; text-align:left; border:none; background:${isSelected ? '#f0f7ff' : '#fff'}; color:var(--text-primary); cursor:pointer;">${escapeHTML(option)}</button>`;
        }).join('');
        dropdownEl.style.display = 'block';
    }

    function hideInventarisLinkAkunDropdown(fieldKey) {
        const config = getInventarisLinkAkunAutocompleteConfig(fieldKey);
        const dropdownEl = document.getElementById(config.dropdownId);
        if (dropdownEl) {
            dropdownEl.style.display = 'none';
        }
    }

    function setupInventarisLinkAkunAutocomplete(fieldKey) {
        const config = getInventarisLinkAkunAutocompleteConfig(fieldKey);
        const inputEl = document.getElementById(config.inputId);
        const dropdownEl = document.getElementById(config.dropdownId);
        if (!inputEl || !dropdownEl || inputEl.dataset.autocompleteBound === 'true') return;

        inputEl.addEventListener('focus', () => {
            renderInventarisLinkAkunDropdown(fieldKey, '');
        });

        inputEl.addEventListener('input', () => {
            renderInventarisLinkAkunDropdown(fieldKey, inputEl.value);
        });

        inputEl.addEventListener('blur', () => {
            setTimeout(() => hideInventarisLinkAkunDropdown(fieldKey), 120);
        });

        dropdownEl.addEventListener('mousedown', (event) => {
            const optionBtn = event.target.closest('button[data-value]');
            if (!optionBtn) return;
            event.preventDefault();
            inputEl.value = optionBtn.getAttribute('data-value') || '-';
            hideInventarisLinkAkunDropdown(fieldKey);
        });

        inputEl.dataset.autocompleteBound = 'true';
    }

    function loadInventarisLinkAkunOptions(fieldKey, selectedValue = '-') {
        const config = getInventarisLinkAkunAutocompleteConfig(fieldKey);
        const inputEl = document.getElementById(config.inputId);
        const dropdownEl = document.getElementById(config.dropdownId);
        if (!inputEl || !dropdownEl) return Promise.resolve();

        const inventarisLinkAkunAutocompleteState = getInventarisLinkAkunAutocompleteState();
        setupInventarisLinkAkunAutocomplete(fieldKey);

        inventarisLinkAkunAutocompleteState[config.stateKey] = ['-'];
        inputEl.value = String(selectedValue || '').trim() || '-';
        dropdownEl.innerHTML = '<div style="padding:12px 14px; color:var(--text-secondary);">Memuat akun CoA...</div>';

        return fetchCoaAccountOptions()
            .then((options) => {
                const fallbackValue = String(selectedValue || '').trim() || '-';
                const normalizedOptions = options
                    .filter((option) => String(option.value || '').trim() && String(option.value || '').trim() !== '-')
                    .slice()
                    .sort((left, right) => String(left.label || '').localeCompare(String(right.label || ''), 'id'))
                    .map((option) => String(option.value || '').trim());
                inventarisLinkAkunAutocompleteState[config.stateKey] = Array.from(new Set(['-', ...normalizedOptions]));
                inputEl.value = fallbackValue;
                hideInventarisLinkAkunDropdown(fieldKey);
            })
            .catch((error) => {
                console.error('Failed to load inventaris link akun options', error);
                const fallbackValue = String(selectedValue || '').trim() || '-';
                inventarisLinkAkunAutocompleteState[config.stateKey] = Array.from(new Set(['-', fallbackValue]));
                inputEl.value = fallbackValue;
                hideInventarisLinkAkunDropdown(fieldKey);
                showToast(config.errorMessage, true);
            });
    }

    function getCompletedMonthDifference(startDate, endDate) {
        if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) return 0;
        if (!(endDate instanceof Date) || Number.isNaN(endDate.getTime())) return 0;
        if (startDate > endDate) return 0;

        let months = (endDate.getFullYear() - startDate.getFullYear()) * 12;
        months += endDate.getMonth() - startDate.getMonth();

        if (endDate.getDate() < startDate.getDate()) {
            months -= 1;
        }

        return Math.max(months, 0);
    }

    function calculateInventarisAkumulasiPenyusutan() {
        const hargaPerolehanInput = document.getElementById('inv_harga_perolehan');
        const tanggalPembelianInput = document.getElementById('inv_tanggal_pembelian');
        const umurEkonomisInput = document.getElementById('inv_umur_ekonomis');

        const hargaPerolehan = parsePelangganNumber(hargaPerolehanInput ? hargaPerolehanInput.value : 0);
        const umurEkonomis = Number(umurEkonomisInput ? umurEkonomisInput.value : 0);
        const tanggalPembelianValue = tanggalPembelianInput ? String(tanggalPembelianInput.value || '').trim() : '';

        if (!hargaPerolehan || !umurEkonomis || !tanggalPembelianValue) {
            return 0;
        }

        const tanggalPembelian = new Date(`${tanggalPembelianValue}T00:00:00`);
        const tanggalAcuan = new Date('2026-01-01T00:00:00');
        const selisihBulan = getCompletedMonthDifference(tanggalPembelian, tanggalAcuan);
        const akumulasi = (hargaPerolehan / umurEkonomis) * (selisihBulan / 12);

        return Math.min(akumulasi, hargaPerolehan);
    }

    function updateInventarisAkumulasiPenyusutan() {
        const akumulasiInput = document.getElementById('inv_akumulasi_penyusutan_awal');
        if (!akumulasiInput) return;

        const akumulasi = calculateInventarisAkumulasiPenyusutan();
        akumulasiInput.value = akumulasi ? formatInventarisCurrency(akumulasi) : '';
        updateInventarisBookValue();
    }

    function bindInventarisCurrencyInput(inputId) {
        const input = document.getElementById(inputId);
        if (!input || input.dataset.bound === 'true') return;

        input.addEventListener('focus', () => {
            const numericValue = parsePelangganNumber(input.value);
            input.value = numericValue ? String(numericValue) : '';
        });

        input.addEventListener('blur', () => {
            const numericValue = parsePelangganNumber(input.value);
            input.value = numericValue ? formatInventarisCurrency(numericValue) : '';
            updateInventarisBookValue();
        });

        input.dataset.bound = 'true';
    }

    function updateInventarisAccountDefaults() {
        const categoryInput = document.getElementById('inv_kategori_aset');
        if (!categoryInput) return;

        const defaults = getInventarisAccountDefaults(categoryInput.value);
        const asetTetapInput = document.getElementById('inv_link_akun_aset_tetap');
        const akumulasiInput = document.getElementById('inv_link_akun_akumulasi_penyusutan');

        if (asetTetapInput && !asetTetapInput.value.trim()) {
            asetTetapInput.value = defaults.asetTetap;
        }
        if (akumulasiInput && !akumulasiInput.value.trim()) {
            akumulasiInput.value = defaults.akumulasi;
        }
    }

    function applyInventarisFormDefaults() {
        const statusInput = document.getElementById('inv_status');
        if (statusInput && !statusInput.value) {
            statusInput.value = 'Aktif';
        }

        const kartuInput = document.getElementById('inv_kartu_aset_tetap');
        if (kartuInput && !document.getElementById('inventaris_slug').value) {
            kartuInput.checked = true;
        }

        const asetTetapInput = document.getElementById('inv_link_akun_aset_tetap');
        if (asetTetapInput && !asetTetapInput.value.trim()) {
            asetTetapInput.value = '-';
        }

        const akumulasiInput = document.getElementById('inv_link_akun_akumulasi_penyusutan');
        if (akumulasiInput && !akumulasiInput.value.trim()) {
            akumulasiInput.value = '-';
        }
    }

    function updateInventarisBookValue() {
        const saldoAwalInput = document.getElementById('inv_saldo_awal');
        const akumulasiInput = document.getElementById('inv_akumulasi_penyusutan_awal');
        const nilaiBukuInput = document.getElementById('inv_nilai_buku_awal');
        if (!nilaiBukuInput) return;

        const saldoAwal = parsePelangganNumber(saldoAwalInput ? saldoAwalInput.value : 0);
        const akumulasi = parsePelangganNumber(akumulasiInput ? akumulasiInput.value : 0);
        const nilaiBuku = Math.max(saldoAwal - akumulasi, 0);
        nilaiBukuInput.value = formatInventarisCurrency(nilaiBuku);
    }

    function setupInventarisAutoAkumulasiPenyusutan() {
        const sourceInputs = [
            document.getElementById('inv_harga_perolehan'),
            document.getElementById('inv_tanggal_pembelian'),
            document.getElementById('inv_umur_ekonomis'),
        ].filter(Boolean);

        sourceInputs.forEach((input) => {
            if (input.dataset.autoAkumulasiBound === 'true') return;

            ['input', 'change', 'blur'].forEach((eventName) => {
                input.addEventListener(eventName, updateInventarisAkumulasiPenyusutan);
            });

            input.dataset.autoAkumulasiBound = 'true';
        });
    }

    function setupInventarisCurrencyInputs() {
        ['inv_harga_perolehan', 'inv_nilai_residu', 'inv_saldo_awal', 'inv_akumulasi_penyusutan_awal'].forEach(bindInventarisCurrencyInput);

        setupInventarisAutoAkumulasiPenyusutan();
    }

    function editInventarisData(slug) {
        const iForm = document.getElementById('inventarisForm');
        if(iForm) iForm.reset();

        const profileDropdown = document.getElementById('inventaris_profile_bumdes_id');
        if(profileDropdown) {
            profileDropdown.onchange = function(e) {
                loadUnitUsahaDropdown(null, e.target.value, 'inventaris_unit_usaha_id');
            };
        }

        fetch('/api/inventaris?slug=' + slug)
            .then(res => res.json())
            .then(data => {
                if(!data || !data.slug) {
                    navigateTo('/inventaris');
                    return;
                }

                const slugEl = document.getElementById('inventaris_slug');
                if(slugEl) {
                    slugEl.name = 'slug';
                    slugEl.value = data.slug;
                }

                if(data.unit_usaha_id) {
                    const drop = document.getElementById('inventaris_unit_usaha_id');
                    if(drop) drop.dataset.selected_unit_id = data.unit_usaha_id;
                }

                loadInventarisProfileBumdesDropdown(data.profile_bumdes_id);

                const kodeEl = document.getElementById('kode_aset');
                if(kodeEl) kodeEl.value = data.kode_aset || '';

                const namaEl = document.getElementById('nama_aset');
                if(namaEl) namaEl.value = data.nama_aset || '';

                const merkEl = document.getElementById('merk_aset');
                if(merkEl) merkEl.value = data.merk_aset || '';

                const hargaEl = document.getElementById('inv_harga_perolehan');
                if(hargaEl) hargaEl.value = Number(data.harga_beli) ? formatInventarisCurrency(data.harga_beli) : '';

                const tglBeliEl = document.getElementById('inv_tanggal_pembelian');
                if(tglBeliEl) tglBeliEl.value = toInputDate(data.tanggal_pembelian);

                const kategoriEl = document.getElementById('inv_kategori_aset');
                if(kategoriEl) kategoriEl.value = data.kategori_aset || '';

                const umurEl = document.getElementById('inv_umur_ekonomis');
                if(umurEl) umurEl.value = data.umur_ekonomis || 0;

                const nilaiResiduEl = document.getElementById('inv_nilai_residu');
                if(nilaiResiduEl) nilaiResiduEl.value = Number(data.nilai_residu) ? formatInventarisCurrency(data.nilai_residu) : '';

                const saldoAwalEl = document.getElementById('inv_saldo_awal');
                if(saldoAwalEl) saldoAwalEl.value = Number(data.saldo_awal) ? formatInventarisCurrency(data.saldo_awal) : '';

                loadInventarisLinkAkunOptions('asetTetap', data.link_akun_aset_tetap || '-');

                const akumulasiEl = document.getElementById('inv_akumulasi_penyusutan_awal');
                if(akumulasiEl) akumulasiEl.value = Number(data.akumulasi_penyusutan_awal) ? formatInventarisCurrency(data.akumulasi_penyusutan_awal) : '';

                loadInventarisLinkAkunOptions('akumulasi', data.link_akun_akumulasi_penyusutan || '-');

                const statusEl = document.getElementById('inv_status');
                if(statusEl) statusEl.value = normalizeInventarisStatus(data.status || (data.aktif ? 'Aktif' : 'Tidak Aktif'));

                const tglDigunakanEl = document.getElementById('inv_tanggal_digunakan');
                if(tglDigunakanEl) tglDigunakanEl.value = toInputDate(data.tanggal_digunakan);

                const tglStatusTidakAktifEl = document.getElementById('inv_tanggal_status_tidak_aktif');
                if(tglStatusTidakAktifEl) tglStatusTidakAktifEl.value = toInputDate(data.tanggal_status_tidak_aktif);

                const kartuAsetEl = document.getElementById('inv_kartu_aset_tetap');
                if(kartuAsetEl) kartuAsetEl.checked = Boolean(data.kartu_aset_tetap);

                setupInventarisCurrencyInputs();
                updateInventarisBookValue();
            })
            .catch(err => {
                console.error(err);
                showToast('Gagal memuat data inventaris', true);
            });
    }

    window.deleteInventarisAction = function(slug) {
        window.showConfirmModal('Apakah Anda yakin ingin menghapus data inventaris ini?', () => {
            fetch('/api/inventaris?slug=' + slug, { method: 'DELETE' })
            .then(res => {
                if(res.ok) {
                    showToast('Inventaris berhasil dihapus');
                    loadInventaris();
                } else {
                    showToast('Gagal menghapus inventaris', true);
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Kesalahan jaringan', true);
            });
        });
    };
    const pelangganForm = document.getElementById('pelangganForm');
    if(pelangganForm) {
        setupPelangganSaldoAwalInput();
        pelangganForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(pelangganForm);
            const pelangganSlug = String(formData.get('slug') || '').trim();
            const isEditingPelanggan = pelangganSlug !== '';
            formData.set('saldo_awal', String(parsePelangganNumber(formData.get('saldo_awal'))));
            if (!formData.has('bk_pembantu_piutang')) {
                formData.append('bk_pembantu_piutang', '0');
            }
            if (!String(formData.get('status') || '').trim()) {
                formData.set('status', 'Aktif');
            }
            if (!String(formData.get('link_akun') || '').trim()) {
                formData.set('link_akun', '-');
            }
            const urlEncodedData = new URLSearchParams(formData).toString();
            
            fetch('/api/pelanggan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: urlEncodedData
            })
            .then(res => {
                if (res.ok) {
                    showToast('Data Pelanggan berhasil disimpan! ✅');
                    if (isEditingPelanggan) {
                        fetch('/api/pelanggan?slug=' + encodeURIComponent(pelangganSlug))
                            .then((detailRes) => detailRes.ok ? detailRes.json() : Promise.reject(new Error('Gagal memuat data pelanggan terbaru.')))
                            .then((updatedItem) => {
                                mergePelangganTableItem(updatedItem);
                                returnToPelangganList({ preserveSearch: true });
                            })
                            .catch((detailErr) => {
                                console.error(detailErr);
                                returnToPelangganList({ preserveSearch: true });
                                loadPelanggan({ preserveSearch: true });
                            });
                    } else {
                        navigateTo('/pelanggan');
                    }
                } else {
                    res.text().then(t => showToast('Gagal menyimpan: ' + t, true));
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Terjadi kesalahan jaringan.', true);
            });
        });
    }

    const supplierForm = document.getElementById('supplierForm');
    if(supplierForm) {
        setupSupplierSaldoAwalInput();
        supplierForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(supplierForm);
            const supplierSlug = String(formData.get('slug') || '').trim();
            const isEditingSupplier = supplierSlug !== '';
            formData.set('saldo_awal', String(parsePelangganNumber(formData.get('saldo_awal'))));
            if (!formData.has('bk_pembantu_utang')) {
                formData.append('bk_pembantu_utang', '0');
            }
            if (!String(formData.get('status') || '').trim()) {
                formData.set('status', 'Aktif');
            }
            if (!String(formData.get('link_akun') || '').trim()) {
                formData.set('link_akun', '2-0100 Utang Usaha');
            }
            const urlEncodedData = new URLSearchParams(formData).toString();
            
            fetch('/api/supplier', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: urlEncodedData
            })
            .then(res => {
                if (res.ok) {
                    showToast('Data Supplier berhasil disimpan! ✅');
                    if (isEditingSupplier) {
                        fetch('/api/supplier?slug=' + encodeURIComponent(supplierSlug))
                            .then((detailRes) => detailRes.ok ? detailRes.json() : Promise.reject(new Error('Gagal memuat data supplier terbaru.')))
                            .then((updatedItem) => {
                                mergeSupplierTableItem(updatedItem);
                                returnToSupplierList({ preserveSearch: true });
                            })
                            .catch((detailErr) => {
                                console.error(detailErr);
                                returnToSupplierList({ preserveSearch: true });
                                loadSupplier({ preserveSearch: true });
                            });
                    } else {
                        navigateTo('/supplier');
                    }
                } else {
                    res.text().then(t => showToast('Gagal menyimpan: ' + t, true));
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Terjadi kesalahan jaringan.', true);
            });
        });
    }

    const barangForm = document.getElementById('barangForm');
    if(barangForm) {
        setupBarangSaldoAwalNominalInput();
        setupBarangSaldoAwalAutoCalculation();
        barangForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(barangForm);
            formData.set('saldo_awal_nominal', String(parsePelangganNumber(formData.get('saldo_awal_nominal'))));
            if (!formData.has('kartu_persediaan')) {
                formData.append('kartu_persediaan', '0');
            }
            if (!String(formData.get('status') || '').trim()) {
                formData.set('status', 'Aktif');
            }
            if (!String(formData.get('link_akun') || '').trim()) {
                formData.set('link_akun', '1-1420 Persediaan Barang Jadi; 5-1200 HPP Barang Jadi');
            }
            const urlEncodedData = new URLSearchParams(formData).toString();
            
            fetch('/api/barang', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: urlEncodedData
            })
            .then(res => {
                if (res.ok) {
                    showToast('Data Barang berhasil disimpan! ✅');
                    navigateTo('/barang');
                } else {
                    res.text().then(t => showToast('Gagal menyimpan: ' + t, true));
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Terjadi kesalahan jaringan.', true);
            });
        });
    }

    const barangJasaForm = document.getElementById('barangJasaForm');
    if(barangJasaForm) {
        barangJasaForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const urlEncodedData = new URLSearchParams(new FormData(barangJasaForm)).toString();

            fetch('/api/barang-jasa', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: urlEncodedData
            })
            .then(res => {
                if (res.ok) {
                    showToast('Data Barang & Jasa berhasil disimpan! ✅');
                    navigateTo('/barang-jasa');
                } else {
                    res.text().then(t => showToast('Gagal menyimpan: ' + t, true));
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Terjadi kesalahan jaringan.', true);
            });
        });
    }

    const inventarisForm = document.getElementById('inventarisForm');
    if(inventarisForm) {
        applyInventarisFormDefaults();
        loadInventarisLinkAkunOptions('asetTetap', document.getElementById('inv_link_akun_aset_tetap')?.value || '-');
        loadInventarisLinkAkunOptions('akumulasi', document.getElementById('inv_link_akun_akumulasi_penyusutan')?.value || '-');
        setupInventarisCurrencyInputs();
        updateInventarisBookValue();
        inventarisForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(inventarisForm);
            formData.set('harga_beli', String(parsePelangganNumber(formData.get('harga_beli'))));
            formData.set('nilai_residu', String(parsePelangganNumber(formData.get('nilai_residu'))));
            formData.set('saldo_awal', String(parsePelangganNumber(formData.get('saldo_awal'))));
            formData.set('akumulasi_penyusutan_awal', String(parsePelangganNumber(formData.get('akumulasi_penyusutan_awal'))));
            if (!formData.has('kartu_aset_tetap')) {
                formData.append('kartu_aset_tetap', '0');
            }
            if (!String(formData.get('status') || '').trim()) {
                formData.set('status', 'Aktif');
            }
            if (!String(formData.get('link_akun_aset_tetap') || '').trim()) {
                formData.set('link_akun_aset_tetap', '-');
            }
            if (!String(formData.get('link_akun_akumulasi_penyusutan') || '').trim()) {
                formData.set('link_akun_akumulasi_penyusutan', '-');
            }
            const urlEncodedData = new URLSearchParams(formData).toString();

            fetch('/api/inventaris', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: urlEncodedData
            })
            .then(res => {
                if (res.ok) {
                    showToast('Data Inventaris berhasil disimpan! ✅');
                    navigateTo('/inventaris');
                } else {
                    res.text().then(t => showToast('Gagal menyimpan: ' + t, true));
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Terjadi kesalahan jaringan.', true);
            });
        });
    }

    const mappingTransaksiForm = document.getElementById('mappingTransaksiForm');
    if(mappingTransaksiForm) {
        const btnAddJournalRow = document.getElementById('btn-add-journal-row');
        if (btnAddJournalRow) {
            btnAddJournalRow.addEventListener('click', () => addMappingJournalRow({ akun_debet: '', akun_kredit: '', link_bk_utang: false, link_bk_piutang: false, link_persediaan: false, link_aset_tetap: false }));
        }
        mappingTransaksiForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const mappingContext = getCurrentMappingContext();
            const fd = new FormData(mappingTransaksiForm);
            const namaMapping = String(fd.get('nama_mapping') || '').trim();
            const journalRows = Array.from(mappingTransaksiForm.querySelectorAll('.mapping-journal-row'));

            if (!String(fd.get('klasifikasi_arus_kas') || '').trim()) {
                fd.set('klasifikasi_arus_kas', 'Aktivitas Operasi');
            }
            if (!String(fd.get('kategori_arus_kas') || '').trim()) {
                fd.set('kategori_arus_kas', namaMapping);
            }
            if (!String(fd.get('tipe_default') || '').trim()) {
                fd.set('tipe_default', 'semua');
            }
            fd.delete('link_aset_tetap');
            fd.delete('link_persediaan');
            fd.delete('link_bk_utang');
            fd.delete('link_bk_piutang');
            fd.delete('detail_link_aset_tetap[]');
            fd.delete('detail_link_persediaan[]');
            fd.delete('detail_link_bk_utang[]');
            fd.delete('detail_link_bk_piutang[]');

            journalRows.forEach((row, rowIndex) => {
                const getCheckedValue = (fieldName) => {
                    const checkbox = row.querySelector(`[data-field="${fieldName}"]`);
                    return checkbox && checkbox.checked ? '1' : '0';
                };
                const linkAsetTetap = getCheckedValue('link_aset_tetap');
                const linkPersediaan = getCheckedValue('link_persediaan');
                const linkBkUtang = getCheckedValue('link_bk_utang');
                const linkBkPiutang = getCheckedValue('link_bk_piutang');

                if (rowIndex === 0) {
                    fd.set('link_aset_tetap', linkAsetTetap);
                    fd.set('link_persediaan', linkPersediaan);
                    fd.set('link_bk_utang', linkBkUtang);
                    fd.set('link_bk_piutang', linkBkPiutang);
                    return;
                }

                fd.append('detail_link_aset_tetap[]', linkAsetTetap);
                fd.append('detail_link_persediaan[]', linkPersediaan);
                fd.append('detail_link_bk_utang[]', linkBkUtang);
                fd.append('detail_link_bk_piutang[]', linkBkPiutang);
            });

            if (!fd.has('link_aset_tetap')) fd.set('link_aset_tetap', '0');
            if (!fd.has('link_persediaan')) fd.set('link_persediaan', '0');
            if (!fd.has('link_bk_utang')) fd.set('link_bk_utang', '0');
            if (!fd.has('link_bk_piutang')) fd.set('link_bk_piutang', '0');
            if (!fd.has('link_jurnal_penyesuaian')) fd.set('link_jurnal_penyesuaian', '0');

            const cashType = fd.get('cash_in_out');
            fd.set('kategori_transaksi', cashType === 'kas_keluar' ? 'keluar' : 'masuk');
            const urlEncodedData = new URLSearchParams(fd).toString();
            fetch('/api/mapping-transaksi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: urlEncodedData
            })
            .then(res => {
                if (res.ok) {
                    setPendingMappingReturnState(mappingContext ? mappingContext.routeBase : '/mapping-transaksi', String(fd.get('slug') || ''), null);
                    showToast('Mapping Transaksi berhasil disimpan! ✅');
                    navigateTo(mappingContext ? mappingContext.routeBase : '/mapping-transaksi');
                } else {
                    res.text().then(t => showToast('Gagal menyimpan: ' + t, true));
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Terjadi kesalahan jaringan.', true);
            });
        });
    }

    // Transaksi History Functions
    function loadTransaksiHistory() {
        const container = document.getElementById('transaksi-history-table-container');
        if(!container) return;

        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        console.log('Loading transaksi history with sessionSlug:', sessionSlug);
        container.innerHTML = `<div style="text-align:center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat data...</div>`;

        Promise.all([
            fetch('/api/transaksis?session_slug=' + sessionSlug + '&t=' + new Date().getTime()).then(res => {
                console.log('API Response status:', res.status);
                if (!res.ok) throw new Error('Gagal memuat data transaksi');
                return res.json();
            }),
            fetchWorkbookTransaksiMappingReferences().catch((error) => {
                console.error('Failed to load workbook transaksi mappings for history', error);
                return [];
            })
        ])
            .then(([data, mappings]) => {
                console.log('Transaksi data received:', data);
                setTransaksiMappingReferences(mappings || []);
                transaksiHistoryState.items = data || [];
                renderTransaksiHistoryTable(data || []);
                updateAsetTetapInboxFromState();
            })
            .catch(err => {
                console.error("Failed to load transaksi history", err);
                const currentContainer = document.getElementById('transaksi-history-table-container');
                if(currentContainer) {
                    currentContainer.innerHTML = `
                        <div style="padding: 32px; text-align: center; color: var(--text-secondary);">
                            <p>Gagal memuat data transaksi</p>
                        </div>
                    `;
                }
            });
    }

    function getTransaksiSortTimestamp(value) {
        if (!value) return 0;
        const timestamp = new Date(value).getTime();
        return Number.isFinite(timestamp) ? timestamp : 0;
    }

    function sortTransaksiRecordsDesc(transaksi) {
        return [...(transaksi || [])].sort((left, right) => {
            const createdAtDiff = getTransaksiSortTimestamp(right.created_at) - getTransaksiSortTimestamp(left.created_at);
            if (createdAtDiff !== 0) return createdAtDiff;

            return (Number(right.id) || 0) - (Number(left.id) || 0);
        });
    }

    const transaksiDataViewState = {
        items: [],
        selectedUnitId: 'all',
        mappingReferences: [],
        mappingReferencesByName: new Map()
    };

    const asetTetapInboxState = {
        items: [],
        lastFetchedAt: 0,
        isLoading: false,
    };

    const transaksiHistoryState = {
        items: []
    };

    function getJenisMappingWorkbookLabel(value) {
        const normalized = String(value || '').trim().toLowerCase();
        if (normalized === 'non_rutin') return 'Non Rutin';
        if (normalized === 'jurnal') return 'Jurnal Penyesuaian';
        if (normalized === 'umum') return 'Lainnya';
        return 'Rutin';
    }

    function getCashFlowWorkbookLabel(value, tipeKas) {
        const normalized = String(value || '').trim().toLowerCase();
        if (normalized === 'kas_keluar') return 'Kas Keluar';
        if (normalized === 'non_kas') return '-';
        if (normalized === 'kas_masuk') return 'Kas Masuk';
        return tipeKas === 'kurang' ? 'Kas Keluar' : 'Kas Masuk';
    }

    function getWorkbookFlagLabel(value) {
        return value ? 'Ya' : '-';
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function setTransaksiMappingReferences(mappings) {
        transaksiDataViewState.mappingReferences = Array.isArray(mappings) ? mappings : [];
        transaksiDataViewState.mappingReferencesByName = new Map();

        transaksiDataViewState.mappingReferences.forEach((mapping) => {
            const key = normalizeTransaksiMappingKey(mapping.nama_mapping || '');
            if (!key) return;
            const existing = transaksiDataViewState.mappingReferencesByName.get(key) || [];
            existing.push(mapping);
            transaksiDataViewState.mappingReferencesByName.set(key, existing);
        });
    }

    function findWorkbookMappingForTransaksi(tx) {
        const txMappingSlug = String(tx && tx.mapping_slug ? tx.mapping_slug : '').trim();
        if (txMappingSlug) {
            const matchedBySlug = (transaksiDataViewState.mappingReferences || []).find((candidate) => String(candidate && candidate.slug ? candidate.slug : '').trim() === txMappingSlug);
            if (matchedBySlug) {
                return matchedBySlug;
            }
        }

        const key = normalizeTransaksiMappingKey(tx && tx.deskripsi ? tx.deskripsi : '');
        if (!key) return null;

        const candidates = transaksiDataViewState.mappingReferencesByName.get(key) || [];
        if (candidates.length === 0) return null;

        const txUnitId = tx && tx.unit_usaha_id ? String(tx.unit_usaha_id) : '';
        const txMappingJenis = normalizeTransaksiMappingKey(tx && tx.mapping_jenis ? tx.mapping_jenis : '');
        if (txMappingJenis) {
            const matchedByJenis = candidates.find((candidate) => {
                const candidateUnitId = candidate.unit_usaha_id ? String(candidate.unit_usaha_id) : '';
                const candidateJenis = normalizeTransaksiMappingKey(candidate && candidate.jenis_mapping ? candidate.jenis_mapping : '');
                return candidateJenis === txMappingJenis && (!candidateUnitId || !txUnitId || candidateUnitId === txUnitId);
            });
            if (matchedByJenis) {
                return matchedByJenis;
            }
        }

        return candidates.find((candidate) => {
            const candidateUnitId = candidate.unit_usaha_id ? String(candidate.unit_usaha_id) : '';
            return !candidateUnitId || !txUnitId || candidateUnitId === txUnitId;
        }) || candidates[0] || null;
    }

    function isTransaksiJualForAsetInbox(tx, mapping = null) {
        const text = normalizeTransaksiMappingKey([
            tx && tx.deskripsi,
            tx && tx.keterangan,
            tx && tx.mapping_nama,
            tx && tx.nama_mapping,
            tx && tx.akun_debet,
            tx && tx.akun_kredit,
            mapping && mapping.nama_mapping,
            mapping && mapping.keterangan,
        ].filter(Boolean).join(' '));
        return /\bjual\b|\bpenjualan\b/.test(text);
    }

    function isTransaksiSudahValidated(tx) {
        return normalizeTransaksiValidasiLabel(tx && tx.validasi ? tx.validasi : 'Belum') === 'Sudah';
    }

    function getTransaksiMappedAsetTetapLinkValue(tx, mapping) {
        if (!mapping) return false;

        const txDebit = normalizeTransaksiMappingKey(tx && tx.akun_debet ? tx.akun_debet : '');
        const txKredit = normalizeTransaksiMappingKey(tx && tx.akun_kredit ? tx.akun_kredit : '');
        const details = Array.isArray(mapping.details) ? mapping.details : [];

        if (details.length > 0) {
            const matchedDetail = details.find((detail) => {
                const detailDebit = normalizeTransaksiMappingKey(detail && detail.akun_debet ? detail.akun_debet : '');
                const detailKredit = normalizeTransaksiMappingKey(detail && detail.akun_kredit ? detail.akun_kredit : '');
                return txDebit && txKredit && detailDebit === txDebit && detailKredit === txKredit;
            });

            if (matchedDetail) {
                return !!matchedDetail.link_aset_tetap || !!mapping.link_aset_tetap;
            }

            return details.some((detail) => !!(detail && detail.link_aset_tetap)) || !!mapping.link_aset_tetap;
        }

        return !!mapping.link_aset_tetap;
    }

    function buildAsetTetapInboxItems(transaksiRows, mappingRows) {
        setTransaksiMappingReferences(mappingRows || []);

        const rows = Array.isArray(transaksiRows) ? transaksiRows : [];
        return sortTransaksiRecordsDesc(rows)
            .filter((tx) => {
                if (!isTransaksiSudahValidated(tx)) return false;
                const mapping = findWorkbookMappingForTransaksi(tx);
                if (!isTransaksiJualForAsetInbox(tx, mapping)) return false;
                return getTransaksiMappedAsetTetapLinkValue(tx, mapping);
            })
            .map((tx) => ({
                id: tx.id,
                tanggal: tx.tanggal,
                deskripsi: tx.deskripsi || '-',
                keterangan: tx.keterangan || '-',
                nama: tx.nama_pelanggan_pemasok || '-',
                unitUsaha: tx.unit_usaha && tx.unit_usaha.NamaUnitUsaha ? tx.unit_usaha.NamaUnitUsaha : '-',
                nominal: Number(tx.nominal || 0),
                validasi: normalizeTransaksiValidasiLabel(tx.validasi || 'Belum'),
            }));
    }

    function renderAsetTetapInboxBadge() {
        const menuLink = document.getElementById('menu-kartu-aset-tetap-btn');
        if (!menuLink) return;

        menuLink.classList.add('with-notification-badge');

        let badge = menuLink.querySelector('.aset-tetap-inbox-badge');
        let countEl = menuLink.querySelector('.aset-tetap-inbox-badge-count');

        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'aset-tetap-inbox-badge';
            badge.title = 'Lihat kiriman transaksi ke Kartu Aset Tetap';
            badge.innerHTML = '<i class="fa-regular fa-envelope"></i><span class="aset-tetap-inbox-badge-count">0</span>';
            menuLink.appendChild(badge);

            badge.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                openAsetTetapInboxModal();
            });
        }

        countEl = countEl || badge.querySelector('.aset-tetap-inbox-badge-count');
        if (!countEl) return;

        const total = Array.isArray(asetTetapInboxState.items) ? asetTetapInboxState.items.length : 0;
        if (total > 0) {
            countEl.textContent = total > 99 ? '99+' : String(total);
            badge.style.display = 'inline-flex';
        } else {
            countEl.textContent = '0';
            badge.style.display = 'none';
        }
    }

    function renderAsetTetapInboxModalContent() {
        const container = document.getElementById('aset-tetap-inbox-table-container');
        if (!container) return;

        const rows = Array.isArray(asetTetapInboxState.items) ? asetTetapInboxState.items : [];
        if (rows.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:40px; color:var(--text-secondary);">
                    <i class="fa-regular fa-envelope-open fa-3x" style="margin-bottom:16px;"></i>
                    <p>Belum ada transaksi Jual dengan link Kartu Aset Tetap (Inventaris).</p>
                </div>
            `;
            return;
        }

        const body = rows.map((row) => {
            const tanggal = row.tanggal
                ? new Date(row.tanggal).toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' })
                : '-';
            const nominal = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(row.nominal || 0));
            const validasiStyles = getTransaksiValidasiPillStyles(row.validasi);

            return `
                <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:10px 12px; white-space:nowrap; color:var(--text-secondary);">${escapeHtml(tanggal)}</td>
                    <td style="padding:10px 12px; color:var(--text-primary); font-weight:600; min-width:220px;">${escapeHtml(row.deskripsi || '-')}</td>
                    <td style="padding:10px 12px; color:var(--text-secondary); min-width:260px;">${escapeHtml(row.keterangan || '-')}</td>
                    <td style="padding:10px 12px; color:var(--text-secondary); white-space:nowrap;">${escapeHtml(row.nama || '-')}</td>
                    <td style="padding:10px 12px; color:var(--text-secondary); white-space:nowrap;">${escapeHtml(row.unitUsaha || '-')}</td>
                    <td style="padding:10px 12px; text-align:right; white-space:nowrap; color:var(--text-primary); font-weight:600;">${escapeHtml(nominal)}</td>
                    <td style="padding:10px 12px; text-align:center; white-space:nowrap;">
                        <span style="display:inline-block; min-width:64px; text-align:center; background:${validasiStyles.background}; color:${validasiStyles.color}; padding:4px 10px; border-radius:999px; font-size:0.8rem; font-weight:600;">${escapeHtml(row.validasi)}</span>
                    </td>
                    <td style="padding:10px 12px; text-align:center; white-space:nowrap;">
                        <button type="button" class="action-btn edit" onclick="editTransaksi(${Number(row.id)})" title="Buka transaksi" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:6px;background:#e3f2fd;color:#1976d2;"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div style="overflow-x:auto; border:1px solid var(--border); border-radius:var(--radius-md); background:#fff;">
                <table style="width:100%; border-collapse:collapse; min-width:1080px;">
                    <thead>
                        <tr style="background:#f5f5f5; border-bottom:2px solid var(--border);">
                            <th style="padding:10px 12px; text-align:left; white-space:nowrap;">Tanggal</th>
                            <th style="padding:10px 12px; text-align:left; white-space:nowrap;">Deskripsi</th>
                            <th style="padding:10px 12px; text-align:left; white-space:nowrap;">Keterangan</th>
                            <th style="padding:10px 12px; text-align:left; white-space:nowrap;">Pelanggan/Pemasok</th>
                            <th style="padding:10px 12px; text-align:left; white-space:nowrap;">Unit Usaha</th>
                            <th style="padding:10px 12px; text-align:right; white-space:nowrap;">Nominal</th>
                            <th style="padding:10px 12px; text-align:center; white-space:nowrap;">Validasi</th>
                            <th style="padding:10px 12px; text-align:center; white-space:nowrap;">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>${body}</tbody>
                </table>
            </div>
        `;
    }

    function openAsetTetapInboxModal() {
        const modal = document.getElementById('aset-tetap-inbox-modal');
        if (!modal) return;
        renderAsetTetapInboxModalContent();
        modal.style.display = 'flex';
    }

    function closeAsetTetapInboxModal() {
        const modal = document.getElementById('aset-tetap-inbox-modal');
        if (!modal) return;
        modal.style.display = 'none';
    }

    function updateAsetTetapInboxFromState() {
        const transaksiRows = Array.isArray(transaksiDataViewState.items) ? transaksiDataViewState.items : [];
        const mappingRows = Array.isArray(transaksiDataViewState.mappingReferences) ? transaksiDataViewState.mappingReferences : [];
        asetTetapInboxState.items = buildAsetTetapInboxItems(transaksiRows, mappingRows);
        renderAsetTetapInboxBadge();
        const modal = document.getElementById('aset-tetap-inbox-modal');
        if (modal && modal.style.display === 'flex') {
            renderAsetTetapInboxModalContent();
        }
    }

    async function refreshAsetTetapInboxNotifications(force = false) {
        const now = Date.now();
        if (!force && asetTetapInboxState.lastFetchedAt && (now - asetTetapInboxState.lastFetchedAt) < 30000) {
            renderAsetTetapInboxBadge();
            return;
        }
        if (asetTetapInboxState.isLoading) return;

        asetTetapInboxState.isLoading = true;
        try {
            const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
            const [transaksiRows, mappingRows] = await Promise.all([
                fetch('/api/transaksis?session_slug=' + encodeURIComponent(sessionSlug) + '&t=' + String(new Date().getTime())).then((res) => {
                    if (!res.ok) throw new Error('Gagal memuat transaksi');
                    return res.json();
                }),
                fetchWorkbookTransaksiMappingReferences(),
            ]);

            asetTetapInboxState.items = buildAsetTetapInboxItems(transaksiRows || [], mappingRows || []);
            asetTetapInboxState.lastFetchedAt = now;
            renderAsetTetapInboxBadge();

            const modal = document.getElementById('aset-tetap-inbox-modal');
            if (modal && modal.style.display === 'flex') {
                renderAsetTetapInboxModalContent();
            }
        } catch (error) {
            console.error('Failed to refresh aset tetap inbox notifications', error);
        } finally {
            asetTetapInboxState.isLoading = false;
        }
    }

    async function fetchWorkbookTransaksiMappingReferences() {
        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        const mappingTypes = ['harian', 'non_rutin', 'umum', 'jurnal'];
        const results = await Promise.all(mappingTypes.map(async (jenisMapping) => {
            const response = await fetch('/api/mapping-transaksis?session_slug=' + encodeURIComponent(sessionSlug) + '&jenis_mapping=' + encodeURIComponent(jenisMapping) + '&t=' + new Date().getTime());
            if (!response.ok) {
                throw new Error('Gagal memuat referensi mapping transaksi');
            }

            const items = await response.json();
            return (items || []).map((item) => ({
                ...item,
                jenis_mapping: item.jenis_mapping || jenisMapping,
            }));
        }));

        return results.flat();
    }

    function getTransaksiUnitFilterLabel(item, isPengembang) {
        const unitName = item.unit_usaha && item.unit_usaha.NamaUnitUsaha ? item.unit_usaha.NamaUnitUsaha : '-';
        if (!isPengembang) return unitName;

        const bumdesName = item.profile_bumdes && item.profile_bumdes.NamaBUMDes ? item.profile_bumdes.NamaBUMDes : '';
        return bumdesName ? `${unitName} - ${bumdesName}` : unitName;
    }

    function syncTransaksiUnitFilterOptions(transaksi) {
        const filterSelect = document.getElementById('transaksi-filter-unit-usaha');
        if (!filterSelect) return;

        const selectedValue = transaksiDataViewState.selectedUnitId || filterSelect.value || 'all';
        fetch('/api/profiles?t=' + new Date().getTime())
            .then((res) => res.json())
            .then((profiles) => {
                const options = new Map();
                const isPengembang = !localStorage.getItem('sibumdes_profile_id');
                const currentProfileId = localStorage.getItem('sibumdes_profile_id');
                const targetProfile = (profiles || []).find((profile) => String(profile.ID) === String(currentProfileId)) || (profiles || [])[0] || null;

                if (targetProfile && Array.isArray(targetProfile.UnitUsaha)) {
                    targetProfile.UnitUsaha.forEach((unit) => {
                        const unitId = unit && unit.ID ? String(unit.ID) : '';
                        const unitName = unit && unit.NamaUnitUsaha ? unit.NamaUnitUsaha : '-';
                        if (!unitId || options.has(unitId)) return;
                        options.set(unitId, unitName);
                    });
                }

                if (!options.size) {
                    (transaksi || []).forEach((item) => {
                        const unitId = item.unit_usaha_id ? String(item.unit_usaha_id) : '';
                        if (!unitId || options.has(unitId)) return;
                        options.set(unitId, getTransaksiUnitFilterLabel(item, isPengembang));
                    });
                }

                filterSelect.innerHTML = '<option value="all">All Unit Usaha</option>';
                Array.from(options.entries()).forEach(([unitId, label]) => {
                    const option = document.createElement('option');
                    option.value = unitId;
                    option.textContent = label;
                    filterSelect.appendChild(option);
                });

                if (selectedValue !== 'all' && options.has(selectedValue)) {
                    filterSelect.value = selectedValue;
                } else {
                    filterSelect.value = 'all';
                    transaksiDataViewState.selectedUnitId = 'all';
                }
            })
            .catch(() => {
                const options = new Map();
                (transaksi || []).forEach((item) => {
                    const unitId = item.unit_usaha_id ? String(item.unit_usaha_id) : '';
                    if (!unitId || options.has(unitId)) return;
                    options.set(unitId, getTransaksiUnitFilterLabel(item, !localStorage.getItem('sibumdes_profile_id')));
                });

                filterSelect.innerHTML = '<option value="all">All Unit Usaha</option>';
                Array.from(options.entries()).forEach(([unitId, label]) => {
                    const option = document.createElement('option');
                    option.value = unitId;
                    option.textContent = label;
                    filterSelect.appendChild(option);
                });

                if (selectedValue !== 'all' && options.has(selectedValue)) {
                    filterSelect.value = selectedValue;
                } else {
                    filterSelect.value = 'all';
                    transaksiDataViewState.selectedUnitId = 'all';
                }
            });
    }

    function getFilteredTransaksiDataViewItems() {
        const selectedUnitId = transaksiDataViewState.selectedUnitId || 'all';
        if (selectedUnitId === 'all') {
            return transaksiDataViewState.items;
        }

        return (transaksiDataViewState.items || []).filter((item) => String(item.unit_usaha_id || '') === selectedUnitId);
    }

    function buildTransaksiWorkbookTableHTML(transaksi, options = {}) {
        const sortedTransaksi = sortTransaksiRecordsDesc(transaksi);
        const hasRows = Array.isArray(sortedTransaksi) && sortedTransaksi.length > 0;
        const isPengembang = !localStorage.getItem('sibumdes_profile_id');
        const showValidasiColumn = options.showValidasiColumn === true;
        const workbookColspan = (isPengembang ? 17 : 16) + (showValidasiColumn ? 1 : 0);
        const bumdesTh = isPengembang ? `<th style="padding: 10px 12px; font-weight: 700; color: var(--text-primary); text-align: center; border-right: 1px solid var(--border); white-space: nowrap;">BUMDes</th>` : '';
        const selectedUnitLabel = options.selectedUnitLabel || null;
        const showDeleteAllButton = options.showDeleteAllButton === true;
        const showValidasiAllButton = options.showValidasiAllButton === true;

        let tableHTML = `
            <div style="overflow-x: auto; ${options.includeOuterBorder === false ? '' : 'border: 1px solid var(--border); border-radius: var(--radius-md);'}">
                <table style="width: 100%; border-collapse: collapse; text-align: left; min-width: 2100px;">
                    <thead>`;

        if (selectedUnitLabel !== null) {
            tableHTML += `
                        <tr>
                            <th style="background:#dcedc8; padding:12px 16px; border:1px solid var(--border); font-weight:700; text-transform:uppercase; font-size:0.85rem; white-space:nowrap;">Unit Usaha</th>
                            <th colspan="${workbookColspan - 1}" style="background:#dcedc8; padding:12px 16px; border:1px solid var(--border); font-weight:700; font-size:0.9rem; color:var(--text-primary);">${escapeHtml(selectedUnitLabel)}</th>
                        </tr>
                        <tr>
                            <th colspan="${workbookColspan}" style="height:12px; background:#ffffff; border-left:1px solid var(--border); border-right:1px solid var(--border);"></th>
                        </tr>`;
        }

        tableHTML += `
                        <tr style="background-color: #f5f5f5; border-bottom: 2px solid var(--border);">
                            <th style="padding: 10px 12px; font-weight: 700; color: var(--text-primary); text-align: center; border-right: 1px solid var(--border); white-space: nowrap;">Jenis Mapping</th>
                            <th style="padding: 10px 12px; font-weight: 700; color: var(--text-primary); text-align: center; border-right: 1px solid var(--border); white-space: nowrap;">Tanggal</th>
                            <th style="padding: 10px 12px; font-weight: 700; color: var(--text-primary); border-right: 1px solid var(--border); min-width: 240px;">Deskripsi Transaksi (dari Mapping)</th>
                            <th style="padding: 10px 12px; font-weight: 700; color: var(--text-primary); border-right: 1px solid var(--border); min-width: 220px;">Keterangan</th>
                            <th style="padding: 10px 12px; font-weight: 700; color: var(--text-primary); border-right: 1px solid var(--border); min-width: 180px;">Nama Cust/Supplier</th>
                            <th style="padding: 10px 12px; font-weight: 700; color: var(--text-primary); text-align: center; border-right: 1px solid var(--border); min-width: 180px;">Unit Usaha</th>
                            <th style="padding: 10px 12px; font-weight: 700; color: var(--text-primary); text-align: right; border-right: 1px solid var(--border); white-space: nowrap;">Nominal</th>
                            <th style="padding: 10px 12px; font-weight: 700; color: var(--text-primary); text-align: center; border-right: 1px solid var(--border); white-space: nowrap;">Cash Flow</th>
                            <th style="padding: 10px 12px; font-weight: 700; color: var(--text-primary); text-align: center; border-right: 1px solid var(--border); white-space: nowrap;">Kategori</th>
                            <th style="padding: 10px 12px; font-weight: 700; color: var(--text-primary); border-right: 1px solid var(--border); min-width: 260px;">Sub Kategori</th>
                            <th style="padding: 10px 12px; font-weight: 700; color: var(--text-primary); text-align: center; border-right: 1px solid var(--border); white-space: nowrap;">Aset Tetap</th>
                            <th style="padding: 10px 12px; font-weight: 700; color: var(--text-primary); text-align: center; border-right: 1px solid var(--border); white-space: nowrap;">Persediaan</th>
                            <th style="padding: 10px 12px; font-weight: 700; color: var(--text-primary); text-align: center; border-right: 1px solid var(--border); white-space: nowrap;">Bk Utang</th>
                            <th style="padding: 10px 12px; font-weight: 700; color: var(--text-primary); text-align: center; border-right: 1px solid var(--border); white-space: nowrap;">Bk Piutang</th>
                            <th style="padding: 10px 12px; font-weight: 700; color: var(--text-primary); text-align: center; border-right: 1px solid var(--border); white-space: nowrap;">Link Jurnal Penyesuaian</th>
                            ${showValidasiColumn ? `<th style="padding: 10px 12px; font-weight: 700; color: var(--text-primary); text-align: center; border-right: 1px solid var(--border); white-space: nowrap;"><div style="display:flex; flex-direction:column; align-items:center; gap:8px;"><span>Validasi</span>${showValidasiAllButton ? `<button type="button" data-role="transaksi-validasi-all" onclick="validateAllTransaksi()" title="Validasi semua transaksi pada tampilan ini" style="display:inline-flex; align-items:center; justify-content:center; gap:6px; min-width:120px; padding:6px 12px; border-radius:999px; border:1px solid #fdba74; background:#fff7ed; color:#c2410c; font-size:0.78rem; font-weight:700; cursor:pointer; white-space:nowrap;"><i class="fa-solid fa-check-double"></i><span>Validasi All</span></button>` : ''}</div></th>` : ''}
                            ${bumdesTh}
                            <th style="padding: 10px 12px; font-weight: 700; color: var(--text-primary); text-align: center; white-space: nowrap; position: sticky; right: 0; background: #f5f5f5; z-index: 3; border-left: 1px solid var(--border);">${showDeleteAllButton ? `<div style="display:flex; flex-direction:column; align-items:center; gap:8px;"><span>Aksi</span><button type="button" class="action-btn delete" onclick="deleteAllTransaksi()" title="Hapus Semua Transaksi" style="display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px;"><i class="fa-solid fa-trash"></i></button></div>` : 'Aksi'}</th>
                        </tr>
                    </thead>
                    <tbody>`;

        sortedTransaksi.forEach((tx) => {
            const mapping = findWorkbookMappingForTransaksi(tx);
            const tanggal = tx.tanggal ? new Date(tx.tanggal).toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-';
            const nama = tx.nama_pelanggan_pemasok || '-';
            const keterangan = tx.keterangan || '-';
            const deskripsi = tx.deskripsi || '-';
            const unit = tx.unit_usaha && tx.unit_usaha.NamaUnitUsaha ? tx.unit_usaha.NamaUnitUsaha : '-';
            const nominal = tx.nominal ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(tx.nominal) : '-';
            const bumdesName = tx.profile_bumdes && tx.profile_bumdes.NamaBUMDes ? tx.profile_bumdes.NamaBUMDes : (tx.profile_bumdes_id ? 'ID:' + tx.profile_bumdes_id : '-');
            const bumdesTd = isPengembang ? `<td style="padding: 10px 12px; text-align: center; font-size: 0.85rem; border-right:1px solid var(--border);"><span style="background:#ede9fe;color:#5b21b6;padding:4px 8px;border-radius:4px;font-weight:500;">${escapeHtml(bumdesName)}</span></td>` : '';
            const jenisMapping = getJenisMappingWorkbookLabel(mapping ? mapping.jenis_mapping : 'harian');
            const cashFlow = getCashFlowWorkbookLabel(mapping ? mapping.cash_in_out : '', tx.tipe_kas);
            const kategori = mapping && mapping.klasifikasi_arus_kas
                ? String(mapping.klasifikasi_arus_kas).replace(/^Aktivitas\s+/i, '')
                : '-';
            const subKategori = mapping && mapping.kategori_arus_kas ? mapping.kategori_arus_kas : '-';
            const linkAsetTetap = getWorkbookFlagLabel(mapping && mapping.link_aset_tetap);
            const linkPersediaan = getWorkbookFlagLabel(mapping && mapping.link_persediaan);
            const linkBkUtang = getWorkbookFlagLabel(mapping && mapping.link_bk_utang);
            const linkBkPiutang = getWorkbookFlagLabel(mapping && mapping.link_bk_piutang);
            const linkJurnalPenyesuaian = getWorkbookFlagLabel(mapping && mapping.link_jurnal_penyesuaian);
            const validasiLabel = normalizeTransaksiValidasiLabel(tx.validasi || 'Belum');
            const validasiStyles = getTransaksiValidasiPillStyles(validasiLabel);
            const validasiTd = showValidasiColumn
                ? `<td style="padding: 10px 12px; text-align: center; color: var(--text-secondary); font-size: 0.9rem; border-right:1px solid var(--border); white-space:nowrap;"><button type="button" data-role="transaksi-validasi-toggle" data-transaksi-id="${tx.id}" data-validasi="${validasiLabel}" onclick="toggleTransaksiValidasi(${tx.id})" title="Klik untuk ubah validasi" style="display:inline-block;min-width:64px;text-align:center;background:${validasiStyles.background};color:${validasiStyles.color};padding:4px 10px;border-radius:999px;font-size:0.8rem;font-weight:600;border:none;cursor:pointer;">${validasiLabel}</button></td>`
                : '';

            tableHTML += `
                <tr onclick="handleTransaksiRowClick(${tx.id}, event)" style="border-bottom: 1px solid var(--border); cursor: pointer;">
                    <td style="padding: 10px 12px; text-align: center; color: var(--text-secondary); font-size: 0.9rem; border-right:1px solid var(--border); white-space:nowrap;">${escapeHtml(jenisMapping)}</td>
                    <td style="padding: 10px 12px; text-align: center; color: var(--text-secondary); font-size: 0.9rem; border-right:1px solid var(--border); white-space:nowrap;">${escapeHtml(tanggal)}</td>
                    <td style="padding: 10px 12px; color: var(--text-primary); font-size: 0.9rem; border-right:1px solid var(--border); font-weight:500;">${escapeHtml(deskripsi)}</td>
                    <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 0.9rem; border-right:1px solid var(--border);">${escapeHtml(keterangan)}</td>
                    <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 0.9rem; border-right:1px solid var(--border);">${escapeHtml(nama)}</td>
                    <td style="padding: 10px 12px; text-align: center; color: var(--text-secondary); font-size: 0.9rem; border-right:1px solid var(--border);">${escapeHtml(unit)}</td>
                    <td style="padding: 10px 12px; text-align: right; color: var(--text-primary); font-weight: 600; font-size: 0.9rem; border-right:1px solid var(--border); white-space:nowrap;">${escapeHtml(nominal)}</td>
                    <td style="padding: 10px 12px; text-align: center; color: var(--text-secondary); font-size: 0.9rem; border-right:1px solid var(--border); white-space:nowrap;">${escapeHtml(cashFlow)}</td>
                    <td style="padding: 10px 12px; text-align: center; color: var(--text-secondary); font-size: 0.9rem; border-right:1px solid var(--border); white-space:nowrap;">${escapeHtml(kategori)}</td>
                    <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 0.9rem; border-right:1px solid var(--border);">${escapeHtml(subKategori)}</td>
                    <td style="padding: 10px 12px; text-align: center; color: var(--text-secondary); font-size: 0.9rem; border-right:1px solid var(--border);">${escapeHtml(linkAsetTetap)}</td>
                    <td style="padding: 10px 12px; text-align: center; color: var(--text-secondary); font-size: 0.9rem; border-right:1px solid var(--border);">${escapeHtml(linkPersediaan)}</td>
                    <td style="padding: 10px 12px; text-align: center; color: var(--text-secondary); font-size: 0.9rem; border-right:1px solid var(--border);">${escapeHtml(linkBkUtang)}</td>
                    <td style="padding: 10px 12px; text-align: center; color: var(--text-secondary); font-size: 0.9rem; border-right:1px solid var(--border);">${escapeHtml(linkBkPiutang)}</td>
                    <td style="padding: 10px 12px; text-align: center; color: var(--text-secondary); font-size: 0.9rem; border-right:1px solid var(--border);">${escapeHtml(linkJurnalPenyesuaian)}</td>
                    ${validasiTd}
                    ${bumdesTd}
                    <td style="padding: 10px 12px; text-align: center; white-space:nowrap; position: sticky; right: 0; background: #fff; z-index: 2; border-left:1px solid var(--border);">
                        <button type="button" class="action-btn edit" data-no-row-click="true" onclick="editTransaksi(${tx.id})" title="Edit Transaksi" style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:8px;background:#e3f2fd;color:#1976d2;width:auto;">
                            <i class="fa-solid fa-pen"></i><span style="font-size:0.78rem;font-weight:600;">Edit</span>
                        </button>
                        <button type="button" class="action-btn delete" data-no-row-click="true" onclick="deleteTransaksi(${tx.id})" title="Hapus Transaksi" style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:8px;background:#ffebee;color:#c62828;width:auto;margin-left:6px;">
                            <i class="fa-solid fa-trash"></i><span style="font-size:0.78rem;font-weight:600;">Hapus</span>
                        </button>
                    </td>
                </tr>
            `;
        });

        if (!hasRows) {
            tableHTML += `
                <tr>
                    <td colspan="${workbookColspan}" style="padding: 36px 18px; text-align: center; color: var(--text-secondary);">
                        <i class="fa-solid fa-inbox fa-2x" style="margin-bottom: 12px; opacity: 0.5;"></i>
                        <p>Belum ada data transaksi yang terdaftar.</p>
                    </td>
                </tr>
            `;
        }

        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;

        return tableHTML;
    }

    function renderTransaksiHistoryTable(transaksi) {
        const container = document.getElementById('transaksi-history-table-container');
        if(!container) return;

        container.innerHTML = buildTransaksiWorkbookTableHTML(transaksi, {
            showDeleteAllButton: true,
            includeOuterBorder: false,
            showValidasiColumn: !isOperatorDataTransaksiRole(),
        });
    }

    function loadTransaksiDataView() {
        const container = document.getElementById('transaksi-table-container');
        if(!container) return;

        container.innerHTML = `<div style="text-align:center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat data...</div>`;

        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        Promise.all([
            fetch('/api/transaksis?session_slug=' + sessionSlug + '&t=' + new Date().getTime()).then(res => res.json()),
            fetchWorkbookTransaksiMappingReferences().catch((error) => {
                console.error('Failed to load workbook transaksi mappings', error);
                return [];
            })
        ])
            .then(([data, mappings]) => {
                setTransaksiMappingReferences(mappings || []);
                transaksiDataViewState.items = data || [];
                syncTransaksiUnitFilterOptions(transaksiDataViewState.items);
                renderTransaksiDataTable(getFilteredTransaksiDataViewItems());
                updateAsetTetapInboxFromState();
            })
            .catch(err => {
                console.error("Failed to load transaksi", err);
                container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-secondary);">
                    <i class="fa-solid fa-exclamation-circle fa-3x" style="margin-bottom:16px;"></i>
                    <p>Gagal memuat data transaksi</p>
                </div>`;
            });
    }

    function renderTransaksiDataTable(transaksi) {
        const container = document.getElementById('transaksi-table-container');
        if(!container) return;

        const sortedTransaksi = sortTransaksiRecordsDesc(transaksi);

        console.log('Rendering transaksi data table, count:', sortedTransaksi ? sortedTransaksi.length : 0);

        const hasRows = Array.isArray(sortedTransaksi) && sortedTransaksi.length > 0;

        const isPengembang = !localStorage.getItem('sibumdes_profile_id');
        const bumdesTh = isPengembang ? `<th style="padding: 10px 12px; font-weight: 700; color: var(--text-primary); text-align: center; border-right: 1px solid var(--border); white-space: nowrap;">BUMDes</th>` : '';
        const workbookColspan = isPengembang ? 17 : 16;
        const selectedUnitLabel = (() => {
            if (!sortedTransaksi.length) return '-';
            if (transaksiDataViewState.selectedUnitId && transaksiDataViewState.selectedUnitId !== 'all') {
                const firstItem = sortedTransaksi[0];
                const unitName = firstItem && firstItem.unit_usaha && firstItem.unit_usaha.NamaUnitUsaha ? firstItem.unit_usaha.NamaUnitUsaha : '-';
                const bumdesName = firstItem && firstItem.profile_bumdes && firstItem.profile_bumdes.NamaBUMDes ? firstItem.profile_bumdes.NamaBUMDes : '';
                return isPengembang && bumdesName ? `${unitName} - ${bumdesName}` : unitName;
            }
            return 'Semua Unit Usaha';
        })();

        container.innerHTML = buildTransaksiWorkbookTableHTML(transaksi, {
            selectedUnitLabel,
            showDeleteAllButton: true,
            showValidasiAllButton: true,
            showValidasiColumn: !isOperatorDataTransaksiRole(),
        });
        console.log('Transaksi data table rendered with', transaksi.length, 'rows');
    }

    window.deleteAllTransaksi = function() {
        window.showConfirmModal('Apakah Anda yakin ingin menghapus semua transaksi?', () => {
            const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
            fetch('/api/transaksis?session_slug=' + encodeURIComponent(sessionSlug), { method: 'DELETE' })
                .then(res => {
                    if (!res.ok) {
                        throw new Error('Gagal menghapus semua transaksi');
                    }
                    showToast('Semua transaksi berhasil dihapus');
                    transaksiDataViewState.items = [];
                    transaksiHistoryState.items = [];
                    renderTransaksiDataTable([]);
                    renderTransaksiHistoryTable([]);
                })
                .catch(err => {
                    console.error(err);
                    showToast('Gagal menghapus semua transaksi', true);
                });
        });
    };

    function loadJurnalRekapitulasi() {
        const container = document.getElementById('jurnal-rekap-table-container');
        if(!container) return;

        container.innerHTML = `<div style="text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Menyusun jurnal rekapitulasi...</div>`;
        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        const params = new URLSearchParams({
            session_slug: sessionSlug,
            t: String(new Date().getTime())
        });
        const unitUsahaId = getActiveWorkbookUnitUsahaId(['jurnal-rekap-unit-filter']);
        if (unitUsahaId) {
            params.set('unit_usaha_id', unitUsahaId);
        }

        fetch('/api/jurnal-rekapitulasi?' + params.toString())
            .then(res => {
                if (!res.ok) throw new Error('Gagal memuat jurnal rekapitulasi');
                return res.json();
            })
            .then(data => {
                renderJurnalRekapitulasiTable(data || []);
            })
            .catch(err => {
                console.error(err);
                container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-exclamation-circle fa-3x" style="margin-bottom:16px;"></i><p>Gagal memuat data jurnal rekapitulasi.</p></div>`;
            });
    }

    function loadJurnalRekapitulasiView() {
        loadWorkbookUnitFilterOptions('jurnal-rekap-unit-filter');
        loadJurnalRekapitulasi();
    }

    function formatHistoriAkunPeriodLabel(periodValue) {
        const normalized = String(periodValue || '').trim();
        if (!normalized) return 'PER -';

        const date = new Date(`${normalized}T00:00:00`);
        if (Number.isNaN(date.getTime())) {
            return `PER ${normalized.toUpperCase()}`;
        }

        const monthYear = date.toLocaleDateString('id-ID', {
            month: 'long',
            year: 'numeric',
        }).toUpperCase();
        return `PER ${monthYear}`;
    }

    function buildHistoriAkunSaldoAwalByCode(rows) {
        const totals = new Map();
        (rows || []).forEach((row) => {
            const code = parseSaldoAwalAccountCode(row && row.kodeAkun);
            if (!code) return;

            const debit = Array.isArray(row && row.debitValues)
                ? row.debitValues.reduce((sum, value) => sum + (Number(value) || 0), 0)
                : Number(row && row.debit) || 0;
            const kredit = Array.isArray(row && row.kreditValues)
                ? row.kreditValues.reduce((sum, value) => sum + (Number(value) || 0), 0)
                : Number(row && row.kredit) || 0;

            const previous = totals.get(code) || { debit: 0, kredit: 0 };
            previous.debit += debit;
            previous.kredit += kredit;
            totals.set(code, previous);
        });
        return totals;
    }

    function renderHistoriAkunTable(groups, options = {}) {
        const container = document.getElementById('histori-akun-table-container');
        if(!container) return;

        if(!groups || groups.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-book fa-3x" style="margin-bottom:16px;"></i><p>Belum ada data histori akun.</p></div>`;
            return;
        }

        const formatCurrency = (n) => {
            const num = Number(n || 0);
            return new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', minimumFractionDigits:0 }).format(num);
        };

        const saldoAwalByCode = options.saldoAwalByCode || new Map();
        const profileLabel = String(options.profileName || localStorage.getItem('sibumdes_profile_name') || 'BUMDES').toUpperCase();
        const periodLabel = formatHistoriAkunPeriodLabel(options.period || '');
        const selectedUnitLabel = String(options.selectedUnitLabel || 'Semua Unit Usaha').trim() || 'Semua Unit Usaha';

        const summaryByCode = new Map();
        (groups || []).forEach((group) => {
            const code = String(group && group.kode_akun || '').trim();
            if (!code) return;

            const key = `${selectedUnitLabel}||${code}`;
            if (!summaryByCode.has(key)) {
                summaryByCode.set(key, {
                    unitUsaha: selectedUnitLabel,
                    kodeAkun: code,
                    namaAkun: String(group && group.nama_akun || '').trim() || '-',
                    transaksiDebit: 0,
                    transaksiKredit: 0,
                });
            }

            const target = summaryByCode.get(key);
            (group.rows || []).forEach((row) => {
                target.transaksiDebit += Number(row && row.debit) || 0;
                target.transaksiKredit += Number(row && row.kredit) || 0;
            });
        });

        const sortedRows = Array.from(summaryByCode.values()).sort((left, right) => {
            const byUnit = String(left.unitUsaha || '').localeCompare(String(right.unitUsaha || ''), 'id');
            if (byUnit !== 0) return byUnit;
            return String(left.kodeAkun || '').localeCompare(String(right.kodeAkun || ''), 'id');
        });

        const rowsHtml = sortedRows.map((row, index) => {
            const saldoAwal = saldoAwalByCode.get(row.kodeAkun) || { debit: 0, kredit: 0 };
            const saldoAwalDebit = Number(saldoAwal.debit) || 0;
            const saldoAwalKredit = Number(saldoAwal.kredit) || 0;
            const transaksiDebit = Number(row.transaksiDebit) || 0;
            const transaksiKredit = Number(row.transaksiKredit) || 0;
            const sebelumDebit = saldoAwalDebit + transaksiDebit;
            const sebelumKredit = saldoAwalKredit + transaksiKredit;
            const penyesuaianDebit = 0;
            const penyesuaianKredit = 0;
            const setelahDebit = sebelumDebit + penyesuaianDebit;
            const setelahKredit = sebelumKredit + penyesuaianKredit;

            return `
                <tr style="background:${index % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom:1px solid #d8dee6;">
                    <td style="padding:10px 12px; white-space:nowrap; color:#334155;">${escapeHtml(row.unitUsaha || '-')}</td>
                    <td style="padding:10px 12px; white-space:nowrap; color:#0f172a; font-weight:600;">${escapeHtml(row.kodeAkun || '-')}</td>
                    <td style="padding:10px 12px; color:#0f172a; font-weight:500; min-width:260px;">${escapeHtml(row.namaAkun || '-')}</td>
                    <td style="padding:10px 12px; text-align:right; white-space:nowrap; color:#14532d; background:#ecfdf3;">${escapeHtml(formatCurrency(saldoAwalDebit))}</td>
                    <td style="padding:10px 12px; text-align:right; white-space:nowrap; color:#831843; background:#fdf2f8;">${escapeHtml(formatCurrency(saldoAwalKredit))}</td>
                    <td style="padding:10px 12px; text-align:right; white-space:nowrap; color:#14532d;">${escapeHtml(formatCurrency(transaksiDebit))}</td>
                    <td style="padding:10px 12px; text-align:right; white-space:nowrap; color:#831843;">${escapeHtml(formatCurrency(transaksiKredit))}</td>
                    <td style="padding:10px 12px; text-align:right; white-space:nowrap; color:#14532d; background:#f8fafc; font-weight:600;">${escapeHtml(formatCurrency(sebelumDebit))}</td>
                    <td style="padding:10px 12px; text-align:right; white-space:nowrap; color:#831843; background:#f8fafc; font-weight:600;">${escapeHtml(formatCurrency(sebelumKredit))}</td>
                    <td style="padding:10px 12px; text-align:right; white-space:nowrap; color:#14532d;">${escapeHtml(formatCurrency(penyesuaianDebit))}</td>
                    <td style="padding:10px 12px; text-align:right; white-space:nowrap; color:#831843;">${escapeHtml(formatCurrency(penyesuaianKredit))}</td>
                    <td style="padding:10px 12px; text-align:right; white-space:nowrap; color:#14532d; background:#f0fdf4; font-weight:700;">${escapeHtml(formatCurrency(setelahDebit))}</td>
                    <td style="padding:10px 12px; text-align:right; white-space:nowrap; color:#831843; background:#fdf2f8; font-weight:700;">${escapeHtml(formatCurrency(setelahKredit))}</td>
                </tr>`;
        }).join('');

        container.innerHTML = `
            <div style="overflow-x:auto; border:1px solid #d8dee6; border-radius:12px; background:#ffffff; box-shadow:0 12px 28px rgba(15,23,42,0.08);">
                <table class="data-table" style="width:100%; border-collapse:collapse; min-width:1760px;">
                    <thead>
                        <tr>
                            <th colspan="13" style="padding:12px 16px; text-align:center; background:#ffffff; color:#0f172a; font-size:1rem; border-bottom:1px solid #d8dee6;">HISTORI AKUN</th>
                        </tr>
                        <tr>
                            <th colspan="13" style="padding:10px 16px; text-align:center; background:#ffffff; color:#0f172a; font-size:0.95rem; border-bottom:1px solid #d8dee6;">${escapeHtml(profileLabel)}</th>
                        </tr>
                        <tr>
                            <th colspan="13" style="padding:10px 16px; text-align:center; background:#ffffff; color:#475569; font-size:0.9rem; border-bottom:1px solid #d8dee6;">${escapeHtml(periodLabel)}</th>
                        </tr>
                        <tr style="background:#0f5d66; color:#ffffff;">
                            <th rowspan="2" style="padding:10px 12px; text-align:left; border-right:1px solid rgba(255,255,255,0.18);">Unit Usaha</th>
                            <th rowspan="2" style="padding:10px 12px; text-align:left; border-right:1px solid rgba(255,255,255,0.18);">Kode Akun</th>
                            <th rowspan="2" style="padding:10px 12px; text-align:left; border-right:1px solid rgba(255,255,255,0.18);">Nama Akun</th>
                            <th colspan="2" style="padding:10px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">Saldo Awal</th>
                            <th colspan="2" style="padding:10px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">Transaksi Berjalan</th>
                            <th colspan="2" style="padding:10px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">Saldo Sebelum Disesuaikan</th>
                            <th colspan="2" style="padding:10px 12px; text-align:center; border-right:1px solid rgba(255,255,255,0.18);">Jurnal Penyesuaian</th>
                            <th colspan="2" style="padding:10px 12px; text-align:center;">Saldo Setelah Disesuaikan</th>
                        </tr>
                        <tr style="background:#2f7a68; color:#e2e8f0;">
                            <th style="padding:8px 12px; text-align:right; border-right:1px solid rgba(255,255,255,0.18);">Debit (Rp)</th>
                            <th style="padding:8px 12px; text-align:right; border-right:1px solid rgba(255,255,255,0.18);">Kredit (Rp)</th>
                            <th style="padding:8px 12px; text-align:right; border-right:1px solid rgba(255,255,255,0.18);">Debit (Rp)</th>
                            <th style="padding:8px 12px; text-align:right; border-right:1px solid rgba(255,255,255,0.18);">Kredit (Rp)</th>
                            <th style="padding:8px 12px; text-align:right; border-right:1px solid rgba(255,255,255,0.18);">Debit (Rp)</th>
                            <th style="padding:8px 12px; text-align:right; border-right:1px solid rgba(255,255,255,0.18);">Kredit (Rp)</th>
                            <th style="padding:8px 12px; text-align:right; border-right:1px solid rgba(255,255,255,0.18);">Debit (Rp)</th>
                            <th style="padding:8px 12px; text-align:right; border-right:1px solid rgba(255,255,255,0.18);">Kredit (Rp)</th>
                            <th style="padding:8px 12px; text-align:right; border-right:1px solid rgba(255,255,255,0.18);">Debit (Rp)</th>
                            <th style="padding:8px 12px; text-align:right;">Kredit (Rp)</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>`;
    }

    function loadHistoriAkun() {
        const container = document.getElementById('histori-akun-table-container');
        if(!container) return;

        container.innerHTML = `<div style="text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Menyusun histori akun...</div>`;
        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        const params = new URLSearchParams({
            session_slug: sessionSlug,
            t: String(new Date().getTime())
        });
        const unitUsahaId = getActiveWorkbookUnitUsahaId(['histori-akun-unit-filter']);
        if (unitUsahaId) {
            params.set('unit_usaha_id', unitUsahaId);
        }

        const selectedUnitOption = document.querySelector('#histori-akun-unit-filter option:checked');
        const selectedUnitLabel = selectedUnitOption ? String(selectedUnitOption.textContent || '').trim() : 'Semua Unit Usaha';

        Promise.all([
            fetch('/api/histori-akun?' + params.toString()).then((res) => {
                if (!res.ok) throw new Error('Gagal memuat histori akun');
                return res.json();
            }),
            fetch(buildSaldoAwalApiUrl()).then((res) => {
                if (!res.ok) return { rows: [], period: '' };
                return res.json();
            }).catch(() => ({ rows: [], period: '' })),
        ])
            .then(([historiData, saldoAwalData]) => {
                renderHistoriAkunTable(historiData || [], {
                    saldoAwalByCode: buildHistoriAkunSaldoAwalByCode(Array.isArray(saldoAwalData && saldoAwalData.rows) ? saldoAwalData.rows : []),
                    period: saldoAwalData && saldoAwalData.period,
                    profileName: localStorage.getItem('sibumdes_profile_name') || 'BUMDES',
                    selectedUnitLabel,
                });
            })
            .catch((err) => {
                console.error(err);
                container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-exclamation-circle fa-3x" style="margin-bottom:16px;"></i><p>Gagal memuat data histori akun.</p></div>`;
            });
    }

    function loadHistoriAkunView() {
        loadWorkbookUnitFilterOptions('histori-akun-unit-filter');
        loadHistoriAkun();
    }

    const jurnalViewState = {
        rows: [],
        selectedUnitId: 'all',
    };

    function formatJurnalWorkbookDate(value) {
        if(!value) return '-';
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        return date.toLocaleDateString('id-ID', { year:'numeric', month:'2-digit', day:'2-digit' });
    }

    function formatJurnalWorkbookCurrency(value) {
        const amount = Number(value || 0);
        return new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', minimumFractionDigits:0 }).format(amount);
    }

    function getJurnalWorkbookFlag(flag) {
        return flag ? 'Ya' : '-';
    }

    function formatKartuPersediaanValue(value) {
        if (value === null || value === undefined || value === '') return '-';
        return String(value);
    }

    function loadWorkbookUnitFilterOptions(elementId, preferredValue = null, statePath = null) {
        const dropdown = document.getElementById(elementId);
        if (!dropdown) return Promise.resolve();

        const currentValue = String(preferredValue != null ? preferredValue : (dropdown.value || 'all')).trim() || 'all';

        return fetch('/api/profiles')
            .then((res) => res.json())
            .then((profiles) => {
                const loggedProfileId = String(localStorage.getItem('sibumdes_profile_id') || '').trim();
                const options = [{ value: 'all', label: 'Semua Unit Usaha' }];

                if (Array.isArray(profiles) && profiles.length > 0) {
                    const targetProfile = loggedProfileId
                        ? profiles.find((profile) => String(profile.ID || '') === loggedProfileId)
                        : profiles[0];

                    ((targetProfile && targetProfile.UnitUsaha) || []).forEach((unit) => {
                        options.push({
                            value: String(unit.ID || ''),
                            label: unit.NamaUnitUsaha || '-',
                        });
                    });
                }

                dropdown.innerHTML = options
                    .filter((option, index, list) => option.value === 'all' || list.findIndex((item) => item.value === option.value) === index)
                    .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
                    .join('');

                const nextValue = options.some((option) => option.value === currentValue) ? currentValue : 'all';
                dropdown.value = nextValue;

                if (statePath === '/bp-utang' || statePath === '/bp-piutang') {
                    setTransaksiSubledgerUnitFilterValue(statePath, nextValue);
                }
            })
            .catch((err) => {
                console.error('Failed to load workbook unit filters', err);
            });
    }

    function getActiveWorkbookUnitUsahaId(preferredSelectIds = []) {
        for (const elementId of preferredSelectIds) {
            const select = document.getElementById(elementId);
            const normalized = String(select && select.value ? select.value : '').trim();
            if (normalized && normalized !== 'all') {
                return normalized;
            }
        }

        return '';
    }

    function renderKartuPersediaanTable(groups, options = {}) {
        const container = options.container || document.getElementById(options.containerId || 'kartu-persediaan-table-container');
        if (!container) return;

        const emptyMessage = options.emptyMessage || 'Belum ada data kartu persediaan untuk barang yang dipilih.';

        if (!groups || groups.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-boxes-stacked fa-3x" style="margin-bottom:16px;"></i><p>${escapeHtml(emptyMessage)}</p></div>`;
            return;
        }

        const blocks = groups.map((group) => {
            const addButton = `
                <button class="primary-btn" style="background:#fff; color:var(--text-primary); border:1px solid var(--border); padding:8px 12px;" onclick="addKartuPersediaanManual('${escapeHtml(group.barang_slug || '')}', ${Number(group.unit_usaha_id || 0)})">
                    <i class="fa-solid fa-plus"></i> Tambah Manual
                </button>`;

            const bodyRows = (group.rows || []).map((row) => {
                const isManual = !!row.is_manual;
                const actionCell = isManual
                    ? `<button class="primary-btn" style="background:#fff; color:var(--text-primary); border:1px solid var(--border); padding:6px 10px; margin-right:6px;" onclick="editKartuPersediaanManual(${Number(row.manual_id || 0)}, ${Number(group.unit_usaha_id || 0)}, '${escapeHtml(group.barang_slug || '')}')"><i class="fa-solid fa-pen"></i></button><button class="primary-btn" style="background:#fff; color:#dc2626; border:1px solid #fecaca; padding:6px 10px;" onclick="deleteKartuPersediaanManual(${Number(row.manual_id || 0)})"><i class="fa-solid fa-trash"></i></button>`
                    : '-';

                return `
                <tr style="border-bottom:1px solid var(--border);${isManual ? 'background:#fffef7;' : ''}">
                    <td style="padding:10px 12px;border-right:1px solid var(--border);white-space:nowrap;color:var(--text-secondary);">${escapeHtml(formatJurnalWorkbookDate(row.tanggal))}</td>
                    <td style="padding:10px 12px;border-right:1px solid var(--border);color:var(--text-secondary);">${escapeHtml(row.deskripsi || '-')}</td>
                    <td style="padding:10px 12px;border-right:1px solid var(--border);color:var(--text-primary);">${escapeHtml(row.keterangan || '-')}</td>
                    <td style="padding:10px 12px;border-right:1px solid var(--border);text-align:center;color:var(--text-secondary);white-space:nowrap;">${escapeHtml(formatKartuPersediaanValue(row.masuk_qty))}</td>
                    <td style="padding:10px 12px;border-right:1px solid var(--border);text-align:right;color:var(--text-secondary);white-space:nowrap;">${escapeHtml(formatKartuPersediaanValue(row.masuk_harga))}</td>
                    <td style="padding:10px 12px;border-right:1px solid var(--border);text-align:right;color:var(--text-primary);font-weight:600;white-space:nowrap;">${escapeHtml(row.masuk_nominal > 0 ? formatJurnalWorkbookCurrency(row.masuk_nominal) : (row.masuk_qty && row.masuk_qty !== '-' ? formatJurnalWorkbookCurrency(0) : '-'))}</td>
                    <td style="padding:10px 12px;border-right:1px solid var(--border);text-align:center;color:var(--text-secondary);white-space:nowrap;">${escapeHtml(formatKartuPersediaanValue(row.keluar_qty))}</td>
                    <td style="padding:10px 12px;border-right:1px solid var(--border);text-align:right;color:var(--text-secondary);white-space:nowrap;">${escapeHtml(formatKartuPersediaanValue(row.keluar_harga))}</td>
                    <td style="padding:10px 12px;border-right:1px solid var(--border);text-align:right;color:var(--text-primary);font-weight:600;white-space:nowrap;">${escapeHtml(row.keluar_nominal > 0 ? formatJurnalWorkbookCurrency(row.keluar_nominal) : (row.keluar_qty && row.keluar_qty !== '-' ? formatJurnalWorkbookCurrency(0) : '-'))}</td>
                    <td style="padding:10px 12px;border-right:1px solid var(--border);text-align:center;color:var(--text-secondary);white-space:nowrap;">${escapeHtml(formatKartuPersediaanValue(row.saldo_qty))}</td>
                    <td style="padding:10px 12px;border-right:1px solid var(--border);text-align:right;color:var(--text-secondary);white-space:nowrap;">${escapeHtml(formatKartuPersediaanValue(row.saldo_harga))}</td>
                    <td style="padding:10px 12px;border-right:1px solid var(--border);text-align:right;color:var(--text-primary);font-weight:700;white-space:nowrap;background:#f8fafc;">${escapeHtml(formatJurnalWorkbookCurrency(typeof row.saldo_nominal === 'number' ? row.saldo_nominal : 0))}</td>
                    <td style="padding:10px 12px;text-align:center;white-space:nowrap;">${actionCell}</td>
                </tr>`;
            }).join('');

            return `
                <div style="margin-bottom:28px; overflow-x:auto; border:1px solid var(--border); border-radius:var(--radius-md);">
                    <div style="display:flex; justify-content:flex-end; padding:12px; border-bottom:1px solid var(--border); background:#f8fafc;">${addButton}</div>
                    <table style="width:100%; border-collapse:collapse; text-align:left; min-width:1640px;">
                        <thead>
                            <tr>
                                <th style="background:#dcedc8;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-transform:uppercase;font-size:0.9rem;white-space:nowrap;">Kartu Persediaan</th>
                                <th colspan="12" style="background:#dcedc8;padding:12px 16px;border:1px solid var(--border);"></th>
                            </tr>
                            <tr>
                                <th style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;font-size:0.85rem;white-space:nowrap;">Unit Usaha</th>
                                <th colspan="12" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:600;color:var(--text-primary);">${escapeHtml(group.unit_usaha || '-')}</th>
                            </tr>
                            <tr>
                                <th style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;font-size:0.85rem;white-space:nowrap;">Akun Persediaan</th>
                                <th colspan="12" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:600;color:var(--text-primary);">${escapeHtml(group.akun_persediaan || '-')}</th>
                            </tr>
                            <tr>
                                <th style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;font-size:0.85rem;white-space:nowrap;">Nama Referensi</th>
                                <th colspan="12" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:600;color:var(--text-primary);">${escapeHtml(group.nama_referensi || '-')}</th>
                            </tr>
                            <tr>
                                <th style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;font-size:0.85rem;white-space:nowrap;">Satuan</th>
                                <th colspan="12" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:600;color:var(--text-primary);">${escapeHtml(group.satuan || '-')}</th>
                            </tr>
                            <tr style="background:#f5f5f5;border-bottom:2px solid var(--border);">
                                <th rowspan="2" style="padding:10px 12px;font-weight:700;border-right:1px solid var(--border);white-space:nowrap;">Tanggal</th>
                                <th rowspan="2" style="padding:10px 12px;font-weight:700;border-right:1px solid var(--border);min-width:160px;">Deskripsi</th>
                                <th rowspan="2" style="padding:10px 12px;font-weight:700;border-right:1px solid var(--border);min-width:280px;">Keterangan</th>
                                <th colspan="3" style="padding:10px 12px;font-weight:700;border-right:1px solid var(--border);text-align:center;white-space:nowrap;">Masuk</th>
                                <th colspan="3" style="padding:10px 12px;font-weight:700;border-right:1px solid var(--border);text-align:center;white-space:nowrap;">Keluar</th>
                                <th colspan="3" style="padding:10px 12px;font-weight:700;text-align:center;white-space:nowrap;">Saldo</th>
                                <th rowspan="2" style="padding:10px 12px;font-weight:700;text-align:center;white-space:nowrap;">Aksi</th>
                            </tr>
                            <tr style="background:#f5f5f5;border-bottom:2px solid var(--border);">
                                <th style="padding:10px 12px;font-weight:700;border-right:1px solid var(--border);text-align:center;white-space:nowrap;">Masuk Unit</th>
                                <th style="padding:10px 12px;font-weight:700;border-right:1px solid var(--border);text-align:right;white-space:nowrap;">Rp/Unit</th>
                                <th style="padding:10px 12px;font-weight:700;border-right:1px solid var(--border);text-align:right;white-space:nowrap;">Jml Rp</th>
                                <th style="padding:10px 12px;font-weight:700;border-right:1px solid var(--border);text-align:center;white-space:nowrap;">Keluar Unit</th>
                                <th style="padding:10px 12px;font-weight:700;border-right:1px solid var(--border);text-align:right;white-space:nowrap;">Rp/Unit</th>
                                <th style="padding:10px 12px;font-weight:700;border-right:1px solid var(--border);text-align:right;white-space:nowrap;">Jml Rp</th>
                                <th style="padding:10px 12px;font-weight:700;border-right:1px solid var(--border);text-align:center;white-space:nowrap;">Saldo Unit</th>
                                <th style="padding:10px 12px;font-weight:700;border-right:1px solid var(--border);text-align:right;white-space:nowrap;">Rp/Unit</th>
                                <th style="padding:10px 12px;font-weight:700;text-align:right;white-space:nowrap;">Jml Rp</th>
                            </tr>
                        </thead>
                        <tbody>${bodyRows}</tbody>
                    </table>
                </div>`;
        }).join('');

        container.innerHTML = blocks;
    }

    function renderKartuAsetTetapTable(groups, options = {}) {
        const container = options.container || document.getElementById(options.containerId || 'transaksi-subledger-table-container');
        if (!container) return;

        const emptyMessage = options.emptyMessage || 'Belum ada data kartu aset tetap.';
        if (!groups || groups.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-building-columns fa-3x" style="margin-bottom:16px;"></i><p>${escapeHtml(emptyMessage)}</p></div>`;
            return;
        }

        // Kelompokkan per unit usaha
        const byUnit = {};
        groups.forEach(g => {
            const key = g.unit_usaha || '-';
            if (!byUnit[key]) byUnit[key] = [];
            byUnit[key].push(g);
        });

        const blocks = Object.entries(byUnit).map(([unitName, rows]) => {
            const bodyRows = rows.map(g => `
                <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:9px 10px;border-right:1px solid var(--border);white-space:nowrap;color:var(--text-secondary);">${escapeHtml(g.kode_aset || '-')}</td>
                    <td style="padding:9px 10px;border-right:1px solid var(--border);color:var(--text-primary);min-width:160px;">${escapeHtml(g.nama_aset || '-')}</td>
                    <td style="padding:9px 10px;border-right:1px solid var(--border);color:var(--text-secondary);white-space:nowrap;">${escapeHtml(g.merk_aset || '-')}</td>
                    <td style="padding:9px 10px;border-right:1px solid var(--border);white-space:nowrap;color:var(--text-secondary);">${escapeHtml(formatJurnalWorkbookDate(g.tanggal_pembelian))}</td>
                    <td style="padding:9px 10px;border-right:1px solid var(--border);text-align:center;color:var(--text-secondary);">${escapeHtml(String(g.jumlah_unit || 1))}</td>
                    <td style="padding:9px 10px;border-right:1px solid var(--border);text-align:right;color:var(--text-secondary);white-space:nowrap;">${g.harga_satuan > 0 ? escapeHtml(formatJurnalWorkbookCurrency(g.harga_satuan)) : '-'}</td>
                    <td style="padding:9px 10px;border-right:1px solid var(--border);text-align:right;color:var(--text-primary);font-weight:600;white-space:nowrap;">${escapeHtml(formatJurnalWorkbookCurrency(g.harga_perolehan || 0))}</td>
                    <td style="padding:9px 10px;border-right:1px solid var(--border);text-align:right;color:var(--text-secondary);white-space:nowrap;">${g.nilai_residu > 0 ? escapeHtml(formatJurnalWorkbookCurrency(g.nilai_residu)) : '-'}</td>
                    <td style="padding:9px 10px;border-right:1px solid var(--border);white-space:nowrap;color:var(--text-secondary);">${escapeHtml(formatJurnalWorkbookDate(g.tanggal_digunakan))}</td>
                    <td style="padding:9px 10px;border-right:1px solid var(--border);white-space:nowrap;color:var(--text-secondary);">${escapeHtml(g.kategori_aset || '-')}</td>
                    <td style="padding:9px 10px;border-right:1px solid var(--border);text-align:center;color:var(--text-secondary);">${g.umur_ekonomis > 0 ? escapeHtml(String(g.umur_ekonomis)) : '-'}</td>
                    <td style="padding:9px 10px;border-right:1px solid var(--border);text-align:center;color:var(--text-secondary);">${g.umur_ekonomis_bulan > 0 ? escapeHtml(String(g.umur_ekonomis_bulan)) : '-'}</td>
                    <td style="padding:9px 10px;border-right:1px solid var(--border);text-align:right;color:var(--text-secondary);white-space:nowrap;">${g.beban_per_bulan > 0 ? escapeHtml(formatJurnalWorkbookCurrency(g.beban_per_bulan)) : '-'}</td>
                    <td style="padding:9px 10px;border-right:1px solid var(--border);text-align:right;color:var(--text-secondary);white-space:nowrap;">${g.beban_periode_berjalan > 0 ? escapeHtml(formatJurnalWorkbookCurrency(g.beban_periode_berjalan)) : '-'}</td>
                    <td style="padding:9px 10px;border-right:1px solid var(--border);text-align:right;color:var(--text-primary);font-weight:600;white-space:nowrap;">${escapeHtml(formatJurnalWorkbookCurrency(g.akumulasi_penyusutan || 0))}</td>
                    <td style="padding:9px 10px;border-right:1px solid var(--border);text-align:right;color:var(--text-primary);font-weight:700;white-space:nowrap;background:#f8fafc;">${escapeHtml(formatJurnalWorkbookCurrency(g.nilai_buku || 0))}</td>
                    <td style="padding:9px 10px;border-right:1px solid var(--border);white-space:nowrap;">
                        <span style="padding:2px 8px;border-radius:4px;font-size:0.8rem;font-weight:600;background:${(g.status||'').toLowerCase()==='aktif'?'#dcfce7':'#fee2e2'};color:${(g.status||'').toLowerCase()==='aktif'?'#166534':'#991b1b'};">${escapeHtml(g.status || '-')}</span>
                    </td>
                    <td style="padding:9px 10px;border-right:1px solid var(--border);white-space:nowrap;color:var(--text-secondary);">${escapeHtml(g.tanggal_tidak_aktif !== '-' ? formatJurnalWorkbookDate(g.tanggal_tidak_aktif) : '-')}</td>
                    <td style="padding:9px 10px;border-right:1px solid var(--border);white-space:nowrap;color:var(--text-secondary);font-size:0.82rem;">${escapeHtml(g.link_akun_aset || '-')}</td>
                    <td style="padding:9px 10px;border-right:1px solid var(--border);white-space:nowrap;color:var(--text-secondary);font-size:0.82rem;">${escapeHtml(g.link_akun_akumulasi || '-')}</td>
                    <td style="padding:9px 10px;white-space:nowrap;color:var(--text-secondary);font-size:0.82rem;">${escapeHtml(g.link_akun_beban || '-')}</td>
                </tr>`).join('');

            return `
                <div style="margin-bottom:28px; overflow-x:auto; border:1px solid var(--border); border-radius:var(--radius-md);">
                    <table style="width:100%; border-collapse:collapse; text-align:left; min-width:2400px;">
                        <thead>
                            <tr>
                                <th style="background:#dcedc8;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-transform:uppercase;font-size:0.9rem;white-space:nowrap;">KARTU ASET TETAP (INVENTARIS)</th>
                                <th colspan="20" style="background:#dcedc8;padding:12px 16px;border:1px solid var(--border);"></th>
                            </tr>
                            <tr>
                                <th style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;font-size:0.85rem;white-space:nowrap;">Unit Usaha</th>
                                <th colspan="20" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:600;color:var(--text-primary);">${escapeHtml(unitName)}</th>
                            </tr>
                            <tr style="background:#f5f5f5;border-bottom:2px solid var(--border);">
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);white-space:nowrap;">Kode Aset</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);white-space:nowrap;">Nama Aset</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);white-space:nowrap;">Merk</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);white-space:nowrap;">Tgl Pembelian</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);text-align:center;white-space:nowrap;">Jml Unit</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);text-align:right;white-space:nowrap;">Harga Satuan</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);text-align:right;white-space:nowrap;">Harga Perolehan</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);text-align:right;white-space:nowrap;">Nilai Residu</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);white-space:nowrap;">Tgl Digunakan</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);white-space:nowrap;">Kategori</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);text-align:center;white-space:nowrap;">UE (thn)</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);text-align:center;white-space:nowrap;">UE (bln)</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);text-align:right;white-space:nowrap;">Beban/Bulan</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);text-align:right;white-space:nowrap;">Beban Periode</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);text-align:right;white-space:nowrap;">Akum. Penyusutan</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);text-align:right;white-space:nowrap;">Nilai Buku</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);white-space:nowrap;">Status</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);white-space:nowrap;">Tgl Tdk Aktif</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);white-space:nowrap;">Link Akun Aset</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);white-space:nowrap;">Link Akun Akumulasi</th>
                                <th style="padding:9px 10px;font-weight:700;white-space:nowrap;">Link Akun Beban</th>
                            </tr>
                        </thead>
                        <tbody>${bodyRows}</tbody>
                    </table>
                </div>`;
        }).join('');

        container.innerHTML = blocks;
    }

    function loadKartuAsetTetap(options = {}) {
        const container = options.container || document.getElementById(options.containerId || 'transaksi-subledger-table-container');
        if (!container) return;

        container.innerHTML = `<div style="text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Menyusun kartu aset tetap...</div>`;
        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        const params = new URLSearchParams({
            session_slug: sessionSlug,
            t: String(new Date().getTime())
        });
        const unitUsahaId = options.usePageUnitFilter ? getActiveWorkbookUnitUsahaId(['transaksi-subledger-unit-filter']) : '';
        if (unitUsahaId) params.set('unit_usaha_id', unitUsahaId);
        if (options.asetSlug) params.set('aset_slug', options.asetSlug);

        fetch('/api/kartu-aset-tetap?' + params.toString())
            .then((res) => {
                if (!res.ok) throw new Error('Gagal memuat kartu aset tetap');
                return res.json();
            })
            .then((data) => {
                renderKartuAsetTetapTable(data || [], {
                    container,
                    emptyMessage: options.emptyMessage
                });
            })
            .catch((err) => {
                console.error(err);
                container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-exclamation-circle fa-3x" style="margin-bottom:16px;"></i><p>Gagal memuat data kartu aset tetap.</p></div>`;
            });
    }

    function loadKartuAsetTetapView() {
        loadWorkbookUnitFilterOptions('transaksi-subledger-unit-filter');
        loadKartuAsetTetap({
            containerId: 'transaksi-subledger-table-container',
            usePageUnitFilter: true,
            emptyMessage: 'Belum ada aset tetap dengan kartu aset tetap diaktifkan.'
        });
    }

    function renderJurnalTable(groups, options = {}) {
        const container = options.container || document.getElementById(options.containerId || 'jurnal-table-container');
        if (!container) return;

        const emptyMessage = options.emptyMessage || 'Belum ada jurnal tervalidasi.';
        if (!groups || groups.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-receipt fa-3x" style="margin-bottom:16px;"></i><p>${escapeHtml(emptyMessage)}</p></div>`;
            return;
        }

        let allRows = [];
        groups.forEach(g => {
            if (g.rows && Array.isArray(g.rows)) {
                allRows = allRows.concat(g.rows);
            }
        });

        if (allRows.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-receipt fa-3x" style="margin-bottom:16px;"></i><p>${escapeHtml(emptyMessage)}</p></div>`;
            return;
        }

        const groupByUnit = {};
        allRows.forEach(r => {
            const unit = r.unit_usaha || '-';
            if (!groupByUnit[unit]) groupByUnit[unit] = [];
            groupByUnit[unit].push(r);
        });

        const blocks = Object.entries(groupByUnit).map(([unitName, rows]) => {
            const bodyRows = rows.map(r => `
                <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:8px 10px;border-right:1px solid var(--border);white-space:nowrap;color:var(--text-secondary);font-size:0.9rem;">${escapeHtml(r.tanggal || '-')}</td>
                    <td style="padding:8px 10px;border-right:1px solid var(--border);color:var(--text-primary);min-width:100px;font-size:0.9rem;">${escapeHtml(r.unit_usaha || '-')}</td>
                    <td style="padding:8px 10px;border-right:1px solid var(--border);color:var(--text-primary);min-width:180px;font-size:0.9rem;">${escapeHtml(r.deskripsi_tx || '-')}</td>
                    <td style="padding:8px 10px;border-right:1px solid var(--border);color:var(--text-secondary);min-width:150px;font-size:0.9rem;">${escapeHtml(r.keterangan || '-')}</td>
                    <td style="padding:8px 10px;border-right:1px solid var(--border);color:var(--text-primary);font-weight:500;font-size:0.9rem;">${escapeHtml(r.akun_debit || '-')}</td>
                    <td style="padding:8px 10px;border-right:1px solid var(--border);text-align:right;color:var(--text-primary);font-weight:600;font-size:0.9rem;white-space:nowrap;">${escapeHtml(r.nominal_debit > 0 ? formatJurnalWorkbookCurrency(r.nominal_debit) : '-')}</td>
                    <td style="padding:8px 10px;border-right:1px solid var(--border);color:var(--text-primary);font-weight:500;font-size:0.9rem;">${escapeHtml(r.akun_kredit || '-')}</td>
                    <td style="padding:8px 10px;border-right:1px solid var(--border);text-align:right;color:var(--text-primary);font-weight:600;font-size:0.9rem;white-space:nowrap;">${escapeHtml(r.nominal_kredit > 0 ? formatJurnalWorkbookCurrency(r.nominal_kredit) : '-')}</td>
                    <td style="padding:8px 10px;border-right:1px solid var(--border);text-align:center;color:var(--text-secondary);font-size:0.85rem;white-space:nowrap;">
                        <span style="padding:2px 6px;border-radius:3px;font-size:0.8rem;font-weight:600;background:${r.sumber_mapping === 'Non Rutin' ? '#fef3c7' : '#dcfce7'};color:${r.sumber_mapping === 'Non Rutin' ? '#92400e' : '#166534'};">${escapeHtml(r.sumber_mapping || 'Rutin')}</span>
                    </td>
                    <td style="padding:8px 10px;text-align:center;color:var(--text-secondary);font-size:0.9rem;">
                        ${r.aset_tetap ? '<i class="fa-solid fa-check" style="color:#22c55e;"></i>' : '<span style="color:#d1d5db;font-size:0.85rem;">-</span>'}
                    </td>
                </tr>`).join('');

            return `
                <div style="margin-bottom:28px; overflow-x:auto; border:1px solid var(--border); border-radius:var(--radius-md);">
                    <table style="width:100%; border-collapse:collapse; text-align:left; min-width:1200px;">
                        <thead>
                            <tr>
                                <th style="background:#fef3c7;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-transform:uppercase;font-size:0.9rem;white-space:nowrap;">JURNAL</th>
                                <th colspan="9" style="background:#fef3c7;padding:12px 16px;border:1px solid var(--border);"></th>
                            </tr>
                            <tr>
                                <th style="background:#fffbeb;padding:12px 16px;border:1px solid var(--border);font-weight:700;font-size:0.85rem;white-space:nowrap;">Unit Usaha</th>
                                <th colspan="9" style="background:#fffbeb;padding:12px 16px;border:1px solid var(--border);font-weight:600;color:var(--text-primary);">${escapeHtml(unitName)}</th>
                            </tr>
                            <tr style="background:#f5f5f5;border-bottom:2px solid var(--border);">
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);white-space:nowrap;font-size:0.9rem;">Tanggal</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);white-space:nowrap;font-size:0.9rem;">Unit Usaha</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);white-space:nowrap;font-size:0.9rem;">Deskripsi Transaksi</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);white-space:nowrap;font-size:0.9rem;">Keterangan</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);white-space:nowrap;font-size:0.9rem;">Akun Debit</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);text-align:right;white-space:nowrap;font-size:0.9rem;">Nominal Debit</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);white-space:nowrap;font-size:0.9rem;">Akun Kredit</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);text-align:right;white-space:nowrap;font-size:0.9rem;">Nominal Kredit</th>
                                <th style="padding:9px 10px;font-weight:700;border-right:1px solid var(--border);text-align:center;white-space:nowrap;font-size:0.9rem;">Sumber</th>
                                <th style="padding:9px 10px;font-weight:700;white-space:nowrap;font-size:0.9rem;">Aset</th>
                            </tr>
                        </thead>
                        <tbody>${bodyRows}</tbody>
                    </table>
                </div>`;
        }).join('');

        container.innerHTML = blocks;
    }

    function loadJurnal(options = {}) {
        const container = options.container || document.getElementById(options.containerId || 'jurnal-table-container');
        if (!container) return;

        container.innerHTML = `<div style="text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Menyusun jurnal...</div>`;
        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        const params = new URLSearchParams({
            session_slug: sessionSlug,
            t: String(new Date().getTime())
        });
        const unitUsahaId = options.usePageUnitFilter ? getActiveWorkbookUnitUsahaId(['jurnal-unit-filter']) : '';
        if (unitUsahaId) params.set('unit_usaha_id', unitUsahaId);

        fetch('/api/jurnal?' + params.toString())
            .then((res) => {
                if (!res.ok) throw new Error('Gagal memuat jurnal');
                return res.json();
            })
            .then((data) => {
                renderJurnalTable(data || [], {
                    container,
                    emptyMessage: options.emptyMessage
                });
            })
            .catch((err) => {
                console.error(err);
                container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-exclamation-circle fa-3x" style="margin-bottom:16px;"></i><p>Gagal memuat data jurnal.</p></div>`;
            });
    }

    function loadJurnalView() {
        loadWorkbookUnitFilterOptions('jurnal-unit-filter');
        const refreshBtn = document.getElementById('btn-refresh-jurnal');
        if (refreshBtn) {
            refreshBtn.onclick = () => {
                loadJurnal({
                    containerId: 'jurnal-table-container',
                    usePageUnitFilter: true
                });
            };
        }
        loadJurnal({
            containerId: 'jurnal-table-container',
            usePageUnitFilter: true,
            emptyMessage: 'Belum ada transaksi tervalidasi.'
        });
    }

    function loadKartuPersediaan(options = {}) {
        const container = options.container || document.getElementById(options.containerId || 'kartu-persediaan-table-container');
        if (!container) return Promise.resolve();

        const keepExistingContent = !!options.keepExistingContent;
        if (!keepExistingContent || !container.children || container.children.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Menyusun kartu persediaan...</div>`;
        }
        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        const params = new URLSearchParams({
            session_slug: sessionSlug,
            t: String(new Date().getTime())
        });
        const unitUsahaId = options.usePageUnitFilter ? getActiveWorkbookUnitUsahaId(['kartu-persediaan-unit-filter']) : '';
        if (unitUsahaId) {
            params.set('unit_usaha_id', unitUsahaId);
        }
        if (options.barangSlug) {
            params.set('barang_slug', options.barangSlug);
        }

        return fetch('/api/kartu-persediaan?' + params.toString())
            .then(res => {
                if (!res.ok) throw new Error('Gagal memuat kartu persediaan');
                return res.json();
            })
            .then(data => {
                renderKartuPersediaanTable(data || [], {
                    container,
                    emptyMessage: options.emptyMessage
                });
            })
            .catch(err => {
                console.error(err);
                container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-exclamation-circle fa-3x" style="margin-bottom:16px;"></i><p>Gagal memuat data kartu persediaan.</p></div>`;
            });
    }

    function loadKartuPersediaanView() {
        loadWorkbookUnitFilterOptions('kartu-persediaan-unit-filter');
        loadKartuPersediaan({
            containerId: 'kartu-persediaan-table-container',
            usePageUnitFilter: true,
            emptyMessage: 'Belum ada mutasi untuk barang yang mengaktifkan kartu persediaan.'
        });
    }

    const kartuPersediaanManualState = {
        mode: 'create',
        id: 0,
        unitUsahaID: 0,
        barangSlug: '',
        deskripsi: ''
    };

    function getKartuPersediaanManualModalRefs() {
        return {
            modal: document.getElementById('kartu-persediaan-manual-modal'),
            form: document.getElementById('kartu-persediaan-manual-form'),
            title: document.getElementById('kartu-persediaan-manual-title'),
            subtitle: document.getElementById('kartu-persediaan-manual-subtitle'),
            error: document.getElementById('kartu-persediaan-manual-error'),
            inputDeskripsi: document.getElementById('kartu-persediaan-manual-deskripsi'),
            inputTanggal: document.getElementById('kartu-persediaan-manual-tanggal'),
            inputJenis: document.getElementById('kartu-persediaan-manual-jenis'),
            inputQty: document.getElementById('kartu-persediaan-manual-qty'),
            inputHarga: document.getElementById('kartu-persediaan-manual-harga'),
            inputKeterangan: document.getElementById('kartu-persediaan-manual-keterangan'),
            btnSubmit: document.getElementById('kartu-persediaan-manual-submit'),
            btnClose: document.getElementById('kartu-persediaan-manual-close'),
            btnCancel: document.getElementById('kartu-persediaan-manual-cancel')
        };
    }

    function setKartuPersediaanManualError(message) {
        const refs = getKartuPersediaanManualModalRefs();
        if (!refs.error) return;
        if (!message) {
            refs.error.style.display = 'none';
            refs.error.textContent = '';
            return;
        }
        refs.error.style.display = 'block';
        refs.error.textContent = message;
    }

    function hideKartuPersediaanManualModal() {
        const refs = getKartuPersediaanManualModalRefs();
        if (!refs.modal || !refs.form) return;
        refs.modal.style.display = 'none';
        document.body.style.overflow = '';
        refs.form.reset();
        setKartuPersediaanManualError('');
        kartuPersediaanManualState.mode = 'create';
        kartuPersediaanManualState.id = 0;
        kartuPersediaanManualState.unitUsahaID = 0;
        kartuPersediaanManualState.barangSlug = '';
        kartuPersediaanManualState.deskripsi = '';
    }

    async function loadKartuPersediaanManualDeskripsiOptions(selectedValue = '') {
        const refs = getKartuPersediaanManualModalRefs();
        if (!refs.inputDeskripsi) return;

        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        const selected = String(selectedValue || '').trim();

        refs.inputDeskripsi.disabled = true;
        refs.inputDeskripsi.innerHTML = '<option value="">Memuat deskripsi...</option>';

        try {
            const response = await fetch('/api/mapping-transaksis?session_slug=' + encodeURIComponent(sessionSlug) + '&jenis_mapping=jurnal&t=' + new Date().getTime());
            if (!response.ok) {
                throw new Error(await readApiErrorMessage(response, 'Gagal memuat deskripsi dari mapping jurnal penyesuaian.'));
            }

            const data = await response.json();
            const uniqueOptions = [];
            (Array.isArray(data) ? data : []).forEach((item) => {
                const value = String(item && item.nama_mapping ? item.nama_mapping : '').trim();
                if (!value || uniqueOptions.some((option) => option.value === value)) return;

                const unitName = item && item.unit_usaha && item.unit_usaha.NamaUnitUsaha
                    ? String(item.unit_usaha.NamaUnitUsaha).trim()
                    : '';
                uniqueOptions.push({
                    value,
                    label: unitName ? `${unitName} - ${value}` : value,
                });
            });

            if (selected && !uniqueOptions.some((option) => option.value === selected)) {
                uniqueOptions.unshift({ value: selected, label: `${selected} (tersimpan)` });
            }

            refs.inputDeskripsi.innerHTML = [
                '<option value="">-- Pilih deskripsi dari mapping jurnal penyesuaian --</option>',
                ...uniqueOptions.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
            ].join('');
            refs.inputDeskripsi.value = selected || (uniqueOptions[0] ? uniqueOptions[0].value : '');
        } catch (error) {
            console.error('Failed to load kartu persediaan manual deskripsi options', error);
            refs.inputDeskripsi.innerHTML = '<option value="">-- Gagal memuat deskripsi --</option>';
            setKartuPersediaanManualError(error && error.message ? error.message : 'Gagal memuat deskripsi dari mapping jurnal penyesuaian.');
        } finally {
            refs.inputDeskripsi.disabled = false;
        }
    }

    function showKartuPersediaanManualModal(config = {}) {
        const refs = getKartuPersediaanManualModalRefs();
        if (!refs.modal || !refs.form) return;

        const mode = config.mode === 'edit' ? 'edit' : 'create';
        const seed = config.seed || {};

        kartuPersediaanManualState.mode = mode;
        kartuPersediaanManualState.id = Number(config.id || 0);
        kartuPersediaanManualState.unitUsahaID = Number(config.unitUsahaID || 0);
        kartuPersediaanManualState.barangSlug = String(config.barangSlug || '');
        kartuPersediaanManualState.deskripsi = String(seed.deskripsi || '').trim();

        if (refs.title) {
            refs.title.innerHTML = mode === 'edit'
                ? '<i class="fa-solid fa-pen-to-square"></i> Edit Manual Kartu Persediaan'
                : '<i class="fa-solid fa-plus"></i> Tambah Manual Kartu Persediaan';
        }
        if (refs.subtitle) {
            refs.subtitle.textContent = mode === 'edit'
                ? 'Perbarui mutasi stok manual yang sudah tersimpan.'
                : 'Tambahkan mutasi stok manual untuk barang terpilih.';
        }
        if (refs.btnSubmit) {
            refs.btnSubmit.innerHTML = mode === 'edit'
                ? '<i class="fa-solid fa-save"></i> Simpan Perubahan'
                : '<i class="fa-solid fa-save"></i> Simpan';
        }

        if (refs.inputDeskripsi) refs.inputDeskripsi.value = '';
        if (refs.inputTanggal) refs.inputTanggal.value = seed.tanggal || formatDateForInput(new Date());
        if (refs.inputJenis) refs.inputJenis.value = (seed.jenis || 'masuk').toLowerCase() === 'keluar' ? 'keluar' : 'masuk';
        if (refs.inputQty) refs.inputQty.value = seed.qty != null ? String(seed.qty) : '1';
        if (refs.inputHarga) refs.inputHarga.value = seed.harga != null ? String(seed.harga) : '0';
        if (refs.inputKeterangan) refs.inputKeterangan.value = seed.keterangan || '';

        setKartuPersediaanManualError('');
        refs.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        if (refs.inputTanggal) refs.inputTanggal.focus();

        loadKartuPersediaanManualDeskripsiOptions(seed.deskripsi || '').then(() => {
            if (refs.inputDeskripsi && (seed.deskripsi || '').trim()) {
                refs.inputDeskripsi.value = String(seed.deskripsi || '').trim();
            }
        });
    }

    function parseKartuPersediaanManualFormPayload() {
        const refs = getKartuPersediaanManualModalRefs();
        const deskripsi = String((refs.inputDeskripsi && refs.inputDeskripsi.value) || '').trim();
        const tanggal = String((refs.inputTanggal && refs.inputTanggal.value) || '').trim();
        const jenis = String((refs.inputJenis && refs.inputJenis.value) || '').trim().toLowerCase();
        const qty = Number(String((refs.inputQty && refs.inputQty.value) || '').trim().replace(',', '.'));
        const harga = Number(String((refs.inputHarga && refs.inputHarga.value) || '').trim().replace(',', '.'));
        const keterangan = String((refs.inputKeterangan && refs.inputKeterangan.value) || '').trim();

        if (!deskripsi) {
            return { error: 'Deskripsi wajib dipilih.' };
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
            return { error: 'Format tanggal tidak valid. Gunakan YYYY-MM-DD.' };
        }
        if (jenis !== 'masuk' && jenis !== 'keluar') {
            return { error: 'Jenis mutasi harus masuk atau keluar.' };
        }
        if (!Number.isFinite(qty) || qty <= 0) {
            return { error: 'Jumlah unit harus lebih besar dari 0.' };
        }
        if (!Number.isFinite(harga) || harga < 0) {
            return { error: 'Harga per unit tidak valid.' };
        }

        return {
            payload: {
                deskripsi,
                tanggal,
                jenis,
                qty,
                harga,
                keterangan
            }
        };
    }

    async function readApiErrorMessage(res, fallbackMessage) {
        const contentType = String(res.headers.get('content-type') || '').toLowerCase();

        try {
            if (contentType.includes('application/json')) {
                const payload = await res.json();
                if (payload && typeof payload.message === 'string' && payload.message.trim() !== '') {
                    return payload.message.trim();
                }
            } else {
                const text = await res.text();
                if (String(text || '').trim() !== '') {
                    return String(text).trim();
                }
            }
        } catch (error) {
            console.warn('Failed to read API error message', error);
        }

        return fallbackMessage;
    }

    function refreshKartuPersediaanAfterManualChange(barangSlug) {
        const contentWrapper = document.querySelector('.content-wrapper');
        const previousWrapperScrollTop = contentWrapper ? contentWrapper.scrollTop : 0;
        const previousScrollY = window.scrollY || 0;

        const mainRefreshPromise = loadKartuPersediaan({
            containerId: 'kartu-persediaan-table-container',
            usePageUnitFilter: true,
            keepExistingContent: true,
            emptyMessage: 'Belum ada mutasi untuk barang yang mengaktifkan kartu persediaan.'
        });

        let modalRefreshPromise = Promise.resolve();
        if (activeBarangKartuPersediaanSlug && activeBarangKartuPersediaanSlug === barangSlug) {
            modalRefreshPromise = loadKartuPersediaan({
                containerId: 'barang-kartu-persediaan-table-container',
                barangSlug,
                keepExistingContent: true,
                emptyMessage: 'Belum ada mutasi persediaan untuk barang ini.'
            });
        }

        Promise.allSettled([mainRefreshPromise, modalRefreshPromise]).finally(() => {
            const restoreScrollPosition = () => {
                if (contentWrapper) {
                    contentWrapper.scrollTop = previousWrapperScrollTop;
                }
                window.scrollTo({ top: previousScrollY, behavior: 'auto' });
            };

            requestAnimationFrame(() => {
                restoreScrollPosition();
                // Restore sekali lagi setelah paint berikutnya untuk mengatasi lompatan karena reflow tabel.
                setTimeout(restoreScrollPosition, 0);
            });
        });
    }

    window.addKartuPersediaanManual = function(barangSlug, unitUsahaID) {
        if (!barangSlug || !unitUsahaID) return;

        showKartuPersediaanManualModal({
            mode: 'create',
            unitUsahaID: Number(unitUsahaID),
            barangSlug: String(barangSlug)
        });
    };

    window.editKartuPersediaanManual = function(id, unitUsahaID, barangSlug) {
        if (!id || !unitUsahaID || !barangSlug) return;

        const query = new URLSearchParams({
            session_slug: localStorage.getItem('sibumdes_auth') || '',
            unit_usaha_id: String(unitUsahaID),
            barang_slug: String(barangSlug)
        });

        fetch('/api/kartu-persediaan/manual?' + query.toString())
            .then(async (res) => {
                if (!res.ok) throw new Error(await readApiErrorMessage(res, 'Gagal memuat data manual kartu persediaan.'));
                return res.json();
            })
            .then((rows) => {
                const selected = (Array.isArray(rows) ? rows : []).find((row) => Number(row.id) === Number(id));
                if (!selected) {
                    showToast('Data manual tidak ditemukan.', true);
                    return;
                }

                showKartuPersediaanManualModal({
                    mode: 'edit',
                    id: Number(id),
                    unitUsahaID: Number(unitUsahaID),
                    barangSlug: String(barangSlug),
                    seed: {
                    deskripsi: selected.deskripsi || '',
                    tanggal: String(selected.tanggal || '').slice(0, 10),
                    jenis: selected.jenis || 'masuk',
                    qty: selected.qty,
                    harga: selected.harga,
                    keterangan: selected.keterangan || ''
                    }
                });
            })
            .catch((err) => {
                console.error(err);
                showToast('Gagal memuat data manual kartu persediaan.', true);
            });
    };

    window.deleteKartuPersediaanManual = function(id) {
        if (!id) return;

        window.showConfirmModal('Hapus data manual kartu persediaan ini?', () => {
            fetch('/api/kartu-persediaan/manual?id=' + encodeURIComponent(String(id)), {
                method: 'DELETE'
            })
                .then(async (res) => {
                    if (!res.ok) throw new Error(await readApiErrorMessage(res, 'Gagal menghapus data manual kartu persediaan.'));
                    refreshKartuPersediaanAfterManualChange(activeBarangKartuPersediaanSlug || '');
                    showToast('Data manual kartu persediaan berhasil dihapus.');
                })
                .catch((err) => {
                    console.error(err);
                    showToast('Gagal menghapus data manual kartu persediaan.', true);
                });
        });
    };

    const kartuPersediaanManualModal = document.getElementById('kartu-persediaan-manual-modal');
    const kartuPersediaanManualForm = document.getElementById('kartu-persediaan-manual-form');
    const kartuPersediaanManualClose = document.getElementById('kartu-persediaan-manual-close');
    const kartuPersediaanManualCancel = document.getElementById('kartu-persediaan-manual-cancel');

    if (kartuPersediaanManualClose) {
        kartuPersediaanManualClose.addEventListener('click', hideKartuPersediaanManualModal);
    }
    if (kartuPersediaanManualCancel) {
        kartuPersediaanManualCancel.addEventListener('click', hideKartuPersediaanManualModal);
    }
    if (kartuPersediaanManualModal) {
        kartuPersediaanManualModal.addEventListener('click', (event) => {
            if (event.target === kartuPersediaanManualModal) {
                hideKartuPersediaanManualModal();
            }
        });
    }

    if (kartuPersediaanManualForm) {
        kartuPersediaanManualForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (!kartuPersediaanManualState.barangSlug || !kartuPersediaanManualState.unitUsahaID) {
                setKartuPersediaanManualError('Data barang atau unit usaha tidak valid. Silakan tutup modal lalu coba lagi.');
                return;
            }

            const parsed = parseKartuPersediaanManualFormPayload();
            if (parsed.error) {
                setKartuPersediaanManualError(parsed.error);
                return;
            }

            const refs = getKartuPersediaanManualModalRefs();
            if (refs.btnSubmit) refs.btnSubmit.disabled = true;
            setKartuPersediaanManualError('');

            try {
                const payload = {
                    session_slug: localStorage.getItem('sibumdes_auth') || '',
                    unit_usaha_id: Number(kartuPersediaanManualState.unitUsahaID),
                    barang_slug: String(kartuPersediaanManualState.barangSlug),
                    ...parsed.payload
                };

                if (kartuPersediaanManualState.mode === 'edit' && Number(kartuPersediaanManualState.id) > 0) {
                    payload.id = Number(kartuPersediaanManualState.id);
                }

                const res = await fetch('/api/kartu-persediaan/manual', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    throw new Error(await readApiErrorMessage(res, 'Gagal menyimpan data manual kartu persediaan.'));
                }

                const changedBarangSlug = String(kartuPersediaanManualState.barangSlug);
                const isEditMode = kartuPersediaanManualState.mode === 'edit';
                hideKartuPersediaanManualModal();
                refreshKartuPersediaanAfterManualChange(changedBarangSlug);
                showToast(isEditMode ? 'Data manual kartu persediaan berhasil diperbarui.' : 'Data manual kartu persediaan berhasil ditambahkan.');
            } catch (error) {
                console.error(error);
                setKartuPersediaanManualError(error && error.message ? error.message : 'Gagal menyimpan data manual kartu persediaan.');
            } finally {
                const latestRefs = getKartuPersediaanManualModalRefs();
                if (latestRefs.btnSubmit) latestRefs.btnSubmit.disabled = false;
            }
        });
    }

    function hideBarangKartuPersediaan() {
        const modal = document.getElementById('barang-kartu-persediaan-modal');
        const subtitle = document.getElementById('barang-kartu-persediaan-subtitle');
        const container = document.getElementById('barang-kartu-persediaan-table-container');
        activeBarangKartuPersediaanSlug = null;
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = '';
        if (subtitle) subtitle.textContent = 'Mutasi persediaan untuk barang terpilih akan ditampilkan di sini.';
        if (container) {
            container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-secondary);"><i class="fa-solid fa-box-open fa-3x" style="margin-bottom:16px;"></i><p>Pilih checklist kartu persediaan pada tabel barang untuk melihat detailnya.</p></div>`;
        }
        updateBarangKartuPersediaanButtonState();
    }

    window.hideBarangKartuPersediaan = hideBarangKartuPersediaan;

    const barangKartuPersediaanCloseBtn = document.getElementById('barang-kartu-persediaan-close');
    if (barangKartuPersediaanCloseBtn) {
        barangKartuPersediaanCloseBtn.addEventListener('click', hideBarangKartuPersediaan);
    }

    const barangKartuPersediaanModal = document.getElementById('barang-kartu-persediaan-modal');
    if (barangKartuPersediaanModal) {
        barangKartuPersediaanModal.addEventListener('click', (event) => {
            if (event.target === barangKartuPersediaanModal) {
                hideBarangKartuPersediaan();
            }
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && kartuPersediaanManualModal && kartuPersediaanManualModal.style.display === 'flex') {
            hideKartuPersediaanManualModal();
            return;
        }
        if (event.key === 'Escape' && barangKartuPersediaanModal && barangKartuPersediaanModal.style.display === 'flex') {
            hideBarangKartuPersediaan();
        }
    });

    window.showBarangKartuPersediaan = function(slug, namaBarang) {
        const modal = document.getElementById('barang-kartu-persediaan-modal');
        const subtitle = document.getElementById('barang-kartu-persediaan-subtitle');
        if (!modal) return;

        activeBarangKartuPersediaanSlug = slug;
        updateBarangKartuPersediaanButtonState();
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        if (subtitle) {
            subtitle.textContent = `Kartu persediaan untuk ${namaBarang || 'barang terpilih'} ditampilkan berdasarkan transaksi yang sudah diinput dan saldo awal master barang.`;
        }

        loadKartuPersediaan({
            containerId: 'barang-kartu-persediaan-table-container',
            barangSlug: slug,
            emptyMessage: `Belum ada mutasi persediaan untuk ${namaBarang || 'barang ini'}.`
        });
    };

    function hidePelangganBukuPembantuPiutang() {
        const modal = document.getElementById('pelanggan-bp-piutang-modal');
        const subtitle = document.getElementById('pelanggan-bp-piutang-subtitle');
        const container = document.getElementById('pelanggan-bp-piutang-table-container');
        activePelangganBpPiutangSlug = null;
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = '';
        if (subtitle) subtitle.textContent = 'Mutasi piutang pelanggan terpilih akan ditampilkan di sini.';
        if (container) {
            container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-secondary);"><i class="fa-solid fa-book-open-reader fa-3x" style="margin-bottom:16px;"></i><p>Pilih checklist buku pembantu piutang pada tabel pelanggan untuk melihat detailnya.</p></div>`;
        }
        updatePelangganBpPiutangButtonState();
    }

    window.hidePelangganBukuPembantuPiutang = hidePelangganBukuPembantuPiutang;

    const pelangganBpPiutangCloseBtn = document.getElementById('pelanggan-bp-piutang-close');
    if (pelangganBpPiutangCloseBtn) {
        pelangganBpPiutangCloseBtn.addEventListener('click', hidePelangganBukuPembantuPiutang);
    }

    const pelangganBpPiutangModal = document.getElementById('pelanggan-bp-piutang-modal');
    if (pelangganBpPiutangModal) {
        pelangganBpPiutangModal.addEventListener('click', (event) => {
            if (event.target === pelangganBpPiutangModal) {
                hidePelangganBukuPembantuPiutang();
            }
        });
    }

    window.showPelangganBukuPembantuPiutang = function(slug, namaPelanggan) {
        const modal = document.getElementById('pelanggan-bp-piutang-modal');
        const subtitle = document.getElementById('pelanggan-bp-piutang-subtitle');
        if (!modal) return;

        activePelangganBpPiutangSlug = slug;
        updatePelangganBpPiutangButtonState();
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        if (subtitle) {
            subtitle.textContent = `Buku pembantu piutang untuk ${namaPelanggan || 'pelanggan terpilih'} ditampilkan berdasarkan transaksi yang terhubung link BP Piutang pada mapping transaksi dan saldo awal master pelanggan.`;
        }

        loadBukuPembantuPiutang({
            containerId: 'pelanggan-bp-piutang-table-container',
            pelangganSlug: slug,
            emptyMessage: `Belum ada mutasi piutang untuk ${namaPelanggan || 'pelanggan ini'}.`
        });
    };

    function hideSupplierBukuPembantuUtang() {
        const modal = document.getElementById('supplier-bp-utang-modal');
        const subtitle = document.getElementById('supplier-bp-utang-subtitle');
        const container = document.getElementById('supplier-bp-utang-table-container');
        activeSupplierBpUtangSlug = null;
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = '';
        if (subtitle) subtitle.textContent = 'Mutasi utang supplier terpilih akan ditampilkan di sini.';
        if (container) {
            container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-secondary);"><i class="fa-solid fa-book-open-reader fa-3x" style="margin-bottom:16px;"></i><p>Pilih checklist buku pembantu utang pada tabel supplier untuk melihat detailnya.</p></div>`;
        }
        updateSupplierBpUtangButtonState();
    }

    window.hideSupplierBukuPembantuUtang = hideSupplierBukuPembantuUtang;

    const supplierBpUtangCloseBtn = document.getElementById('supplier-bp-utang-close');
    if (supplierBpUtangCloseBtn) {
        supplierBpUtangCloseBtn.addEventListener('click', hideSupplierBukuPembantuUtang);
    }

    const supplierBpUtangModal = document.getElementById('supplier-bp-utang-modal');
    if (supplierBpUtangModal) {
        supplierBpUtangModal.addEventListener('click', (event) => {
            if (event.target === supplierBpUtangModal) {
                hideSupplierBukuPembantuUtang();
            }
        });
    }

    window.showSupplierBukuPembantuUtang = function(slug, namaSupplier) {
        const modal = document.getElementById('supplier-bp-utang-modal');
        const subtitle = document.getElementById('supplier-bp-utang-subtitle');
        if (!modal) return;

        activeSupplierBpUtangSlug = slug;
        updateSupplierBpUtangButtonState();
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        if (subtitle) {
            subtitle.textContent = `Buku pembantu utang untuk ${namaSupplier || 'supplier terpilih'} ditampilkan berdasarkan transaksi yang terhubung link BP Utang pada mapping transaksi dan saldo awal master supplier.`;
        }

        loadBukuPembantuUtang({
            containerId: 'supplier-bp-utang-table-container',
            supplierSlug: slug,
            emptyMessage: `Belum ada mutasi utang untuk ${namaSupplier || 'supplier ini'}.`
        });
    };

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && pelangganBpPiutangModal && pelangganBpPiutangModal.style.display === 'flex') {
            hidePelangganBukuPembantuPiutang();
        }
        if (event.key === 'Escape' && supplierBpUtangModal && supplierBpUtangModal.style.display === 'flex') {
            hideSupplierBukuPembantuUtang();
        }
    });

    function syncJurnalUnitFilterOptions(rows) {
        const filterSelect = document.getElementById('jurnal-unit-filter');
        if (!filterSelect) return;

        const selectedValue = jurnalViewState.selectedUnitId || filterSelect.value || 'all';
        fetch('/api/profiles?t=' + new Date().getTime())
            .then((res) => res.json())
            .then((profiles) => {
                const options = new Map();
                const currentProfileId = localStorage.getItem('sibumdes_profile_id');
                const targetProfile = (profiles || []).find((profile) => String(profile.ID) === String(currentProfileId)) || (profiles || [])[0] || null;

                if (targetProfile && Array.isArray(targetProfile.UnitUsaha)) {
                    targetProfile.UnitUsaha.forEach((unit) => {
                        const unitId = String(unit && unit.ID ? unit.ID : '');
                        const unitName = String(unit && unit.NamaUnitUsaha ? unit.NamaUnitUsaha : '').trim();
                        if (!unitId || !unitName || options.has(unitId)) return;
                        options.set(unitId, unitName);
                    });
                }

                if (!options.size) {
                    (rows || []).forEach((row) => {
                        const unitId = String(row.unit_usaha_id || '');
                        const unitName = String(row.unit_usaha || '').trim();
                        if (!unitId || !unitName || options.has(unitId)) return;
                        options.set(unitId, unitName);
                    });
                }

                filterSelect.innerHTML = '<option value="all">Semua Unit Usaha</option>';
                Array.from(options.entries()).forEach(([unitId, unitName]) => {
                    const option = document.createElement('option');
                    option.value = unitId;
                    option.textContent = unitName;
                    filterSelect.appendChild(option);
                });

                if (selectedValue !== 'all' && options.has(selectedValue)) {
                    filterSelect.value = selectedValue;
                } else {
                    filterSelect.value = 'all';
                    jurnalViewState.selectedUnitId = 'all';
                }
            })
            .catch(() => {
                const options = new Map();
                (rows || []).forEach((row) => {
                    const unitId = String(row.unit_usaha_id || '');
                    const unitName = String(row.unit_usaha || '').trim();
                    if (!unitId || !unitName || options.has(unitId)) return;
                    options.set(unitId, unitName);
                });

                filterSelect.innerHTML = '<option value="all">Semua Unit Usaha</option>';
                Array.from(options.entries()).forEach(([unitId, unitName]) => {
                    const option = document.createElement('option');
                    option.value = unitId;
                    option.textContent = unitName;
                    filterSelect.appendChild(option);
                });

                if (selectedValue !== 'all' && options.has(selectedValue)) {
                    filterSelect.value = selectedValue;
                } else {
                    filterSelect.value = 'all';
                    jurnalViewState.selectedUnitId = 'all';
                }
            });
    }

    function getFilteredJurnalRows() {
        const nonPenyesuaianRows = (jurnalViewState.rows || []).filter((row) => !isJurnalPenyesuaianRow(row));
        const selectedUnitId = jurnalViewState.selectedUnitId || 'all';
        if (selectedUnitId === 'all') {
            return nonPenyesuaianRows;
        }
        return nonPenyesuaianRows.filter((row) => String(row.unit_usaha_id || '') === selectedUnitId);
    }

    function renderJurnalWorkbookTable(rows) {
        const container = document.getElementById('jurnal-table-container');
        if(!container) return;

        if(!rows || rows.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-book fa-3x" style="margin-bottom:16px;"></i><p>Belum ada data jurnal validasi.</p></div>`;
            return;
        }

        const profileName = rows[0] && rows[0].profile_bumdes_name ? rows[0].profile_bumdes_name : '-';
        const selectedUnitLabel = (() => {
            if ((jurnalViewState.selectedUnitId || 'all') === 'all') return 'Semua Unit Usaha';
            const first = rows[0];
            return first && first.unit_usaha ? first.unit_usaha : '-';
        })();

        let tableHTML = `
            <div style="overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-md);">
                <table class="data-table" style="width:100%;border-collapse:collapse;text-align:left;min-width:1900px;">
                    <thead>
                        <tr>
                            <th style="background:#dcedc8;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-transform:uppercase;white-space:nowrap;">Jurnal</th>
                            <th colspan="13" style="background:#dcedc8;padding:12px 16px;border:1px solid var(--border);"></th>
                        </tr>
                        <tr>
                            <th style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-transform:uppercase;white-space:nowrap;">BUMDes</th>
                            <th colspan="13" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:600;color:var(--text-primary);">${escapeHtml(profileName)}</th>
                        </tr>
                        <tr>
                            <th style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-transform:uppercase;white-space:nowrap;">Unit Usaha</th>
                            <th colspan="13" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:600;color:var(--text-primary);">${escapeHtml(selectedUnitLabel)}</th>
                        </tr>
                        <tr style="background:#f5f5f5;border-bottom:2px solid var(--border);">
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);white-space:nowrap;">Tanggal</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);white-space:nowrap;">Unit Usaha</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);min-width:240px;">Deskripsi Transaksi</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);min-width:220px;">Keterangan</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);min-width:220px;">Akun Debit</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:right;white-space:nowrap;">Nominal</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);min-width:220px;">Akun Kredit</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:right;white-space:nowrap;">Nominal</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);white-space:nowrap;">Sumber Mapping</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);white-space:nowrap;">Aset Tetap</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);white-space:nowrap;">Persediaan</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);white-space:nowrap;">Bk Utang</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);white-space:nowrap;">Bk Piutang</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);white-space:nowrap;">Jurnal Penyesuaian</th>
                        </tr>
                    </thead>
                    <tbody>`;

        rows.forEach((row) => {
            tableHTML += `
                <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:12px;color:var(--text-secondary);white-space:nowrap;">${escapeHtml(formatJurnalWorkbookDate(row.tanggal))}</td>
                    <td style="padding:12px;white-space:nowrap;color:var(--text-secondary);">${escapeHtml(row.unit_usaha || '-')}</td>
                    <td style="padding:12px;font-weight:500;color:var(--text-primary);">${escapeHtml(row.deskripsi_transaksi || '-')}</td>
                    <td style="padding:12px;color:var(--text-secondary);">${escapeHtml(row.keterangan || '-')}</td>
                    <td style="padding:12px;color:var(--text-secondary);white-space:nowrap;">${escapeHtml(row.akun_debit || '-')}</td>
                    <td style="padding:12px;text-align:right;color:var(--text-primary);font-weight:600;white-space:nowrap;">${escapeHtml(formatJurnalWorkbookCurrency(row.nominal_debit))}</td>
                    <td style="padding:12px;color:var(--text-secondary);white-space:nowrap;">${escapeHtml(row.akun_kredit || '-')}</td>
                    <td style="padding:12px;text-align:right;color:var(--text-primary);font-weight:600;white-space:nowrap;">${escapeHtml(formatJurnalWorkbookCurrency(row.nominal_kredit))}</td>
                    <td style="padding:12px;text-align:center;color:var(--text-secondary);white-space:nowrap;">${escapeHtml(row.sumber_mapping || '-')}</td>
                    <td style="padding:12px;text-align:center;color:var(--text-secondary);">${escapeHtml(getJurnalWorkbookFlag(!!row.link_aset_tetap))}</td>
                    <td style="padding:12px;text-align:center;color:var(--text-secondary);">${escapeHtml(getJurnalWorkbookFlag(!!row.link_persediaan))}</td>
                    <td style="padding:12px;text-align:center;color:var(--text-secondary);">${escapeHtml(getJurnalWorkbookFlag(!!row.link_bk_utang))}</td>
                    <td style="padding:12px;text-align:center;color:var(--text-secondary);">${escapeHtml(getJurnalWorkbookFlag(!!row.link_bk_piutang))}</td>
                    <td style="padding:12px;text-align:center;color:var(--text-secondary);">${escapeHtml(getJurnalWorkbookFlag(!!row.link_jurnal_penyesuaian))}</td>
                </tr>`;
        });

        tableHTML += `</tbody></table></div>`;
        container.innerHTML = tableHTML;
    }

    function loadJurnalView() {
        const container = document.getElementById('jurnal-table-container');
        if(!container) return;

        container.innerHTML = `<div style="text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Menyusun jurnal...</div>`;
        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';

        fetch('/api/jurnal?session_slug=' + sessionSlug + '&t=' + new Date().getTime())
            .then(res => {
                if (!res.ok) throw new Error('Gagal memuat jurnal');
                return res.json();
            })
            .then(data => {
                jurnalViewState.rows = data || [];
                syncJurnalUnitFilterOptions(jurnalViewState.rows);
                renderJurnalWorkbookTable(getFilteredJurnalRows());
            })
            .catch(err => {
                console.error(err);
                container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-exclamation-circle fa-3x" style="margin-bottom:16px;"></i><p>Gagal memuat data jurnal.</p></div>`;
            });
    }

    function renderJurnalPenyesuaianWorkbookTable(rows) {
        const container = document.getElementById('jurnal-penyesuaian-table-container');
        if (!container) return;

        if (!rows || rows.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-book fa-3x" style="margin-bottom:16px;"></i><p>Belum ada data jurnal penyesuaian.</p></div>`;
            return;
        }

        const sortedRows = rows.slice().sort((left, right) => {
            const byUnit = String(left.unit_usaha || '').localeCompare(String(right.unit_usaha || ''), 'id');
            if (byUnit !== 0) return byUnit;
            return String(left.tanggal || '').localeCompare(String(right.tanggal || ''), 'id');
        });

        const rowsByUnit = new Map();
        sortedRows.forEach((row) => {
            const unitName = String(row.unit_usaha || '-').trim() || '-';
            if (!rowsByUnit.has(unitName)) {
                rowsByUnit.set(unitName, []);
            }
            rowsByUnit.get(unitName).push(row);
        });

        const blocks = Array.from(rowsByUnit.entries()).map(([unitName, unitRows], index) => {
            let totalDebit = 0;
            let totalKredit = 0;

            const bodyRows = unitRows.map((row) => {
                const nominalDebit = Number(row.nominal_debit || 0);
                const nominalKredit = Number(row.nominal_kredit || 0);
                totalDebit += nominalDebit;
                totalKredit += nominalKredit;

                return `
                    <tr style="border-bottom:1px solid var(--border);">
                        <td style="padding:10px 12px;white-space:nowrap;color:var(--text-secondary);">${escapeHtml(formatJurnalWorkbookDate(row.tanggal))}</td>
                        <td style="padding:10px 12px;white-space:nowrap;color:var(--text-secondary);">${escapeHtml(row.unit_usaha || '-')}</td>
                        <td style="padding:10px 12px;color:var(--text-primary);font-weight:500;min-width:260px;">${escapeHtml(row.deskripsi_transaksi || '-')}</td>
                        <td style="padding:10px 12px;color:var(--text-secondary);min-width:240px;">${escapeHtml(row.keterangan || '-')}</td>
                        <td style="padding:10px 12px;color:var(--text-secondary);white-space:nowrap;min-width:220px;">${escapeHtml(row.akun_debit || '-')}</td>
                        <td style="padding:10px 12px;text-align:right;color:var(--text-primary);font-weight:600;white-space:nowrap;">${escapeHtml(formatJurnalWorkbookCurrency(nominalDebit))}</td>
                        <td style="padding:10px 12px;color:var(--text-secondary);white-space:nowrap;min-width:220px;">${escapeHtml(row.akun_kredit || '-')}</td>
                        <td style="padding:10px 12px;text-align:right;color:var(--text-primary);font-weight:600;white-space:nowrap;">${escapeHtml(formatJurnalWorkbookCurrency(nominalKredit))}</td>
                        <td style="padding:10px 12px;white-space:nowrap;color:var(--text-secondary);">${escapeHtml(row.sumber_mapping || '-')}</td>
                        <td style="padding:10px 12px;text-align:center;color:var(--text-secondary);">${escapeHtml(getJurnalWorkbookFlag(!!row.link_aset_tetap))}</td>
                        <td style="padding:10px 12px;text-align:center;color:var(--text-secondary);">${escapeHtml(getJurnalWorkbookFlag(!!row.link_persediaan))}</td>
                        <td style="padding:10px 12px;text-align:center;color:var(--text-secondary);">${escapeHtml(getJurnalWorkbookFlag(!!row.link_bk_utang))}</td>
                        <td style="padding:10px 12px;text-align:center;color:var(--text-secondary);">${escapeHtml(getJurnalWorkbookFlag(!!row.link_bk_piutang))}</td>
                        <td style="padding:10px 12px;text-align:center;color:var(--text-secondary);">${escapeHtml(getJurnalWorkbookFlag(!!row.link_jurnal_penyesuaian))}</td>
                    </tr>`;
            }).join('');

            return `
                <div style="margin-bottom:24px; overflow-x:auto; border:1px solid var(--border); border-radius:var(--radius-md);">
                    <table class="data-table" style="width:100%; border-collapse:collapse; text-align:left; min-width:2200px;">
                        <thead>
                            <tr>
                                <th colspan="14" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-transform:uppercase;">UNIT USAHA ${index + 1}</th>
                            </tr>
                            <tr>
                                <th colspan="14" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-transform:uppercase;">${escapeHtml(String(unitName || '-').toUpperCase())}</th>
                            </tr>
                            <tr style="background:#f5f5f5;border-bottom:2px solid var(--border);">
                                <th style="padding:10px 12px;font-weight:700;white-space:nowrap;">Tanggal</th>
                                <th style="padding:10px 12px;font-weight:700;white-space:nowrap;">Unit Usaha</th>
                                <th style="padding:10px 12px;font-weight:700;min-width:260px;">Deskripsi Transaksi</th>
                                <th style="padding:10px 12px;font-weight:700;min-width:240px;">Keterangan</th>
                                <th style="padding:10px 12px;font-weight:700;min-width:220px;">Akun Debit</th>
                                <th style="padding:10px 12px;font-weight:700;text-align:right;white-space:nowrap;">Nominal</th>
                                <th style="padding:10px 12px;font-weight:700;min-width:220px;">Akun Kredit</th>
                                <th style="padding:10px 12px;font-weight:700;text-align:right;white-space:nowrap;">Nominal 2</th>
                                <th style="padding:10px 12px;font-weight:700;white-space:nowrap;">Sumber Mapping</th>
                                <th style="padding:10px 12px;font-weight:700;white-space:nowrap;">Aset Tetap</th>
                                <th style="padding:10px 12px;font-weight:700;white-space:nowrap;">Persediaan</th>
                                <th style="padding:10px 12px;font-weight:700;white-space:nowrap;">Bk Utang</th>
                                <th style="padding:10px 12px;font-weight:700;white-space:nowrap;">Bk Piutang</th>
                                <th style="padding:10px 12px;font-weight:700;white-space:nowrap;">Jurnal Penyesuaian</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bodyRows}
                            <tr style="background:#f8fafc;font-weight:700;">
                                <td colspan="5" style="padding:10px 12px;border-top:2px solid var(--border);text-align:right;color:var(--text-primary);">TOTAL</td>
                                <td style="padding:10px 12px;border-top:2px solid var(--border);text-align:right;color:var(--text-primary);">${escapeHtml(formatJurnalWorkbookCurrency(totalDebit))}</td>
                                <td style="padding:10px 12px;border-top:2px solid var(--border);"></td>
                                <td style="padding:10px 12px;border-top:2px solid var(--border);text-align:right;color:var(--text-primary);">${escapeHtml(formatJurnalWorkbookCurrency(totalKredit))}</td>
                                <td colspan="6" style="padding:10px 12px;border-top:2px solid var(--border);"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>`;
        }).join('');

        container.innerHTML = blocks;
    }

    function isJurnalPenyesuaianRow(row) {
        if (!row) return false;
        return !!row.link_jurnal_penyesuaian;
    }

    function normalizeWorkbookAkunCode(value) {
        const normalized = String(value || '').replace(/[–—−]/g, '-').replace(/\s+/g, ' ').trim();
        if (!normalized) return '';

        const matched = normalized.match(/^\d+-\d{4}/);
        if (matched) return matched[0];

        const parsed = parseSaldoAwalAccountCode(normalized);
        return String(parsed || '').replace(/[–—−]/g, '-').trim();
    }

    function canonicalizeWorkbookAkunCode(value) {
        const normalized = normalizeWorkbookAkunCode(value);
        if (!normalized) return '';
        return normalized.replace(/[^0-9-]/g, '').replace(/-+/g, '-').trim();
    }

    function resolveNamaAkunFromMap(code, nameMap) {
        const rawCode = normalizeWorkbookAkunCode(code);
        const canonicalCode = canonicalizeWorkbookAkunCode(code);
        if (rawCode && nameMap.has(rawCode)) return nameMap.get(rawCode);
        if (canonicalCode && nameMap.has(canonicalCode)) return nameMap.get(canonicalCode);
        return 'CEK CoA';
    }

    function loadJurnalPenyesuaian() {
        const container = document.getElementById('jurnal-penyesuaian-table-container');
        if (!container) return;

        container.innerHTML = `<div style="text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Menyusun jurnal penyesuaian...</div>`;
        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        const params = new URLSearchParams({
            session_slug: sessionSlug,
            t: String(new Date().getTime()),
        });
        const unitUsahaId = getActiveWorkbookUnitUsahaId(['jurnal-penyesuaian-unit-filter']);
        if (unitUsahaId) {
            params.set('unit_usaha_id', unitUsahaId);
        }

        fetch('/api/jurnal?' + params.toString())
            .then((res) => {
                if (!res.ok) throw new Error('Gagal memuat jurnal penyesuaian');
                return res.json();
            })
            .then((data) => {
                const filtered = (data || []).filter((row) => isJurnalPenyesuaianRow(row));
                renderJurnalPenyesuaianWorkbookTable(filtered);
            })
            .catch((err) => {
                console.error(err);
                container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-exclamation-circle fa-3x" style="margin-bottom:16px;"></i><p>Gagal memuat data jurnal penyesuaian.</p></div>`;
            });
    }

    function loadJurnalPenyesuaianView() {
        loadWorkbookUnitFilterOptions('jurnal-penyesuaian-unit-filter');
        loadJurnalPenyesuaian();
    }

    function renderJurnalPenyesuaianRekapTable(unitBlocks) {
        const container = document.getElementById('jurnal-penyesuaian-rekap-table-container');
        if (!container) return;

        if (!unitBlocks || unitBlocks.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-table-list fa-3x" style="margin-bottom:16px;"></i><p>Belum ada data rekapitulasi jurnal penyesuaian.</p></div>`;
            return;
        }

        let globalDebit = 0;
        let globalKredit = 0;

        const blocks = unitBlocks.map((block, index) => {
            globalDebit += Number(block.totalDebit) || 0;
            globalKredit += Number(block.totalKredit) || 0;

            const rowsHtml = (block.rows || []).map((row) => `
                <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:10px 12px;white-space:nowrap;color:var(--text-secondary);">${escapeHtml(block.unitName || '-')}</td>
                    <td style="padding:10px 12px;white-space:nowrap;color:var(--text-primary);font-weight:600;">${escapeHtml(row.kodeAkun || '-')}</td>
                    <td style="padding:10px 12px;color:var(--text-primary);font-weight:500;">${escapeHtml(row.namaAkun || 'CEK CoA')}</td>
                    <td style="padding:10px 12px;text-align:right;white-space:nowrap;color:var(--text-primary);">${escapeHtml(formatJurnalWorkbookCurrency(row.debit || 0))}</td>
                    <td style="padding:10px 12px;text-align:right;white-space:nowrap;color:var(--text-primary);">${escapeHtml(formatJurnalWorkbookCurrency(row.kredit || 0))}</td>
                </tr>`).join('');

            return `
                <div style="margin-bottom:24px;overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-md);">
                    <table class="data-table" style="width:100%;border-collapse:collapse;text-align:left;min-width:760px;">
                        <thead>
                            ${index === 0 ? '<tr><th colspan="5" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-transform:uppercase;text-align:center;">REKAPITULASI JURNAL</th></tr>' : ''}
                            <tr style="background:#f5f5f5;border-bottom:2px solid var(--border);">
                                <th style="padding:10px 12px;font-weight:700;white-space:nowrap;">Unit Usaha</th>
                                <th style="padding:10px 12px;font-weight:700;white-space:nowrap;">Kode Akun</th>
                                <th style="padding:10px 12px;font-weight:700;">Nama Akun</th>
                                <th style="padding:10px 12px;font-weight:700;text-align:right;white-space:nowrap;">Debit</th>
                                <th style="padding:10px 12px;font-weight:700;text-align:right;white-space:nowrap;">Kredit</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                            <tr style="background:#f8fafc;font-weight:700;">
                                <td colspan="3" style="padding:10px 12px;border-top:2px solid var(--border);text-align:right;color:var(--text-primary);">TOTAL</td>
                                <td style="padding:10px 12px;border-top:2px solid var(--border);text-align:right;color:var(--text-primary);">${escapeHtml(formatJurnalWorkbookCurrency(block.totalDebit || 0))}</td>
                                <td style="padding:10px 12px;border-top:2px solid var(--border);text-align:right;color:var(--text-primary);">${escapeHtml(formatJurnalWorkbookCurrency(block.totalKredit || 0))}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>`;
        }).join('');

        const grandTotalHtml = `
            <div style="overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-md);background:#fcfdfc;">
                <table class="data-table" style="width:100%;border-collapse:collapse;text-align:left;min-width:760px;">
                    <thead>
                        <tr style="background:#eef6ea;border-bottom:2px solid var(--border);">
                            <th colspan="3" style="padding:10px 12px;font-weight:700;color:var(--text-primary);text-transform:uppercase;">TOTAL SELURUH UNIT</th>
                            <th style="padding:10px 12px;font-weight:700;text-align:right;white-space:nowrap;">Debit</th>
                            <th style="padding:10px 12px;font-weight:700;text-align:right;white-space:nowrap;">Kredit</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="font-weight:700;">
                            <td colspan="3" style="padding:12px;border-top:1px solid var(--border);text-align:right;color:var(--text-primary);">GRAND TOTAL</td>
                            <td style="padding:12px;border-top:1px solid var(--border);text-align:right;color:var(--text-primary);">${escapeHtml(formatJurnalWorkbookCurrency(globalDebit))}</td>
                            <td style="padding:12px;border-top:1px solid var(--border);text-align:right;color:var(--text-primary);">${escapeHtml(formatJurnalWorkbookCurrency(globalKredit))}</td>
                        </tr>
                    </tbody>
                </table>
            </div>`;

        container.innerHTML = blocks + grandTotalHtml;
    }

    function loadJurnalPenyesuaianRekap() {
        const container = document.getElementById('jurnal-penyesuaian-rekap-table-container');
        if (!container) return;

        container.innerHTML = `<div style="text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Menyusun rekapitulasi jurnal penyesuaian...</div>`;

        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        const params = new URLSearchParams({
            session_slug: sessionSlug,
            t: String(new Date().getTime()),
        });
        const unitUsahaId = getActiveWorkbookUnitUsahaId(['jurnal-penyesuaian-rekap-unit-filter']);
        if (unitUsahaId) {
            params.set('unit_usaha_id', unitUsahaId);
        }

        Promise.all([
            fetch('/api/jurnal?' + params.toString()).then((res) => {
                if (!res.ok) throw new Error('Gagal memuat jurnal');
                return res.json();
            }),
            fetch('/api/coas?session_slug=' + encodeURIComponent(sessionSlug) + '&t=' + new Date().getTime()).then((res) => {
                if (!res.ok) return [];
                return res.json();
            }).catch(() => []),
        ])
            .then(([jurnalRows, coas]) => {
                const coaNameByCode = new Map();
                (Array.isArray(coas) ? coas : []).forEach((coa) => {
                    const code = normalizeWorkbookAkunCode(coa && (coa.kode_akun || coa.kodeAkun));
                    const canonicalCode = canonicalizeWorkbookAkunCode(coa && (coa.kode_akun || coa.kodeAkun));
                    const name = String(coa && (coa.nama_akun || coa.namaAkun) || '').trim();
                    if (code && name && !coaNameByCode.has(code)) {
                        coaNameByCode.set(code, name);
                    }
                    if (canonicalCode && name && !coaNameByCode.has(canonicalCode)) {
                        coaNameByCode.set(canonicalCode, name);
                    }
                });

                const filteredRows = (jurnalRows || []).filter((row) => isJurnalPenyesuaianRow(row));
                const byUnit = new Map();
                const orderedUnits = [];

                filteredRows.forEach((row) => {
                    const unitName = String(row && row.unit_usaha || '-').trim() || '-';
                    if (!byUnit.has(unitName)) {
                        byUnit.set(unitName, new Map());
                        orderedUnits.push(unitName);
                    }

                    const unitMap = byUnit.get(unitName);
                    const akunDebit = normalizeWorkbookAkunCode(row && row.akun_debit);
                    const akunKredit = normalizeWorkbookAkunCode(row && row.akun_kredit);
                    const akunDebitName = String(row && (row.nama_akun_debit || row.akun_debit_nama) || '').trim();
                    const akunKreditName = String(row && (row.nama_akun_kredit || row.akun_kredit_nama) || '').trim();
                    const nominalDebit = Number(row && row.nominal_debit) || 0;
                    const nominalKredit = Number(row && row.nominal_kredit) || 0;

                    if (akunDebit) {
                        if (!unitMap.has(akunDebit)) {
                            unitMap.set(akunDebit, { kodeAkun: akunDebit, namaAkun: resolveNamaAkunFromMap(akunDebit, coaNameByCode), debit: 0, kredit: 0 });
                        }
                        if (akunDebitName && unitMap.get(akunDebit).namaAkun === 'CEK CoA') {
                            unitMap.get(akunDebit).namaAkun = akunDebitName;
                        }
                        unitMap.get(akunDebit).debit += nominalDebit;
                    }

                    if (akunKredit) {
                        if (!unitMap.has(akunKredit)) {
                            unitMap.set(akunKredit, { kodeAkun: akunKredit, namaAkun: resolveNamaAkunFromMap(akunKredit, coaNameByCode), debit: 0, kredit: 0 });
                        }
                        if (akunKreditName && unitMap.get(akunKredit).namaAkun === 'CEK CoA') {
                            unitMap.get(akunKredit).namaAkun = akunKreditName;
                        }
                        unitMap.get(akunKredit).kredit += nominalKredit;
                    }
                });

                const unitBlocks = orderedUnits
                    .map((unitName) => {
                        const akunMap = byUnit.get(unitName) || new Map();
                        const rows = Array.from(akunMap.values()).sort((a, b) => {
                            const left = canonicalizeWorkbookAkunCode(a.kodeAkun || '') || String(a.kodeAkun || '');
                            const right = canonicalizeWorkbookAkunCode(b.kodeAkun || '') || String(b.kodeAkun || '');
                            return left.localeCompare(right, 'id');
                        });
                        const totalDebit = rows.reduce((sum, row) => sum + (Number(row.debit) || 0), 0);
                        const totalKredit = rows.reduce((sum, row) => sum + (Number(row.kredit) || 0), 0);
                        return { unitName, rows, totalDebit, totalKredit };
                    })
                    .filter((block) => (block.rows || []).length > 0);

                renderJurnalPenyesuaianRekapTable(unitBlocks);
            })
            .catch((err) => {
                console.error(err);
                container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-exclamation-circle fa-3x" style="margin-bottom:16px;"></i><p>Gagal memuat rekapitulasi jurnal penyesuaian.</p></div>`;
            });
    }

    function loadJurnalPenyesuaianRekapView() {
        loadWorkbookUnitFilterOptions('jurnal-penyesuaian-rekap-unit-filter');
        loadJurnalPenyesuaianRekap();
    }

    function formatWorkbookPeriodLabel(dateValue) {
        const date = dateValue ? new Date(dateValue) : new Date();
        if (isNaN(date.getTime())) return 'PERIODE -';
        const day = String(date.getDate()).padStart(2, '0');
        const month = date.toLocaleDateString('id-ID', { month: 'long' }).toUpperCase();
        const year = date.getFullYear();
        return `PERIODE ${day} ${month} ${year}`;
    }

    function parseJurnalAkunDisplay(rawValue) {
        const raw = String(rawValue || '').trim();
        if (!raw) return { code: '', name: '' };

        const code = normalizeWorkbookAkunCode(raw);
        if (!code) return { code: '', name: raw };

        const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const name = raw.replace(new RegExp(`^${escapedCode}\\s*`), '').replace(/^[-–—]\s*/, '').trim();
        return { code, name };
    }

    function renderNeracaSaldoSetelahPenyesuaianTable(payload) {
        const container = document.getElementById('neraca-saldo-setelah-penyesuaian-table-container');
        if (!container) return;

        const rows = Array.isArray(payload && payload.rows) ? payload.rows : [];
        const profileName = String(payload && payload.profileName || '-').toUpperCase();
        const periodLabel = String(payload && payload.periodLabel || 'PERIODE -').toUpperCase();
        const selectedUnitLabel = String(payload && payload.selectedUnitLabel || '').trim();

        if (rows.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-scale-balanced fa-3x" style="margin-bottom:16px;"></i><p>Belum ada data neraca saldo setelah penyesuaian.</p></div>`;
            return;
        }

        const totalDebit = rows.reduce((sum, row) => sum + (Number(row.debit) || 0), 0);
        const totalKredit = rows.reduce((sum, row) => sum + (Number(row.kredit) || 0), 0);
        const selisih = totalKredit - totalDebit;
        const isBalance = Math.abs(selisih) < 0.000001;

        const bodyRows = rows.map((row) => {
            const level = Number(row.levelAkun || 1);
            const indentPx = Math.max(0, (isNaN(level) ? 1 : level) - 1) * 14;
            return `
            <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:10px 12px;white-space:nowrap;color:var(--text-primary);font-weight:600;">${escapeHtml(row.kodeAkun || '-')}</td>
                <td style="padding:10px 12px;color:var(--text-primary);padding-left:${12 + indentPx}px;">${escapeHtml(row.namaAkun || '-')}</td>
                <td style="padding:10px 12px;text-align:center;color:var(--text-secondary);">${escapeHtml(row.reff || '-')}</td>
                <td style="padding:10px 12px;text-align:right;white-space:nowrap;color:var(--text-primary);">${escapeHtml(formatJurnalWorkbookCurrency(row.debit || 0))}</td>
                <td style="padding:10px 12px;text-align:right;white-space:nowrap;color:var(--text-primary);">${escapeHtml(formatJurnalWorkbookCurrency(row.kredit || 0))}</td>
            </tr>`;
        }).join('');

        container.innerHTML = `
            <div style="overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-md);">
                <table class="data-table" style="width:100%;border-collapse:collapse;text-align:left;min-width:900px;">
                    <thead>
                        <tr>
                            <th colspan="5" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-align:center;">${escapeHtml(profileName)}</th>
                        </tr>
                        <tr>
                            <th colspan="5" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-align:center;">NERACA SALDO SETELAH DISESUAIKAN</th>
                        </tr>
                        <tr>
                            <th colspan="5" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-align:center;">${escapeHtml(periodLabel)}</th>
                        </tr>
                        ${selectedUnitLabel && selectedUnitLabel.toLowerCase() !== 'semua unit usaha' ? `
                        <tr>
                            <th colspan="5" style="background:#f8fafc;padding:10px 16px;border:1px solid var(--border);font-weight:600;text-align:left;">Unit Usaha: ${escapeHtml(selectedUnitLabel)}</th>
                        </tr>` : ''}
                        <tr style="background:#f5f5f5;border-bottom:2px solid var(--border);">
                            <th style="padding:10px 12px;font-weight:700;white-space:nowrap;">Kode Akun</th>
                            <th style="padding:10px 12px;font-weight:700;">Nama Akun</th>
                            <th style="padding:10px 12px;font-weight:700;text-align:center;white-space:nowrap;">Reff</th>
                            <th style="padding:10px 12px;font-weight:700;text-align:right;white-space:nowrap;">Debit (Rp)</th>
                            <th style="padding:10px 12px;font-weight:700;text-align:right;white-space:nowrap;">Kredit (Rp)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bodyRows}
                        <tr style="background:#f8fafc;font-weight:700;">
                            <td colspan="3" style="padding:10px 12px;border-top:2px solid var(--border);text-align:left;color:var(--text-primary);">TOTAL</td>
                            <td style="padding:10px 12px;border-top:2px solid var(--border);text-align:right;color:var(--text-primary);">${escapeHtml(formatJurnalWorkbookCurrency(totalDebit))}</td>
                            <td style="padding:10px 12px;border-top:2px solid var(--border);text-align:right;color:var(--text-primary);">${escapeHtml(formatJurnalWorkbookCurrency(totalKredit))}</td>
                        </tr>
                        <tr style="background:#fcfcfc;">
                            <td colspan="3" style="padding:10px 12px;border-top:1px solid var(--border);font-weight:700;color:var(--text-primary);">CEK SELISIH</td>
                            <td style="padding:10px 12px;border-top:1px solid var(--border);text-align:right;font-weight:700;color:${isBalance ? '#166534' : '#b91c1c'};">${escapeHtml(formatJurnalWorkbookCurrency(selisih))}</td>
                            <td style="padding:10px 12px;border-top:1px solid var(--border);font-weight:700;color:${isBalance ? '#166534' : '#b91c1c'};">${isBalance ? 'BALANCE' : 'TIDAK BALANCE'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>`;
    }

    function loadNeracaSaldoSetelahPenyesuaian() {
        const container = document.getElementById('neraca-saldo-setelah-penyesuaian-table-container');
        if (!container) return;

        container.innerHTML = `<div style="text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Menyusun neraca saldo setelah penyesuaian...</div>`;

        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        const params = new URLSearchParams({
            session_slug: sessionSlug,
            t: String(Date.now()),
        });
        const unitUsahaId = getActiveWorkbookUnitUsahaId(['neraca-saldo-setelah-penyesuaian-unit-filter']);
        if (unitUsahaId) {
            params.set('unit_usaha_id', unitUsahaId);
        }

        Promise.all([
            fetch('/api/jurnal?' + params.toString()).then((res) => {
                if (!res.ok) throw new Error('Gagal memuat jurnal');
                return res.json();
            }),
            fetch('/api/coas?session_slug=' + encodeURIComponent(sessionSlug) + '&t=' + Date.now()).then((res) => {
                if (!res.ok) throw new Error('Gagal memuat chart of accounts');
                return res.json();
            }),
        ])
            .then(([jurnalRows, coas]) => {
                const movementByCode = new Map();
                const nameByCode = new Map();

                (Array.isArray(jurnalRows) ? jurnalRows : []).forEach((row) => {
                    const debitInfo = parseJurnalAkunDisplay(row && row.akun_debit);
                    const kreditInfo = parseJurnalAkunDisplay(row && row.akun_kredit);
                    const nominalDebit = Number(row && row.nominal_debit) || 0;
                    const nominalKredit = Number(row && row.nominal_kredit) || 0;

                    if (debitInfo.code) {
                        if (!movementByCode.has(debitInfo.code)) movementByCode.set(debitInfo.code, { debit: 0, kredit: 0 });
                        movementByCode.get(debitInfo.code).debit += nominalDebit;
                        if (debitInfo.name && !nameByCode.has(debitInfo.code)) nameByCode.set(debitInfo.code, debitInfo.name);
                    }

                    if (kreditInfo.code) {
                        if (!movementByCode.has(kreditInfo.code)) movementByCode.set(kreditInfo.code, { debit: 0, kredit: 0 });
                        movementByCode.get(kreditInfo.code).kredit += nominalKredit;
                        if (kreditInfo.name && !nameByCode.has(kreditInfo.code)) nameByCode.set(kreditInfo.code, kreditInfo.name);
                    }
                });

                const visitedCodes = new Set();
                const rows = [];

                (Array.isArray(coas) ? coas : []).forEach((coa) => {
                    const code = normalizeWorkbookAkunCode(coa && (coa.kode_akun || coa.kodeAkun));
                    if (!code || visitedCodes.has(code)) return;

                    const movement = movementByCode.get(code) || { debit: 0, kredit: 0 };
                    const net = (Number(movement.debit) || 0) - (Number(movement.kredit) || 0);
                    const debit = net > 0 ? net : 0;
                    const kredit = net < 0 ? Math.abs(net) : 0;
                    const coaName = String(coa && (coa.nama_akun || coa.namaAkun) || '').trim();

                    rows.push({
                        kodeAkun: code,
                        namaAkun: coaName || nameByCode.get(code) || '-',
                        reff: String(coa && (coa.level_akun || coa.levelAkun) || '-'),
                        levelAkun: Number(coa && (coa.level_akun || coa.levelAkun) || 1),
                        debit,
                        kredit,
                    });
                    visitedCodes.add(code);
                });

                Array.from(movementByCode.keys())
                    .filter((code) => !visitedCodes.has(code))
                    .sort((a, b) => a.localeCompare(b, 'id'))
                    .forEach((code) => {
                        const movement = movementByCode.get(code) || { debit: 0, kredit: 0 };
                        const net = (Number(movement.debit) || 0) - (Number(movement.kredit) || 0);
                        rows.push({
                            kodeAkun: code,
                            namaAkun: nameByCode.get(code) || 'CEK CoA',
                            reff: '-',
                            levelAkun: 1,
                            debit: net > 0 ? net : 0,
                            kredit: net < 0 ? Math.abs(net) : 0,
                        });
                    });

                const maxDate = (Array.isArray(jurnalRows) ? jurnalRows : []).reduce((latest, row) => {
                    const current = new Date(row && row.tanggal ? row.tanggal : 0);
                    if (isNaN(current.getTime())) return latest;
                    return (!latest || current > latest) ? current : latest;
                }, null);

                const selectedUnitOption = document.querySelector('#neraca-saldo-setelah-penyesuaian-unit-filter option:checked');
                const selectedUnitLabel = selectedUnitOption ? selectedUnitOption.textContent : 'Semua Unit Usaha';
                const fallbackProfile = String(localStorage.getItem('sibumdes_profile_name') || '-').trim() || '-';
                const profileFromJurnal = (Array.isArray(jurnalRows) ? jurnalRows : []).find((row) => String(row && row.profile_bumdes_name || '').trim());
                const profileName = String(profileFromJurnal && profileFromJurnal.profile_bumdes_name || fallbackProfile);

                renderNeracaSaldoSetelahPenyesuaianTable({
                    rows,
                    profileName,
                    periodLabel: formatWorkbookPeriodLabel(maxDate),
                    selectedUnitLabel,
                });
            })
            .catch((err) => {
                console.error(err);
                container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-exclamation-circle fa-3x" style="margin-bottom:16px;"></i><p>Gagal memuat neraca saldo setelah penyesuaian.</p></div>`;
            });
    }

    function loadNeracaSaldoSetelahPenyesuaianView() {
        loadWorkbookUnitFilterOptions('neraca-saldo-setelah-penyesuaian-unit-filter');
        loadNeracaSaldoSetelahPenyesuaian();
    }

    function renderLaporanLabaRugiTable(payload) {
        const container = document.getElementById('laporan-laba-rugi-table-container');
        if (!container) return;

        const profileName = String(payload && payload.profileName || '-').toUpperCase();
        const periodLabel = String(payload && payload.periodLabel || 'UNTUK PERIODE YANG BERAKHIR PADA -').toUpperCase();
        const selectedUnitLabel = String(payload && payload.selectedUnitLabel || '').trim();
        const lines = Array.isArray(payload && payload.lines) ? payload.lines : [];

        if (lines.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-file-invoice-dollar fa-3x" style="margin-bottom:16px;"></i><p>Belum ada data laporan laba rugi.</p></div>`;
            return;
        }

        const rowsHtml = lines.map((line) => {
            const isSection = line.kind === 'section';
            const isSummary = line.kind === 'summary';
            const isSpacer = line.kind === 'spacer';
            if (isSpacer) {
                return `<tr><td colspan="4" style="padding:6px 12px;background:#fff;"></td></tr>`;
            }

            const valueCell = line.showValue
                ? escapeHtml(formatJurnalWorkbookCurrency(line.value || 0))
                : '';

            return `
                <tr style="border-bottom:1px solid var(--border);background:${isSection ? '#f8fafc' : '#fff'};">
                    <td style="padding:10px 12px;white-space:nowrap;color:var(--text-secondary);font-weight:${isSummary ? '700' : '500'};">${escapeHtml(line.code || '')}</td>
                    <td style="padding:10px 12px;color:var(--text-primary);font-weight:${isSection || isSummary ? '700' : '500'};padding-left:${12 + (line.indent || 0) * 18}px;">${escapeHtml(line.label || '')}</td>
                    <td style="padding:10px 12px;"></td>
                    <td style="padding:10px 12px;text-align:right;white-space:nowrap;color:var(--text-primary);font-weight:${isSummary ? '700' : '600'};">${valueCell}</td>
                </tr>`;
        }).join('');

        container.innerHTML = `
            <div style="overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-md);">
                <table class="data-table" style="width:100%;border-collapse:collapse;text-align:left;min-width:900px;">
                    <thead>
                        <tr>
                            <th colspan="4" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-align:center;">${escapeHtml(profileName)}</th>
                        </tr>
                        <tr>
                            <th colspan="4" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-align:center;">LAPORAN LABA RUGI</th>
                        </tr>
                        <tr>
                            <th colspan="4" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-align:center;">${escapeHtml(periodLabel)}</th>
                        </tr>
                        ${selectedUnitLabel && selectedUnitLabel.toLowerCase() !== 'semua unit usaha' ? `
                        <tr>
                            <th colspan="4" style="background:#f8fafc;padding:10px 16px;border:1px solid var(--border);font-weight:600;text-align:left;">Unit Usaha: ${escapeHtml(selectedUnitLabel)}</th>
                        </tr>` : ''}
                        <tr style="background:#f5f5f5;border-bottom:2px solid var(--border);">
                            <th style="padding:10px 12px;font-weight:700;white-space:nowrap;">Kode/Ref</th>
                            <th style="padding:10px 12px;font-weight:700;">Uraian</th>
                            <th style="padding:10px 12px;font-weight:700;">&nbsp;</th>
                            <th style="padding:10px 12px;font-weight:700;text-align:right;white-space:nowrap;">Jumlah (Rp)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>`;
    }

    function loadLaporanLabaRugi() {
        const container = document.getElementById('laporan-laba-rugi-table-container');
        if (!container) return;

        container.innerHTML = `<div style="text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Menyusun laporan laba rugi...</div>`;

        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        const params = new URLSearchParams({
            session_slug: sessionSlug,
            t: String(Date.now()),
        });
        const unitUsahaId = getActiveWorkbookUnitUsahaId(['laporan-laba-rugi-unit-filter']);
        if (unitUsahaId) {
            params.set('unit_usaha_id', unitUsahaId);
        }

        Promise.all([
            fetch('/api/jurnal?' + params.toString()).then((res) => {
                if (!res.ok) throw new Error('Gagal memuat jurnal');
                return res.json();
            }),
            fetch('/api/coas?session_slug=' + encodeURIComponent(sessionSlug) + '&t=' + Date.now()).then((res) => {
                if (!res.ok) throw new Error('Gagal memuat chart of accounts');
                return res.json();
            }),
        ])
            .then(([jurnalRows, coas]) => {
                const coaNameByCode = new Map();
                (Array.isArray(coas) ? coas : []).forEach((coa) => {
                    const code = normalizeWorkbookAkunCode(coa && (coa.kode_akun || coa.kodeAkun));
                    const name = String(coa && (coa.nama_akun || coa.namaAkun) || '').trim();
                    if (code && name && !coaNameByCode.has(code)) {
                        coaNameByCode.set(code, name);
                    }
                });

                const movementByName = new Map();
                (Array.isArray(jurnalRows) ? jurnalRows : []).forEach((row) => {
                    const debitInfo = parseJurnalAkunDisplay(row && row.akun_debit);
                    const kreditInfo = parseJurnalAkunDisplay(row && row.akun_kredit);
                    const nominalDebit = Number(row && row.nominal_debit) || 0;
                    const nominalKredit = Number(row && row.nominal_kredit) || 0;

                    const debitName = debitInfo.code ? (coaNameByCode.get(debitInfo.code) || debitInfo.name || '') : (debitInfo.name || '');
                    if (debitName) {
                        if (!movementByName.has(debitName)) movementByName.set(debitName, { debit: 0, kredit: 0 });
                        movementByName.get(debitName).debit += nominalDebit;
                    }

                    const kreditName = kreditInfo.code ? (coaNameByCode.get(kreditInfo.code) || kreditInfo.name || '') : (kreditInfo.name || '');
                    if (kreditName) {
                        if (!movementByName.has(kreditName)) movementByName.set(kreditName, { debit: 0, kredit: 0 });
                        movementByName.get(kreditName).kredit += nominalKredit;
                    }
                });

                const incomeNames = [
                    'Pendapatan Penjualan Barang Dagangan',
                    'Pendapatan Penjualan Hasil Produksi',
                    'Pendapatan Jasa',
                    'Pendapatan Sewa',
                    'Pendapatan Denda',
                    'Pendapatan Operasional Lainnya',
                ];

                const hppNames = [
                    'HPP Barang Dagangan',
                    'HPP Barang Jadi / Hasil Produksi',
                ];

                const bebanUsahaNames = [
                    'Beban Produksi Langsung',
                    'Beban Operasional',
                    'Beban Operasional Peternakan Ayam Petelur',
                    'Beban Operasional Minimarket Desa Mart',
                    'Beban Operasional Layanan Jasa Desa Prima',
                    'Beban Pegawai',
                    'Beban Administrasi dan Umum',
                    'Beban Utilitas',
                    'Beban Pemeliharaan dan Perbaikan',
                    'Beban Perlengkapan',
                    'Beban Sewa dan Asuransi',
                    'Beban Penyusutan',
                    'Beban Pajak',
                    'Beban Operasional Lainnya',
                ];

                const pendapatanLainNames = [
                    'Pendapatan Bunga Bank',
                    'Laba Penjualan Aset Tetap',
                    'Pendapatan Lain-lain Non-Operasional',
                ];

                const bebanLainNames = [
                    'Beban Bank',
                    'Beban Bunga',
                    'Beban Denda',
                    'Rugi Penjualan Aset Tetap',
                    'Beban Lain-lain Non-Operasional',
                ];

                const getCreditMinusDebit = (name) => {
                    const movement = movementByName.get(name) || { debit: 0, kredit: 0 };
                    return (Number(movement.kredit) || 0) - (Number(movement.debit) || 0);
                };

                const getDebitMinusCredit = (name) => {
                    const movement = movementByName.get(name) || { debit: 0, kredit: 0 };
                    return (Number(movement.debit) || 0) - (Number(movement.kredit) || 0);
                };

                const incomeValues = Object.fromEntries(incomeNames.map((name) => [name, getCreditMinusDebit(name)]));
                const totalPendapatanUsaha = incomeNames.reduce((sum, name) => sum + (incomeValues[name] || 0), 0);

                const hppValues = Object.fromEntries(hppNames.map((name) => [name, getDebitMinusCredit(name)]));
                const totalHpp = hppNames.reduce((sum, name) => sum + (hppValues[name] || 0), 0);
                const labaRugiKotor = totalPendapatanUsaha - totalHpp;

                const bebanUsahaValues = Object.fromEntries(bebanUsahaNames.map((name) => [name, getDebitMinusCredit(name)]));
                const totalBebanUsaha = bebanUsahaNames.reduce((sum, name) => sum + (bebanUsahaValues[name] || 0), 0);
                const labaRugiOperasi = labaRugiKotor - totalBebanUsaha;

                const pendapatanLainValues = Object.fromEntries(pendapatanLainNames.map((name) => [name, getCreditMinusDebit(name)]));
                const bebanLainValues = Object.fromEntries(bebanLainNames.map((name) => [name, getDebitMinusCredit(name)]));
                const totalPendapatanLain = pendapatanLainNames.reduce((sum, name) => sum + (pendapatanLainValues[name] || 0), 0);
                const totalBebanLain = bebanLainNames.reduce((sum, name) => sum + (bebanLainValues[name] || 0), 0);
                const totalPendapatanBebanLain = totalPendapatanLain - totalBebanLain;

                const labaRugiBersihSebelumBagiHasil = labaRugiOperasi + totalPendapatanBebanLain;
                const bagiHasilDesa = getDebitMinusCredit('Bagi Hasil untuk Desa');
                const bagiHasilMasyarakat = getDebitMinusCredit('Bagi Hasil untuk Masyarakat');
                const labaRugiBersihSetelahBagiHasil = labaRugiBersihSebelumBagiHasil - bagiHasilDesa - bagiHasilMasyarakat;

                const lines = [
                    { kind: 'section', code: 'Kode/Ref', label: '', showValue: false, indent: 0 },
                    { kind: 'section', code: '', label: 'PENDAPATAN USAHA', showValue: false, indent: 0 },
                    { kind: 'item', code: '', label: 'Pendapatan Penjualan Barang Dagangan', value: incomeValues['Pendapatan Penjualan Barang Dagangan'], showValue: true, indent: 1 },
                    { kind: 'item', code: '', label: 'Pendapatan Penjualan Hasil Produksi', value: incomeValues['Pendapatan Penjualan Hasil Produksi'], showValue: true, indent: 1 },
                    { kind: 'item', code: '', label: 'Pendapatan Jasa', value: incomeValues['Pendapatan Jasa'], showValue: true, indent: 1 },
                    { kind: 'item', code: '', label: 'Pendapatan Sewa', value: incomeValues['Pendapatan Sewa'], showValue: true, indent: 1 },
                    { kind: 'item', code: '', label: 'Pendapatan Denda', value: incomeValues['Pendapatan Denda'], showValue: true, indent: 1 },
                    { kind: 'item', code: '', label: 'Pendapatan Operasional Lainnya', value: incomeValues['Pendapatan Operasional Lainnya'], showValue: true, indent: 1 },
                    { kind: 'summary', code: '', label: 'Total Pendapatan Usaha', value: totalPendapatanUsaha, showValue: true, indent: 1 },
                    { kind: 'spacer' },
                    { kind: 'section', code: '', label: 'HARGA POKOK PENJUALAN', showValue: false, indent: 1 },
                    { kind: 'item', code: '', label: 'HPP Barang Dagangan', value: hppValues['HPP Barang Dagangan'], showValue: true, indent: 1 },
                    { kind: 'item', code: '', label: 'HPP Barang Jadi / Hasil Produksi', value: hppValues['HPP Barang Jadi / Hasil Produksi'], showValue: true, indent: 1 },
                    { kind: 'summary', code: '', label: 'Total HPP', value: totalHpp, showValue: true, indent: 1 },
                    { kind: 'summary', code: '', label: 'LABA (RUGI) KOTOR', value: labaRugiKotor, showValue: true, indent: 1 },
                    { kind: 'spacer' },
                    { kind: 'section', code: '', label: 'BEBAN USAHA', showValue: false, indent: 1 },
                    ...bebanUsahaNames.map((name) => ({ kind: 'item', code: '', label: name, value: bebanUsahaValues[name], showValue: true, indent: 1 })),
                    { kind: 'summary', code: '', label: 'Total Beban Usaha', value: totalBebanUsaha, showValue: true, indent: 1 },
                    { kind: 'summary', code: '', label: 'LABA (RUGI) OPERASI', value: labaRugiOperasi, showValue: true, indent: 1 },
                    { kind: 'spacer' },
                    { kind: 'section', code: '', label: 'PENDAPATAN DAN BEBAN LAIN-LAIN', showValue: false, indent: 1 },
                    ...pendapatanLainNames.map((name) => ({ kind: 'item', code: '', label: name, value: pendapatanLainValues[name], showValue: true, indent: 1 })),
                    ...bebanLainNames.map((name) => ({ kind: 'item', code: '', label: name, value: bebanLainValues[name], showValue: true, indent: 1 })),
                    { kind: 'summary', code: '', label: 'Total Pendapatan/Beban Lain-lain', value: totalPendapatanBebanLain, showValue: true, indent: 1 },
                    { kind: 'summary', code: '', label: 'LABA (RUGI) BERSIH SEBELUM BAGI HASIL', value: labaRugiBersihSebelumBagiHasil, showValue: true, indent: 1 },
                    { kind: 'item', code: '', label: 'Bagi Hasil untuk Desa', value: bagiHasilDesa, showValue: true, indent: 1 },
                    { kind: 'item', code: '', label: 'Bagi Hasil untuk Masyarakat', value: bagiHasilMasyarakat, showValue: true, indent: 1 },
                    { kind: 'summary', code: '', label: 'LABA (RUGI) BERSIH SETELAH BAGI HASIL', value: labaRugiBersihSetelahBagiHasil, showValue: true, indent: 1 },
                ];

                const maxDate = (Array.isArray(jurnalRows) ? jurnalRows : []).reduce((latest, row) => {
                    const current = new Date(row && row.tanggal ? row.tanggal : 0);
                    if (isNaN(current.getTime())) return latest;
                    return (!latest || current > latest) ? current : latest;
                }, null);
                const selectedUnitOption = document.querySelector('#laporan-laba-rugi-unit-filter option:checked');
                const selectedUnitLabel = selectedUnitOption ? selectedUnitOption.textContent : 'Semua Unit Usaha';
                const fallbackProfile = String(localStorage.getItem('sibumdes_profile_name') || '-').trim() || '-';
                const profileFromJurnal = (Array.isArray(jurnalRows) ? jurnalRows : []).find((row) => String(row && row.profile_bumdes_name || '').trim());
                const profileName = String(profileFromJurnal && profileFromJurnal.profile_bumdes_name || fallbackProfile);

                renderLaporanLabaRugiTable({
                    profileName,
                    periodLabel: maxDate
                        ? `UNTUK PERIODE YANG BERAKHIR PADA ${String(maxDate.getDate()).padStart(2, '0')} ${maxDate.toLocaleDateString('id-ID', { month: 'long' }).toUpperCase()} ${maxDate.getFullYear()}`
                        : 'UNTUK PERIODE YANG BERAKHIR PADA -',
                    selectedUnitLabel,
                    lines,
                });
            })
            .catch((err) => {
                console.error(err);
                container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-exclamation-circle fa-3x" style="margin-bottom:16px;"></i><p>Gagal memuat laporan laba rugi.</p></div>`;
            });
    }

    function loadLaporanLabaRugiView() {
        loadWorkbookUnitFilterOptions('laporan-laba-rugi-unit-filter');
        loadLaporanLabaRugi();
    }

    function renderLaporanPenyertaanModalTable(payload) {
        const container = document.getElementById('laporan-penyertaan-modal-table-container');
        if (!container) return;

        const profileName = String(payload && payload.profileName || '-').toUpperCase();
        const periodLabel = String(payload && payload.periodLabel || 'UNTUK PERIODE YANG BERAKHIR PADA -').toUpperCase();
        const selectedUnitLabel = String(payload && payload.selectedUnitLabel || '').trim();
        const rows = Array.isArray(payload && payload.rows) ? payload.rows : [];

        if (rows.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-hand-holding-dollar fa-3x" style="margin-bottom:16px;"></i><p>Belum ada data laporan penyertaan modal.</p></div>`;
            return;
        }

        const totalPenyertaanModal = rows.reduce((sum, row) => sum + (Number(row.nilai) || 0), 0);
        const rowsHtml = rows.map((row) => `
            <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:10px 12px;white-space:nowrap;color:var(--text-primary);font-weight:600;">${escapeHtml(row.tahun || '-')}</td>
                <td style="padding:10px 12px;color:var(--text-primary);padding-left:${12 + (row.indent || 0) * 18}px;">${escapeHtml(row.keterangan || '-')}</td>
                <td style="padding:10px 12px;text-align:right;white-space:nowrap;color:var(--text-primary);font-weight:600;">${escapeHtml(formatJurnalWorkbookCurrency(row.nilai || 0))}</td>
                <td style="padding:10px 12px;"></td>
            </tr>`).join('');

        container.innerHTML = `
            <div style="overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-md);">
                <table class="data-table" style="width:100%;border-collapse:collapse;text-align:left;min-width:860px;">
                    <thead>
                        <tr>
                            <th colspan="3" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-align:center;">${escapeHtml(profileName)}</th>
                            <th style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);"></th>
                        </tr>
                        <tr>
                            <th colspan="3" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-align:center;">LAPORAN PENYERTAAN MODAL</th>
                            <th style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);"></th>
                        </tr>
                        <tr>
                            <th colspan="3" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-align:center;">${escapeHtml(periodLabel)}</th>
                            <th style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);"></th>
                        </tr>
                        ${selectedUnitLabel && selectedUnitLabel.toLowerCase() !== 'semua unit usaha' ? `
                        <tr>
                            <th colspan="4" style="background:#f8fafc;padding:10px 16px;border:1px solid var(--border);font-weight:600;text-align:left;">Unit Usaha: ${escapeHtml(selectedUnitLabel)}</th>
                        </tr>` : ''}
                        <tr style="background:#f5f5f5;border-bottom:2px solid var(--border);">
                            <th style="padding:10px 12px;font-weight:700;white-space:nowrap;">Tahun</th>
                            <th style="padding:10px 12px;font-weight:700;">Uraian</th>
                            <th style="padding:10px 12px;font-weight:700;text-align:right;white-space:nowrap;">Jumlah (Rp)</th>
                            <th style="padding:10px 12px;"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                        <tr style="background:#f8fafc;font-weight:700;">
                            <td colspan="2" style="padding:10px 12px;border-top:2px solid var(--border);text-align:left;color:var(--text-primary);">TOTAL PENYERTAAN MODAL</td>
                            <td style="padding:10px 12px;border-top:2px solid var(--border);text-align:right;color:var(--text-primary);">${escapeHtml(formatJurnalWorkbookCurrency(totalPenyertaanModal))}</td>
                            <td style="padding:10px 12px;border-top:2px solid var(--border);"></td>
                        </tr>
                    </tbody>
                </table>
            </div>`;
    }

    function loadLaporanPenyertaanModal() {
        const container = document.getElementById('laporan-penyertaan-modal-table-container');
        if (!container) return;

        container.innerHTML = `<div style="text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Menyusun laporan penyertaan modal...</div>`;

        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        const params = new URLSearchParams({
            session_slug: sessionSlug,
            t: String(Date.now()),
        });
        const unitUsahaId = getActiveWorkbookUnitUsahaId(['laporan-penyertaan-modal-unit-filter']);
        if (unitUsahaId) {
            params.set('unit_usaha_id', unitUsahaId);
        }

        Promise.all([
            fetch('/api/jurnal?' + params.toString()).then((res) => {
                if (!res.ok) throw new Error('Gagal memuat jurnal');
                return res.json();
            }),
            fetch('/api/coas?session_slug=' + encodeURIComponent(sessionSlug) + '&t=' + Date.now()).then((res) => {
                if (!res.ok) throw new Error('Gagal memuat chart of accounts');
                return res.json();
            }),
        ])
            .then(([jurnalRows, coas]) => {
                const coaNameByCode = new Map();
                (Array.isArray(coas) ? coas : []).forEach((coa) => {
                    const code = normalizeWorkbookAkunCode(coa && (coa.kode_akun || coa.kodeAkun));
                    const name = String(coa && (coa.nama_akun || coa.namaAkun) || '').trim();
                    if (code && name && !coaNameByCode.has(code)) {
                        coaNameByCode.set(code, name);
                    }
                });

                const movementByName = new Map();
                (Array.isArray(jurnalRows) ? jurnalRows : []).forEach((row) => {
                    const debitInfo = parseJurnalAkunDisplay(row && row.akun_debit);
                    const kreditInfo = parseJurnalAkunDisplay(row && row.akun_kredit);
                    const nominalDebit = Number(row && row.nominal_debit) || 0;
                    const nominalKredit = Number(row && row.nominal_kredit) || 0;

                    const debitName = debitInfo.code ? (coaNameByCode.get(debitInfo.code) || debitInfo.name || '') : (debitInfo.name || '');
                    if (debitName) {
                        if (!movementByName.has(debitName)) movementByName.set(debitName, { debit: 0, kredit: 0 });
                        movementByName.get(debitName).debit += nominalDebit;
                    }

                    const kreditName = kreditInfo.code ? (coaNameByCode.get(kreditInfo.code) || kreditInfo.name || '') : (kreditInfo.name || '');
                    if (kreditName) {
                        if (!movementByName.has(kreditName)) movementByName.set(kreditName, { debit: 0, kredit: 0 });
                        movementByName.get(kreditName).kredit += nominalKredit;
                    }
                });

                const getCreditMinusDebit = (name) => {
                    const movement = movementByName.get(name) || { debit: 0, kredit: 0 };
                    return (Number(movement.kredit) || 0) - (Number(movement.debit) || 0);
                };

                const maxDate = (Array.isArray(jurnalRows) ? jurnalRows : []).reduce((latest, row) => {
                    const current = new Date(row && row.tanggal ? row.tanggal : 0);
                    if (isNaN(current.getTime())) return latest;
                    return (!latest || current > latest) ? current : latest;
                }, null);
                const baseYear = maxDate ? maxDate.getFullYear() : new Date().getFullYear();

                const rows = [
                    { tahun: String(baseYear - 1), keterangan: 'Penyertaan Modal Desa', nilai: getCreditMinusDebit('Penyertaan Modal Desa'), indent: 0 },
                    { tahun: String(baseYear - 1), keterangan: 'Penyertaan Modal Masyarakat', nilai: getCreditMinusDebit('Penyertaan Modal Masyarakat'), indent: 0 },
                    { tahun: String(baseYear - 1), keterangan: 'Penyertaan Modal Bantuan Pemerintah/BKK', nilai: getCreditMinusDebit('Penyertaan Modal Bantuan Pemerintah/BKK'), indent: 0 },
                    { tahun: String(baseYear), keterangan: 'Tambahan Penyertaan Modal Periode Berjalan', nilai: getCreditMinusDebit('Tambahan Penyertaan Modal'), indent: 0 },
                ];

                const selectedUnitOption = document.querySelector('#laporan-penyertaan-modal-unit-filter option:checked');
                const selectedUnitLabel = selectedUnitOption ? selectedUnitOption.textContent : 'Semua Unit Usaha';
                const fallbackProfile = String(localStorage.getItem('sibumdes_profile_name') || '-').trim() || '-';
                const profileFromJurnal = (Array.isArray(jurnalRows) ? jurnalRows : []).find((row) => String(row && row.profile_bumdes_name || '').trim());
                const profileName = String(profileFromJurnal && profileFromJurnal.profile_bumdes_name || fallbackProfile);

                renderLaporanPenyertaanModalTable({
                    profileName,
                    periodLabel: maxDate
                        ? `UNTUK PERIODE YANG BERAKHIR PADA ${String(maxDate.getDate()).padStart(2, '0')} ${maxDate.toLocaleDateString('id-ID', { month: 'long' }).toUpperCase()} ${maxDate.getFullYear()}`
                        : 'UNTUK PERIODE YANG BERAKHIR PADA -',
                    selectedUnitLabel,
                    rows,
                });
            })
            .catch((err) => {
                console.error(err);
                container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-exclamation-circle fa-3x" style="margin-bottom:16px;"></i><p>Gagal memuat laporan penyertaan modal.</p></div>`;
            });
    }

    function loadLaporanPenyertaanModalView() {
        loadWorkbookUnitFilterOptions('laporan-penyertaan-modal-unit-filter');
        loadLaporanPenyertaanModal();
    }

    function renderLaporanPerubahanModalTable(payload) {
        const container = document.getElementById('laporan-perubahan-modal-table-container');
        if (!container) return;

        const profileName = String(payload && payload.profileName || '-').toUpperCase();
        const periodLabel = String(payload && payload.periodLabel || 'UNTUK PERIODE YANG BERAKHIR PADA -').toUpperCase();
        const selectedUnitLabel = String(payload && payload.selectedUnitLabel || '').trim();
        const prevYear = String(payload && payload.prevYear || '-');
        const currentYear = String(payload && payload.currentYear || '-');
        const rows = Array.isArray(payload && payload.rows) ? payload.rows : [];

        if (rows.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-chart-line fa-3x" style="margin-bottom:16px;"></i><p>Belum ada data laporan perubahan modal.</p></div>`;
            return;
        }

        const rowsHtml = rows.map((row) => `
            <tr style="border-bottom:1px solid var(--border);background:${row.isSummary ? '#f8fafc' : '#fff'};">
                <td style="padding:10px 12px;text-align:center;color:var(--text-secondary);font-weight:${row.isSummary ? '700' : '500'};">${escapeHtml(String(row.no || ''))}</td>
                <td style="padding:10px 12px;color:var(--text-primary);font-weight:${row.isSummary ? '700' : '500'};padding-left:${12 + (row.indent || 0) * 16}px;">${escapeHtml(row.uraian || '-')}</td>
                <td style="padding:10px 12px;text-align:right;white-space:nowrap;color:var(--text-primary);font-weight:${row.isSummary ? '700' : '600'};">${escapeHtml(formatJurnalWorkbookCurrency(row.nilaiPrevYear || 0))}</td>
                <td style="padding:10px 12px;text-align:right;white-space:nowrap;color:var(--text-primary);font-weight:${row.isSummary ? '700' : '600'};">${escapeHtml(formatJurnalWorkbookCurrency(row.nilaiCurrentYear || 0))}</td>
            </tr>`).join('');

        container.innerHTML = `
            <div style="overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-md);">
                <table class="data-table" style="width:100%;border-collapse:collapse;text-align:left;min-width:920px;">
                    <thead>
                        <tr>
                            <th colspan="4" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-align:center;">${escapeHtml(profileName)}</th>
                        </tr>
                        <tr>
                            <th colspan="4" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-align:center;">LAPORAN PERUBAHAN MODAL</th>
                        </tr>
                        <tr>
                            <th colspan="4" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-align:center;">${escapeHtml(periodLabel)}</th>
                        </tr>
                        <tr>
                            <th colspan="4" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:600;text-align:center;">(dalam rupiah)</th>
                        </tr>
                        ${selectedUnitLabel && selectedUnitLabel.toLowerCase() !== 'semua unit usaha' ? `
                        <tr>
                            <th colspan="4" style="background:#f8fafc;padding:10px 16px;border:1px solid var(--border);font-weight:600;text-align:left;">Unit Usaha: ${escapeHtml(selectedUnitLabel)}</th>
                        </tr>` : ''}
                        <tr style="background:#f5f5f5;border-bottom:2px solid var(--border);">
                            <th style="padding:10px 12px;font-weight:700;white-space:nowrap;text-align:center;">Nomor Urut</th>
                            <th style="padding:10px 12px;font-weight:700;">Uraian</th>
                            <th style="padding:10px 12px;font-weight:700;text-align:right;white-space:nowrap;">${escapeHtml(prevYear)}</th>
                            <th style="padding:10px 12px;font-weight:700;text-align:right;white-space:nowrap;">${escapeHtml(currentYear)}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>`;
    }

    function loadLaporanPerubahanModal() {
        const container = document.getElementById('laporan-perubahan-modal-table-container');
        if (!container) return;

        container.innerHTML = `<div style="text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Menyusun laporan perubahan modal...</div>`;

        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        const params = new URLSearchParams({
            session_slug: sessionSlug,
            t: String(Date.now()),
        });
        const unitUsahaId = getActiveWorkbookUnitUsahaId(['laporan-perubahan-modal-unit-filter']);
        if (unitUsahaId) {
            params.set('unit_usaha_id', unitUsahaId);
        }

        Promise.all([
            fetch('/api/jurnal?' + params.toString()).then((res) => {
                if (!res.ok) throw new Error('Gagal memuat jurnal');
                return res.json();
            }),
            fetch('/api/coas?session_slug=' + encodeURIComponent(sessionSlug) + '&t=' + Date.now()).then((res) => {
                if (!res.ok) throw new Error('Gagal memuat chart of accounts');
                return res.json();
            }),
        ])
            .then(([jurnalRows, coas]) => {
                const coaNameByCode = new Map();
                (Array.isArray(coas) ? coas : []).forEach((coa) => {
                    const code = normalizeWorkbookAkunCode(coa && (coa.kode_akun || coa.kodeAkun));
                    const name = String(coa && (coa.nama_akun || coa.namaAkun) || '').trim();
                    if (code && name && !coaNameByCode.has(code)) {
                        coaNameByCode.set(code, name);
                    }
                });

                const movementByName = new Map();
                (Array.isArray(jurnalRows) ? jurnalRows : []).forEach((row) => {
                    const debitInfo = parseJurnalAkunDisplay(row && row.akun_debit);
                    const kreditInfo = parseJurnalAkunDisplay(row && row.akun_kredit);
                    const nominalDebit = Number(row && row.nominal_debit) || 0;
                    const nominalKredit = Number(row && row.nominal_kredit) || 0;

                    const debitName = debitInfo.code ? (coaNameByCode.get(debitInfo.code) || debitInfo.name || '') : (debitInfo.name || '');
                    if (debitName) {
                        if (!movementByName.has(debitName)) movementByName.set(debitName, { debit: 0, kredit: 0 });
                        movementByName.get(debitName).debit += nominalDebit;
                    }

                    const kreditName = kreditInfo.code ? (coaNameByCode.get(kreditInfo.code) || kreditInfo.name || '') : (kreditInfo.name || '');
                    if (kreditName) {
                        if (!movementByName.has(kreditName)) movementByName.set(kreditName, { debit: 0, kredit: 0 });
                        movementByName.get(kreditName).kredit += nominalKredit;
                    }
                });

                const getCreditMinusDebit = (name) => {
                    const movement = movementByName.get(name) || { debit: 0, kredit: 0 };
                    return (Number(movement.kredit) || 0) - (Number(movement.debit) || 0);
                };

                const getDebitMinusCredit = (name) => {
                    const movement = movementByName.get(name) || { debit: 0, kredit: 0 };
                    return (Number(movement.debit) || 0) - (Number(movement.kredit) || 0);
                };

                const maxDate = (Array.isArray(jurnalRows) ? jurnalRows : []).reduce((latest, row) => {
                    const current = new Date(row && row.tanggal ? row.tanggal : 0);
                    if (isNaN(current.getTime())) return latest;
                    return (!latest || current > latest) ? current : latest;
                }, null);
                const currentYear = maxDate ? maxDate.getFullYear() : new Date().getFullYear();
                const prevYear = currentYear - 1;

                const penyertaanModalDesa = getCreditMinusDebit('Penyertaan Modal Desa');
                const penyertaanModalMasyarakat = getCreditMinusDebit('Penyertaan Modal Masyarakat');
                const penyertaanModalBkk = getCreditMinusDebit('Penyertaan Modal Bantuan Pemerintah/BKK');
                const tambahanPenyertaan = getCreditMinusDebit('Tambahan Penyertaan Modal');
                const ekuitasLainnya = getCreditMinusDebit('Ekuitas Lainnya');
                const labaDitahanAwal = getCreditMinusDebit('Laba Ditahan');

                const labaBersihSebelumBagiHasil = getDebitMinusCredit('Laba/Rugi Tahun Berjalan');
                const bagiHasilDesa = -getDebitMinusCredit('Bagi Hasil untuk Desa');
                const bagiHasilMasyarakat = -getDebitMinusCredit('Bagi Hasil untuk Masyarakat');

                const labaDitahanAkhir = labaDitahanAwal + labaBersihSebelumBagiHasil + bagiHasilDesa + bagiHasilMasyarakat;
                const ekuitasAkhir = penyertaanModalDesa + penyertaanModalMasyarakat + penyertaanModalBkk + tambahanPenyertaan + ekuitasLainnya + labaDitahanAkhir;

                const rows = [
                    { no: 1, uraian: 'Penyertaan Modal Desa', nilaiPrevYear: 0, nilaiCurrentYear: penyertaanModalDesa, indent: 0 },
                    { no: 2, uraian: 'Penyertaan Modal Masyarakat', nilaiPrevYear: 0, nilaiCurrentYear: penyertaanModalMasyarakat, indent: 0 },
                    { no: 3, uraian: 'Penyertaan Modal Bantuan Pemerintah/BKK', nilaiPrevYear: 0, nilaiCurrentYear: penyertaanModalBkk, indent: 0 },
                    { no: 4, uraian: 'Tambahan Penyertaan Modal', nilaiPrevYear: 0, nilaiCurrentYear: tambahanPenyertaan, indent: 0 },
                    { no: 5, uraian: 'Ekuitas Lainnya', nilaiPrevYear: 0, nilaiCurrentYear: ekuitasLainnya, indent: 0 },
                    { no: 6, uraian: 'Laba Ditahan Awal', nilaiPrevYear: 0, nilaiCurrentYear: labaDitahanAwal, indent: 0 },
                    { no: 7, uraian: 'Laba/Rugi Tahun Berjalan sebelum Bagi Hasil', nilaiPrevYear: 0, nilaiCurrentYear: labaBersihSebelumBagiHasil, indent: 0 },
                    { no: 8, uraian: 'Bagi Hasil untuk Desa', nilaiPrevYear: 0, nilaiCurrentYear: bagiHasilDesa, indent: 0 },
                    { no: 9, uraian: 'Bagi Hasil untuk Masyarakat', nilaiPrevYear: 0, nilaiCurrentYear: bagiHasilMasyarakat, indent: 0 },
                    { no: 10, uraian: 'Laba Ditahan Akhir', nilaiPrevYear: 0, nilaiCurrentYear: labaDitahanAkhir, indent: 0, isSummary: true },
                    { no: 11, uraian: 'Ekuitas Akhir', nilaiPrevYear: 0, nilaiCurrentYear: ekuitasAkhir, indent: 0, isSummary: true },
                ];

                const selectedUnitOption = document.querySelector('#laporan-perubahan-modal-unit-filter option:checked');
                const selectedUnitLabel = selectedUnitOption ? selectedUnitOption.textContent : 'Semua Unit Usaha';
                const fallbackProfile = String(localStorage.getItem('sibumdes_profile_name') || '-').trim() || '-';
                const profileFromJurnal = (Array.isArray(jurnalRows) ? jurnalRows : []).find((row) => String(row && row.profile_bumdes_name || '').trim());
                const profileName = String(profileFromJurnal && profileFromJurnal.profile_bumdes_name || fallbackProfile);

                renderLaporanPerubahanModalTable({
                    profileName,
                    periodLabel: maxDate
                        ? `UNTUK PERIODE YANG BERAKHIR PADA ${String(maxDate.getDate()).padStart(2, '0')} ${maxDate.toLocaleDateString('id-ID', { month: 'long' }).toUpperCase()} ${maxDate.getFullYear()}`
                        : 'UNTUK PERIODE YANG BERAKHIR PADA -',
                    selectedUnitLabel,
                    prevYear,
                    currentYear,
                    rows,
                });
            })
            .catch((err) => {
                console.error(err);
                container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-exclamation-circle fa-3x" style="margin-bottom:16px;"></i><p>Gagal memuat laporan perubahan modal.</p></div>`;
            });
    }

    function loadLaporanPerubahanModalView() {
        loadWorkbookUnitFilterOptions('laporan-perubahan-modal-unit-filter');
        loadLaporanPerubahanModal();
    }

    function buildNeracaMovementByCode(jurnalRows, coaNameByCode) {
        const movementByCode = new Map();

        const ensureCode = (code) => {
            if (!movementByCode.has(code)) {
                movementByCode.set(code, { debit: 0, kredit: 0, net: 0 });
            }
            return movementByCode.get(code);
        };

        (Array.isArray(jurnalRows) ? jurnalRows : []).forEach((row) => {
            const debitInfo = parseJurnalAkunDisplay(row && row.akun_debit);
            const kreditInfo = parseJurnalAkunDisplay(row && row.akun_kredit);
            const nominalDebit = Number(row && row.nominal_debit) || 0;
            const nominalKredit = Number(row && row.nominal_kredit) || 0;

            if (debitInfo.code) {
                const bucket = ensureCode(debitInfo.code);
                bucket.debit += nominalDebit;
                bucket.net = bucket.debit - bucket.kredit;
                if (!coaNameByCode.has(debitInfo.code) && debitInfo.name) {
                    coaNameByCode.set(debitInfo.code, debitInfo.name);
                }
            }

            if (kreditInfo.code) {
                const bucket = ensureCode(kreditInfo.code);
                bucket.kredit += nominalKredit;
                bucket.net = bucket.debit - bucket.kredit;
                if (!coaNameByCode.has(kreditInfo.code) && kreditInfo.name) {
                    coaNameByCode.set(kreditInfo.code, kreditInfo.name);
                }
            }
        });

        return movementByCode;
    }

    function getNeracaNetByCodes(codes, movementByCode) {
        return (codes || []).reduce((sum, code) => {
            const normalized = normalizeWorkbookAkunCode(code);
            if (!normalized) return sum;
            const movement = movementByCode.get(normalized);
            return sum + (movement ? (Number(movement.net) || 0) : 0);
        }, 0);
    }

    function renderPosisiKeuanganNeracaTable(payload) {
        const container = document.getElementById('posisi-keuangan-neraca-table-container');
        if (!container) return;

        const profileName = String(payload && payload.profileName || '-').toUpperCase();
        const periodLabel = String(payload && payload.periodLabel || 'PER -').toUpperCase();
        const selectedUnitLabel = String(payload && payload.selectedUnitLabel || '').trim();
        const rows = Array.isArray(payload && payload.rows) ? payload.rows : [];

        if (rows.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-building-columns fa-3x" style="margin-bottom:16px;"></i><p>Belum ada data posisi keuangan / neraca.</p></div>`;
            return;
        }

        const rowsHtml = rows.map((row) => `
            <tr style="border-bottom:1px solid var(--border);background:${row.isSummary ? '#f8fafc' : '#fff'};">
                <td style="padding:10px 12px;text-align:center;color:var(--text-secondary);font-weight:${row.isSummary ? '700' : '500'};">${escapeHtml(String(row.no || ''))}</td>
                <td style="padding:10px 12px;color:var(--text-primary);font-weight:${row.isSummary ? '700' : '500'};padding-left:${12 + (row.indent || 0) * 16}px;">${escapeHtml(row.uraian || '-')}</td>
                <td style="padding:10px 12px;"></td>
                <td style="padding:10px 12px;text-align:right;white-space:nowrap;color:${row.isDiff ? '#b91c1c' : 'var(--text-primary)'};font-weight:${row.isSummary || row.isDiff ? '700' : '600'};">${row.showValue ? escapeHtml(formatJurnalWorkbookCurrency(row.nilai || 0)) : ''}</td>
            </tr>`).join('');

        container.innerHTML = `
            <div style="overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-md);">
                <table class="data-table" style="width:100%;border-collapse:collapse;text-align:left;min-width:920px;">
                    <thead>
                        <tr>
                            <th colspan="4" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-align:center;">${escapeHtml(profileName)}</th>
                        </tr>
                        <tr>
                            <th colspan="4" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-align:center;">LAPORAN POSISI KEUANGAN (NERACA)</th>
                        </tr>
                        <tr>
                            <th colspan="4" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-align:center;">${escapeHtml(periodLabel)}</th>
                        </tr>
                        ${selectedUnitLabel && selectedUnitLabel.toLowerCase() !== 'semua unit usaha' ? `
                        <tr>
                            <th colspan="4" style="background:#f8fafc;padding:10px 16px;border:1px solid var(--border);font-weight:600;text-align:left;">Unit Usaha: ${escapeHtml(selectedUnitLabel)}</th>
                        </tr>` : ''}
                        <tr style="background:#f5f5f5;border-bottom:2px solid var(--border);">
                            <th style="padding:10px 12px;font-weight:700;white-space:nowrap;text-align:center;">No.</th>
                            <th style="padding:10px 12px;font-weight:700;">Uraian</th>
                            <th style="padding:10px 12px;"></th>
                            <th style="padding:10px 12px;font-weight:700;text-align:right;white-space:nowrap;">Jumlah (Rp)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>`;
    }

    function loadPosisiKeuanganNeraca() {
        const container = document.getElementById('posisi-keuangan-neraca-table-container');
        if (!container) return;

        container.innerHTML = `<div style="text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Menyusun posisi keuangan / neraca...</div>`;

        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        const params = new URLSearchParams({
            session_slug: sessionSlug,
            t: String(Date.now()),
        });
        const unitUsahaId = getActiveWorkbookUnitUsahaId(['posisi-keuangan-neraca-unit-filter']);
        if (unitUsahaId) {
            params.set('unit_usaha_id', unitUsahaId);
        }

        Promise.all([
            fetch('/api/jurnal?' + params.toString()).then((res) => {
                if (!res.ok) throw new Error('Gagal memuat jurnal');
                return res.json();
            }),
            fetch('/api/coas?session_slug=' + encodeURIComponent(sessionSlug) + '&t=' + Date.now()).then((res) => {
                if (!res.ok) throw new Error('Gagal memuat chart of accounts');
                return res.json();
            }),
        ])
            .then(([jurnalRows, coas]) => {
                const coaNameByCode = new Map();
                (Array.isArray(coas) ? coas : []).forEach((coa) => {
                    const code = normalizeWorkbookAkunCode(coa && (coa.kode_akun || coa.kodeAkun));
                    const name = String(coa && (coa.nama_akun || coa.namaAkun) || '').trim();
                    if (code && name && !coaNameByCode.has(code)) {
                        coaNameByCode.set(code, name);
                    }
                });

                const movementByCode = buildNeracaMovementByCode(jurnalRows, coaNameByCode);

                const asetCodesKas = ['1-1110', '1-1200', '1-1210', '1-1211', '1-1212'];
                const asetCodesPiutang = ['1-1300', '1-1310', '1-1320'];
                const asetCodesPersediaan = ['1-1400', '1-1410', '1-1420', '1-1440'];
                const asetCodesPerlengkapan = ['1-1500', '1-1510', '1-1520', '1-1530'];
                const asetCodesTidakLancar = ['1-2000', '1-2010', '1-2020', '1-2030', '1-2040', '1-2050', '1-2060', '1-2090', '1-2091', '1-2092', '1-2093', '1-2094', '1-2095', '1-3000', '1-3010', '1-3020', '1-3090'];

                const kewajibanPendekCodes = ['2-1100', '2-1200', '2-1300', '2-1400', '2-1500'];
                const kewajibanPanjangCodes = ['2-2000', '2-2100', '2-2200', '2-2300'];

                const kasDanSetaraKas = getNeracaNetByCodes(asetCodesKas, movementByCode);
                const piutangUsaha = getNeracaNetByCodes(asetCodesPiutang, movementByCode);
                const persediaan = getNeracaNetByCodes(asetCodesPersediaan, movementByCode);
                const perlengkapanDanBiaya = getNeracaNetByCodes(asetCodesPerlengkapan, movementByCode);
                const totalAsetLancar = kasDanSetaraKas + piutangUsaha + persediaan + perlengkapanDanBiaya;

                const asetTidakLancar = getNeracaNetByCodes(asetCodesTidakLancar, movementByCode);
                const totalAsetTidakLancar = asetTidakLancar;
                const totalAset = totalAsetLancar + totalAsetTidakLancar;

                const utangJangkaPendek = -getNeracaNetByCodes(kewajibanPendekCodes, movementByCode);
                const utangJangkaPanjang = -getNeracaNetByCodes(kewajibanPanjangCodes, movementByCode);
                const totalKewajiban = utangJangkaPendek + utangJangkaPanjang;

                const getCreditMinusDebitByName = (name) => {
                    let debit = 0;
                    let kredit = 0;
                    movementByCode.forEach((movement, code) => {
                        const coaName = String(coaNameByCode.get(code) || '').trim();
                        if (coaName === name) {
                            debit += Number(movement.debit) || 0;
                            kredit += Number(movement.kredit) || 0;
                        }
                    });
                    return kredit - debit;
                };

                const getDebitMinusCreditByName = (name) => {
                    let debit = 0;
                    let kredit = 0;
                    movementByCode.forEach((movement, code) => {
                        const coaName = String(coaNameByCode.get(code) || '').trim();
                        if (coaName === name) {
                            debit += Number(movement.debit) || 0;
                            kredit += Number(movement.kredit) || 0;
                        }
                    });
                    return debit - kredit;
                };

                const penyertaanModalDesa = getCreditMinusDebitByName('Penyertaan Modal Desa');
                const penyertaanModalMasyarakat = getCreditMinusDebitByName('Penyertaan Modal Masyarakat');
                const penyertaanModalBkk = getCreditMinusDebitByName('Penyertaan Modal Bantuan Pemerintah/BKK');
                const tambahanPenyertaan = getCreditMinusDebitByName('Tambahan Penyertaan Modal');
                const ekuitasLainnya = getCreditMinusDebitByName('Ekuitas Lainnya');
                const labaDitahanAwal = getCreditMinusDebitByName('Laba Ditahan');
                const labaBersihSebelumBagiHasil = getDebitMinusCreditByName('Laba/Rugi Tahun Berjalan');
                const bagiHasilDesa = -getDebitMinusCreditByName('Bagi Hasil untuk Desa');
                const bagiHasilMasyarakat = -getDebitMinusCreditByName('Bagi Hasil untuk Masyarakat');
                const labaDitahanAkhir = labaDitahanAwal + labaBersihSebelumBagiHasil + bagiHasilDesa + bagiHasilMasyarakat;
                const ekuitasAkhir = penyertaanModalDesa + penyertaanModalMasyarakat + penyertaanModalBkk + tambahanPenyertaan + ekuitasLainnya + labaDitahanAkhir;

                const totalKewajibanDanEkuitas = totalKewajiban + ekuitasAkhir;
                const selisih = totalAset - totalKewajibanDanEkuitas;

                const rows = [
                    { no: 1, uraian: 'Aset', showValue: false, indent: 0 },
                    { no: 2, uraian: 'Aset Lancar', showValue: false, indent: 1 },
                    { no: 3, uraian: 'Kas dan Setara Kas', nilai: kasDanSetaraKas, showValue: true, indent: 2 },
                    { no: 4, uraian: 'Piutang Usaha', nilai: piutangUsaha, showValue: true, indent: 2 },
                    { no: 5, uraian: 'Persediaan', nilai: persediaan, showValue: true, indent: 2 },
                    { no: 6, uraian: 'Perlengkapan dan Biaya Dibayar di Muka', nilai: perlengkapanDanBiaya, showValue: true, indent: 2 },
                    { no: 7, uraian: 'Total Aset Lancar', nilai: totalAsetLancar, showValue: true, indent: 1, isSummary: true },
                    { no: 8, uraian: 'Aset Tidak Lancar', showValue: false, indent: 1 },
                    { no: 9, uraian: 'Aset Tetap, Investasi, dan Aset Lainnya', nilai: asetTidakLancar, showValue: true, indent: 2 },
                    { no: 10, uraian: 'Total Aset Tidak Lancar', nilai: totalAsetTidakLancar, showValue: true, indent: 1, isSummary: true },
                    { no: 11, uraian: 'TOTAL ASET', nilai: totalAset, showValue: true, indent: 0, isSummary: true },
                    { no: 12, uraian: 'KEWAJIBAN', showValue: false, indent: 0 },
                    { no: 13, uraian: 'Utang Jangka Pendek', nilai: utangJangkaPendek, showValue: true, indent: 1 },
                    { no: 14, uraian: 'Utang Jangka Panjang', nilai: utangJangkaPanjang, showValue: true, indent: 1 },
                    { no: 15, uraian: 'TOTAL KEWAJIBAN', nilai: totalKewajiban, showValue: true, indent: 0, isSummary: true },
                    { no: 16, uraian: 'EKUITAS', showValue: false, indent: 0 },
                    { no: 17, uraian: 'Ekuitas Akhir', nilai: ekuitasAkhir, showValue: true, indent: 1, isSummary: true },
                    { no: 18, uraian: 'TOTAL KEWAJIBAN DAN EKUITAS', nilai: totalKewajibanDanEkuitas, showValue: true, indent: 0, isSummary: true },
                    { no: 19, uraian: 'SELISIH (TOTAL ASET - KEWAJIBAN & EKUITAS)', nilai: selisih, showValue: true, indent: 0, isSummary: true, isDiff: true },
                ];

                const maxDate = (Array.isArray(jurnalRows) ? jurnalRows : []).reduce((latest, row) => {
                    const current = new Date(row && row.tanggal ? row.tanggal : 0);
                    if (isNaN(current.getTime())) return latest;
                    return (!latest || current > latest) ? current : latest;
                }, null);
                const selectedUnitOption = document.querySelector('#posisi-keuangan-neraca-unit-filter option:checked');
                const selectedUnitLabel = selectedUnitOption ? selectedUnitOption.textContent : 'Semua Unit Usaha';
                const fallbackProfile = String(localStorage.getItem('sibumdes_profile_name') || '-').trim() || '-';
                const profileFromJurnal = (Array.isArray(jurnalRows) ? jurnalRows : []).find((row) => String(row && row.profile_bumdes_name || '').trim());
                const profileName = String(profileFromJurnal && profileFromJurnal.profile_bumdes_name || fallbackProfile);

                renderPosisiKeuanganNeracaTable({
                    profileName,
                    periodLabel: maxDate
                        ? `PER ${String(maxDate.getDate()).padStart(2, '0')} ${maxDate.toLocaleDateString('id-ID', { month: 'long' }).toUpperCase()} ${maxDate.getFullYear()}`
                        : 'PER -',
                    selectedUnitLabel,
                    rows,
                });
            })
            .catch((err) => {
                console.error(err);
                container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-exclamation-circle fa-3x" style="margin-bottom:16px;"></i><p>Gagal memuat posisi keuangan / neraca.</p></div>`;
            });
    }

    function loadPosisiKeuanganNeracaView() {
        loadWorkbookUnitFilterOptions('posisi-keuangan-neraca-unit-filter');
        loadPosisiKeuanganNeraca();
    }

    function parseArusKasAkunSide(rawValue) {
        const info = parseJurnalAkunDisplay(rawValue);
        const raw = String(rawValue || '').trim();
        const code = String(info.code || '').toLowerCase();
        const name = String(info.name || '').toLowerCase();
        const merged = `${raw} ${info.code || ''} ${info.name || ''}`.toLowerCase();
        return { raw, code, name, merged };
    }

    function parseArusKasNarrative(row) {
        return `${String(row && row.deskripsi_transaksi || '')} ${String(row && row.keterangan || '')}`.toLowerCase();
    }

    function isArusKasKasAtauBank(side) {
        return side.merged.includes('kas') || side.merged.includes('bank');
    }

    function arusKasContains(side, keyword) {
        return side.merged.includes(String(keyword || '').toLowerCase());
    }

    function arusKasCodeStartsWith(side, prefix) {
        const normalizedPrefix = String(prefix || '').toLowerCase();
        return !!normalizedPrefix && String(side.code || '').startsWith(normalizedPrefix);
    }

    function sumArusKasByRows(jurnalRows, predicate) {
        return (Array.isArray(jurnalRows) ? jurnalRows : []).reduce((sum, row) => {
            const debitSide = parseArusKasAkunSide(row && row.akun_debit);
            const kreditSide = parseArusKasAkunSide(row && row.akun_kredit);
            const narrative = parseArusKasNarrative(row);
            const amount = Number(row && (row.nominal_debit || row.nominal_kredit)) || 0;
            if (amount <= 0) return sum;
            return predicate({ debitSide, kreditSide, narrative, amount, row }) ? (sum + amount) : sum;
        }, 0);
    }

    function renderLaporanArusKasTable(payload) {
        const container = document.getElementById('laporan-arus-kas-table-container');
        if (!container) return;

        const profileName = String(payload && payload.profileName || '-').toUpperCase();
        const periodLabel = String(payload && payload.periodLabel || 'UNTUK PERIODE YANG BERAKHIR PADA BULAN -').toUpperCase();
        const selectedUnitLabel = String(payload && payload.selectedUnitLabel || '').trim();
        const currentYear = String(payload && payload.currentYear || '-');
        const rows = Array.isArray(payload && payload.rows) ? payload.rows : [];

        if (rows.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-money-bill-transfer fa-3x" style="margin-bottom:16px;"></i><p>Belum ada data laporan arus kas.</p></div>`;
            return;
        }

        const rowsHtml = rows.map((row) => `
            <tr style="border-bottom:1px solid var(--border);background:${row.isSummary ? '#f8fafc' : '#fff'};">
                <td style="padding:10px 12px;text-align:center;color:var(--text-secondary);font-weight:${row.isSummary ? '700' : '500'};">${escapeHtml(String(row.no || ''))}</td>
                <td style="padding:10px 12px;color:var(--text-primary);font-weight:${row.isSummary ? '700' : '500'};padding-left:${12 + (row.indent || 0) * 16}px;">${escapeHtml(row.uraian || '-')}</td>
                <td style="padding:10px 12px;text-align:right;white-space:nowrap;color:${row.isDiff ? '#b91c1c' : 'var(--text-primary)'};font-weight:${row.isSummary || row.isDiff ? '700' : '600'};">${row.showValue ? escapeHtml(formatJurnalWorkbookCurrency(row.nilai || 0)) : ''}</td>
            </tr>`).join('');

        container.innerHTML = `
            <div style="overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-md);">
                <table class="data-table" style="width:100%;border-collapse:collapse;text-align:left;min-width:920px;">
                    <thead>
                        <tr>
                            <th colspan="3" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-align:center;">${escapeHtml(profileName)}</th>
                        </tr>
                        <tr>
                            <th colspan="3" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-align:center;">LAPORAN ARUS KAS</th>
                        </tr>
                        <tr>
                            <th colspan="3" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-align:center;">${escapeHtml(periodLabel)}</th>
                        </tr>
                        <tr>
                            <th colspan="3" style="background:#eef6ea;padding:12px 16px;border:1px solid var(--border);font-weight:600;text-align:center;">(dalam rupiah)</th>
                        </tr>
                        ${selectedUnitLabel && selectedUnitLabel.toLowerCase() !== 'semua unit usaha' ? `
                        <tr>
                            <th colspan="3" style="background:#f8fafc;padding:10px 16px;border:1px solid var(--border);font-weight:600;text-align:left;">Unit Usaha: ${escapeHtml(selectedUnitLabel)}</th>
                        </tr>` : ''}
                        <tr style="background:#f5f5f5;border-bottom:2px solid var(--border);">
                            <th style="padding:10px 12px;font-weight:700;white-space:nowrap;text-align:center;">Nomor Urut</th>
                            <th style="padding:10px 12px;font-weight:700;">Uraian</th>
                            <th style="padding:10px 12px;font-weight:700;text-align:right;white-space:nowrap;">${escapeHtml(currentYear)}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>`;
    }

    function loadLaporanArusKas() {
        const container = document.getElementById('laporan-arus-kas-table-container');
        if (!container) return;

        container.innerHTML = `<div style="text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Menyusun laporan arus kas...</div>`;

        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        const params = new URLSearchParams({
            session_slug: sessionSlug,
            t: String(Date.now()),
        });
        const unitUsahaId = getActiveWorkbookUnitUsahaId(['laporan-arus-kas-unit-filter']);
        if (unitUsahaId) {
            params.set('unit_usaha_id', unitUsahaId);
        }

        Promise.all([
            fetch('/api/jurnal?' + params.toString()).then((res) => {
                if (!res.ok) throw new Error('Gagal memuat jurnal');
                return res.json();
            }),
            fetch('/api/coas?session_slug=' + encodeURIComponent(sessionSlug) + '&t=' + Date.now()).then((res) => {
                if (!res.ok) throw new Error('Gagal memuat chart of accounts');
                return res.json();
            }),
        ])
            .then(([jurnalRows, coas]) => {
                const coaNameByCode = new Map();
                (Array.isArray(coas) ? coas : []).forEach((coa) => {
                    const code = normalizeWorkbookAkunCode(coa && (coa.kode_akun || coa.kodeAkun));
                    const name = String(coa && (coa.nama_akun || coa.namaAkun) || '').trim();
                    if (code && name && !coaNameByCode.has(code)) {
                        coaNameByCode.set(code, name);
                    }
                });

                const operasiMasukJasa = sumArusKasByRows(jurnalRows, ({ debitSide, kreditSide }) =>
                    isArusKasKasAtauBank(debitSide) && arusKasContains(kreditSide, 'pendapatan jasa')
                );
                const operasiMasukBarangDagang = sumArusKasByRows(jurnalRows, ({ debitSide, kreditSide }) =>
                    isArusKasKasAtauBank(debitSide) && arusKasContains(kreditSide, 'pendapatan penjualan barang dagangan')
                );
                const operasiMasukBarangJadi = sumArusKasByRows(jurnalRows, ({ debitSide, kreditSide }) =>
                    isArusKasKasAtauBank(debitSide) && arusKasContains(kreditSide, 'pendapatan penjualan hasil produksi')
                );
                const operasiMasukBungaDanDeviden = 0;
                const operasiMasukBungaBank = sumArusKasByRows(jurnalRows, ({ debitSide, kreditSide }) =>
                    isArusKasKasAtauBank(debitSide) && arusKasContains(kreditSide, 'pendapatan bunga bank')
                );
                const totalOperasiMasuk = operasiMasukJasa + operasiMasukBarangDagang + operasiMasukBarangJadi + operasiMasukBungaDanDeviden + operasiMasukBungaBank;

                const operasiKeluarPemasok = sumArusKasByRows(jurnalRows, ({ debitSide, kreditSide }) =>
                    isArusKasKasAtauBank(kreditSide) && (arusKasContains(debitSide, 'utang usaha') || arusKasContains(debitSide, 'persediaan'))
                );
                const operasiKeluarPegawai = sumArusKasByRows(jurnalRows, ({ debitSide, kreditSide }) =>
                    isArusKasKasAtauBank(kreditSide) && arusKasContains(debitSide, 'beban pegawai')
                );
                const operasiKeluarPajak = sumArusKasByRows(jurnalRows, ({ debitSide, kreditSide }) =>
                    isArusKasKasAtauBank(kreditSide) && arusKasContains(debitSide, 'beban pajak')
                );
                const operasiKeluarBunga = sumArusKasByRows(jurnalRows, ({ debitSide, kreditSide }) =>
                    isArusKasKasAtauBank(kreditSide) && arusKasContains(debitSide, 'beban bunga')
                );
                const operasiKeluarBebanLain = sumArusKasByRows(jurnalRows, ({ debitSide, kreditSide }) =>
                    isArusKasKasAtauBank(kreditSide) && arusKasCodeStartsWith(debitSide, '5-')
                ) - operasiKeluarPegawai - operasiKeluarPajak - operasiKeluarBunga;
                const totalOperasiKeluar = operasiKeluarPemasok + operasiKeluarPegawai + operasiKeluarPajak + operasiKeluarBunga + operasiKeluarBebanLain;
                const arusBersihOperasi = totalOperasiMasuk - totalOperasiKeluar;

                const investasiMasukJualAsetTetap = sumArusKasByRows(jurnalRows, ({ debitSide, kreditSide, narrative }) =>
                    isArusKasKasAtauBank(debitSide) && arusKasCodeStartsWith(kreditSide, '1-20') && narrative.includes('jual')
                );
                const investasiMasukLainnya = sumArusKasByRows(jurnalRows, ({ debitSide, kreditSide }) =>
                    isArusKasKasAtauBank(debitSide) && arusKasContains(kreditSide, 'investasi')
                );
                const totalInvestasiMasuk = investasiMasukJualAsetTetap + investasiMasukLainnya;

                const investasiKeluarBeliAsetTetap = sumArusKasByRows(jurnalRows, ({ debitSide, kreditSide }) =>
                    isArusKasKasAtauBank(kreditSide) && arusKasCodeStartsWith(debitSide, '1-20')
                );
                const investasiKeluarLainnya = sumArusKasByRows(jurnalRows, ({ debitSide, kreditSide }) =>
                    isArusKasKasAtauBank(kreditSide) && arusKasContains(debitSide, 'investasi')
                );
                const totalInvestasiKeluar = investasiKeluarBeliAsetTetap + investasiKeluarLainnya;
                const arusBersihInvestasi = totalInvestasiMasuk - totalInvestasiKeluar;

                const pembiayaanMasukModalDesa = sumArusKasByRows(jurnalRows, ({ debitSide, kreditSide }) =>
                    isArusKasKasAtauBank(debitSide) && arusKasContains(kreditSide, 'penyertaan modal desa')
                );
                const pembiayaanMasukModalMasyarakat = sumArusKasByRows(jurnalRows, ({ debitSide, kreditSide }) =>
                    isArusKasKasAtauBank(debitSide) && arusKasContains(kreditSide, 'penyertaan modal masyarakat')
                );
                const pembiayaanMasukUtangPanjang = sumArusKasByRows(jurnalRows, ({ debitSide, kreditSide }) =>
                    isArusKasKasAtauBank(debitSide) && arusKasContains(kreditSide, 'utang jangka panjang')
                );
                const totalPembiayaanMasuk = pembiayaanMasukModalDesa + pembiayaanMasukModalMasyarakat + pembiayaanMasukUtangPanjang;

                const pembiayaanKeluarBagiHasilDesa = sumArusKasByRows(jurnalRows, ({ debitSide, kreditSide }) =>
                    isArusKasKasAtauBank(kreditSide) && arusKasContains(debitSide, 'bagi hasil untuk desa')
                );
                const pembiayaanKeluarBagiHasilMasyarakat = sumArusKasByRows(jurnalRows, ({ debitSide, kreditSide }) =>
                    isArusKasKasAtauBank(kreditSide) && arusKasContains(debitSide, 'bagi hasil untuk masyarakat')
                );
                const pembiayaanKeluarPokokUtangPanjang = sumArusKasByRows(jurnalRows, ({ debitSide, kreditSide }) =>
                    isArusKasKasAtauBank(kreditSide) && arusKasContains(debitSide, 'utang jangka panjang')
                );
                const totalPembiayaanKeluar = pembiayaanKeluarBagiHasilDesa + pembiayaanKeluarBagiHasilMasyarakat + pembiayaanKeluarPokokUtangPanjang;
                const arusBersihPembiayaan = totalPembiayaanMasuk - totalPembiayaanKeluar;

                const kenaikanPenurunanKas = arusBersihOperasi + arusBersihInvestasi + arusBersihPembiayaan;

                const movementByCode = buildNeracaMovementByCode(jurnalRows, coaNameByCode);
                const kasDanBankCodes = ['1-1110', '1-1200', '1-1210', '1-1211', '1-1212'];
                const saldoKasAkhir = getNeracaNetByCodes(kasDanBankCodes, movementByCode);
                const saldoKasAwal = saldoKasAkhir - kenaikanPenurunanKas;

                const rows = [
                    { no: 1, uraian: 'ARUS KAS DARI AKTIVITAS OPERASI', showValue: false, indent: 0 },
                    { no: 2, uraian: 'Arus Kas Masuk', showValue: false, indent: 1 },
                    { no: 3, uraian: 'Penerimaan kas dari penjualan jasa', nilai: operasiMasukJasa, showValue: true, indent: 2 },
                    { no: 4, uraian: 'Penerimaan kas dari penjualan barang dagangan', nilai: operasiMasukBarangDagang, showValue: true, indent: 2 },
                    { no: 5, uraian: 'Penerimaan kas dari penjualan barang jadi', nilai: operasiMasukBarangJadi, showValue: true, indent: 2 },
                    { no: 6, uraian: 'Penerimaan kas dari bunga dan deviden', nilai: operasiMasukBungaDanDeviden, showValue: true, indent: 2 },
                    { no: 7, uraian: 'Penerimaan kas dari bunga bank', nilai: operasiMasukBungaBank, showValue: true, indent: 2 },
                    { no: 8, uraian: 'Jumlah arus kas masuk dari aktivitas operasi', nilai: totalOperasiMasuk, showValue: true, indent: 1, isSummary: true },
                    { no: 9, uraian: 'Arus Kas Keluar', showValue: false, indent: 1 },
                    { no: 10, uraian: 'Pengeluaran kas untuk pembayaran ke pemasok barang', nilai: operasiKeluarPemasok, showValue: true, indent: 2 },
                    { no: 11, uraian: 'Pengeluaran kas untuk pembayaran gaji/upah pegawai/karyawan', nilai: operasiKeluarPegawai, showValue: true, indent: 2 },
                    { no: 12, uraian: 'Pengeluaran kas untuk pembayaran pajak', nilai: operasiKeluarPajak, showValue: true, indent: 2 },
                    { no: 13, uraian: 'Pengeluaran kas untuk pembayaran bunga', nilai: operasiKeluarBunga, showValue: true, indent: 2 },
                    { no: 14, uraian: 'Pengeluaran kas untuk pembayaran beban-beban yang lain', nilai: operasiKeluarBebanLain, showValue: true, indent: 2 },
                    { no: 15, uraian: 'Jumlah arus kas keluar dari aktivitas operasi', nilai: totalOperasiKeluar, showValue: true, indent: 1, isSummary: true },
                    { no: 16, uraian: 'Arus kas bersih dari aktivitas operasi', nilai: arusBersihOperasi, showValue: true, indent: 1, isSummary: true },
                    { no: 17, uraian: '', showValue: false, indent: 0 },
                    { no: 18, uraian: 'ARUS KAS DARI AKTIVITAS INVESTASI', showValue: false, indent: 0 },
                    { no: 19, uraian: 'Arus Kas Masuk', showValue: false, indent: 1 },
                    { no: 20, uraian: 'Penerimaan Kas dari Penjualan Aset Tetap', nilai: investasiMasukJualAsetTetap, showValue: true, indent: 2 },
                    { no: 21, uraian: 'Penerimaan Kas dari Investasi', nilai: investasiMasukLainnya, showValue: true, indent: 2 },
                    { no: 22, uraian: 'Jumlah arus kas masuk dari aktivitas Investasi', nilai: totalInvestasiMasuk, showValue: true, indent: 1, isSummary: true },
                    { no: 23, uraian: 'Arus Kas Keluar', showValue: false, indent: 1 },
                    { no: 24, uraian: 'Pengeluaran Kas untuk Pembelian Aset Tetap', nilai: investasiKeluarBeliAsetTetap, showValue: true, indent: 2 },
                    { no: 25, uraian: 'Pengeluaran Kas untuk Investasi', nilai: investasiKeluarLainnya, showValue: true, indent: 2 },
                    { no: 26, uraian: 'Jumlah arus kas keluar dari aktivitas Investasi', nilai: totalInvestasiKeluar, showValue: true, indent: 1, isSummary: true },
                    { no: 27, uraian: 'Arus kas bersih dari aktivitas Investasi', nilai: arusBersihInvestasi, showValue: true, indent: 1, isSummary: true },
                    { no: 28, uraian: '', showValue: false, indent: 0 },
                    { no: 29, uraian: 'ARUS KAS DARI AKTIVITAS PEMBIAYAAN', showValue: false, indent: 0 },
                    { no: 30, uraian: 'Arus Kas Masuk', showValue: false, indent: 1 },
                    { no: 31, uraian: 'Penerimaan kas dari penyertaan modal desa', nilai: pembiayaanMasukModalDesa, showValue: true, indent: 2 },
                    { no: 32, uraian: 'Penerimaan kas dari penyertaan modal masyarakat', nilai: pembiayaanMasukModalMasyarakat, showValue: true, indent: 2 },
                    { no: 33, uraian: 'Penerimaan kas dari utang jangka panjang', nilai: pembiayaanMasukUtangPanjang, showValue: true, indent: 2 },
                    { no: 34, uraian: 'Jumlah arus kas masuk dari aktivitas Pembiayaan', nilai: totalPembiayaanMasuk, showValue: true, indent: 1, isSummary: true },
                    { no: 35, uraian: 'Arus Kas Keluar', showValue: false, indent: 1 },
                    { no: 36, uraian: 'Pembayaran bagi hasil penyertaan modal desa', nilai: pembiayaanKeluarBagiHasilDesa, showValue: true, indent: 2 },
                    { no: 37, uraian: 'Pembayaran bagi hasil penyertaan modal masyarakat', nilai: pembiayaanKeluarBagiHasilMasyarakat, showValue: true, indent: 2 },
                    { no: 38, uraian: 'Pembayaran pokok utang jangka panjang', nilai: pembiayaanKeluarPokokUtangPanjang, showValue: true, indent: 2 },
                    { no: 39, uraian: 'Jumlah arus kas keluar dari aktivitas Pembiayaan', nilai: totalPembiayaanKeluar, showValue: true, indent: 1, isSummary: true },
                    { no: 40, uraian: 'Arus kas bersih dari aktivitas Pembiayaan', nilai: arusBersihPembiayaan, showValue: true, indent: 1, isSummary: true },
                    { no: 41, uraian: '', showValue: false, indent: 0 },
                    { no: 42, uraian: 'Kenaikan (penurunan) Kas', nilai: kenaikanPenurunanKas, showValue: true, indent: 0, isSummary: true },
                    { no: 43, uraian: 'Saldo kas awal tahun', nilai: saldoKasAwal, showValue: true, indent: 0 },
                    { no: 44, uraian: 'Saldo kas akhir tahun', nilai: saldoKasAkhir, showValue: true, indent: 0, isSummary: true },
                ];

                const maxDate = (Array.isArray(jurnalRows) ? jurnalRows : []).reduce((latest, row) => {
                    const current = new Date(row && row.tanggal ? row.tanggal : 0);
                    if (isNaN(current.getTime())) return latest;
                    return (!latest || current > latest) ? current : latest;
                }, null);
                const currentYear = maxDate ? String(maxDate.getFullYear()) : String(new Date().getFullYear());
                const selectedUnitOption = document.querySelector('#laporan-arus-kas-unit-filter option:checked');
                const selectedUnitLabel = selectedUnitOption ? selectedUnitOption.textContent : 'Semua Unit Usaha';
                const fallbackProfile = String(localStorage.getItem('sibumdes_profile_name') || '-').trim() || '-';
                const profileFromJurnal = (Array.isArray(jurnalRows) ? jurnalRows : []).find((row) => String(row && row.profile_bumdes_name || '').trim());
                const profileName = String(profileFromJurnal && profileFromJurnal.profile_bumdes_name || fallbackProfile);

                renderLaporanArusKasTable({
                    profileName,
                    periodLabel: maxDate
                        ? `UNTUK PERIODE YANG BERAKHIR PADA BULAN ${maxDate.toLocaleDateString('id-ID', { month: 'long' }).toUpperCase()} ${maxDate.getFullYear()}`
                        : 'UNTUK PERIODE YANG BERAKHIR PADA BULAN -',
                    selectedUnitLabel,
                    currentYear,
                    rows,
                });
            })
            .catch((err) => {
                console.error(err);
                container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-exclamation-circle fa-3x" style="margin-bottom:16px;"></i><p>Gagal memuat laporan arus kas.</p></div>`;
            });
    }

    function loadLaporanArusKasView() {
        loadWorkbookUnitFilterOptions('laporan-arus-kas-unit-filter');
        loadLaporanArusKas();
    }

    function renderJurnalRekapitulasiTable(rows) {
        const container = document.getElementById('jurnal-rekap-table-container');
        if(!container) return;

        if(!rows || rows.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-book fa-3x" style="margin-bottom:16px;"></i><p>Belum ada data jurnal rekapitulasi.</p></div>`;
            return;
        }

        const formatCurrency = (n) => {
            const num = Number(n || 0);
            return new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', minimumFractionDigits:0 }).format(num);
        };

        let totalDebit = 0;
        let totalKredit = 0;
        rows.forEach((row) => {
            totalDebit += Number(row.debit || 0);
            totalKredit += Number(row.kredit || 0);
        });

        let tableHTML = `
            <div style="overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-md);">
                <table class="data-table" style="width:100%;border-collapse:collapse;text-align:left;min-width:760px;">
                    <thead>
                        <tr>
                            <th colspan="4" style="background:#dcedc8;padding:12px 16px;border:1px solid var(--border);font-weight:700;text-transform:uppercase;white-space:nowrap;">REKAPITULASI JURNAL</th>
                        </tr>
                        <tr style="background:#f5f5f5;border-bottom:2px solid var(--border);">
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);white-space:nowrap;">Kode Akun</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);">Nama Akun</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:right;white-space:nowrap;">Debit</th>
                            <th style="padding:12px;font-weight:600;color:var(--text-primary);text-align:right;white-space:nowrap;">Kredit</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        rows.forEach(r => {
            tableHTML += `
                <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:12px;color:var(--text-secondary);white-space:nowrap;">${escapeHtml(r.kode_akun || '-')}</td>
                    <td style="padding:12px;color:var(--text-primary);font-weight:500;">${escapeHtml(r.nama_akun || '-')}</td>
                    <td style="padding:12px;text-align:right;color:var(--text-primary);font-weight:600;white-space:nowrap;">${formatCurrency(r.debit)}</td>
                    <td style="padding:12px;text-align:right;color:var(--text-primary);font-weight:600;white-space:nowrap;">${formatCurrency(r.kredit)}</td>
                </tr>
            `;
        });

        tableHTML += `
                    </tbody>
                    <tfoot>
                        <tr style="border-top:2px solid var(--border);background:#fff;">
                            <td colspan="2" style="padding:12px;color:var(--text-primary);font-weight:700;text-align:right;">TOTAL</td>
                            <td style="padding:12px;background:#fff59d;color:var(--text-primary);font-weight:700;text-align:right;white-space:nowrap;">${formatCurrency(totalDebit)}</td>
                            <td style="padding:12px;background:#fff59d;color:var(--text-primary);font-weight:700;text-align:right;white-space:nowrap;">${formatCurrency(totalKredit)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;

        container.innerHTML = tableHTML;
    }

    const transaksiUnitFilter = document.getElementById('transaksi-filter-unit-usaha');
    if (transaksiUnitFilter) {
        transaksiUnitFilter.addEventListener('change', function() {
            transaksiDataViewState.selectedUnitId = this.value || 'all';
            renderTransaksiDataTable(getFilteredTransaksiDataViewItems());
        });
    }

    const jurnalUnitFilter = document.getElementById('jurnal-unit-filter');
    if (jurnalUnitFilter) {
        jurnalUnitFilter.addEventListener('change', function() {
            jurnalViewState.selectedUnitId = this.value || 'all';
            renderJurnalWorkbookTable(getFilteredJurnalRows());
        });
    }

    const jurnalRekapUnitFilter = document.getElementById('jurnal-rekap-unit-filter');
    if (jurnalRekapUnitFilter) {
        jurnalRekapUnitFilter.addEventListener('change', function() {
            loadJurnalRekapitulasi();
        });
    }

    const historiAkunUnitFilter = document.getElementById('histori-akun-unit-filter');
    if (historiAkunUnitFilter) {
        historiAkunUnitFilter.addEventListener('change', function() {
            loadHistoriAkun();
        });
    }

    const jurnalPenyesuaianUnitFilter = document.getElementById('jurnal-penyesuaian-unit-filter');
    if (jurnalPenyesuaianUnitFilter) {
        jurnalPenyesuaianUnitFilter.addEventListener('change', function() {
            loadJurnalPenyesuaian();
        });
    }

    const jurnalPenyesuaianRekapUnitFilter = document.getElementById('jurnal-penyesuaian-rekap-unit-filter');
    if (jurnalPenyesuaianRekapUnitFilter) {
        jurnalPenyesuaianRekapUnitFilter.addEventListener('change', function() {
            loadJurnalPenyesuaianRekap();
        });
    }

    const neracaSaldoSetelahPenyesuaianUnitFilter = document.getElementById('neraca-saldo-setelah-penyesuaian-unit-filter');
    if (neracaSaldoSetelahPenyesuaianUnitFilter) {
        neracaSaldoSetelahPenyesuaianUnitFilter.addEventListener('change', function() {
            loadNeracaSaldoSetelahPenyesuaian();
        });
    }

    const laporanLabaRugiUnitFilter = document.getElementById('laporan-laba-rugi-unit-filter');
    if (laporanLabaRugiUnitFilter) {
        laporanLabaRugiUnitFilter.addEventListener('change', function() {
            loadLaporanLabaRugi();
        });
    }

    const laporanPenyertaanModalUnitFilter = document.getElementById('laporan-penyertaan-modal-unit-filter');
    if (laporanPenyertaanModalUnitFilter) {
        laporanPenyertaanModalUnitFilter.addEventListener('change', function() {
            loadLaporanPenyertaanModal();
        });
    }

    const laporanPerubahanModalUnitFilter = document.getElementById('laporan-perubahan-modal-unit-filter');
    if (laporanPerubahanModalUnitFilter) {
        laporanPerubahanModalUnitFilter.addEventListener('change', function() {
            loadLaporanPerubahanModal();
        });
    }

    const posisiKeuanganNeracaUnitFilter = document.getElementById('posisi-keuangan-neraca-unit-filter');
    if (posisiKeuanganNeracaUnitFilter) {
        posisiKeuanganNeracaUnitFilter.addEventListener('change', function() {
            loadPosisiKeuanganNeraca();
        });
    }

    const laporanArusKasUnitFilter = document.getElementById('laporan-arus-kas-unit-filter');
    if (laporanArusKasUnitFilter) {
        laporanArusKasUnitFilter.addEventListener('change', function() {
            loadLaporanArusKas();
        });
    }

    // ─── Mapping Transaksi CRUD ──────────────────────────────────────────────

    function loadMappingTransaksi() {
        const containers = [
            document.getElementById('mapping-transaksi-table-container'),
            document.getElementById('mapping-transaksi-form-table-container'),
        ].filter(Boolean);
        if (containers.length === 0) return;
        containers.forEach((container) => {
            container.innerHTML = `<div style="text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat data...</div>`;
        });
        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        const mappingContext = applyMappingContextToView();
        const jenisMapping = mappingContext ? mappingContext.apiValue : 'harian';
        fetch('/api/mapping-transaksis?session_slug=' + sessionSlug + '&jenis_mapping=' + encodeURIComponent(jenisMapping) + '&t=' + new Date().getTime())
            .then(res => res.json())
            .then(data => renderMappingTransaksiTable(data || []))
            .catch(() => {
                containers.forEach((container) => {
                    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fa-solid fa-exclamation-circle fa-3x" style="margin-bottom:16px;"></i><p>Gagal memuat data mapping transaksi.</p></div>`;
                });
            });
    }

    function renderMappingTransaksiTable(items) {
        const containers = [
            document.getElementById('mapping-transaksi-table-container'),
            document.getElementById('mapping-transaksi-form-table-container'),
        ].filter(Boolean);
        if (containers.length === 0) return;

        if (!items || items.length === 0) {
            containers.forEach((container) => {
                container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);">
                    <i class="fa-solid fa-link fa-3x" style="margin-bottom:16px;"></i>
                    <p>Belum ada data mapping transaksi terdaftar.</p>
                </div>`;
            });
            const mappingContext = getCurrentMappingContext();
            restorePendingMappingReturnState(mappingContext ? mappingContext.routeBase : '/mapping-transaksi');
            return;
        }

        const sortedItems = (Array.isArray(items) ? [...items] : []).sort((left, right) => {
            const leftUnit = Number((left && left.unit_usaha_id) || (left && left.unit_usaha && left.unit_usaha.ID) || Number.MAX_SAFE_INTEGER);
            const rightUnit = Number((right && right.unit_usaha_id) || (right && right.unit_usaha && right.unit_usaha.ID) || Number.MAX_SAFE_INTEGER);
            if (leftUnit !== rightUnit) {
                return leftUnit - rightUnit;
            }

            const leftDate = new Date(left && left.created_at ? left.created_at : 0).getTime();
            const rightDate = new Date(right && right.created_at ? right.created_at : 0).getTime();
            if (leftDate !== rightDate) {
                return leftDate - rightDate;
            }

            const leftId = Number((left && left.id) || 0);
            const rightId = Number((right && right.id) || 0);
            return leftId - rightId;
        });

        const renderLinkCheckbox = (checked) => `
            <input type="checkbox" ${checked ? 'checked' : ''} disabled style="width:16px;height:16px;accent-color:var(--primary);pointer-events:none;">
        `;

        const mappingContext = getCurrentMappingContext();
        const isNonRutin = mappingContext && mappingContext.apiValue === 'non_rutin';
        const isUmum = mappingContext && mappingContext.apiValue === 'umum';
        const isJurnal = mappingContext && mappingContext.apiValue === 'jurnal';
        const isUmumLike = isUmum || isJurnal;
        const showKategoriAfterCashFlow = mappingContext && mappingContext.apiValue === 'harian';
        const showJurnalPenyesuaianLink = isUmumLike;
        const mappingRouteBase = mappingContext ? mappingContext.routeBase : '/mapping-transaksi';
        const formatCashFlowLabel = (cashFlow) => {
            if (cashFlow === 'kas_keluar') return 'Kas Keluar';
            if (cashFlow === 'non_kas') return 'Non Kas';
            return 'Kas Masuk';
        };
        const formatKategoriLabel = (kategori) => {
            const normalized = String(kategori || '').trim();
            if (!normalized) return '-';
            if (normalized === 'Aktivitas Pendanaan') return 'Pembiayaan';
            return normalized.replace(/^Aktivitas\s+/i, '');
        };

        let tableHTML = `
            <div style="overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-md);">
                <table class="data-table" style="width:100%;border-collapse:collapse;text-align:left;min-width:${isNonRutin ? '1600px' : (showKategoriAfterCashFlow ? '1560px' : (showJurnalPenyesuaianLink ? '1320px' : '1200px'))};">
                    <thead>
                        <tr style="background:#f5f5f5;border-bottom:1px solid var(--border);">
                            <th rowspan="2" style="padding:10px 12px;font-weight:700;color:var(--text-primary);white-space:nowrap;border-right:1px solid var(--border);">No</th>
                            <th rowspan="2" style="padding:10px 12px;font-weight:700;color:var(--text-primary);white-space:nowrap;border-right:1px solid var(--border);">Unit Usaha</th>
                            <th rowspan="2" style="padding:10px 12px;font-weight:700;color:var(--text-primary);min-width:220px;border-right:1px solid var(--border);">Deskripsi</th>
                            <th rowspan="2" style="padding:10px 12px;font-weight:700;color:var(--text-primary);min-width:210px;border-right:1px solid var(--border);">Debit</th>
                            <th rowspan="2" style="padding:10px 12px;font-weight:700;color:var(--text-primary);min-width:260px;border-right:1px solid var(--border);">Kredit</th>
                            ${isUmumLike ? '<th rowspan="2" style="padding:10px 12px;font-weight:700;color:var(--text-primary);min-width:220px;border-right:1px solid var(--border);">Keterangan</th>' : '<th rowspan="2" style="padding:10px 12px;font-weight:700;color:var(--text-primary);min-width:120px;border-right:1px solid var(--border);">Cash Flow</th>'}
                            ${showKategoriAfterCashFlow ? '<th rowspan="2" style="padding:10px 12px;font-weight:700;color:var(--text-primary);min-width:140px;border-right:1px solid var(--border);">Kategori</th><th rowspan="2" style="padding:10px 12px;font-weight:700;color:var(--text-primary);min-width:240px;border-right:1px solid var(--border);">Sub Kategori</th>' : ''}
                            ${isNonRutin ? `
                            <th rowspan="2" style="padding:10px 12px;font-weight:700;color:var(--text-primary);min-width:140px;border-right:1px solid var(--border);">Kategori</th>
                            <th rowspan="2" style="padding:10px 12px;font-weight:700;color:var(--text-primary);min-width:280px;border-right:1px solid var(--border);">Sub Kategori</th>
                            ` : ''}
                            <th colspan="4" style="padding:10px 12px;font-weight:700;color:var(--text-primary);text-align:center;white-space:nowrap;border-right:1px solid var(--border);">Link Buku Pembantu</th>
                            ${showJurnalPenyesuaianLink ? '<th rowspan="2" style="padding:10px 12px;font-weight:700;color:var(--text-primary);text-align:center;white-space:nowrap;border-right:1px solid var(--border);">Jurnal Penyesuaian</th>' : ''}
                            <th rowspan="2" style="padding:10px 12px;font-weight:700;color:var(--text-primary);text-align:center;white-space:nowrap;border-left:1px solid var(--border);">
                                <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
                                    <span>Aksi</span>
                                    <button type="button" onclick="deleteAllMappingTransaksi()" title="Hapus Semua Data" style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;background:#ffebee;color:#c62828;border:none;cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                                </div>
                            </th>
                        </tr>
                        <tr style="background:#f5f5f5;border-bottom:2px solid var(--border);">
                            <th style="padding:10px 12px;font-weight:700;color:var(--text-primary);text-align:center;white-space:nowrap;border-right:1px solid var(--border);">BP Utang</th>
                            <th style="padding:10px 12px;font-weight:700;color:var(--text-primary);text-align:center;white-space:nowrap;border-right:1px solid var(--border);">BP Piutang</th>
                            <th style="padding:10px 12px;font-weight:700;color:var(--text-primary);text-align:center;white-space:nowrap;border-right:1px solid var(--border);">Kartu Persediaan</th>
                            <th style="padding:10px 12px;font-weight:700;color:var(--text-primary);text-align:center;white-space:nowrap;border-right:1px solid var(--border);">Kartu Aset Tetap (Inventaris)</th>
                        </tr>
                    </thead>
                    <tbody>`;

        sortedItems.forEach((m, idx) => {
            const unit = m.unit_usaha ? m.unit_usaha.NamaUnitUsaha : '-';
            const detailsList = Array.isArray(m.details) && m.details.length
                ? m.details
                : [{ akun_debet: m.akun_debet || '', akun_kredit: m.akun_kredit || '' }];
            const safeSlug = String(m.slug || '').replace(/'/g, "\\'");
            const editHref = `${mappingRouteBase}/edit/${encodeURIComponent(m.slug || '')}`;
            detailsList.forEach((detail, detailIdx) => {
                const rowBackground = detailIdx % 2 === 0 ? '#ffffff' : '#fbfdff';
                tableHTML += `
                <tr data-mapping-slug="${escapeHTML(m.slug || '')}" onclick="window.handleMappingTransaksiRowClick('${safeSlug}', event)" style="border-bottom:1px solid var(--border);cursor:pointer;background:${rowBackground};">
                    ${detailIdx === 0 ? `<td rowspan="${detailsList.length}" style="padding:10px 12px;color:var(--text-secondary);border-right:1px solid var(--border);vertical-align:top;">${idx + 1}</td>` : ''}
                    ${detailIdx === 0 ? `<td rowspan="${detailsList.length}" style="padding:10px 12px;color:var(--text-secondary);border-right:1px solid var(--border);white-space:nowrap;vertical-align:top;">${unit}</td>` : ''}
                    ${detailIdx === 0 ? `<td rowspan="${detailsList.length}" style="padding:10px 12px;font-weight:500;color:var(--text-primary);border-right:1px solid var(--border);vertical-align:top;">${m.nama_mapping || '-'}</td>` : ''}
                    <td style="padding:10px 12px;color:var(--text-secondary);border-right:1px solid var(--border);white-space:nowrap;">${escapeHTML(detail.akun_debet || '-')}</td>
                    <td style="padding:10px 12px;color:var(--text-secondary);border-right:1px solid var(--border);white-space:nowrap;">${escapeHTML(detail.akun_kredit || '-')}</td>
                    ${isUmumLike ? `<td style="padding:10px 12px;color:var(--text-secondary);border-right:1px solid var(--border);">${escapeHTML(m.keterangan || '-')}</td>` : `<td style="padding:10px 12px;color:var(--text-secondary);border-right:1px solid var(--border);white-space:nowrap;">${formatCashFlowLabel(m.cash_in_out)}</td>`}
                    ${showKategoriAfterCashFlow ? `<td style="padding:10px 12px;color:var(--text-secondary);border-right:1px solid var(--border);white-space:nowrap;">${formatKategoriLabel(m.klasifikasi_arus_kas)}</td><td style="padding:10px 12px;color:var(--text-secondary);border-right:1px solid var(--border);">${m.kategori_arus_kas || '-'}</td>` : ''}
                    ${isNonRutin ? `
                    <td style="padding:10px 12px;color:var(--text-secondary);border-right:1px solid var(--border);white-space:nowrap;">${formatKategoriLabel(m.klasifikasi_arus_kas)}</td>
                    <td style="padding:10px 12px;color:var(--text-secondary);border-right:1px solid var(--border);">${m.kategori_arus_kas || '-'}</td>
                    ` : ''}
                    <td style="padding:10px 12px;text-align:center;border-right:1px solid var(--border);">${renderLinkCheckbox(detail.link_bk_utang != null ? !!detail.link_bk_utang : !!m.link_bk_utang)}</td>
                    <td style="padding:10px 12px;text-align:center;border-right:1px solid var(--border);">${renderLinkCheckbox(detail.link_bk_piutang != null ? !!detail.link_bk_piutang : !!m.link_bk_piutang)}</td>
                    <td style="padding:10px 12px;text-align:center;border-right:1px solid var(--border);">${renderLinkCheckbox(detail.link_persediaan != null ? !!detail.link_persediaan : !!m.link_persediaan)}</td>
                    <td style="padding:10px 12px;text-align:center;border-right:1px solid var(--border);">${renderLinkCheckbox(detail.link_aset_tetap != null ? !!detail.link_aset_tetap : !!m.link_aset_tetap)}</td>
                    ${showJurnalPenyesuaianLink ? `<td style="padding:10px 12px;text-align:center;border-right:1px solid var(--border);">${renderLinkCheckbox(!!m.link_jurnal_penyesuaian)}</td>` : ''}
                    <td data-no-row-click="true" style="padding:10px 12px;text-align:center;white-space:nowrap;border-left:1px solid var(--border);">
                        <a href="${editHref}" data-link data-no-row-click="true" onclick="window.prepareMappingTransaksiReturn('${safeSlug}'); event.stopPropagation();" title="Edit" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:6px;background:#e3f2fd;color:#1976d2;margin-right:6px;text-decoration:none;"><i class="fa-solid fa-pen"></i></a>
                        <button type="button" data-no-row-click="true" onclick="deleteMappingTransaksi('${safeSlug}')" title="Hapus" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:6px;background:#ffebee;color:#c62828;border:none;cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>`;
            });
        });

        tableHTML += `</tbody></table></div>`;
        containers.forEach((container) => {
            container.innerHTML = tableHTML;
        });
        restorePendingMappingReturnState(mappingRouteBase);
    }

    function editMappingTransaksiData(slug) {
        const mappingContext = getCurrentMappingContext();
        const jenisMapping = mappingContext ? mappingContext.apiValue : 'harian';
        fetch('/api/mapping-transaksi?slug=' + encodeURIComponent(slug) + '&jenis_mapping=' + encodeURIComponent(jenisMapping))
            .then(res => res.json())
            .then(data => {
                if (!data || !data.id) { navigateTo(mappingContext ? mappingContext.routeBase : '/mapping-transaksi'); return; }
                document.getElementById('mapping_transaksi_slug').value = data.slug || '';
                document.getElementById('mapping_nama').value = data.nama_mapping || '';
                document.getElementById('mapping_klasifikasi_arus_kas').value = data.klasifikasi_arus_kas || '';
                document.getElementById('mapping_cash_in_out').value = data.cash_in_out || '';
                document.getElementById('mapping_kategori_arus_kas').value = data.kategori_arus_kas || '';
                const detailRows = Array.isArray(data.details) && data.details.length
                    ? data.details.map(d => ({
                        akun_debet: d.akun_debet || '',
                        akun_kredit: d.akun_kredit || '',
                        link_aset_tetap: !!d.link_aset_tetap,
                        link_persediaan: !!d.link_persediaan,
                        link_bk_utang: !!d.link_bk_utang,
                        link_bk_piutang: !!d.link_bk_piutang,
                    }))
                    : [{
                        akun_debet: data.akun_debet || '',
                        akun_kredit: data.akun_kredit || '',
                        link_aset_tetap: !!data.link_aset_tetap,
                        link_persediaan: !!data.link_persediaan,
                        link_bk_utang: !!data.link_bk_utang,
                        link_bk_piutang: !!data.link_bk_piutang,
                    }];
                resetMappingJournalRows(detailRows);
                loadMappingCoaAccountOptions(data.akun_debet || '', data.akun_kredit || '');
                document.getElementById('mapping_tipe_default').value = data.tipe_default || 'semua';
                document.getElementById('mapping_keterangan').value = data.keterangan || '';
                const jurnalPenyesuaianCheckbox = document.getElementById('mapping_link_jurnal_penyesuaian');
                if (jurnalPenyesuaianCheckbox) jurnalPenyesuaianCheckbox.checked = !!data.link_jurnal_penyesuaian;
                // Set unit usaha after dropdown loads
                const setUnit = () => {
                    const sel = document.getElementById('mapping_unit_usaha_id');
                    if (sel && data.unit_usaha_id) sel.value = data.unit_usaha_id;
                };
                setTimeout(setUnit, 500);
            })
            .catch(() => { showToast('Gagal memuat data mapping.', true); navigateTo(mappingContext ? mappingContext.routeBase : '/mapping-transaksi'); });
    }

    window.handleMappingTransaksiRowClick = function(slug, event) {
        const target = event && event.target ? event.target : null;
        if (target && target.closest('button, a, input, select, textarea, label, [data-no-row-click="true"]')) {
            return;
        }
        if (slug) {
            const mappingContext = getCurrentMappingContext() || getCurrentMappingContext('/mapping-transaksi');
            window.prepareMappingTransaksiReturn(slug);
            navigateTo(`${mappingContext ? mappingContext.routeBase : '/mapping-transaksi'}/edit/${encodeURIComponent(slug)}`);
        }
    };

    window.deleteMappingTransaksi = function(slug) {
        window.showConfirmModal('Yakin ingin menghapus mapping transaksi ini?', function() {
            const mappingContext = getCurrentMappingContext();
            const jenisMapping = mappingContext ? mappingContext.apiValue : 'harian';
            fetch('/api/mapping-transaksi?slug=' + encodeURIComponent(slug) + '&jenis_mapping=' + encodeURIComponent(jenisMapping), { method: 'DELETE' })
                .then(res => {
                    if (res.ok) {
                        showToast('Mapping transaksi berhasil dihapus');
                        loadMappingTransaksi();
                    } else {
                        res.text().then(t => showToast('Gagal menghapus: ' + t, true));
                    }
                })
                .catch(err => showToast('Kesalahan jaringan: ' + err.message, true));
        });
    };

    window.deleteAllMappingTransaksi = function() {
        const mappingContext = getCurrentMappingContext();
        const jenisMapping = mappingContext ? mappingContext.apiValue : 'harian';
        const label = mappingContext ? mappingContext.heading : 'mapping transaksi';
        window.showConfirmModal('Yakin ingin menghapus semua data ' + label + '?', function() {
            fetch('/api/mapping-transaksis?jenis_mapping=' + encodeURIComponent(jenisMapping), { method: 'DELETE' })
                .then(async (res) => {
                    if (res.ok) {
                        showToast('Semua data mapping berhasil dihapus');
                        loadMappingTransaksi();
                        return;
                    }
                    const message = await res.text();
                    showToast('Gagal menghapus semua data: ' + message, true);
                })
                .catch((err) => showToast('Kesalahan jaringan: ' + err.message, true));
        });
    };

    window.deleteTransaksi = function(id) {
        window.showConfirmModal('Yakin ingin menghapus transaksi ini?', function() {
            fetch('/api/transaksi?id=' + id, { method: 'DELETE' })
                .then(res => {
                    if (res.ok) {
                        showToast('Transaksi berhasil dihapus');
                        loadTransaksiHistory();
                        loadTransaksiDataView();
                    } else {
                        res.text().then(t => showToast('Gagal menghapus: ' + t, true));
                    }
                })
                .catch(err => showToast('Kesalahan jaringan: ' + err.message, true));
        });
    };

    window.editTransaksi = function(id) {
        const existingTx = findTransaksiRecordById(id);
        if (existingTx) {
            openEditTransaksiModal(existingTx);
            return;
        }

        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        fetch('/api/transaksis?session_slug=' + sessionSlug + '&t=' + new Date().getTime())
            .then(res => res.json())
            .then(data => {
                const tx = (data || []).find(t => Number(t.id) === Number(id));
                if (!tx) { showToast('Data tidak ditemukan', true); return; }
                openEditTransaksiModal(tx);
            })
            .catch(err => showToast('Gagal memuat data: ' + err.message, true));
    };

    window.handleTransaksiRowClick = function(id, event) {
        const target = event && event.target ? event.target : null;
        if (target && target.closest('button, a, input, select, textarea, label, [data-no-row-click="true"]')) {
            return;
        }
        editTransaksi(id);
    };

    window.toggleTransaksiValidasi = function(id) {
        if (isOperatorDataTransaksiRole()) return;

        const toggleButtons = Array.from(document.querySelectorAll(`button[data-role="transaksi-validasi-toggle"][data-transaksi-id="${String(id)}"]`));
        toggleButtons.forEach((button) => {
            button.disabled = true;
            button.style.opacity = '0.7';
            button.style.cursor = 'wait';
        });

        const existingTx = (transaksiDataViewState.items || []).find((item) => Number(item.id) === Number(id));

        const resolveTransaksi = existingTx
            ? Promise.resolve(existingTx)
            : (() => {
                const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
                return fetch('/api/transaksis?session_slug=' + sessionSlug + '&t=' + new Date().getTime())
                    .then(res => {
                        if (!res.ok) {
                            throw new Error('Gagal memuat transaksi');
                        }
                        return res.json();
                    })
                    .then((data) => {
                        const tx = (data || []).find((item) => Number(item.id) === Number(id));
                        if (!tx) {
                            throw new Error('Data transaksi tidak ditemukan');
                        }
                        return tx;
                    });
            })();

        resolveTransaksi
            .then((tx) => {
                const nextValidasi = normalizeTransaksiValidasiLabel(tx.validasi) === 'Sudah' ? 'Belum' : 'Sudah';
                const payload = buildTransaksiUpdatePayload(tx, { validasi: nextValidasi });

                return fetch('/api/transaksi?id=' + id, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).then(async (res) => {
                    if (!res.ok) {
                        throw new Error(await res.text() || 'Gagal mengubah validasi');
                    }
                    updateTransaksiValidasiState(id, nextValidasi);
                    updateTransaksiValidasiButtons(id, nextValidasi);
                    showToast('Validasi transaksi diperbarui');
                });
            })
            .catch((err) => {
                console.error('Failed to toggle transaksi validasi', err);
                toggleButtons.forEach((button) => {
                    button.disabled = false;
                    button.style.opacity = '1';
                    button.style.cursor = 'pointer';
                });
                showToast('Gagal mengubah validasi: ' + err.message, true);
            });
    };

    window.validateAllTransaksi = function() {
        if (isOperatorDataTransaksiRole()) return;

        const transaksiToValidate = (getFilteredTransaksiDataViewItems() || []).filter((item) => normalizeTransaksiValidasiLabel(item.validasi) !== 'Sudah');
        if (!transaksiToValidate.length) {
            showToast('Tidak ada transaksi yang perlu divalidasi.', true);
            return;
        }

        window.showConfirmModal(`Validasi ${transaksiToValidate.length} transaksi menjadi Sudah?`, async () => {
            const bulkButton = document.querySelector('button[data-role="transaksi-validasi-all"]');
            const toggleButtons = Array.from(document.querySelectorAll('button[data-role="transaksi-validasi-toggle"]'));

            if (bulkButton) {
                bulkButton.disabled = true;
                bulkButton.style.opacity = '0.7';
                bulkButton.style.cursor = 'wait';
            }

            toggleButtons.forEach((button) => {
                button.disabled = true;
                button.style.opacity = '0.7';
                button.style.cursor = 'wait';
            });

            try {
                let successCount = 0;
                let failedCount = 0;

                for (const tx of transaksiToValidate) {
                    try {
                        const payload = buildTransaksiUpdatePayload(tx, { validasi: 'Sudah' });
                        const res = await fetch('/api/transaksi?id=' + tx.id, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });

                        if (!res.ok) {
                            throw new Error(await res.text() || 'Gagal mengubah validasi');
                        }

                        updateTransaksiValidasiState(tx.id, 'Sudah');
                        updateTransaksiValidasiButtons(tx.id, 'Sudah');
                        successCount += 1;
                    } catch (err) {
                        failedCount += 1;
                        console.error('Failed to bulk validate transaksi', tx.id, err);
                    }
                }

                rerenderLocalTransaksiViews();

                if (failedCount > 0) {
                    showToast(`${successCount} transaksi berhasil divalidasi, ${failedCount} gagal.`, true);
                } else {
                    showToast('Semua transaksi berhasil divalidasi.');
                }
            } catch (err) {
                console.error('Failed to validate all transaksi', err);
                showToast('Gagal validasi semua transaksi: ' + err.message, true);
            } finally {
                if (bulkButton) {
                    bulkButton.disabled = false;
                    bulkButton.style.opacity = '1';
                    bulkButton.style.cursor = 'pointer';
                }

                toggleButtons.forEach((button) => {
                    button.disabled = false;
                    button.style.opacity = '1';
                    button.style.cursor = 'pointer';
                });
            }
        }, { confirmText: 'Ya, Validasi' });
    };

    function openEditTransaksiModal(tx) {
        const existing = document.getElementById('edit-transaksi-modal');
        if (existing) existing.remove();

        const tanggal = tx.tanggal ? tx.tanggal.split('T')[0] : '';
        const unitUsahaName = tx.unit_usaha && tx.unit_usaha.NamaUnitUsaha ? tx.unit_usaha.NamaUnitUsaha : '-';
        const showValidasiField = !isOperatorDataTransaksiRole();
        const validasiValue = String(tx.validasi || 'Belum').trim().toLowerCase() === 'sudah' ? 'Sudah' : 'Belum';
        const modal = document.createElement('div');
        modal.id = 'edit-transaksi-modal';
        modal.className = 'modal-overlay transaksi-edit-modal-overlay';
        modal.innerHTML = `
            <div class="modal-content transaksi-edit-modal-content">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
                    <h3 style="margin:0;font-size:1.3rem;color:var(--text-primary);">Edit Transaksi</h3>
                    <button id="edit-tx-close" type="button" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:var(--text-secondary);">&times;</button>
                </div>
                <div class="transaksi-edit-modal-table-wrap" style="border:1px solid var(--border);border-radius:8px;margin-bottom:20px;">
                    <table style="width:100%;border-collapse:collapse;text-align:left;min-width:980px;">
                        <thead>
                            <tr>
                                <th colspan="2" style="background-color:#dcedc8;padding:12px 16px;border:1px solid var(--border);font-weight:600;text-transform:uppercase;font-size:0.9rem;">INPUT TRANSAKSI HARIAN</th>
                                <th colspan="2" style="background-color:#dcedc8;padding:12px 16px;border:1px solid var(--border);font-weight:600;text-align:right;text-transform:uppercase;font-size:0.9rem;">UNIT USAHA: <span style="display:inline-flex;align-items:center;background:#ffffff;border:1px solid #ccc;border-radius:20px;padding:6px 14px;margin-left:12px;font-weight:600;text-align:center;font-size:0.9rem;min-width:160px;justify-content:center;">${escapeHTML(unitUsahaName)}</span></th>
                            </tr>
                            <tr style="background-color:#f0f4f0;border-bottom:2px solid var(--border);">
                                <th style="padding:12px 16px;font-weight:700;color:var(--text-primary);text-transform:uppercase;font-size:0.85rem;width:14%;">Tanggal</th>
                                <th style="padding:12px 16px;font-weight:700;color:var(--text-primary);text-transform:uppercase;font-size:0.85rem;width:36%;">Nama Pelanggan/Pemasok</th>
                                <th style="padding:12px 16px;font-weight:700;color:var(--text-primary);text-transform:uppercase;font-size:0.85rem;width:42%;">Keterangan</th>
                                <th style="padding:12px 16px;font-weight:700;color:var(--text-primary);text-transform:uppercase;font-size:0.85rem;width:8%;text-align:center;">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr data-row-type="main" style="background-color:#f9faf9;border-bottom:1px solid var(--border);">
                                <td style="padding:12px 16px;border-right:1px solid var(--border);">
                                    <input id="edit-tx-tanggal" type="date" value="${tanggal}" style="width:100%;border:1px solid #ddd;background:#ffffff;padding:6px 8px;border-radius:4px;font-weight:500;font-size:0.9rem;" required>
                                </td>
                                <td style="padding:12px 16px;border-right:1px solid var(--border);">
                                    <div style="display:grid;grid-template-columns:170px minmax(0, 1fr);gap:8px;align-items:center;">
                                        <select id="edit-tx-partner-type" data-field="partner-type" style="width:100%;background:#ffffff;border:1px solid #ddd;border-radius:6px;padding:7px 10px;font-size:0.85rem;" autocomplete="off">
                                            <option value="pelanggan">Pelanggan</option>
                                            <option value="supplier">Supplier / Pemasok</option>
                                        </select>
                                        <input id="edit-tx-nama" data-field="partner-name" type="text" value="${escapeHTML(tx.nama_pelanggan_pemasok || '')}" style="width:100%;background:#ffffff;border:1px solid #ddd;border-radius:6px;padding:8px 12px;font-size:0.9rem;" autocomplete="off">
                                    </div>
                                </td>
                                <td style="padding:12px 16px;border-right:1px solid var(--border);position:relative;">
                                    <input id="edit-tx-keterangan" data-field="keterangan" type="text" value="${escapeHTML(tx.keterangan || '')}" style="width:100%;border:1px solid #ddd;background:#ffffff;padding:6px 104px 6px 8px;border-radius:4px;font-size:0.9rem;" required>
                                    <div data-field="ai-loading" style="display:none; align-items:center; gap:6px; position:absolute; right:20px; top:50%; transform:translateY(-50%); padding:4px 8px; border-radius:999px; background:rgba(29, 78, 216, 0.08); border:1px solid rgba(29, 78, 216, 0.16);">
                                        <span style="font-size:0.68rem; font-weight:700; letter-spacing:0.2px; color:#1d4ed8;">AI</span>
                                        <span style="display:block; width:52px; height:6px; border-radius:999px; background:linear-gradient(90deg, rgba(29,78,216,0.18) 0%, rgba(59,130,246,0.95) 35%, rgba(147,197,253,1) 50%, rgba(59,130,246,0.95) 65%, rgba(29,78,216,0.18) 100%); background-size:200% 100%; animation:transaksiAiProgress 1.15s linear infinite;"></span>
                                    </div>
                                </td>
                                <td style="padding:12px 16px;text-align:center;">
                                    <button id="edit-tx-delete" type="button" style="border:none;background:none;cursor:pointer;color:#999;font-size:1.2rem;title:Hapus;" title="Hapus"><i class="fa-solid fa-trash"></i></button>
                                </td>
                            </tr>
                            <tr data-row-type="detail" style="background:#f7fbff;border-bottom:1px solid var(--border);">
                                <td colspan="4" style="padding:10px 16px 12px 16px;border-top:none;">
                                    <div style="display:grid;grid-template-columns:${showValidasiField ? '1.4fr 1fr 1fr 0.8fr 0.7fr 0.7fr 0.7fr' : '1.4fr 1fr 1fr 0.8fr 0.7fr 0.7fr'};gap:10px;align-items:start;">
                                        <div>
                                            <div data-field="mapping-select-wrap" style="display:block; margin-top:8px;">
                                                <div style="font-size:0.74rem;font-weight:600;letter-spacing:0.3px;color:#1d4ed8;margin-bottom:4px;">Pilihan Mapping</div>
                                                <input id="edit-tx-mapping-search" type="text" data-field="mapping-search" style="width:100%; background:#ffffff; border:1px solid #c7d2fe; border-radius:6px; padding:7px 10px; font-size:0.82rem; color:#334155;" placeholder="Cari atau pilih mapping..." autocomplete="off">
                                                <div data-field="mapping-dropdown" style="display:none; margin-top:4px; max-height:220px; overflow:auto; border:1px solid #c7d2fe; border-radius:8px; background:#ffffff; box-shadow:0 12px 24px rgba(15, 23, 42, 0.12);"></div>
                                                <div data-field="mapping-selected-meta" style="margin-top:6px; font-size:0.72rem; font-weight:600; color:var(--text-secondary);">Belum ada mapping yang dipilih</div>
                                                <select id="edit-tx-mapping" data-field="mapping-select" style="display:none;">
                                                    <option value="">-</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <div style="font-size:0.74rem;font-weight:600;letter-spacing:0.3px;color:var(--text-secondary);margin-bottom:4px;">Debit</div>
                                            <input id="edit-tx-debet" data-field="akun-debet" type="text" value="${escapeHTML(tx.akun_debet || '')}" style="width:100%;border:1px solid #ddd;background:#f8fafc;padding:7px 10px;border-radius:6px;font-size:0.84rem;color:#334155;" placeholder="otomatis dari mapping..." readonly>
                                        </div>
                                        <div>
                                            <div style="font-size:0.74rem;font-weight:600;letter-spacing:0.3px;color:var(--text-secondary);margin-bottom:4px;">Kredit</div>
                                            <input id="edit-tx-kredit" data-field="akun-kredit" type="text" value="${escapeHTML(tx.akun_kredit || '')}" style="width:100%;border:1px solid #ddd;background:#f8fafc;padding:7px 10px;border-radius:6px;font-size:0.84rem;color:#334155;" placeholder="otomatis dari mapping..." readonly>
                                        </div>
                                        <div>
                                            <div style="font-size:0.74rem;font-weight:600;letter-spacing:0.3px;color:var(--text-secondary);margin-bottom:4px;">Nominal</div>
                                            <input id="edit-tx-nominal" data-field="nominal" type="number" value="${tx.nominal || 0}" style="width:100%;border:1px solid #ddd;background:#ffffff;padding:7px 10px;border-radius:6px;text-align:right;font-weight:500;font-size:0.86rem;" required>
                                        </div>
                                        <div>
                                            <div style="font-size:0.74rem;font-weight:600;letter-spacing:0.3px;color:var(--text-secondary);margin-bottom:4px;">Kas Masuk/Kas Keluar</div>
                                            <select id="edit-tx-tipe" data-field="tipe-kas" style="width:100%;background:#ffffff;border:1px solid #ddd;border-radius:6px;padding:7px 8px;font-weight:500;font-size:0.86rem;text-align:center;cursor:pointer;" required>
                                                <option value="">-</option>
                                                <option value="tambah" ${tx.tipe_kas === 'tambah' ? 'selected' : ''}>Kas Masuk</option>
                                                <option value="kurang" ${tx.tipe_kas === 'kurang' ? 'selected' : ''}>Kas Keluar</option>
                                            </select>
                                        </div>
                                        <div>
                                            <div style="font-size:0.74rem;font-weight:600;letter-spacing:0.3px;color:var(--text-secondary);margin-bottom:4px;">Tunai/Kredit</div>
                                            <select id="edit-tx-status-bayar" data-field="status-bayar" style="width:100%;background:#ffffff;border:1px solid #ddd;border-radius:6px;padding:7px 8px;font-weight:500;font-size:0.86rem;text-align:center;cursor:pointer;" required>
                                                <option value="tunai" ${tx.status_bayar !== 'kredit' ? 'selected' : ''}>Tunai</option>
                                                <option value="kredit" ${tx.status_bayar === 'kredit' ? 'selected' : ''}>Kredit</option>
                                            </select>
                                        </div>
                                        ${showValidasiField ? `<div>
                                            <div style="font-size:0.74rem;font-weight:600;letter-spacing:0.3px;color:var(--text-secondary);margin-bottom:4px;">Validasi</div>
                                            <select id="edit-tx-validasi" data-field="validasi" style="width:100%;background:#ffffff;border:1px solid #ddd;border-radius:6px;padding:7px 8px;font-weight:500;font-size:0.86rem;text-align:center;cursor:pointer;">
                                                <option value="Belum" ${validasiValue === 'Belum' ? 'selected' : ''}>Belum</option>
                                                <option value="Sudah" ${validasiValue === 'Sudah' ? 'selected' : ''}>Sudah</option>
                                            </select>
                                        </div>` : ''}
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button id="edit-tx-cancel" type="button" style="padding:10px 24px;border:1px solid var(--border);border-radius:6px;background:#fff;cursor:pointer;font-size:0.9rem;font-weight:500;">Batal</button>
                    <button id="edit-tx-save" type="button" style="padding:10px 24px;border:none;border-radius:6px;background:var(--primary);color:#fff;cursor:pointer;font-size:0.9rem;font-weight:600;">Simpan Perubahan</button>
                </div>
                <datalist id="edit-tx-pelanggan-list"></datalist>
                <datalist id="edit-tx-supplier-list"></datalist>
            </div>
        `;
        document.body.appendChild(modal);

        const closeModal = () => modal.remove();
        document.getElementById('edit-tx-cancel').onclick = closeModal;
        document.getElementById('edit-tx-close').onclick = closeModal;
        modal.addEventListener('click', function(e) { if (e.target === modal) closeModal(); });

        const sessionSlug = localStorage.getItem('sibumdes_auth') || '';
        const mainRow = modal.querySelector('tr[data-row-type="main"]');
        const detailRow = modal.querySelector('tr[data-row-type="detail"]');
        const namaInput = modal.querySelector('#edit-tx-nama');
        const partnerTypeSelect = modal.querySelector('#edit-tx-partner-type');
        const keteranganInput = modal.querySelector('#edit-tx-keterangan');
        const nominalInput = modal.querySelector('#edit-tx-nominal');
        const tipeKasSelect = modal.querySelector('#edit-tx-tipe');
        const statusBayarSelect = modal.querySelector('#edit-tx-status-bayar');
        const pelangganList = modal.querySelector('#edit-tx-pelanggan-list');
        const supplierList = modal.querySelector('#edit-tx-supplier-list');
        let currentPartnerData = { pelanggans: [], suppliers: [] };

        if (mainRow) {
            mainRow.dataset.unitUsahaId = String(tx.unit_usaha_id || '');
        }

        const syncEditPartnerInputSource = () => {
            if (!partnerTypeSelect || !namaInput) return;
            const partnerType = partnerTypeSelect.value === 'supplier' ? 'supplier' : 'pelanggan';
            namaInput.setAttribute('list', partnerType === 'supplier' ? 'edit-tx-supplier-list' : 'edit-tx-pelanggan-list');
            namaInput.placeholder = partnerType === 'supplier'
                ? 'Pilih atau ketik nama supplier...'
                : 'Pilih atau ketik nama pelanggan...';
        };

        const fillPartnerDatalist = (target, items, fieldName, selectedUnitId) => {
            if (!target) return;
            const seenNames = new Set();
            target.innerHTML = '';
            (items || []).forEach((item) => {
                if (selectedUnitId && item.unit_usaha_id && Number(item.unit_usaha_id) !== Number(selectedUnitId)) {
                    return;
                }
                const name = String(item[fieldName] || '').trim();
                const key = normalizePelangganName(name);
                if (!name || seenNames.has(key)) return;
                seenNames.add(key);
                const option = document.createElement('option');
                option.value = name;
                target.appendChild(option);
            });
        };

        const inferCurrentPartnerType = (partnerName, pelanggans, suppliers, unitUsahaId) => {
            const normalizedName = normalizePelangganName(partnerName);
            if (!normalizedName) return 'pelanggan';

            const existsInSupplier = (suppliers || []).some((item) => {
                if (unitUsahaId && item.unit_usaha_id && Number(item.unit_usaha_id) !== Number(unitUsahaId)) return false;
                return normalizePelangganName(item.nama_supplier) === normalizedName;
            });
            if (existsInSupplier) return 'supplier';

            return 'pelanggan';
        };

        const populateEditPartnerData = async () => {
            const [pelangganRes, supplierRes] = await Promise.all([
                fetch('/api/pelanggans?session_slug=' + sessionSlug + '&t=' + new Date().getTime()),
                fetch('/api/suppliers?session_slug=' + sessionSlug + '&t=' + new Date().getTime())
            ]);
            if (!pelangganRes.ok || !supplierRes.ok) {
                throw new Error('Gagal memuat daftar partner');
            }

            const [pelanggans, suppliers] = await Promise.all([pelangganRes.json(), supplierRes.json()]);
            currentPartnerData = { pelanggans: pelanggans || [], suppliers: suppliers || [] };
            fillPartnerDatalist(pelangganList, currentPartnerData.pelanggans, 'nama_pelanggan', tx.unit_usaha_id);
            fillPartnerDatalist(supplierList, currentPartnerData.suppliers, 'nama_supplier', tx.unit_usaha_id);
            if (partnerTypeSelect) {
                partnerTypeSelect.value = inferCurrentPartnerType(tx.nama_pelanggan_pemasok, currentPartnerData.pelanggans, currentPartnerData.suppliers, tx.unit_usaha_id);
            }
            syncEditPartnerInputSource();
        };

        const loadExistingMappingForEdit = async () => {
            if (!mainRow) return;

            resetTransaksiMappingPreference(mainRow);
            mainRow.dataset.lastSemanticKeteranganKey = normalizeTransaksiMappingKey(tx.keterangan || '');

            const debitInput = detailRow ? detailRow.querySelector('[data-field="akun-debet"]') : null;
            const kreditInput = detailRow ? detailRow.querySelector('[data-field="akun-kredit"]') : null;

            try {
                const mappings = await fetchTransaksiMappingReferences();
                const availableMappings = sortTransaksiMappingsForPicker(mappings || []);

                mainRow._mappingCandidates = availableMappings;
                mainRow._semanticMappingCandidates = availableMappings;

                const selectedSlug = String(tx.mapping_slug || '').trim();
                const selectedJenis = normalizeTransaksiMappingKey(tx.mapping_jenis || '');
                const deskripsiKey = normalizeTransaksiMappingKey(tx.deskripsi || '');
                const selectedMapping = (selectedSlug
                    ? availableMappings.find((mapping) => String(mapping && mapping.slug || '').trim() === selectedSlug)
                    : null)
                    || (selectedJenis && deskripsiKey
                    ? availableMappings.find((mapping) => normalizeTransaksiMappingKey(mapping && mapping.jenis_mapping || '') === selectedJenis && normalizeTransaksiMappingKey(mapping && mapping.nama_mapping || '') === deskripsiKey)
                    : null)
                    || (deskripsiKey
                    ? availableMappings.find((mapping) => normalizeTransaksiMappingKey(mapping && mapping.nama_mapping || '') === deskripsiKey)
                    : null)
                    || availableMappings.find((mapping) => {
                        const detailOptions = getTransaksiMappingDetailOptions(mapping);
                        return detailOptions.some((detail) => (
                            normalizeTransaksiMappingKey(detail && detail.akun_debet || '') === normalizeTransaksiMappingKey(tx.akun_debet || '')
                            && normalizeTransaksiMappingKey(detail && detail.akun_kredit || '') === normalizeTransaksiMappingKey(tx.akun_kredit || '')
                        ));
                    })
                    || null;

                const preferredSlug = selectedMapping && selectedMapping.slug ? selectedMapping.slug : '';
                const preferredDetailIndex = selectedMapping
                    ? resolveTransaksiMappingDetailIndex(selectedMapping, tx.akun_debet || '', tx.akun_kredit || '')
                    : 0;

                mainRow.dataset.selectedMappingSlug = preferredSlug;
                mainRow.dataset.suggestedMappingSlug = preferredSlug;
                mainRow.dataset.selectedMappingDetailIndex = String(preferredDetailIndex);

                const syncedCandidate = syncTransaksiMappingSelectFromState(mainRow, preferredSlug, selectedMapping);
                applySelectedTransaksiMapping(mainRow, syncedCandidate || selectedMapping);
                hideTransaksiMappingAutocompleteDropdown(mainRow);
            } catch (error) {
                console.error('Failed to load existing transaksi mapping', error);
                applySelectedTransaksiMapping(mainRow, null);
            }

            const resolvedDebitInput = detailRow ? detailRow.querySelector('[data-field="akun-debet"]') : debitInput;
            const resolvedKreditInput = detailRow ? detailRow.querySelector('[data-field="akun-kredit"]') : kreditInput;
            if (resolvedDebitInput && !String(resolvedDebitInput.value || '').trim()) resolvedDebitInput.value = tx.akun_debet || '';
            if (resolvedKreditInput && !String(resolvedKreditInput.value || '').trim()) resolvedKreditInput.value = tx.akun_kredit || '';
        };

        if (partnerTypeSelect) {
            partnerTypeSelect.addEventListener('change', () => {
                syncEditPartnerInputSource();
            });
        }

        if (keteranganInput && mainRow) {
            keteranganInput.addEventListener('input', () => {
                const detailRow = getDetailRowForMainRow(mainRow);
                const nominalInput = detailRow ? detailRow.querySelector('[data-field="nominal"]') : null;
                const statusBayarSelect = detailRow ? detailRow.querySelector('[data-field="status-bayar"]') : null;
                const tipeKasSelect = detailRow ? detailRow.querySelector('[data-field="tipe-kas"]') : null;

                syncNamaPelangganFromKeterangan(mainRow);
                syncTransaksiDerivedInputsFromKeterangan(keteranganInput.value, {
                    nominalInput,
                    statusBayarSelect,
                    tipeKasSelect,
                });

                const normalizedKeterangan = normalizeTransaksiMappingKey(keteranganInput.value || '');
                if (mainRow.dataset.lastSemanticKeteranganKey !== normalizedKeterangan) {
                    resetTransaksiMappingPreference(mainRow);
                    mainRow.dataset.lastSemanticKeteranganKey = normalizedKeterangan;
                }

                refreshTransaksiMappingSuggestion(mainRow, String(mainRow.dataset.unitUsahaId || tx.unit_usaha_id || '').trim(), null, true);
                scheduleTransaksiAISuggestion(mainRow);
            });
        }

        if (detailRow && mainRow) {
            detailRow.addEventListener('input', (event) => {
                const target = event.target;
                if (!target || !target.dataset) return;
                if (target.dataset.field !== 'mapping-search') return;

                handleTransaksiMappingSearchInput(mainRow, target.value || '');
            });

            detailRow.addEventListener('focusin', (event) => {
                const target = event.target;
                if (!target || !target.dataset) return;
                if (target.dataset.field === 'mapping-search') {
                    handleTransaksiMappingSearchFocus(mainRow);
                    return;
                }
                if (target.dataset.field === 'mapping-select') {
                    handleTransaksiMappingSelectFocus(mainRow);
                }
            });

            detailRow.addEventListener('focusout', (event) => {
                const target = event.target;
                if (!target || !target.dataset || target.dataset.field !== 'mapping-search') return;
                setTimeout(() => hideTransaksiMappingAutocompleteDropdown(mainRow), 120);
            });

            detailRow.addEventListener('click', (event) => {
                const mappingOption = event.target.closest('[data-field="mapping-dropdown"] button[data-value]');
                if (mappingOption) {
                    const slug = mappingOption.getAttribute('data-value') || '';
                    const searchInput = detailRow.querySelector('[data-field="mapping-search"]');
                    handleTransaksiMappingDropdownClick(mainRow, searchInput, slug);
                    return;
                }

                const selectTarget = event.target.closest('[data-field="mapping-select"]');
                if (selectTarget) {
                    handleTransaksiMappingSelectFocus(mainRow);
                }
            });

            detailRow.addEventListener('change', (event) => {
                const target = event.target;
                if (!target || !target.dataset) return;
                if (target.dataset.field === 'mapping-select') {
                    const candidates = Array.isArray(mainRow._mappingCandidates) ? mainRow._mappingCandidates : [];
                    const selected = candidates.find((candidate) => candidate.slug === target.value) || null;
                    mainRow.dataset.selectedMappingSlug = selected ? (selected.slug || '') : '';
                    mainRow.dataset.suggestedMappingSlug = selected ? (selected.slug || '') : '';
                    applySelectedTransaksiMapping(mainRow, selected);
                    return;
                }
                if (target.dataset.field === 'akun-debet' || target.dataset.field === 'akun-kredit') {
                    const currentMapping = Array.isArray(mainRow._mappingCandidates)
                        ? mainRow._mappingCandidates.find((candidate) => candidate.slug === mainRow.dataset.selectedMappingSlug)
                        : null;
                    renderTransaksiMappingDetailFields(mainRow, currentMapping, Number(target.value || '0'));
                    return;
                }
            });
        }

        populateEditPartnerData().catch((error) => {
            console.error(error);
            syncEditPartnerInputSource();
        });
        loadExistingMappingForEdit();

        document.getElementById('edit-tx-delete').onclick = function() {
            showConfirmModal('Hapus transaksi ini secara permanen?', () => {
                fetch('/api/transaksi?id=' + tx.id, { method: 'DELETE' })
                    .then(res => {
                        if (res.ok) {
                            modal.remove();
                            showToast('Transaksi berhasil dihapus');
                            loadTransaksiHistory();
                            loadTransaksiDataView();
                        } else {
                            res.text().then(t => showToast('Gagal menghapus: ' + t, true));
                        }
                    })
                    .catch(err => showToast('Kesalahan jaringan: ' + err.message, true));
            });
        };

        document.getElementById('edit-tx-save').onclick = function() {
            const payloadBase = buildTransaksiUpdatePayload(tx, {
                tanggal: document.getElementById('edit-tx-tanggal').value,
                nama_pelanggan_pemasok: document.getElementById('edit-tx-nama').value,
                partner_type: document.getElementById('edit-tx-partner-type').value === 'supplier' ? 'supplier' : 'pelanggan',
                keterangan: document.getElementById('edit-tx-keterangan').value,
                deskripsi: resolveTransaksiDeskripsiForSubmit(mainRow, ''),
                mapping_slug: getSelectedTransaksiMappingIdentity(mainRow).mappingSlug,
                mapping_jenis: getSelectedTransaksiMappingIdentity(mainRow).mappingJenis,
                akun_debet: getSelectedTransaksiAccountValues(mainRow).akunDebet,
                akun_kredit: getSelectedTransaksiAccountValues(mainRow).akunKredit,
                validasi: showValidasiField ? ((document.getElementById('edit-tx-validasi') || {}).value || 'Belum') : (tx.validasi || 'Belum'),
                nominal: parseFloat(document.getElementById('edit-tx-nominal').value) || 0,
                tipe_kas: resolveTransaksiTipeKasForSubmit(mainRow, document.getElementById('edit-tx-tipe').value),
                status_bayar: document.getElementById('edit-tx-status-bayar').value,
            });

            if (!hasExplicitTransaksiMappingSelection(mainRow)) {
                showToast('Pilihan Mapping wajib dipilih terlebih dahulu', true);
                return;
            }

            if (!payloadBase.tanggal || !payloadBase.keterangan || isNaN(payloadBase.nominal) || payloadBase.nominal <= 0 || !payloadBase.tipe_kas) {
                showToast('Semua field harus diisi dengan benar', true);
                return;
            }

            const continueSave = async () => {
                let contactByName = {};
                try {
                    const existingPartnerSets = await fetchExistingPartnerNameSets(tx.unit_usaha_id);
                    const nama = payloadBase.nama_pelanggan_pemasok || '';
                    const partnerType = payloadBase.partner_type;
                    const namaKey = normalizePelangganName(nama);
                    const targetSet = partnerType === 'supplier' ? existingPartnerSets.supplierSet : existingPartnerSets.pelangganSet;
                    if (namaKey && !targetSet.has(namaKey)) {
                        const contactResult = await collectNewPelangganContacts([{ name: nama, partnerType }]);
                        if (!contactResult) {
                            showToast('Penyimpanan dibatalkan.', true);
                            return;
                        }
                        contactByName = contactResult;
                    }
                } catch (error) {
                    console.error('Failed to check edit partner existence', error);
                }

                const contactKey = buildTransaksiPartnerContactKey(payloadBase.nama_pelanggan_pemasok, payloadBase.partner_type);
                const contact = contactByName[contactKey] || { alamat: '', noTelepon: '', partnerType: payloadBase.partner_type };
                const payload = {
                    ...payloadBase,
                    alamat: contact.alamat || '',
                    no_telepon: contact.noTelepon || '',
                    partner_type: contact.partnerType || payloadBase.partner_type,
                };

                fetch('/api/transaksi?id=' + tx.id, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(res => {
                    if (res.ok) {
                        const updatedTx = mergeUpdatedTransaksiRecord(tx, payload);
                        applyUpdatedTransaksiRecord(updatedTx);
                        rerenderLocalTransaksiViews();
                        modal.remove();
                        showToast('Transaksi berhasil diperbarui');
                    } else {
                        res.text().then(t => showToast('Gagal menyimpan: ' + t, true));
                    }
                })
                .catch(err => showToast('Kesalahan jaringan: ' + err.message, true));
            };

            continueSave();
        };
    }

});
