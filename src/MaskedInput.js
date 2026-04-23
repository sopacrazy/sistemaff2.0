import React, { forwardRef } from 'react';
import InputMask from 'react-input-mask';
import TextField from '@mui/material/TextField';

const MaskedInput = forwardRef((props, ref) => {
  const { mask, ...other } = props;
  return <InputMask mask={mask} {...other}><TextField inputRef={ref} /></InputMask>;
});

export default MaskedInput;