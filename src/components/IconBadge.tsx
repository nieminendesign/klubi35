import React from 'react';
import { Box } from '@mui/material';

interface IconBadgeProps {
  icon: React.ReactNode;
  size?: 'xs' | 'sm' | 'md';
  color?: string;
}

const SIZE_STYLES = {
  xs: {
    width: 24,
    height: 24,
    borderRadius: 0.75,
  },
  sm: {
    width: 30,
    height: 30,
    borderRadius: 1,
  },
  md: {
    width: { xs: 36, sm: 42 },
    height: { xs: 36, sm: 42 },
    borderRadius: 1.25,
  },
} as const;

/** Compact architectural icon badge for section and page headers. */
export const IconBadge: React.FC<IconBadgeProps> = ({
  icon,
  size = 'sm',
  color = '#10B981',
}) => {
  return (
    <Box
      sx={{
        ...SIZE_STYLES[size],
        bgcolor: `${color}1A`,
        border: `1px solid ${color}40`,
        color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
  );
};
