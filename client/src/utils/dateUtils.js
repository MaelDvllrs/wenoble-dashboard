import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Étendre dayjs avec les plugins nécessaires
dayjs.extend(utc);
dayjs.extend(timezone);

// Fonctions existantes
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

// Nouvelles fonctions utilisant DayJS

/**
 * Convertit une date en UTC pour stockage en BDD
 * @param {Date|string|dayjs.Dayjs} date - Date à convertir
 * @returns {string} - Date UTC au format ISO
 */
export const toUTCForStorage = (date) => {
  return dayjs(date).utc().format();
};

/**
 * Convertit une date UTC de la BDD vers le fuseau horaire de l'utilisateur
 * @param {string} utcDate - Date UTC provenant de la BDD
 * @returns {dayjs.Dayjs} - Date dans le fuseau local
 */
export const fromUTCToLocal = (utcDate) => {
  const userTimeZone = dayjs.tz.guess();
  return dayjs.utc(utcDate).tz(userTimeZone);
};

/**
 * Formatte une date pour l'affichage selon la locale française
 * @param {string} utcDate - Date UTC provenant de la BDD
 * @param {string} format - Format d'affichage (optionnel)
 * @returns {string} - Date formatée
 */
export const formatDisplayDate = (utcDate, format = 'DD/MM/YYYY HH:mm') => {
  if (!utcDate) return 'N/A';
  return fromUTCToLocal(utcDate).format(format);
};

/**
 * Obtient la date actuelle en UTC pour insertion en BDD
 * @returns {string} - Date UTC actuelle au format ISO
 */
export const getCurrentUTCDate = () => {
  return dayjs().utc().format();
};

/**
 * Ajuste la date pour le stockage en tenant compte du fuseau horaire
 * @param {Date|string|dayjs.Dayjs} date - Date à ajuster
 * @returns {string} - Date UTC ajustée au format ISO
 */
export const adjustDateForStorage = (date) => {
  return dayjs(date).utc().format();
};