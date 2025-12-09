(async function () {
    const apiUrl = "https://api-wenoble.wenoble.fr/";
    const urlVideoBucket = "https://xgwszpuiiacukrvvtrze.supabase.co/storage/v1/object/public/collection-video//" // Remplacez par l'URL de votre API
    const urlGalleryBucket = "https://xgwszpuiiacukrvvtrze.supabase.co/storage/v1/object/public/collection-gallery//"; // Remplacez par l'URL de votre API
    const scriptTag = document.currentScript;
    const blogId = scriptTag.getAttribute("data-blog-id");
    const userKey = scriptTag.getAttribute("data-user-id");
    const titleTag = scriptTag.getAttribute("title-tag");
    const metaTags = scriptTag.getAttribute("meta-tag");
    const metaTagsImage = scriptTag.getAttribute("meta-tag-image");

    const markerSSR = document.querySelector(".ssr-wn-collection-template")
    if (markerSSR) {
        console.log('WeNoble content already loaded');
        return;
    }

    let slug = null;

    function isWebflowPreview() {
        return window.location.hostname.includes("webflow.io");
    }

    if (isWebflowPreview()) {
        const urlParams = new URLSearchParams(window.location.search);
        slug = urlParams.get('slug');
    } else {
        slug = window.ARTICLE_SLUG;
    }



    if (!blogId) {
        console.error("Blog ID ou Page ID manquant !");
        return;
    }

    try {

        const collection_slug_json = await fetch(`${apiUrl}/api/sendBlogSlug`, {
            method: "GET",
            headers: {
                'api_key': userKey,
                'id_data': blogId,
            }
        });

        const collection_slug = await collection_slug_json.json();


        const collectionInfos = await fetch(`${apiUrl}/api/sendBlogInfoSlug`, {
            method: "GET",
            headers: {
                'api_key': userKey,
                'id_blog': blogId,
                'slug': slug,
            }
        });

        const info = await collectionInfos.json();

        const collectionContent = await fetch(`${apiUrl}/api/sendBlogContent`, {
            method: "GET",
            headers: {
                'api_key': userKey,
                'id_blog': blogId,
                'id_blog_page': info.blog[0].id,
            }
        });

        
        
        const data = await collectionContent.json();

        if (!data) {
            console.error("Aucune donnée trouvée pour cette page.");
            return;
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


        function setupLazyLoading() {
            if ('IntersectionObserver' in window) {
                const lazyImages = document.querySelectorAll('img.lazyload-img');
                const observer = new IntersectionObserver((entries, obs) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            if (img.dataset.src) {
                                img.src = img.dataset.src;
                                img.removeAttribute('data-src');
                            }
                            obs.unobserve(img);
                        }
                    });
                });
                lazyImages.forEach(img => observer.observe(img));
            } else {
                // Fallback pour les navigateurs sans IntersectionObserver
                const lazyImages = document.querySelectorAll('img.lazyload-img');
                lazyImages.forEach(img => {
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                });
            }
        }
        
        

        // Ajout de toutes les balises SEO
        const ogTitle = document.querySelector("meta[property='og:title']") || document.createElement('meta');
        ogTitle.setAttribute('property', 'og:title');
        const titleText = data.content.text.find(text => text.id_config == titleTag);
        if (titleText) {
            ogTitle.setAttribute('content', titleText.text);
            document.title = titleText.text;
        }
        document.head.appendChild(ogTitle);

        const ogDescription = document.querySelector("meta[property='og:description']") || document.createElement('meta');
        ogDescription.setAttribute('property', 'og:description');
        const descriptionText = data.content.text.find(text => text.id_config == metaTags);
        if (descriptionText) {
            ogDescription.setAttribute('content', descriptionText.text);
        }
        document.head.appendChild(ogDescription);

        // Ajout de la balise name="description"
        const metaDescription = document.querySelector("meta[name='description']") || document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        if (descriptionText) {
            metaDescription.setAttribute('content', descriptionText.text);
        }
        document.head.appendChild(metaDescription);

        const ogImage = document.querySelector("meta[property='og:image']") || document.createElement('meta');
        ogImage.setAttribute('property', 'og:image');
        const image = data.content.image && data.content.image.find(img => img.id_config == metaTagsImage);
        if (image) {
            ogImage.setAttribute('content', image.url);
        }
        document.head.appendChild(ogImage);

        const ogUrl = document.querySelector("meta[property='og:url']") || document.createElement('meta');
        ogUrl.setAttribute('property', 'og:url');
        ogUrl.setAttribute('content', window.location.href);
        document.head.appendChild(ogUrl);

        const ogType = document.querySelector("meta[property='og:type']") || document.createElement('meta');
        ogType.setAttribute('property', 'og:type');
        ogType.setAttribute('content', 'article');
        document.head.appendChild(ogType);

        const twitterCard = document.querySelector("meta[name='twitter:card']") || document.createElement('meta');
        twitterCard.setAttribute('name', 'twitter:card');
        twitterCard.setAttribute('content', 'summary_large_image');
        document.head.appendChild(twitterCard);

        const twitterTitle = document.querySelector("meta[name='twitter:title']") || document.createElement('meta');
        twitterTitle.setAttribute('name', 'twitter:title');
        if (titleText) {
            twitterTitle.setAttribute('content', titleText.text);
        }
        document.head.appendChild(twitterTitle);

        const twitterDescription = document.querySelector("meta[name='twitter:description']") || document.createElement('meta');
        twitterDescription.setAttribute('name', 'twitter:description');
        if (descriptionText) {
            twitterDescription.setAttribute('content', descriptionText.text);
        }
        document.head.appendChild(twitterDescription);

        const twitterImage = document.querySelector("meta[name='twitter:image']") || document.createElement('meta');
        twitterImage.setAttribute('name', 'twitter:image');
        if (image) {
            twitterImage.setAttribute('content', image.url);
        }
        document.head.appendChild(twitterImage);


        // Ajout de la balise canonical
        const canonicalLink = document.querySelector("link[rel='canonical']") || document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        if (collection_slug && collection_slug.slug) {
            canonicalLink.setAttribute('href', `${collection_slug.slug}${slug}`);
        }
        document.head.appendChild(canonicalLink);
        

        // Parcours tous les éléments qui ont un attribut `wn-*` mais pas ceux dans wn-collection-wrapper
        const allElements = document.querySelectorAll("[wn-title], [wn-date-published], [wn-image], [wn-title], [wn-richtext], [wn-text], [wn-gallery], [wn-gallery-index], [wn-gallery-modal], [wn-video], [wn-multiReference-wrapper]");

        // Filtrer les éléments pour exclure ceux qui sont dans un wn-collection-wrapper
        const elementsToProcess = Array.from(allElements).filter(el => {
            return !el.closest('[wn-collection-wrapper]');
        });

        // Parcourir uniquement les éléments filtrés
        elementsToProcess.forEach(async el => {
            if (el.hasAttribute("wn-title")) {
                if (el.tagName.toLowerCase() === 'input') {
                    el.value = info.blog[0].collection_element_name;
                } else {
                    el.textContent = info.blog[0].collection_element_name;
                }
            }


            if (el.hasAttribute("wn-date-published")) {
                const format = el.getAttribute("wn-date-published");
                const date = new Date(info.blog[0].collection_element_publish_date);
                let options;

                try {
                    options = getDateFormatOptions(format);
                } catch (e) {
                    console.error("Format de date invalide :", format);
                    options = { year: 'numeric', month: 'long', day: 'numeric' }; // Format par défaut
                }

                el.textContent = date.toLocaleDateString(undefined, options);
            }

            if (el.hasAttribute("wn-image")) {
                const key = el.getAttribute("wn-image");
                const imageData = data.content.image.find(img => img.id_config == key);
                if (imageData) {
                    // Cas IMG HTML classique
                    if (el.tagName.toLowerCase() === 'img') {
                        el.src = imageData.url;
                        el.alt = imageData.alt_image;
                    }
                    // Cas balise <image> SVG
                    else if (el.tagName.toLowerCase() === 'image') {
                        // Pour compatibilité, on set à la fois href et xlink:href
                        el.setAttribute('href', imageData.url);
                        el.setAttribute('xlink:href', imageData.url);
                        // L'attribut alt n'existe pas sur <image>, mais on peut ajouter un <title> pour l'accessibilité
                        let title = el.ownerSVGElement && el.ownerSVGElement.querySelector('title');
                        if (!title && el.ownerSVGElement) {
                            title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
                            el.ownerSVGElement.insertBefore(title, el.ownerSVGElement.firstChild);
                        }
                        if (title) title.textContent = imageData.alt_image || '';
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
            if (el.hasAttribute("wn-richText")) {
                const key = el.getAttribute("wn-richText");
                const richTextData = data.content.richText.find(text => text.id_config == key);
                if (richTextData) {
                    el.innerHTML = richTextData.text_html;
                }
            }
            if (el.hasAttribute("wn-video")) {
                const key = el.getAttribute("wn-video");
                const videoData = data.content.video.find(img => img.id_config == key);
                if (videoData) {
                    console.log("videoData:", videoData);
                    const videoSrc = videoData.src_video.startsWith('http') ? videoData.src_video : `${urlVideoBucket}${videoData.src_video}`;
                    console.log("videoSrc:", videoSrc);
                    el.innerHTML = `<source src="${videoSrc}">`;
                }
            }

            if (el.hasAttribute("wn-gallery")) {
                const attrValue = el.getAttribute("wn-gallery");
                let idConfig, extraClasses = '';
                            
                // Vérifier si l'attribut contient une virgule
                if (attrValue.includes(',')) {
                    // Séparer la clé et les classes
                    const [configPart, classesPart] = attrValue.split(',', 2);
                    idConfig = configPart.trim();
                    extraClasses = classesPart.trim();
                } else {
                    // Cas simple, pas de classes supplémentaires
                    idConfig = attrValue.trim();
                }
                
                const galleryData = data.content.gallery.find(gallery => gallery.id_config == idConfig);
                if (galleryData) {
                    let galleryItems;
                    if (typeof galleryData.gallery === 'string') {
                        try {
                            galleryItems = JSON.parse(galleryData.gallery);
                        } catch (e) {
                            console.error('Erreur lors du parsing JSON gallery:', e, galleryData.gallery);
                            galleryItems = [];
                        }
                    } else {
                        galleryItems = galleryData.gallery;
                    }

                    // Création des images avec lazy loading
                    galleryItems.forEach(img => {
                        const imgElement = document.createElement('img');
                        
                        // Utiliser loading="lazy" pour le chargement paresseux natif
                        imgElement.loading = "lazy";
                        
                        
                        // Stocker l'URL réelle dans data-src (vérifier si c'est déjà une URL complète)
                        const imgSrc = img.src_photo.startsWith('http') ? img.src_photo : `${urlGalleryBucket}${img.src_photo}`;
                        imgElement.dataset.src = imgSrc;
                        
                        // Mettre une image de remplacement très légère
                        imgElement.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E";
                        
                        imgElement.alt = img.alt;
                        
                        if (extraClasses) {
                            // Ajouter les classes supplémentaires
                            extraClasses.split(' ').forEach(className => {
                                if (className) imgElement.classList.add(className);
                            });
                        }
                        
                        // Ajouter une classe pour identifier les images à charger
                        imgElement.classList.add("lazyload-img");
                        
                        // Ajouter l'image au conteneur sans supprimer le contenu existant
                        el.appendChild(imgElement);
                    });
                    
                    // Configurer l'Intersection Observer pour charger les images
                    setupLazyLoading();
                }
            }
            

            if (el.hasAttribute("wn-gallery-index")) {
                const key = el.getAttribute("wn-gallery-index");
                const [idConfig, indexPhoto] = key.split(',');
                const galleryData = data.content.gallery.find(gallery => gallery.id_config == idConfig);
                if (galleryData) {
                    let galleryItems;
                    if (typeof galleryData.gallery === 'string') {
                        try {
                            galleryItems = JSON.parse(galleryData.gallery);
                        } catch (e) {
                            console.error('Erreur lors du parsing JSON gallery-index:', e, galleryData.gallery);
                            galleryItems = [];
                        }
                    } else {
                        galleryItems = galleryData.gallery;
                    }
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
                    let galleryItems;
                    if (typeof galleryData.gallery === 'string') {
                        try {
                            galleryItems = JSON.parse(galleryData.gallery);
                        } catch (e) {
                            console.error('Erreur lors du parsing JSON gallery-modal:', e, galleryData.gallery);
                            galleryItems = [];
                        }
                    } else {
                        galleryItems = galleryData.gallery;
                    }
                    galleryItems.forEach(img => {
                        const slideDiv = document.createElement("div");
                        slideDiv.classList.add("slides");
                        const imgElement = document.createElement("img");
                        const imgSrc = img.src_photo.startsWith('http') ? img.src_photo : `${urlGalleryBucket}${img.src_photo}`;
                        imgElement.src = imgSrc;
                        imgElement.alt = img.alt;
                        imgElement.classList.add("slide-image");
                        slideDiv.appendChild(imgElement);
                        el.appendChild(slideDiv);
                    });
                }
            }

            if (el.hasAttribute("wn-multiReference-wrapper")) {
                const key = el.getAttribute("wn-multiReference-wrapper");
                const multiReferenceInfos = data.content.multiReference.filter(multiReference => multiReference.id_config == key);
                console.log("multiReferenceInfos:", data.content.multiReference);

                const template = el.querySelector("[wn-multiReference-box]");
                if (!template) {
                    console.error("Template wn-multiReference-box manquant !");
                    return;
                }
                
                for (const multiReferenceInfo of multiReferenceInfos) {
                    console.log("multiReferenceInfo:", multiReferenceInfo);
                    const referenceContent = await fetch(`${apiUrl}/api/sendBlogContent`, {
                        method: "GET",
                        headers: {
                            'api_key': userKey,
                            'id_blog': multiReferenceInfo.collection_id,
                            'id_blog_page': multiReferenceInfo.value,
                        }
                    });

                    const refContent = await referenceContent.json();
                    console.log("refContent:", refContent);
                    if (refContent) {
                        const clone = template.cloneNode(true);
                        clone.removeAttribute("wn-multiReference-box");

                        // Parcours tous les éléments qui ont un attribut `wn-*` dans le clone
                        clone.querySelectorAll("[wn-multiReference-title], [wn-multiReference-image], [wn-multiReference-text]").forEach(el => {
                            if (el.hasAttribute("wn-multiReference-title")) {
                                el.textContent = multiReferenceInfo.label;
                            }
                            if (el.hasAttribute("wn-multiReference-image")) {
                                const key = el.getAttribute("wn-multiReference-image");

                                const imageData = refContent.content.image.find(img => img.id_config == key);
                                console.log("refContent:", refContent);
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
                        
                    
                    }}

                template.remove();
            }

        });

        const readyMarker = document.createElement('div');
        readyMarker.className = 'ssr-wn-collection-template';
        readyMarker.style.display = 'none';
        document.body.appendChild(readyMarker);
        
    } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);
    }
})();