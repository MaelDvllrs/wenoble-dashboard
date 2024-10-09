import Cookies from 'js-cookie';
import { BrowserRouter as Navigate } from 'react-router-dom';




const Logout = () =>{
    Cookies.remove('token');
    return <Navigate to="/login"/>
}

export default Logout