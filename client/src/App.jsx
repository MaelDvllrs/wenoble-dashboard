import './App.css'
import Dashboard from './Components/Dashboard/Dashboard'
import Home from './Components/Dashboard/Pages/Home/Home'
import Account from'./Components/Dashboard/Pages/Users/Account'
import Portfolio from './Components/Dashboard/Pages/modification_site/Portfolio/portfolio'
import Login from './Auth/Login'
import EditPortfolio from './Components/Dashboard/Pages/modification_site/Portfolio/EditPortfolio'
import Admin from './Components/Admin/Admin';
import AdminHome from './Components/Admin/AdminHome'
import AdminClient from './Components/Admin/Clients/AdminClients'
import {IsAuthenticated, IsAuthenticatedAdmin} from './Auth/ProtectedRoutes';
import { AuthorisedRoutePortfolio, AuthorisedRoutePage, AuthorisedRouteBlog, AuthorisedRouteEcomm, AuthorisedRouteNewsletter } from './Authorisation/Authorisation';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import ModificationHome from './Components/Dashboard/Pages/modification_site/modificationHome'
import Page from './Components/Dashboard/Pages/modification_site/Page/page'
import EditPage from './Components/Dashboard/Pages/modification_site/Page/EditPage'
import AddClient from './Components/Admin/Clients/AddClient'
import Blog from './Components/Dashboard/Pages/modification_site/Blog/blog'
import ListeBlog from './Components/Dashboard/Pages/modification_site/Blog/listeBlog'
import CreatePageBlog from './Components/Dashboard/Pages/modification_site/Blog/createPageBlog'
import EditPageBlog from './Components/Dashboard/Pages/modification_site/Blog/editPageBlog'
import Statistique from './Components/Dashboard/Pages/Statistique/Statistique'
import Actualite from './Components/Dashboard/Pages/Actualite/Actualite'
import Article from './Components/Dashboard/Pages/Actualite/Article'
import Update from './Components/Dashboard/Pages/Actualite/Update'
import ArticleTemplate from './Components/Dashboard/Pages/Actualite/ArticleTemplate'
import UpdateTemplate from './Components/Dashboard/Pages/Actualite/UpdateTemplate'
import ContactList from './Components/Dashboard/Pages/Contact/ContactListe'
import ContactMessage from './Components/Dashboard/Pages/Contact/ContactMessage'
import Ecommerce from './Components/Dashboard/Pages/Ecommerce/EcommerceHome'
import EcommerceStatistique from './Components/Dashboard/Pages/Ecommerce/EcommerceStatistique'
import EcommerceProduct from './Components/Dashboard/Pages/Ecommerce/EcommerceProduct'
import EcommerceOrder from './Components/Dashboard/Pages/Ecommerce/EcommerceOrder/EcommerceOrder'
import EcommerceOrderPending from './Components/Dashboard/Pages/Ecommerce/EcommerceOrder/EcommerceOrderPending'
import EcommerceOrderShipping from './Components/Dashboard/Pages/Ecommerce/EcommerceOrder/EcommerceOrderShipping'
import EcommerceOrderDelivered from './Components/Dashboard/Pages/Ecommerce/EcommerceOrder/EcommerceOrderDelivered'
import EcommerceOrderAll from './Components/Dashboard/Pages/Ecommerce/EcommerceOrder/EcommerceOrderAll'
import NewsLetters from './Components/Dashboard/Pages/NewsLetters/Newsletter'
import Academy from './Components/Dashboard/Pages/Academy/Academy'

import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'

import 'dayjs/locale/fr';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';


dayjs.extend(utc);
dayjs.extend(timezone);

function App() {



  const ProtectedRoutesClient = ({children}) =>{
    const dataAuth = IsAuthenticated()
    const currentUser = dataAuth.isAuthenticating
    const verifyAuth = dataAuth.verifyAuth
    if(currentUser && verifyAuth){
      return children;
    } else if(verifyAuth){
      return <Navigate to='/login'/>
    }
   }

  const ProtectedRouteAdmin = ({children}) =>{
    const dataAdm = IsAuthenticatedAdmin()
    const currentAdmin = dataAdm.isAuthenticating
    const verifyAdm = dataAdm.verifyAdm
    if(currentAdmin && verifyAdm){
      return children;
    } else if(verifyAdm){
      return <Navigate to='/login'/>
    }
  }



  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
      <div>
        <Router>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />

            <Route path="/dashboard">  
              <Route element={<ProtectedRoutesClient><Dashboard /></ProtectedRoutesClient>}>
                <Route path="/dashboard/home" element={<Home/>}/>
                <Route path="/dashboard/account" element={<Account/>}/>
                <Route path="/dashboard/modification" element={<ModificationHome/>}>
                </Route>
                <Route path="/dashboard/modification/portfolio" element={<AuthorisedRoutePortfolio><Portfolio/></AuthorisedRoutePortfolio>} >
                    <Route path="/dashboard/modification/portfolio/:id" element={<EditPortfolio/>}></Route>
                </Route>
                <Route path="/dashboard/modification/page" element={<AuthorisedRoutePage><Page/></AuthorisedRoutePage>} >
                    <Route path="/dashboard/modification/page/:idPage" element={<EditPage/>}></Route>
                </Route>
                <Route path="/dashboard/modification/blog" element={<AuthorisedRouteBlog><Blog/></AuthorisedRouteBlog>} >
                  <Route path="/dashboard/modification/blog/:idBlog" element={<ListeBlog/>}></Route>
                  <Route path="/dashboard/modification/blog/:idBlog/createPage" element={<CreatePageBlog/>}></Route>
                  <Route path="/dashboard/modification/blog/:idBlog/editPage/:idBlogPage" element={<EditPageBlog/>}></Route>
                </Route>
                <Route path="/dashboard/stats" element={<Statistique/>} >
                </Route>

                <Route path="/dashboard/contact" element={<ContactList/>}/>
                <Route path="/dashboard/contact/message/:id" element={<ContactMessage/>}/>

                <Route path="/dashboard/ecommerce" element={<AuthorisedRouteEcomm><Ecommerce/></AuthorisedRouteEcomm>} >
                  <Route path="/dashboard/ecommerce/stats" element={<EcommerceStatistique/>}></Route>
                  <Route path="/dashboard/ecommerce/product" element={<EcommerceProduct/>}></Route>
                  <Route path="/dashboard/ecommerce/order" element={<EcommerceOrder/>}>
                    <Route path="/dashboard/ecommerce/order/pending" element={<EcommerceOrderPending/>}></Route>
                    <Route path="/dashboard/ecommerce/order/shipping" element={<EcommerceOrderShipping/>}></Route>
                    <Route path="/dashboard/ecommerce/order/delivered" element={<EcommerceOrderDelivered/>}></Route>
                    <Route path="/dashboard/ecommerce/order/orderAll" element={<EcommerceOrderAll/>}></Route>
                  </Route>
                </Route>
                <Route path="/dashboard/actu" element={<Actualite/>}>
                  <Route path="/dashboard/actu/article" element={<Article/>}></Route>
                  <Route path="/dashboard/actu/update" element={<Update/>}></Route>
                  <Route path="/dashboard/actu/article/:slug" element={<ArticleTemplate/>}></Route>
                  <Route path="/dashboard/actu/update/:slug" element={<UpdateTemplate/>}></Route>
                </Route>
                <Route path="/dashboard/account" element={<Account/>}>
                </Route>
                <Route path="/dashboard/newsletter" element={<AuthorisedRouteNewsletter><NewsLetters/></AuthorisedRouteNewsletter>}/>
                <Route path="/dashboard/academy" element={<Academy/>}/>
              
              </Route>
            </Route>
            <Route path="/dashboard-admin">  
              <Route element={<ProtectedRouteAdmin><Admin /></ProtectedRouteAdmin>}>
                <Route path="/dashboard-admin/home" element={<AdminHome/>}/>
                <Route path="/dashboard-admin/clients" element={<AdminClient/>}/>
                <Route path="/dashboard-admin/clients/add" element={<AddClient/>}/>
              </Route>
            </Route>
          </Routes>
         </Router>
      </div>
    </LocalizationProvider>

  );
}

export default App;
