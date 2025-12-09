(async function () {
    const apiUrl = "https://api-wenoble.wenoble.fr/";
    const scriptTag = document.currentScript;
    const urlVideoBucket = "https://xgwszpuiiacukrvvtrze.supabase.co/storage/v1/object/public/collection-video//" // Remplacez par l'URL de votre API
    const urlGalleryBucket = "https://xgwszpuiiacukrvvtrze.supabase.co/storage/v1/object/public/collection-gallery//";
    const userKey = scriptTag.getAttribute("data-user-id");


    

    if (!userKey) {
        console.error("User Key manquant !");
        return;
    }

    function decodeBase64(encodedData) {
        return JSON.parse(atob(encodedData));
    }

    

    

    function getDateFormatOptions(formatString) {
        const options = {};
        const formatArray = formatString.split(' ');
        formatArray.forEach(part => {
            switch (part.toLowerCase()) {
                case 'dd':
                    options.day = '2-digit';
                    break;
                case 'mm':
                    options.month = '2-digit';
                    break;
                case 'yyyy':
                    options.year = 'numeric';
                    break;
                case 'yy':
                    options.year = '2-digit';
                    break;
                case 'month':
                    options.month = 'long';
                    break;
                case 'day':
                    options.weekday = 'long';
                    break;
                default:
                    break;
            }
        });
        return options;
    }

    function isWebflowPreview() {
        return window.location.hostname.includes("webflow.io");
    }

    function slugify(text) {
        return text
            .toString()
            .normalize('NFD') // Décomposer les caractères accentués
            .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
            .toLowerCase() // Convertir en minuscules
            .trim() // Enlever les espaces au début et à la fin
            .replace(/\s+/g, '-') // Remplacer les espaces par des tirets
            .replace(/[^\w\-]+/g, '') // Enlever tous les caractères non-alphanumériques sauf les tirets
            .replace(/\-\-+/g, '-') // Remplacer les tirets multiples par un seul
            .replace(/^-+/, '') // Enlever les tirets au début
            .replace(/-+$/, ''); // Enlever les tirets à la fin
    }

    document.querySelectorAll("[wn-collection-wrapper]").forEach(async el => {
            
        if (el.querySelector(".ssr-wn-collection-box")) {
            console.log('WeNoble content already loaded for this collection wrapper');
            return;
        }



        try {
            const encodedData = el.getAttribute("wn-collection-wrapper");
            const decodedData = decodeBase64(encodedData);

            const { blogId, limit, offset, order, colone, joinTable, config, pagination, itemsPerPage, sorts, filters, templateCollectionId } = decodedData;
            
            // Si en mode template, récupérer l'ID de l'élément template actuel
            let templateElementId = null;
            if (templateCollectionId) {
                // Récupérer le slug de l'URL actuelle (comme dans collection-template-loader.js)
                let slug = null;
                if (isWebflowPreview()) {
                    const urlParams = new URLSearchParams(window.location.search);
                    slug = urlParams.get('slug');
                } else {
                    slug = window.ARTICLE_SLUG;
                }
                
                if (slug) {
                    try {
                        // Récupérer l'élément template par slug
                        const templateInfoResponse = await fetch(`${apiUrl}/api/sendBlogInfoSlug`, {
                            method: "GET",
                            headers: {
                                'api_key': userKey,
                                'id_blog': templateCollectionId,
                                'slug': slug,
                            }
                        });
                        
                        const templateInfo = await templateInfoResponse.json();
                        if (templateInfo.blog && templateInfo.blog.length > 0) {
                            templateElementId = templateInfo.blog[0].id;
                            console.log('Template Element ID récupéré:', templateElementId);
                        }
                    } catch (error) {
                        console.error('Erreur lors de la récupération du template element ID:', error);
                    }
                }
            }

            if (!blogId) {
                console.error("Blog ID manquant !");
                return;
            }

            // Build query params; if pagination is enabled, don't send limit to fetch all and paginate client-side
            const paramsObj = {
                order: order,
                colone: colone,
                joinTable: joinTable,
                configs: JSON.stringify(config)
            };
            
            // Ajouter les paramètres de tri si définis
            if (sorts && Object.keys(sorts).length > 0) {
                paramsObj.sorts = JSON.stringify(sorts);
            }
            
            // Ajouter les filtres dynamiques si définis
            if (filters && filters.length > 0) {
                paramsObj.filters = JSON.stringify(filters);
            }
            
            // Ajouter l'ID de la collection template si en mode template
            if (templateCollectionId) {
                paramsObj.templateCollectionId = templateCollectionId;
                
                // Ajouter l'ID de l'élément template si disponible
                if (templateElementId) {
                    paramsObj.templateElementId = templateElementId;
                }
            }
            
            if (!pagination && typeof limit !== 'undefined' && limit !== null) {
                paramsObj.limit = limit;
                // Ajouter l'offset si défini
                if (typeof offset !== 'undefined' && offset !== null && offset > 0) {
                    paramsObj.offset = offset;
                }
            }
            const params = new URLSearchParams(paramsObj);
            console.log('Collection Loader Params:', params.toString());

            const blogPageResponse = await fetch(`${apiUrl}/api/sendBlog?${params.toString()}`, {
                method: "GET",
                headers: {
                    'api_key': userKey,
                    'ids': blogId,
                }
            });

            console.log('Blog Page Response:', blogPageResponse);

            let dataBlog = null;
            try {
                if (blogPageResponse.ok) {
                    dataBlog = await blogPageResponse.json();
                } else {
                    console.error('Réponse API non OK pour sendBlog:', blogPageResponse.status, blogPageResponse.statusText);
                }
            } catch (e) {
                console.error('Erreur de parsing JSON pour sendBlog:', e);
                dataBlog = null;
            }



            if (!dataBlog || !Array.isArray(dataBlog.blog) || dataBlog.blog.length === 0) {
                // Si c'est un select, ajouter une option "Aucun élément"
                if (el.tagName === 'SELECT') {
                    const emptyOption = document.createElement('option');
                    emptyOption.value = '';
                    emptyOption.textContent = 'Aucun élément disponible';
                    emptyOption.disabled = true;
                    el.appendChild(emptyOption);
                } else {
                    const comingSoonMessage = document.createElement('div');
                    comingSoonMessage.textContent = "Coming Soon";
                    comingSoonMessage.style.textAlign = "center";
                    comingSoonMessage.style.fontSize = "1.5rem";
                    comingSoonMessage.style.color = "#555";
                    el.appendChild(comingSoonMessage);
                    const template = el.querySelector("[wn-collection-box]");
                    if (template) template.remove();
                }
                // Toujours marquer comme traité même si aucun élément
                const collectionMarker = document.createElement('div');
                collectionMarker.className = 'ssr-wn-collection-box';
                collectionMarker.style.display = 'none';
                collectionMarker.setAttribute('data-collection-processed', 'true');
                collectionMarker.setAttribute('data-items-count', 0);
                collectionMarker.setAttribute('data-processed-time', new Date().toISOString());
                el.appendChild(collectionMarker);
                return;
            }

            // Vérifier si l'élément est un SELECT
            if (el.tagName === 'SELECT') {
                // Mode SELECT : remplir les options avec slug en value et title en text
                const allBlogs = Array.isArray(dataBlog?.blog) ? dataBlog.blog : [];
                
                // Vider le select d'abord (garder seulement les options existantes non-générées)
                const existingOptions = Array.from(el.querySelectorAll('option:not([data-wn-generated])'));
                el.innerHTML = '';
                existingOptions.forEach(opt => el.appendChild(opt));

                // Ajouter les nouvelles options depuis la collection
                allBlogs.forEach(blog => {
                    const option = document.createElement('option');
                    // Utiliser le slug existant ou créer un slug à partir du nom
                    const slugValue = blog.collection_element_slug || slugify(blog.collection_element_name || `element-${blog.id}`);
                    option.value = slugValue;
                    option.textContent = blog.collection_element_name || `Élément ${blog.id}`;
                    option.setAttribute('data-wn-generated', 'true');
                    option.setAttribute('data-collection-id', blog.id);
                    el.appendChild(option);
                });

                // Créer le marker pour indiquer que le select a été traité
                const collectionMarker = document.createElement('div');
                collectionMarker.className = 'ssr-wn-collection-box';
                collectionMarker.style.display = 'none';
                collectionMarker.setAttribute('data-collection-processed', 'true');
                collectionMarker.setAttribute('data-items-count', allBlogs.length);
                collectionMarker.setAttribute('data-processed-time', new Date().toISOString());
                el.appendChild(collectionMarker);
                
                return; // Sortir ici car le traitement du select est terminé
            }

            const template = el.querySelector("[wn-collection-box]");
            if (!template) {
                console.error("Template wn-collection-box manquant !");
                return;
            }

            // Pagination handling (client-side) if enabled
            let allBlogs = Array.isArray(dataBlog?.blog) ? dataBlog.blog : [];
            let currentPage = 1;
            let perPage = itemsPerPage || limit || 10;
            let totalPages = 1;
            if (pagination) {
                const url = new URL(window.location.href);
                const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
                currentPage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
                perPage = parseInt(perPage, 10) || 10;
                totalPages = Math.max(1, Math.ceil(allBlogs.length / perPage));
                if (currentPage > totalPages) currentPage = totalPages;
                const start = (currentPage - 1) * perPage;
                allBlogs = allBlogs.slice(start, start + perPage);
            }

            // Traitement séquentiel pour préserver l'ordre
            for (const blog of allBlogs) {
                try {
                    const clone = template.cloneNode(true);
                    clone.removeAttribute("wn-collection-box");
                    
                    // Ajout de l'attribut wn-collection-element à chaque élément cloné
                    clone.setAttribute("wn-collection-element", "true");
                    const response = await fetch(`${apiUrl}/api/sendBlogContent`, {
                        method: "GET",
                        headers: {
                            'api_key': userKey,
                            'id_blog': blog.collection_id,
                            'id_blog_page': blog.id,
                        }
                    });

                    const data = await response.json();

                    if (!data) {
                        console.error("Aucune donnée trouvée pour cette page.");
                        continue; // Passer au blog suivant
                    }

                    // Parcours tous les éléments qui ont un attribut `wn-*` dans le clone de manière séquentielle
                    const elementsToProcess = [...clone.querySelectorAll("[wn-title], [wn-link], [wn-id], [wn-for], [wn-date-published], [wn-image], [wn-richtext], [wn-text], [wn-input], [wn-gallery], [wn-gallery-index],[wn-gallery-modal], [wn-video], [wn-multiReference-wrapper]")];
                    
                    for (const el of elementsToProcess) {
                    
                    if (el.hasAttribute("wn-title")) {
                        el.textContent = blog.collection_element_name;
                    }

                    if (el.hasAttribute("wn-link")) {
                        const prelinkAttr = el.getAttribute("wn-link");
                        const linkData = blog.collection_element_slug;
                        
                        if (linkData) {
                            // Vérifier si l'attribut contient une virgule (format: "normal,webflow")
                            if (prelinkAttr.includes(',')) {
                                // Séparation des deux parties
                                const [normalPrelink, webflowPrelink] = prelinkAttr.split(',', 2).map(p => p.trim());
                                
                                if (isWebflowPreview()) {
                                    // En mode prévisualisation Webflow, utiliser la partie après la virgule
                                    const webflowPath = webflowPrelink || 'template';
                                    el.href = `./${webflowPath}?slug=${linkData}`;
                                } else {
                                    // En mode normal, utiliser la partie avant la virgule
                                    el.href = `/${normalPrelink}/${linkData}`;
                                }
                            } else {
                                // Pas de virgule, format simple
                                if (isWebflowPreview()) {
                                    // Utiliser "template" par défaut pour Webflow
                                    el.href = `./template?slug=${linkData}`;
                                } else {
                                    // Utiliser le prelink fourni
                                    el.href = `/${prelinkAttr}/${linkData}`;
                                }
                            }
                        }
                    }


                    if (el.hasAttribute("wn-id")) {
                        const key = el.getAttribute("wn-id");
                        if(key) {
                            el.id = `${key}_${blog.id}`
                        } else {
                            el.id = `${blog.id}`;
                        }
                    }
        
                    if (el.hasAttribute("wn-for")) {
                        const key = el.getAttribute("wn-for");
                        if(key) {
                            el.htmlFor = `${key}_${blog.id}`
                        } else {
                            el.htmlFor = `${blog.id}`;
                        }
                    }
        
                    if (el.hasAttribute("wn-date-published")) {
                        const format = el.getAttribute("wn-date-published");
                        const date = new Date(blog.collection_element_publish_date);
                        let options;
        
                        try {
                            options = getDateFormatOptions(format);
                        } catch (e) {
                            console.error("Format de date invalide :", format);
                            options = { year: 'numeric', month: 'long', day: 'numeric' }; // Format par défaut
                        }
        
                        el.textContent = date.toLocaleDateString('fr-FR', options);
                    }
                    
                    
                    if (el.hasAttribute("wn-image")) {
                        const key = el.getAttribute("wn-image");
                        const imageData = data.content.image.find(img => img.id_config == key);
                        if (imageData) {
                            if (imageData.url) {
                                el.src = `${imageData.url}`;
                                el.alt = imageData.alt_image;
                            }
                        } else {
                            el.style.display = "none"; 
                        }
                    }

                    if (el.hasAttribute("wn-text")) {
                        const key = el.getAttribute("wn-text");
                        
                        const textData = data.content.text.find(text => text.id_config == key);
                        if (textData) {
                            el.textContent = textData.text;
                        } else {
                            el.style.display = "none";
                        }
                    }

                    if (el.hasAttribute("wn-input")) {
                        const key = el.getAttribute("wn-input");
                        let inputValue = null;

                        if (key === 'slug') {
                            inputValue = blog.collection_element_slug || '';
                        } else if (key === 'title') {
                            inputValue = blog.collection_element_name || '';
                        } else {
                            const textData = data.content.text.find(text => text.id_config == key);
                            if (textData) inputValue = textData.text;
                        }

                        if (inputValue !== null) {
                            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (typeof el.value !== 'undefined')) {
                                el.value = inputValue;
                            } else {
                                // Fallback si l'élément n'a pas de propriété value
                                el.textContent = inputValue;
                            }
                        }
                    }


                    if (el.hasAttribute("wn-richText")) {
                        const key = el.getAttribute("wn-richText");
                        const richTextData = data.content.richText.find(text => text.id_config == key);
                        if (richTextData) {
                            el.innerHTML = richTextData.text_html;
                        }
                    }
                    if (el.hasAttribute("wn-video")) {
                        const key = el.getAttribute("wn-video");
                        
                        const videoData = data.content.video.find(video => video.id_config == key);
                        if (videoData) {
                            const videoSrc = videoData.src_video.startsWith('http') ? videoData.src_video : `${urlVideoBucket}${videoData.src_video}`;
                            el.innerHTML = `<source src="${videoSrc}">`;
                        }
                    }

                    if (el.hasAttribute("wn-gallery")) {
                        const attrValue = el.getAttribute("wn-gallery");


                        // Séparer l'ID et la classe éventuelle
                        const [idConfig, className] = attrValue.split(',').map(part => part.trim());
                                        
                        const galleryData = data.content.gallery.find(gallery => gallery.id_config == idConfig);
                        if (galleryData && galleryData.gallery) {
                            try {
                                const galleryItems = JSON.parse(galleryData.gallery);
                                if (galleryItems && galleryItems.length > 0) {
                                    // Ajouter la classe si elle existe
                                    el.innerHTML = galleryItems.map(img => {
                                        const imgSrc = img.src_photo.startsWith('http') ? img.src_photo : `${urlGalleryBucket}${img.src_photo}`;
                                        return `<img src="${imgSrc}"${className ? ` class="${className}"` : ''}>`;
                                    }).join("");
                                } else {
                                    // Pas d'images dans la galerie
                                    el.style.display = "none";
                                }
                            } catch (e) {
                                console.error("Erreur de parsing JSON pour la galerie:", e);
                                el.style.display = "none";
                            }
                        } else {
                            // Pas de données de galerie trouvées
                            el.style.display = "none";
                        }
                    }

                    if (el.hasAttribute("wn-gallery-index")) {
                        const key = el.getAttribute("wn-gallery-index");
                        const [idConfig, indexPhoto] = key.split(',');
                        const galleryData = data.content.gallery.find(gallery => gallery.id_config == idConfig);
                        if (galleryData) {
                            const galleryItems = JSON.parse(galleryData.gallery);
                            const img = galleryItems[indexPhoto];
                            if (img) {
                                el.src = img.src_photo.startsWith('http') ? img.src_photo : `${urlGalleryBucket}${img.src_photo}`;
                                el.alt = img.alt;
                            }
                        }
                    }

                    if (el.hasAttribute("wn-gallery-modal")) {
                        const key = el.getAttribute("wn-gallery-modal");
                        const galleryData = data.content.gallery.find(gallery => gallery.id_config == key);
                        if (galleryData) {
                            const galleryItems = JSON.parse(galleryData.gallery);
                            el.innerHTML = galleryItems.map(img => {
                                const imgSrc = img.src_photo.startsWith('http') ? img.src_photo : `${urlGalleryBucket}${img.src_photo}`;
                                return `<div class="slides"><img src="${imgSrc}"></div>`;
                            }).join("");
                        }
                    }


                    if (el.hasAttribute("wn-multiReference-wrapper")) {
                        const key = el.getAttribute("wn-multiReference-wrapper");
                        const multiReferenceInfos = data.content.multiReference.filter(multiReference => multiReference.id_config == key);
                        
                        const template = el.querySelector("[wn-multiReference-box]");
                        if (!template) {
                            console.error("Template wn-multiReference-box manquant !");
                            return;
                        }
                        
                        for (const multiReferenceInfo of multiReferenceInfos) {

                            const referenceInfo = await fetch(`${apiUrl}/api/sendBlogInfo`, {    
                                method: "GET",
                                headers: {
                                    'api_key': userKey,
                                    'id_data': multiReferenceInfo.value,
                                }
                            });

                            const refInfo = await referenceInfo.json();

                            const referenceContent = await fetch(`${apiUrl}/api/sendBlogContent`, {
                                method: "GET",
                                headers: {
                                    'api_key': userKey,
                                    'id_blog': multiReferenceInfo.collection_id,
                                    'id_blog_page': multiReferenceInfo.value,
                                }
                            });

                            
        
                            const refContent = await referenceContent.json();

                            
                            if (refContent) {
                                const clone = template.cloneNode(true);
                                clone.removeAttribute("wn-multiReference-box");

                                // Parcours tous les éléments qui ont un attribut `wn-*` dans le clone
                                clone.querySelectorAll("[wn-multiReference-title], [wn-multiReference-link], [wn-multiReference-image], [wn-multiReference-text]").forEach(el => {
                                    if (el.hasAttribute("wn-multiReference-title")) {
                                        el.textContent = multiReferenceInfo.label;
                                    }

                                    if (el.hasAttribute("wn-multiReference-id")) {
                                        const key = el.getAttribute("wn-multiReference-id");
                                        if(key) {
                                            el.id = `${key}_${multiReferenceInfo.value}`
                                        } else {
                                            el.id = `${multiReferenceInfo.value}`;
                                        }
                                    }

                                    if (el.hasAttribute("wn-multiReference-link")) {
                                        const prelinkAttr = el.getAttribute("wn-multiReference-link");
                                        const linkData = refInfo.blog[0].collection_element_slug;
                                        
                                        if (linkData) {
                                            // Vérifier si l'attribut contient une virgule (format: "normal,webflow")
                                            if (prelinkAttr.includes(',')) {
                                                // Séparation des deux parties
                                                const [normalPrelink, webflowPrelink] = prelinkAttr.split(',', 2).map(p => p.trim());
                                                
                                                if (isWebflowPreview()) {
                                                    // En mode prévisualisation Webflow, utiliser la partie après la virgule
                                                    const webflowPath = webflowPrelink || 'template';
                                                    el.href = `/${webflowPath}?slug=${linkData}`;
                                                } else {
                                                    // En mode normal, utiliser la partie avant la virgule
                                                    el.href = `/${normalPrelink}/${linkData}`;
                                                }
                                            } else {
                                                // Pas de virgule, format simple
                                                if (isWebflowPreview()) {
                                                    // Utiliser "template" par défaut pour Webflow
                                                    el.href = `/template?slug=${linkData}`;
                                                } else {
                                                    // Utiliser le prelink fourni
                                                    el.href = `/${prelinkAttr}/${linkData}`;
                                                }
                                            }
                                        }
                                    }

                                    if (el.hasAttribute("wn-multiReference-image")) {
                                        const key = el.getAttribute("wn-multiReference-image");
                                        const imageData = refContent.content.image.find(img => img.id_config == key);
                                        if (imageData) {
                                            el.src = imageData.url;
                                            el.alt = imageData.alt_image;
                                        }
                                    }
                                    if (el.hasAttribute("wn-multiReference-text")) {
                                        const key = el.getAttribute("wn-multiReference-text");
                                        const textData = refContent.content.text.find(text => text.id_config == key);
                                        if (textData) {
                                            el.textContent = textData.text;
                                        }
                                    }
                                });
        
                                el.appendChild(clone);
                                
                            }
                        }
        
                        template.remove();
                    }

                    } // Fin de la boucle for
                
                    // Ajouter le clone au DOM dans l'ordre séquentiel
                    el.appendChild(clone);
                    
                } catch (blogError) {
                    console.error("Erreur lors du traitement du blog:", blogError);
                }
            }

            // Supprimer le template original wn-collection-box après clonage
            const originalTemplate = el.querySelector('[wn-collection-box]');
            if (originalTemplate) {
                originalTemplate.remove();
            }

            // Build pagination UI if configured
            if (pagination) {
                let paginationWrapper = el.querySelector('[wn-collection-pagination]');
                if (!paginationWrapper) {
                    paginationWrapper = document.querySelector(`[wn-collection-pagination][data-collection-id="${blogId}"]`) || document.querySelector('[wn-collection-pagination]');
                }
                const blogsTotal = Array.isArray(dataBlog.blog) ? dataBlog.blog.length : 0;
                const totalPagesCalc = Math.max(1, Math.ceil(blogsTotal / (parseInt(itemsPerPage || limit || 10, 10) || 10)));
                // If no need for pagination UI, hide it
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

                    // Prev/Next links
                    const prevEl = paginationWrapper.querySelector('[wn-pagination-prev]');
                    const nextEl = paginationWrapper.querySelector('[wn-pagination-next]');
                    if (prevEl) {
                        const prevPage = Math.max(1, (typeof currentPage !== 'undefined' ? currentPage : 1) - 1);
                        prevEl.setAttribute('href', prevPage < 1 || currentPage === 1 ? '#' : buildHref(prevPage));
                        if (currentPage > 1) {
                            prevEl.setAttribute('rel', 'prev');
                        } else {
                            prevEl.removeAttribute('rel');
                        }
                        if (currentPage === 1) {
                            prevEl.setAttribute('aria-disabled', 'true');
                            prevEl.classList.add('disabled');
                        } else {
                            prevEl.removeAttribute('aria-disabled');
                            prevEl.classList.remove('disabled');
                        }
                    }
                    if (nextEl) {
                        const nextPage = Math.min(totalPagesCalc, (typeof currentPage !== 'undefined' ? currentPage : 1) + 1);
                        nextEl.setAttribute('href', currentPage >= totalPagesCalc ? '#' : buildHref(nextPage));
                        if (currentPage < totalPagesCalc) {
                            nextEl.setAttribute('rel', 'next');
                        } else {
                            nextEl.removeAttribute('rel');
                        }
                        if (currentPage >= totalPagesCalc) {
                            nextEl.setAttribute('aria-disabled', 'true');
                            nextEl.classList.add('disabled');
                        } else {
                            nextEl.removeAttribute('aria-disabled');
                            nextEl.classList.remove('disabled');
                        }
                    }

                    // Numbered links template
                    const numberTpl = paginationWrapper.querySelector('[wn-pagination-number]');
                    if (numberTpl && numberTpl.parentNode) {
                        // Remove previously generated items
                        paginationWrapper.querySelectorAll('[data-generated="true"]').forEach(n => n.remove());

                        for (let i = 1; i <= totalPagesCalc; i++) {
                            const clone = numberTpl.cloneNode(true);
                            clone.setAttribute('data-generated', 'true');
                            clone.setAttribute('href', buildHref(i));
                            clone.textContent = String(i);
                            if (i === currentPage) clone.classList.add('active');
                            numberTpl.parentNode.appendChild(clone);
                        }
                        // Hide the template
                        numberTpl.style.display = 'none';
                    }

                    // Prefetch adjacent pages (previous and next) for smoother navigation
                    try {
                        const head = document.head || document.getElementsByTagName('head')[0];
                        const addPrefetch = (href) => {
                            if (!href || href === '#' ) return;
                            // Avoid duplicates
                            if (head.querySelector(`link[rel="prefetch"][data-wn-prefetch='${href}']`)) return;
                            const l = document.createElement('link');
                            l.rel = 'prefetch';
                            l.href = href;
                            l.as = 'document';
                            l.setAttribute('data-wn-prefetch', href);
                            head.appendChild(l);
                        };
                        const prevPageNum = currentPage > 1 ? currentPage - 1 : null;
                        const nextPageNum = currentPage < totalPagesCalc ? currentPage + 1 : null;
                        if (prevPageNum) addPrefetch(buildHref(prevPageNum));
                        if (nextPageNum) addPrefetch(buildHref(nextPageNum));
                    } catch(prefErr) { /* silent */ }
                }
            }

            // Créer le marker SEULEMENT après que tout est prêt
            const collectionMarker = document.createElement('div');
            collectionMarker.className = 'ssr-wn-collection-box';
            collectionMarker.style.display = 'none';
            collectionMarker.setAttribute('data-collection-processed', 'true');
            collectionMarker.setAttribute('data-items-count', Array.isArray(dataBlog?.blog) ? dataBlog.blog.length : 0);
            collectionMarker.setAttribute('data-processed-time', new Date().toISOString());
            el.appendChild(collectionMarker);

            

        } catch (error) {
            console.error("Erreur lors de la récupération des données :", error);
        }
    });
})();