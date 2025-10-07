// External libraries
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/fr';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';




// Global styles
import './App.css';

// Authentication
import Login from './Auth/Login';
import Register from './Auth/Register';
import ResetPassword from './Auth/ResetPassword';
import OAuthCallback from './Auth/OAuthCallback';
import EmailConfirmation from './Auth/EmailConfirmation';
import { IsAuthenticated, IsAuthenticatedAdmin } from './Auth/ProtectedRoutes';

// Authorization
import { AuthorisedRoutePortfolio, AuthorisedRoutePage, AuthorisedRouteBlog, AuthorisedRouteEcomm, AuthorisedRouteNewsletter } from './Authorisation/Authorisation';

// Context
import { WebsiteProvider } from './Context/WebsiteContext';
import { WorkspaceProvider } from './Context/WorkspaceContext';



// Dashboard components
import Dashboard from './Components/Dashboard/Dashboard';
import Home from './Components/Dashboard/Pages/Home/Home';
import Account from './Components/Dashboard/Pages/Users/Account';
import AccountGeneral from './Components/Dashboard/Pages/Users/AccountGeneral';
import AccountSecurity from './Components/Dashboard/Pages/Users/AccountSecurity';
import AccountEmail from './Components/Dashboard/Pages/Users/AccountEmail';
import ModificationHome from './Components/Dashboard/Pages/modification_site/modificationHome';
import Portfolio from './Components/Dashboard/Pages/modification_site/Portfolio/portfolio';
import EditPortfolio from './Components/Dashboard/Pages/modification_site/Portfolio/EditPortfolio';
import Page from './Components/Dashboard/Pages/modification_site/Page/page';
import EditPage from './Components/Dashboard/Pages/modification_site/Page/EditPage';
import Collection from './Components/Dashboard/Pages/modification_site/Collection/collection';
import CreateCollection from './Components/Dashboard/Pages/modification_site/Collection/createCollection';
import EditCollection from './Components/Dashboard/Pages/modification_site/Collection/editCollection';
import ListeCollection from './Components/Dashboard/Pages/modification_site/Collection/listeCollection';
import CreateElementCollection from './Components/Dashboard/Pages/modification_site/Collection/createElementCollection';
import EditElementCollection from './Components/Dashboard/Pages/modification_site/Collection/editElementCollection';
import StatistiqueHome from './Components/Dashboard/Pages/Statistique/statistiqueHome';
import StatistiqueAnalytics from './Components/Dashboard/Pages/Statistique/StatistiqueAnalytics';
import StatistiqueSearchConsole from './Components/Dashboard/Pages/Statistique/StatistiqueSearchConsole';
import Actualite from './Components/Dashboard/Pages/Actualite/Actualite';
import Article from './Components/Dashboard/Pages/Actualite/Article';
import Update from './Components/Dashboard/Pages/Actualite/Update';
import ArticleTemplate from './Components/Dashboard/Pages/Actualite/ArticleTemplate';
import UpdateTemplate from './Components/Dashboard/Pages/Actualite/UpdateTemplate';
import ContactList from './Components/Dashboard/Pages/Contact/ContactListe';
import ContactMessage from './Components/Dashboard/Pages/Contact/ContactMessage';
import ContactSettings from './Components/Dashboard/Pages/Contact/ContactSettings';
import Ecommerce from './Components/Dashboard/Pages/Ecommerce/EcommerceHome';
import EcommerceStatistique from './Components/Dashboard/Pages/Ecommerce/EcommerceStatistique';
import EcommerceProduct from './Components/Dashboard/Pages/Ecommerce/EcommerceProduct';
import EcommerceOrder from './Components/Dashboard/Pages/Ecommerce/EcommerceOrder/EcommerceOrder';
import EcommerceOrderPending from './Components/Dashboard/Pages/Ecommerce/EcommerceOrder/EcommerceOrderPending';
import EcommerceOrderShipping from './Components/Dashboard/Pages/Ecommerce/EcommerceOrder/EcommerceOrderShipping';
import EcommerceOrderDelivered from './Components/Dashboard/Pages/Ecommerce/EcommerceOrder/EcommerceOrderDelivered';
import EcommerceOrderAll from './Components/Dashboard/Pages/Ecommerce/EcommerceOrder/EcommerceOrderAll';
import NewsLetters from './Components/Dashboard/Pages/NewsLetters/Newsletter';
import Academy from './Components/Dashboard/Pages/Academy/Academy';
import AcademyTemplate from './Components/Dashboard/Pages/Academy/AcademyTemplate';
import CreateWebsite from './Components/Dashboard/Pages/website/createWebsite';
import EditWebsite from './Components/Dashboard/Pages/website/editWebsite';
import WebsiteList from './Components/Dashboard/Pages/website/WebsiteList';
import WorkspaceManager from './Components/Dashboard/Pages/workspace/WorkspaceManager';

// Admin components
import Admin from './Components/Admin/Admin';
import AdminHome from './Components/Admin/AdminHome';
import AdminClient from './Components/Admin/Clients/AdminClients';
import AddClient from './Components/Admin/Clients/AddClient';






// Initialize dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

function App() {

    // Get the current theme


    // Protected routes for clients
    const ProtectedRoutesClient = ({ children }) => {
        const dataAuth = IsAuthenticated();
        const currentUser = dataAuth.isAuthenticating;
        const verifyAuth = dataAuth.verifyAuth;
        if (currentUser && verifyAuth) {
            return children;
        } else if (verifyAuth) {
            return <Navigate to='/login' />;
        }
    };

    // Protected routes for admins
    const ProtectedRouteAdmin = ({ children }) => {
        const dataAdm = IsAuthenticatedAdmin();
        const currentAdmin = dataAdm.isAuthenticating;
        const verifyAdm = dataAdm.verifyAdm;
        if (currentAdmin && verifyAdm) {
            return children;
        } else if (verifyAdm) {
            return <Navigate to='/login' />;
        }
    };


    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
            <WorkspaceProvider>
                <WebsiteProvider>
                    <div>                
                        <Router>
                        <Routes>
                            {/* Authentication routes */}
                            <Route path="/" element={<Login />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                            <Route path="/oauth-callback" element={<OAuthCallback />} />
                            <Route path="/email-confirmation" element={<EmailConfirmation />} />

                            {/* Dashboard routes */}
                            <Route path="/dashboard">
                                <Route element={<ProtectedRoutesClient><Dashboard /></ProtectedRoutesClient>}>
                                    <Route path="/dashboard/home" element={<Home />} />
                                    <Route path="/dashboard/account" element={<Account />} >
                                        <Route index element={<Navigate to="/dashboard/account/general" />} />
                                        <Route path="general" element={<AccountGeneral />} />
                                        <Route path="security" element={<AccountSecurity />} />
                                        <Route path="email" element={<AccountEmail />} />
                                    </Route>
                                    <Route path="/dashboard/workspace" element={<WorkspaceManager />} />
                                    <Route path="/dashboard/modification" element={<ModificationHome />} />
                                    <Route path="/dashboard/modification/portfolio" element={<AuthorisedRoutePortfolio><Portfolio /></AuthorisedRoutePortfolio>}>
                                        <Route path="/dashboard/modification/portfolio/:id" element={<EditPortfolio />} />
                                    </Route>
                                    <Route path="/dashboard/modification/page" element={<AuthorisedRoutePage><Page /></AuthorisedRoutePage>}>
                                        <Route path="/dashboard/modification/page/:idPage" element={<EditPage />} />
                                    </Route>
                                    <Route path="/dashboard/modification/collection" element={<AuthorisedRouteBlog><Collection /></AuthorisedRouteBlog>}>
                                        <Route path="/dashboard/modification/collection/createCollection" element={<CreateCollection />} />
                                        <Route path="/dashboard/modification/collection/:idCollection/editCollection" element={<EditCollection />} />
                                        <Route path="/dashboard/modification/collection/:idCollection" element={<ListeCollection />} />
                                        <Route path="/dashboard/modification/collection/:idCollection/createPage" element={<CreateElementCollection />} />
                                        <Route path="/dashboard/modification/collection/:idCollection/editPage/:idCollectionElement" element={<EditElementCollection />} />
                                    </Route>
                                    <Route path="/dashboard/stats" element={<StatistiqueHome />}/>
                                    <Route path="/dashboard/stats/analytics" element={<StatistiqueAnalytics />} />
                                    <Route path="/dashboard/stats/search-console" element={<StatistiqueSearchConsole />} />
                                    <Route path="/dashboard/contact" element={<ContactList />} />
                                    <Route path="/dashboard/contact/settings" element={<ContactSettings />} />
                                    <Route path="/dashboard/contact/message/:id" element={<ContactMessage />} />
                                    <Route path="/dashboard/ecommerce" element={<AuthorisedRouteEcomm><Ecommerce /></AuthorisedRouteEcomm>}>
                                        <Route path="/dashboard/ecommerce/stats" element={<EcommerceStatistique />} />
                                        <Route path="/dashboard/ecommerce/product" element={<EcommerceProduct />} />
                                        <Route path="/dashboard/ecommerce/order" element={<EcommerceOrder />}>
                                            <Route path="/dashboard/ecommerce/order/pending" element={<EcommerceOrderPending />} />
                                            <Route path="/dashboard/ecommerce/order/shipping" element={<EcommerceOrderShipping />} />
                                            <Route path="/dashboard/ecommerce/order/delivered" element={<EcommerceOrderDelivered />} />
                                            <Route path="/dashboard/ecommerce/order/orderAll" element={<EcommerceOrderAll />} />
                                        </Route>
                                    </Route>
                                    <Route path="/dashboard/actu" element={<Actualite />}>
                                        <Route path="/dashboard/actu/article" element={<Article />} />
                                        <Route path="/dashboard/actu/update" element={<Update />} />
                                        <Route path="/dashboard/actu/article/:slug" element={<ArticleTemplate />} />
                                        <Route path="/dashboard/actu/update/:slug" element={<UpdateTemplate />} />
                                    </Route>
                                    <Route path="/dashboard/newsletter" element={<AuthorisedRouteNewsletter><NewsLetters /></AuthorisedRouteNewsletter>} />
                                    <Route path="/dashboard/academy" element={<Academy />} />
                                    <Route path="/dashboard/academy/:slug" element={<AcademyTemplate />} />
                                    <Route path="/dashboard/websites" element={<WebsiteList />} />
                                    <Route path="/dashboard/website/create" element={<CreateWebsite />} />
                                    <Route path="/dashboard/website/:id/settings" element={<EditWebsite />} />
                                </Route>
                            </Route>

                            {/* Admin routes */}
                            <Route path="/dashboard-admin">
                                <Route element={<ProtectedRouteAdmin><Admin /></ProtectedRouteAdmin>}>
                                    <Route path="/dashboard-admin/home" element={<AdminHome />} />
                                    <Route path="/dashboard-admin/clients" element={<AdminClient />} />
                                    <Route path="/dashboard-admin/clients/add" element={<AddClient />} />
                                </Route>
                            </Route>
                        </Routes>
                    </Router>
                </div>
            </WebsiteProvider>
            </WorkspaceProvider>
        </LocalizationProvider>
    );
}

export default App;
