import { useState, useEffect } from "react";
import axios from "axios";
import config from "../../../../config";

export const useAcademy = () => {
    const [academies, setAcademies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedFilters, setSelectedFilters] = useState([]);
    const [availableFilters, setAvailableFilters] = useState([]);

    const fetchAcademyData = async (userKey) => {
        const apiUrl = config.apiUrl;

        const collectionParams = new URLSearchParams({
            limit: '',
            order: '',
            colone: '',
            joinTable: '',
            configs: JSON.stringify({})
        });

        try {
            const { data: blogPages } = await axios.get(`${apiUrl}/api/sendBlog?${collectionParams.toString()}`, {
                headers: {
                    'api_key': userKey,
                    'ids': config.apiAcademyIdBlog,
                }
            });

            if (!blogPages.blog) return [];

            console.log("Blog Pages:", blogPages);
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

            return Promise.all(detailPromises);
        } catch (error) {
            throw error;
        }
    };

    useEffect(() => {
        const userKey = config.apiAcademyClient;

        fetchAcademyData(userKey)
            .then((data) => {
                setAcademies(data);
                extractFilters(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Erreur API Academy :", err);
                setError(err);
                setLoading(false);
            });
    }, []);

    const extractFilters = (data) => {
        const allCategories = data
            .flatMap((academy) => academy.content.multiReference?.map((ref) => ref.label) || []);
        
        const uniqueCategories = [...new Set(allCategories)];
        setAvailableFilters(uniqueCategories);
    };

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
        const title = academy.page_blog_name?.toLowerCase() || "";

        const matchesSearch = title.includes(searchTerm);
        const academyCategories = academy.content.multiReference?.map((ref) => ref.label) || [];

        const matchesFilters =
            selectedFilters.length === 0 ||
            selectedFilters.some((filter) => academyCategories.includes(filter));

        return matchesSearch && matchesFilters;
    }).map((academy) => ({
        ...academy,
        hidden: !(selectedFilters.length === 0 || selectedFilters.some((filter) => academy.content.multiReference?.map((ref) => ref.label).includes(filter)))
    }));

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
