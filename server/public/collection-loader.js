(async function () {
    const apiUrl = "http://localhost:3002";
    const scriptTag = document.currentScript;
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
        try {
            const encodedData = el.getAttribute("wn-collection-wrapper");
            const decodedData = decodeBase64(encodedData);

            const { blogId, limit, order, colone, joinTable, config } = decodedData;

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

            if (!dataBlog) {
                console.error("Aucune donnée trouvée pour cette page.");
                return;
            }

            console.log(dataBlog);

            const template = el.querySelector("[wn-collection-box]");
            if (!template) {
                console.error("Template wn-collection-box manquant !");
                return;
            }

            for (const blog of dataBlog.blog) {
                const clone = template.cloneNode(true);
                clone.removeAttribute("wn-collection-box");

                const response = await fetch(`${apiUrl}/api/sendBlogContent`, {
                    method: "GET",
                    headers: {
                        'api_key': userKey,
                        'id_blog': blog.id_blog,
                        'id_blog_page': blog.id_page_blog,
                    }
                });

                const data = await response.json();

                if (!data) {
                    console.error("Aucune donnée trouvée pour cette page.");
                    return;
                }

                // Parcours tous les éléments qui ont un attribut `wn-*` dans le clone
                clone.querySelectorAll("[wn-title], [wn-link], [wn-date-published], [wn-image], [wn-richtext], [wn-text], [wn-gallery], [wn-gallery-index], [wn-video], [wn-multiReference-wrapper]").forEach(async el => {
                    
                    if (el.hasAttribute("wn-title")) {
                        el.textContent = blog.page_blog_name;
                    }

                    if (el.hasAttribute("wn-link")) {
                        const prelink = el.getAttribute("wn-link");
                        const linkData = blog.page_blog_slug;
                        if (linkData) {
                            if (isWebflowPreview()) {
                                el.href = `/template?slug=${linkData}`;
                            } else {
                                el.href = `${prelink}/${linkData}`;
                            }
                        }
                    }
        
                    if (el.hasAttribute("wn-date-published")) {
                        const format = el.getAttribute("wn-date-published");
                        const date = new Date(blog.page_blog_publish_date);
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
                        const key = el.getAttribute("wn-gallery");
                        const galleryData = data.content.gallery.find(gallery => gallery.id_config == key);
                        if (galleryData) {
                            const galleryItems = JSON.parse(galleryData.gallery);
                            el.innerHTML = galleryItems.map(img => `<img src="${apiUrl}/media/blogGallery/${img.src_photo}" alt="${img.alt}">`).join("");
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
                            console.log(refContent);
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
                            }
                        }
        
                        template.remove();
                    }

                });

                el.appendChild(clone);
            }

            template.remove();

        } catch (error) {
            console.error("Erreur lors de la récupération des données :", error);
        }
    });
})();