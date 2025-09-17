// Dynamic filtered collection loader (plus version)
// Features:
// - Reads base configuration from attribute `wn-collection-filter-plus` (base64 JSON)
//   { blogId, order, colone, limit, joinTable, config, pagination, itemsPerPage }
// - Extracts URL query parameters as filters (except reserved like page)
// - Sends them to API as a query param `filters` (JSON string) => backend must handle
// - If host includes webflow.io => direct client rendering (no server HTML pre-render assumption)
// - Otherwise still client-side for now; placeholder for future server-render endpoint
// - Renders items similarly to collection-loader.js using a template `[wn-collection-box]`
// - Pagination (client-side) honored if token contains pagination & itemsPerPage
// NOTE: Backend must accept & parse the `filters` query param to actually filter.
(async function() {
	const apiUrl = "https://api-wenoble.wenoble.fr/";
	const scriptTag = document.currentScript;
	const userKey = scriptTag.getAttribute('data-user-id');
	const urlVideoBucket = "https://xgwszpuiiacukrvvtrze.supabase.co/storage/v1/object/public/collection-video//";
	const urlGalleryBucket = "https://xgwszpuiiacukrvvtrze.supabase.co/storage/v1/object/public/collection-gallery//";

	if (!userKey) {
		console.error('[collection-filter-plus] User Key manquant');
		return;
	}

	function decodeBase64(str) { try { return JSON.parse(atob(str)); } catch { return {}; } }
	function isWebflowPreview() { return window.location.hostname.includes('webflow.io'); }
	function getDateFormatOptions(formatString) {
		const options = {};
		if (!formatString) return options;
		formatString.split(' ').forEach(part => {
			switch (part.toLowerCase()) {
				case 'dd': options.day = '2-digit'; break;
				case 'mm': options.month = '2-digit'; break;
				case 'yyyy': options.year = 'numeric'; break;
				case 'yy': options.year = '2-digit'; break;
				case 'month': options.month = 'long'; break;
				case 'day': options.weekday = 'long'; break;
				default: break;
			}
		});
		return options;
	}

	// ---- Form filtering helpers ----
	function collectFilterInputs(form) {
		// Returns array of { key, value }
		const entries = [];
		const elements = Array.from(form.querySelectorAll('input[name], select[name], textarea[name], [data-id-config], [wn-filter-field]'));
		elements.forEach(el => {
			let values = [];
			const type = (el.getAttribute('type') || '').toLowerCase();
			if (el.tagName === 'SELECT' && el.multiple) {
				values = Array.from(el.selectedOptions).map(o => o.value).filter(v => v !== '');
			} else if (type === 'checkbox') {
				if (el.checked) values = [el.value];
			} else if (type === 'radio') {
				if (el.checked) values = [el.value]; else return;
			} else {
				const v = ('value' in el) ? el.value : '';
				if (v !== '') values = [v]; else return; // skip empty
			}

			if (values.length === 0) return;
			// Determine key: priority data-id-config / wn-filter-field / name
			let key = el.getAttribute('wn-filter-field');
			if (!key) key = el.getAttribute('data-id-config');
			if (!key) key = el.getAttribute('name');
			if (!key) return;
			values.forEach(v => entries.push({ key, value: v }));
		});
		return entries;
	}

	function buildFilteredUrl(baseUrl, filterEntries, idToNameMap) {
		// Start from current URL but remove page param and prior filter params we'll overwrite
		const url = new URL(baseUrl.href);
		url.searchParams.delete('page');
		// Build a set of keys we will manage
		const managedKeys = new Set();
		filterEntries.forEach(({ key }) => {
			// If key is an id_config convert to name_field via map
			const mapped = idToNameMap.get(key) || key; // fallback: treat as direct field name
			managedKeys.add(mapped);
		});
		// Remove existing values for managed keys
		managedKeys.forEach(k => url.searchParams.delete(k));
		// Append new entries
		filterEntries.forEach(({ key, value }) => {
			const mapped = idToNameMap.get(key) || key;
			url.searchParams.append(mapped, value);
		});
		return url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '');
	}

	function hydrateFormFromUrl(form, params, nameToIdMap) {
		// For convenience, set form fields if matching either name_field or id_config
		const allFields = Array.from(form.querySelectorAll('[data-id-config], [wn-filter-field], input[name], select[name], textarea[name]'));
		allFields.forEach(el => {
			let key = el.getAttribute('wn-filter-field') || el.getAttribute('data-id-config') || el.getAttribute('name');
			if (!key) return;
			// If element uses id_config, we need to map name_field -> id_config for lookup
			let paramValues;
			if (!params.has(key) && nameToIdMap.has(key)) {
				// key is name_field but element maybe uses id_config? We handle below
			}
			// If key looks like an id_config (UUID) attempt inverse mapping to name_field
			if (!params.has(key) && nameToIdMap) {
				// Try: if element has data-id-config (id) then find its name_field to pull values
				if (el.hasAttribute('data-id-config')) {
					const idc = el.getAttribute('data-id-config');
					const nameField = (idToNameGlobal.get && idToNameGlobal.get(idc)) || null;
					if (nameField && params.has(nameField)) {
						paramValues = params.getAll(nameField);
					}
				}
			}
			if (!paramValues && params.has(key)) {
				paramValues = params.getAll(key);
			}
			if (!paramValues || paramValues.length === 0) return;
			const type = (el.getAttribute('type') || '').toLowerCase();
			if (type === 'checkbox' || type === 'radio') {
				el.checked = paramValues.includes(el.value);
			} else if (el.tagName === 'SELECT' && el.multiple) {
				Array.from(el.options).forEach(opt => { opt.selected = paramValues.includes(opt.value); });
			} else {
				// Use first value
				el.value = paramValues[0];
			}
		});
	}

	// Global maps per blogId to avoid recomputation
	const configMapsCache = new Map(); // blogId -> { idToName: Map, nameToId: Map }
	const idToNameGlobal = new Map(); // merged for hydrate helper

	// Build filters from URL params (exclude reserved keys)
	function extractFilters() {
		const params = new URLSearchParams(window.location.search);
		const reserved = new Set(['page']);
		const filters = {};
		params.forEach((value, key) => {
			if (!reserved.has(key)) {
				// Support multiple values (repeat params)
				if (filters[key]) {
					if (Array.isArray(filters[key])) {
						filters[key].push(value);
					} else {
						filters[key] = [filters[key], value];
					}
				} else {
					filters[key] = value;
				}
			}
		});
		return filters;
	}

	async function fetchBlogPages(cfg) {
		const { blogId, order, colone, joinTable, config, limit, pagination } = cfg;
		const filters = extractFilters();
		const query = new URLSearchParams();
		if (order) query.set('order', order);
		if (colone) query.set('colone', colone);
		if (joinTable) query.set('joinTable', joinTable);
		if (config) query.set('configs', JSON.stringify(config));
		if (!pagination && (limit !== undefined && limit !== null)) query.set('limit', limit);
		if (Object.keys(filters).length) query.set('filters', JSON.stringify(filters));

		const resp = await fetch(`${apiUrl}/api/sendBlog?${query.toString()}`, {
			method: 'GET',
			headers: { 'api_key': userKey, 'ids': blogId }
		});
		if (!resp.ok) throw new Error(`API sendBlog error ${resp.status}`);
		return resp.json();
	}

	async function fetchBlogContent(collectionId, pageId) {
		const resp = await fetch(`${apiUrl}/api/sendBlogContent`, {
			method: 'GET',
			headers: { 'api_key': userKey, 'id_blog': collectionId, 'id_blog_page': pageId }
		});
		if (!resp.ok) throw new Error('API sendBlogContent error');
		return resp.json();
	}

	document.querySelectorAll('[wn-collection-filter-plus]').forEach(async wrapper => {
		if (wrapper.querySelector('.ssr-wn-collection-box')) return; // already processed

		const encoded = wrapper.getAttribute('wn-collection-filter-plus');
		const cfg = decodeBase64(encoded);
		const { blogId, pagination, itemsPerPage } = cfg;
		if (!blogId) { console.error('[collection-filter-plus] blogId manquant'); return; }

		// Build config maps from token cfg.config if provided
		let idToNameMap = new Map();
		let nameToIdMap = new Map();
		if (configMapsCache.has(blogId)) {
			({ idToName: idToNameMap, nameToId: nameToIdMap } = configMapsCache.get(blogId));
		} else {
			if (Array.isArray(cfg.config)) {
				cfg.config.forEach(c => {
					if (c.id && c.name_field) {
						idToNameMap.set(c.id, c.name_field);
						nameToIdMap.set(c.name_field, c.id);
						idToNameGlobal.set(c.id, c.name_field);
					}
				});
			}
			configMapsCache.set(blogId, { idToName: idToNameMap, nameToId: nameToIdMap });
		}

		// Form handling: locate a form within wrapper or linked via data-collection-id
		const form = wrapper.querySelector('form[wn-collection-filter-form]') || document.querySelector(`form[wn-collection-filter-form][data-collection-id="${blogId}"]`);
		if (form && !form.__wnFilterBound) {
			form.__wnFilterBound = true;
			// Hydrate existing values from URL
			try { hydrateFormFromUrl(form, new URLSearchParams(window.location.search), nameToIdMap); } catch {}
			form.addEventListener('submit', (ev) => {
				// Allow normal submit if form has native action override attribute
				if (!form.hasAttribute('data-wn-native-submit')) ev.preventDefault();
				const baseUrl = new URL(window.location.href);
				const inputs = collectFilterInputs(form);
				const finalUrl = buildFilteredUrl(baseUrl, inputs, idToNameMap);
				// Navigate (soft reload)
				window.location.href = finalUrl;
			});
		}

		const template = wrapper.querySelector('[wn-collection-box]');
		if (!template) { console.error('[collection-filter-plus] Template wn-collection-box manquant'); return; }

		let dataBlog;
		try {
			dataBlog = await fetchBlogPages(cfg);
		} catch (e) {
			console.error('[collection-filter-plus] Erreur récupération pages:', e); return;
		}

		const allItems = Array.isArray(dataBlog.blog) ? dataBlog.blog : [];
		if (!allItems.length) {
			const msg = document.createElement('div');
			msg.textContent = 'Aucun élément';
			msg.style.textAlign = 'center';
			msg.style.fontSize = '1rem';
			wrapper.appendChild(msg);
			template.remove();
			return;
		}

		// Pagination client-side if requested
		let currentPage = 1;
		let perPage = itemsPerPage || 10;
		let pagedItems = allItems;
		if (pagination) {
			const url = new URL(window.location.href);
			currentPage = parseInt(url.searchParams.get('page') || '1', 10);
			if (isNaN(currentPage) || currentPage < 1) currentPage = 1;
			perPage = parseInt(perPage, 10) || 10;
			const totalPages = Math.max(1, Math.ceil(allItems.length / perPage));
			if (currentPage > totalPages) currentPage = totalPages;
			const start = (currentPage - 1) * perPage;
			pagedItems = allItems.slice(start, start + perPage);
		}

		for (const page of pagedItems) {
			try {
				const clone = template.cloneNode(true);
				clone.removeAttribute('wn-collection-box');
				clone.setAttribute('wn-collection-element', 'true');
				const content = await fetchBlogContent(page.collection_id, page.id);
				if (!content) continue;

				const elements = [...clone.querySelectorAll('[wn-title], [wn-link], [wn-id], [wn-for], [wn-date-published], [wn-image], [wn-richText], [wn-richtext], [wn-text], [wn-gallery], [wn-gallery-index], [wn-gallery-modal], [wn-video], [wn-multiReference-wrapper]')];
				for (const el of elements) {
					if (el.hasAttribute('wn-title')) el.textContent = page.collection_element_name;
					if (el.hasAttribute('wn-link')) {
						const pre = el.getAttribute('wn-link') || '';
						const slug = page.collection_element_slug;
						if (slug) {
							if (pre.includes(',')) {
								const [normalPre, webflowPre] = pre.split(',', 2).map(s => s.trim());
								el.href = isWebflowPreview() ? `./${(webflowPre || 'template')}?slug=${slug}` : `/${normalPre}/${slug}`;
							} else {
								el.href = isWebflowPreview() ? `./template?slug=${slug}` : `/${pre}/${slug}`;
							}
						}
					}
					if (el.hasAttribute('wn-id')) {
						const key = el.getAttribute('wn-id');
						el.id = key ? `${key}_${page.id}` : `${page.id}`;
					}
						if (el.hasAttribute('wn-for')) {
							const key = el.getAttribute('wn-for');
							el.htmlFor = key ? `${key}_${page.id}` : `${page.id}`;
						}
					if (el.hasAttribute('wn-date-published')) {
						const format = el.getAttribute('wn-date-published');
						const date = new Date(page.collection_element_publish_date);
						let opts;
						try { opts = getDateFormatOptions(format); } catch { opts = { year: 'numeric', month: 'long', day: 'numeric' }; }
						el.textContent = date.toLocaleDateString(undefined, opts);
					}
					if (el.hasAttribute('wn-image')) {
						const key = el.getAttribute('wn-image');
						const imageData = content.content?.image?.find(i => i.id_config == key);
						if (imageData?.url) { el.src = imageData.url; el.alt = imageData.alt_image || ''; } else { el.style.display='none'; }
					}
					if (el.hasAttribute('wn-text')) {
						const key = el.getAttribute('wn-text');
						const textData = content.content?.text?.find(t => t.id_config == key);
						if (textData) el.textContent = textData.text;
					}
					if (el.hasAttribute('wn-richText') || el.hasAttribute('wn-richtext')) {
						const key = el.getAttribute('wn-richText') || el.getAttribute('wn-richtext');
						const rich = content.content?.richText?.find(r => r.id_config == key);
						if (rich) el.innerHTML = rich.text_html;
					}
					if (el.hasAttribute('wn-video')) {
						const key = el.getAttribute('wn-video');
						const vid = content.content?.video?.find(v => v.id_config == key);
						if (vid) el.innerHTML = `<source src="${urlVideoBucket}${vid.src_video}">`;
					}
					if (el.hasAttribute('wn-gallery')) {
						const attr = el.getAttribute('wn-gallery');
						const [idConfig, cls] = attr.split(',').map(s => s.trim());
						const gal = content.content?.gallery?.find(g => g.id_config == idConfig);
						if (gal?.gallery) {
							try {
								const items = JSON.parse(gal.gallery);
								if (Array.isArray(items) && items.length) {
									el.innerHTML = items.map(img => `<img src="${urlGalleryBucket}${img.src_photo}"${cls?` class="${cls}"`:''}>`).join('');
								} else { el.style.display='none'; }
							} catch { el.style.display='none'; }
						} else { el.style.display='none'; }
					}
					if (el.hasAttribute('wn-gallery-index')) {
						const key = el.getAttribute('wn-gallery-index');
						const [idConfig, indexPhoto] = key.split(',');
						const gal = content.content?.gallery?.find(g => g.id_config == idConfig);
						if (gal?.gallery) {
							try {
								const items = JSON.parse(gal.gallery);
								const img = items[indexPhoto];
								if (img) { el.src = `${urlGalleryBucket}${img.src_photo}`; el.alt = img.alt || ''; }
							} catch {/* ignore */}
						}
					}
					if (el.hasAttribute('wn-gallery-modal')) {
						const key = el.getAttribute('wn-gallery-modal');
						const gal = content.content?.gallery?.find(g => g.id_config == key);
						if (gal?.gallery) {
							try {
								const items = JSON.parse(gal.gallery);
								el.innerHTML = items.map(img => `<div class="slides"><img src="${urlGalleryBucket}${img.src_photo}"></div>`).join('');
							} catch {/* ignore */}
						}
					}
					if (el.hasAttribute('wn-multiReference-wrapper')) {
						const key = el.getAttribute('wn-multiReference-wrapper');
						const multiRefs = content.content?.multiReference?.filter(m => m.id_config == key) || [];
						const refTemplate = el.querySelector('[wn-multiReference-box]');
						if (!refTemplate) { console.error('[collection-filter-plus] Template wn-multiReference-box manquant'); }
						for (const mr of multiRefs) {
							try {
								const refInfoResp = await fetch(`${apiUrl}/api/sendBlogInfo`, { method:'GET', headers:{'api_key':userKey,'id_data':mr.value}});
								const refInfo = await refInfoResp.json();
								const refContentResp = await fetch(`${apiUrl}/api/sendBlogContent`, { method:'GET', headers:{'api_key':userKey,'id_blog':mr.collection_id,'id_blog_page':mr.value}});
								const refContent = await refContentResp.json();
								if (refContent && refTemplate) {
									const rClone = refTemplate.cloneNode(true);
									rClone.removeAttribute('wn-multiReference-box');
									rClone.querySelectorAll('[wn-multiReference-title], [wn-multiReference-link], [wn-multiReference-image], [wn-multiReference-text], [wn-multiReference-id]').forEach(sub => {
										if (sub.hasAttribute('wn-multiReference-title')) sub.textContent = mr.label;
										if (sub.hasAttribute('wn-multiReference-id')) {
											const keyId = sub.getAttribute('wn-multiReference-id');
											sub.id = keyId ? `${keyId}_${mr.value}` : `${mr.value}`;
										}
										if (sub.hasAttribute('wn-multiReference-link')) {
											const pre = sub.getAttribute('wn-multiReference-link') || '';
											const slug = refInfo.blog?.[0]?.collection_element_slug;
											if (slug) {
												if (pre.includes(',')) {
													const [normalPre, webflowPre] = pre.split(',',2).map(s=>s.trim());
													sub.href = isWebflowPreview() ? `/${(webflowPre||'template')}?slug=${slug}` : `/${normalPre}/${slug}`;
												} else {
													sub.href = isWebflowPreview() ? `/template?slug=${slug}` : `/${pre}/${slug}`;
												}
											}
										}
										if (sub.hasAttribute('wn-multiReference-image')) {
											const keyImg = sub.getAttribute('wn-multiReference-image');
											const imgData = refContent.content?.image?.find(i => i.id_config == keyImg);
											if (imgData?.url) { sub.src = imgData.url; sub.alt = imgData.alt_image || ''; }
										}
										if (sub.hasAttribute('wn-multiReference-text')) {
											const keyTxt = sub.getAttribute('wn-multiReference-text');
											const txtData = refContent.content?.text?.find(t => t.id_config == keyTxt);
											if (txtData) sub.textContent = txtData.text;
										}
									});
									el.appendChild(rClone);
								}
							} catch (mErr) { console.error('[collection-filter-plus] multiReference error', mErr); }
						}
						if (refTemplate) refTemplate.remove();
					}
				}
				wrapper.appendChild(clone);
			} catch (itemErr) {
				console.error('[collection-filter-plus] Erreur item:', itemErr);
			}
		}

		template.remove();

		// Build pagination UI if configured (mirrors collection-loader.js)
		if (pagination) {
			let paginationWrapper = wrapper.querySelector('[wn-collection-pagination]');
			if (!paginationWrapper) {
				paginationWrapper = document.querySelector(`[wn-collection-pagination][data-collection-id="${blogId}"]`) || document.querySelector('[wn-collection-pagination]');
			}
			const blogsTotal = Array.isArray(allItems) ? allItems.length : 0; // allItems = full dataset (pre-slice)
			const totalPagesCalc = Math.max(1, Math.ceil(blogsTotal / (parseInt(itemsPerPage || 10, 10) || 10)));
			if (!paginationWrapper || totalPagesCalc <= 1) {
				if (paginationWrapper) paginationWrapper.style.display = 'none';
			} else {
				const baseUrl = new URL(window.location.href);
				const buildHref = (pageNumber) => {
					const u = new URL(baseUrl.href);
					if (pageNumber === 1) {
						u.searchParams.delete('page');
					} else {
						u.searchParams.set('page', String(pageNumber));
					}
					const qs = u.searchParams.toString();
					return u.pathname + (qs ? `?${qs}` : '');
				};

				const prevEl = paginationWrapper.querySelector('[wn-pagination-prev]');
				const nextEl = paginationWrapper.querySelector('[wn-pagination-next]');
				if (prevEl) {
					const prevPage = Math.max(1, currentPage - 1);
					prevEl.setAttribute('href', currentPage === 1 ? '#' : buildHref(prevPage));
					if (currentPage === 1) {
						prevEl.setAttribute('aria-disabled', 'true');
						prevEl.classList.add('disabled');
					} else {
						prevEl.removeAttribute('aria-disabled');
						prevEl.classList.remove('disabled');
					}
				}
				if (nextEl) {
					const nextPage = Math.min(totalPagesCalc, currentPage + 1);
					nextEl.setAttribute('href', currentPage >= totalPagesCalc ? '#' : buildHref(nextPage));
					if (currentPage >= totalPagesCalc) {
						nextEl.setAttribute('aria-disabled', 'true');
						nextEl.classList.add('disabled');
					} else {
						nextEl.removeAttribute('aria-disabled');
						nextEl.classList.remove('disabled');
					}
				}

				const numberTpl = paginationWrapper.querySelector('[wn-pagination-number]');
				if (numberTpl && numberTpl.parentNode) {
					paginationWrapper.querySelectorAll('[data-generated="true"]').forEach(n => n.remove());
					for (let i = 1; i <= totalPagesCalc; i++) {
						const nClone = numberTpl.cloneNode(true);
						nClone.setAttribute('data-generated', 'true');
						nClone.setAttribute('href', buildHref(i));
						nClone.textContent = String(i);
						if (i === currentPage) nClone.classList.add('active');
						numberTpl.parentNode.appendChild(nClone);
					}
					numberTpl.style.display = 'none';
				}
			}
		}

		const marker = document.createElement('div');
		marker.className = 'ssr-wn-collection-box';
		marker.style.display = 'none';
		marker.setAttribute('data-filtered', 'true');
		marker.setAttribute('data-items-count', allItems.length);
		wrapper.appendChild(marker);
	});
})();

