import React, {useEffect, useState} from "react";
import './Login.css';
import {useNavigate} from 'react-router-dom';
import Axios from 'axios';
import {jwtDecode} from 'jwt-decode';
import Cookies from 'js-cookie';


const Login = () => {

    const [loginUserName, setLoginUserName] = useState('')
    const [loginPassword, setLoginPassword] = useState('')
    

    const [loginStatus, setLoginStatus] = useState()
    const [statusHolder, setStatusHolder] = useState('message')

    const navigateTo = useNavigate()

    const loginUser = (e)=>{


        e.preventDefault();

        Axios.post('http://localhost:3002/login',{
            LoginUserName: loginUserName,
            LoginPassword: loginPassword

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
                    console.log("redirect admin");
                    navigateTo('/dashboard-admin');
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
                        <a className="mdpOublier" href="/">mot de passe oublier</a>
                    </span>
                </form>
            </div>
        </div>

    )
}

export default Login