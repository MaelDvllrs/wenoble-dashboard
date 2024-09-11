import './App.css'
import Dashboard from './Components/Dashboard/Dashboard'
import Home from './Components/Dashboard/Pages/Home'
import Account from'./Components/Dashboard/Pages/Account'
import Portfolio from './Components/Dashboard/Pages/modification_site/Portfolio/portfolio'
import Login from './Components/Login/Login'
import EditPortfolio from './Components/Dashboard/Pages/modification_site/Portfolio/EditPortfolio'
import Admin from './Components/Admin/Admin';
import AdminHome from './Components/Admin/AdminHome'
import AdminClient from './Components/Admin/Clients/AdminClients'
import {IsAuthenticated, IsAuthenticatedAdmin} from './Auth/ProtectedRoutes';
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
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs';
import 'dayjs/locale/fr';


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


const ProtectedRoutePortfolio = ({children}) =>{
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
                <Route path="/dashboard/modification/portfolio" element={<Portfolio/>} >
                    <Route path="/dashboard/modification/portfolio/:id" element={<EditPortfolio/>}></Route>
                </Route>
                <Route path="/dashboard/modification/page" element={<Page/>} >
                    <Route path="/dashboard/modification/page/:id" element={<EditPage/>}></Route>
                </Route>
                <Route path="/dashboard/modification/blog" element={<Blog/>} >
                  <Route path="/dashboard/modification/blog/:id" element={<ListeBlog/>}></Route>
                  <Route path="/dashboard/modification/blog/:id/createPage" element={<CreatePageBlog/>}></Route>
                  <Route path="/dashboard/modification/blog/:id/editPage/:idBlog" element={<EditPageBlog/>}></Route>
                </Route>
                <Route path="/dashboard/stats" element={<Statistique/>} >
                </Route>
                <Route path="/dashboard/actu" element={<Actualite/>} >
                </Route>
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
