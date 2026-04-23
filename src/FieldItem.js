import React from 'react';
import { useDrag } from 'react-dnd';
import { Paper, Typography } from '@mui/material';
import { ItemTypes } from './ItemTypes';

const FieldItem = ({ field }) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.FIELD,
    item: { id: field.id, label: field.label },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  return (
    <Paper ref={drag} sx={{ padding: '10px', marginBottom: '10px', backgroundColor: isDragging ? '#e0e0e0' : '#fff' }}>
      <Typography>{field.label}</Typography>
    </Paper>
  );
};

export default FieldItem;
