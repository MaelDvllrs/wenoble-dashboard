import React from 'react';

import { useTheme } from '@mui/material/styles';
import config from '../../../../config';
import {useArticles} from './useArticle'
import { NavLink } from 'react-router-dom';

const Article = () => {
  const theme = useTheme();
  const apiUrl = config.apiUrl;
  const articles = useArticles();




  return (
    <div className='article_container'>
      {articles.map((article, index) => (
        <NavLink 
          key={index} 
          to={`/dashboard/actu/article/${article.slug}`}
          className="articleBox" 
          style={{ 
            backgroundColor: theme.palette.primary.main, 
            borderColor: theme.palette.primary.third, 
            color:theme.palette.text.primary,
            '--primary-hover-background-color': theme.palette.primary.secondary,
        }}>
          <img src={`${apiUrl}/media/blog/${article.imageUrl.src_image}`} alt={article.imageUrl.alt_image} className="imageArticle" />
          <div className="textContainArticle" style={{borderColor: theme.palette.primary.third}}>
            <div className='textBoxArticle'>
                <div className="auteurArticleContain">
                  <img src={`${apiUrl}/media/blog/${article.auteurPhoto}`} alt={article.auteurName} className="auteurArticlePhoto" />
                  <p style={{color : theme.palette.text.secondary}}>{article.auteurName}</p>
                </div>
                <div className="categorieArticleContain">{article.categorie}</div>
            </div>
            <h2 className='articleTitle'>{article.name}</h2>
            <p className='articleResume'>{article.resume.text}</p>
            <p style={{color : theme.palette.text.secondary}}>{article.date}</p>
          </div>
        </NavLink>
      ))}
    </div>
  );
};

export default Article;