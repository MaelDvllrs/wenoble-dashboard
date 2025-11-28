import { useState, useEffect, useRef } from "react";
import axios from "axios";
import config from "../../../../config";

export const useAcademy = () => {
    const [academies, setAcademies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedFilters, setSelectedFilters] = useState([]);
    const [availableFilters, setAvailableFilters] = useState([]);
    const hasLoaded = useRef(false);

    useEffect(() => {
        // Éviter les appels multiples
        if (hasLoaded.current) {
            return;
        }
        hasLoaded.current = true;

        const fetchAcademyData = async () => {
            const apiUrl = config.apiUrl;
            const userKey = config.apiAcademyClient;

            try {
                const { data: blogPages } = await axios.get(`${apiUrl}/api/sendBlog`, {
                    headers: {
                        'api_key': userKey,
                        'ids': config.apiAcademyIdBlog,
                    }
                });

                if (!blogPages.blog) {
                    setAcademies([]);
                    setLoading(false);
                    return;
                }

                const detailPromises = blogPages.blog.map(async (blog) => {
                    const { data: detailData } = await axios.get(`${apiUrl}/api/sendBlogContent`, {
                        headers: {
                            'api_key': userKey,
                            'id_blog': blog.collection_id,
                            'id_blog_page': blog.id,
                        }
                    });

                    return {
                        ...blog,
                        content: detailData.content,
                    };
                });

                const data = await Promise.all(detailPromises);

                console.log(data);
                
                // Filtrer uniquement les éléments publiés (status_text = 'publish')
                const publishedData = data.filter(academy => 
                    academy.collection_element_status_text === 'publish'
                );
                
                // Dédupliquer par ID au cas où
                const uniqueData = publishedData.reduce((acc, current) => {
                    const exists = acc.find(item => item.id === current.id);
                    if (!exists) {
                        acc.push(current);
                    }
                    return acc;
                }, []);
                
                console.log('Academy data - Total:', data.length, 'Published:', publishedData.length, 'Unique:', uniqueData.length);
                
                setAcademies(uniqueData);
                
                // Extraire les filtres
                const allCategories = uniqueData
                    .flatMap((academy) => academy.content.multiReference?.map((ref) => ref.label) || []);
                const uniqueCategories = [...new Set(allCategories)];
                setAvailableFilters(uniqueCategories);
                
                setLoading(false);
            } catch (err) {
                console.error("Erreur API Academy :", err);
                setError(err);
                setLoading(false);
            }
        };

        fetchAcademyData();
    }, []); // Tableau de dépendances vide

    const handleSearch = (e) => {
        setSearchTerm(e.target.value.toLowerCase());
    };

    const handleFilterChange = (e) => {
        const filter = e.target.value;
        setSelectedFilters((prev) =>
            e.target.checked
                ? [...prev, filter]
                : prev.filter((f) => f !== filter)
        );
    };

    const resetFilters = () => {
        setSelectedFilters([]);
    };

    const filteredAcademies = academies.filter((academy) => {
        const title = academy.collection_element_name?.toLowerCase() || "";

        const matchesSearch = title.includes(searchTerm);
        const academyCategories = academy.content.multiReference?.map((ref) => ref.label) || [];

        const matchesFilters =
            selectedFilters.length === 0 ||
            selectedFilters.some((filter) => academyCategories.includes(filter));

        return matchesSearch && matchesFilters;
    });

    const academyStyles = (hidden) => ({
        display: hidden ? 'none' : 'block',
    });

    return {
        loading,
        error,
        academies: filteredAcademies,
        availableFilters,
        selectedFilters,
        searchTerm,
        handleSearch,
        handleFilterChange,
        resetFilters,
        academyStyles,
    };
};
