(async function () {
    const apiUrl = "http://localhost:3002"; // Remplacez par l'URL de votre API
    const scriptTag = document.currentScript;
    const urlVideoBucket = "https://oeigawgmmhrlpjpgicww.supabase.co/storage/v1/object/public/collection-video//" // Remplacez par l'URL de votre API
    const urlGalleryBucket = "https://oeigawgmmhrlpjpgicww.supabase.co/storage/v1/object/public/collection-gallery//";
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

    document.querySelectorAll("[wn-collection-wrapper]").forEach(async el => {
            
        if (el.querySelector(".ssr-wn-collection-box")) {
            console.log('WeNoble content already loaded for this collection wrapper');
            return;
        }



        try {
            const encodedData = el.getAttribute("wn-collection-wrapper");
            const decodedData = decodeBase64(encodedData);

            const { blogId, limit, order, colone, joinTable, config } = decodedData;
            console.log("Données décodées :", decodedData);

            if (!blogId) {
                console.error("Blog ID manquant !");
                return;
            }

            const params = new URLSearchParams({
                limit: limit,
                order: order,
                colone: colone,
                joinTable: joinTable,
                configs: JSON.stringify(config)
            });

            const blogPageResponse = await fetch(`${apiUrl}/api/sendBlog?${params.toString()}`, {
                method: "GET",
                headers: {
                    'api_key': userKey,
                    'ids': blogId,
                }
            });

            const dataBlog = await blogPageResponse.json();


            if (!dataBlog.blog || dataBlog.blog.length === 0) {
                
                const comingSoonMessage = document.createElement('div');
                comingSoonMessage.textContent = "Coming Soon";
                comingSoonMessage.style.textAlign = "center";
                comingSoonMessage.style.fontSize = "1.5rem";
                comingSoonMessage.style.color = "#555";
                el.appendChild(comingSoonMessage);
                el.querySelector("[wn-collection-box]").remove();
                return;
            }


            const template = el.querySelector("[wn-collection-box]");
            if (!template) {
                console.error("Template wn-collection-box manquant !");
                return;
            }

            const blogPromises = [];

            for (const blog of dataBlog.blog) {
                const blogPromise = (async () => {
                    const clone = template.cloneNode(true);
                    clone.removeAttribute("wn-collection-box");
                    
                    // Ajout de l'attribut wn-collection-element à chaque élément cloné
                    clone.setAttribute("wn-collection-element", "true");
                    console.log("Clonage de l'élément pour le blog :", blog);
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
                        return null;
                    }

                // Parcours tous les éléments qui ont un attribut `wn-*` dans le clone
                clone.querySelectorAll("[wn-title], [wn-link], [wn-id], [wn-for], [wn-date-published], [wn-image], [wn-richtext], [wn-text], [wn-gallery], [wn-gallery-index],[wn-gallery-modal], [wn-video], [wn-multiReference-wrapper]").forEach(async el => {
                    
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
        
                        el.textContent = date.toLocaleDateString(undefined, options);
                    }
                    
                    
                    if (el.hasAttribute("wn-image")) {
                        const key = el.getAttribute("wn-image");
                        console.log("Key pour l'image :", key);
                        console.log("Données de l'image :", data.content.image);
                        const imageData = data.content.image.find(img => img.id_config == key);
                        if (imageData) {
                            if (imageData.src_image) {
                                el.src = `${imageData.src_image}`;
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
                            el.innerHTML = `<source src="${urlVideoBucket}${videoData.src_video}">`;
                        }
                    }

                    if (el.hasAttribute("wn-gallery")) {
                        const key = el.getAttribute("wn-gallery");
                        const galleryData = data.content.gallery.find(gallery => gallery.id_config == key);
                        if (galleryData) {
                            const galleryItems = JSON.parse(galleryData.gallery);
                            el.innerHTML = galleryItems.map(img => `<img src="${urlGalleryBucket}${img.src_photo}">`).join("");
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
                                el.src = `${urlGalleryBucket}${img.src_photo}`;
                                el.alt = img.alt;
                            }
                        }
                    }

                    if (el.hasAttribute("wn-gallery-modal")) {
                        const key = el.getAttribute("wn-gallery-modal");
                        const galleryData = data.content.gallery.find(gallery => gallery.id_config == key);
                        if (galleryData) {
                            const galleryItems = JSON.parse(galleryData.gallery);
                            el.innerHTML = galleryItems.map(img => `<div class="slides"><img src="${urlGalleryBucket}${img.src_photo}"></div>`).join("");
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

                });
                
                el.appendChild(clone);
                return clone;   
            })();

            blogPromises.push(blogPromise);
            }

            await Promise.all(blogPromises);  

            template.remove();

            const collectionMarker = document.createElement('div');
            collectionMarker.className = 'ssr-wn-collection-box';
            collectionMarker.style.display = 'none';
            collectionMarker.setAttribute('data-collection-processed', 'true');
            collectionMarker.setAttribute('data-items-count', dataBlog.blog.length);
            collectionMarker.setAttribute('data-processed-time', new Date().toISOString());
            el.appendChild(collectionMarker);

            

        } catch (error) {
            console.error("Erreur lors de la récupération des données :", error);
        }
    });
})();