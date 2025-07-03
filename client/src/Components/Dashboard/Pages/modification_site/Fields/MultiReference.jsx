import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import Axios from 'axios';
import config from '../../../../../config';
import Cookies from 'js-cookie';


const MultiReference = ({ id_blog_page,type, id_config, onChange, slugValue, fieldValue, dataValue, id_collection_ref, theme }) => {
    const apiUrl = config.apiUrl; 
    const token = Cookies.get('token');
    const [CollectionRef, setCollectionRef] = useState([]);
    const [optionDefault, setOptionDefault] = useState([]);
    const [createBoolMultiRef, setCreateBoolMultiRef] = useState('')



   useEffect(() => {
     if (id_collection_ref) { 
       Axios.get(`${apiUrl}/getCollectionRef`, {
         params: {
           id_collection_ref: id_collection_ref,
         },
         headers: {
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'application/json'
         }
       }).then((response) => {

         setCollectionRef(response.data);
       }).catch((error) => {
         console.error('Erreur lors de la récupération de la collection de référence :', error);
       });
     }
   }, [id_collection_ref]);

   const optionMultiRef = CollectionRef.map(item => ({
     value: item.id,
     label: item.collection_element_name
   }));

   const handleChangeMultiRef = (selectedOption) => {
       const data = {
         id_config: id_config,
         type: 'multiReference',
         value: JSON.stringify(selectedOption.map(option => ({ value: option.value, label: option.label }))),          
         create: createBoolMultiRef
       };
       onChange({ data });

       setOptionDefault(selectedOption);
   }

   useEffect(() => {
     if (dataValue && Object.keys(dataValue).length > 0 && type === 'multiReference') {
      console.log('dataValue', dataValue);

      let selectedOptions;

      if (typeof dataValue.info_ref === 'string') {
        try {
          selectedOptions = JSON.parse(dataValue.info_ref);
        } catch (e) {
          // Gestion d'erreur si la chaîne n'est pas du JSON valide
          selectedOptions = dataValue.info_ref;
        }
      } else {
        selectedOptions = dataValue.info_ref;
      }
      console.log('selectedOptions', selectedOptions);
      const selectedOptionsFormatted = selectedOptions.map(option => ({
        value: option.value,
        label: option.label
      }));
      setCreateBoolMultiRef(dataValue.create)
      setOptionDefault(selectedOptionsFormatted);
       
     }
   }, [dataValue, type, CollectionRef]);

  return (
    <div>
      <Select 
        onChange={(selectedOption) => handleChangeMultiRef(selectedOption.map(option => ({ value: option.value, label: option.label })))}                              
        options={optionMultiRef}
        isMulti
        className='select_multiRef'
        value={optionDefault}
        styles={{
          control: (provided) => ({
            ...provided,
            backgroundColor: theme.palette.primary.main,
            borderColor: theme.palette.primary.main,
            boxShadow: 'none',
            borderRadius: '0.5rem',
            "&:hover": {
              borderColor: theme.palette.primary.secondary, // Couleur de bordure lors du survol
            },
          }),
          input: (provided) => ({
            ...provided,
            color: theme.palette.text.primary,
          }),
          option: (provided, state) => ({
            ...provided,
            color: theme.palette.text.primary,
            backgroundColor: state.isSelected ? theme.palette.primary.secondary : theme.palette.background.default,
            '&:hover': {
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.text.primary,
            },
          }),
          menu: (provided) => ({
            ...provided,
            backgroundColor: theme.palette.background.default, 
          }),
          placeholder: (provided) => ({
            ...provided,
            color: "#AAAAAA",
            value: "Séléctionner..." 
          }),
          multiValue: (provided) => ({
            ...provided,
            backgroundColor: theme.palette.primary.secondary,
          }),
          multiValueLabel: (provided) => ({
            ...provided,
            color: theme.palette.text.primary,
          }),
          multiValueRemove: (provided) => ({ 
            ...provided,
            color: theme.palette.text.primary,
            ':hover': {
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.text.primary,
            },
          }),
        }}
      />                             
    </div>
  );
};

export default MultiReference;