import Axios from 'axios';
import config from '../../../config';
import Cookies from 'js-cookie';


const apiUrl = config.apiUrl;
const token = Cookies.get('token'); 

export const fetchSaveClient = async (fields) => {
    try {
      const response = await Axios.post(`${apiUrl}/SaveClient`, {
        params: {
          fields: fields
        }
    }, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du client :', error);
      return [];
    }
  };

