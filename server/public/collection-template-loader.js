(async function () {
    const apiUrl = "https://api-wenoble.wenoble.fr";
    const scriptTag = document.currentScript;
    const blogId = scriptTag.getAttribute("data-blog-id");
    const userKey = scriptTag.getAttribute("data-user-id");
    const titleTag = scriptTag.getAttribute("title-tag");
    const metaTags = scriptTag.getAttribute("meta-tag");
    const metaTagsImage = scriptTag.getAttribute("meta-tag-image");



    function isWebflowPreview() {
        return window.location.hostname.includes("webflow.io");
    }

    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');

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
        
        console.log(data);
        document.title = info.blog[0].page_blog_name;
        const ogTitle = document.querySelector("meta[property='og:title']");
        const ogDescription = document.querySelector("meta[property='og:description']");
        const ogImage = document.querySelector("meta[property='og:image']");

        if (ogTitle) {
            console.log(data.content.text);
            console.log(titleTag);
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


        // Parcours tous les éléments qui ont un attribut `wn-*`
        document.querySelectorAll("[wn-title], [wn-date-published], [wn-image], [wn-title], [wn-richtext], [wn-text], [wn-gallery], [wn-gallery-index], [wn-gallery-modal], [wn-video], [wn-multiReference-wrapper]").forEach(async el => {
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
                    }
                }

                template.remove();
            }

        });

    } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);
    }
})();