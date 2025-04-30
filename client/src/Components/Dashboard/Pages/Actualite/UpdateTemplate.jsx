import React from 'react';
import { useTheme } from '@mui/material/styles';
import config from '../../../../config';
import {useUpdateTemplates} from './useUpdateTemplate'
import { NavLink, useParams } from 'react-router-dom';
import {formatDate} from '../../../../utils/dateUtils'
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';

const UpdateTemplate = () => {
  const theme = useTheme();
  const apiUrl = config.apiUrl;
  const slug = useParams().slug;
  const updates = useUpdateTemplates(slug);
  const update = updates[0];

  return (
    <div>
      <NavLink 
        to='/dashboard/actu/update' 
        className='backButton' 
        style={{
          color : theme.palette.text.secondary,
          '--primary-hover-color': theme.palette.text.primary,
        }}
      >
        <ArrowLeftIcon/>
        Retour
      </NavLink>
      {update ? ( 
        <div className='article_template_container' style={{borderColor : theme.palette.text.secondary}}>
          <div className='articleTemplateTitleBox updateTemplateTitleBox'>
            <h2 className='articleTemplateTitle'>{update.name}</h2>
          </div>
          
          <div className='textBoxArticle textBoxArticleTemplate' style={{borderColor : theme.palette.text.secondary}}>
              <p style={{color : theme.palette.text.secondary}}>{formatDate(update.date)}</p>
          </div>
          <div className='ArticleTemplateContenue'  dangerouslySetInnerHTML={{ __html: update.contenue }}/>
        </div>
      ) : null
    }

    <p className='ArticleTemplateBottom' style={{color : theme.palette.text.secondary}}>© 2024 wenoble</p>

    </div>
  );
};
export default UpdateTemplate;