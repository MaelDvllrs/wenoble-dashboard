import React from 'react';
import { useTheme } from '@mui/material/styles';
import RichTextUpload from './RichText/RichText';
import ImageUpload from './Image';
import GalleryUpload from './Gallery';
import TextUpload from './Text';
import VideoUpload from './Video';
import MultiReferenceUpload from './MultiReference';

const Field = (props) => {
  const theme = useTheme();

  const { type } = props;

  return (
    <div>
      {(() => {
        switch (type) {
          case 'richText':
            return <RichTextUpload {...props} theme={theme} />;
          case 'image':
            return <ImageUpload {...props} theme={theme} />;
          case 'gallery':
            return <GalleryUpload {...props} theme={theme} />;
          case 'text':
            return <TextUpload {...props} theme={theme} />;
          case 'video':
            return <VideoUpload {...props} theme={theme} />;
          case 'multiReference':
            return <MultiReferenceUpload {...props} theme={theme} />;
          default:
            return null;
        }
      })()}
    </div>
  );
};

export default Field;