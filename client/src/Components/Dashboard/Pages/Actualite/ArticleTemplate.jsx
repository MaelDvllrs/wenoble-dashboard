import React from 'react';
import { useTheme } from '@mui/material/styles';
import config from '../../../../config';
import {useArticlesTemplates} from './useArticleTemplate'
import { NavLink, useParams } from 'react-router-dom';
import {formatDate} from '../../dateUtils'
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';

const ArticleTemplate = () => {
  const theme = useTheme();
  const apiUrl = config.apiUrl;
  const slug = useParams().slug;
  const articles = useArticlesTemplates(slug);
  const article = articles[0];

  return (
    <div>
      <NavLink 
        to='/dashboard/actu/article' 
        className='backButton' 
        style={{
          color : theme.palette.text.secondary,
          '--primary-hover-color': theme.palette.text.primary,
        }}
      >
        <ArrowLeftIcon/>
        Retour
      </NavLink>
      {article ? ( 
        <div className='article_template_container' style={{borderColor : theme.palette.text.secondary}}>
          <img src={`${apiUrl}/media/blog/${article.imageUrl.src_image}`} alt={article.imageUrl.alt_image} className="imageArticle imageArticleTemplate" />
          <div className='articleTemplateTitleBox'>
            <h2 className='articleTemplateTitle green_title'>{article.name}</h2>
            <div className="categorieArticleContain">{article.categorie}</div>
          </div>
          
          <div className='textBoxArticle textBoxArticleTemplate' style={{borderColor : theme.palette.text.secondary}}>
              <div className="auteurArticleContain">
                <img src={`${apiUrl}/media/profile/${article.auteurPhoto}`} alt={article.auteurName} className="auteurArticlePhoto" />
                <p style={{color : theme.palette.text.secondary}}>{article.auteurName}</p>
              </div>
              <p style={{color : theme.palette.text.secondary}}>{formatDate(article.date)}</p>
          </div>
          <div className='ArticleTemplateContenue'  dangerouslySetInnerHTML={{ __html: article.contenue }}/>
        </div>
      ) : null
    }

    <p className='ArticleTemplateBottom' style={{color : theme.palette.text.secondary}}>© 2024 wenoble</p>

    </div>
  );
};
export default ArticleTemplate;