import React, {useEffect, useState} from "react";
import './Login.css';
import {useNavigate} from 'react-router-dom';
import Axios from 'axios';
import {jwtDecode} from 'jwt-decode';
import Cookies from 'js-cookie';
import config from "../../config";
import { IsAuthenticated, IsAuthenticatedAdmin } from "../../Auth/ProtectedRoutes";
import CryptoJS from 'crypto-js'; 





const Login = () => {

    const apiUrl = config.apiUrl; 

    const [loginUserName, setLoginUserName] = useState('')
    const [loginPassword, setLoginPassword] = useState('')
    

    const [loginStatus, setLoginStatus] = useState()
    const [statusHolder, setStatusHolder] = useState('message')

    const navigateTo = useNavigate()

    const isClient =  IsAuthenticated()
    const isAdmin = IsAuthenticatedAdmin()

    if (isClient.isAuthenticating) {
        navigateTo('/dashboard/home');
    }

    if (isAdmin.isAuthenticating) {
        navigateTo('/dashboard-admin/home');
    }

    const loginUser = (e)=>{

        e.preventDefault();



    const presalt = (CryptoJS.lib.WordArray.random(128 / 8));
    const salt = presalt.toString(CryptoJS.enc.Base64);

    
    const key = CryptoJS.PBKDF2(loginUserName, salt, { keySize: 256 / 32, iterations: 1000 });

    

    const keyString = key.toString(CryptoJS.enc.Base64);


    const encryptedPassword = CryptoJS.AES.encrypt(loginPassword, keyString, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
      }).toString();

    Axios.post(`${apiUrl}/login`, {
        LoginUserName: loginUserName,
        LoginPassword: encryptedPassword,
        salt: salt,
        }).then((response)=>{

            if(response.data.message){
                navigateTo('/')
                setLoginStatus('Utilisateur introuvable')
            }
            else{



                const token = response.data.token;
                Cookies.set('token', token);

                const decodedToken = jwtDecode(token);
                const isAdmin = decodedToken.isAdmin;

                if (isAdmin) {
                    navigateTo('/dashboard-admin/home');
                } else {
                    navigateTo('/dashboard/home');
                }

            }
        })

    }

    useEffect(()=>{
        if(loginStatus !==''){
            setStatusHolder('showMessage')
            setTimeout(()=>{
                setStatusHolder('message')
            },6000)
        }
    }, [loginStatus])


    return(
        <div className="loginPage">
            <div className="loginBox">
                <h1 className="loginTitle">Se Connecter</h1>
                <form className="loginForm">
                    <span className={statusHolder}>{loginStatus}</span>
                    <input className="loginInput" type="text" id="username" placeholder="Entrez Utilisateur" 
                    onChange={(event)=>{
                        setLoginUserName(event.target.value)
                    }}/>
                    <input className="loginInput" type="password" id="password" placeholder="Entrez Mot de passe"
                    onChange={(event)=>{
                        setLoginPassword(event.target.value)
                    }}/>
                    <button className="loginButton" onClick={loginUser}>
                        <span className="loginButtonText">Connexion</span>
                    </button>
                    <span>
                    </span>
                </form>
            </div>
        </div>

    )
}

export default Login