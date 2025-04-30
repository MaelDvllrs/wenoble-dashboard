import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';


export const formatDate = (dateString) => {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(date);
};


export const formatDistanceWithoutApprox = (date) => {
    // Vérifie si `date` est déjà un objet Date
    const parsedDate = (date instanceof Date) ? date : new Date(date);

    const userTimeZoneOffset = new Date().getTimezoneOffset() * 60000; // En millisecondes
    const localDate = new Date(parsedDate.getTime() + userTimeZoneOffset); // Ajuste la date pour le fuseau horaire local

    return formatDistance(localDate, new Date(), {
        addSuffix: true,
        locale: {
            ...fr,
            formatDistance: (token, count, options) => {
                const result = fr.formatDistance(token, count, options);
                return result.replace('environ ', '');
            }
        }
    });
};

