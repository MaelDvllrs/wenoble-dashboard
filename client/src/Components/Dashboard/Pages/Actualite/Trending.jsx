import React from "react"
import { useTheme } from '@mui/material/styles';
import config from '../../../../config';
import {useArticles} from './useArticle'
import WhatshotIcon from '@mui/icons-material/Whatshot';
import { NavLink } from 'react-router-dom';
import {formatDistanceWithoutApprox} from '../../../../utils/dateUtils'

export const TrendingArticle = () => {
    const theme = useTheme();
    const apiUrl = config.apiUrl;
    const articles = useArticles(2);
    
    
    return (
        <div className='article_container trending_container'>
            <div className="trendingTitleContain" style={{backgroundColor : theme.palette.primary.secondary}}>
                <WhatshotIcon/>
                <p><b>Article à la une</b> <span style={{color : theme.palette.text.secondary, fontSize: '0.8rem'}}>aujourd'hui</span></p>
            </div>
            <div className="actuLinkContainer">
            {articles.map((article, index) => (
                <NavLink 
                    key={index}
                    to={`/dashboard/actu/article/${article.slug}`}
                    className="textContainArticle trendingTextContain" 
                    style={{ 
                        borderColor: theme.palette.primary.third, 
                        color : theme.palette.text.primary,
                        '--primary-hover-background-color': theme.palette.primary.secondary,
                    }}>
                <div className='textBoxArticle'>
                    <div className="auteurArticleContain">
                        <img src={`${apiUrl}/media/profile/${article.auteurPhoto}`} alt={article.auteurName} className="auteurArticlePhoto" />
                        <p style={{color : theme.palette.text.secondary}}>{article.auteurName}</p>
                    </div>
                    <div className="categorieArticleContain">{article.categorie}</div>
                </div>
                <h2 className='articleTitle trendingTitle'>{article.name}</h2>
                <p className='articleResume trendingResume'>{article.resume.text}</p>
                <p style={{color : theme.palette.text.secondary}}>{formatDistanceWithoutApprox(article.date)}</p>
                </NavLink>
            ))}
            </div>
            <div className="trendingTitleContain updateTitle UpdateDown" style={{backgroundColor : theme.palette.primary.secondary, borderColor: theme.palette.primary.third, }}>
                <NavLink
                to={'/dashboard/actu/article'}
                className={"UpdateDownLink"}
                style={{color: theme.palette.text.secondary,
                        '--primary-hover-color': theme.palette.text.primary,
                }}
                >
                    <p><span style={{fontSize: '0.8rem'}}>Voir tous les articles</span></p>
                </NavLink>
                
            </div>
        </div>
    );
}