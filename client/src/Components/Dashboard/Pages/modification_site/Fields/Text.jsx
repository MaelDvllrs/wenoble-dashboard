import React, { useState, useEffect } from 'react';

const TextUpload = ({ id_blog_page,type, id_config, onChange, slugValue, fieldValue, dataValue, id_collection_ref, theme }) => {
    const [slugValueChange, setSlugValueChange] = useState(slugValue || "");
    const [createBool, setCreateBool] = useState('')
  
    useEffect(() => {
      // Si slugValue est non vide, mettre à jour slugValueChange
      if (slugValue) {
        setSlugValueChange(slugValue);
        handleTextChange({ target: { value: slugValue } });

      }
    }, [slugValue]);


    useEffect(() => {
      // Mise à jour de slugValueChange lorsque fieldValue change

      if(fieldValue && id_config){

        if(id_config === 'title'){

          setSlugValueChange(fieldValue.page_blog_name || "");

          const data = {
            value: fieldValue.page_blog_name,
            id_config: id_config,
            type: 'text'
          };
          onChange({ data });

        } else if (id_config === 'slug') {

          setSlugValueChange(fieldValue.page_blog_slug || "");

          const data = {
            value: fieldValue.page_blog_slug,
            id_config: id_config,
            type: 'text'
          };
          onChange({ data });

        }
      }
    

    }, [fieldValue]); 

    const handleTextChange = (event) => {
      const newValue = event.target.value;
      // Mise à jour de l'état avec la nouvelle valeur saisie
      setSlugValueChange(newValue);
      
      const data = {
        value: newValue,
        id_config: id_config,
        type: 'text',
        create: createBool

      };
      onChange({ data });
    };



    useEffect(() => {
      // Vérifiez si dataValue existe et si le type est 'text'
      if (dataValue && Object.keys(dataValue).length > 0 && type === 'text') {
        // Mettre à jour slugValueChange avec la valeur de dataValue
        
        setCreateBool(dataValue.create)
        setSlugValueChange(dataValue.text);
        
      }
    }, [dataValue, type]);

  return (
    <div>
        <input className='input_text_blog' type='text' style={{backgroundColor : theme.palette.primary.main, color : theme.palette.text.primary, borderColor : theme.palette.primary.main}} onChange={handleTextChange} value={slugValueChange}/>                               
    </div>
  );
};

export default TextUpload;