import React, { useState, useEffect } from 'react';
import { DefaultSwitch } from '../../../../../Theme/element';

const SwitchUpload = ({ id_blog_page, type, id_config, onChange, slugValue, fieldValue, dataValue, id_collection_ref, theme }) => {
    const [switchValue, setSwitchValue] = useState(false);
    const [createFlag, setCreateFlag] = useState(false);
  
    useEffect(() => {
      // Initialiser avec dataValue (données depuis l'API)
      if (dataValue && dataValue.value !== undefined && dataValue.value !== null) {
        const boolValue = dataValue.value === true || dataValue.value === 'true' || dataValue.value === 1;
        setSwitchValue(boolValue);
        setCreateFlag(dataValue.create || false);
        
        const data = {
          value: boolValue,
          id_config: id_config,
          type: 'switch',
          create: dataValue.create || false
        };
        onChange({ data });
      }
    }, [dataValue]);

    useEffect(() => {
      // Initialiser avec la valeur existante
      if (slugValue !== undefined && slugValue !== null) {
        const boolValue = slugValue === true || slugValue === 'true' || slugValue === 1;
        setSwitchValue(boolValue);
        handleSwitchChange({ target: { checked: boolValue } });
      }
    }, [slugValue]);

    useEffect(() => {
      // Mise à jour lorsque fieldValue change
      if (fieldValue && id_config) {
        const fieldData = fieldValue[id_config];
        if (fieldData !== undefined && fieldData !== null) {
          const boolValue = fieldData === true || fieldData === 'true' || fieldData === 1;
          setSwitchValue(boolValue);
          
          const data = {
            value: boolValue,
            id_config: id_config,
            type: 'switch'
          };
          onChange({ data });
        }
      }
    }, [fieldValue]); 

    const handleSwitchChange = (event) => {
      const newValue = event.target.checked;
      setSwitchValue(newValue);
      
      const data = {
        value: newValue,
        id_config: id_config,
        type: 'switch',
        create: createFlag
      };
      
      onChange({ data });
    };

    return (
      <div className='blogField_field'>
        <DefaultSwitch
          checked={switchValue}
          onChange={handleSwitchChange}
        />
      </div>
    );
};

export default SwitchUpload;
