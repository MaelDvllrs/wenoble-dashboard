import Axios from 'axios';
import config from '../../../config';


const apiUrl = config.apiUrl; 

export const fetchSaveClient = async (fields) => {
    try {
      const response = await Axios.post(`${apiUrl}/SaveClient`, {
        params: {
            fields: fields
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du client :', error);
      return [];
    }
  };

