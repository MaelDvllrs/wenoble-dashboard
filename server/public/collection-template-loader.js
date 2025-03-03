(async function () {
    const apiUrl = "https://api-wenoble.wenoble.fr";
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
                'id_blog_page': info.blog[0].id_page_blog,
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
        
        document.title = info.blog[0].page_blog_name;
        const ogTitle = document.querySelector("meta[property='og:title']");
        const ogDescription = document.querySelector("meta[property='og:description']");
        const ogImage = document.querySelector("meta[property='og:image']");

        if (ogTitle) {

            const titleText = data.content.text.find(text => text.id_config == titleTag);
            if (titleText) {
                ogTitle.setAttribute("content", titleText.text);
            }
        }

        if (ogDescription) {
            const descriptionText = data.content.text.find(text => text.id_config == metaTags);
            if (descriptionText) {
                ogDescription.setAttribute("content", descriptionText.text);
            }
        }

        if (ogImage) {
            const image = data.content.image.find(img => img.id_config == metaTagsImage);
            if (image) {
                ogImage.setAttribute("content", `${apiUrl}/media/blog/${image.src_image}`);
            }
        }


        // Parcours tous les éléments qui ont un attribut `wn-*` mais pas ceux dans wn-collection-wrapper
        const allElements = document.querySelectorAll("[wn-title], [wn-date-published], [wn-image], [wn-title], [wn-richtext], [wn-text], [wn-gallery], [wn-gallery-index], [wn-gallery-modal], [wn-video], [wn-multiReference-wrapper]");

        // Filtrer les éléments pour exclure ceux qui sont dans un wn-collection-wrapper
        const elementsToProcess = Array.from(allElements).filter(el => {
            return !el.closest('[wn-collection-wrapper]');
        });

        // Parcourir uniquement les éléments filtrés
        elementsToProcess.forEach(async el => {
            if (el.hasAttribute("wn-title")) {
                el.textContent = info.blog[0].page_blog_name;
            }


            if (el.hasAttribute("wn-date-published")) {
                const format = el.getAttribute("wn-date-published");
                const date = new Date(info.blog[0].page_blog_publish_date);
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
                    el.src = `${apiUrl}/media/blog/${imageData.src_image}`;
                    el.alt = imageData.alt_image;
                }
            }

            if (el.hasAttribute("wn-text")) {
                const key = el.getAttribute("wn-text");
                const textData = data.content.text.find(text => text.id_config == key);
                if (textData) {
                    el.textContent = textData.text;
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
                    el.innerHTML = `<source src="${apiUrl}/streamVideo/${videoData.src_video}">`;
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
                    const galleryItems = JSON.parse(galleryData.gallery);
                    
                    // Création des images avec lazy loading
                    galleryItems.forEach(img => {
                        const imgElement = document.createElement('img');
                        
                        // Utiliser loading="lazy" pour le chargement paresseux natif
                        imgElement.loading = "lazy";
                        
                        // Stocker l'URL réelle dans data-src
                        imgElement.dataset.src = `${apiUrl}/media/blogGallery/${img.src_photo}`;
                        
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
            
            // Fonction pour configurer le lazy loading des images
            function setupLazyLoading() {
                // Vérifier si l'API IntersectionObserver est disponible
                if ('IntersectionObserver' in window) {
                    const imageObserver = new IntersectionObserver((entries, observer) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                const img = entry.target;
                                if (img.dataset.src) {
                                    img.src = img.dataset.src;
                                    img.removeAttribute('data-src');
                                    imageObserver.unobserve(img);
                                }
                            }
                        });
                    });
                    
                    // Observer toutes les images avec la classe lazyload-img
                    document.querySelectorAll('.lazyload-img').forEach(img => {
                        imageObserver.observe(img);
                    });
                } else {
                    // Fallback pour les navigateurs qui ne supportent pas IntersectionObserver
                    document.querySelectorAll('.lazyload-img').forEach(img => {
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                        }
                    });
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
                        el.src = `${apiUrl}/media/blogGallery/${img.src_photo}`;
                        el.alt = img.alt;
                    }
                }
            }

            if (el.hasAttribute("wn-gallery-modal")) {
                const key = el.getAttribute("wn-gallery-modal");
                const galleryData = data.content.gallery.find(gallery => gallery.id_config == key);
                if (galleryData) {
                    const galleryItems = JSON.parse(galleryData.gallery);
                    galleryItems.forEach(img => {
                        const slideDiv = document.createElement("div");
                        slideDiv.classList.add("slides");
                        const imgElement = document.createElement("img");
                        imgElement.src = `${apiUrl}/media/blogGallery/${img.src_photo}`;
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
                

                const template = el.querySelector("[wn-multiReference-box]");
                if (!template) {
                    console.error("Template wn-multiReference-box manquant !");
                    return;
                }
                
                for (const multiReferenceInfo of multiReferenceInfos) {
                    const referenceContent = await fetch(`${apiUrl}/api/sendBlogContent`, {
                        method: "GET",
                        headers: {
                            'api_key': userKey,
                            'id_blog': blogId,
                            'id_blog_page': multiReferenceInfo.value,
                        }
                    });

                    const refContent = await referenceContent.json();
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
                                if (imageData) {
                                    el.src = `${apiUrl}/media/blog/${imageData.src_image}`;
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